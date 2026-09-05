/**
 * Video Job Domain Service.
 * Manages lifecycle, persistence, credit reservations, and provider-aware cancellation
 * for asynchronous video generation jobs.
 */

import { randomUUID } from 'node:crypto';
import {
  VideoJob,
  VideoJobStatus,
  VideoCreditState,
  VideoEngineKey,
  VideoProductTier,
  VideoCreationMode
} from '../../../../../packages/types/videoGeneration.js';
import { aiJobRepository } from '../../repositories/aiJobRepository.js';
import { creditService } from '../../services/creditService.js';
import { getSupabaseAdmin } from '../../infrastructure/supabase/supabaseClient.js';
import { googleOmniProvider } from './providers/googleOmniProvider.js';
import { googleVeoProvider } from './providers/googleVeoProvider.js';
import { falKlingProvider } from './providers/falKlingProvider.js';
import { falSeedanceProvider } from './providers/falSeedanceProvider.js';

export interface CreateVideoJobInput {
  workspaceId: string;
  userId: string;
  mode: VideoCreationMode;
  engine: VideoEngineKey;
  productTier: VideoProductTier;
  provider: 'google' | 'fal';
  reservationId: string;
  reservedCredits: number;
  prompt: string;
}

export class VideoJobService {
  private activeJobs = new Map<string, VideoJob>();

  async createJob(input: CreateVideoJobInput): Promise<VideoJob> {
    const jobId = randomUUID();

    // Persist to ai_generation_jobs table
    await aiJobRepository.createJob({
      workspaceId: input.workspaceId,
      requestedBy: input.userId,
      operation: 'generate_video',
      provider: input.provider,
      modelRequested: input.engine,
      creditsReserved: input.reservedCredits,
      idempotencyKey: `video_job_${jobId}`
    });

    const now = new Date().toISOString();
    const job: VideoJob = {
      jobId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      mode: input.mode,
      engine: input.engine,
      productTier: input.productTier,
      provider: input.provider,
      reservationId: input.reservationId,
      reservedCredits: input.reservedCredits,
      creditState: 'held',
      status: 'queued',
      progress: 0,
      createdAt: now,
      updatedAt: now
    };

    this.activeJobs.set(jobId, job);
    await this.persistJobState(job);

    return job;
  }

  getJob(jobId: string): VideoJob | undefined {
    return this.activeJobs.get(jobId);
  }

  async getJobWithFallback(jobId: string, workspaceId: string): Promise<VideoJob | null> {
    const memoryJob = this.activeJobs.get(jobId);
    if (memoryJob && memoryJob.workspaceId === workspaceId) {
      return memoryJob;
    }

    // Attempt database retrieval from ai_generation_jobs
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('ai_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error || !data) return null;

    const restoredJob: VideoJob = {
      jobId: data.id,
      workspaceId: data.workspace_id,
      userId: data.requested_by,
      mode: 'text_to_video',
      engine: (data.model_requested as VideoEngineKey) || 'google-omni',
      productTier: 'pro',
      provider: (data.provider as any) || 'google',
      providerJobId: data.provider_request_id,
      reservationId: data.reservation_id || '',
      reservedCredits: data.credits_reserved || 0,
      creditState: data.status === 'completed' ? 'captured' : data.status === 'failed' ? 'released' : 'held',
      status: data.status as VideoJobStatus,
      error: data.error_message,
      createdAt: data.created_at,
      updatedAt: data.completed_at || data.created_at
    };

    this.activeJobs.set(jobId, restoredJob);
    return restoredJob;
  }

  updateJob(jobId: string, updates: Partial<VideoJob>): VideoJob | null {
    const job = this.activeJobs.get(jobId);
    if (!job) return null;

    Object.assign(job, updates, { updatedAt: new Date().toISOString() });
    this.persistJobState(job).catch(err =>
      console.error(`[VideoJobService] Failed to persist job update for ${jobId}:`, err)
    );
    return job;
  }

  /**
   * Provider-aware cancellation with safe credit handling.
   */
  async cancelJob(jobId: string, workspaceId: string): Promise<{ success: boolean; status: VideoJobStatus; message: string }> {
    const job = await this.getJobWithFallback(jobId, workspaceId);
    if (!job) {
      return { success: false, status: 'failed', message: 'Video job not found.' };
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return { success: false, status: job.status, message: `Job is already in terminal state: ${job.status}.` };
    }

    // Case 1: Job has not yet been submitted to upstream provider
    if (job.status === 'queued' || job.status === 'preparing_references' || !job.providerJobId) {
      if (job.creditState === 'held' && job.reservationId) {
        await creditService.releaseCredits(job.reservationId, 'Cancelled by user before provider submission');
        job.creditState = 'released';
      }
      job.status = 'cancelled';
      job.updatedAt = new Date().toISOString();
      await this.persistJobState(job);
      return { success: true, status: 'cancelled', message: 'Job cancelled successfully before execution. Credits refunded.' };
    }

    // Case 2: In-flight job submitted to provider
    let upstreamCancelled = false;
    try {
      if (job.engine === 'google-omni') {
        upstreamCancelled = await googleOmniProvider.cancel(job.providerJobId);
      } else if (job.engine.startsWith('veo')) {
        upstreamCancelled = await googleVeoProvider.cancel(job.providerJobId);
      } else if (job.engine === 'kling-v3') {
        upstreamCancelled = await falKlingProvider.cancel(job.providerJobId);
      } else if (job.engine === 'seedance-2') {
        upstreamCancelled = await falSeedanceProvider.cancel(job.providerJobId);
      }
    } catch (err) {
      console.warn(`[VideoJobService] Upstream cancel attempt error for job ${jobId}:`, err);
    }

    if (upstreamCancelled) {
      if (job.creditState === 'held' && job.reservationId) {
        await creditService.releaseCredits(job.reservationId, 'Cancelled by user and confirmed upstream');
        job.creditState = 'released';
      }
      job.status = 'cancelled';
      job.updatedAt = new Date().toISOString();
      await this.persistJobState(job);
      return { success: true, status: 'cancelled', message: 'Job cancelled successfully upstream. Credits refunded.' };
    }

    // Case 3: Upstream cancellation cannot be immediately confirmed (e.g. Veo or async fal in-progress)
    // Safe invariant: hold credits until worker observes termination without generation output
    job.status = 'cancel_requested';
    job.updatedAt = new Date().toISOString();
    await this.persistJobState(job);
    return {
      success: true,
      status: 'cancel_requested',
      message: 'Cancellation requested. Credits will be automatically refunded as soon as the provider confirms termination.'
    };
  }

  getActiveJobs(): VideoJob[] {
    return Array.from(this.activeJobs.values());
  }

  private async persistJobState(job: VideoJob): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    await supabase
      .from('ai_generation_jobs')
      .update({
        status: job.status,
        provider_request_id: job.providerJobId,
        error_message: job.error,
        completed_at: (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') ? new Date().toISOString() : null
      })
      .eq('id', job.jobId);
  }
}

export const videoJobService = new VideoJobService();
