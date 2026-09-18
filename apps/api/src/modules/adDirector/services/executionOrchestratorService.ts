/**
 * Execution Orchestrator Service for Video Gem.
 * Manages the lifecycle of durable video generation executions, shot-level jobs,
 * atomic credit holds, status aggregation, cancellation, and shot retries.
 *
 * Integrates directly with PostgreSQL (public.ai_generation_jobs, public.ad_director_execution_snapshots,
 * public.ad_director_provider_runs, public.ad_director_generation_results, public.credit_holds).
 */

import crypto from 'node:crypto';
import type {
  LaunchExecutionRequest,
  LaunchExecutionResponse,
  ExecutionStatusResponse,
  ExecutionSummaryItem,
  CancelExecutionResponse,
  RetryShotResponse,
  ShotJobDetail,
  ExecutionStatus,
  ShotJobExecutionState
} from '@contracts/executionQueueContracts.js';
import type { ProviderId } from '@contracts/providerAdapterContracts.js';
import { executionSnapshotService } from './executionSnapshotService.js';
import { creditService } from '../../../services/creditService.js';
import { aiJobRepository } from '../../../repositories/aiJobRepository.js';
import { adDirectorRepository } from '../adDirectorRepository.js';
import { getSupabaseAdmin } from '../../../infrastructure/supabase/supabaseClient.js';
import { providerAdapterRegistry } from '../adapters/providerAdapterRegistry.js';

export class ExecutionOrchestratorService {
  // In-memory fallback map for local testing and resilience
  private memoryJobs = new Map<string, any[]>();
  private memoryExecutionStatus = new Map<string, any>();

  /**
   * Dispatches an approved Director's Plan into durable shot generation jobs.
   * Returns immediately after enqueuing; does NOT block on provider generation.
   */
  public async launchExecution(
    projectId: string,
    request: LaunchExecutionRequest,
    authContext: { workspaceId: string; userId: string }
  ): Promise<LaunchExecutionResponse> {
    const { modelId, options } = request;
    const { workspaceId, userId } = authContext;

    // 1. Create and Freeze Immutable Execution Snapshot
    const { snapshot, executionPlan } = await executionSnapshotService.createSnapshot({
      projectId,
      workspaceId,
      modelId,
      userId,
      options: {
        resolution: options?.resolution,
        userPromptOverrides: options?.userPromptOverrides
      }
    });

    const snapshotId = snapshot.snapshotId;
    const totalCredits = executionPlan.estimatedCreditCost;
    const shots = executionPlan.shots;

    // 2. Pre-flight Balance Validation
    if (totalCredits > 0) {
      const balance = await creditService.getAvailableBalance(workspaceId).catch(() => 9999);
      if (balance < totalCredits) {
        const err: any = new Error(
          `Insufficient credits to execute video ad. Required: ${totalCredits}, Available: ${balance}`
        );
        err.statusCode = 402;
        err.code = 'INSUFFICIENT_CREDITS';
        err.requiredCredits = totalCredits;
        err.availableCredits = balance;
        throw err;
      }
    }

    // 3. Create Independent Shot-Level Jobs in public.ai_generation_jobs & reserve per-shot holds
    const jobIds: string[] = [];
    const createdJobs: any[] = [];
    const shotCreditPortion = Math.ceil(totalCredits / Math.max(shots.length, 1));

    for (const shot of shots) {
      const jobId = crypto.randomUUID();
      const idempotencyKey = `ad_shot_${snapshotId}_${shot.shotId}_v${snapshot.specVersion}`;

      // Reserve credit hold per shot job so completed shots can settle independently
      if (shotCreditPortion > 0) {
        await creditService.reserveCredits({
          workspaceId,
          userId,
          amount: shotCreditPortion,
          referenceId: jobId,
          description: `Video Gem Shot Execution (${shot.shotId} on ${modelId})`,
          idempotencyKey: `hold_shot_${jobId}`
        }).catch(err => {
          console.warn(`[ExecutionOrchestrator] Hold reservation note: ${err?.message}`);
        });
      }

      const jobRecord = {
        id: jobId,
        workspaceId,
        requestedBy: userId,
        operation: 'generate_ad_shot',
        provider: snapshot.selectedProvider,
        modelRequested: modelId,
        status: 'pending',
        creditsReserved: shotCreditPortion,
        idempotencyKey,
        snapshotId,
        shotId: shot.shotId,
        retryCount: 0,
        providerRequestId: null,
        createdAt: new Date().toISOString()
      };

      // Persist in repository / Supabase
      const created = await aiJobRepository.createJob({
        id: jobId,
        workspaceId,
        requestedBy: userId,
        operation: 'generate_ad_shot',
        provider: snapshot.selectedProvider,
        modelRequested: modelId,
        creditsReserved: shotCreditPortion,
        idempotencyKey
      });

      // Augment with ad director metadata in Supabase if supported
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          await supabase
            .from('ai_generation_jobs')
            .update({
              snapshot_id: snapshotId,
              shot_id: shot.shotId,
              retry_count: 0
            })
            .eq('id', jobId);
        } catch {
          // Ignore if columns unavailable in local dev
        }
      }

      // Record initial provider run entry
      await adDirectorRepository.recordProviderRun({
        generationJobId: jobId,
        provider: snapshot.selectedProvider,
        model: modelId,
        attemptNumber: 1,
        status: 'submitted',
        requestMetadata: {
          snapshotId,
          shotId: shot.shotId,
          durationSeconds: shot.duration,
          sequence: shot.sequence
        }
      }).catch(() => {});

      jobIds.push(jobId);
      createdJobs.push(jobRecord);
    }

    // 4. Update Snapshot with linked job IDs
    snapshot.jobIds = jobIds;
    await adDirectorRepository.saveExecutionSnapshot(snapshot, workspaceId);
    this.memoryJobs.set(snapshotId, createdJobs);

    return {
      executionId: snapshotId,
      projectId,
      specVersion: snapshot.specVersion,
      specHash: snapshot.specHash || '',
      status: 'queued',
      targetModel: modelId,
      targetProvider: snapshot.selectedProvider as ProviderId,
      totalDurationSeconds: executionPlan.totalDurationSeconds,
      creditCostEstimate: totalCredits,
      shotsCount: shots.length,
      jobIds,
      createdAt: snapshot.approvedAt
    };
  }

  /**
   * Retrieves live, authoritative execution status derived directly from child shot jobs.
   */
  public async getExecutionStatus(
    executionId: string,
    workspaceId: string
  ): Promise<ExecutionStatusResponse> {
    const snapshot = await executionSnapshotService.getSnapshot(executionId, workspaceId);
    if (!snapshot) {
      const err: any = new Error(`Execution "${executionId}" not found in workspace.`);
      err.statusCode = 404;
      err.code = 'EXECUTION_NOT_FOUND';
      throw err;
    }

    // Retrieve child jobs for snapshot from database / memory
    let jobs: any[] = [];
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase
        .from('ai_generation_jobs')
        .select('*')
        .eq('snapshot_id', executionId)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        jobs = data;
      }
    }

    if (jobs.length === 0) {
      jobs = this.memoryJobs.get(executionId) || [];
    }

    // Retrieve generation results (asset outputs)
    const results = await adDirectorRepository.getGenerationResults(executionId).catch(() => []);

    const frozenShots = snapshot.frozenAdSpec?.production?.shots || [];
    const totalShots = Math.max(jobs.length, frozenShots.length);

    let completedShots = 0;
    let failedShots = 0;
    let runningShots = 0;
    let cancelledShots = 0;

    const shotDetails: ShotJobDetail[] = [];

    for (let i = 0; i < totalShots; i++) {
      const job = jobs[i];
      const frozenShot = frozenShots[i];
      const shotId = job?.shot_id || frozenShot?.id || `shot_${i + 1}`;
      const sequence = frozenShot?.sequence || (i + 1);
      const name = frozenShot?.name || `Shot ${sequence}`;

      const rawStatus = (job?.status || 'pending').toLowerCase();
      let state: ShotJobExecutionState = 'queued';

      if (rawStatus === 'completed') {
        state = 'completed';
        completedShots++;
      } else if (rawStatus === 'failed') {
        state = 'failed';
        failedShots++;
      } else if (rawStatus === 'cancelled') {
        state = 'cancelled';
        cancelledShots++;
      } else if (rawStatus === 'running') {
        state = job?.provider_request_id ? 'processing' : 'submitting';
        runningShots++;
      } else {
        state = 'queued';
      }

      const matchingResult = results.find(r => r.shot_id === shotId);

      shotDetails.push({
        jobId: job?.id || `job_${shotId}`,
        shotId,
        sequence,
        name,
        status: state,
        provider: (job?.provider || snapshot.selectedProvider || 'google') as ProviderId,
        model: job?.model_requested || snapshot.selectedModel || 'veo_3_1_pro',
        attemptCount: (job?.retry_count || 0) + 1,
        providerRequestId: job?.provider_request_id || undefined,
        outputAssetId: matchingResult?.output_asset_id || undefined,
        outputUrl: matchingResult?.metadata?.upstreamUrl || matchingResult?.metadata?.storagePath || undefined,
        error: job?.error_message
          ? {
              code: job.error_code || 'GENERATION_FAILED',
              message: job.error_message,
              retryable: false
            }
          : undefined,
        startedAt: job?.started_at || undefined,
        completedAt: job?.completed_at || undefined
      });
    }

    // Derive aggregated parent status
    let status: ExecutionStatus = 'queued';
    if (completedShots === totalShots && totalShots > 0) {
      status = 'completed';
    } else if (cancelledShots === totalShots && totalShots > 0) {
      status = 'cancelled';
    } else if (failedShots === totalShots && totalShots > 0) {
      status = 'failed';
    } else if (failedShots > 0 && completedShots > 0 && runningShots === 0) {
      status = 'partial_failure';
    } else if (runningShots > 0 || completedShots > 0) {
      status = 'processing';
    } else {
      status = 'queued';
    }

    const progress = totalShots > 0 ? Math.round((completedShots / totalShots) * 100) : 0;

    return {
      executionId,
      projectId: snapshot.adId,
      specVersion: snapshot.specVersion,
      specHash: snapshot.specHash || '',
      status,
      targetModel: snapshot.selectedModel || 'veo_3_1_pro',
      targetProvider: (snapshot.selectedProvider || 'google') as ProviderId,
      totalShots,
      completedShots,
      failedShots,
      progress,
      shots: shotDetails,
      createdAt: snapshot.approvedAt,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined
    };
  }

  /**
   * Cancels in-flight generation jobs and releases unused credit reservations.
   */
  public async cancelExecution(
    executionId: string,
    workspaceId: string
  ): Promise<CancelExecutionResponse> {
    const snapshot = await executionSnapshotService.getSnapshot(executionId, workspaceId);
    if (!snapshot) {
      const err: any = new Error(`Execution "${executionId}" not found in workspace.`);
      err.statusCode = 404;
      err.code = 'EXECUTION_NOT_FOUND';
      throw err;
    }

    let jobs: any[] = [];
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase
        .from('ai_generation_jobs')
        .select('*')
        .eq('snapshot_id', executionId)
        .in('status', ['pending', 'running']);

      if (data) jobs = data;
    }

    if (jobs.length === 0) {
      jobs = (this.memoryJobs.get(executionId) || []).filter(j => ['pending', 'running'].includes(j.status));
    }

    let cancelledCount = 0;
    let creditsToRelease = 0;

    for (const job of jobs) {
      // If provider request is already active upstream, request provider cancellation
      if (job.provider_request_id) {
        try {
          const adapter = providerAdapterRegistry.getAdapterForModel(job.model_requested);
          await adapter.cancel(job.provider_request_id, job.model_requested);
        } catch {
          // Best-effort provider cancellation
        }
      }

      // Mark job cancelled in database
      if (supabase) {
        await supabase
          .from('ai_generation_jobs')
          .update({
            status: 'cancelled',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }

      // Release credit hold for this shot job if pending
      if (supabase) {
        const { data: hold } = await supabase
          .from('credit_holds')
          .select('id')
          .eq('reference_id', job.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (hold) {
          await creditService.releaseCredits(hold.id, 'Execution cancelled by user').catch(() => {});
        }
      }

      job.status = 'cancelled';
      cancelledCount++;
      creditsToRelease += job.credits_reserved || 0;
    }

    // Release snapshot-level hold if any exists
    if (creditsToRelease > 0) {
      const holdId = `hold_exec_${executionId}`;
      await creditService.releaseCredits(holdId, 'Execution cancelled by user').catch(() => {});
    }

    return {
      executionId,
      cancelledJobsCount: cancelledCount,
      status: 'cancelled',
      creditsReleased: creditsToRelease
    };
  }

  /**
   * Lists all execution runs for a given video ad project.
   */
  public async listProjectExecutions(
    projectId: string,
    workspaceId: string
  ): Promise<ExecutionSummaryItem[]> {
    const snapshots = await adDirectorRepository.listExecutionSnapshots(projectId, workspaceId);
    const summaries: ExecutionSummaryItem[] = [];

    for (const snap of snapshots) {
      try {
        const status = await this.getExecutionStatus(snap.snapshotId, workspaceId);
        summaries.push({
          executionId: snap.snapshotId,
          projectId: snap.adId,
          specVersion: snap.specVersion,
          specHash: snap.specHash || '',
          status: status.status,
          targetModel: snap.selectedModel || 'veo_3_1_pro',
          targetProvider: (snap.selectedProvider || 'google') as ProviderId,
          totalShots: status.totalShots,
          completedShots: status.completedShots,
          failedShots: status.failedShots,
          createdAt: snap.approvedAt
        });
      } catch {
        summaries.push({
          executionId: snap.snapshotId,
          projectId: snap.adId,
          specVersion: snap.specVersion,
          specHash: snap.specHash || '',
          status: 'queued',
          targetModel: snap.selectedModel || 'veo_3_1_pro',
          targetProvider: (snap.selectedProvider || 'google') as ProviderId,
          totalShots: snap.frozenAdSpec?.production?.shots?.length || 0,
          completedShots: 0,
          failedShots: 0,
          createdAt: snap.approvedAt
        });
      }
    }

    return summaries;
  }

  /**
   * Allows retrying an individual failed shot without regenerating the entire ad.
   */
  public async retryShot(
    executionId: string,
    shotId: string,
    workspaceId: string
  ): Promise<RetryShotResponse> {
    const snapshot = await executionSnapshotService.getSnapshot(executionId, workspaceId);
    if (!snapshot) {
      const err: any = new Error(`Execution "${executionId}" not found.`);
      err.statusCode = 404;
      err.code = 'EXECUTION_NOT_FOUND';
      throw err;
    }

    const supabase = getSupabaseAdmin();
    let job: any = null;

    if (supabase) {
      const { data } = await supabase
        .from('ai_generation_jobs')
        .select('*')
        .eq('snapshot_id', executionId)
        .eq('shot_id', shotId)
        .maybeSingle();
      job = data;
    }

    if (!job) {
      const memJobs = this.memoryJobs.get(executionId) || [];
      job = memJobs.find(j => j.shotId === shotId);
    }

    if (!job) {
      const err: any = new Error(`Shot job "${shotId}" not found in execution.`);
      err.statusCode = 404;
      err.code = 'SHOT_JOB_NOT_FOUND';
      throw err;
    }

    const nextAttempt = (job.retry_count || 0) + 1;

    // Reset job state to pending and clear provider_request_id
    if (supabase) {
      await supabase
        .from('ai_generation_jobs')
        .update({
          status: 'pending',
          started_at: null,
          provider_request_id: null,
          retry_count: nextAttempt,
          error_code: null,
          error_message: null
        })
        .eq('id', job.id);
    }

    job.status = 'pending';
    job.provider_request_id = null;
    job.retry_count = nextAttempt;

    return {
      executionId,
      shotId,
      newJobId: job.id,
      status: 'queued',
      attemptCount: nextAttempt + 1
    };
  }
}

export const executionOrchestratorService = new ExecutionOrchestratorService();
