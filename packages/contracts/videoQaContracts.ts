/**
 * Video QA Engine, Plan-vs-Result Evaluation, and Repair Contracts.
 * Defines canonical schemas for deterministic media validation, AI creative evaluation,
 * structured Plan vs Result check models, and surgical repair plans.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import { z } from 'zod';
import type { DirectorOperation } from '../types/directorOperations.js';

// =============================================================================
// 1. ENUMS & LITERALS
// =============================================================================

export type QACheckCategory =
  | 'technical'
  | 'character'
  | 'wardrobe'
  | 'product'
  | 'action'
  | 'camera'
  | 'composition'
  | 'environment'
  | 'lighting'
  | 'continuity'
  | 'brand'
  | 'timing'
  | 'audio';

export type QACheckResult =
  | 'PASS'
  | 'PARTIAL'
  | 'FAIL'
  | 'NOT_APPLICABLE'
  | 'INCONCLUSIVE';

export type QASeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type QAState =
  | 'pending'
  | 'analyzing'
  | 'passed'
  | 'failed'
  | 'review_required'
  | 'repair_planned'
  | 'superseded';

export type OverallQAResult = 'passed' | 'failed' | 'review_required';

export type RepairApprovalLevel =
  | 'AUTO_SAFE'
  | 'USER_CONFIRMATION_REQUIRED'
  | 'EXECUTION_CONFIRMATION_REQUIRED'
  | 'MANUAL_REVIEW_REQUIRED';

export type RepairPlanStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'superseded';

// =============================================================================
// 2. PLAN REQUIREMENTS MODEL
// =============================================================================

export interface PlanRequirementItem {
  id: string;
  category: QACheckCategory;
  dimension: string;
  requirement: string;
  sourcePath?: string;
  isMandatory: boolean;
  expectedValue?: any;
}

export interface ShotPlanRequirements {
  snapshotId: string;
  shotId: string;
  sequence: number;
  durationSeconds: number;
  aspectRatio: string;
  requirements: PlanRequirementItem[];
  continuityContext?: {
    priorShotId?: string;
    priorShotAcceptedUrl?: string;
    inheritedStates?: Array<{ entityId: string; aspect: string; description: string }>;
  };
}

// =============================================================================
// 3. CHECK & QA RESULT MODEL
// =============================================================================

export interface SingleQACheck {
  checkId: string;
  category: QACheckCategory;
  dimension: string;
  requirement: string;
  observed: string;
  result: QACheckResult;
  severity: QASeverity;
  confidence: number; // 0.0 to 1.0 (internal evaluator metadata only)
  evidence: string;
  repairable: boolean;
  suggestedRepair?: string;
}

export interface VideoQAResult {
  id: string;
  executionId: string;
  executionSnapshotId: string;
  shotId: string;
  generationJobId: string;
  attemptNumber: number;
  status: QAState;
  overallResult: OverallQAResult;
  technicalChecks: SingleQACheck[];
  creativeChecks: SingleQACheck[];
  continuityChecks: SingleQACheck[];
  brandChecks: SingleQACheck[];
  constraintChecks: SingleQACheck[];
  failures: SingleQACheck[];
  warnings: SingleQACheck[];
  repairRequired: boolean;
  repairPlanId?: string;
  evaluatorVersion: string;
  evaluatedAt: string;
  createdAt: string;
}

// =============================================================================
// 4. REPAIR PLAN MODEL
// =============================================================================

export interface RepairPlan {
  id: string;
  snapshotId: string;
  shotId: string;
  qaResultId: string;
  diagnosis: string;
  operations: DirectorOperation[];
  preservedState: string[]; // Explicit attributes guaranteed to remain locked
  approvalLevel: RepairApprovalLevel;
  status: RepairPlanStatus;
  impact?: any;
  reason: string;
  createdAt: string;
  appliedAt?: string;
}

// =============================================================================
// 5. API REQUEST & RESPONSE SCHEMAS
// =============================================================================

export const TriggerShotQARequestSchema = z.object({
  forceReevaluate: z.boolean().optional().default(false)
});
export type TriggerShotQARequest = z.infer<typeof TriggerShotQARequestSchema>;

export const ApproveRepairPlanRequestSchema = z.object({
  notes: z.string().optional()
});
export type ApproveRepairPlanRequest = z.infer<typeof ApproveRepairPlanRequestSchema>;

export interface ShotQaHistoryResponse {
  shotId: string;
  executionId: string;
  snapshotId: string;
  currentResult: VideoQAResult | null;
  history: VideoQAResult[];
  activeRepairPlan: RepairPlan | null;
  attemptCount: number;
  maxAttemptsReached: boolean;
}

export interface ExecutionQaSummaryResponse {
  executionId: string;
  snapshotId: string;
  totalShots: number;
  passedShots: number;
  failedShots: number;
  reviewRequiredShots: number;
  pendingShots: number;
  isComplete: boolean;
  shots: Record<string, VideoQAResult | null>;
}
