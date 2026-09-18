/**
 * Director Stage Contracts & Reasoning Interfaces.
 * Defines explicit boundaries and DTOs for the 8 reasoning stages:
 * - Interviewer
 * - Brief Analyzer
 * - Creative Director
 * - Story Architect
 * - Shot Director
 * - Continuity Supervisor
 * - Revision Engine
 * - Prompt Compiler Contract
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type {
  AdSpec,
  AdBrief,
  AdShot,
  CreativeConceptItem,
  StoryModel,
  StoryBeat,
  ProvenanceSource
} from '../types/adSpec.js';

import type {
  DirectorContext,
  DirectorOperation,
  StructuredAssetNeed,
  ChangeImpactAnalysis,
  ContinuityReport,
  AdSpecDiff,
  ApprovalLevel
} from '../types/directorOperations.js';

// =============================================================================
// 1. INTERVIEWER STAGE CONTRACT
// =============================================================================

export interface InterviewerQuestion {
  questionId: string;
  question: string;
  priority: number; // 1 = blocking, 2 = high-impact, 3 = concept-affecting, 4 = asset-related, 5 = aesthetic
  targetField: string; // e.g. "brief.cta", "brief.desiredDurationSeconds"
  rationale: string;
  suggestedOptions?: string[];
}

export interface KnownInformationItem {
  field: string;
  value: any;
  provenance: ProvenanceSource;
  confirmed: boolean;
}

export interface InterviewerStageInput {
  context: DirectorContext;
  lastUserMessage?: string;
  userAnswer?: {
    questionId: string;
    answerText: string;
  };
}

export interface InterviewerStageOutput {
  knownInformation: KnownInformationItem[];
  missingInformation: string[];
  nextQuestion?: InterviewerQuestion;
  pendingQuestions: InterviewerQuestion[];
  assetNeeds: StructuredAssetNeed[];
  proposedOperations: DirectorOperation[];
  summary: string;
  isDiscoveryComplete: boolean;
}

// =============================================================================
// 1B. PHASE 2: AI INTERVIEWER / DISCOVERY ENGINE DOMAIN CONTRACTS
// =============================================================================

export type DiscoveryStatus =
  | 'DISCOVERY'
  | 'WAITING_FOR_USER'
  | 'READY_FOR_CREATIVE'
  | 'BLOCKED';

export type QuestionPriority = 'BLOCKING' | 'IMPORTANT' | 'OPTIONAL';

export type QuestionInputType =
  | 'text'
  | 'textarea'
  | 'single_choice'
  | 'multi_choice'
  | 'number'
  | 'url'
  | 'asset_selection'
  | 'boolean';

export interface QuestionOption {
  label: string;
  value: string;
  description?: string;
}

export interface DiscoveryQuestion {
  id: string;
  field: string;
  question: string;
  reason: string;
  priority: QuestionPriority;
  inputType: QuestionInputType;
  options?: QuestionOption[];
  required: boolean;
  allowCustom: boolean;
  dependsOn?: string;
  status: 'PENDING' | 'ANSWERED' | 'SKIPPED';
}

export interface KnownField {
  field: string;
  value: any;
  source: 'USER' | 'INFERRED' | 'ASSET' | 'SYSTEM';
  confidence?: number;
}

export interface DiscoveryContradiction {
  type: 'CONTRADICTION';
  fields: string[];
  explanation: string;
  resolutionQuestion: string;
}

export interface DiscoveryAnswer {
  questionId: string;
  rawAnswer: string | string[];
  parsedValue?: any;
  answeredAt: string;
}

export interface DiscoveryState {
  projectId: string;
  workspaceId: string;
  status: DiscoveryStatus;
  brief: Partial<AdBrief>;
  knownFields: KnownField[];
  unknownFields: string[];
  ambiguities: string[];
  questions: DiscoveryQuestion[];
  answers: DiscoveryAnswer[];
  contradictions: DiscoveryContradiction[];
  completeness: number; // 0.0 - 1.0
  blockingIssues: string[];
  isBriefConfirmed: boolean;
  confirmedAt?: string;
  updatedAt: string;
}

// DTOs for Discovery API
export interface InitDiscoveryRequest {
  initialPrompt: string;
  assetIds?: string[];
}

export interface InitDiscoveryResponse {
  discovery: DiscoveryState;
  questions: DiscoveryQuestion[];
  summary: string;
}

export interface AnswerDiscoveryRequest {
  answers: Array<{
    questionId: string;
    answer: string | string[];
  }>;
}

export interface AnswerDiscoveryResponse {
  discovery: DiscoveryState;
  nextQuestions: DiscoveryQuestion[];
  summary: string;
  isReadyForCreative: boolean;
}

export interface ConfirmBriefRequest {
  briefOverrides?: Partial<AdBrief>;
}

export interface ConfirmBriefResponse {
  success: boolean;
  projectId: string;
  status: 'READY_FOR_CREATIVE';
  brief: AdBrief;
  versionNumber: number;
}

export interface GetDiscoveryStateResponse {
  discovery: DiscoveryState;
  activeQuestions: DiscoveryQuestion[];
  isReadyForCreative: boolean;
}

// =============================================================================
// 2. BRIEF ANALYZER STAGE CONTRACT
// =============================================================================

export interface BriefContradiction {
  fieldA: string;
  fieldB: string;
  description: string;
  suggestedResolution?: string;
}

export interface BriefAnalyzerStageInput {
  context: DirectorContext;
  rawUserInput?: string;
}

export interface BriefAnalyzerStageOutput {
  completenessScore: number; // 0.0 - 1.0
  isReadyForCreative: boolean;
  contradictions: BriefContradiction[];
  normalizedFields: Record<string, any>;
  missingRequiredFields: string[];
  proposedOperations: DirectorOperation[];
}

export type BriefBuilderStageInput = BriefAnalyzerStageInput;
export type BriefBuilderStageOutput = BriefAnalyzerStageOutput;

// =============================================================================
// 3. CREATIVE DIRECTOR STAGE CONTRACT
// =============================================================================

export interface ConceptQualityEvaluation {
  conceptId: string;
  originalityScore: number; // 1 - 10
  brandFitScore: number; // 1 - 10
  audienceFitScore: number; // 1 - 10
  visualPotentialScore: number; // 1 - 10
  narrativeStrengthScore: number; // 1 - 10
  feasibilityScore: number; // 1 - 10
  productionComplexity: 'low' | 'medium' | 'high';
  assetReadiness: 'complete' | 'needs_hero_packshot' | 'needs_character_ref' | 'missing_assets';
  modelCompatibility: 'high' | 'medium' | 'experimental';
  strengths: string[];
  risks: string[];
  overallEvaluation: string;
}

export interface CreativeDirectorStageInput {
  context: DirectorContext;
  targetConceptCount?: number; // default: 3
}

export interface CreativeDirectorStageOutput {
  concepts: CreativeConceptItem[];
  conceptEvaluations: Record<string, ConceptQualityEvaluation>;
  proposedOperations: DirectorOperation[];
  directorRecommendation: string;
}

// =============================================================================
// 3B. PHASE 3: CREATIVE CONCEPT ENGINE DOMAIN CONTRACTS
// =============================================================================

export type CreativeMechanism =
  | 'transformation'
  | 'contrast'
  | 'repetition'
  | 'reveal'
  | 'escalation'
  | 'visual_metaphor'
  | 'unexpected_consequence'
  | 'before_after'
  | 'problem_solution'
  | 'product_demonstration'
  | 'point_of_view'
  | 'social_proof'
  | 'challenge'
  | 'countdown'
  | 'misdirection'
  | 'visual_comparison'
  | 'scale_shift'
  | 'impossible_world'
  | 'ritual'
  | 'cause_effect'
  | string;

export type ProductRole =
  | 'protagonist'
  | 'enabler'
  | 'solution'
  | 'transformation_trigger'
  | 'visual_centerpiece'
  | 'supporting_element'
  | 'proof_mechanism';

export type MessageDelivery =
  | 'visual_demonstration'
  | 'dialogue'
  | 'voiceover'
  | 'on_screen_text'
  | 'behavior'
  | 'transformation'
  | 'comparison'
  | 'narrative_consequence'
  | 'product_interaction';

export type HookType =
  | 'impossible_visual_event'
  | 'unexpected_product_behavior'
  | 'unresolved_question'
  | 'immediate_transformation'
  | 'visual_contradiction'
  | 'unusual_human_action'
  | 'striking_product_reveal'
  | string;

export type ConceptStatus =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'SELECTED'
  | 'REJECTED'
  | 'ARCHIVED';

export interface RequiredAssetItem {
  role: string;
  description: string;
  exists: boolean;
  assetId?: string;
}

export interface VisualDirectionConcept {
  visualLanguage: string;
  environment: string;
  colorDirection: string;
  energy: string;
  realismLevel: string;
}

export interface CreativeConcept {
  id: string; // e.g. "concept_uuid"
  projectId: string;
  workspaceId: string;
  briefVersion: number; // Exact AdSpec version number containing confirmed brief

  name: string;
  oneLineIdea: string;

  strategicFoundation: string;
  creativeMechanism: CreativeMechanism;

  hook: {
    type: HookType;
    description: string;
  };
  premise: string;

  emotionalArc: string; // e.g. "curiosity -> tension -> realization -> payoff"

  visualDirection: VisualDirectionConcept;
  narrativeStructure: string; // e.g. "SETUP -> PROBLEM -> ESCALATION -> PRODUCT INTRODUCTION -> PAYOFF"

  productRole: ProductRole;
  messageDelivery: MessageDelivery;

  differentiation: string;

  risks: string[];
  strengths: string[];

  estimatedComplexity: 'low' | 'medium' | 'high';

  requiredAssets: RequiredAssetItem[];

  conceptStatus: ConceptStatus;

  provenance: {
    generatedBy: 'ai_director' | 'user';
    modelUsed?: string;
    generatedAt: string;
    selectedAt?: string;
    selectedBy?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ConceptDiversityComparison {
  conceptAId: string;
  conceptAName: string;
  conceptBId: string;
  conceptBName: string;
  mechanismOverlap: boolean;
  hookOverlap: boolean;
  structureOverlap: boolean;
  productRoleOverlap: boolean;
  similarityScore: number; // 0.0 - 1.0
  reason: string;
}

export interface ConceptDiversityReport {
  isDiverse: boolean;
  score: number; // 0.0 - 1.0 (higher = more diverse)
  pairwiseComparisons: ConceptDiversityComparison[];
  rejectionReason?: string;
}

export interface ConceptQualityReport {
  conceptId: string;
  objectiveAlignment: boolean;
  productInvolvement: boolean;
  keyMessageDelivered: boolean;
  concreteHook: boolean;
  distinctive: boolean;
  runtimeFeasible: boolean;
  mustIncludeSatisfied: boolean;
  mustAvoidRespected: boolean;
  platformFit: boolean;
  passed: boolean;
  issues: string[];
}

// Request & Response DTOs
export interface GenerateConceptsRequest {
  targetCount?: number; // default: 3
  creativeNotes?: string;
}

export interface GenerateConceptsResponse {
  concepts: CreativeConcept[];
  diversity: ConceptDiversityReport;
  briefVersion: number;
}

export interface GetConceptsResponse {
  concepts: CreativeConcept[];
  selectedConceptId?: string;
  briefVersion: number;
  isStale: boolean;
}

export interface SelectConceptRequest {
  userRationale?: string;
}

export interface SelectConceptResponse {
  success: boolean;
  selectedConcept: CreativeConcept;
  adSpecVersionNumber: number;
  adSpec: AdSpec;
}

export interface RegenerateConceptsRequest {
  targetCount?: number;
  creativeNotes?: string;
  archivePrevious?: boolean;
}

export interface RegenerateConceptsResponse {
  concepts: CreativeConcept[];
  diversity: ConceptDiversityReport;
  briefVersion: number;
}


// =============================================================================
// 4. STORY ARCHITECT STAGE CONTRACT
// =============================================================================

export interface StoryArchitectStageInput {
  context: DirectorContext;
  selectedConceptId: string;
}

export interface StoryArchitectStageOutput {
  storyModel: StoryModel;
  narrativeArcRationale: {
    hookRationale: string;
    tensionIntroduction: string;
    productIntegration: string;
    payoffMechanism: string;
    ctaTransition: string;
  };
  proposedOperations: DirectorOperation[];
}

// =============================================================================
// 5. SHOT DIRECTOR STAGE CONTRACT
// =============================================================================

export interface ShotDirectorStageInput {
  context: DirectorContext;
  targetTotalDurationSeconds?: number;
}

export interface ShotDirectorStageOutput {
  shots: AdShot[];
  visualProgressionNotes: string;
  pacingNotes: string;
  proposedOperations: DirectorOperation[];
}

// =============================================================================
// 6. CONTINUITY SUPERVISOR STAGE CONTRACT
// =============================================================================

export interface ContinuitySupervisorStageInput {
  context: DirectorContext;
  proposedChanges?: DirectorOperation[];
}

export interface ContinuitySupervisorStageOutput {
  report: ContinuityReport;
  recommendedRepairs: DirectorOperation[];
}

// =============================================================================
// 4B. PHASE 4: STORY ARCHITECT & DIRECTOR'S PLAN DOMAIN CONTRACTS
// =============================================================================

export interface ContinuityStatusReport {
  characterConsistent: boolean;
  productReferenceLocked: boolean;
  locationContinuity: boolean;
  wardrobeConsistent: boolean;
  links: Array<{
    fromShotId: string;
    toShotId: string;
    entityId: string;
    aspect: string;
    invariant: string;
  }>;
  issues: string[];
  summary: string;
}

export interface GenerateDirectorsPlanRequest {
  targetDurationSeconds?: number;
  cinematographyStyle?: string;
  pacingPreference?: string;
}

export interface GenerateDirectorsPlanResponse {
  success: boolean;
  projectId: string;
  adSpecVersionNumber: number;
  storyModel: StoryModel;
  shots: AdShot[];
  continuityReport: ContinuityStatusReport;
  adSpec: AdSpec;
}

export interface GetDirectorsPlanResponse {
  projectId: string;
  adSpecVersionNumber: number;
  adSpec: AdSpec;
  storyModel: StoryModel;
  shots: AdShot[];
  continuityReport: ContinuityStatusReport;
  isConfirmed: boolean;
}

export interface ConfirmDirectorsPlanRequest {
  userNotes?: string;
}

export interface ConfirmDirectorsPlanResponse {
  success: boolean;
  projectId: string;
  adSpecVersionNumber: number;
  adSpec: AdSpec;
  status: 'approved';
  approvedAt: string;
}

// =============================================================================
// 7. REVISION ENGINE STAGE CONTRACT
// =============================================================================

export interface RevisionEngineStageInput {
  context: DirectorContext;
  userInstruction: string;
  targetScope?: string;
  targetEntityId?: string;
}

export interface RevisionEngineStageOutput {
  impactAnalysis: ChangeImpactAnalysis;
  approvalLevel: ApprovalLevel;
  proposedOperations: DirectorOperation[];
  diffPreview?: AdSpecDiff;
  humanExplanation: string;
}

// =============================================================================
// 7B. PHASE 5: NATURAL-LANGUAGE REVISION & STRUCTURED PROPOSAL CONTRACTS
// =============================================================================

export type ImpactTier =
  | 'DIRECT'
  | 'CREATIVE'
  | 'STRUCTURAL_COST'
  | 'PRODUCT_IDENTITY';

export interface CostImpactEstimate {
  shotsBefore: number;
  shotsAfter: number;
  durationSecondsBefore: number;
  durationSecondsAfter: number;
  deltaShots: number;
  deltaDurationSeconds: number;
  complexityDelta: 'none' | 'minor' | 'moderate' | 'major';
  estimatedGenerationCostDelta?: string;
  warning?: string;
}

export interface ProposedRevisionOperation {
  operationId: string;
  operation: string; // 'set' | 'update_shot' | 'insert_shot' | 'delete_shot' | 'update_field' | 'update_character' | 'update_product' | 'update_location';
  target: string; // e.g. "shot_03.camera.movement"
  targetScope: string; // e.g. "shot", "brief", "story", "product"
  targetEntityId?: string; // e.g. "shot_03"
  before: any;
  after: any;
  reason: string;
  impact: ImpactTier;
  costImpact?: CostImpactEstimate;
  requiresExplicitConfirmation: boolean;
  rawOperation: DirectorOperation;
}

export interface ProposeRevisionRequest {
  instruction: string;
  targetScope?: string;
  targetEntityId?: string;
}

export interface ProposeRevisionResponse {
  success: boolean;
  projectId: string;
  instruction: string;
  operations: ProposedRevisionOperation[];
  highestImpactTier: ImpactTier;
  requiresExplicitConfirmation: boolean;
  costImpact?: CostImpactEstimate;
  summary: string;
  affectedShots: string[];
  unaffectedCriticalEntities: string[];
}

export interface ApplyRevisionRequest {
  instruction: string;
  confirmedOperations?: ProposedRevisionOperation[];
  userRationale?: string;
}

export interface ApplyRevisionResponse {
  success: boolean;
  projectId: string;
  adSpecVersionNumber: number;
  adSpec: AdSpec;
  operationsAppliedCount: number;
  highestImpactTier: ImpactTier;
  diff: AdSpecDiff;
  continuityReport: ContinuityStatusReport;
}

// =============================================================================
// 8. PROMPT COMPILER CONTRACT (PROVIDER BOUNDARY)
// =============================================================================

export interface CompiledGenerationRequest {
  adId: string;
  specVersion: number;
  shotId: string;
  targetEngine: string; // e.g. "google_veo", "seedance", "omni"
  synthesizedPrompt: string;
  negativePrompt: string;
  durationSeconds: number;
  aspectRatio: string;
  resolution: '720p' | '1080p' | '4k';
  referenceAssetBindings: Array<{
    assetId: string;
    role: string;
    url?: string;
    framePlacement?: 'first_frame' | 'last_frame' | 'general_ref';
  }>;
  cameraDirectives: string;
  lightingDirectives: string;
  audioDirectives: string;
  actionDirectives: string;
  modelSpecificParameters: Record<string, any>;
  continuityContextNotes?: string;
}

export interface PromptCompilerInput {
  adSpec: AdSpec;
  shot: AdShot;
  modelCapabilities?: any;
  generationContext?: {
    engineKey: string;
    resolution?: '720p' | '1080p' | '4k';
  };
}

export interface PromptCompilerContract {
  compileDirectorPlan(input: PromptCompilerInput): CompiledGenerationRequest;
}

// =============================================================================
// 9. API REQUEST & RESPONSE DTOS FOR ORCHESTRATION
// =============================================================================

export interface ApplyDirectorOperationRequest {
  adId: string;
  workspaceId?: string;
  operation: DirectorOperation;
}

export interface ApplyDirectorOperationResponse {
  success: boolean;
  updatedAdSpec: AdSpec;
  diff: AdSpecDiff;
  impact: ChangeImpactAnalysis;
  continuity: ContinuityReport;
  explanation: string;
}

export type DirectorStage =
  | 'interviewer'
  | 'brief_analyzer'
  | 'creative_director'
  | 'story_architect'
  | 'shot_director'
  | 'continuity'
  | 'revision';

export interface RunDirectorStageRequest {
  adId: string;
  workspaceId?: string;
  stage: DirectorStage;
  payload?: any;
}


export interface RunDirectorStageResponse {
  stage: string;
  status: 'completed' | 'blocked_by_policy' | 'requires_user_confirmation';
  stageOutput: any;
  appliedOperations: DirectorOperation[];
  updatedAdSpec?: AdSpec;
  diff?: AdSpecDiff;
  explanation?: string;
}

// =============================================================================
// 10. STAGE READ/WRITE BOUNDARY SPECIFICATIONS
// =============================================================================

export interface StageBoundarySpecification {
  stage: string;
  allowedReads: string[];
  allowedProposals: string[];
  forbiddenChanges: string[];
}

export const STAGE_BOUNDARIES: Record<string, StageBoundarySpecification> = {
  interviewer: {
    stage: 'interviewer',
    allowedReads: ['brief', 'conversation', 'brandGuidelines', 'canonicalAssets'],
    allowedProposals: ['update_field', 'set', 'patch', 'request_asset'],
    forbiddenChanges: ['shots', 'camera', 'storyboards', 'provider_prompts', 'approved_decisions']
  },
  brief_builder: {
    stage: 'brief_builder',
    allowedReads: ['brief', 'conversation', 'constraints'],
    allowedProposals: ['update_field', 'set', 'patch', 'transition_creative_state'],
    forbiddenChanges: ['shots', 'camera', 'provider_prompts', 'inventing_unconfirmed_facts']
  },
  creative_director: {
    stage: 'creative_director',
    allowedReads: ['brief', 'brandRules', 'canonicalAssets', 'audience'],
    allowedProposals: ['propose_concepts', 'transition_creative_state'],
    forbiddenChanges: ['mutating_confirmed_brief', 'inventing_asset_ids', 'shots']
  },
  story_architect: {
    stage: 'story_architect',
    allowedReads: ['selectedConcept', 'brief', 'brand', 'characters', 'products', 'locations'],
    allowedProposals: ['update_story_beats', 'set', 'patch'],
    forbiddenChanges: ['provider_prompts', 'lens_specifications', 'creative_concept']
  },
  shot_director: {
    stage: 'shot_director',
    allowedReads: ['selectedConcept', 'story', 'brief', 'characters', 'products', 'locations', 'assets', 'constraints'],
    allowedProposals: ['insertShot', 'insert_shot', 'update_shot', 'patch', 'deleteShot', 'delete_shot'],
    forbiddenChanges: ['provider_selection', 'provider_payloads', 'inventing_assets', 'direct_database_write']
  },
  continuity: {
    stage: 'continuity',
    allowedReads: ['shots', 'characters', 'products', 'locations', 'continuityLinks'],
    allowedProposals: ['repair_operations', 'update_shot', 'patch'],
    forbiddenChanges: ['silent_creative_redirection', 'overwriting_user_confirmed_decisions']
  },
  revision: {
    stage: 'revision',
    allowedReads: ['adSpec', 'userInstruction', 'revisionHistory'],
    allowedProposals: ['patch', 'update_shot', 'update_field', 'update_location'],
    forbiddenChanges: ['regenerating_unrelated_shots', 'overwriting_user_confirmed_invariants']
  }
};

// =============================================================================
// 11. STAGE CONTEXT BUILDERS (SCOPING)
// =============================================================================

export function buildScopedDirectorContext(params: {
  adSpec: AdSpec;
  stage: string;
  userRequest?: string;
  workspaceId: string;
  userId: string;
}): DirectorContext {
  const { adSpec, stage, userRequest, workspaceId, userId } = params;

  switch (stage) {
    case 'interviewer':
    case 'brief_builder':
    case 'brief_analyzer':
      return {
        adSpec,
        specVersion: adSpec.identity.specVersion,
        userRequest,
        workspaceId,
        userId,
        canonicalAssets: adSpec.assets.assets.map(a => ({
          id: a.assetId,
          name: a.label,
          type: a.semanticRole,
          url: a.url
        })),
        brandGuidelines: adSpec.brand.globalGuidelines
      };

    case 'creative_director':
      return {
        adSpec,
        specVersion: adSpec.identity.specVersion,
        workspaceId,
        userId,
        canonicalAssets: adSpec.assets.assets.map(a => ({
          id: a.assetId,
          name: a.label,
          type: a.semanticRole
        })),
        brandGuidelines: adSpec.brand.globalGuidelines
      };

    case 'story_architect':
      return {
        adSpec,
        specVersion: adSpec.identity.specVersion,
        workspaceId,
        userId,
        selectedConcept: adSpec.creative.concepts.find(c => c.conceptId === adSpec.creative.selectedConceptId)
      };

    case 'shot_director':
      return {
        adSpec,
        specVersion: adSpec.identity.specVersion,
        workspaceId,
        userId,
        selectedConcept: adSpec.creative.concepts.find(c => c.conceptId === adSpec.creative.selectedConceptId),
        canonicalAssets: adSpec.assets.assets.map(a => ({
          id: a.assetId,
          name: a.label,
          type: a.semanticRole
        }))
      };

    case 'continuity':
      return {
        adSpec,
        specVersion: adSpec.identity.specVersion,
        workspaceId,
        userId,
        relevantShotIds: adSpec.shots.map(s => s.shotId)
      };

    case 'revision':
    default:
      return {
        adSpec,
        specVersion: adSpec.identity.specVersion,
        userRequest,
        workspaceId,
        userId,
        selectedConcept: adSpec.creative.concepts.find(c => c.conceptId === adSpec.creative.selectedConceptId)
      };
  }
}

// =============================================================================
// 12. AI PROVIDER ADAPTER CONTRACT
// =============================================================================

export interface AIProviderAdapter {
  generateStructuredReasoning<T>(params: {
    stage: string;
    prompt: string;
    schema?: Record<string, any>;
    context?: DirectorContext;
  }): Promise<{
    data: T;
    modelUsed: string;
    tokensUsed?: { prompt: number; completion: number };
  }>;
}

