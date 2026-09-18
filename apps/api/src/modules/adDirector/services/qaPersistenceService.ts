/**
 * QA Persistence & Surgical Repair Service.
 * Evaluates generation results against exact snapshot requirements, persists
 * QA scores/issues, and generates surgical repair patches without collateral damage.
 * INVARIANT: Repair patches target only failing shots; unaffected shots remain untouched.
 */

import { adDirectorRepository } from '../adDirectorRepository.js';
import { aiJobRepository } from '../../../repositories/aiJobRepository.js';
import type { AdSpecPatch } from '@shared-types/adSpec.js';
import type {
  QAIssue,
  QAResultSummary,
  ShotRegenerationRequest,
  ShotRegenerationResponse
} from '../../../../../../packages/contracts/adSpecContracts.js';

export class QAPersistenceService {
  /**
   * Records a deterministic QA evaluation against a generation result.
   */
  async recordQAEvaluation(params: {
    resultId: string;
    generationJobId: string;
    snapshotId: string;
    shotId: string;
    status: 'passed' | 'failed' | 'warning';
    scores?: Record<string, number>;
    issues?: QAIssue[];
  }): Promise<QAResultSummary> {
    const { resultId, generationJobId, snapshotId, shotId, status, scores = {}, issues = [] } = params;

    let repairRecommendation: AdSpecPatch | undefined;

    // Generate surgical repair recommendation if QA identified failures
    if (status === 'failed' && issues.length > 0) {
      repairRecommendation = this.generateSurgicalRepairPatch(shotId, issues);
    }

    const { qaId } = await adDirectorRepository.saveQAResult({
      resultId,
      generationJobId,
      snapshotId,
      shotId,
      status,
      scores,
      issues,
      repairRecommendation
    });

    return {
      id: qaId,
      resultId,
      generationJobId,
      snapshotId,
      shotId,
      status,
      scores,
      issues,
      repairRecommendation,
      evaluatedAt: new Date().toISOString()
    };
  }

  /**
   * Generates a surgical AdSpecPatch targeting only the specific failing requirement of the shot.
   * Unaffected shots and entities remain untouched.
   */
  generateSurgicalRepairPatch(shotId: string, issues: QAIssue[]): AdSpecPatch {
    const changes: Record<string, any> = {};

    for (const issue of issues) {
      if (issue.requirement.includes('camera')) {
        changes['camera.angle'] = 'lower';
        changes['camera.movement.speed'] = 'deliberate';
      } else if (issue.requirement.includes('lighting')) {
        changes['lighting.contrastRatio'] = 'high';
      } else if (issue.requirement.includes('motion')) {
        changes['action.pacing'] = 'dynamic';
      } else {
        changes['generationIntent.renderQuality'] = 'photorealistic_master';
      }
    }

    return {
      revisionId: `repair_${shotId}_${Date.now()}`,
      targetScope: 'shot',
      targetEntityId: shotId,
      reason: `Automated QA repair for shot ${shotId}: ${issues.map(i => i.requirement).join(', ')}`,
      changes,
      actor: {
        id: 'system_qa_repair',
        role: 'qa_repair'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Regenerates a single shot without regenerating unaffected shots.
   * Preserves previous generation result and QA records.
   */
  async regenerateShot(
    request: ShotRegenerationRequest,
    authContext: { workspaceId: string; userId: string }
  ): Promise<ShotRegenerationResponse> {
    const { snapshotId, shotId, engineKey = 'veo-pro' } = request;

    const snapshot = await adDirectorRepository.getExecutionSnapshot(snapshotId, authContext.workspaceId);
    if (!snapshot) {
      const err: any = new Error(`Snapshot "${snapshotId}" not found.`);
      err.statusCode = 404;
      throw err;
    }

    const previousRuns = await adDirectorRepository.getGenerationResults(snapshotId, shotId);
    const attemptNumber = previousRuns.length + 1;

    // Dispatch isolated new job into public.ai_generation_jobs
    const created = await aiJobRepository.createJob({
      workspaceId: authContext.workspaceId,
      requestedBy: authContext.userId,
      operation: 'generate_video',
      provider: 'google',
      modelRequested: engineKey,
      creditsReserved: 25,
      idempotencyKey: `regen_${snapshotId}_${shotId}_attempt_${attemptNumber}_${Date.now()}`
    });

    const newJobId = created?.id || `job_regen_${shotId}_${Date.now()}`;

    // Record new provider run attempt
    await adDirectorRepository.recordProviderRun({
      generationJobId: newJobId,
      provider: 'google',
      model: engineKey,
      attemptNumber,
      status: 'submitted',
      requestMetadata: {
        snapshotId,
        shotId,
        isRegeneration: true,
        attemptNumber
      }
    });

    return {
      newJobId,
      shotId,
      attemptNumber
    };
  }
}

export const qaPersistenceService = new QAPersistenceService();
