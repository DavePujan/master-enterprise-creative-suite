/**
 * Canonical AdSpec v1 Domain Types & Contracts for Writopedia Video Generation Gem.
 * Provider-neutral, structured representation of an advertisement used across
 * planning, prompt compilation, shot generation, visual QA, and patch revisions.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type { BrandGuidelines } from './brand.js';
import type {
  AdAspectRatio,
  AdTargetPlatform,
  CameraAngle,
  CameraFraming,
  CameraMovement,
  LensCharacteristics
} from './adDirector.js';

export type {
  AdAspectRatio,
  AdTargetPlatform,
  CameraAngle,
  CameraFraming,
  CameraMovement,
  LensCharacteristics
};

// =============================================================================
// 1. PROVENANCE & CONFIDENCE MODEL (FACT, INFERENCE, PROPOSAL)
// =============================================================================

export type ProvenanceKind = 'fact' | 'inference' | 'proposal';
export type DecisionStatus = 'unconfirmed' | 'confirmed' | 'approved' | 'user_confirmed';
export type ProvenanceSource =
  | 'user'
  | 'user_provided'
  | 'user_selected'
  | 'ai_inferred'
  | 'ai_proposed'
  | 'system'
  | 'system_derived';

export interface DecisionProvenance {
  source: ProvenanceSource;
  confidence: number; // Range 0.0 - 1.0
  status: DecisionStatus;
  locked: boolean; // True if user or policy has locked this sub-property/field
  confirmedAt?: string;
  confirmedBy?: string;
  reason?: string;
}

export interface DecisionRecord<T> {
  value: T;
  kind?: ProvenanceKind;
  status?: DecisionStatus;
  source: ProvenanceSource;
  confidence: number; // Range 0.0 - 1.0
  confirmed: boolean; // True if user has explicitly locked/confirmed this value
  confirmedAt?: string;
  confirmedBy?: string;
}

export type ProvenanceValue<T> = DecisionRecord<T>;

export function extractCleanValue<T>(field: T | ProvenanceValue<T>): T {
  if (field && typeof field === 'object' && 'value' in field) {
    return (field as ProvenanceValue<T>).value;
  }
  return field as T;
}

export function makeUserFact<T>(value: T, userId = 'user'): ProvenanceValue<T> {
  return {
    value,
    kind: 'fact',
    status: 'user_confirmed',
    source: 'user_provided',
    confidence: 1.0,
    confirmed: true,
    confirmedAt: new Date().toISOString(),
    confirmedBy: userId
  };
}

export function makeAiInference<T>(value: T, confidence = 0.85): ProvenanceValue<T> {
  return {
    value,
    kind: 'inference',
    status: 'unconfirmed',
    source: 'ai_inferred',
    confidence,
    confirmed: false
  };
}

export function makeAiProposal<T>(value: T, confidence = 0.75): ProvenanceValue<T> {
  return {
    value,
    kind: 'proposal',
    status: 'unconfirmed',
    source: 'ai_proposed',
    confidence,
    confirmed: false
  };
}

export function makeConfirmedValue<T>(value: T): ProvenanceValue<T> {
  return makeUserFact(value);
}

export function makeProposedValue<T>(value: T, confidence = 0.85): ProvenanceValue<T> {
  return makeAiProposal(value, confidence);
}

// =============================================================================
// 2. DIRECTOR STATE MACHINE (CREATIVE STATE vs EXECUTION STATE)
// =============================================================================

export type DirectorCreativeState =
  | 'discovery'
  | 'brief_ready'
  | 'concepts_ready'
  | 'concept_selected'
  | 'director_plan_draft'
  | 'review'
  | 'approved'
  | 'execution_snapshot';

export type DirectorExecutionState =
  | 'idle'
  | 'queued'
  | 'generating'
  | 'qa'
  | 'complete'
  | 'failed';

// =============================================================================
// 3. AD IDENTITY & METADATA
// =============================================================================

export interface AdSpecIdentity {
  adId: string; // e.g. "ad_lumina_launch_01"
  specVersion: number; // Strictly monotonic integer: 1, 2, 3...
  revisionId: string; // e.g. "rev_init", "rev_shot3_lighting"
  parentVersionId?: string; // e.g. "ad_lumina_launch_01_v1"
  creativeState: DirectorCreativeState;
  executionState: DirectorExecutionState;
  title: string;
  workspaceId: string;
  projectId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// 4. COMMERCIAL BRIEF (INTENT LAYER - CLEAN VALUES + DECISION REGISTRY)
// =============================================================================

export interface AdSpecBrief {
  brandRef: string;
  product: string;
  objective:
    | 'awareness'
    | 'consideration'
    | 'conversion'
    | 'brand_repositioning'
    | ProvenanceValue<'awareness' | 'consideration' | 'conversion' | 'brand_repositioning'>;
  targetAudience:
    | {
        persona: string;
        painPoints: string[];
        demographics?: string;
      }
    | ProvenanceValue<{
        persona: string;
        painPoints: string[];
        demographics?: string;
      }>;
  platform: AdTargetPlatform;
  placement?: string;
  desiredDurationSeconds: number | ProvenanceValue<number>;
  aspectRatio: AdAspectRatio;
  language: string;
  cta:
    | {
        visualText: string;
        spokenLine?: string;
        actionIntent: 'click_link' | 'buy_now' | 'sign_up' | 'download' | 'learn_more';
      }
    | ProvenanceValue<{
        visualText: string;
        spokenLine?: string;
        actionIntent: 'click_link' | 'buy_now' | 'sign_up' | 'download' | 'learn_more';
      }>;
  offer?: string;
  keyMessage: string | ProvenanceValue<string>;
  desiredResponse: string;
  tone: string | ProvenanceValue<string>;
  emotionalGoal: {
    primaryEmotion: string;
    finalImpression: string;
  };
  mustInclude: string[];
  mustAvoid: string[];
  referencesAndInspiration: string[];
  userConstraints: string[];
}

// =============================================================================
// 5. CREATIVE CONCEPT MODEL (EXPLORATION & SELECTION)
// =============================================================================

export interface CreativeConceptItem {
  conceptId: string; // e.g. "concept_ritual", "concept_breakthrough"
  name: string;
  oneLinePremise: string;
  coreIdea: string;
  hook: {
    hookType: 'visual_surprise' | 'bold_question' | 'relatable_agitation' | 'kinetic_action' | 'intriguing_statement';
    description: string;
  };
  narrativeMechanism: string;
  visualMechanism: string;
  emotionalArc: string;
  brandRole: string;
  intendedAudienceEffect: string;
  noveltyRationale: string;
  complexityEstimate: 'low' | 'medium' | 'high';
  feasibilityNotes?: string;
}

export interface CreativeDirectionSpec {
  concepts: CreativeConceptItem[];
  selectedConceptId?: string;
  selectionProvenance?: {
    selectedBy: 'user' | 'ai_default';
    selectedAt: string;
  };
}

// =============================================================================
// 6. BRAND RULES (INTEGRATION & DETERMINISTIC PRIORITY)
// =============================================================================

export interface BrandRulesSpec {
  brandRefId?: string; // References canonical public.brand_guidelines
  globalGuidelines?: BrandGuidelines; // Hydrated from canonical Brand Intelligence
  adSpecificOverrides: {
    primaryColors?: string[];
    accentColors?: string[];
    typographyHints?: string[];
    lightingAesthetic?: string;
    forbiddenElements?: string[];
    mandatoryClaims?: string[];
  };
  priorityHierarchy: [
    'brand_restriction',
    'campaign_rule',
    'creative_direction',
    'shot_preference'
  ];
}

// =============================================================================
// 7. ASSET BIBLE (CANONICAL WRITOPEDIA ASSETS REUSE)
// =============================================================================

export type SemanticAssetRole =
  | 'product_hero'
  | 'product_in_use'
  | 'product_label'
  | 'product_reference'
  | 'character_face'
  | 'character_body'
  | 'character_sheet'
  | 'character_reference'
  | 'face_reference'
  | 'location_environment'
  | 'location_mood'
  | 'location_reference'
  | 'prop'
  | 'prop_reference'
  | 'brand_logo'
  | 'logo_reference'
  | 'style_reference'
  | 'lighting_reference'
  | 'first_frame'
  | 'last_frame'
  | 'general_reference';

export interface SemanticAssetItem {
  assetId: string; // Existing canonical public.assets.id
  semanticRole: SemanticAssetRole;
  targetEntityId?: string; // Associated character, product, or location ID
  label: string;
  url?: string;
  mimeType?: string;
  priority: 1 | 2 | 3; // 1 = mandatory focal reference
  usageConstraints: string[];
  provenance: ProvenanceSource;
}

export interface AssetBible {
  assets: SemanticAssetItem[];
}

// =============================================================================
// 8. CHARACTER BIBLE
// =============================================================================

export type CharacterIdentityLockStrength = 'strict' | 'normal' | 'flexible';
export type CharacterLockProperty = 'identity' | 'face' | 'hair' | 'wardrobe' | 'accessories';

export interface AdSpecCharacterEntity {
  id: string; // e.g. "char_sarah"
  name?: string;
  displayName: string;
  narrativeRole: 'protagonist' | 'antagonist' | 'expert' | 'customer' | 'narrator_voice' | 'supporting';
  referenceAssetIds: string[]; // Existing canonical asset IDs
  appearance: {
    gender?: string;
    apparentAge?: string;
    ethnicity?: string;
    hairColor?: string;
    hairStyle?: string;
    physique?: string;
    distinguishingFeatures?: string[];
  };
  wardrobe: {
    outfit: string;
    colors: string[];
    accessories?: string[];
  };
  behaviorPersonality: string;
  identityLockStrength?: CharacterIdentityLockStrength;
  locks?: CharacterLockProperty[]; // Granular sub-property locks
  continuityConstraints: string[];
  forbiddenChanges: string[];
}
export type AdCharacterEntity = AdSpecCharacterEntity;

// =============================================================================
// 9. PRODUCT BIBLE
// =============================================================================

export type ProductLockProperty = 'geometry' | 'logo' | 'packaging' | 'brandColors' | 'label' | 'material';

export interface AdSpecProductEntity {
  id: string; // e.g. "prod_lumina_serum"
  name: string;
  referenceAssetIds: string[]; // Existing canonical asset IDs
  visualDescription: string;
  shapeForm: string;
  materials: string[];
  colorPalette: string[];
  packaging: {
    containerType: string;
    materials: string[];
    finish: 'matte' | 'gloss' | 'frosted' | 'metallic' | 'transparent';
    closureType?: string;
  };
  branding: {
    logoPlacement: string;
    labelDetails: string;
  };
  labelLogoConstraints: string[];
  orientationConstraints: string[];
  allowedTransformations: string[];
  forbiddenTransformations: string[];
  continuityRequirements: string[];
  locks?: ProductLockProperty[]; // Granular sub-property locks
}
export type AdProductEntity = AdSpecProductEntity;

// =============================================================================
// 10. LOCATION BIBLE
// =============================================================================

export type LocationLockProperty = 'architecture' | 'spatial' | 'lighting' | 'atmosphere';

export interface AdSpecLocationEntity {
  id: string; // e.g. "loc_minimal_kitchen"
  name: string;
  description: string;
  referenceAssetIds: string[]; // Existing canonical asset IDs
  architecture: string;
  spatialCharacteristics: {
    indoor: boolean;
    dimensions: 'compact' | 'medium' | 'spacious' | 'open_world';
    depthOfSpace: string;
  };
  lightingCharacteristics: {
    timeOfDay: 'dawn' | 'morning' | 'midday' | 'golden_hour' | 'dusk' | 'night' | 'studio';
    mood: string;
  };
  weather?: string;
  palette: string[];
  atmosphere: string;
  continuityConstraints: string[];
  locks?: LocationLockProperty[]; // Granular sub-property locks
}

// =============================================================================
// 11. STORY MODEL (NARRATIVE BEATS)
// =============================================================================

export type StoryBeatType =
  | 'opening_hook'
  | 'setup'
  | 'development'
  | 'escalation'
  | 'climax_payoff'
  | 'product_moment'
  | 'cta_ending';

export interface StoryBeat {
  beatId: string;
  beatType: StoryBeatType;
  title: string;
  narrativeGoal: string;
  assignedShotIds: string[];
}

export interface StoryModel {
  structureType: 'minimal_hero' | 'problem_solution' | 'narrative_arc' | 'social_hook_proof_cta' | 'commercial_standard';
  logline: string;
  beats: StoryBeat[];
}

// =============================================================================
// =============================================================================
// 12. SHOT SPECIFICATION (DISCRETE PRIMARY EXECUTION UNIT)
// =============================================================================

export type ShotTransitionType =
  | 'cut'
  | 'dissolve'
  | 'match_cut'
  | 'whip_pan'
  | 'fade_to_black'
  | 'light_leak'
  | 'none';

export interface ShotSubjectItem {
  entityId: string;
  entityType: 'character' | 'product' | 'prop';
  roleInShot: string;
  focalPriority: 1 | 2 | 3;
}

export interface TemporalActionBeat {
  startTime: number;
  endTime: number;
  relativeStart?: number;
  relativeEnd?: number;
  description: string;
  action?: string;
  bodyMechanics?: string;
  emotionalChange?: string;
  interaction?: string;
}

export interface ShotActionState {
  startingState: string;
  action: string;
  choreography: string;
  beats?: TemporalActionBeat[];
  endingState: string;
  emotionalState?: string;
}

export interface AdSpecShotCameraSpec {
  shotSize: string;
  framing: CameraFraming;
  angle: CameraAngle;
  lensCharacteristics: LensCharacteristics;
  cameraPosition: string;
  cameraMovement: CameraMovement;
  composition: string;
  depthIntent: string;
}
export type AdShotCameraSpec = AdSpecShotCameraSpec;

export interface ShotLightingSpec {
  source: string;
  direction: string;
  quality: 'hard' | 'soft_diffuse' | 'volumetric' | 'specular';
  intensity: 'subtle' | 'balanced' | 'high_key' | 'dramatic_low_key';
  contrast: 'high' | 'medium' | 'soft_diffuse';
  colorTemperature: string;
  atmosphere: string;
}

export interface ShotVisualDirection {
  visualIntent: string;
  realismLevel: 'photorealistic' | 'hyper_real' | 'stylized_commercial';
  colorPalette: string[];
  colorGrading: string;
  motionPacing: 'calm' | 'fluid' | 'accelerating' | 'kinetic';
}

export interface AdSpecShotAudioSpec {
  dialogue?: string;
  voiceover?: string;
  speaker?: string;
  language?: string;
  deliveryIntent?: string;
  soundEffects: string[];
  ambience?: string;
  ambient?: string;
  music?: string;
  timingCues?: string[];
  audioPriority: 'high' | 'medium' | 'silent';
}
export type AdShotAudioSpec = AdSpecShotAudioSpec;

export interface AdSpecShotContinuityModel {
  inheritedStates: Array<{
    sourceShotId: string;
    entityId: string;
    aspect: 'wardrobe' | 'expression' | 'lighting' | 'action_continuation' | 'product_state' | 'camera_momentum';
    requirement: string;
  }>;
  producedStates: Array<{
    entityId: string;
    stateDescription: string;
  }>;
}
export type AdShotContinuityModel = AdSpecShotContinuityModel;

export interface ShotConstraintsModel {
  mustHappen: string[];
  mustNotHappen: string[];
  shouldHappen?: string[];
}

export interface AdSpecShotQaExpectations {
  requiredSubjects: string[];
  requiredActions: string[];
  forbiddenActions: string[];
  requiredFraming: CameraFraming;
  requiredCameraMovement: CameraMovement;
  productVisibility: 'prominent_front' | 'in_use' | 'background' | 'none';
  characterIdentityRules: string[];
  brandRules: string[];
}
export type AdShotQaExpectations = AdSpecShotQaExpectations;

export interface AdShot {
  shotId: string; // e.g. "shot_01"
  sequence: number; // 1-indexed
  purpose: string;
  narrativeRole: string;
  durationSeconds?: number;
  timing: {
    startTime: number; // seconds
    endTime: number; // seconds
    duration: number; // seconds
  };
  subjects: ShotSubjectItem[];
  action: ShotActionState;
  environment: {
    locationId: string;
    environmentState?: string;
  };
  camera: AdSpecShotCameraSpec;
  lighting: ShotLightingSpec;
  visualDirection: ShotVisualDirection;
  audio: AdSpecShotAudioSpec;
  transitions: {
    incoming: ShotTransitionType;
    outgoing: ShotTransitionType;
  };
  referencedAssetIds: string[];
  continuity: AdSpecShotContinuityModel;
  constraints: ShotConstraintsModel;
  qaExpectations: AdSpecShotQaExpectations;
}

export type AdSpecShot = AdShot;

// =============================================================================
// 13. CONTINUITY GRAPH
// =============================================================================

export interface ContinuityLink {
  fromShotId: string;
  toShotId: string;
  entityId: string;
  aspect: string;
  invariant: string;
}

export interface ContinuityGraph {
  links: ContinuityLink[];
}

// =============================================================================
// 14. FIRST-CLASS CONSTRAINTS SYSTEM
// =============================================================================

export type ConstraintSeverity = 'must' | 'should' | 'must_not';
export type ConstraintCategory =
  | 'brand'
  | 'character'
  | 'product'
  | 'story'
  | 'visual'
  | 'camera'
  | 'audio'
  | 'safety'
  | 'continuity'
  | 'platform';

export interface AdConstraint {
  id: string;
  category: ConstraintCategory;
  severity: ConstraintSeverity;
  rule: string;
  targetEntityId?: string;
  targetShotId?: string;
}

// =============================================================================
// 15. GENERATION REQUIREMENTS & INTENT (PROVIDER-NEUTRAL CREATIVE TRUTH)
// =============================================================================

export interface GenerationRequirements {
  durationSeconds: number;
  aspectRatio: AdAspectRatio;
  audioRequired: boolean;
  firstFrameRequired: boolean;
  lastFrameRequired: boolean;
  minimumReferenceCount: number;
  videoInputRequired?: boolean;
  multiShotRequired?: boolean;
  continuityPriority: 'strict' | 'relaxed';
  qualityPriority: 'draft' | 'cinematic_pro' | 'broadcast_master';
  preferredProvider?: string; // Execution request/preference (NOT canonical creative truth)
  preferredModel?: string; // Execution request/preference (NOT canonical creative truth)
}

export interface GenerationIntent {
  desiredDurationSeconds: number;
  aspectRatio: AdAspectRatio;
  qualityIntent: 'draft' | 'cinematic_pro' | 'broadcast_master';
  audioRequired: boolean;
  continuityPriority: 'strict' | 'relaxed';
  realism: 'photorealistic' | 'stylized';
  generationStrategy: 'shot_by_shot' | 'multi_shot_stitched';
  modelRequirements: {
    requiresFirstFrame: boolean;
    requiresLastFrame: boolean;
    minimumReferenceCount: number;
    requiresNativeAudio: boolean;
  };
}

// =============================================================================
// 16. VALIDATION FRESHNESS & METRICS
// =============================================================================

export interface AdSpecValidationIssue {
  code: string;
  message: string;
  path: string;
  severity: 'error' | 'warning';
  targetEntityId?: string;
  targetShotId?: string;
}

export interface AdSpecValidationStatus {
  evaluatedAtVersion: number;
  evaluatedAtRevisionId: string;
  evaluatedAtHash?: string;
  isAuthoritative: boolean; // False if AdSpec has been mutated since this evaluation
  valid: boolean;
  errors: AdSpecValidationIssue[];
  warnings: AdSpecValidationIssue[];
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

// =============================================================================
// 17. CANONICAL ROOT ADSPEC V1
// =============================================================================

export interface AdSpec {
  schemaVersion: '1.0.0';
  identity: AdSpecIdentity;
  brief: AdSpecBrief;
  creative: CreativeDirectionSpec;
  brand: BrandRulesSpec;
  assets: AssetBible;
  characters: AdSpecCharacterEntity[];
  products: AdSpecProductEntity[];
  locations: AdSpecLocationEntity[];
  story: StoryModel;
  shots: AdShot[];
  continuity: ContinuityGraph;
  constraints: AdConstraint[];
  generationIntent: GenerationIntent;
  generationRequirements?: GenerationRequirements;
  decisionMetadata?: Record<string, DecisionProvenance>;
  provenanceRegistry?: Record<string, DecisionProvenance>;
  validationStatus?: AdSpecValidationStatus;
  metadata: {
    authorId: string;
    originatingGem: 'video_generation_gem';
    customNotes?: string;
  };
}

// =============================================================================
// 18. EXECUTION SNAPSHOT (FROZEN STATE FOR AI GENERATION JOBS)
// =============================================================================

export interface ExecutionSnapshot {
  snapshotId: string; // e.g. "snap_ad_lumina_01_v2"
  adId: string;
  specVersion: number;
  specHash?: string;
  approvedAt: string;
  approvedBy: string;
  selectedProvider?: string; // Authoritative chosen provider e.g. "google" | "fal"
  selectedModel?: string; // Authoritative chosen model e.g. "veo-2.0" | "kling-v1.6"
  resolvedRequirements?: GenerationRequirements;
  resolvedAssetReferences?: Array<{
    assetId: string;
    semanticRole: string;
    url?: string;
  }>;
  frozenAdSpec: AdSpec; // Fully immutable JSON snapshot
  jobIds: string[]; // Linked public.ai_generation_jobs IDs
  requesterId?: string;
  creditCostEstimate?: number;
}

// =============================================================================
// 18. PATCH & REVISION FOUNDATION
// =============================================================================

export type AdSpecPatchScope =
  | 'brief'
  | 'creative'
  | 'brand'
  | 'asset'
  | 'character'
  | 'product'
  | 'location'
  | 'story'
  | 'shot'
  | 'constraint'
  | 'generationIntent';

export interface AdSpecPatch {
  revisionId: string;
  targetScope: AdSpecPatchScope;
  targetEntityId?: string; // e.g. "shot_03" or "char_sarah"
  reason: string; // User instruction or AI revision note
  changes: Record<string, any>; // Dot-path key-value modifications
  actor: {
    id: string;
    role: 'user' | 'ai_director' | 'qa_repair';
  };
  timestamp: string;
}

export interface AdSpecDelta {
  revisionId: string;
  targetScope: AdSpecPatchScope;
  targetEntityId?: string;
  modifiedPaths: string[];
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  timestamp: string;
}
