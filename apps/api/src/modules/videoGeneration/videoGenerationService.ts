/**
 * Master Video Generation Domain Service.
 * Coordinates model resolution, capability validation, atomic credit reservation,
 * provider dispatch, and job lifecycle.
 */

import { randomUUID } from 'node:crypto';
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

import { getSupabaseAdmin } from '../../infrastructure/supabase/supabaseClient.js';

export class VideoGenerationService {
  /**
   * Dispatches an asynchronous video generation request.
   */
  async generate(
    request: VideoGenerationRequest,
    authContext: { userId: string; workspaceId: string }
  ): Promise<VideoJob> {
    const { userId, workspaceId } = authContext;
    if (!workspaceId) {
      const err: any = new Error('No authorized workspace provided.');
      err.statusCode = 400;
      err.code = 'WORKSPACE_REQUIRED';
      throw err;
    }

    const isMember = await workspaceRepository.isUserMemberOfWorkspace(userId, workspaceId);
    if (!isMember) {
      const err: any = new Error(`Forbidden: User ${userId} is not authorized for workspace ${workspaceId}.`);
      err.statusCode = 403;
      err.code = 'FORBIDDEN_WORKSPACE_ACCESS';
      throw err;
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

    // 3. Atomically Reserve Credits (Hold) via PostgreSQL RPC
    const requiredCredits = capability.creditCost;
    const jobId = randomUUID();
    const clientKey = request.idempotencyKey || `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let reservationId = '';

    const engineKey = resolution.engineKey;

    const holdResult = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: requiredCredits,
      idempotencyKey: request.idempotencyKey ? `hold_${request.idempotencyKey}` : `hold_${jobId}`,
      referenceId: jobId,
      description: `Video Generation (${capability.displayName})`
    });

    if (!holdResult.success || !holdResult.holdId) {
      const available = await creditService.getAvailableBalance(workspaceId).catch(() => 0);
      throw new InsufficientCreditsError({
        service: 'Video Generation',
        requiredCredits,
        availableCredits: holdResult.available ?? available,
        model: engineKey
      });
    }

    reservationId = holdResult.holdId;

    // 4. Create Active Job in Domain Service and DB
    const job = await videoJobService.createJob({
      jobId,
      workspaceId,
      userId,
      mode: request.mode || 'text_to_video',
      engine: engineKey,
      productTier: capability.productTier,
      provider: capability.provider,
      reservationId,
      reservedCredits: requiredCredits,
      prompt: request.prompt
    });

    // 5. Dispatch Asynchronously to Underlying Engine Provider
    try {
      let dispatchPromise: Promise<{ providerJobId: string; interactionId?: string }>;

      if (engineKey === 'google-omni') {
        dispatchPromise = googleOmniProvider.submit(request, workspaceId);
      } else if (engineKey === 'kling-v3') {
        dispatchPromise = falKlingProvider.submit(request, workspaceId);
      } else if (engineKey === 'seedance-2') {
        dispatchPromise = falSeedanceProvider.submit(request, workspaceId);
      } else {
        // 'veo-pro' | 'veo-fast' | 'veo-lite'
        dispatchPromise = googleVeoProvider.submit(request, workspaceId);
      }

      // Track provider request ID once accepted
      dispatchPromise.then((submitResult) => {
        videoJobService.updateJob(job.jobId, {
          providerJobId: submitResult.providerJobId,
          status: 'generating_motion',
          progress: 25
        });
      }).catch(async (asyncErr) => {
        console.error(`[VideoGenerationService] Async dispatch failed for job ${job.jobId}:`, asyncErr);
        await creditService.releaseCredits(reservationId, `Dispatch failure: ${asyncErr?.message}`);
        videoJobService.updateJob(job.jobId, {
          status: 'failed',
          creditState: 'released',
          error: asyncErr?.message || 'Upstream provider failure'
        });
      });

      // Advance job to queued state
      videoJobService.updateJob(job.jobId, {
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

  async editJob(
    jobId: string,
    input: { instruction: string; editMode?: string; extendSeconds?: number },
    authContext: { userId: string; workspaceId: string }
  ): Promise<VideoJob> {
    const parentJob = await this.getJobStatus(jobId, authContext.workspaceId);
    if (!parentJob) {
      const err: any = new Error(`Video job ${jobId} not found in workspace.`);
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const editRequest: VideoGenerationRequest = {
      prompt: `${parentJob.prompt || ''} Edit: ${input.instruction}`,
      mode: 'edit_video',
      selectedEngine: parentJob.engine,
      references: parentJob.outputAssetId ? [{ assetId: parentJob.outputAssetId, type: 'motion_video', label: 'source_video' }] : undefined,
      aspectRatio: parentJob.aspectRatio as any,
      durationSeconds: input.extendSeconds || parentJob.durationSeconds,
    };

    return this.generate(editRequest, authContext);
  }

  async extendJob(
    jobId: string,
    input: { extendSeconds: number; promptAddition?: string },
    authContext: { userId: string; workspaceId: string }
  ): Promise<VideoJob> {
    const parentJob = await this.getJobStatus(jobId, authContext.workspaceId);
    if (!parentJob) {
      const err: any = new Error(`Video job ${jobId} not found in workspace.`);
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const extendRequest: VideoGenerationRequest = {
      prompt: input.promptAddition ? `${parentJob.prompt || ''} ${input.promptAddition}` : (parentJob.prompt || 'Extend video'),
      mode: 'extend_video',
      selectedEngine: parentJob.engine,
      references: parentJob.outputAssetId ? [{ assetId: parentJob.outputAssetId, type: 'motion_video', label: 'source_video' }] : undefined,
      aspectRatio: parentJob.aspectRatio as any,
      durationSeconds: (parentJob.durationSeconds || 5) + input.extendSeconds,
    };

    return this.generate(extendRequest, authContext);
  }

  async getJobHistory(workspaceId: string, limit = 20): Promise<VideoJob[]> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return videoJobService.getActiveJobs().filter((j) => j.workspaceId === workspaceId).slice(0, limit);
    }

    const { data, error } = await supabase
      .from('ai_generation_jobs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('operation', 'generate_video')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return videoJobService.getActiveJobs().filter((j) => j.workspaceId === workspaceId).slice(0, limit);
    }

    const jobs: VideoJob[] = [];
    for (const row of data) {
      const job = await videoJobService.getJobWithFallback(row.id, workspaceId);
      if (job) {
        jobs.push(job);
      }
    }
    return jobs;
  }

  getCapabilities(): Record<VideoEngineKey, VideoEngineCapability> {
    return VIDEO_CAPABILITIES;
  }
}

export const videoGenerationService = new VideoGenerationService();
