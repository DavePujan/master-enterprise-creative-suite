/**
 * Ad Director Domain Service.
 * Coordinates plan validation, targeted revisions, model capability checks,
 * prompt compilation, and persistence.
 */

import {
  validateDirectorPlan,
  applyPlanPatch,
  validateShotCapabilities,
  standardAdPromptCompiler,
  validateAdSpec,
  applyAdSpecPatch,
  createExecutionSnapshot as createExecutionSnapshotModel,
  adaptLegacyVideoRequestToAdSpec,
  applyDirectorOperation,
  analyzeChangeImpact,
  checkContinuity,
  runDirectorStage,
  DirectorStageName,
  ApplyOperationResult,
  RunStageResult
} from '../../../../../packages/ad-director/index.js';
import type {
  DirectorOperation,
  DirectorContext,
  AdSpecDiff,
  ChangeImpactAnalysis,
  ContinuityReport
} from '@shared-types/directorOperations.js';
import type {
  DirectorPlan,
  PlanPatch,
  PlanDelta,
  ValidationResult,
  CapabilityValidationResult,
  CompiledModelRequest,
  DirectorShot
} from '@shared-types/adDirector.js';
import type {
  AdSpec,
  AdSpecPatch,
  AdSpecDelta,
  ExecutionSnapshot
} from '@shared-types/adSpec.js';
import type {
  ValidateAdSpecResponse,
  LegacyVideoToAdSpecAdapterRequest
} from '@contracts/adSpecContracts.js';
import type { VideoEngineKey } from '@shared-types/videoGeneration.js';
import { VIDEO_CAPABILITIES } from '../videoGeneration/videoCapabilityRegistry.js';
import { videoAssetResolver } from '../videoGeneration/videoAssetResolver.js';
import { adDirectorRepository } from './adDirectorRepository.js';

export interface CreateAdProjectOptions {
  workspaceId: string;
  userId: string;
  title: string;
  initialPlan?: Partial<DirectorPlan>;
}

export class AdDirectorService {
  /**
   * Creates and initializes a new canonical Director Plan.
   */
  async createAdProject(options: CreateAdProjectOptions): Promise<DirectorPlan> {
    const { workspaceId, userId, title, initialPlan = {} } = options;
    const planId = initialPlan.id || `plan_${Date.now()}`;

    const defaultBrief = {
      brandRef: 'Brand Default',
      product: 'Commercial Product',
      offer: 'Standard Offer',
      cta: {
        visualText: 'Learn More',
        actionIntent: 'learn_more' as const
      },
      brandPersonality: {
        traits: ['Modern', 'Confident'],
        tone: 'Empowering',
        energyLevel: 'confident' as const
      },
      visualRules: {
        primaryColors: ['#000000', '#ffffff'],
        accentColors: ['#4f46e5'],
        lightingStyle: 'Cinematic High Key'
      },
      messagingRules: {
        keyClaims: ['Premium Quality Guaranteed']
      },
      thingsToAvoid: ['distortions', 'flickering', 'low resolution']
    };

    const defaultAudience = {
      targetAudience: {
        persona: 'Discerning consumer',
        painPoints: ['Inefficient alternatives']
      },
      campaignObjective: 'awareness' as const,
      desiredResponse: 'Desire to experience product benefits',
      emotionalGoal: {
        primaryEmotion: 'Inspiration',
        finalImpression: 'Trust & quality'
      }
    };

    const defaultCreativeDirection = {
      concept: 'Elevated Product Presentation',
      hook: {
        hookType: 'visual_surprise' as const,
        description: 'Dynamic entrance capturing focal interest immediately'
      },
      coreIdea: 'Uncompromising standard',
      storyPremise: 'Experiencing precision design in motion',
      emotionalArc: 'Curiosity to fascination to decisive action',
      visualMechanism: 'Fluid camera motion tracking physical form',
      narrativeStructure: 'minimal_hero' as const,
      noveltyRationale: 'Stripped-back luxury minimalism'
    };

    const defaultAssetWorld = {
      characters: [],
      products: [],
      locations: [],
      props: [],
      referenceMedia: []
    };

    const defaultShot: DirectorShot = {
      id: 'shot_01',
      sequence: 1,
      timing: {
        startTime: 0,
        endTime: 6,
        duration: 6
      },
      purpose: 'Establish product heroism and primary visual hook',
      creativeIntent: 'Convey premium craftsmanship and immediate visual luxury',
      executionSpec: {
        action: 'Product rotates smoothly with light caressing its contours',
        choreography: 'Slow controlled spin revealing branding',
        startingState: 'Product centered in atmospheric lighting',
        endingState: 'Product facing forward heroically with glint on edge',
        subjects: [],
        environment: {
          locationId: ''
        },
        camera: {
          framing: 'close_up',
          lensCharacteristics: '50mm_natural',
          cameraMovement: 'slow_push_in',
          angle: 'eye_level',
          composition: 'Centrally framed golden ratio'
        },
        lighting: {
          keyLightDirection: 'Top-left diffuse 45 degrees',
          contrastRatio: 'medium',
          atmosphere: 'Clean, subtle haze'
        },
        colorAtmosphere: {
          palette: ['#0f172a', '#38bdf8', '#ffffff'],
          gradingStyle: 'High-end commercial cinema grade'
        },
        audio: {
          audioIntent: 'ambient',
          soundEffects: ['Subtle cinematic riser', 'Soft atmospheric whoosh']
        },
        transitions: {
          transitionIn: 'cut',
          transitionOut: 'cut'
        }
      },
      continuity: {
        dependencies: [],
        characterInvariants: [],
        productInvariants: ['Brand logo front-facing and unaltered'],
        spatialInvariants: []
      },
      visualReferences: [],
      intendedCapabilities: {
        minDurationSeconds: 4,
        maxDurationSeconds: 8,
        requiresNativeAudio: false
      },
      qaExpectations: {
        requiredSubjects: ['Product'],
        requiredActions: ['Controlled rotation'],
        forbiddenActions: ['Morphing', 'Distorted labels', 'Flickering'],
        requiredFraming: 'close_up',
        requiredCameraMovement: 'slow_push_in',
        productVisibility: 'prominent_front',
        characterIdentityRules: [],
        brandRules: ['Clean legible logo display']
      }
    };

    const plan: DirectorPlan = {
      id: planId,
      workspaceId,
      title,
      version: 1,
      status: 'draft',
      timing: {
        totalDuration: initialPlan.timing?.totalDuration ?? 6,
        shotCount: initialPlan.shots?.length ?? 1
      },
      aspectRatio: initialPlan.aspectRatio || '16:9',
      targetPlatform: initialPlan.targetPlatform || 'generic',
      language: initialPlan.language || 'en',
      brief: { ...defaultBrief, ...(initialPlan.brief || {}) },
      audience: { ...defaultAudience, ...(initialPlan.audience || {}) },
      creativeDirection: { ...defaultCreativeDirection, ...(initialPlan.creativeDirection || {}) },
      assetWorld: { ...defaultAssetWorld, ...(initialPlan.assetWorld || {}) },
      shots: initialPlan.shots && initialPlan.shots.length > 0 ? initialPlan.shots : [defaultShot],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validate structural invariants
    const validation = validateDirectorPlan(plan);
    if (!validation.valid) {
      const msgs = validation.errors.map(e => `[${e.code}] ${e.message}`).join(', ');
      throw new Error(`Invalid Director Plan initialization: ${msgs}`);
    }

    await adDirectorRepository.createPlan({
      workspaceId,
      userId,
      plan
    });

    return plan;
  }

  /**
   * Retrieves current plan.
   */
  async getPlan(planId: string, workspaceId: string): Promise<DirectorPlan | null> {
    return adDirectorRepository.getPlan(planId, workspaceId);
  }

  /**
   * Retrieves specific version of a plan.
   */
  async getPlanVersion(planId: string, versionNumber: number, workspaceId: string) {
    return adDirectorRepository.getPlanVersion(planId, versionNumber, workspaceId);
  }

  /**
   * Runs deterministic structural validation.
   */
  validatePlan(plan: DirectorPlan): ValidationResult {
    return validateDirectorPlan(plan);
  }

  /**
   * Applies structured patch revision, creating a new immutable version snapshot.
   */
  async revisePlan(params: {
    planId: string;
    workspaceId: string;
    userId: string;
    patch: PlanPatch;
  }): Promise<{ updatedPlan: DirectorPlan; delta: PlanDelta }> {
    const { planId, workspaceId, userId, patch } = params;
    const currentPlan = await adDirectorRepository.getPlan(planId, workspaceId);
    if (!currentPlan) {
      throw new Error(`Director Plan "${planId}" not found in workspace "${workspaceId}"`);
    }

    const { newPlan, delta } = applyPlanPatch(currentPlan, patch);

    // Validate new plan invariants
    const validation = validateDirectorPlan(newPlan);
    if (!validation.valid) {
      const msgs = validation.errors.map(e => `[${e.code}] ${e.message}`).join(', ');
      throw new Error(`Patch produces invalid Director Plan structure: ${msgs}`);
    }

    await adDirectorRepository.savePlanVersion({
      planId,
      workspaceId,
      userId,
      plan: newPlan,
      delta
    });

    return { updatedPlan: newPlan, delta };
  }

  /**
   * Validates shot capabilities against target engine registry.
   */
  evaluateShotCapabilities(
    shot: DirectorShot,
    plan: DirectorPlan,
    engineKey: VideoEngineKey = 'veo-pro'
  ): CapabilityValidationResult {
    const capability = VIDEO_CAPABILITIES[engineKey];
    if (!capability) {
      return {
        compatible: false,
        blockers: [`Unknown or unsupported video engine: "${engineKey}"`],
        adaptationsRequired: []
      };
    }
    return validateShotCapabilities(shot, plan, capability);
  }

  /**
   * Compiles a single shot into an execution-ready model request.
   */
  async compileShot(params: {
    planId: string;
    shotId: string;
    workspaceId: string;
    engineKey?: VideoEngineKey;
    userPromptOverrides?: Record<string, string>;
  }): Promise<CompiledModelRequest> {
    const { planId, shotId, workspaceId, engineKey = 'veo-pro', userPromptOverrides } = params;
    const plan = await adDirectorRepository.getPlan(planId, workspaceId);
    if (!plan) {
      throw new Error(`Director Plan "${planId}" not found in workspace "${workspaceId}"`);
    }

    const shot = plan.shots.find(s => s.id === shotId);
    if (!shot) {
      throw new Error(`Shot "${shotId}" not found in Director Plan "${planId}"`);
    }

    const capability = VIDEO_CAPABILITIES[engineKey];
    if (!capability) {
      throw new Error(`Engine "${engineKey}" is not registered in video capability registry`);
    }

    const check = validateShotCapabilities(shot, plan, capability);
    if (!check.compatible) {
      throw new Error(
        `Shot "${shotId}" is incompatible with engine "${engineKey}": ${check.blockers.join('; ')}`
      );
    }

    return standardAdPromptCompiler.compile(plan, shot, capability, {
      workspaceId,
      engineKey,
      userPromptOverrides,
      assetUrlResolver: async (assetId: string) => {
        const resolved = await videoAssetResolver.resolve(assetId, workspaceId);
        return resolved?.url || null;
      }
    });
  }

  /**
   * Approves a plan version.
   */
  async approvePlanVersion(planId: string, versionNumber: number, workspaceId: string): Promise<boolean> {
    return adDirectorRepository.approvePlanVersion(planId, versionNumber, workspaceId);
  }

  // ===========================================================================
  // AdSpec v1 Canonical Services
  // ===========================================================================

  async createAdSpec(options: {
    workspaceId: string;
    userId: string;
    title: string;
    initialSpec?: Partial<AdSpec>;
  }): Promise<AdSpec> {
    const { workspaceId, userId, title, initialSpec = {} } = options;
    const adId = initialSpec.identity?.adId || `ad_${Date.now()}`;
    const now = new Date().toISOString();

    const adSpec: AdSpec = {
      schemaVersion: '1.0.0',
      identity: {
        adId,
        specVersion: 1,
        revisionId: 'rev_init',
        creativeState: 'director_plan_draft',
        executionState: 'idle',
        title: title.trim(),
        workspaceId,
        createdAt: now,
        updatedAt: now,
        ...(initialSpec.identity || {})
      },
      brief: {
        brandRef: 'Brand Reference',
        product: 'Commercial Product',
        objective: 'awareness',
        targetAudience: { persona: 'Discerning consumer', painPoints: ['Inefficient alternatives'] },
        platform: 'generic',
        desiredDurationSeconds: 6,
        aspectRatio: '16:9',
        language: 'en',
        cta: { visualText: 'Learn More', actionIntent: 'learn_more' },
        keyMessage: 'Premium Craftsmanship Guaranteed',
        desiredResponse: 'Desire to experience product benefits',
        tone: 'Empowering and confident',
        emotionalGoal: { primaryEmotion: 'Inspiration', finalImpression: 'Trust' },
        mustInclude: [],
        mustAvoid: ['distortions', 'flickering', 'low resolution'],
        referencesAndInspiration: [],
        userConstraints: [],
        ...(initialSpec.brief || {})
      },
      decisionMetadata: {
        'brief.desiredDurationSeconds': { source: 'user_provided', confidence: 1.0, status: 'confirmed', locked: true },
        'brief.objective': { source: 'user_provided', confidence: 1.0, status: 'confirmed', locked: true },
        'brief.cta': { source: 'user_provided', confidence: 1.0, status: 'confirmed', locked: true },
        'brief.keyMessage': { source: 'user_provided', confidence: 1.0, status: 'confirmed', locked: true },
        'brief.tone': { source: 'user_provided', confidence: 1.0, status: 'confirmed', locked: true },
        ...(initialSpec.decisionMetadata || {})
      },
      creative: {
        concepts: [{
          conceptId: 'concept_hero_01',
          name: 'Hero Minimalist',
          oneLinePremise: 'Pristine product craftsmanship in motion',
          coreIdea: 'Uncompromising standard',
          hook: { hookType: 'visual_surprise', description: 'Silhouette emerges with razor rim light' },
          narrativeMechanism: 'Visual reverence',
          visualMechanism: 'Fluid macro camera tracking',
          emotionalArc: 'Awe to decisive appreciation',
          brandRole: 'Elevated hero',
          intendedAudienceEffect: 'Immediate premium perception',
          noveltyRationale: 'Minimalist restraint',
          complexityEstimate: 'low'
        }],
        selectedConceptId: 'concept_hero_01',
        selectionProvenance: { selectedBy: 'user', selectedAt: now },
        ...(initialSpec.creative || {})
      },
      brand: {
        adSpecificOverrides: {},
        priorityHierarchy: ['brand_restriction', 'campaign_rule', 'creative_direction', 'shot_preference'],
        ...(initialSpec.brand || {})
      },
      assets: {
        assets: initialSpec.assets?.assets || []
      },
      characters: initialSpec.characters || [],
      products: initialSpec.products || [{
        id: 'prod_hero_01',
        name: 'Hero Commercial Product',
        referenceAssetIds: [],
        visualDescription: 'Precision crafted product',
        shapeForm: 'Geometric product form',
        materials: ['Titanium', 'Glass'],
        colorPalette: ['#000000', '#FFFFFF'],
        packaging: { containerType: 'Custom Display', materials: ['Paperboard'], finish: 'matte' },
        branding: { logoPlacement: 'Centered', labelDetails: 'Brand Signature' },
        labelLogoConstraints: ['Logo must remain front-facing and legible'],
        orientationConstraints: ['Upright orientation'],
        allowedTransformations: ['Controlled rotation'],
        forbiddenTransformations: ['Morphing', 'Distortions'],
        continuityRequirements: ['Logo sharpness maintained']
      }],
      locations: initialSpec.locations || [{
        id: 'loc_studio_01',
        name: 'Cinematic Studio Space',
        description: 'Atmospheric minimal studio',
        referenceAssetIds: [],
        architecture: 'Minimalist studio cyclorama',
        spatialCharacteristics: { indoor: true, dimensions: 'medium', depthOfSpace: 'dramatic falloff' },
        lightingCharacteristics: { timeOfDay: 'studio', mood: 'Dramatic rim lighting' },
        palette: ['#0F172A', '#38BDF8'],
        atmosphere: 'Pristine dust-free air',
        continuityConstraints: ['Consistent key light angle']
      }],
      story: initialSpec.story || {
        structureType: 'minimal_hero',
        logline: 'An elevated journey through design and precision',
        beats: [{
          beatId: 'beat_01',
          beatType: 'opening_hook',
          title: 'Hero Reveal',
          narrativeGoal: 'Establish premium visual presence',
          assignedShotIds: ['shot_01']
        }]
      },
      shots: initialSpec.shots && initialSpec.shots.length > 0 ? initialSpec.shots : [{
        shotId: 'shot_01',
        sequence: 1,
        purpose: 'Hero reveal and product statement',
        narrativeRole: 'Hook and message delivery',
        timing: { startTime: 0, endTime: 6, duration: 6 },
        subjects: [{ entityId: 'prod_hero_01', entityType: 'product', roleInShot: 'Centerpiece', focalPriority: 1 }],
        action: {
          startingState: 'Product centered in atmospheric lighting',
          action: 'Product rotates smoothly with light caressing its contours',
          choreography: 'Slow axial turn revealing branding',
          endingState: 'Product facing forward heroically'
        },
        environment: { locationId: 'loc_studio_01' },
        camera: {
          shotSize: 'Close Up',
          framing: 'close_up',
          angle: 'eye_level',
          lensCharacteristics: '50mm_natural',
          cameraPosition: 'Centered',
          cameraMovement: 'slow_push_in',
          composition: 'Center-weighted golden ratio',
          depthIntent: 'Shallow commercial depth of field'
        },
        lighting: {
          source: 'Rim backlight and soft key',
          direction: 'Top-left 45 degrees',
          quality: 'soft_diffuse',
          intensity: 'balanced',
          contrast: 'high',
          colorTemperature: '5600K',
          atmosphere: 'Subtle clean haze'
        },
        visualDirection: {
          visualIntent: 'Photorealistic commercial render',
          realismLevel: 'photorealistic',
          colorPalette: ['#0F172A', '#FFFFFF'],
          colorGrading: 'Commercial high-contrast luxury',
          motionPacing: 'fluid'
        },
        audio: {
          soundEffects: ['Subtle cinematic riser'],
          audioPriority: 'silent'
        },
        transitions: { incoming: 'cut', outgoing: 'cut' },
        referencedAssetIds: [],
        continuity: { inheritedStates: [], producedStates: [{ entityId: 'prod_hero_01', stateDescription: 'Front-facing' }] },
        constraints: { mustHappen: ['Show logo clearly'], mustNotHappen: ['Artifacts', 'Morphing'] },
        qaExpectations: {
          requiredSubjects: ['Hero Commercial Product'],
          requiredActions: ['Slow axial turn'],
          forbiddenActions: ['Morphing', 'Distorted labels'],
          requiredFraming: 'close_up',
          requiredCameraMovement: 'slow_push_in',
          productVisibility: 'prominent_front',
          characterIdentityRules: [],
          brandRules: ['Clean legible logo']
        }
      }],
      continuity: initialSpec.continuity || { links: [] },
      constraints: initialSpec.constraints || [],
      generationIntent: initialSpec.generationIntent || {
        desiredDurationSeconds: 6,
        aspectRatio: '16:9',
        qualityIntent: 'cinematic_pro',
        audioRequired: false,
        continuityPriority: 'strict',
        realism: 'photorealistic',
        generationStrategy: 'shot_by_shot',
        modelRequirements: {
          requiresFirstFrame: false,
          requiresLastFrame: false,
          minimumReferenceCount: 0,
          requiresNativeAudio: false
        }
      },
      metadata: {
        authorId: userId,
        originatingGem: 'video_generation_gem',
        customNotes: 'Initialized via AdDirectorService'
      }
    };

    const val = validateAdSpec(adSpec);
    if (!val.valid) {
      const msgs = val.errors.map(e => `[${e.code}] ${e.message}`).join(', ');
      throw new Error(`Invalid AdSpec initialization: ${msgs}`);
    }

    await adDirectorRepository.createAdSpec({
      workspaceId,
      userId,
      adSpec
    });

    return adSpec;
  }

  async getAdSpec(adId: string, workspaceId: string): Promise<AdSpec | null> {
    return adDirectorRepository.getAdSpec(adId, workspaceId);
  }

  async getAdSpecVersion(adId: string, specVersion: number, workspaceId: string) {
    return adDirectorRepository.getAdSpecVersion(adId, specVersion, workspaceId);
  }

  validateAdSpec(adSpec: AdSpec): ValidateAdSpecResponse {
    return validateAdSpec(adSpec);
  }

  async reviseAdSpec(params: {
    adId: string;
    workspaceId: string;
    userId: string;
    patch: AdSpecPatch;
  }): Promise<{ updatedAdSpec: AdSpec; delta: AdSpecDelta }> {
    const { adId, workspaceId, userId, patch } = params;
    const currentSpec = await adDirectorRepository.getAdSpec(adId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec "${adId}" not found in workspace "${workspaceId}"`);
    }

    const { newSpec, delta } = applyAdSpecPatch(currentSpec, patch);

    const val = validateAdSpec(newSpec);
    if (!val.valid) {
      const msgs = val.errors.map(e => `[${e.code}] ${e.message}`).join(', ');
      throw new Error(`Patch produces invalid AdSpec structure: ${msgs}`);
    }

    await adDirectorRepository.saveAdSpecVersion({
      adId,
      workspaceId,
      userId,
      adSpec: newSpec,
      delta
    });

    return { updatedAdSpec: newSpec, delta };
  }

  async approveAdSpec(adId: string, specVersion: number, workspaceId: string): Promise<boolean> {
    const specRecord = await adDirectorRepository.getAdSpecVersion(adId, specVersion, workspaceId);
    if (!specRecord) return false;

    specRecord.adSpec.identity.creativeState = 'approved';
    await adDirectorRepository.saveAdSpecVersion({
      adId,
      workspaceId,
      userId: specRecord.adSpec.metadata.authorId,
      adSpec: specRecord.adSpec,
      isApproved: true
    });
    return true;
  }

  async createExecutionSnapshot(
    adId: string,
    specVersion: number,
    workspaceId: string,
    approvedBy: string
  ): Promise<ExecutionSnapshot> {
    const specRecord = await adDirectorRepository.getAdSpecVersion(adId, specVersion, workspaceId);
    if (!specRecord) {
      throw new Error(`Cannot snapshot nonexistent AdSpec "${adId}" version ${specVersion}`);
    }

    const snapshot = createExecutionSnapshotModel(specRecord.adSpec, approvedBy);
    await adDirectorRepository.saveExecutionSnapshot(snapshot, workspaceId);
    return snapshot;
  }

  adaptLegacyVideoRequest(
    legacy: LegacyVideoToAdSpecAdapterRequest,
    context: { workspaceId: string; userId: string; adId?: string; title?: string }
  ): AdSpec {
    return adaptLegacyVideoRequestToAdSpec(legacy, context);
  }

  async applyOperation(params: {
    adId: string;
    workspaceId: string;
    userId: string;
    operation: DirectorOperation;
  }): Promise<ApplyOperationResult> {
    const { adId, workspaceId, userId, operation } = params;
    const currentSpec = await adDirectorRepository.getAdSpec(adId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec "${adId}" not found in workspace "${workspaceId}"`);
    }

    const result = applyDirectorOperation(currentSpec, operation);

    await adDirectorRepository.saveAdSpecVersion({
      adId,
      workspaceId,
      userId,
      adSpec: result.updatedAdSpec,
      delta: {
        revisionId: operation.operationId,
        targetScope: operation.target.scope as any,
        targetEntityId: operation.target.entityId,
        modifiedPaths: result.diff.modifiedPaths,
        previousValues: result.diff.previousValues,
        newValues: result.diff.newValues,
        timestamp: new Date().toISOString()
      }
    });

    return result;
  }

  async analyzeImpact(params: {
    adId: string;
    workspaceId: string;
    operation: DirectorOperation;
  }): Promise<ChangeImpactAnalysis> {
    const { adId, workspaceId, operation } = params;
    const currentSpec = await adDirectorRepository.getAdSpec(adId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec "${adId}" not found in workspace "${workspaceId}"`);
    }
    return analyzeChangeImpact(currentSpec, operation);
  }

  async checkContinuity(params: {
    adId: string;
    workspaceId: string;
  }): Promise<ContinuityReport> {
    const { adId, workspaceId } = params;
    const currentSpec = await adDirectorRepository.getAdSpec(adId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec "${adId}" not found in workspace "${workspaceId}"`);
    }
    return checkContinuity(currentSpec);
  }

  async runStage(params: {
    adId: string;
    workspaceId: string;
    userId: string;
    stage: DirectorStageName;
    payload?: any;
    applyImmediately?: boolean;
  }): Promise<RunStageResult> {
    const { adId, workspaceId, userId, stage, payload, applyImmediately = true } = params;
    const currentSpec = await adDirectorRepository.getAdSpec(adId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec "${adId}" not found in workspace "${workspaceId}"`);
    }

    const context: DirectorContext = {
      adSpec: currentSpec,
      specVersion: currentSpec.identity.specVersion,
      userRequest: payload?.userMessage || payload?.userInstruction,
      workspaceId,
      userId,
      canonicalAssets: currentSpec.assets.assets.map(a => ({
        id: a.assetId,
        name: a.label,
        type: a.semanticRole,
        url: a.url
      })),
      brandGuidelines: currentSpec.brand.globalGuidelines,
      selectedConcept: currentSpec.creative.concepts.find(c => c.conceptId === currentSpec.creative.selectedConceptId)
    };

    const stageResult = runDirectorStage({
      stage,
      context,
      payload,
      applyImmediately
    });

    if (applyImmediately && stageResult.appliedOperations.length > 0) {
      await adDirectorRepository.saveAdSpecVersion({
        adId,
        workspaceId,
        userId,
        adSpec: stageResult.updatedAdSpec,
        delta: stageResult.diff ? {
          revisionId: stageResult.appliedOperations[0]?.operationId || `rev_${Date.now()}`,
          targetScope: 'root',
          modifiedPaths: stageResult.diff.modifiedPaths,
          previousValues: stageResult.diff.previousValues,
          newValues: stageResult.diff.newValues,
          timestamp: new Date().toISOString()
        } : undefined
      });
    }

    return stageResult;
  }
}

export const adDirectorService = new AdDirectorService();
