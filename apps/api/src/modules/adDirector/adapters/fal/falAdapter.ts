/**
 * Fal.ai Provider Adapter for Video Gem.
 * Integrates with Kling 3.0, Runway Gen-3, Luma Dream Machine, and MiniMax
 * endpoints on fal.ai via @fal-ai/client.
 *
 * Supports asynchronous queue submission, status polling, and cancellation.
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

export class FalAdapter implements ProviderAdapter {
  public readonly provider: ProviderId = 'fal';
  private configured = false;
  private clientOverride?: any;

  constructor(clientOverride?: any) {
    this.clientOverride = clientOverride;
  }

  public supportsModel(modelId: string): boolean {
    return ['kling_v3', 'runway_gen3', 'luma_dream_machine_1_6', 'minimax_hailuo'].includes(modelId);
  }

  private ensureConfigured(): any {
    if (this.clientOverride) return this.clientOverride;
    if (!this.configured) {
      const apiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
      if (!apiKey) {
        throw new Error('fal.ai API Key is missing. Set FAL_KEY in environment.');
      }
      fal.config({ credentials: apiKey });
      this.configured = true;
    }
    return fal;
  }

  private resolveEndpoint(model: string, hasFirstFrame: boolean): string {
    switch (model) {
      case 'kling_v3':
        return hasFirstFrame ? 'fal-ai/kling-video/v3/image-to-video' : 'fal-ai/kling-video/v3/text-to-video';
      case 'runway_gen3':
        return hasFirstFrame ? 'fal-ai/runway-gen3/image-to-video' : 'fal-ai/runway-gen3/text-to-video';
      case 'luma_dream_machine_1_6':
        return 'fal-ai/luma-dream-machine/v1.6';
      case 'minimax_hailuo':
        return hasFirstFrame ? 'fal-ai/minimax-video/image-to-video' : 'fal-ai/minimax-video';
      default:
        return `fal-ai/${model}`;
    }
  }

  /**
   * Submits a video generation request to fal.ai.
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
            message: `Duration ${request.duration}s is not supported by ${model} on Fal. Supported durations: [${capability.supported_durations.join(', ')}]s.`,
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
            message: `Last-frame keyframe conditioning is not supported by ${model} on Fal. Creative decisions cannot be silently altered.`,
            retryable: false,
            provider: this.provider,
            model
          }
        };
      }

      const hasCharRef = request.references.some(r => r.role === 'character_ref');
      if (hasCharRef && !capability.character_reference) {
        return {
          provider: this.provider,
          model,
          providerRequestId: `req_err_${Date.now()}`,
          status: 'failed',
          error: {
            code: 'UNSUPPORTED_CONFIGURATION',
            message: `Character reference image conditioning is not supported by ${model} on Fal.`,
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
            message: `Request specifies ${request.references.length} references, exceeding ${model} maximum capacity of ${capability.max_references}.`,
            retryable: false,
            provider: this.provider,
            model
          }
        };
      }
    }

    try {
      const client = this.ensureConfigured();
      const resolvedRefs = adapterReferenceResolver.resolveForFal(request.references);
      const hasFirstFrame = Boolean(resolvedRefs.imageUrl);
      const endpoint = this.resolveEndpoint(model, hasFirstFrame);

      const input: Record<string, any> = {
        prompt: request.prompt,
        duration: request.duration,
        aspect_ratio: request.aspectRatio
      };

      if (request.negativePrompt && capability?.negative_prompt) {
        input.negative_prompt = request.negativePrompt;
      }

      if (resolvedRefs.imageUrl) {
        input.image_url = resolvedRefs.imageUrl;
      }

      if (resolvedRefs.tailImageUrl && capability?.last_frame) {
        input.tail_image_url = resolvedRefs.tailImageUrl;
      }

      const result = await client.queue.submit(endpoint, { input });
      const requestId = result?.request_id;
      if (!requestId) {
        throw new Error(`fal.ai ${model} submission returned no request_id.`);
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
          requestId
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
   * Polls status of a fal.ai queued generation job.
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
          message: `Invalid Fal composite providerRequestId: ${providerRequestId}`,
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
              endpoint
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
            message: 'Fal job completed but response contained no video URL.',
            retryable: false,
            provider: this.provider,
            model
          }
        };
      }

      if (status === 'FAILED') {
        const rawErr = statusRes?.error || 'Fal video generation failed.';
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
   * Cancels a queued job on fal.ai.
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

export const falAdapter = new FalAdapter();
