/**
 * fal Seedance 2.0 Provider Adapter.
 * Integrates with official bytedance/seedance-2.0 endpoints on fal.ai via @fal-ai/client.
 * Supports reference-to-video with multimodal arrays (up to 9 images, 3 videos, 3 audio files).
 */

import { fal } from '@fal-ai/client';
import { VideoGenerationRequest } from '../../../../../../packages/types/videoGeneration.js';
import { seedancePayloadBuilder } from '../payloads/seedancePayloadBuilder.js';
import { ProviderSubmitResult, ProviderCheckResult } from './googleOmniProvider.js';

export class FalSeedanceProvider {
  private configured = false;

  private ensureConfigured(): void {
    if (this.configured) return;
    const apiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
    if (!apiKey) {
      throw new Error('fal.ai API Key is missing. Set FAL_KEY in environment.');
    }
    fal.config({ credentials: apiKey });
    this.configured = true;
  }

  async submit(request: VideoGenerationRequest, workspaceId: string): Promise<ProviderSubmitResult> {
    this.ensureConfigured();
    const { endpoint, input } = await seedancePayloadBuilder.build(request, workspaceId);

    console.log(`[FalSeedanceProvider] Submitting request to queue: ${endpoint}...`);
    const result = await fal.queue.submit(endpoint, { input });

    const requestId = result?.request_id;
    if (!requestId) {
      throw new Error('fal Seedance submission returned no request_id.');
    }

    const compositeId = `${endpoint}::${requestId}`;
    console.log(`[FalSeedanceProvider] Seedance job queued: ${compositeId}`);

    return {
      providerJobId: compositeId,
      interactionId: requestId
    };
  }

  async check(providerJobId: string): Promise<ProviderCheckResult> {
    this.ensureConfigured();
    const [endpoint, requestId] = providerJobId.split('::');
    if (!endpoint || !requestId) {
      return { status: 'failed', error: `Invalid Seedance providerJobId: ${providerJobId}` };
    }

    try {
      const statusRes = await fal.queue.status(endpoint, { requestId });
      const status = statusRes?.status;

      if (status === 'COMPLETED') {
        const resultRes: any = await fal.queue.result(endpoint, { requestId });
        const videoUrl = resultRes?.data?.video?.url || resultRes?.data?.videos?.[0]?.url;

        if (videoUrl) {
          return { status: 'completed', videoUrl, progress: 100 };
        }

        return {
          status: 'failed',
          error: 'Seedance queue finished without video output URL.'
        };
      }

      if ((status as string) === 'FAILED') {
        const errMsg = (statusRes as any)?.error || 'Seedance generation failed.';
        return { status: 'failed', error: errMsg };
      }

      if (status === 'IN_PROGRESS') {
        return { status: 'generating_motion', progress: 60 };
      }

      return { status: 'queued', progress: 10 };
    } catch (err: any) {
      console.error(`[FalSeedanceProvider] Error checking job ${providerJobId}:`, err);
      return { status: 'failed', error: err?.message || 'Failed to poll Seedance status.' };
    }
  }

  async cancel(providerJobId: string): Promise<boolean> {
    this.ensureConfigured();
    const [endpoint, requestId] = providerJobId.split('::');
    if (!endpoint || !requestId) return false;

    try {
      await fal.queue.cancel(endpoint, { requestId });
      console.log(`[FalSeedanceProvider] Cancelled Seedance job ${requestId} upstream.`);
      return true;
    } catch (err) {
      console.warn(`[FalSeedanceProvider] Failed to cancel Seedance job ${requestId}:`, err);
      return false;
    }
  }
}

export const falSeedanceProvider = new FalSeedanceProvider();
