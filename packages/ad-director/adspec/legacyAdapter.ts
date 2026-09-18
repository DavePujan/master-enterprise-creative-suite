/**
 * Legacy Video Request to AdSpec v1 Adapter.
 * Bridges existing prompt-first video generation requests (VideoGenerationRequest)
 * into canonical, structured AdSpec v1 representations without breaking legacy endpoints.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type {
  AdSpec,
  AdAspectRatio,
  SemanticAssetItem
} from '@shared-types/adSpec.js';
import type { LegacyVideoToAdSpecAdapterRequest } from '@contracts/adSpecContracts.js';

export function adaptLegacyVideoRequestToAdSpec(
  legacy: LegacyVideoToAdSpecAdapterRequest,
  context: {
    workspaceId: string;
    userId: string;
    adId?: string;
    title?: string;
  }
): AdSpec {
  const adId = context.adId || `ad_legacy_${Date.now()}`;
  const duration = legacy.durationSeconds || 6;
  const aspectRatio = (legacy.aspectRatio as AdAspectRatio) || '16:9';
  const now = new Date().toISOString();

  const assetList: SemanticAssetItem[] = [];

  if (legacy.startFrameAssetId) {
    assetList.push({
      assetId: legacy.startFrameAssetId,
      semanticRole: 'first_frame',
      label: 'Legacy Start Frame',
      priority: 1,
      usageConstraints: ['Condition first frame of shot'],
      provenance: 'user'
    });
  }

  (legacy.referenceAssetIds || []).forEach((assetId, idx) => {
    assetList.push({
      assetId,
      semanticRole: 'general_reference',
      label: `Legacy Reference ${idx + 1}`,
      priority: 2,
      usageConstraints: [],
      provenance: 'user'
    });
  });

  const adSpec: AdSpec = {
    schemaVersion: '1.0.0',
    identity: {
      adId,
      specVersion: 1,
      revisionId: 'rev_legacy_init',
      creativeState: 'approved',
      executionState: 'idle',
      title: context.title || 'Legacy Normalized Commercial',
      workspaceId: context.workspaceId,
      createdAt: now,
      updatedAt: now
    },
    brief: {
      brandRef: 'Default Brand',
      product: 'Commercial Hero',
      objective: 'awareness',
      targetAudience: {
        persona: 'Broad Commercial Audience',
        painPoints: []
      },
      platform: 'generic',
      desiredDurationSeconds: duration,
      aspectRatio,
      language: 'en',
      cta: {
        visualText: 'Learn More',
        actionIntent: 'learn_more'
      },
      keyMessage: legacy.prompt.slice(0, 100),
      desiredResponse: 'Engagement and interest',
      tone: 'Professional and engaging',
      emotionalGoal: {
        primaryEmotion: 'Interest',
        finalImpression: 'Quality'
      },
      mustInclude: [],
      mustAvoid: ['distortions', 'artifacts'],
      referencesAndInspiration: [],
      userConstraints: []
    },
    decisionMetadata: {
      'brief.desiredDurationSeconds': {
        source: 'user_provided',
        confidence: 1.0,
        status: 'confirmed',
        locked: true,
        reason: 'User provided duration in legacy request'
      },
      'brief.keyMessage': {
        source: 'user_provided',
        confidence: 1.0,
        status: 'confirmed',
        locked: true,
        reason: 'User provided prompt in legacy request'
      },
      'brief.aspectRatio': {
        source: 'user_provided',
        confidence: 1.0,
        status: 'confirmed',
        locked: true,
        reason: 'User provided aspect ratio'
      },
      'brief.objective': {
        source: 'system_derived',
        confidence: 0.8,
        status: 'unconfirmed',
        locked: false,
        reason: 'Legacy default derivation'
      },
      'creative.concept': {
        source: 'ai_inferred',
        confidence: 0.85,
        status: 'unconfirmed',
        locked: false,
        reason: 'Synthesized from legacy prompt'
      }
    },
    creative: {
      concepts: [{
        conceptId: 'concept_legacy_01',
        name: 'Normalized Concept',
        oneLinePremise: legacy.prompt.slice(0, 120),
        coreIdea: legacy.prompt,
        hook: {
          hookType: 'visual_surprise',
          description: 'Initial scene entrance'
        },
        narrativeMechanism: 'Direct representation',
        visualMechanism: 'Cinematic camera movement',
        emotionalArc: 'Neutral to intrigued',
        brandRole: 'Solution presentation',
        intendedAudienceEffect: 'Attention retention',
        noveltyRationale: 'Direct translation of user intent',
        complexityEstimate: 'low'
      }],
      selectedConceptId: 'concept_legacy_01',
      selectionProvenance: {
        selectedBy: 'user',
        selectedAt: now
      }
    },
    brand: {
      adSpecificOverrides: {},
      priorityHierarchy: [
        'brand_restriction',
        'campaign_rule',
        'creative_direction',
        'shot_preference'
      ]
    },
    assets: {
      assets: assetList
    },
    characters: [],
    products: [{
      id: 'prod_legacy_hero',
      name: 'Featured Subject',
      referenceAssetIds: legacy.startFrameAssetId ? [legacy.startFrameAssetId] : [],
      visualDescription: 'Primary subject described in prompt',
      shapeForm: 'Defined by visual prompt',
      materials: [],
      colorPalette: [],
      packaging: {
        containerType: 'Standard',
        materials: [],
        finish: 'gloss'
      },
      branding: {
        logoPlacement: 'Standard',
        labelDetails: ''
      },
      labelLogoConstraints: [],
      orientationConstraints: [],
      allowedTransformations: [],
      forbiddenTransformations: [],
      continuityRequirements: []
    }],
    locations: [{
      id: 'loc_legacy_scene',
      name: 'Primary Environment',
      description: 'Environment specified in legacy prompt',
      referenceAssetIds: [],
      architecture: 'Standard',
      spatialCharacteristics: {
        indoor: true,
        dimensions: 'medium',
        depthOfSpace: 'natural falloff'
      },
      lightingCharacteristics: {
        timeOfDay: 'studio',
        mood: 'Cinematic'
      },
      palette: [],
      atmosphere: 'Clear',
      continuityConstraints: []
    }],
    story: {
      structureType: 'minimal_hero',
      logline: legacy.prompt,
      beats: [{
        beatId: 'beat_01',
        beatType: 'opening_hook',
        title: 'Hero Reveal',
        narrativeGoal: 'Establish subject and visual tone',
        assignedShotIds: ['shot_01']
      }]
    },
    shots: [{
      shotId: 'shot_01',
      sequence: 1,
      purpose: 'Execute primary cinematic visual',
      narrativeRole: 'Hook and message delivery',
      timing: {
        startTime: 0,
        endTime: duration,
        duration
      },
      subjects: [{
        entityId: 'prod_legacy_hero',
        entityType: 'product',
        roleInShot: 'Primary focal subject',
        focalPriority: 1
      }],
      action: {
        startingState: 'Scene begins with subject centered',
        action: legacy.prompt,
        choreography: 'Controlled camera move tracking subject',
        endingState: 'Action concludes cleanly'
      },
      environment: {
        locationId: 'loc_legacy_scene'
      },
      camera: {
        shotSize: 'Medium Close Up',
        framing: 'close_up',
        angle: 'eye_level',
        lensCharacteristics: '50mm_natural',
        cameraPosition: 'Centered',
        cameraMovement: 'slow_push_in',
        composition: 'Center-weighted cinematic framing',
        depthIntent: 'Shallow commercial depth of field'
      },
      lighting: {
        source: 'Studio 3-point setup',
        direction: 'Top-left key',
        quality: 'soft_diffuse',
        intensity: 'balanced',
        contrast: 'medium',
        colorTemperature: '5600K Daylight',
        atmosphere: 'Pristine'
      },
      visualDirection: {
        visualIntent: 'Photorealistic commercial render',
        realismLevel: 'photorealistic',
        colorPalette: ['#1A202C', '#FFFFFF'],
        colorGrading: 'Commercial cinematic neutral',
        motionPacing: 'fluid'
      },
      audio: {
        soundEffects: [],
        audioPriority: 'silent'
      },
      transitions: {
        incoming: 'cut',
        outgoing: 'cut'
      },
      referencedAssetIds: assetList.map(a => a.assetId),
      continuity: {
        inheritedStates: [],
        producedStates: []
      },
      constraints: {
        mustHappen: ['Show subject clearly'],
        mustNotHappen: ['Artifacts', 'Distortions']
      },
      qaExpectations: {
        requiredSubjects: ['Featured Subject'],
        requiredActions: ['Prompt visual executed'],
        forbiddenActions: ['Morphing', 'Distortions'],
        requiredFraming: 'close_up',
        requiredCameraMovement: 'slow_push_in',
        productVisibility: 'prominent_front',
        characterIdentityRules: [],
        brandRules: []
      }
    }],
    continuity: {
      links: []
    },
    constraints: [],
    generationIntent: {
      desiredDurationSeconds: duration,
      aspectRatio,
      qualityIntent: 'cinematic_pro',
      audioRequired: false,
      continuityPriority: 'relaxed',
      realism: 'photorealistic',
      generationStrategy: 'shot_by_shot',
      modelRequirements: {
        requiresFirstFrame: Boolean(legacy.startFrameAssetId),
        requiresLastFrame: false,
        minimumReferenceCount: assetList.length,
        requiresNativeAudio: false
      }
    },
    metadata: {
      authorId: context.userId,
      originatingGem: 'video_generation_gem',
      customNotes: 'Normalized from legacy VideoGenerationRequest'
    }
  };

  return adSpec;
}
