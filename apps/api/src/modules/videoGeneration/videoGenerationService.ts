/**
 * Master Video Generation Domain Service.
 * Coordinates model resolution, capability validation, atomic credit reservation,
 * provider dispatch, and job lifecycle.
 */

import {
  VideoGenerationRequest,
  VideoJob,
  VideoEngineKey,
  VideoEngineCapability
} from '../../../../../packages/types/videoGeneration.js';
import { videoModelResolver } from './videoModelResolver.js';
import { videoRequestValidator } from './videoRequestValidator.js';
import { VIDEO_CAPABILITIES } from './videoCapabilityRegistry.js';
import { videoJobService } from './videoJobService.js';
import { googleOmniProvider } from './providers/googleOmniProvider.js';
import { googleVeoProvider } from './providers/googleVeoProvider.js';
import { falKlingProvider } from './providers/falKlingProvider.js';
import { falSeedanceProvider } from './providers/falSeedanceProvider.js';
import { creditService } from '../../services/creditService.js';
import { workspaceRepository } from '../../repositories/workspaceRepository.js';
import { InsufficientCreditsError } from '../billing/billingErrorUtils.js';

export class VideoGenerationService {
  /**
   * Dispatches an asynchronous video generation request.
   */
  async generate(
    request: VideoGenerationRequest,
    authContext: { userId: string; workspaceId?: string }
  ): Promise<VideoJob> {
    const { userId } = authContext;
    const workspaces = await workspaceRepository.getUserWorkspaces(userId);
    const workspaceId = authContext.workspaceId || workspaces?.[0]?.id;
    if (!workspaceId) {
      throw new Error('No authorized workspace found for user.');
    }

    // 1. Resolve Engine & Capability
    const resolution = videoModelResolver.resolve(request);
    const capability = resolution.capability;

    // 2. Validate Request against Engine Capability
    const validation = videoRequestValidator.validate(request, capability);
    if (!validation.valid) {
      const err: any = new Error(validation.error || 'Video request validation failed.');
      err.statusCode = 400;
      err.field = validation.field;
      throw err;
    }

    // 3. Authoritative Backend Atomic Credit Reservation (Row-level lock)
    const requiredCredits = capability.creditCost;
    const idempotencyKey = `video_gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const holdResult = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: requiredCredits,
      idempotencyKey: `hold_${idempotencyKey}`,
      referenceId: idempotencyKey,
      description: `AI Video Generation: ${capability.displayName}`
    });

    if (!holdResult.success || !holdResult.holdId) {
      throw new InsufficientCreditsError({
        required: requiredCredits,
        available: holdResult.available ?? 0,
        service: capability.displayName
      });
    }

    const reservationId = holdResult.holdId;

    // 4. Create Video Job in repository
    const job = await videoJobService.createJob({
      workspaceId,
      userId,
      mode: request.mode,
      engine: capability.engineKey,
      productTier: capability.productTier,
      provider: capability.provider,
      reservationId,
      reservedCredits: requiredCredits,
      prompt: request.prompt
    });

    // 5. Submit to upstream provider asynchronously
    try {
      let submitRes;
      if (capability.engineKey === 'google-omni') {
        submitRes = await googleOmniProvider.submit(request, workspaceId);
      } else if (capability.engineKey.startsWith('veo')) {
        submitRes = await googleVeoProvider.submit(request, workspaceId);
      } else if (capability.engineKey === 'kling-v3') {
        submitRes = await falKlingProvider.submit(request, workspaceId);
      } else if (capability.engineKey === 'seedance-2') {
        submitRes = await falSeedanceProvider.submit(request, workspaceId);
      } else {
        throw new Error(`Unsupported engine key: ${capability.engineKey}`);
      }

      videoJobService.updateJob(job.jobId, {
        providerJobId: submitRes.providerJobId,
        interactionId: submitRes.interactionId,
        status: 'generating_motion',
        progress: 10
      });

      return videoJobService.getJob(job.jobId) || job;
    } catch (submitErr: any) {
      console.error(`[VideoGenerationService] Provider submission failed for job ${job.jobId}:`, submitErr);
      // Immediately release credit hold on submission error
      await creditService.releaseCredits(reservationId, `Provider submission failed: ${submitErr?.message}`);
      videoJobService.updateJob(job.jobId, {
        status: 'failed',
        creditState: 'released',
        error: submitErr?.message || 'Provider submission failed'
      });
      throw submitErr;
    }
  }

  async getJobStatus(jobId: string, workspaceId: string): Promise<VideoJob | null> {
    return videoJobService.getJobWithFallback(jobId, workspaceId);
  }

  async cancelJob(jobId: string, workspaceId: string) {
    return videoJobService.cancelJob(jobId, workspaceId);
  }

  getCapabilities(): Record<VideoEngineKey, VideoEngineCapability> {
    return VIDEO_CAPABILITIES;
  }
}

export const videoGenerationService = new VideoGenerationService();
