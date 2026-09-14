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
import { storageService } from '../../services/storageService.js';
import { getSupabaseAdmin } from '../../infrastructure/supabase/supabaseClient.js';
import { googleOmniProvider } from './providers/googleOmniProvider.js';
import { googleVeoProvider } from './providers/googleVeoProvider.js';
import { falKlingProvider } from './providers/falKlingProvider.js';
import { falSeedanceProvider } from './providers/falSeedanceProvider.js';

export interface CreateVideoJobInput {
  jobId?: string;
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
    const jobId = input.jobId || randomUUID();

    // Persist to ai_generation_jobs table with explicit id
    await aiJobRepository.createJob({
      id: jobId,
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
    return job;
  }

  getJob(jobId: string): VideoJob | undefined {
    return this.activeJobs.get(jobId);
  }

  async getJobWithFallback(jobId: string, workspaceId: string): Promise<VideoJob | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return this.activeJobs.get(jobId) || null;
    }

    // Retrieve authoritative state directly from PostgreSQL ai_generation_jobs
    const { data, error } = await supabase
      .from('ai_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error || !data) {
      return this.activeJobs.get(jobId) || null;
    }

    // Fetch signed output URL if job is completed
    let outputUrl: string | undefined = undefined;
    let outputAssetId: string | undefined = undefined;

    if (data.status === 'completed') {
      const { data: outputData } = await supabase
        .from('ai_generation_outputs')
        .select('*')
        .eq('generation_job_id', data.id)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (outputData && outputData.storage_path) {
        outputAssetId = outputData.asset_id || undefined;
        outputUrl = (await storageService.getSignedUrl(outputData.storage_path, 86400)) || undefined;
      }
    }

    let mappedStatus: VideoJobStatus = 'generating_motion';
    let progress = 50;

    if (data.status === 'pending') {
      mappedStatus = 'queued';
      progress = 10;
    } else if (data.status === 'completed') {
      mappedStatus = 'completed';
      progress = 100;
    } else if (data.status === 'failed') {
      mappedStatus = 'failed';
      progress = 0;
    } else if (data.status === 'cancelled') {
      mappedStatus = 'cancelled';
      progress = 0;
    }

    // Recover reservationId from credit_holds if not present
    let reservationId = '';
    const { data: hold } = await supabase
      .from('credit_holds')
      .select('id')
      .eq('reference_id', data.id)
      .maybeSingle();
    if (hold) {
      reservationId = hold.id;
    }

    const restoredJob: VideoJob = {
      jobId: data.id,
      workspaceId: data.workspace_id,
      userId: data.requested_by,
      mode: 'text_to_video',
      engine: (data.model_requested as VideoEngineKey) || 'google-omni',
      productTier: 'pro',
      provider: (data.provider as any) || 'google',
      providerJobId: data.provider_request_id,
      reservationId,
      reservedCredits: data.credits_reserved || 0,
      creditState: data.status === 'completed' ? 'captured' : (data.status === 'failed' || data.status === 'cancelled') ? 'released' : 'held',
      status: mappedStatus,
      progress,
      outputUrl,
      outputAssetId,
      error: data.error_message,
      createdAt: data.created_at,
      updatedAt: data.completed_at || data.started_at || data.created_at
    };

    this.activeJobs.set(jobId, restoredJob);
    return restoredJob;
  }

  updateJob(jobId: string, updates: Partial<VideoJob>): VideoJob | null {
    const job = this.activeJobs.get(jobId);
    if (job) {
      Object.assign(job, updates, { updatedAt: new Date().toISOString() });
    }
    this.persistJobState(jobId, updates).catch(err =>
      console.error(`[VideoJobService] Failed to persist job update for ${jobId}:`, err)
    );
    return job || null;
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
      await this.persistJobState(job.jobId, { status: 'cancelled' });
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
      await this.persistJobState(job.jobId, { status: 'cancelled' });
      return { success: true, status: 'cancelled', message: 'Job cancelled successfully upstream. Credits refunded.' };
    }

    // Case 3: Upstream cancellation cannot be immediately confirmed
    job.status = 'cancel_requested';
    job.updatedAt = new Date().toISOString();
    await this.persistJobState(job.jobId, { status: 'cancel_requested' });
    return {
      success: true,
      status: 'cancel_requested',
      message: 'Cancellation requested. Credits will be automatically refunded as soon as the provider confirms termination.'
    };
  }

  getActiveJobs(): VideoJob[] {
    return Array.from(this.activeJobs.values());
  }

  private async persistJobState(jobId: string, updates: Partial<VideoJob>): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    const dbPayload: any = {};
    if (updates.status) {
      // Map VideoJobStatus to DB job_status enum
      if (updates.status === 'completed') dbPayload.status = 'completed';
      else if (updates.status === 'failed') dbPayload.status = 'failed';
      else if (updates.status === 'cancelled') dbPayload.status = 'cancelled';
      else if (updates.status === 'generating_motion' || updates.status === 'finalizing') dbPayload.status = 'running';
    }
    if (updates.providerJobId) {
      dbPayload.provider_request_id = updates.providerJobId;
    }
    if (updates.error) {
      dbPayload.error_message = updates.error;
    }
    if (updates.status === 'completed' || updates.status === 'failed' || updates.status === 'cancelled') {
      dbPayload.completed_at = new Date().toISOString();
    }

    if (Object.keys(dbPayload).length > 0) {
      await supabase
        .from('ai_generation_jobs')
        .update(dbPayload)
        .eq('id', jobId);
    }
  }
}

export const videoJobService = new VideoJobService();
