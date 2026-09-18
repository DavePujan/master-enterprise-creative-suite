/**
 * Canonical Director Operations, Context, Diff, and Boundary Types.
 * Defines the operation-based AI boundary for Writopedia's Video Generation Gem:
 * DirectorContext → Stage → StructuredOperation → Validator → StateManager → AdSpec.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type {
  AdSpec,
  AdShot,
  AdSpecPatchScope,
  CreativeConceptItem,
  SemanticAssetRole,
  DirectorCreativeState
} from './adSpec.js';

// =============================================================================
// 1. OPERATION TYPES & ACTORS
// =============================================================================

export type CanonicalDirectorOperationType =
  | 'set'
  | 'patch'
  | 'add'
  | 'remove'
  | 'replaceReference'
  | 'insertShot'
  | 'deleteShot'
  | 'reorderShot';

export type DirectorOperationType =
  | CanonicalDirectorOperationType
  | 'update_field'
  | 'update_shot'
  | 'insert_shot'
  | 'delete_shot'
  | 'reorder_shots'
  | 'add_character'
  | 'update_character'
  | 'remove_character'
  | 'add_product'
  | 'update_product'
  | 'remove_product'
  | 'add_location'
  | 'update_location'
  | 'remove_location'
  | 'propose_concepts'
  | 'select_concept'
  | 'request_asset'
  | 'attach_asset'
  | 'update_story_beats'
  | 'update_continuity'
  | 'update_constraint'
  | 'transition_creative_state';

export type DirectorActorRole =
  | 'user'
  | 'ai_interviewer'
  | 'ai_brief_analyzer'
  | 'ai_brief_builder'
  | 'ai_creative_director'
  | 'ai_story_architect'
  | 'ai_shot_director'
  | 'ai_continuity'
  | 'ai_revision'
  | 'system';

export interface DirectorOperationActor {
  id: string;
  role: DirectorActorRole;
}

export type DirectorReasonType =
  | 'user_requested'
  | 'user_confirmed'
  | 'ai_inferred'
  | 'ai_inference'
  | 'ai_proposed'
  | 'ai_proposal'
  | 'continuity_repair'
  | 'system_repair'
  | 'system_validation'
  | 'model_constraint';

export interface DirectorOperationReason {
  type: DirectorReasonType;
  description?: string;
  sourceMessageId?: string;
}

// =============================================================================
// 2. APPROVAL POLICY CLASSIFICATION
// =============================================================================

export type ApprovalLevel =
  | 'AUTO_SAFE'
  | 'USER_CONFIRMATION_REQUIRED'
  | 'EXECUTION_CONFIRMATION_REQUIRED'
  | 'REJECTED_UNAUTHORIZED';

export type ImpactTier =
  | 'DIRECT'
  | 'CREATIVE'
  | 'STRUCTURAL_COST'
  | 'PRODUCT_IDENTITY';

export interface ApprovalPolicyResult {
  level: ApprovalLevel;
  requiresConfirmation: boolean;
  reasons: string[];
}

// =============================================================================
// 3. TARGET SPECIFICATION & OPERATION MODEL
// =============================================================================

export interface DirectorOperationTarget {
  scope: AdSpecPatchScope | 'root';
  entityId?: string; // e.g. "shot_03", "char_sarah", "prod_lumina"
  path?: string; // e.g. "camera.framing" or "brief.desiredDurationSeconds"
}

export interface ChangeImpactSummary {
  directlyAffected: string[];
  indirectlyAffected: string[];
  unaffected: string[];
}

export interface DirectorOperation {
  operationId: string; // Unique string, e.g. "op_01J..."
  type: DirectorOperationType;
  target: DirectorOperationTarget;
  changes: Record<string, any>;
  reason: DirectorOperationReason;
  actor: DirectorOperationActor;
  confidence?: number; // 0.0 - 1.0
  approvalRequirement?: ApprovalLevel;
  approvalLevel?: ApprovalLevel;
  expectedImpact?: ChangeImpactSummary;
  impact?: ChangeImpactSummary;
  parentSpecVersion: number;
}

// =============================================================================
// 4. STRUCTURED ASSET REQUEST CONTRACT
// =============================================================================

export interface StructuredAssetNeed {
  role: SemanticAssetRole;
  reason: string;
  required: boolean;
  qualityRequirement?: string;
  preferredViews?: string[];
  targetEntityId?: string;
}

// =============================================================================
// 5. CHANGE IMPACT ANALYSIS
// =============================================================================

export interface ChangeImpactAnalysis {
  directlyAffected: string[]; // e.g. ["location_01"]
  indirectlyAffected: string[]; // e.g. ["shot_01", "shot_02", "lighting", "ambience"]
  unaffected: string[]; // e.g. ["brand", "product", "cta", "characters"]
  summary: string;
}

// =============================================================================
// 6. CONTINUITY SUPERVISOR CONTRACT & REPORT
// =============================================================================

export type ContinuityCheckCategory =
  | 'character'
  | 'product'
  | 'location'
  | 'camera'
  | 'state';

export interface ContinuityConflictItem {
  category: ContinuityCheckCategory;
  entityId?: string;
  shotsInvolved: string[];
  conflictingAspect: string;
  currentValue: any;
  expectedValue: any;
  description: string;
  autoRepairable: boolean;
  requiresUserConfirmation: boolean;
}

export interface ContinuityReport {
  status: 'PASS' | 'WARNING' | 'CONFLICT';
  checkedShotsCount: number;
  warnings: string[];
  conflicts: ContinuityConflictItem[];
  timestamp: string;
}

// =============================================================================
// 7. STRUCTURED DIFF & EXPLANATION
// =============================================================================

export interface AdSpecDiff {
  specVersionBefore: number;
  specVersionAfter: number;
  modifiedPaths: string[];
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  affectedShots: string[];
  affectedEntities: string[];
  unaffectedCriticalEntities: string[];
  humanExplanation: string;
  timestamp: string;
}

// =============================================================================
// 8. SCOPED DIRECTOR CONTEXT
// =============================================================================

export interface DirectorContext {
  adSpec: AdSpec;
  specVersion: number;
  userRequest?: string;
  workspaceId: string;
  userId: string;
  canonicalAssets?: Array<{
    id: string;
    name: string;
    type: string;
    url?: string;
  }>;
  brandGuidelines?: any;
  selectedConcept?: CreativeConceptItem;
  modelCapabilities?: any;
  confirmedFields?: string[];
  priorDecisions?: Array<{
    decision: string;
    confirmedBy: string;
    timestamp: string;
  }>;
  stageInstructions?: string;
  relevantShotIds?: string[];
}
