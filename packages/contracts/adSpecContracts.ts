/**
 * Pure API Request & Response Contracts (DTOs) for AdSpec v1 & Director Platform.
 * Framework-free: MUST NOT import React, Firebase, Express, or vendor SDKs.
 */

import { z } from 'zod';
import type {
  AdSpec,
  AdCharacterEntity,
  AdProductEntity,
  AdSpecLocationEntity,
  AdShot,
  AdSpecShot,
  AdSpecPatch,
  AdSpecDelta,
  ExecutionSnapshot,
  DecisionProvenance,
  GenerationRequirements,
  AdSpecValidationStatus,
  AdSpecValidationIssue
} from '../types/adSpec.js';

import type {
  DiscoveryStatus,
  QuestionPriority,
  QuestionInputType,
  QuestionOption,
  DiscoveryQuestion,
  KnownField,
  DiscoveryContradiction,
  DiscoveryAnswer,
  DiscoveryState,
  InitDiscoveryRequest,
  InitDiscoveryResponse,
  AnswerDiscoveryRequest,
  AnswerDiscoveryResponse,
  ConfirmBriefRequest,
  ConfirmBriefResponse,
  GetDiscoveryStateResponse,
  CreativeMechanism,
  ProductRole,
  MessageDelivery,
  HookType,
  ConceptStatus,
  RequiredAssetItem,
  VisualDirectionConcept,
  CreativeConcept,
  ConceptDiversityComparison,
  ConceptDiversityReport,
  ConceptQualityReport,
  GenerateConceptsRequest,
  GenerateConceptsResponse,
  GetConceptsResponse,
  SelectConceptRequest,
  SelectConceptResponse,
  RegenerateConceptsRequest,
  RegenerateConceptsResponse,
  ContinuityStatusReport,
  GenerateDirectorsPlanRequest,
  GenerateDirectorsPlanResponse,
  GetDirectorsPlanResponse,
  ConfirmDirectorsPlanRequest,
  ConfirmDirectorsPlanResponse,
  ImpactTier,
  CostImpactEstimate,
  ProposedRevisionOperation,
  ProposeRevisionRequest,
  ProposeRevisionResponse,
  ApplyRevisionRequest,
  ApplyRevisionResponse
} from './directorStageContracts.js';

export type { AdBrief } from '../types/adDirector.js';

export type {
  AdSpec,
  AdCharacterEntity,
  AdProductEntity,
  AdSpecLocationEntity,
  AdShot,
  AdSpecShot,
  AdSpecPatch,
  AdSpecDelta,
  ExecutionSnapshot,
  DecisionProvenance,
  GenerationRequirements,
  AdSpecValidationStatus,
  AdSpecValidationIssue,
  DiscoveryStatus,
  QuestionPriority,
  QuestionInputType,
  QuestionOption,
  DiscoveryQuestion,
  KnownField,
  DiscoveryContradiction,
  DiscoveryAnswer,
  DiscoveryState,
  InitDiscoveryRequest,
  InitDiscoveryResponse,
  AnswerDiscoveryRequest,
  AnswerDiscoveryResponse,
  ConfirmBriefRequest,
  ConfirmBriefResponse,
  GetDiscoveryStateResponse,
  CreativeMechanism,
  ProductRole,
  MessageDelivery,
  HookType,
  ConceptStatus,
  RequiredAssetItem,
  VisualDirectionConcept,
  CreativeConcept,
  ConceptDiversityComparison,
  ConceptDiversityReport,
  ConceptQualityReport,
  GenerateConceptsRequest,
  GenerateConceptsResponse,
  GetConceptsResponse,
  SelectConceptRequest,
  SelectConceptResponse,
  RegenerateConceptsRequest,
  RegenerateConceptsResponse,
  ContinuityStatusReport,
  GenerateDirectorsPlanRequest,
  GenerateDirectorsPlanResponse,
  GetDirectorsPlanResponse,
  ConfirmDirectorsPlanRequest,
  ConfirmDirectorsPlanResponse,
  ImpactTier,
  CostImpactEstimate,
  ProposedRevisionOperation,
  ProposeRevisionRequest,
  ProposeRevisionResponse,
  ApplyRevisionRequest,
  ApplyRevisionResponse
};


export interface CreateAdSpecRequest {
  title: string;
  workspaceId?: string;
  initialSpec?: Partial<AdSpec>;
}

export interface CreateAdSpecResponse {
  adSpec: AdSpec;
}

export interface GetAdSpecResponse {
  adSpec: AdSpec;
}

export interface GetAdSpecVersionResponse {
  adSpec: AdSpec;
  delta?: AdSpecDelta;
  isApproved: boolean;
}

export interface ValidateAdSpecRequest {
  adSpec: AdSpec;
}

export interface ValidateAdSpecResponse {
  valid: boolean;
  errors: AdSpecValidationIssue[];
  warnings: AdSpecValidationIssue[];
  evaluatedAtVersion?: number;
  evaluatedAtRevisionId?: string;
  isAuthoritative?: boolean;
  metrics: {
    shotCount: number;
    calculatedDuration: number;
    characterCount: number;
    productCount: number;
    locationCount: number;
    assetCount: number;
    constraintCount: number;
    confirmedFieldsCount: number;
  };
}

export interface ReviseAdSpecRequest {
  patch: AdSpecPatch;
}

export interface ReviseAdSpecResponse {
  updatedAdSpec: AdSpec;
  delta: AdSpecDelta;
}

export interface ApproveAdSpecRequest {
  specVersion?: number;
}

export interface ApproveAdSpecResponse {
  success: boolean;
  adId: string;
  specVersion: number;
  creativeState: 'approved';
}

export interface CreateExecutionSnapshotRequest {
  specVersion?: number;
}

export interface CreateExecutionSnapshotResponse {
  snapshot: ExecutionSnapshot;
}

export interface LegacyVideoToAdSpecAdapterRequest {
  prompt: string;
  aspectRatio?: string;
  durationSeconds?: number;
  engine?: string;
  startFrameAssetId?: string;
  referenceAssetIds?: string[];
}

export interface LegacyVideoToAdSpecAdapterResponse {
  adSpec: AdSpec;
}

// =============================================================================
// 19. MODEL COMPATIBILITY & CAPABILITY CONTRACTS
// =============================================================================

export interface ModelCompatibilityIssue {
  type: string;
  field: string;
  message: string;
  required?: any;
  supported?: any;
}

export interface ModelCompatibilityResult {
  engineKey: string;
  status: 'compatible' | 'warning' | 'incompatible';
  blockingIssues: ModelCompatibilityIssue[];
  warnings: ModelCompatibilityIssue[];
  supportedFeatures: {
    maxDurationSeconds: number;
    aspectRatioSupported: boolean;
    firstFrameSupported: boolean;
    lastFrameSupported: boolean;
    nativeAudioSupported: boolean;
    maxReferenceImages: number;
  };
}

// =============================================================================
// 20. GENERATION PLAN CONTRACTS
// =============================================================================

export interface PlannedShot {
  shotId: string;
  name: string;
  durationSeconds: number;
  engineKey: string;
  compiledPrompt: string;
  negativePrompt?: string;
  parameters: Record<string, any>;
  referenceAssetIds: string[];
  estimatedCredits: number;
}

export interface GenerationPlan {
  planId: string;
  snapshotId: string;
  adId: string;
  specVersion: number;
  selectedEngine: string;
  shots: PlannedShot[];
  totalEstimatedCredits: number;
  idempotencyKey: string;
  createdAt: string;
}

export interface CreateGenerationPlanRequest {
  snapshotId: string;
  engineKey?: string;
  idempotencyKey?: string;
}

export interface CreateGenerationPlanResponse {
  generationPlan: GenerationPlan;
  creditHoldId?: string;
  jobIds: string[];
}

// =============================================================================
// 21. PROVIDER RUN, RESULTS & QA CONTRACTS
// =============================================================================

export interface ProviderRunSummary {
  id: string;
  generationJobId: string;
  provider: string;
  model: string;
  externalJobId?: string;
  attemptNumber: number;
  status: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface GenerationResultSummary {
  id: string;
  generationJobId: string;
  snapshotId: string;
  shotId: string;
  outputAssetId?: string;
  provider: string;
  model: string;
  attemptNumber: number;
  durationSeconds?: number;
  acceptanceStatus: 'pending' | 'accepted' | 'rejected' | 'superseded';
  videoUrl?: string;
  createdAt: string;
}

export interface QAIssue {
  shotId: string;
  requirement: string;
  expected: string;
  observed: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface QAResultSummary {
  id: string;
  resultId: string;
  generationJobId: string;
  snapshotId: string;
  shotId: string;
  status: 'passed' | 'failed' | 'warning';
  scores: Record<string, number>;
  issues: QAIssue[];
  repairRecommendation?: AdSpecPatch;
  evaluatedAt: string;
}

export interface ShotRegenerationRequest {
  snapshotId: string;
  shotId: string;
  repairPatch?: AdSpecPatch;
  engineKey?: string;
}

export interface ShotRegenerationResponse {
  newJobId: string;
  shotId: string;
  attemptNumber: number;
}

export interface ExportSummary {
  id: string;
  adId: string;
  snapshotId: string;
  outputAssetId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  exportUrl?: string;
  createdAt: string;
}

// =============================================================================
// 22. PHASE 1: VIDEO AD PROJECT & IMMUTABLE VERSION CONTRACTS
// =============================================================================

export interface VideoAdProjectSummary {
  id: string;
  workspaceId: string;
  title: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVideoAdProjectRequest {
  title: string;
  workspaceId: string;
  initialSpec?: Partial<AdSpec>;
}

export interface CreateVideoAdProjectResponse {
  project: VideoAdProjectSummary;
  adSpec: AdSpec;
}

export interface GetVideoAdProjectResponse {
  project: VideoAdProjectSummary;
  currentAdSpec: AdSpec;
  versionsCount: number;
}

export interface CreateAdSpecVersionRequest {
  spec: AdSpec;
  reason?: string;
  source?: 'user_requested' | 'ai_inferred' | 'ai_optimized' | 'system_repaired' | 'model_constraint';
}

export interface CreateAdSpecVersionResponse {
  adSpec: AdSpec;
  versionNumber: number;
  contentHash: string;
  previousVersionNumber?: number;
}

export interface ListAdSpecVersionsResponse {
  projectId: string;
  versions: Array<{
    id: string;
    versionNumber: number;
    parentVersionId?: string;
    status: string;
    contentHash: string;
    createdAt: string;
    approvedAt?: string;
  }>;
}

export interface ConfirmDecisionRequest {
  fieldPath: string;
  lock?: boolean;
  lockScope?: string;
  reason?: string;
}

export interface ConfirmDecisionResponse {
  fieldPath: string;
  isLocked: boolean;
  lockScope?: string;
  confirmedAt: string;
}

// =============================================================================
// 23. RUNTIME ZOD SCHEMAS FOR ADSPEC VALIDATION
// =============================================================================

export const StableEntityIdRegex = {
  character: /^char_[a-zA-Z0-9_-]+$/,
  product: /^(product|prod)_[a-zA-Z0-9_-]+$/,
  location: /^(location|loc)_[a-zA-Z0-9_-]+$/,
  shot: /^shot_[a-zA-Z0-9_-]+$/,
  asset: /^asset_[a-zA-Z0-9_-]+$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

export const AdBriefZodSchema = z.object({
  brandRef: z.string().min(1),
  product: z.string().min(1),
  objective: z.any(),
  targetAudience: z.any(),
  platform: z.enum(['instagram_reels', 'tiktok_in_feed', 'youtube_shorts', 'linkedin_video', 'connected_tv', 'generic']),
  placement: z.string().optional(),
  desiredDurationSeconds: z.any(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5']),
  language: z.string().default('en'),
  cta: z.any(),
  offer: z.string().optional(),
  keyMessage: z.any(),
  desiredResponse: z.string().default(''),
  tone: z.any(),
  emotionalGoal: z.object({
    primaryEmotion: z.string().default(''),
    finalImpression: z.string().default(''),
  }).optional(),
  mustInclude: z.array(z.string()).default([]),
  mustAvoid: z.array(z.string()).default([]),
  referencesAndInspiration: z.array(z.string()).default([]),
  userConstraints: z.array(z.string()).default([]),
});

export const SemanticAssetItemZodSchema = z.object({
  assetId: z.string().min(1),
  semanticRole: z.string(),
  targetEntityId: z.string().optional(),
  label: z.string(),
  url: z.string().optional(),
  mimeType: z.string().optional(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  usageConstraints: z.array(z.string()).default([]),
  provenance: z.string().default('user_provided'),
});

export const AssetBibleZodSchema = z.object({
  assets: z.array(SemanticAssetItemZodSchema).default([]),
});

export const CharacterEntityZodSchema = z.object({
  id: z.string().regex(StableEntityIdRegex.character, 'Character ID must follow format char_*'),
  name: z.string().optional(),
  displayName: z.string().min(1),
  narrativeRole: z.string().default('protagonist'),
  referenceAssetIds: z.array(z.string()).default([]),
  appearance: z.record(z.any()).default({}),
  wardrobe: z.record(z.any()).default({}),
  behaviorPersonality: z.string().default(''),
  identityLockStrength: z.enum(['strict', 'normal', 'flexible']).optional(),
  locks: z.array(z.string()).default([]),
  continuityConstraints: z.array(z.string()).default([]),
  forbiddenChanges: z.array(z.string()).default([]),
});

export const ProductEntityZodSchema = z.object({
  id: z.string().regex(StableEntityIdRegex.product, 'Product ID must follow format product_* or prod_*'),
  name: z.string().min(1),
  referenceAssetIds: z.array(z.string()).default([]),
  visualDescription: z.string().default(''),
  shapeForm: z.string().default(''),
  materials: z.array(z.string()).default([]),
  colorPalette: z.array(z.string()).default([]),
  packaging: z.record(z.any()).default({}),
  branding: z.record(z.any()).default({}),
  labelLogoConstraints: z.array(z.string()).default([]),
  orientationConstraints: z.array(z.string()).default([]),
  allowedTransformations: z.array(z.string()).default([]),
  forbiddenTransformations: z.array(z.string()).default([]),
  continuityRequirements: z.array(z.string()).default([]),
  locks: z.array(z.string()).default([]),
});

export const LocationEntityZodSchema = z.object({
  id: z.string().regex(StableEntityIdRegex.location, 'Location ID must follow format location_* or loc_*'),
  name: z.string().min(1),
  description: z.string().default(''),
  referenceAssetIds: z.array(z.string()).default([]),
  architecture: z.string().default(''),
  spatialCharacteristics: z.record(z.any()).default({}),
  lightingCharacteristics: z.record(z.any()).default({}),
  weather: z.string().optional(),
  palette: z.array(z.string()).default([]),
  atmosphere: z.string().default(''),
  continuityConstraints: z.array(z.string()).default([]),
  locks: z.array(z.string()).default([]),
});

export const ShotTimingZodSchema = z.object({
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  duration: z.number().positive(),
}).refine(data => data.endTime >= data.startTime, {
  message: 'endTime must be greater than or equal to startTime',
});

export const ShotSubjectZodSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(['character', 'product', 'prop']),
  roleInShot: z.string().default('subject'),
  focalPriority: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
});

export const AdShotZodSchema = z.object({
  shotId: z.string().regex(StableEntityIdRegex.shot, 'Shot ID must follow format shot_*'),
  sequence: z.number().int().positive(),
  purpose: z.string().default(''),
  narrativeRole: z.string().default(''),
  timing: ShotTimingZodSchema,
  subjects: z.array(ShotSubjectZodSchema).default([]),
  action: z.record(z.any()).default({}),
  environment: z.object({
    locationId: z.string(),
    environmentState: z.string().optional(),
  }),
  camera: z.record(z.any()).default({}),
  lighting: z.record(z.any()).default({}),
  visualDirection: z.record(z.any()).default({}),
  audio: z.record(z.any()).default({}),
  transitions: z.record(z.any()).default({}),
  referencedAssetIds: z.array(z.string()).default([]),
  continuity: z.record(z.any()).default({}),
  constraints: z.record(z.any()).default({}),
  qaExpectations: z.record(z.any()).default({}),
});

export const AdConstraintZodSchema = z.object({
  id: z.string().min(1),
  category: z.string(),
  severity: z.enum(['must', 'should', 'must_not']),
  rule: z.string().min(1),
  targetEntityId: z.string().optional(),
  targetShotId: z.string().optional(),
});

export const GenerationRequirementsZodSchema = z.object({
  durationSeconds: z.number().positive(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5']),
  audioRequired: z.boolean().default(false),
  firstFrameRequired: z.boolean().default(false),
  lastFrameRequired: z.boolean().default(false),
  minimumReferenceCount: z.number().int().nonnegative().default(0),
  videoInputRequired: z.boolean().optional(),
  multiShotRequired: z.boolean().optional(),
  continuityPriority: z.enum(['strict', 'relaxed']).default('strict'),
  qualityPriority: z.enum(['draft', 'cinematic_pro', 'broadcast_master']).default('cinematic_pro'),
  preferredProvider: z.string().optional(),
  preferredModel: z.string().optional(),
});

export const DecisionProvenanceZodSchema = z.object({
  source: z.enum([
    'user',
    'user_provided',
    'user_selected',
    'user_requested',
    'ai_inferred',
    'ai_proposed',
    'ai_optimized',
    'system',
    'system_derived',
    'system_repaired',
    'model_constraint'
  ]),
  confidence: z.number().min(0).max(1).default(1.0),
  status: z.enum(['unconfirmed', 'confirmed', 'approved', 'user_confirmed']).default('unconfirmed'),
  locked: z.boolean().default(false),
  confirmedAt: z.string().optional(),
  confirmedBy: z.string().optional(),
  reason: z.string().optional(),
});

export const AdSpecZodSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  identity: z.object({
    adId: z.string().min(1),
    specVersion: z.number().int().positive(),
    revisionId: z.string(),
    parentVersionId: z.string().optional(),
    creativeState: z.string(),
    executionState: z.string(),
    title: z.string().min(1),
    workspaceId: z.string().min(1),
    projectId: z.string().optional(),
    createdBy: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  brief: AdBriefZodSchema,
  creative: z.record(z.any()).default({}),
  brand: z.record(z.any()).default({}),
  assets: AssetBibleZodSchema,
  characters: z.array(CharacterEntityZodSchema).default([]),
  products: z.array(ProductEntityZodSchema).default([]),
  locations: z.array(LocationEntityZodSchema).default([]),
  story: z.record(z.any()).default({}),
  shots: z.array(AdShotZodSchema).min(1, 'AdSpec must contain at least one shot'),
  continuity: z.record(z.any()).default({}),
  constraints: z.array(AdConstraintZodSchema).default([]),
  generationIntent: z.record(z.any()).default({}),
  generationRequirements: GenerationRequirementsZodSchema.optional(),
  decisionMetadata: z.record(DecisionProvenanceZodSchema).default({}),
  provenanceRegistry: z.record(DecisionProvenanceZodSchema).optional(),
  validationStatus: z.record(z.any()).optional(),
  metadata: z.record(z.any()).default({}),
});

// =============================================================================
// 24. PHASE 2: DISCOVERY ENGINE RUNTIME ZOD SCHEMAS
// =============================================================================

export const DiscoveryQuestionOptionZodSchema = z.object({
  label: z.string(),
  value: z.string(),
  description: z.string().optional(),
});

export const DiscoveryQuestionZodSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  question: z.string().min(1),
  reason: z.string().min(1),
  priority: z.enum(['BLOCKING', 'IMPORTANT', 'OPTIONAL']),
  inputType: z.enum([
    'text',
    'textarea',
    'single_choice',
    'multi_choice',
    'number',
    'url',
    'asset_selection',
    'boolean',
  ]),
  options: z.array(DiscoveryQuestionOptionZodSchema).optional(),
  required: z.boolean().default(true),
  allowCustom: z.boolean().default(true),
  dependsOn: z.string().optional(),
  status: z.enum(['PENDING', 'ANSWERED', 'SKIPPED']).default('PENDING'),
});

export const KnownFieldZodSchema = z.object({
  field: z.string().min(1),
  value: z.any(),
  source: z.enum(['USER', 'INFERRED', 'ASSET', 'SYSTEM']),
  confidence: z.number().min(0).max(1).optional(),
});

export const DiscoveryContradictionZodSchema = z.object({
  type: z.literal('CONTRADICTION'),
  fields: z.array(z.string()).min(1),
  explanation: z.string().min(1),
  resolutionQuestion: z.string().min(1),
});

export const DiscoveryAnswerZodSchema = z.object({
  questionId: z.string().min(1),
  rawAnswer: z.union([z.string(), z.array(z.string())]),
  parsedValue: z.any().optional(),
  answeredAt: z.string(),
});

export const DiscoveryStateZodSchema = z.object({
  projectId: z.string().min(1),
  workspaceId: z.string().min(1),
  status: z.enum(['DISCOVERY', 'WAITING_FOR_USER', 'READY_FOR_CREATIVE', 'BLOCKED']),
  brief: z.record(z.any()),
  knownFields: z.array(KnownFieldZodSchema).default([]),
  unknownFields: z.array(z.string()).default([]),
  ambiguities: z.array(z.string()).default([]),
  questions: z.array(DiscoveryQuestionZodSchema).default([]),
  answers: z.array(DiscoveryAnswerZodSchema).default([]),
  contradictions: z.array(DiscoveryContradictionZodSchema).default([]),
  completeness: z.number().min(0).max(1).default(0),
  blockingIssues: z.array(z.string()).default([]),
  isBriefConfirmed: z.boolean().default(false),
  confirmedAt: z.string().optional(),
  updatedAt: z.string(),
});

export const InitDiscoveryRequestZodSchema = z.object({
  initialPrompt: z.string().min(1, 'Initial prompt cannot be empty'),
  assetIds: z.array(z.string()).optional(),
});

export const AnswerDiscoveryRequestZodSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1),
    answer: z.union([z.string(), z.array(z.string())]),
  })).min(1, 'At least one answer is required'),
});

export const ConfirmBriefRequestZodSchema = z.object({
  briefOverrides: z.record(z.any()).optional(),
});

// =============================================================================
// 25. PHASE 3: CREATIVE CONCEPT ENGINE RUNTIME ZOD SCHEMAS
// =============================================================================

export const RequiredAssetItemZodSchema = z.object({
  role: z.string(),
  description: z.string(),
  exists: z.boolean(),
  assetId: z.string().optional(),
});

export const VisualDirectionConceptZodSchema = z.object({
  visualLanguage: z.string(),
  environment: z.string(),
  colorDirection: z.string(),
  energy: z.string(),
  realismLevel: z.string(),
});

export const CreativeConceptZodSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  workspaceId: z.string().min(1),
  briefVersion: z.number().int().positive(),
  name: z.string().min(1),
  oneLineIdea: z.string().min(1),
  strategicFoundation: z.string().min(1),
  creativeMechanism: z.string().min(1),
  hook: z.object({
    type: z.string().min(1),
    description: z.string().min(1),
  }),
  premise: z.string().min(1),
  emotionalArc: z.string().min(1),
  visualDirection: VisualDirectionConceptZodSchema,
  narrativeStructure: z.string().min(1),
  productRole: z.enum([
    'protagonist',
    'enabler',
    'solution',
    'transformation_trigger',
    'visual_centerpiece',
    'supporting_element',
    'proof_mechanism'
  ]),
  messageDelivery: z.enum([
    'visual_demonstration',
    'dialogue',
    'voiceover',
    'on_screen_text',
    'behavior',
    'transformation',
    'comparison',
    'narrative_consequence',
    'product_interaction'
  ]),
  differentiation: z.string().min(1),
  risks: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  estimatedComplexity: z.enum(['low', 'medium', 'high']).default('medium'),
  requiredAssets: z.array(RequiredAssetItemZodSchema).default([]),
  conceptStatus: z.enum(['DRAFT', 'READY_FOR_REVIEW', 'SELECTED', 'REJECTED', 'ARCHIVED']).default('READY_FOR_REVIEW'),
  provenance: z.object({
    generatedBy: z.enum(['ai_director', 'user']).default('ai_director'),
    modelUsed: z.string().optional(),
    generatedAt: z.string(),
    selectedAt: z.string().optional(),
    selectedBy: z.string().optional(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const GenerateConceptsRequestZodSchema = z.object({
  targetCount: z.number().int().min(1).max(10).optional().default(3),
  creativeNotes: z.string().optional(),
});

export const SelectConceptRequestZodSchema = z.object({
  userRationale: z.string().optional(),
});

export const RegenerateConceptsRequestZodSchema = z.object({
  targetCount: z.number().int().min(1).max(10).optional().default(3),
  creativeNotes: z.string().optional(),
  archivePrevious: z.boolean().optional().default(true),
});

// =============================================================================
// 26. PHASE 4: STORY ARCHITECT & DIRECTOR'S PLAN RUNTIME ZOD SCHEMAS
// =============================================================================

export const GenerateDirectorsPlanRequestZodSchema = z.object({
  targetDurationSeconds: z.number().positive().optional(),
  cinematographyStyle: z.string().optional(),
  pacingPreference: z.string().optional(),
});

export const ConfirmDirectorsPlanRequestZodSchema = z.object({
  userNotes: z.string().optional(),
});

// =============================================================================
// 27. PHASE 5: REVISION ENGINE RUNTIME ZOD SCHEMAS
// =============================================================================

export const ProposeRevisionRequestZodSchema = z.object({
  instruction: z.string().min(1, 'Revision instruction cannot be empty'),
  targetScope: z.string().optional(),
  targetEntityId: z.string().optional()
});

export const ApplyRevisionRequestZodSchema = z.object({
  instruction: z.string().min(1, 'Revision instruction cannot be empty'),
  confirmedOperations: z.array(z.any()).optional(),
  userRationale: z.string().optional()
});

// =============================================================================
// 28. PHASE 6: MODEL CAPABILITY & PROMPT COMPILER CONTRACTS
// =============================================================================

export * from './modelCapabilityContracts.js';

// =============================================================================
// 29. PHASE 7: PROVIDER ADAPTER CONTRACTS (GOOGLE, FAL, SEEDANCE)
// =============================================================================

export * from './providerAdapterContracts.js';

// =============================================================================
// 30. PHASE 8: DURABLE GENERATION QUEUE & EXECUTION ORCHESTRATOR CONTRACTS
// =============================================================================

export * from './executionQueueContracts.js';



