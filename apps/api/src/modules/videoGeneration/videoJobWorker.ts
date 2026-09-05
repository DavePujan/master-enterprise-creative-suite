/**
 * Video Job Worker & Reconciler.
 * Decouples provider polling, asset streaming, Supabase Storage uploads,
 * public.assets creation, and atomic credit settlement from HTTP request lifecycles.
 */

import { videoJobService } from './videoJobService.js';
import { googleOmniProvider } from './providers/googleOmniProvider.js';
import { googleVeoProvider } from './providers/googleVeoProvider.js';
import { falKlingProvider } from './providers/falKlingProvider.js';
import { falSeedanceProvider } from './providers/falSeedanceProvider.js';
import { assetRepository } from '../../repositories/assetRepository.js';
import { aiJobRepository } from '../../repositories/aiJobRepository.js';
import { creditService } from '../../services/creditService.js';
import { storageService } from '../../services/storageService.js';
import { getSupabaseAdmin } from '../../infrastructure/supabase/supabaseClient.js';
import { VideoJob } from '../../../../../packages/types/videoGeneration.js';

export class VideoJobWorker {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  start(intervalMs = 3000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch(err => console.error('[VideoJobWorker] Tick error:', err));
    }, intervalMs);
    console.log('[VideoJobWorker] Background polling worker started.');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const activeJobs = videoJobService.getActiveJobs().filter(j =>
        ['queued', 'generating_motion', 'synthesizing_audio', 'finalizing', 'cancel_requested'].includes(j.status)
      );

      for (const job of activeJobs) {
        if (!job.providerJobId) continue;
        await this.pollJob(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async pollJob(job: VideoJob): Promise<void> {
    try {
      let checkRes;
      if (job.engine === 'google-omni') {
        checkRes = await googleOmniProvider.check(job.providerJobId!);
      } else if (job.engine.startsWith('veo')) {
        checkRes = await googleVeoProvider.check(job.providerJobId!);
      } else if (job.engine === 'kling-v3') {
        checkRes = await falKlingProvider.check(job.providerJobId!);
      } else if (job.engine === 'seedance-2') {
        checkRes = await falSeedanceProvider.check(job.providerJobId!);
      } else {
        return;
      }

      if (!checkRes) return;

      // Check if cancellation was requested and completed or terminated
      if (job.status === 'cancel_requested') {
        if (checkRes.status === 'failed') {
          // Upstream officially terminated -> release credit hold
          if (job.creditState === 'held' && job.reservationId) {
            await creditService.releaseCredits(job.reservationId, 'Cancelled after confirmation from provider');
            job.creditState = 'released';
          }
          videoJobService.updateJob(job.jobId, { status: 'cancelled', creditState: 'released' });
          return;
        }
      }

      if (checkRes.status === 'completed' && checkRes.videoUrl) {
        await this.handleCompletedJob(job, checkRes.videoUrl);
      } else if (checkRes.status === 'failed') {
        await this.handleFailedJob(job, checkRes.error || 'Video generation failed upstream.');
      } else if (checkRes.status === 'generating_motion') {
        videoJobService.updateJob(job.jobId, {
          status: 'generating_motion',
          progress: checkRes.progress || 50
        });
      }
    } catch (err: any) {
      console.error(`[VideoJobWorker] Error while polling job ${job.jobId}:`, err);
    }
  }

  private async handleCompletedJob(job: VideoJob, upstreamUrl: string): Promise<void> {
    console.log(`[VideoJobWorker] Job ${job.jobId} completed upstream. Downloading and persisting asset...`);
    videoJobService.updateJob(job.jobId, { status: 'finalizing', progress: 90 });

    try {
      // 1. Download upstream video
      const res = await fetch(upstreamUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch video stream from upstream: ${res.statusText}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const videoBuffer = Buffer.from(arrayBuffer);

      // 2. Upload to Supabase user-assets bucket
      const storagePath = `workspaces/${job.workspaceId}/videos/${job.jobId}.mp4`;
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { error: uploadError } = await supabase.storage
          .from('user-assets')
          .upload(storagePath, videoBuffer, {
            contentType: 'video/mp4',
            upsert: true
          });
        if (uploadError) {
          console.warn('[VideoJobWorker] Supabase upload failed, using upstream URL fallback:', uploadError);
        }
      }

      // 3. Create record in public.assets
      const asset = await assetRepository.create({
        workspaceId: job.workspaceId,
        uploadedBy: job.userId,
        name: `Generated Video - ${job.engine}`,
        storageBucket: 'user-assets',
        storagePath,
        type: 'video',
        mimeType: 'video/mp4',
        fileSizeBytes: videoBuffer.length,
        analysis: {
          engine: job.engine,
          productTier: job.productTier,
          provider: job.provider,
          upstreamUrl
        }
      });

      const outputAssetId = asset ? asset.id : job.jobId;
      const outputUrl = (await storageService.getSignedUrl(storagePath, 86400)) || upstreamUrl;

      // 4. Capture held credits atomically
      if (job.creditState === 'held' && job.reservationId) {
        const captureRes = await creditService.captureCredits(
          job.reservationId,
          `capture_video_${job.jobId}`
        );
        console.log(`[VideoJobWorker] Captured ${job.reservedCredits} credits for job ${job.jobId}:`, captureRes);
        job.creditState = 'captured';
      }

      // 5. Complete AI job and usage records
      await aiJobRepository.completeJob({
        jobId: job.jobId,
        modelUsed: job.engine,
        creditsCharged: job.reservedCredits,
        providerRequestId: job.providerJobId,
        outputs: [
          {
            assetId: outputAssetId,
            storageBucket: 'user-assets',
            storagePath,
            mimeType: 'video/mp4'
          }
        ]
      });

      await aiJobRepository.recordUsage({
        workspaceId: job.workspaceId,
        userId: job.userId,
        jobId: job.jobId,
        provider: job.provider,
        model: job.engine,
        operation: 'generate_video',
        inputUnits: 1,
        outputUnits: 1,
        providerCostMicrounits: 0,
        creditsCharged: job.reservedCredits
      });

      // 6. Update job in service
      videoJobService.updateJob(job.jobId, {
        status: 'completed',
        progress: 100,
        outputAssetId,
        outputUrl,
        creditState: 'captured'
      });

      console.log(`[VideoJobWorker] Job ${job.jobId} finalized successfully with asset ID: ${outputAssetId}`);
    } catch (err: any) {
      console.error(`[VideoJobWorker] Failed finalizing completed job ${job.jobId}:`, err);
      await this.handleFailedJob(job, `Asset post-processing failed: ${err?.message}`);
    }
  }

  private async handleFailedJob(job: VideoJob, error: string): Promise<void> {
    console.warn(`[VideoJobWorker] Job ${job.jobId} failed: ${error}`);

    // Release held credits atomically so user has zero credit loss
    if (job.creditState === 'held' && job.reservationId) {
      await creditService.releaseCredits(job.reservationId, `Job failed: ${error}`);
      job.creditState = 'released';
    }

    await aiJobRepository.failJob(job.jobId, 'VIDEO_GENERATION_FAILED', error);

    videoJobService.updateJob(job.jobId, {
      status: 'failed',
      creditState: 'released',
      error
    });
  }

  /**
   * Reconciles stale jobs upon server restart.
   */
  async reconcileStaleJobs(): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      const { data: staleJobs, error } = await supabase
        .from('ai_generation_jobs')
        .select('*')
        .eq('operation', 'generate_video')
        .in('status', ['pending', 'queued', 'in_progress'])
        .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // older than 30 mins

      if (error || !staleJobs) return;

      for (const stale of staleJobs) {
        console.log(`[VideoJobWorker] Reconciling stale video job ${stale.id}...`);
        await aiJobRepository.failJob(stale.id, 'TIMEOUT', 'Job timed out after server restart');
      }
    } catch (err) {
      console.warn('[VideoJobWorker] Failed to reconcile stale jobs:', err);
    }
  }
}

export const videoJobWorker = new VideoJobWorker();
