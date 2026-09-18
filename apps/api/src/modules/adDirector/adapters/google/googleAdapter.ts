/**
 * Google Veo Provider Adapter for Video Gem.
 * Integrates with @google/genai models.generateVideos and operations.getVideosOperation
 * for Veo 3.1 Pro, Veo 3.1 Fast, and Veo Lite.
 *
 * Strictly enforces creative intent preservation and error normalization.
 */

import { GoogleGenAI } from '@google/genai';
import type {
  ProviderAdapter,
  ProviderExecutionRequest,
  ProviderGenerationResult,
  ProviderId
} from '@contracts/providerAdapterContracts.js';
import { adapterReferenceResolver } from '../shared/referenceResolver.js';
import { adapterErrorNormalizer } from '../shared/errorNormalizer.js';
import { getModelCapability } from '../../../../../../../packages/ad-director/index.js';

export class GoogleAdapter implements ProviderAdapter {
  public readonly provider: ProviderId = 'google';
  private defaultAi: GoogleGenAI | null = null;
  private clientOverride?: any;

  constructor(clientOverride?: any) {
    this.clientOverride = clientOverride;
  }

  public supportsModel(modelId: string): boolean {
    return ['veo_3_1_pro', 'veo_3_1_fast', 'veo_lite'].includes(modelId);
  }

  private getClient(): any {
    if (this.clientOverride) return this.clientOverride;
    if (!this.defaultAi) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
      if (!apiKey) {
        throw new Error('Google GenAI API Key is missing. Set GEMINI_API_KEY in environment.');
      }
      this.defaultAi = new GoogleGenAI({ apiKey });
    }
    return this.defaultAi;
  }

  /**
   * Submits a video generation request to Google Veo.
   */
  public async submit(request: ProviderExecutionRequest): Promise<ProviderGenerationResult> {
    const model = request.model;

    // 1. Creative Intent Invariant Verification (Never silently alter creative decisions)
    const capability = getModelCapability(model, true);
    if (capability) {
      if (!capability.supported_durations.includes(request.duration)) {
        return {
          provider: this.provider,
          model,
          providerRequestId: `req_err_${Date.now()}`,
          status: 'failed',
          error: {
            code: 'UNSUPPORTED_CONFIGURATION',
            message: `Duration ${request.duration}s is not supported by Google ${model}. Supported durations: [${capability.supported_durations.join(', ')}]s.`,
            retryable: false,
            provider: this.provider,
            model
          }
        };
      }

      const hasLastFrame = request.references.some(r => r.role === 'last_frame');
      if (hasLastFrame && !capability.last_frame) {
        return {
          provider: this.provider,
          model,
          providerRequestId: `req_err_${Date.now()}`,
          status: 'failed',
          error: {
            code: 'UNSUPPORTED_CONFIGURATION',
            message: `Last-frame keyframe conditioning is not supported by Google ${model}. The creative decision cannot be silently dropped.`,
            retryable: false,
            provider: this.provider,
            model
          }
        };
      }
    }

    try {
      const ai = this.getClient();
      const resolvedRefs = adapterReferenceResolver.resolveForGoogleVeo(request.references);

      // Construct Google GenAI generateVideos config
      const config: Record<string, any> = {
        durationSeconds: request.duration,
        aspectRatio: request.aspectRatio,
        personGeneration: 'ALLOW_ADULT'
      };

      if (request.resolution === '1080p') {
        config.resolution = '1080P';
      } else if (request.resolution === '720p') {
        config.resolution = '720P';
      }

      if (request.negativePrompt) {
        config.negativePrompt = request.negativePrompt;
      }

      const generatePayload: Record<string, any> = {
        model,
        prompt: request.prompt,
        config
      };

      if (resolvedRefs.firstFrameUrl) {
        generatePayload.image = {
          imageUri: resolvedRefs.firstFrameUrl
        };
      }

      const operation = await ai.models.generateVideos(generatePayload);
      const operationName = operation?.name || `operations/${Date.now()}`;

      return {
        provider: this.provider,
        model,
        providerRequestId: operationName,
        status: 'queued',
        progress: 10,
        metadata: {
          submittedAt: new Date().toISOString(),
          firstFrameAnchored: Boolean(resolvedRefs.firstFrameUrl),
          referenceCount: resolvedRefs.referenceImageUrls.length
        }
      };
    } catch (err: any) {
      const normalizedError = adapterErrorNormalizer.normalize(err, this.provider, model);
      return {
        provider: this.provider,
        model,
        providerRequestId: `req_fail_${Date.now()}`,
        status: 'failed',
        error: normalizedError
      };
    }
  }

  /**
   * Polls status of a running Google Veo long-running operation.
   */
  public async checkStatus(providerRequestId: string, model: string): Promise<ProviderGenerationResult> {
    try {
      const ai = this.getClient();
      const operation = await ai.operations.getVideosOperation({
        operation: { name: providerRequestId } as any
      });

      if (operation?.done) {
        if (operation?.error) {
          const normalizedError = adapterErrorNormalizer.normalize(operation.error, this.provider, model);
          return {
            provider: this.provider,
            model,
            providerRequestId,
            status: 'failed',
            error: normalizedError
          };
        }

        const generatedVideos = operation?.response?.generatedVideos;
        const videoUri = generatedVideos?.[0]?.video?.uri;

        if (videoUri) {
          return {
            provider: this.provider,
            model,
            providerRequestId,
            status: 'completed',
            outputUrl: videoUri,
            progress: 100,
            metadata: {
              completedAt: new Date().toISOString()
            }
          };
        }

        return {
          provider: this.provider,
          model,
          providerRequestId,
          status: 'failed',
          error: {
            code: 'UNKNOWN_PROVIDER_ERROR',
            message: 'Veo operation finished but returned no video output URI.',
            retryable: false,
            provider: this.provider,
            model
          }
        };
      }

      return {
        provider: this.provider,
        model,
        providerRequestId,
        status: 'processing',
        progress: 50
      };
    } catch (err: any) {
      const normalizedError = adapterErrorNormalizer.normalize(err, this.provider, model);
      return {
        provider: this.provider,
        model,
        providerRequestId,
        status: 'failed',
        error: normalizedError
      };
    }
  }

  /**
   * Cancellation: Google Veo operations do not expose a public cancel endpoint.
   */
  public async cancel(_providerRequestId: string, _model: string): Promise<boolean> {
    // Google Veo operations do not support cancellation upstream.
    return false;
  }
}

export const googleAdapter = new GoogleAdapter();
