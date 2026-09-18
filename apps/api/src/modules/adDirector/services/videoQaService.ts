/**
 * Video QA & Repair Orchestrator Service.
 * Coordinates Plan-vs-Result evaluation, deterministic validation, visual inspection,
 * immutable QA history persistence, surgical repair planning, and bounded retries.
 */

import crypto from 'node:crypto';
import { adDirectorRepository } from '../adDirectorRepository.js';
import { assetRepository } from '../../../repositories/assetRepository.js';
import { technicalValidator } from '../../../../../../packages/ad-director/qa/technicalValidator.js';
import { qaPlanExtractor } from '../../../../../../packages/ad-director/qa/qaPlanExtractor.js';
import { visualQaEvaluator } from '../../../../../../packages/ad-director/qa/visualQaEvaluator.js';
import { repairPlanner } from '../../../../../../packages/ad-director/qa/repairPlanner.js';
import { stateManager } from '../../../../../../packages/ad-director/operations/stateManager.js';
import { executionOrchestratorService } from './executionOrchestratorService.js';
import type {
  VideoQAResult,
  SingleQACheck,
  RepairPlan,
  ShotQaHistoryResponse,
  ExecutionQaSummaryResponse
} from '@contracts/videoQaContracts.js';

export interface EvaluateShotParams {
  snapshotId: string;
  shotId: string;
  workspaceId: string;
  userId?: string;
  generationJobId?: string;
  mediaBuffer?: Buffer | Uint8Array;
  simulatedObservations?: Record<string, string>;
  forceReevaluate?: boolean;
}

export class VideoQAService {
  /**
   * Evaluates a generated shot against its frozen Execution Snapshot.
   */
  async evaluateShot(params: EvaluateShotParams): Promise<VideoQAResult> {
    const { snapshotId, shotId, workspaceId, simulatedObservations } = params;

    // 1. Authorize and Load Immutable Execution Snapshot
    const snapshot = await adDirectorRepository.getExecutionSnapshot(snapshotId, workspaceId);
    if (!snapshot) {
      const err: any = new Error(`Execution snapshot "${snapshotId}" not found or unauthorized for workspace "${workspaceId}".`);
      err.statusCode = 404;
      err.code = 'SNAPSHOT_NOT_FOUND';
      throw err;
    }

    // Verify shot exists in frozen plan
    const shot = (snapshot.frozenAdSpec.shots || []).find(s => s.shotId === shotId);
    if (!shot) {
      const err: any = new Error(`Shot "${shotId}" does not exist in execution snapshot "${snapshotId}".`);
      err.statusCode = 404;
      err.code = 'SHOT_NOT_FOUND';
      throw err;
    }

    // 2. Fetch Generation Results for this shot
    const results = await adDirectorRepository.getGenerationResults(snapshotId, shotId);
    const latestGenResult = results.length > 0 ? results[0] : null;
    const attemptNumber = latestGenResult?.attemptNumber || 1;
    const generationJobId = params.generationJobId || latestGenResult?.generationJobId || `job_${snapshotId}_${shotId}`;

    // 3. Resolve Output Asset
    let outputAsset: any = null;
    if (latestGenResult?.outputAssetId) {
      outputAsset = await assetRepository.findById(latestGenResult.outputAssetId).catch(() => null);
      if (!outputAsset) {
        outputAsset = {
          id: latestGenResult.outputAssetId,
          workspaceId: snapshot.frozenAdSpec.identity?.workspaceId || workspaceId,
          storagePath: latestGenResult.metadata?.storagePath,
          durationSeconds: latestGenResult.durationSeconds || 5,
          fileSizeBytes: 1024 * 1024,
          mimeType: 'video/mp4',
          metadata: latestGenResult.metadata
        };
      }
    } else {
      // Mock asset placeholder if generation result exists without asset ID
      outputAsset = {
        id: `mock_asset_${snapshotId}_${shotId}`,
        workspaceId,
        durationSeconds: shot.timing?.duration || 5,
        fileSizeBytes: 1024 * 512,
        mimeType: 'video/mp4'
      };
    }

    const expectedDuration = shot.timing?.duration ?? shot.durationSeconds ?? 5;
    const expectedAspectRatio =
      (shot as any).aspectRatio ||
      snapshot.frozenAdSpec.generationRequirements?.aspectRatio ||
      snapshot.frozenAdSpec.brief?.aspectRatio ||
      '16:9';

    // 4. Deterministic Technical Validation (Zero AI Cost)
    const techResult = technicalValidator.validate({
      shotId,
      expectedDuration,
      expectedAspectRatio,
      outputAsset,
      workspaceId,
      mediaBuffer: params.mediaBuffer
    });

    const technicalChecks = techResult.checks;
    const technicalFailures = techResult.failures;

    // 5. Plan Extraction (Only evaluate specified dimensions)
    const planRequirements = qaPlanExtractor.extractRequirements(
      snapshotId,
      shot,
      snapshot.frozenAdSpec
    );

    // 6. Visual / Creative Evaluation
    let creativeChecks: SingleQACheck[] = [];
    let creativeFailures: SingleQACheck[] = [];
    let creativeWarnings: SingleQACheck[] = [];
    let visualOverall: 'passed' | 'failed' | 'review_required' = 'passed';

    // If technical validation critically failed (e.g. 0-byte or corrupted video), skip visual evaluation
    if (technicalFailures.some(f => f.severity === 'CRITICAL')) {
      visualOverall = 'failed';
    } else {
      const visualResult = await visualQaEvaluator.evaluate({
        requirements: planRequirements,
        generationResult: {
          outputAssetId: outputAsset?.id || '',
          upstreamUrl: latestGenResult?.metadata?.upstreamUrl,
          storagePath: latestGenResult?.metadata?.storagePath,
          metadata: latestGenResult?.metadata
        },
        simulatedObservations
      });

      creativeChecks = visualResult.checks;
      creativeFailures = visualResult.failures;
      creativeWarnings = visualResult.warnings;
      visualOverall = visualResult.overallResult;
    }

    // Partition checks into dimension buckets
    const continuityChecks = creativeChecks.filter(c => c.category === 'continuity');
    const brandChecks = creativeChecks.filter(c => c.category === 'brand');
    const constraintChecks = creativeChecks.filter(
      c => c.category !== 'continuity' && c.category !== 'brand' && c.category !== 'technical' && c.category !== 'timing'
    );

    const allFailures = [...technicalFailures, ...creativeFailures];
    const allWarnings = [...techResult.warnings, ...creativeWarnings];

    // Determine Final Aggregated Overall Result
    let overallResult: 'passed' | 'failed' | 'review_required' = 'passed';
    if (allFailures.length > 0) {
      overallResult = 'failed';
    } else if (allWarnings.some(w => w.result === 'INCONCLUSIVE' || w.result === 'PARTIAL')) {
      overallResult = 'review_required';
    }

    const qaStatus = overallResult === 'passed' ? 'passed' : overallResult === 'failed' ? 'failed' : 'review_required';
    const repairRequired = overallResult === 'failed';
    const qaId = `qa_${snapshotId}_${shotId}_a${attemptNumber}_${Date.now().toString(36)}`;

    // 7. Formulate Repair Plan if Failed
    let repairPlanId: string | undefined = undefined;
    if (repairRequired) {
      const repairPlan = repairPlanner.planRepair({
        snapshotId,
        shotId,
        qaResultId: qaId,
        failures: allFailures,
        frozenAdSpec: snapshot.frozenAdSpec,
        currentAttempt: attemptNumber
      });

      await adDirectorRepository.saveRepairPlan(repairPlan);
      repairPlanId = repairPlan.id;

      // If AUTO_SAFE and attempts < 3, auto-trigger shot retry without waiting for user
      if (repairPlan.approvalLevel === 'AUTO_SAFE' && attemptNumber < 3) {
        console.log(`[VideoQAService] Auto-safe repair planned for Shot ${shotId}. Triggering auto-regeneration...`);
        await executionOrchestratorService.retryShot(snapshotId, shotId, workspaceId).catch(err => {
          console.warn('[VideoQAService] Auto-safe retry trigger warning:', err);
        });
      }
    }

    const qaRecord: VideoQAResult = {
      id: qaId,
      executionId: snapshotId,
      executionSnapshotId: snapshotId,
      shotId,
      generationJobId,
      attemptNumber,
      status: qaStatus,
      overallResult,
      technicalChecks,
      creativeChecks,
      continuityChecks,
      brandChecks,
      constraintChecks,
      failures: allFailures,
      warnings: allWarnings,
      repairRequired,
      repairPlanId,
      evaluatorVersion: 'v1',
      evaluatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // 8. Persist Immutable QA Record
    await adDirectorRepository.saveQAResult(qaRecord);

    return qaRecord;
  }

  /**
   * Retrieves complete QA history for a shot in an execution.
   */
  async getShotQaHistory(
    snapshotId: string,
    shotId: string,
    workspaceId: string
  ): Promise<ShotQaHistoryResponse> {
    const snapshot = await adDirectorRepository.getExecutionSnapshot(snapshotId, workspaceId);
    if (!snapshot) {
      const err: any = new Error(`Execution snapshot "${snapshotId}" not found or unauthorized.`);
      err.statusCode = 404;
      throw err;
    }

    const allResults = await adDirectorRepository.getQAResults(snapshotId, shotId);
    const currentResult = allResults.length > 0 ? allResults[0] : null;

    let activeRepairPlan: RepairPlan | null = null;
    if (currentResult?.repairPlanId) {
      activeRepairPlan = await adDirectorRepository.getRepairPlan(currentResult.repairPlanId);
    }

    const attemptCount = allResults.length;
    const maxAttemptsReached = attemptCount >= 3;

    return {
      shotId,
      executionId: snapshotId,
      snapshotId,
      currentResult,
      history: allResults,
      activeRepairPlan,
      attemptCount,
      maxAttemptsReached
    };
  }

  /**
   * Returns QA summary across all shots in an execution.
   */
  async getExecutionQaSummary(
    snapshotId: string,
    workspaceId: string
  ): Promise<ExecutionQaSummaryResponse> {
    const snapshot = await adDirectorRepository.getExecutionSnapshot(snapshotId, workspaceId);
    if (!snapshot) {
      const err: any = new Error(`Execution snapshot "${snapshotId}" not found or unauthorized.`);
      err.statusCode = 404;
      throw err;
    }

    const shots = snapshot.frozenAdSpec.shots || [];
    const shotMap: Record<string, VideoQAResult | null> = {};

    let passedShots = 0;
    let failedShots = 0;
    let reviewRequiredShots = 0;
    let pendingShots = 0;

    for (const shot of shots) {
      const latest = await adDirectorRepository.getLatestQAResult(snapshotId, shot.shotId);
      shotMap[shot.shotId] = latest;

      if (!latest) {
        pendingShots++;
      } else if (latest.overallResult === 'passed') {
        passedShots++;
      } else if (latest.overallResult === 'failed') {
        failedShots++;
      } else {
        reviewRequiredShots++;
      }
    }

    const totalShots = shots.length;
    const isComplete = totalShots > 0 && (passedShots + failedShots + reviewRequiredShots === totalShots);

    return {
      executionId: snapshotId,
      snapshotId,
      totalShots,
      passedShots,
      failedShots,
      reviewRequiredShots,
      pendingShots,
      isComplete,
      shots: shotMap
    };
  }

  /**
   * Retrieves a specific repair plan by ID with workspace security verification.
   */
  async getRepairPlan(repairPlanId: string, workspaceId: string): Promise<RepairPlan | null> {
    const plan = await adDirectorRepository.getRepairPlan(repairPlanId);
    if (!plan) return null;

    const snapshot = await adDirectorRepository.getExecutionSnapshot(plan.snapshotId, workspaceId);
    if (!snapshot) {
      const err: any = new Error('Unauthorized workspace access to repair plan.');
      err.statusCode = 403;
      throw err;
    }

    return plan;
  }

  /**
   * User approves a repair plan, committing the patch operations and re-enqueuing the shot.
   */
  async approveRepairPlan(
    repairPlanId: string,
    workspaceId: string,
    userId: string
  ): Promise<{ success: boolean; status: string }> {
    const plan = await this.getRepairPlan(repairPlanId, workspaceId);
    if (!plan) {
      const err: any = new Error(`Repair plan "${repairPlanId}" not found.`);
      err.statusCode = 404;
      throw err;
    }

    if (plan.status === 'applied') {
      return { success: true, status: 'already_applied' };
    }

    // Apply surgical operations to current working project if available
    const snapshot = await adDirectorRepository.getExecutionSnapshot(plan.snapshotId, workspaceId);
    if (snapshot && plan.operations.length > 0) {
      const liveSpec = await adDirectorRepository.getCurrentAdSpec(snapshot.adId, workspaceId).catch(() => null);
      if (liveSpec) {
        stateManager.applyOperations(liveSpec, plan.operations);
      }
    }

    // Mark repair plan applied
    await adDirectorRepository.updateRepairPlanStatus(repairPlanId, 'applied');

    // Trigger shot retry in execution orchestrator
    await executionOrchestratorService.retryShot(plan.snapshotId, plan.shotId, workspaceId).catch(err => {
      console.warn('[VideoQAService] Retry trigger note on approve repair plan:', err?.message || err);
    });

    return { success: true, status: 'applied' };
  }
}

export const videoQaService = new VideoQAService();
