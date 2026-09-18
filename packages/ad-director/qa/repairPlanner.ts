/**
 * Surgical Repair Planner.
 * Converts QA failure checks into targeted, non-destructive DirectorOperations.
 * Enforces:
 * - Surgical repair: Modify ONLY what failed
 * - Explicit preservation: Locks characters, wardrobe, products, location, timing, CTA
 * - Approval classification: AUTO_SAFE vs USER_CONFIRMATION_REQUIRED vs MANUAL_REVIEW_REQUIRED
 * - Bounded retries: Reaches MANUAL_REVIEW_REQUIRED if attempts >= 3
 *
 * Framework-free: MUST NOT import React or Express.
 */

import crypto from 'node:crypto';
import type { AdSpec, AdShot } from '../../types/adSpec.js';
import type { DirectorOperation } from '../../types/directorOperations.js';
import type {
  SingleQACheck,
  RepairPlan,
  RepairApprovalLevel
} from '../../contracts/videoQaContracts.js';

export class RepairPlanner {
  /**
   * Plans a surgical repair for a failed shot QA result.
   */
  planRepair(params: {
    snapshotId: string;
    shotId: string;
    qaResultId: string;
    failures: SingleQACheck[];
    frozenAdSpec: AdSpec;
    currentAttempt?: number;
  }): RepairPlan {
    const { snapshotId, shotId, qaResultId, failures, frozenAdSpec, currentAttempt = 1 } = params;
    const repairId = crypto.randomUUID();

    // 1. Max Attempts Guard (Bounded Retry Loop)
    if (currentAttempt >= 3) {
      return {
        id: repairId,
        snapshotId,
        shotId,
        qaResultId,
        diagnosis: `Shot ${shotId} has reached maximum generation attempts (${currentAttempt}/3). Manual review required.`,
        operations: [],
        preservedState: ['entire_shot_spec'],
        approvalLevel: 'MANUAL_REVIEW_REQUIRED',
        status: 'pending',
        reason: 'Generation attempt ceiling reached; automatic regeneration halted.',
        createdAt: new Date().toISOString()
      };
    }

    // 2. Find target shot in frozen AdSpec
    const shot = (frozenAdSpec.shots || []).find(s => s.shotId === shotId);
    if (!shot) {
      return {
        id: repairId,
        snapshotId,
        shotId,
        qaResultId,
        diagnosis: `Shot ${shotId} not found in frozen snapshot.`,
        operations: [],
        preservedState: [],
        approvalLevel: 'MANUAL_REVIEW_REQUIRED',
        status: 'pending',
        reason: 'Missing shot definition.',
        createdAt: new Date().toISOString()
      };
    }

    const operations: DirectorOperation[] = [];
    const diagnosisParts: string[] = [];
    let requiresUserConfirmation = false;
    let requiresExecutionConfirmation = false;

    // Track attributes modified
    const modifiedAttributes = new Set<string>();

    for (const failure of failures) {
      diagnosisParts.push(`[${failure.category.toUpperCase()}] ${failure.requirement} -> Observed: ${failure.observed}`);

      if (failure.category === 'camera') {
        modifiedAttributes.add('camera');
        const dimLower = failure.dimension.toLowerCase();
        if (dimLower.includes('movement')) {
          operations.push({
            type: 'patch',
            targetScope: 'shot',
            targetShotId: shotId,
            path: 'camera.cameraMovement',
            value: this.normalizeRepairedCameraMovement(failure.requirement),
            actor: { id: 'ai_qa_repair', role: 'ai_shot_director' },
            reason: {
              type: 'system_repair',
              description: `QA camera repair: ${failure.suggestedRepair || failure.requirement}`
            }
          });
        } else if (dimLower.includes('framing')) {
          operations.push({
            type: 'patch',
            targetScope: 'shot',
            targetShotId: shotId,
            path: 'camera.framing',
            value: this.normalizeRepairedFraming(failure.requirement),
            actor: { id: 'ai_qa_repair', role: 'ai_shot_director' },
            reason: {
              type: 'system_repair',
              description: `QA framing repair: ${failure.suggestedRepair || failure.requirement}`
            }
          });
        } else {
          // General camera repair fallback
          operations.push({
            type: 'patch',
            targetScope: 'shot',
            targetShotId: shotId,
            path: 'camera.cameraMovement',
            value: this.normalizeRepairedCameraMovement(failure.requirement),
            actor: { id: 'ai_qa_repair', role: 'ai_shot_director' },
            reason: {
              type: 'system_repair',
              description: `QA camera repair: ${failure.suggestedRepair || failure.requirement}`
            }
          });
        }
      } else if (failure.category === 'lighting') {
        modifiedAttributes.add('lighting');
        operations.push({
          type: 'patch',
          targetScope: 'shot',
          targetShotId: shotId,
          path: 'lighting.mood',
          value: failure.requirement.replace(/Lighting mood: /i, '').replace(/["']/g, ''),
          actor: { id: 'ai_qa_repair', role: 'ai_shot_director' },
          reason: {
            type: 'system_repair',
            description: `QA lighting repair: ${failure.suggestedRepair || failure.requirement}`
          }
        });
      } else if (failure.category === 'wardrobe' || failure.category === 'character') {
        modifiedAttributes.add('character');
        modifiedAttributes.add('wardrobe');
        requiresUserConfirmation = true; // Creative entity change requires user sign-off
        operations.push({
          type: 'patch',
          targetScope: 'shot',
          targetShotId: shotId,
          path: 'action.visualDescription',
          value: `${shot.action?.visualDescription || ''} [Ensuring wardrobe: ${failure.requirement}]`,
          actor: { id: 'ai_qa_repair', role: 'ai_shot_director' },
          reason: {
            type: 'continuity_repair',
            description: `QA wardrobe continuity repair: ${failure.requirement}`
          }
        });
      } else if (failure.category === 'action') {
        modifiedAttributes.add('action');
        requiresUserConfirmation = true;
        operations.push({
          type: 'patch',
          targetScope: 'shot',
          targetShotId: shotId,
          path: 'action.visualDescription',
          value: `${shot.action?.visualDescription || ''} [Enforce action sequence: ${failure.requirement}]`,
          actor: { id: 'ai_qa_repair', role: 'ai_shot_director' },
          reason: {
            type: 'system_repair',
            description: `QA action choreography repair: ${failure.requirement}`
          }
        });
      } else if (failure.category === 'product') {
        modifiedAttributes.add('product');
        requiresUserConfirmation = true;
        operations.push({
          type: 'patch',
          targetScope: 'shot',
          targetShotId: shotId,
          path: 'qaExpectations.mustShow',
          value: Array.from(new Set([...(shot.qaExpectations?.mustShow || []), failure.requirement])),
          actor: { id: 'ai_qa_repair', role: 'ai_shot_director' },
          reason: {
            type: 'system_repair',
            description: `QA product fidelity reinforcement: ${failure.requirement}`
          }
        });
      } else if (failure.category === 'timing') {
        modifiedAttributes.add('timing');
        requiresExecutionConfirmation = true; // Scope change
        const expectedDuration = parseFloat(failure.requirement.match(/\d+(\.\d+)?/)?.[0] || '5');
        operations.push({
          type: 'patch',
          targetScope: 'shot',
          targetShotId: shotId,
          path: 'timing.duration',
          value: expectedDuration,
          actor: { id: 'ai_qa_repair', role: 'ai_shot_director' },
          reason: {
            type: 'system_repair',
            description: `QA duration synchronization: ${expectedDuration}s`
          }
        });
      }
    }

    // 3. Compute explicit preservedState (what MUST NOT change)
    const standardDimensions = [
      'character',
      'wardrobe',
      'product',
      'location',
      'environment',
      'action',
      'camera',
      'lighting',
      'timing',
      'message',
      'cta'
    ];
    const preservedState = standardDimensions.filter(d => !modifiedAttributes.has(d));

    // 4. Determine Approval Level
    let approvalLevel: RepairApprovalLevel = 'AUTO_SAFE';
    if (requiresExecutionConfirmation) {
      approvalLevel = 'EXECUTION_CONFIRMATION_REQUIRED';
    } else if (requiresUserConfirmation) {
      approvalLevel = 'USER_CONFIRMATION_REQUIRED';
    }

    return {
      id: repairId,
      snapshotId,
      shotId,
      qaResultId,
      diagnosis: diagnosisParts.join('\n'),
      operations,
      preservedState,
      approvalLevel,
      status: 'pending',
      reason: `Surgical repair for Shot ${shotId} addressing ${failures.length} QA defect(s).`,
      createdAt: new Date().toISOString()
    };
  }

  private normalizeRepairedCameraMovement(req: string): string {
    const lower = req.toLowerCase();
    if (lower.includes('tracking')) return 'tracking';
    if (lower.includes('push in') || lower.includes('push_in')) return 'push_in';
    if (lower.includes('pull out') || lower.includes('pull_out')) return 'pull_out';
    if (lower.includes('pan')) return 'pan_left';
    if (lower.includes('tilt')) return 'tilt_up';
    if (lower.includes('crane') || lower.includes('boom')) return 'crane_up';
    if (lower.includes('orbit')) return 'orbit';
    return 'tracking';
  }

  private normalizeRepairedFraming(req: string): string {
    const lower = req.toLowerCase();
    if (lower.includes('extreme close') || lower.includes('extreme_close_up')) return 'extreme_close_up';
    if (lower.includes('close up') || lower.includes('close_up')) return 'close_up';
    if (lower.includes('medium close') || lower.includes('medium_close_up')) return 'medium_close_up';
    if (lower.includes('medium shot') || lower.includes('medium')) return 'medium_shot';
    if (lower.includes('wide')) return 'wide_shot';
    return 'medium_shot';
  }
}

export const repairPlanner = new RepairPlanner();
