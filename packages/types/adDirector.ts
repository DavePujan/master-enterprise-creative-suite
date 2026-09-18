/**
 * Canonical AI Advertising Director Domain Types & Ad DSL.
 * Provider-neutral, structured representation of an advertisement used across
 * planning, prompt compilation, shot generation, visual QA, and patch revisions.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

export type AdProjectStatus = 'draft' | 'in_review' | 'approved' | 'executing' | 'archived';

export type AdAspectRatio = '16:9' | '9:16' | '1:1' | '21:9' | '4:3';

export type AdTargetPlatform =
  | 'instagram_reels'
  | 'tiktok'
  | 'youtube_shorts'
  | 'youtube_preroll'
  | 'meta_feed'
  | 'tv_broadcast'
  | 'generic';

export type CampaignObjective =
  | 'awareness'
  | 'consideration'
  | 'conversion'
  | 'brand_repositioning';

export type NarrativeStructure =
  | 'hook_demo_proof_cta'
  | 'problem_agitation_solution'
  | 'before_after'
  | 'hero_cinematic'
  | 'testimonial_narrative'
  | 'social_native'
  | 'minimal_hero';

// =============================================================================
// 1. BRAND & COMMERCIAL BRIEF
// =============================================================================

export interface AdBrief {
  brandRef: string;
  product: string;
  offer: string;
  cta: {
    visualText: string;
    spokenLine?: string;
    actionIntent: 'click_link' | 'buy_now' | 'sign_up' | 'download' | 'learn_more';
  };
  brandPersonality: {
    traits: string[];
    tone: string;
    energyLevel: 'calm' | 'confident' | 'high_energy' | 'dramatic' | 'playful';
  };
  visualRules: {
    primaryColors: string[];
    accentColors: string[];
    lightingStyle: string;
    logoPositioning?: 'top_right' | 'bottom_right' | 'center_card' | 'watermark';
  };
  messagingRules: {
    keyClaims: string[];
    mandatoryDisclaimers?: string[];
  };
  thingsToAvoid: string[];
}

// =============================================================================
// 2. AUDIENCE & EMOTIONAL OBJECTIVE
// =============================================================================

export interface AudienceObjective {
  targetAudience: {
    persona: string;
    demographics?: string;
    painPoints: string[];
  };
  campaignObjective: CampaignObjective;
  desiredResponse: string;
  emotionalGoal: {
    primaryEmotion: string;
    secondaryEmotion?: string;
    finalImpression: string;
  };
}

// =============================================================================
// 3. CREATIVE DIRECTION
// =============================================================================

export interface CreativeDirection {
  concept: string;
  hook: {
    hookType: 'visual_surprise' | 'bold_question' | 'relatable_agitation' | 'kinetic_action' | 'intriguing_statement';
    description: string;
  };
  coreIdea: string;
  storyPremise: string;
  emotionalArc: string;
  visualMechanism: string;
  narrativeStructure: NarrativeStructure;
  noveltyRationale: string;
}

// =============================================================================
// 4. ASSET WORLD (ENTITIES & REFERENCES)
// =============================================================================

export type SemanticReferenceRole =
  | 'product_hero'
  | 'product_in_use'
  | 'product_label'
  | 'character_face'
  | 'character_body'
  | 'character_sheet'
  | 'location_environment'
  | 'location_mood'
  | 'prop'
  | 'brand_logo'
  | 'style_reference'
  | 'lighting_reference'
  | 'first_frame'
  | 'last_frame'
  | 'general_reference';

export interface SemanticAssetReference {
  assetId: string;
  role: SemanticReferenceRole;
  targetEntityId?: string;
  label: string;
  url?: string;
  mimeType?: string;
}

export interface CharacterEntity {
  id: string; // e.g. 'char_sarah'
  name: string;
  role: 'protagonist' | 'antagonist' | 'expert' | 'customer' | 'narrator_voice' | 'supporting';
  appearance: {
    gender?: string;
    apparentAge?: string;
    ethnicity?: string;
    hairColor?: string;
    hairStyle?: string;
    physique?: string;
    distinguishingFeatures?: string[];
  };
  identityDescription: string;
  wardrobe: {
    outfit: string;
    colors: string[];
    accessories?: string[];
  };
  behaviorPersonality: string;
  referenceAssetIds: string[];
  continuityConstraints: string[];
}

export interface ProductEntity {
  id: string; // e.g. 'prod_lumina_serum'
  productIdentity: string;
  appearance: string;
  packaging: {
    containerType: string;
    materials: string[];
    finish: 'matte' | 'gloss' | 'frosted' | 'metallic' | 'transparent';
    closureType?: string;
  };
  geometryForm: string;
  colors: string[];
  materials: string[];
  branding: {
    logoPlacement: string;
    labelDetails: string;
  };
  referenceAssets: string[];
  continuityConstraints: string[];
}

export interface LocationEntity {
  id: string; // e.g. 'loc_scandinavian_kitchen'
  environmentIdentity: string;
  visualDescription: string;
  spatialCharacteristics: {
    indoor: boolean;
    dimensions: 'compact' | 'medium' | 'spacious' | 'open_world';
    depthOfSpace: string;
  };
  lightingCharacteristics: {
    naturalSource?: string;
    artificialSource?: string;
    timeOfDay: 'dawn' | 'morning' | 'midday' | 'golden_hour' | 'dusk' | 'night' | 'studio';
    mood: string;
  };
  palette: string[];
  referenceAssets: string[];
  continuityConstraints: string[];
}

export interface PropEntity {
  id: string;
  name: string;
  description: string;
  significance?: string;
  referenceAssets?: string[];
}

export interface AssetWorld {
  characters: CharacterEntity[];
  products: ProductEntity[];
  locations: LocationEntity[];
  props: PropEntity[];
  referenceMedia: SemanticAssetReference[];
}

// =============================================================================
// 5. SHOT SPECIFICATION (DISCRETE EXECUTION UNITS)
// =============================================================================

export type CameraFraming =
  | 'extreme_close_up'
  | 'close_up'
  | 'medium_close_up'
  | 'medium_shot'
  | 'medium_wide'
  | 'wide_shot'
  | 'extreme_wide'
  | 'macro';

export type LensCharacteristics =
  | '16mm_ultra_wide'
  | '24mm_wide'
  | '35mm_cinematic'
  | '50mm_natural'
  | '85mm_portrait'
  | '100mm_macro'
  | 'anamorphic';

export type CameraMovement =
  | 'static'
  | 'slow_push_in'
  | 'dramatic_push_in'
  | 'pull_back_reveal'
  | 'tracking_forward'
  | 'tracking_lateral'
  | 'orbital_arc'
  | 'crane_up'
  | 'crane_down'
  | 'handheld_subtle'
  | 'whip_pan'
  | 'fpv_dynamic';

export type CameraAngle =
  | 'eye_level'
  | 'low_angle'
  | 'high_angle'
  | 'overhead_flatlay'
  | 'ground_level'
  | 'dutch_tilt';

export type ShotTransition =
  | 'cut'
  | 'dissolve'
  | 'match_cut'
  | 'whip_pan'
  | 'fade_to_black'
  | 'light_leak'
  | 'none';

export interface ShotSubjectRef {
  entityId: string;
  entityType: 'character' | 'product' | 'prop';
  roleInShot: string;
  focalPriority: 1 | 2 | 3;
}

export interface ShotCameraSpec {
  framing: CameraFraming;
  lensCharacteristics: LensCharacteristics;
  cameraMovement: CameraMovement;
  angle: CameraAngle;
  composition: string;
}

export interface ShotAudioSpec {
  audioIntent: 'dialogue' | 'voiceover' | 'ambient' | 'sfx' | 'music_accent' | 'silent';
  dialogue?: string;
  voiceover?: string;
  soundEffects: string[];
}

export interface ShotExecutionSpec {
  action: string;
  choreography: string;
  startingState: string;
  endingState: string;
  subjects: ShotSubjectRef[];
  environment: {
    locationId: string;
    specificZone?: string;
    timeOfDayOverride?: string;
  };
  camera: ShotCameraSpec;
  lighting: {
    keyLightDirection: string;
    contrastRatio: 'high' | 'medium' | 'soft_diffuse';
    atmosphere: string;
  };
  colorAtmosphere: {
    palette: string[];
    gradingStyle: string;
  };
  audio: ShotAudioSpec;
  transitions: {
    transitionIn: ShotTransition;
    transitionOut: ShotTransition;
  };
}

export interface ShotContinuityDependency {
  targetShotId: string;
  entityId: string;
  aspect: 'wardrobe' | 'expression' | 'lighting' | 'action_continuation' | 'product_state' | 'camera_momentum';
  requirement: string;
}

export interface ShotContinuityModel {
  dependencies: ShotContinuityDependency[];
  characterInvariants: string[];
  productInvariants: string[];
  spatialInvariants: string[];
}

export interface ShotIntendedCapabilities {
  preferredEngine?: string;
  requiresFirstFrame?: boolean;
  requiresLastFrame?: boolean;
  requiresNativeAudio?: boolean;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  maxReferenceImages?: number;
}

export interface ShotQaExpectations {
  requiredSubjects: string[];
  requiredActions: string[];
  forbiddenActions: string[];
  requiredFraming: CameraFraming;
  requiredCameraMovement: CameraMovement;
  productVisibility: 'prominent_front' | 'in_use' | 'background' | 'none';
  characterIdentityRules: string[];
  brandRules: string[];
  audioMatch?: string;
}

export interface DirectorShot {
  id: string; // e.g. 'shot_01'
  sequence: number; // 1-indexed
  timing: {
    startTime: number; // seconds
    endTime: number; // seconds
    duration: number; // seconds
  };
  purpose: string; // Narrative goal of this shot
  creativeIntent: string; // Emotional & dramatic intent
  executionSpec: ShotExecutionSpec;
  continuity: ShotContinuityModel;
  visualReferences: string[]; // Asset IDs attached to this shot
  intendedCapabilities: ShotIntendedCapabilities;
  qaExpectations: ShotQaExpectations;
}

// =============================================================================
// 6. ROOT DIRECTOR PLAN (AD DSL)
// =============================================================================

export interface DirectorPlan {
  id: string;
  workspaceId: string;
  title: string;
  version: number;
  parentVersionId?: string;
  status: AdProjectStatus;
  timing: {
    totalDuration: number; // seconds
    shotCount: number;
  };
  aspectRatio: AdAspectRatio;
  targetPlatform: AdTargetPlatform;
  language: string;
  brief: AdBrief;
  audience: AudienceObjective;
  creativeDirection: CreativeDirection;
  assetWorld: AssetWorld;
  shots: DirectorShot[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// 7. PATCH-BASED REVISION MODEL
// =============================================================================

export type PatchTargetScope =
  | 'plan'
  | 'brief'
  | 'audience'
  | 'creative'
  | 'shot'
  | 'character'
  | 'product'
  | 'location';

export interface PlanPatch {
  patchId: string;
  targetScope: PatchTargetScope;
  targetId?: string; // e.g. 'shot_02' or 'char_sarah'
  intent: string; // e.g. "Make shot 2 camera movement faster and more dynamic"
  changes: Record<string, any>; // Dot-path key-value replacements
  provenance: {
    source: 'user' | 'ai_director' | 'qa_repair';
    authorId: string;
    timestamp: string;
  };
}

export interface PlanDelta {
  patchId: string;
  targetScope: PatchTargetScope;
  targetId?: string;
  modifiedKeys: string[];
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  timestamp: string;
}

// =============================================================================
// 8. VALIDATION CONTRACTS
// =============================================================================

export type ValidationErrorSeverity = 'error' | 'warning';

export interface ValidationIssue {
  code: string;
  message: string;
  path: string;
  severity: ValidationErrorSeverity;
  targetShotId?: string;
  targetEntityId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  metrics: {
    shotCount: number;
    calculatedDuration: number;
    characterCount: number;
    productCount: number;
    locationCount: number;
    assetRefCount: number;
    dependencyCount: number;
  };
}

// =============================================================================
// 9. MODEL CAPABILITY VALIDATION & COMPILATION CONTRACTS
// =============================================================================

export interface CapabilityValidationResult {
  compatible: boolean;
  blockers: string[];
  adaptationsRequired: string[];
  recommendedEngineKey?: string;
}

export interface CompilationContext {
  workspaceId: string;
  assetUrlResolver?: (assetId: string) => Promise<string | null>;
  engineKey: string;
  userPromptOverrides?: Record<string, string>;
}

export interface CompiledReferenceAsset {
  assetId: string;
  role: SemanticReferenceRole;
  url: string;
  mimeType?: string;
}

export interface CompiledModelRequest {
  shotId: string;
  engineKey: string;
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  durationSeconds: number;
  referenceAssets: CompiledReferenceAsset[];
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  audioPrompt?: string;
  dialogueScript?: string;
  engineParameters: Record<string, any>;
  qaExpectationsSummary: {
    requiredSubjects: string[];
    forbiddenActions: string[];
    productVisibility: string;
  };
}
