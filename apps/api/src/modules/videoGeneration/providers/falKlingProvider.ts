/**
 * fal Kling V3 Provider Adapter.
 * Integrates with official fal-ai/kling-video/v3 endpoints via @fal-ai/client.
 * Fully supports asynchronous queue submission, status polling, and upstream cancellation.
 */

import { fal } from '@fal-ai/client';
import { VideoGenerationRequest } from '../../../../../../packages/types/videoGeneration.js';
import { klingPayloadBuilder } from '../payloads/klingPayloadBuilder.js';
import { ProviderSubmitResult, ProviderCheckResult } from './googleOmniProvider.js';

export class FalKlingProvider {
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
    const { endpoint, input } = await klingPayloadBuilder.build(request, workspaceId);

    console.log(`[FalKlingProvider] Submitting request to queue: ${endpoint}...`);
    const result = await fal.queue.submit(endpoint, { input });

    const requestId = result?.request_id;
    if (!requestId) {
      throw new Error('fal Kling submission returned no request_id.');
    }

    // Embed the endpoint in the providerJobId so polling knows which endpoint to check
    const compositeId = `${endpoint}::${requestId}`;
    console.log(`[FalKlingProvider] Kling job queued: ${compositeId}`);

    return {
      providerJobId: compositeId,
      interactionId: requestId
    };
  }

  async check(providerJobId: string): Promise<ProviderCheckResult> {
    this.ensureConfigured();
    const [endpoint, requestId] = providerJobId.split('::');
    if (!endpoint || !requestId) {
      return { status: 'failed', error: `Invalid Kling providerJobId: ${providerJobId}` };
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
          error: 'Kling queue finished without video output URL.'
        };
      }

      if ((status as string) === 'FAILED') {
        const errMsg = (statusRes as any)?.error || 'Kling generation failed.';
        return { status: 'failed', error: errMsg };
      }

      if (status === 'IN_PROGRESS') {
        return { status: 'generating_motion', progress: 60 };
      }

      // IN_QUEUE
      return { status: 'queued', progress: 10 };
    } catch (err: any) {
      console.error(`[FalKlingProvider] Error checking job ${providerJobId}:`, err);
      return { status: 'failed', error: err?.message || 'Failed to poll Kling status.' };
    }
  }

  async cancel(providerJobId: string): Promise<boolean> {
    this.ensureConfigured();
    const [endpoint, requestId] = providerJobId.split('::');
    if (!endpoint || !requestId) return false;

    try {
      await fal.queue.cancel(endpoint, { requestId });
      console.log(`[FalKlingProvider] Cancelled Kling job ${requestId} upstream.`);
      return true;
    } catch (err) {
      console.warn(`[FalKlingProvider] Failed to cancel Kling job ${requestId}:`, err);
      return false;
    }
  }
}

export const falKlingProvider = new FalKlingProvider();
