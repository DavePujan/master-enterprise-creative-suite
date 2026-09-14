/**
 * Video Job Worker & Reconciler.
 * Decouples provider polling, asset streaming, Supabase Storage uploads,
 * public.assets creation, and atomic credit settlement from HTTP request lifecycles.
 * Fully backed by PostgreSQL (ai_generation_jobs + credit_holds) with atomic concurrency-safe claiming.
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
      const supabase = getSupabaseAdmin();
      if (!supabase) return;

      // 1. Query candidate active video jobs from database
      const { data: candidates, error: fetchErr } = await supabase
        .from('ai_generation_jobs')
        .select('*')
        .eq('operation', 'generate_video')
        .in('status', ['pending', 'running'])
        .not('provider_request_id', 'is', null)
        .order('created_at', { ascending: true })
        .limit(10);

      if (fetchErr || !candidates || candidates.length === 0) {
        return;
      }

      const now = new Date().toISOString();
      const leaseExpiry = new Date(Date.now() - 30 * 1000).toISOString(); // 30-second worker lease

      for (const candidate of candidates) {
        // 2. Atomic Lease Claim:
        // Claim if status is 'pending' OR (status is 'running' AND started_at is stale or null)
        const { data: claimedJob, error: claimErr } = await supabase
          .from('ai_generation_jobs')
          .update({
            status: 'running',
            started_at: now
          })
          .eq('id', candidate.id)
          .or(`status.eq.pending,started_at.is.null,started_at.lt.${leaseExpiry}`)
          .select('*')
          .maybeSingle();

        if (claimErr || !claimedJob) {
          // Another worker instance holds the active claim
          continue;
        }

        await this.pollJob(claimedJob);
      }
    } catch (err: any) {
      console.error('[VideoJobWorker] General tick failure:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async pollJob(job: any): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      let checkRes;
      const engine = job.model_requested || '';
      const providerRequestId = job.provider_request_id;

      if (!providerRequestId) return;

      if (engine === 'google-omni') {
        checkRes = await googleOmniProvider.check(providerRequestId);
      } else if (engine.startsWith('veo')) {
        checkRes = await googleVeoProvider.check(providerRequestId);
      } else if (engine === 'kling-v3') {
        checkRes = await falKlingProvider.check(providerRequestId);
      } else if (engine === 'seedance-2') {
        checkRes = await falSeedanceProvider.check(providerRequestId);
      } else {
        return;
      }

      if (!checkRes) return;

      if (checkRes.status === 'completed' && checkRes.videoUrl) {
        await this.handleCompletedJob(job, checkRes.videoUrl);
      } else if (checkRes.status === 'failed') {
        await this.handleFailedJob(job, checkRes.error || 'Video generation failed upstream.');
      } else if (checkRes.status === 'generating_motion') {
        // Extend lease heartbeat
        await supabase
          .from('ai_generation_jobs')
          .update({ started_at: new Date().toISOString() })
          .eq('id', job.id);
      }
    } catch (err: any) {
      console.error(`[VideoJobWorker] Error while polling job ${job.id}:`, err);
    }
  }

  private async handleCompletedJob(job: any, upstreamUrl: string): Promise<void> {
    console.log(`[VideoJobWorker] Job ${job.id} completed upstream. Downloading and persisting asset...`);

    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      // 1. Download upstream video binary
      const res = await fetch(upstreamUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch video stream from upstream: ${res.statusText}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const videoBuffer = Buffer.from(arrayBuffer);

      // 2. Upload to Supabase user-assets bucket
      const storagePath = `workspaces/${job.workspace_id}/videos/${job.id}.mp4`;
      const { error: uploadError } = await supabase.storage
        .from('user-assets')
        .upload(storagePath, videoBuffer, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadError) {
        console.warn('[VideoJobWorker] Supabase upload failed, using upstream URL fallback:', uploadError);
      }

      // 3. Create record in public.assets
      const asset = await assetRepository.create({
        workspaceId: job.workspace_id,
        uploadedBy: job.requested_by,
        name: `Generated Video - ${job.model_requested}`,
        storageBucket: 'user-assets',
        storagePath,
        type: 'video',
        mimeType: 'video/mp4',
        fileSizeBytes: videoBuffer.length,
        analysis: {
          engine: job.model_requested,
          provider: job.provider,
          upstreamUrl
        }
      });

      const outputAssetId = asset ? asset.id : job.id;

      // 4. Capture held credits atomically from database credit_holds
      const { data: hold } = await supabase
        .from('credit_holds')
        .select('id, amount')
        .eq('reference_id', job.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (hold) {
        await creditService.captureCredits(
          hold.id,
          `capture_video_${job.id}`
        );
        console.log(`[VideoJobWorker] Captured ${hold.amount} credits for job ${job.id}`);
      }

      // 5. Complete AI job and usage records in Supabase
      await aiJobRepository.completeJob({
        jobId: job.id,
        modelUsed: job.model_requested,
        creditsCharged: job.credits_reserved || 0,
        providerRequestId: job.provider_request_id,
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
        workspaceId: job.workspace_id,
        userId: job.requested_by,
        jobId: job.id,
        provider: job.provider,
        model: job.model_requested,
        operation: 'generate_video',
        inputUnits: 1,
        outputUnits: 1,
        providerCostMicrounits: 0,
        creditsCharged: job.credits_reserved || 0
      });

      // 6. Update local in-memory job if service has reference
      videoJobService.updateJob(job.id, {
        status: 'completed',
        progress: 100,
        outputAssetId,
        creditState: 'captured'
      });

      console.log(`[VideoJobWorker] Job ${job.id} finalized successfully with asset ID: ${outputAssetId}`);
    } catch (err: any) {
      console.error(`[VideoJobWorker] Failed finalizing completed job ${job.id}:`, err);
      await this.handleFailedJob(job, `Asset post-processing failed: ${err?.message}`);
    }
  }

  private async handleFailedJob(job: any, error: string): Promise<void> {
    console.warn(`[VideoJobWorker] Job ${job.id} failed: ${error}`);

    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    // Release held credits atomically so user has zero credit loss
    const { data: hold } = await supabase
      .from('credit_holds')
      .select('id')
      .eq('reference_id', job.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (hold) {
      await creditService.releaseCredits(hold.id, `Job failed: ${error}`);
    }

    await aiJobRepository.failJob(job.id, 'VIDEO_GENERATION_FAILED', error);

    videoJobService.updateJob(job.id, {
      status: 'failed',
      creditState: 'released',
      error
    });
  }

  /**
   * Reconciles stale jobs upon worker boot.
   */
  async reconcileStaleJobs(): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      const { data: staleJobs, error } = await supabase
        .from('ai_generation_jobs')
        .select('*')
        .eq('operation', 'generate_video')
        .in('status', ['pending', 'running'])
        .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // older than 30 mins

      if (error || !staleJobs) return;

      for (const stale of staleJobs) {
        console.log(`[VideoJobWorker] Reconciling stale video job ${stale.id}...`);

        const { data: hold } = await supabase
          .from('credit_holds')
          .select('id')
          .eq('reference_id', stale.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (hold) {
          await creditService.releaseCredits(hold.id, 'Job timed out after restart');
        }

        await aiJobRepository.failJob(stale.id, 'TIMEOUT', 'Job timed out after worker restart');
      }
    } catch (err) {
      console.warn('[VideoJobWorker] Failed to reconcile stale jobs:', err);
    }
  }
}

export const videoJobWorker = new VideoJobWorker();
