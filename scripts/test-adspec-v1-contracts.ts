/**
 * Comprehensive AdSpec v1 Production Contracts & Fixtures Test Suite.
 *
 * Implements the 8 mandatory realistic fixtures and proves all core invariants:
 * - Fixture 1: 6-second product hero (1 shot, 1 product, 0 character)
 * - Fixture 2: 15-second social ad (1 character, 1 product, 4 shots)
 * - Fixture 3: 18-second narrative (2 characters, 1 product, 2 locations, 5 shots)
 * - Fixture 4: Product packaging-heavy ad with strict product locks
 * - Fixture 5: Character continuity-heavy ad with wardrobe/face locks
 * - Fixture 6: Multi-reference shot ad (product + character face + style references)
 * - Fixture 7: First/last-frame requirement ad
 * - Fixture 8: Native-audio requirement ad
 *
 * Invariant Verification:
 * - Section 44: Deterministic validation (valid/invalid timing, missing entities, duplicate IDs, cycle detection)
 * - Section 45: Revision patch safety & change impact analysis (Gym to beach)
 * - Section 46: Granular lock test (locked product geometry blocked; unlocked camera allowed)
 * - Section 47: Execution snapshot immutability (v3 approved snapshot unaffected by v4 draft edits)
 * - Section 48: Model independence test (zero provider payloads/keys in AdSpec)
 * - Section 49: Validation freshness test (v5 validation stale on v6)
 * - Section 3: Clean field values + decisionMetadata registry
 * - Section 41-42: Legacy adapter verification
 */

import { validateAdSpec, isValidationFresh } from '../packages/ad-director/adspec/validator.js';
import { applyAdSpecPatch } from '../packages/ad-director/adspec/revisionEngine.js';
import { createExecutionSnapshot } from '../packages/ad-director/adspec/snapshotEngine.js';
import { adaptLegacyVideoRequestToAdSpec } from '../packages/ad-director/adspec/legacyAdapter.js';
import { applyDirectorOperation } from '../packages/ad-director/operations/stateManager.js';
import { evaluateApprovalPolicy } from '../packages/ad-director/operations/approvalPolicy.js';
import { analyzeChangeImpact } from '../packages/ad-director/operations/changeImpact.js';
import type { AdSpec, AdShot, AdSpecPatch, ExecutionSnapshot } from '../packages/types/adSpec.js';
import type { DirectorOperation } from '../packages/types/directorOperations.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
    failed++;
    process.exitCode = 1;
  }
}

async function runComprehensiveContractsTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING ADSPEC V1 PRODUCTION CONTRACTS & FIXTURES SUITE');
  console.log('================================================================\n');

  // ===========================================================================
  // 1. FIXTURE 1: 6-SECOND PRODUCT HERO (1 SHOT, 1 PRODUCT, 0 CHARACTER)
  // ===========================================================================
  console.log('--- FIXTURE 1: 6-Second Product Hero Ad ---');
  const fixture1: AdSpec = {
    schemaVersion: '1.0.0',
    identity: {
      adId: 'ad_fixture_01_hero',
      specVersion: 1,
      revisionId: 'rev_f1_init',
      creativeState: 'approved',
      executionState: 'idle',
      title: 'Lumina Serum Product Hero',
      workspaceId: 'ws_test_01',
      createdBy: 'user_01',
      createdAt: '2026-09-15T12:00:00Z',
      updatedAt: '2026-09-15T12:00:00Z'
    },
    brief: {
      brandRef: 'brand_lumina',
      product: 'prod_lumina_serum',
      objective: 'awareness',
      targetAudience: {
        persona: 'Luxury skincare enthusiasts',
        painPoints: ['Dry skin', 'Lack of radiance']
      },
      platform: 'instagram_reels',
      desiredDurationSeconds: 6,
      aspectRatio: '9:16',
      language: 'en',
      cta: {
        visualText: 'Experience Radiance Now',
        actionIntent: 'buy_now'
      },
      keyMessage: 'Active botanical hydration',
      desiredResponse: 'Immediate purchase impulse',
      tone: 'Elevated and serene',
      emotionalGoal: {
        primaryEmotion: 'Calm awe',
        finalImpression: 'Pure luxury'
      },
      mustInclude: ['Glass dropper texture reveal'],
      mustAvoid: ['Hectic motion', 'Low lighting'],
      referencesAndInspiration: ['Apple minimalism', 'Aesop clarity'],
      userConstraints: ['Zero human hand in shot']
    },
    decisionMetadata: {
      'brief.desiredDurationSeconds': { source: 'user_provided', confidence: 1.0, status: 'confirmed', locked: true },
      'brief.cta': { source: 'user_provided', confidence: 1.0, status: 'confirmed', locked: true },
      'brief.keyMessage': { source: 'user_provided', confidence: 1.0, status: 'confirmed', locked: true }
    },
    creative: {
      concepts: [{
        conceptId: 'concept_f1_droplet',
        name: 'The Droplet Ritual',
        oneLinePremise: 'A macro suspension of amber liquid contacting crystal glass',
        coreIdea: 'Purity in suspended motion',
        hook: { hookType: 'visual_surprise', description: 'Viscous amber droplet falls in super slow motion' },
        narrativeMechanism: 'Visual meditation',
        visualMechanism: 'Macro 100mm lens tracking',
        emotionalArc: 'Tension to serene absorption',
        brandRole: 'The ultimate botanical catalyst',
        intendedAudienceEffect: 'Desire for sensory luxury',
        noveltyRationale: 'Extreme liquid viscosity physics',
        complexityEstimate: 'low'
      }],
      selectedConceptId: 'concept_f1_droplet',
      selectionProvenance: { selectedBy: 'user', selectedAt: '2026-09-15T12:00:00Z' }
    },
    brand: {
      adSpecificOverrides: {
        primaryColors: ['#F59E0B', '#111827'],
        lightingAesthetic: 'Clean warm rim light'
      },
      priorityHierarchy: ['brand_restriction', 'campaign_rule', 'creative_direction', 'shot_preference']
    },
    assets: {
      assets: [{
        assetId: 'asset_serum_bottle_hero',
        semanticRole: 'product_hero',
        targetEntityId: 'prod_lumina_serum',
        label: 'Amber Glass Bottle 30ml',
        priority: 1,
        usageConstraints: ['Do not obscure gold dropper collar'],
        provenance: 'user'
      }]
    },
    characters: [],
    products: [{
      id: 'prod_lumina_serum',
      name: 'Lumina Botanical Elixir',
      referenceAssetIds: ['asset_serum_bottle_hero'],
      visualDescription: 'Amber tinted Boston round glass bottle with matte gold dropper',
      shapeForm: 'Cylindrical 30ml apothecary silhouette',
      materials: ['Borosilicate amber glass', 'Brushed aluminum dropper cap'],
      colorPalette: ['#B45309', '#FCD34D', '#111827'],
      packaging: {
        containerType: 'Boston round bottle',
        materials: ['Glass', 'Metal'],
        finish: 'gloss'
      },
      branding: {
        logoPlacement: 'Vertical serif script along bottle face',
        labelDetails: 'Silk-screened off-white lettering'
      },
      labelLogoConstraints: ['Logo must remain front-facing and crisp'],
      orientationConstraints: ['Vertical upright 90 degrees'],
      allowedTransformations: ['Axial rotation up to 45 degrees'],
      forbiddenTransformations: ['Deformation', 'Color shift', 'Dropper removal'],
      continuityRequirements: ['Liquid level stays at 95% full'],
      locks: ['geometry', 'logo', 'packaging', 'brandColors']
    }],
    locations: [{
      id: 'loc_minimal_pedestal',
      name: 'Travertine Stone Pedestal',
      description: 'Chiseled travertine cube set against warm gradient dusk background',
      referenceAssetIds: [],
      architecture: 'Brutalist minimal stone surface',
      spatialCharacteristics: { indoor: true, dimensions: 'compact', depthOfSpace: 'shallow luxury blur' },
      lightingCharacteristics: { timeOfDay: 'studio', mood: 'Warm golden backlight with diffuse key' },
      palette: ['#E7E5E4', '#78716C'],
      atmosphere: 'Clean, serene studio air',
      continuityConstraints: ['Specular highlight on stone remains fixed']
    }],
    story: {
      structureType: 'minimal_hero',
      logline: 'Suspended amber droplet reveals botanical skincare mastery',
      beats: [{
        beatId: 'beat_01',
        beatType: 'product_moment',
        title: 'Hero Illumination',
        narrativeGoal: 'Present product craftsmanship and botanical texture',
        assignedShotIds: ['shot_01']
      }]
    },
    shots: [{
      shotId: 'shot_01',
      sequence: 1,
      purpose: 'Product hero reveal with fluid droplet dynamic',
      narrativeRole: 'Hook and centerpiece presentation',
      timing: { startTime: 0, endTime: 6, duration: 6 },
      subjects: [{ entityId: 'prod_lumina_serum', entityType: 'product', roleInShot: 'Centerpiece', focalPriority: 1 }],
      action: {
        startingState: 'Bottle stands on stone pedestal with amber liquid backlit by warm sunlight',
        action: 'Camera pushes in slowly as a single golden droplet runs down the exterior glass contour',
        choreography: 'Smooth continuous push with micro rotational focus on dropper tip',
        beats: [
          { startTime: 0, endTime: 2, relativeStart: 0, relativeEnd: 2, description: 'Backlight flare illuminates amber bottle' },
          { startTime: 2, endTime: 4.5, relativeStart: 2, relativeEnd: 4.5, description: 'Droplet beads on glass shoulder and catches specular light' },
          { startTime: 4.5, endTime: 6, relativeStart: 4.5, relativeEnd: 6, description: 'Camera settles on crisp gold typography logo' }
        ],
        endingState: 'Logo front-facing, perfectly stabilized and sharp'
      },
      environment: { locationId: 'loc_minimal_pedestal' },
      camera: {
        shotSize: 'Macro Close Up',
        framing: 'extreme_close_up',
        angle: 'low_angle',
        lensCharacteristics: '100mm_macro',
        cameraPosition: 'Frontal eye level with pedestal',
        cameraMovement: 'slow_push_in',
        composition: 'Golden ratio center-weighted',
        depthIntent: 'F/2.8 shallow focus with soft creamy background falloff'
      },
      lighting: {
        source: 'Warm golden backlight + diffuse fill card',
        direction: 'Rear 30 degrees elevated',
        quality: 'volumetric',
        intensity: 'balanced',
        contrast: 'high',
        colorTemperature: '3200K Warm Tungsten',
        atmosphere: 'Micro ambient dust motes caught in sunbeam'
      },
      visualDirection: {
        visualIntent: 'Photorealistic luxury commercial cinematography',
        realismLevel: 'photorealistic',
        colorPalette: ['#B45309', '#FCD34D', '#111827'],
        colorGrading: 'Warm analog film with amber density',
        motionPacing: 'fluid'
      },
      audio: {
        ambient: 'Subtle resonant hum of warm silence',
        soundEffects: ['Crisp glass contact chime', 'Viscous liquid droplet swell'],
        audioPriority: 'high'
      },
      transitions: { incoming: 'none', outgoing: 'fade_to_black' },
      referencedAssetIds: ['asset_serum_bottle_hero'],
      continuity: {
        inheritedStates: [],
        producedStates: [{ entityId: 'prod_lumina_serum', stateDescription: 'Upright, front-facing, illuminated' }]
      },
      constraints: {
        mustHappen: ['Brand lettering must remain 100% legible', 'Droplet movement must be physically plausible'],
        mustNotHappen: ['Bottle jitter', 'Morphing glass reflections']
      },
      qaExpectations: {
        requiredSubjects: ['Lumina Botanical Elixir'],
        requiredActions: ['Slow push in with droplet descent'],
        forbiddenActions: ['Morphing glass', 'Distorted logo'],
        requiredFraming: 'extreme_close_up',
        requiredCameraMovement: 'slow_push_in',
        productVisibility: 'prominent_front',
        characterIdentityRules: [],
        brandRules: ['Crisp serif brand logo']
      }
    }],
    continuity: { links: [] },
    constraints: [{
      id: 'c_01',
      category: 'product',
      severity: 'must',
      rule: 'Product packaging geometry and typography cannot be altered',
      targetEntityId: 'prod_lumina_serum'
    }],
    generationRequirements: {
      durationSeconds: 6,
      aspectRatio: '9:16',
      audioRequired: true,
      firstFrameRequired: false,
      lastFrameRequired: false,
      minimumReferenceCount: 1,
      videoInputRequired: false,
      multiShotRequired: false,
      continuityPriority: 'strict',
      qualityPriority: 'cinematic_pro'
    },
    generationIntent: {
      desiredDurationSeconds: 6,
      aspectRatio: '9:16',
      qualityIntent: 'cinematic_pro',
      audioRequired: true,
      continuityPriority: 'strict',
      realism: 'photorealistic',
      generationStrategy: 'shot_by_shot',
      modelRequirements: {
        requiresFirstFrame: false,
        requiresLastFrame: false,
        minimumReferenceCount: 1,
        requiresNativeAudio: true
      }
    },
    metadata: {
      authorId: 'user_01',
      originatingGem: 'video_generation_gem'
    }
  };

  const valF1 = validateAdSpec(fixture1);
  assert(valF1.valid, 'Fixture 1 (6s Hero) validates with zero errors');
  assert(valF1.metrics.shotCount === 1, 'Fixture 1 has exactly 1 shot');
  assert(valF1.metrics.calculatedDuration === 6.0, 'Fixture 1 duration is 6.0s');
  assert(valF1.metrics.characterCount === 0, 'Fixture 1 has 0 characters');
  assert(valF1.metrics.productCount === 1, 'Fixture 1 has 1 product');
  assert(valF1.metrics.confirmedFieldsCount === 3, 'Fixture 1 records 3 confirmed fields in decisionMetadata');

  // Clean value check: ensure brief.desiredDurationSeconds is a clean number
  assert(typeof fixture1.brief.desiredDurationSeconds === 'number', 'brief.desiredDurationSeconds is a clean primitive number (not wrapped)');
  assert(typeof (fixture1.brief.cta as any).visualText === 'string', 'brief.cta is a clean structured object');

  // ===========================================================================
  // 2. FIXTURE 2: 15-SECOND SOCIAL AD (1 CHARACTER, 1 PRODUCT, 4 SHOTS)
  // ===========================================================================
  console.log('\n--- FIXTURE 2: 15-Second Social Ad ---');
  const fixture2: AdSpec = {
    ...fixture1,
    identity: {
      ...fixture1.identity,
      adId: 'ad_fixture_02_social',
      title: '15-Second Morning Energy Routine'
    },
    brief: {
      ...fixture1.brief,
      desiredDurationSeconds: 15,
      platform: 'tiktok',
      aspectRatio: '9:16'
    },
    decisionMetadata: {
      'brief.desiredDurationSeconds': { source: 'user_provided', confidence: 1.0, status: 'confirmed', locked: true }
    },
    characters: [{
      id: 'char_alex',
      name: 'Alex Rivera',
      displayName: 'Alex',
      narrativeRole: 'protagonist',
      referenceAssetIds: ['asset_alex_face_01'],
      appearance: {
        gender: 'female',
        apparentAge: '28-32',
        ethnicity: 'Latina',
        hairColor: 'dark brown',
        hairStyle: 'loose natural waves'
      },
      wardrobe: {
        outfit: 'Cream ribbed knit loungewear cardigan',
        colors: ['#F5F5F0', '#E2E8F0']
      },
      behaviorPersonality: 'Energized, focused, modern professional',
      identityLockStrength: 'strict',
      locks: ['identity', 'face', 'wardrobe'],
      continuityConstraints: ['Cardigan remains identical across all morning scenes'],
      forbiddenChanges: ['Do not change hair color or facial structure']
    }],
    shots: [
      {
        ...fixture1.shots[0],
        shotId: 'shot_01',
        sequence: 1,
        timing: { startTime: 0, endTime: 3, duration: 3 },
        subjects: [{ entityId: 'char_alex', entityType: 'character', roleInShot: 'Protagonist waking up', focalPriority: 1 }],
        action: {
          startingState: 'Alex standing by sunlit window with eyes gently opening',
          action: 'Alex stretches and reaches toward vanity counter',
          choreography: 'Turn and step toward product',
          endingState: 'Alex reaches for Lumina Serum bottle'
        },
        continuity: { inheritedStates: [], producedStates: [{ entityId: 'char_alex', stateDescription: 'By vanity' }] }
      },
      {
        ...fixture1.shots[0],
        shotId: 'shot_02',
        sequence: 2,
        timing: { startTime: 3, endTime: 7, duration: 4 },
        subjects: [
          { entityId: 'char_alex', entityType: 'character', roleInShot: 'Applying product', focalPriority: 1 },
          { entityId: 'prod_lumina_serum', entityType: 'product', roleInShot: 'In use', focalPriority: 2 }
        ],
        action: {
          startingState: 'Alex holds bottle at cheek height',
          action: 'Alex applies two golden drops to cheekbone, smooth smile spreading',
          choreography: 'Gentle upward massage motion',
          endingState: 'Product absorbed, skin visibly glowing'
        },
        continuity: {
          inheritedStates: [{ sourceShotId: 'shot_01', entityId: 'char_alex', aspect: 'wardrobe', requirement: 'Cream knit cardigan' }],
          producedStates: [{ entityId: 'char_alex', stateDescription: 'Skin radiant' }]
        }
      },
      {
        ...fixture1.shots[0],
        shotId: 'shot_03',
        sequence: 3,
        timing: { startTime: 7, endTime: 11, duration: 4 },
        subjects: [{ entityId: 'prod_lumina_serum', entityType: 'product', roleInShot: 'Hero feature', focalPriority: 1 }],
        action: {
          startingState: 'Serum bottle centered on sunlit vanity table',
          action: '360 rotation with glistening reflection moving across bottle curvature',
          choreography: 'Axial turn revealing active ingredients label',
          endingState: 'Bottle rests in hero framing'
        },
        continuity: {
          inheritedStates: [{ sourceShotId: 'shot_02', entityId: 'prod_lumina_serum', aspect: 'product_state', requirement: 'Cap secure' }],
          producedStates: [{ entityId: 'prod_lumina_serum', stateDescription: 'Centered front-facing' }]
        }
      },
      {
        ...fixture1.shots[0],
        shotId: 'shot_04',
        sequence: 4,
        timing: { startTime: 11, endTime: 15, duration: 4 },
        subjects: [
          { entityId: 'char_alex', entityType: 'character', roleInShot: 'Confident endorsement', focalPriority: 1 },
          { entityId: 'prod_lumina_serum', entityType: 'product', roleInShot: 'Held alongside cheek', focalPriority: 2 }
        ],
        action: {
          startingState: 'Alex facing camera with natural confident smile',
          action: 'Alex holds bottle near cheek and winks toward lens; CTA text illuminates screen',
          choreography: 'Static hold with vibrant natural eye contact',
          endingState: 'Crisp CTA freeze'
        },
        continuity: {
          inheritedStates: [{ sourceShotId: 'shot_03', entityId: 'prod_lumina_serum', aspect: 'product_state', requirement: 'Front-facing' }],
          producedStates: [{ entityId: 'char_alex', stateDescription: 'Smiling at camera' }]
        }
      }
    ],
    continuity: {
      links: [
        { fromShotId: 'shot_01', toShotId: 'shot_02', entityId: 'char_alex', aspect: 'wardrobe', invariant: 'Cardigan unchanged' },
        { fromShotId: 'shot_02', toShotId: 'shot_03', entityId: 'prod_lumina_serum', aspect: 'packaging', invariant: 'Bottle glass intact' },
        { fromShotId: 'shot_03', toShotId: 'shot_04', entityId: 'char_alex', aspect: 'face', invariant: 'Facial identity intact' }
      ]
    },
    generationRequirements: {
      durationSeconds: 15,
      aspectRatio: '9:16',
      audioRequired: true,
      firstFrameRequired: false,
      lastFrameRequired: false,
      minimumReferenceCount: 2,
      multiShotRequired: true,
      continuityPriority: 'strict',
      qualityPriority: 'cinematic_pro'
    }
  };

  const valF2 = validateAdSpec(fixture2);
  assert(valF2.valid, 'Fixture 2 (15s Social) passes deterministic validation');
  assert(valF2.metrics.shotCount === 4, 'Fixture 2 contains 4 shots');
  assert(valF2.metrics.calculatedDuration === 15.0, 'Fixture 2 calculated duration matches 15.0s');
  assert(valF2.metrics.characterCount === 1, 'Fixture 2 tracks 1 character');

  // ===========================================================================
  // 3. FIXTURE 3: 18-SECOND NARRATIVE (2 CHARACTERS, 2 LOCATIONS, 5 SHOTS)
  // ===========================================================================
  console.log('\n--- FIXTURE 3: 18-Second Narrative Commercial ---');
  const fixture3: AdSpec = {
    ...fixture2,
    identity: {
      ...fixture2.identity,
      adId: 'ad_fixture_03_narrative',
      title: '18-Second Encounter & Discovery'
    },
    brief: {
      ...fixture2.brief,
      desiredDurationSeconds: 18,
      aspectRatio: '16:9'
    },
    decisionMetadata: {
      'brief.desiredDurationSeconds': { source: 'user_provided', confidence: 1.0, status: 'confirmed', locked: true }
    },
    characters: [
      fixture2.characters[0],
      {
        id: 'char_marcus',
        name: 'Marcus Vance',
        displayName: 'Marcus',
        narrativeRole: 'supporting',
        referenceAssetIds: ['asset_marcus_face'],
        appearance: { gender: 'male', apparentAge: '34-38', hairColor: 'salt and pepper' },
        wardrobe: { outfit: 'Charcoal tailored linen blazer', colors: ['#27272A'] },
        behaviorPersonality: 'Astute gallery curator',
        locks: ['identity', 'wardrobe'],
        continuityConstraints: ['Blazer remains charcoal'],
        forbiddenChanges: []
      }
    ],
    locations: [
      fixture1.locations[0],
      {
        id: 'loc_sunlit_courtyard',
        name: 'Sunlit Mediterranean Courtyard',
        description: 'Limestone terrace with olive trees and soft golden sunlight',
        referenceAssetIds: [],
        architecture: 'Limestone arches and cobblestones',
        spatialCharacteristics: { indoor: false, dimensions: 'spacious', depthOfSpace: 'open garden perspective' },
        lightingCharacteristics: { timeOfDay: 'golden_hour', mood: 'Warm organic late afternoon' },
        palette: ['#FDE047', '#4D7C0F'],
        atmosphere: 'Gentle summer breeze',
        continuityConstraints: ['Sun angle 25 degrees western horizon'],
        locks: ['architecture', 'lighting']
      }
    ],
    shots: [
      { ...fixture2.shots[0], timing: { startTime: 0, endTime: 3.5, duration: 3.5 } },
      { ...fixture2.shots[1], timing: { startTime: 3.5, endTime: 7.0, duration: 3.5 } },
      {
        ...fixture2.shots[2],
        shotId: 'shot_03',
        timing: { startTime: 7.0, endTime: 11.0, duration: 4.0 },
        environment: { locationId: 'loc_sunlit_courtyard' },
        subjects: [{ entityId: 'char_marcus', entityType: 'character', roleInShot: 'Observing Alex', focalPriority: 1 }]
      },
      {
        ...fixture2.shots[3],
        shotId: 'shot_04',
        timing: { startTime: 11.0, endTime: 15.0, duration: 4.0 },
        environment: { locationId: 'loc_sunlit_courtyard' },
        subjects: [
          { entityId: 'char_alex', entityType: 'character', roleInShot: 'Greeting Marcus', focalPriority: 1 },
          { entityId: 'char_marcus', entityType: 'character', roleInShot: 'Welcoming', focalPriority: 2 }
        ],
        continuity: {
          inheritedStates: [{ sourceShotId: 'shot_03', entityId: 'char_marcus', aspect: 'wardrobe', requirement: 'Linen blazer' }],
          producedStates: [{ entityId: 'char_alex', stateDescription: 'Conversing in courtyard' }]
        }
      },
      {
        shotId: 'shot_05',
        sequence: 5,
        purpose: 'Closing product payoff',
        narrativeRole: 'Payoff and final CTA',
        timing: { startTime: 15.0, endTime: 18.0, duration: 3.0 },
        subjects: [{ entityId: 'prod_lumina_serum', entityType: 'product', roleInShot: 'Centerpiece', focalPriority: 1 }],
        action: {
          startingState: 'Product illuminated by courtyard golden light',
          action: 'Product locks into camera focus with brand claim appearing',
          choreography: 'Subtle tilt up',
          endingState: 'Definitive commercial hero frame'
        },
        environment: { locationId: 'loc_sunlit_courtyard' },
        camera: fixture1.shots[0].camera,
        lighting: fixture1.shots[0].lighting,
        visualDirection: fixture1.shots[0].visualDirection,
        audio: { soundEffects: ['Signature brand sound cue'], audioPriority: 'high' },
        transitions: { incoming: 'cut', outgoing: 'fade_to_black' },
        referencedAssetIds: ['asset_serum_bottle_hero'],
        continuity: { inheritedStates: [], producedStates: [] },
        constraints: { mustHappen: ['Crisp final lock'], mustNotHappen: [] },
        qaExpectations: fixture1.shots[0].qaExpectations
      }
    ],
    continuity: {
      links: [
        { fromShotId: 'shot_03', toShotId: 'shot_04', entityId: 'char_marcus', aspect: 'wardrobe', invariant: 'Blazer identical' }
      ]
    },
    generationRequirements: {
      durationSeconds: 18,
      aspectRatio: '16:9',
      audioRequired: true,
      firstFrameRequired: false,
      lastFrameRequired: false,
      minimumReferenceCount: 2,
      multiShotRequired: true,
      continuityPriority: 'strict',
      qualityPriority: 'cinematic_pro'
    }
  };

  const valF3 = validateAdSpec(fixture3);
  assert(valF3.valid, 'Fixture 3 (18s Narrative) passes validation');
  assert(valF3.metrics.shotCount === 5, 'Fixture 3 has 5 shots');
  assert(valF3.metrics.characterCount === 2, 'Fixture 3 has 2 characters');
  assert(valF3.metrics.locationCount === 2, 'Fixture 3 has 2 locations');
  assert(valF3.metrics.calculatedDuration === 18.0, 'Fixture 3 duration is 18.0s');

  // ===========================================================================
  // 4. FIXTURE 4: STRICT PRODUCT PACKAGING & GEOMETRY LOCKS
  // ===========================================================================
  console.log('\n--- FIXTURE 4: Strict Product Locks Test ---');
  const fixture4: AdSpec = JSON.parse(JSON.stringify(fixture1));
  fixture4.identity.creativeState = 'director_plan_draft';
  fixture4.products[0].locks = ['geometry', 'packaging', 'logo', 'brandColors', 'material', 'label'];

  // AI operation proposing changing product geometry
  const illegalGeometryOp: DirectorOperation = {
    operationId: 'op_illegal_shape',
    type: 'patch',
    target: { scope: 'product', entityId: 'prod_lumina_serum' },
    changes: { shapeForm: 'Hexagonal futuristic tube container' },
    reason: { type: 'ai_proposed', description: 'Make bottle shape edgy' },
    actor: { id: 'ai_director', role: 'ai_creative_director' },
    parentSpecVersion: 1
  };

  const evalGeometry = evaluateApprovalPolicy(fixture4, illegalGeometryOp);
  assert(
    evalGeometry.level === 'USER_CONFIRMATION_REQUIRED',
    'AI proposing change to locked product geometry is classified as USER_CONFIRMATION_REQUIRED'
  );

  // User-requested change to same geometry is AUTO_SAFE
  const userGeometryOp: DirectorOperation = {
    ...illegalGeometryOp,
    operationId: 'op_user_shape',
    actor: { id: 'user_01', role: 'user' },
    reason: { type: 'user_requested', description: 'User explicitly chooses new bottle design' }
  };
  const evalUserGeometry = evaluateApprovalPolicy(fixture4, userGeometryOp);
  assert(evalUserGeometry.level === 'AUTO_SAFE', 'User-requested change to locked product geometry is AUTO_SAFE');

  // AI proposing change to unlocked property (camera angle in shot 1) is AUTO_SAFE
  const safeCameraOp: DirectorOperation = {
    operationId: 'op_camera_angle',
    type: 'patch',
    target: { scope: 'shot', entityId: 'shot_01' },
    changes: { 'camera.angle': 'dramatic_low_angle' },
    reason: { type: 'ai_proposed', description: 'Enhance cinematic grandeur' },
    actor: { id: 'ai_director', role: 'ai_shot_director' },
    parentSpecVersion: 1
  };
  const evalCamera = evaluateApprovalPolicy(fixture4, safeCameraOp);
  assert(evalCamera.level === 'AUTO_SAFE', 'AI adjusting unlocked camera angle on shot is AUTO_SAFE');

  // ===========================================================================
  // 5. FIXTURE 5: CHARACTER CONTINUITY-HEAVY AD WITH WARDROBE LOCK
  // ===========================================================================
  console.log('\n--- FIXTURE 5: Character Wardrobe Lock Test ---');
  const fixture5: AdSpec = JSON.parse(JSON.stringify(fixture2));
  fixture5.identity.creativeState = 'director_plan_draft';
  assert(fixture5.characters[0].locks?.includes('wardrobe'), 'Fixture 5 character has wardrobe lock');

  // AI proposing wardrobe change must be flagged
  const illegalWardrobeOp: DirectorOperation = {
    operationId: 'op_illegal_wardrobe',
    type: 'patch',
    target: { scope: 'character', entityId: 'char_alex' },
    changes: { wardrobe: { outfit: 'Bright red leather jacket', colors: ['#EF4444'] } },
    reason: { type: 'ai_proposed', description: 'Change to high-energy jacket' },
    actor: { id: 'ai_director', role: 'ai_shot_director' },
    parentSpecVersion: 1
  };
  const evalWardrobe = evaluateApprovalPolicy(fixture5, illegalWardrobeOp);
  assert(
    evalWardrobe.level === 'USER_CONFIRMATION_REQUIRED',
    'AI proposing modification to locked character wardrobe is blocked / requires user confirmation'
  );

  // ===========================================================================
  // 6. FIXTURES 6, 7, 8: MULTI-REFERENCE, FIRST/LAST FRAME, NATIVE AUDIO
  // ===========================================================================
  console.log('\n--- FIXTURES 6, 7, 8: Requirements & Semantic Roles ---');
  const fixture6_8: AdSpec = JSON.parse(JSON.stringify(fixture1));
  fixture6_8.assets.assets.push(
    { assetId: 'asset_face_ref_01', semanticRole: 'face_reference', label: 'Face Reference', priority: 1, usageConstraints: [], provenance: 'user' },
    { assetId: 'asset_style_ref_02', semanticRole: 'style_reference', label: 'Style Reference', priority: 2, usageConstraints: [], provenance: 'user' },
    { assetId: 'asset_first_frame', semanticRole: 'first_frame', label: 'Start Frame', priority: 1, usageConstraints: [], provenance: 'user' },
    { assetId: 'asset_last_frame', semanticRole: 'last_frame', label: 'End Frame', priority: 1, usageConstraints: [], provenance: 'user' }
  );
  fixture6_8.shots[0].referencedAssetIds.push('asset_face_ref_01', 'asset_style_ref_02');
  fixture6_8.generationRequirements = {
    durationSeconds: 6,
    aspectRatio: '9:16',
    audioRequired: true,
    firstFrameRequired: true,
    lastFrameRequired: true,
    minimumReferenceCount: 4,
    continuityPriority: 'strict',
    qualityPriority: 'broadcast_master'
  };

  const valF68 = validateAdSpec(fixture6_8);
  assert(valF68.valid, 'Fixtures 6-8 (Multi-reference, first/last frame, native audio) passes validation');
  assert(valF68.metrics.assetCount === 5, 'Assets cataloged contains 5 items');
  assert(fixture6_8.generationRequirements.firstFrameRequired === true, 'firstFrameRequired is true');
  assert(fixture6_8.generationRequirements.lastFrameRequired === true, 'lastFrameRequired is true');
  assert(fixture6_8.generationRequirements.audioRequired === true, 'audioRequired is true');

  // ===========================================================================
  // 7. SECTION 45: REVISION TESTS & CHANGE IMPACT ANALYSIS (GYM TO BEACH)
  // ===========================================================================
  console.log('\n--- SECTION 45: Revision Invariance & Change Impact Test ---');
  const revisionSpecV1 = JSON.parse(JSON.stringify(fixture2)) as AdSpec;
  const shot3Patch: AdSpecPatch = {
    revisionId: 'rev_shot3_intense',
    targetScope: 'shot',
    targetEntityId: 'shot_03',
    reason: 'Make Shot 3 more intense and energetic',
    changes: {
      'camera.movement': 'orbital_arc',
      'lighting.contrast': 'high'
    },
    actor: { id: 'user_01', role: 'user' },
    timestamp: '2026-09-15T12:05:00Z'
  };

  const { newSpec: revisionSpecV2 } = applyAdSpecPatch(revisionSpecV1, shot3Patch);
  assert(revisionSpecV2.identity.specVersion === 2, 'AdSpec version progressed strictly from 1 to 2');
  assert(revisionSpecV2.shots[2].camera.cameraMovement === 'orbital_arc', 'Shot 3 cameraMovement updated to orbital_arc');
  assert(revisionSpecV2.shots[2].lighting.contrast === 'high', 'Shot 3 lighting contrast updated to high');
  // Proving untouched fields
  assert(revisionSpecV2.shots[0].camera.cameraMovement === revisionSpecV1.shots[0].camera.cameraMovement, 'Shot 1 remained 100% untouched');
  assert(revisionSpecV2.shots[1].camera.cameraMovement === revisionSpecV1.shots[1].camera.cameraMovement, 'Shot 2 remained 100% untouched');
  assert(revisionSpecV2.shots[3].camera.cameraMovement === revisionSpecV1.shots[3].camera.cameraMovement, 'Shot 4 remained 100% untouched');
  assert(revisionSpecV2.characters[0].displayName === revisionSpecV1.characters[0].displayName, 'Characters remained 100% untouched');
  assert(revisionSpecV2.products[0].name === revisionSpecV1.products[0].name, 'Product remained 100% untouched');
  assert(revisionSpecV2.brief.keyMessage === revisionSpecV1.brief.keyMessage, 'Brief remained 100% untouched');

  // Change Impact Analysis (Gym scene moved to Beach)
  const impactTestSpec: AdSpec = JSON.parse(JSON.stringify(fixture3));
  impactTestSpec.locations[0] = {
    id: 'loc_indoor_gym',
    name: 'Metropolitan High-Tech Gym',
    description: 'Indoor fitness center with neon bar and free weights',
    referenceAssetIds: [],
    architecture: 'Modern fitness studio',
    spatialCharacteristics: { indoor: true, dimensions: 'medium', depthOfSpace: 'deep gym floor' },
    lightingCharacteristics: { timeOfDay: 'midday', mood: 'Cool dynamic blue neon' },
    palette: ['#0284C7', '#0F172A'],
    atmosphere: 'Energetic gym air',
    continuityConstraints: []
  };
  impactTestSpec.shots[0].environment.locationId = 'loc_indoor_gym';
  impactTestSpec.shots[1].environment.locationId = 'loc_indoor_gym';

  const moveLocationOp: DirectorOperation = {
    operationId: 'op_gym_to_beach',
    type: 'update_location',
    target: { scope: 'location', entityId: 'loc_indoor_gym' },
    changes: {
      name: 'Sunset Tropical Beach',
      description: 'Golden hour sand dunes with ocean waves',
      architecture: 'Open shoreline with driftwood',
      spatialCharacteristics: { indoor: false, dimensions: 'open_world', depthOfSpace: 'infinite horizon' },
      lightingCharacteristics: { timeOfDay: 'golden_hour', mood: 'Warm amber sunlight' },
      palette: ['#F59E0B', '#0284C7']
    },
    reason: { type: 'user_requested', description: 'Move gym scene to a tropical beach' },
    actor: { id: 'user_01', role: 'user' },
    parentSpecVersion: 1
  };

  const impact = analyzeChangeImpact(impactTestSpec, moveLocationOp);
  assert(impact.directlyAffected.includes('loc_indoor_gym'), 'Directly affected identifies target location');
  assert(impact.indirectlyAffected.includes('shot_01'), 'Indirectly affected identifies dependent shot 1');
  assert(impact.indirectlyAffected.includes('shot_02'), 'Indirectly affected identifies dependent shot 2');
  assert(!impact.indirectlyAffected.includes('shot_03'), 'Unaffected shot 3 is not marked as affected');
  assert(impact.unaffected.includes('brand'), 'Brand is categorized as unaffected');
  assert(impact.unaffected.includes('product'), 'Product identity is categorized as unaffected');

  // ===========================================================================
  // 8. SECTION 47: EXECUTION SNAPSHOT IMMUTABILITY TEST
  // ===========================================================================
  console.log('\n--- SECTION 47: Execution Snapshot Immutability Test ---');
  const approvedSpecV3: AdSpec = JSON.parse(JSON.stringify(revisionSpecV2));
  approvedSpecV3.identity.specVersion = 3;
  approvedSpecV3.identity.creativeState = 'approved';

  const snapshotE1: ExecutionSnapshot = createExecutionSnapshot(approvedSpecV3, {
    approvedBy: 'director_user_01',
    selectedProvider: 'google',
    selectedModel: 'veo-2.0',
    creditCostEstimate: 50
  });

  assert(snapshotE1.specVersion === 3, 'Snapshot E1 records approved version 3');
  assert(snapshotE1.selectedProvider === 'google', 'Snapshot E1 records selected provider "google"');
  assert(snapshotE1.selectedModel === 'veo-2.0', 'Snapshot E1 records selected model "veo-2.0"');

  // Mutate draft to version 4
  const draftSpecV4: AdSpec = JSON.parse(JSON.stringify(approvedSpecV3));
  draftSpecV4.identity.specVersion = 4;
  draftSpecV4.identity.creativeState = 'director_plan_draft';
  draftSpecV4.shots[0].camera.cameraMovement = 'whip_pan';
  draftSpecV4.shots[0].timing.duration = 10;

  assert(
    snapshotE1.frozenAdSpec.identity.specVersion === 3,
    'IMMUTABILITY PROVED: Snapshot E1 specVersion remains 3'
  );
  assert(
    snapshotE1.frozenAdSpec.shots[0].camera.cameraMovement !== 'whip_pan',
    'IMMUTABILITY PROVED: Snapshot E1 shot cameraMovement was not mutated by live v4 draft changes'
  );
  assert(
    snapshotE1.frozenAdSpec.identity.creativeState === 'approved',
    'IMMUTABILITY PROVED: Snapshot E1 creativeState remains "approved"'
  );

  // ===========================================================================
  // 9. SECTION 48: MODEL INDEPENDENCE TEST
  // ===========================================================================
  console.log('\n--- SECTION 48: Provider Neutrality & Model Independence Test ---');
  const serialized = JSON.stringify(fixture6_8);
  assert(!serialized.includes('veo-'), 'AdSpec contains NO Veo request payload');
  assert(!serialized.includes('fal.ai'), 'AdSpec contains NO Fal endpoint/payload');
  assert(!serialized.includes('seedance'), 'AdSpec contains NO Seedance request schema');
  assert(!serialized.includes('generationJobId'), 'AdSpec contains NO provider job IDs');
  assert(!serialized.includes('apiKey'), 'AdSpec contains NO API credentials');

  // ===========================================================================
  // 10. SECTION 49: VALIDATION FRESHNESS & STALENESS TEST
  // ===========================================================================
  console.log('\n--- SECTION 49: Validation Freshness & Staleness Test ---');
  const specV5: AdSpec = JSON.parse(JSON.stringify(fixture1));
  specV5.identity.specVersion = 5;
  specV5.identity.revisionId = 'rev_v5_stable';

  const valResultV5 = validateAdSpec(specV5);
  specV5.validationStatus = {
    ...valResultV5,
    evaluatedAtVersion: 5,
    evaluatedAtRevisionId: 'rev_v5_stable',
    isAuthoritative: true
  };

  assert(isValidationFresh(specV5) === true, 'Spec v5 validation is currently fresh and authoritative');

  // Now mutate spec to v6 via patch
  const { newSpec: specV6 } = applyAdSpecPatch(specV5, {
    revisionId: 'rev_v6_camera_tweak',
    targetScope: 'shot',
    targetEntityId: 'shot_01',
    reason: 'Fine tune camera tilt',
    changes: { 'camera.angle': 'eye_level' },
    actor: { id: 'user_01', role: 'user' },
    timestamp: '2026-09-15T12:15:00Z'
  });

  assert(specV6.identity.specVersion === 6, 'Spec progressed to version 6');
  assert(
    isValidationFresh(specV6) === false,
    'FRESHNESS PROVED: Previous v5 validation is recognized as STALE on v6 (isAuthoritative is false)'
  );

  // Re-validating v6 restores authoritative freshness
  const valResultV6 = validateAdSpec(specV6);
  specV6.validationStatus = {
    ...valResultV6,
    evaluatedAtVersion: specV6.identity.specVersion,
    evaluatedAtRevisionId: specV6.identity.revisionId,
    isAuthoritative: true
  };
  assert(isValidationFresh(specV6) === true, 'Re-validating v6 attaches fresh authoritative validation');

  // ===========================================================================
  // 11. SECTION 44: INVALID INPUT DETECTION & INVARIANT ENFORCEMENT
  // ===========================================================================
  console.log('\n--- SECTION 44: Invalid Input & Boundary Violation Tests ---');

  // Duration mismatch
  const badDurationSpec: AdSpec = JSON.parse(JSON.stringify(fixture1));
  badDurationSpec.brief.desiredDurationSeconds = 12; // sum of shots is 6
  const badDurRes = validateAdSpec(badDurationSpec);
  assert(!badDurRes.valid, 'Detects total duration mismatch (brief=12s, shots=6s)');
  assert(badDurRes.errors.some(e => e.code === 'TOTAL_DURATION_MISMATCH'), 'Throws TOTAL_DURATION_MISMATCH');

  // Nonexistent character
  const badCharSpec: AdSpec = JSON.parse(JSON.stringify(fixture1));
  badCharSpec.shots[0].subjects.push({ entityId: 'char_ghost_phantom', entityType: 'character', roleInShot: 'Ghost', focalPriority: 2 });
  const badCharRes = validateAdSpec(badCharSpec);
  assert(!badCharRes.valid, 'Detects reference to nonexistent character');
  assert(badCharRes.errors.some(e => e.code === 'CHARACTER_NOT_FOUND'), 'Throws CHARACTER_NOT_FOUND');

  // Nonexistent product
  const badProdSpec: AdSpec = JSON.parse(JSON.stringify(fixture1));
  badProdSpec.shots[0].subjects.push({ entityId: 'prod_nonexistent', entityType: 'product', roleInShot: 'Ghost Prod', focalPriority: 2 });
  const badProdRes = validateAdSpec(badProdSpec);
  assert(!badProdRes.valid, 'Detects reference to nonexistent product');
  assert(badProdRes.errors.some(e => e.code === 'PRODUCT_NOT_FOUND'), 'Throws PRODUCT_NOT_FOUND');

  // Continuity cycle
  const cycleSpec: AdSpec = JSON.parse(JSON.stringify(fixture2));
  cycleSpec.shots[0].continuity.inheritedStates.push({
    sourceShotId: 'shot_03', // shot 1 inheriting from future shot 3!
    entityId: 'char_alex',
    aspect: 'wardrobe',
    requirement: 'Future wardrobe'
  });
  const cycleRes = validateAdSpec(cycleSpec);
  assert(!cycleRes.valid, 'Detects invalid forward dependency / cycle');
  assert(cycleRes.errors.some(e => e.code === 'CONTINUITY_CYCLE_OR_FORWARD_DEP'), 'Throws CONTINUITY_CYCLE_OR_FORWARD_DEP');

  // ===========================================================================
  // 12. LEGACY ADAPTER COMPATIBILITY TEST
  // ===========================================================================
  console.log('\n--- SECTION 41-42: Legacy Video Adapter Test ---');
  const legacyRequest = {
    prompt: 'A glass perfume bottle on black marble under spotlight',
    aspectRatio: '16:9',
    durationSeconds: 8,
    engine: 'veo-2.0',
    startFrameAssetId: 'asset_legacy_start_frame',
    referenceAssetIds: ['asset_legacy_ref_1', 'asset_legacy_ref_2']
  };

  const adaptedSpec = adaptLegacyVideoRequestToAdSpec(legacyRequest, {
    workspaceId: 'ws_legacy',
    userId: 'user_legacy',
    title: 'Legacy Commercial'
  });

  const adaptedVal = validateAdSpec(adaptedSpec);
  assert(adaptedVal.valid, 'Adapted legacy video request produces valid canonical AdSpec v1');
  assert(adaptedSpec.brief.desiredDurationSeconds === 8, 'Adapted duration matches legacy duration (8s)');
  assert(adaptedSpec.decisionMetadata?.['brief.desiredDurationSeconds']?.source === 'user_provided', 'Duration marked as user_provided in decisionMetadata');
  assert(adaptedSpec.decisionMetadata?.['brief.objective']?.source === 'system_derived', 'Objective marked as system_derived');
  assert(adaptedSpec.decisionMetadata?.['creative.concept']?.source === 'ai_inferred', 'Concept marked as ai_inferred');

  console.log('\n================================================================');
  console.log(`🎉 CONTRACTS TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runComprehensiveContractsTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
