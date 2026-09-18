/**
 * ByteDance Seedance 2.0 Provider Adapter for Video Gem.
 * IMPORTANT: Strictly uses Seedance 2.0 via the fal.ai API infrastructure (@fal-ai/client).
 *
 * Supports multimodal reference arrays (up to 9 reference images) with
 * specialized product and character image conditioning.
 */

import { fal } from '@fal-ai/client';
import type {
  ProviderAdapter,
  ProviderExecutionRequest,
  ProviderGenerationResult,
  ProviderId
} from '@contracts/providerAdapterContracts.js';
import { adapterReferenceResolver } from '../shared/referenceResolver.js';
import { adapterErrorNormalizer } from '../shared/errorNormalizer.js';
import { getModelCapability } from '../../../../../../../packages/ad-director/index.js';

export class SeedanceAdapter implements ProviderAdapter {
  public readonly provider: ProviderId = 'seedance';
  private configured = false;
  private clientOverride?: any;

  constructor(clientOverride?: any) {
    this.clientOverride = clientOverride;
  }

  public supportsModel(modelId: string): boolean {
    return ['seedance_2_0', 'bytedance/seedance-2.0'].includes(modelId);
  }

  private ensureConfigured(): any {
    if (this.clientOverride) return this.clientOverride;
    if (!this.configured) {
      const apiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
      if (!apiKey) {
        throw new Error('fal.ai API Key is missing for Seedance 2.0. Set FAL_KEY in environment.');
      }
      fal.config({ credentials: apiKey });
      this.configured = true;
    }
    return fal;
  }

  /**
   * Submits a Seedance 2.0 video generation request via the fal.ai API.
   */
  public async submit(request: ProviderExecutionRequest): Promise<ProviderGenerationResult> {
    const model = request.model;

    // 1. Creative Intent Invariant Verification (Never silently alter creative decisions)
    const capability = getModelCapability('seedance_2_0', true);
    if (capability) {
      if (!capability.supported_durations.includes(request.duration)) {
        return {
          provider: this.provider,
          model,
          providerRequestId: `req_err_${Date.now()}`,
          status: 'failed',
          error: {
            code: 'UNSUPPORTED_CONFIGURATION',
            message: `Duration ${request.duration}s is not supported by Seedance 2.0. Supported durations: [${capability.supported_durations.join(', ')}]s.`,
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
            message: 'Last-frame keyframe guidance is not supported by Seedance 2.0. Creative decisions cannot be silently dropped.',
            retryable: false,
            provider: this.provider,
            model
          }
        };
      }

      if (request.references.length > capability.max_references) {
        return {
          provider: this.provider,
          model,
          providerRequestId: `req_err_${Date.now()}`,
          status: 'failed',
          error: {
            code: 'UNSUPPORTED_CONFIGURATION',
            message: `Request specifies ${request.references.length} references, exceeding Seedance 2.0 capacity of ${capability.max_references}.`,
            retryable: false,
            provider: this.provider,
            model
          }
        };
      }
    }

    try {
      const client = this.ensureConfigured();
      const resolvedRefs = adapterReferenceResolver.resolveForSeedance(request.references);
      const endpoint = 'bytedance/seedance-2.0';

      const input: Record<string, any> = {
        prompt: request.prompt,
        duration: request.duration,
        aspect_ratio: request.aspectRatio
      };

      if (request.negativePrompt) {
        input.negative_prompt = request.negativePrompt;
      }

      // First frame keyframe
      if (resolvedRefs.firstFrameUrl) {
        input.image_url = resolvedRefs.firstFrameUrl;
      }

      // Multimodal reference arrays supported by Seedance 2.0 on fal
      if (resolvedRefs.allReferenceUrls.length > 0) {
        input.reference_images = resolvedRefs.allReferenceUrls;
      }

      if (resolvedRefs.characterImageUrls.length > 0) {
        input.character_images = resolvedRefs.characterImageUrls;
      }

      if (resolvedRefs.productImageUrls.length > 0) {
        input.product_images = resolvedRefs.productImageUrls;
      }

      const result = await client.queue.submit(endpoint, { input });
      const requestId = result?.request_id;
      if (!requestId) {
        throw new Error('fal Seedance 2.0 submission returned no request_id.');
      }

      const compositeId = `${endpoint}::${requestId}`;

      return {
        provider: this.provider,
        model,
        providerRequestId: compositeId,
        status: 'queued',
        progress: 10,
        metadata: {
          submittedAt: new Date().toISOString(),
          endpoint,
          requestId,
          apiGateway: 'fal.ai',
          referencesBound: resolvedRefs.allReferenceUrls.length
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
   * Polls status of a Seedance generation job via fal.ai queue.
   */
  public async checkStatus(providerRequestId: string, model: string): Promise<ProviderGenerationResult> {
    const [endpoint, requestId] = providerRequestId.split('::');
    if (!endpoint || !requestId) {
      return {
        provider: this.provider,
        model,
        providerRequestId,
        status: 'failed',
        error: {
          code: 'INVALID_REQUEST',
          message: `Invalid Seedance composite providerRequestId: ${providerRequestId}`,
          retryable: false,
          provider: this.provider,
          model
        }
      };
    }

    try {
      const client = this.ensureConfigured();
      const statusRes = await client.queue.status(endpoint, { requestId });
      const status = statusRes?.status;

      if (status === 'COMPLETED') {
        const resultRes: any = await client.queue.result(endpoint, { requestId });
        const videoUrl =
          resultRes?.data?.video?.url ||
          resultRes?.data?.videos?.[0]?.url ||
          resultRes?.video?.url;

        if (videoUrl) {
          return {
            provider: this.provider,
            model,
            providerRequestId,
            status: 'completed',
            outputUrl: videoUrl,
            progress: 100,
            metadata: {
              completedAt: new Date().toISOString(),
              endpoint,
              apiGateway: 'fal.ai'
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
            message: 'Seedance job completed on fal but returned no video output URL.',
            retryable: false,
            provider: this.provider,
            model
          }
        };
      }

      if (status === 'FAILED') {
        const rawErr = statusRes?.error || 'Seedance generation failed on fal queue.';
        const normalizedError = adapterErrorNormalizer.normalize(rawErr, this.provider, model);
        return {
          provider: this.provider,
          model,
          providerRequestId,
          status: 'failed',
          error: normalizedError
        };
      }

      if (status === 'IN_PROGRESS') {
        return {
          provider: this.provider,
          model,
          providerRequestId,
          status: 'processing',
          progress: 60
        };
      }

      return {
        provider: this.provider,
        model,
        providerRequestId,
        status: 'queued',
        progress: 15
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
   * Cancels a Seedance job on fal.ai queue.
   */
  public async cancel(providerRequestId: string, _model: string): Promise<boolean> {
    const [endpoint, requestId] = providerRequestId.split('::');
    if (!endpoint || !requestId) return false;

    try {
      const client = this.ensureConfigured();
      await client.queue.cancel(endpoint, { requestId });
      return true;
    } catch {
      return false;
    }
  }
}

export const seedanceAdapter = new SeedanceAdapter();
