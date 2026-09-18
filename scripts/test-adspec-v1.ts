/**
 * Comprehensive AdSpec v1 Domain & Invariant Test Suite.
 * Covers all required fixtures and invariant tests:
 * - FIXTURE A: 6-second product hero ad (1 shot, 1 product, no character)
 * - FIXTURE B: 18-second social ad (1 character, 1 product, 4 shots, continuity)
 * - FIXTURE C: 30-second narrative ad (2 characters, 2 locations, multiple transitions)
 * - FIXTURE D: Product-focused ad with packaging/logo constraints
 * - FIXTURE E: Shot revision invariant (modifying shot 3 camera leaves all other fields strictly untouched)
 * - FIXTURE F: Invalid references and timing detection
 * - Section 32: Strict shot revision invariance verification
 * - Section 33: Execution snapshot immutability verification
 * - Section 34: Provider independence verification
 * - Confirmed State Protection: AI cannot silently mutate user-confirmed values
 * - Legacy Adapter: Normalizes legacy VideoGenerationRequest into canonical AdSpec v1
 */

import {
  validateAdSpec,
  applyAdSpecPatch,
  createExecutionSnapshot,
  adaptLegacyVideoRequestToAdSpec
} from '../packages/ad-director/index.js';
import { AdDirectorRepository } from '../apps/api/src/modules/adDirector/adDirectorRepository.js';
import type {
  AdSpec,
  AdShot,
  AdSpecPatch
} from '../packages/types/adSpec.js';

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

async function runAdSpecTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING ADSPEC V1 FOUNDATION & INVARIANT TEST SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // FIXTURE A: 6-second product hero ad (1 shot, 1 product, no character)
  // ---------------------------------------------------------------------------
  console.log('Fixture A: 6-Second Product Hero Commercial (1 Shot, 1 Product)');
  const fixtureA: AdSpec = {
    schemaVersion: '1.0.0',
    identity: {
      adId: 'ad_serum_hero_01',
      specVersion: 1,
      revisionId: 'rev_init',
      creativeState: 'approved',
      executionState: 'idle',
      title: 'Lumina Nocturne Serum 6s Hero',
      workspaceId: 'ws_lumina_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    brief: {
      brandRef: 'Lumina Skincare',
      product: 'Nocturne Recovery Serum',
      objective: { value: 'conversion', source: 'user', confidence: 1.0, confirmed: true },
      targetAudience: {
        value: { persona: 'High-income skincare enthusiasts', painPoints: ['Dull tired skin'] },
        source: 'user',
        confidence: 1.0,
        confirmed: true
      },
      platform: 'meta_feed',
      desiredDurationSeconds: { value: 6, source: 'user', confidence: 1.0, confirmed: true },
      aspectRatio: '16:9',
      language: 'en',
      cta: {
        value: { visualText: 'Shop the Nocturne Serum', actionIntent: 'buy_now' },
        source: 'user',
        confidence: 1.0,
        confirmed: true
      },
      offer: '20% off premiere launch with code NOCTURNE',
      keyMessage: { value: 'Transform your skin while you sleep', source: 'user', confidence: 1.0, confirmed: true },
      desiredResponse: 'Immediate purchase interest',
      tone: { value: 'Serene, hypnotic luxury', source: 'user', confidence: 1.0, confirmed: true },
      emotionalGoal: { primaryEmotion: 'Calm elegance', finalImpression: 'Supreme luxury' },
      mustInclude: ['Front gold emblem', 'Golden dropper pipette'],
      mustAvoid: ['Plastic reflections', 'Amateur lighting', 'Distorted labels'],
      referencesAndInspiration: ['asset_ref_luxury_perfume'],
      userConstraints: ['Must show authentic glass dropper with viscous amber droplet']
    },
    creative: {
      concepts: [{
        conceptId: 'concept_alchemy',
        name: 'The Midnight Alchemy',
        oneLinePremise: 'Amber serum droplet descends in zero-gravity illuminated by nocturnal moonbeam',
        coreIdea: 'Nightly cellular restoration',
        hook: { hookType: 'visual_surprise', description: 'Viscous golden droplet forms on dropper rim against obsidian glass' },
        narrativeMechanism: 'Visual reverence',
        visualMechanism: 'Macro fluid physics pass',
        emotionalArc: 'Intrigue to sensory satisfaction',
        brandRole: 'The ultimate nighttime elixer',
        intendedAudienceEffect: 'Deep sensory craving for the product texture',
        noveltyRationale: 'Stripped of voiceover; purely kinetic visual mastery',
        complexityEstimate: 'low'
      }],
      selectedConceptId: 'concept_alchemy',
      selectionProvenance: { selectedBy: 'user', selectedAt: new Date().toISOString() }
    },
    brand: {
      adSpecificOverrides: {
        primaryColors: ['#0B0D17', '#D4AF37'],
        accentColors: ['#E2E8F0'],
        lightingAesthetic: 'High-contrast studio rim lighting'
      },
      priorityHierarchy: ['brand_restriction', 'campaign_rule', 'creative_direction', 'shot_preference']
    },
    assets: {
      assets: [{
        assetId: 'asset_serum_hero_front',
        semanticRole: 'product_hero',
        targetEntityId: 'prod_serum_01',
        label: 'Lumina Nocturne Serum Bottle Front',
        url: 'https://assets.writopedia.com/lumina_front.png',
        priority: 1,
        usageConstraints: ['Maintain exact label gold typography'],
        provenance: 'user'
      }]
    },
    characters: [],
    products: [{
      id: 'prod_serum_01',
      name: 'Lumina Nocturne Recovery Serum',
      referenceAssetIds: ['asset_serum_hero_front'],
      visualDescription: 'Frosted amber glass bottle with matte black pipette collar and gold font',
      shapeForm: 'Cylindrical 30ml apothecary dropper bottle',
      materials: ['Frosted Amber Glass', 'Black Anodized Aluminum', 'Gold Leaf Foil'],
      colorPalette: ['#78350F', '#000000', '#D4AF37'],
      packaging: { containerType: 'Dropper Bottle', materials: ['Glass', 'Aluminum'], finish: 'frosted' },
      branding: { logoPlacement: 'Front vertical center', labelDetails: 'LUMINA NOCTURNE 30ml / 1.0 fl oz' },
      labelLogoConstraints: ['No distortion of serif letters', 'Gold foil must glint authentically'],
      orientationConstraints: ['Upright vertical orientation at eye level'],
      allowedTransformations: ['Slow 30-degree rotation'],
      forbiddenTransformations: ['Label morphing', 'Bottle elongation', 'Color shifting'],
      continuityRequirements: ['Liquid meniscus level exactly 85% full']
    }],
    locations: [{
      id: 'loc_nocturne_stage',
      name: 'Nocturne Obsidian Stage',
      description: 'Shallow black water reflection basin under midnight volumetric blue top light',
      referenceAssetIds: [],
      architecture: 'Minimalist luxury water stage',
      spatialCharacteristics: { indoor: true, dimensions: 'compact', depthOfSpace: 'shallow dramatic falloff' },
      lightingCharacteristics: { timeOfDay: 'studio', mood: 'Mysterious midnight glow with golden highlights' },
      palette: ['#030712', '#1E293B', '#D4AF37'],
      atmosphere: 'Microscopic crystalline mist',
      continuityConstraints: ['Water surface ripples remain gentle and concentric']
    }],
    story: {
      structureType: 'minimal_hero',
      logline: 'The timeless nightly ritual of restoration captured in a single droplet.',
      beats: [{
        beatId: 'beat_hero',
        beatType: 'opening_hook',
        title: 'The Golden Droplet',
        narrativeGoal: 'Hero product texture and luxury packaging',
        assignedShotIds: ['shot_01']
      }]
    },
    shots: [{
      shotId: 'shot_01',
      sequence: 1,
      purpose: 'Hero reveal of bottle and viscous droplet suspension',
      narrativeRole: 'Hook, product demonstration, and visual CTA',
      timing: { startTime: 0, endTime: 6, duration: 6 },
      subjects: [{ entityId: 'prod_serum_01', entityType: 'product', roleInShot: 'Centerpiece', focalPriority: 1 }],
      action: {
        startingState: 'Bottle stands tall in shallow water; gold dropper pipette raises slightly above neck',
        action: 'A viscous golden amber serum droplet forms at the glass pipette tip and hangs in suspended animation',
        choreography: 'Slow controlled push-in toward the droplet as light caresses the gold foil typography',
        endingState: 'Droplet releases in slow motion, glinting as end beauty card settles'
      },
      environment: { locationId: 'loc_nocturne_stage' },
      camera: {
        shotSize: 'Macro',
        framing: 'macro',
        angle: 'eye_level',
        lensCharacteristics: '100mm_macro',
        cameraPosition: 'Frontal center 40cm distance',
        cameraMovement: 'slow_push_in',
        composition: 'Golden ratio center-weighted with water reflection',
        depthIntent: 'Razor-thin depth of field focusing on pipette tip'
      },
      lighting: {
        source: 'Top volumetric spot + lateral gold rim light',
        direction: 'Top-back 60 degrees and left rim',
        quality: 'volumetric',
        intensity: 'dramatic_low_key',
        contrast: 'high',
        colorTemperature: '4800K Neutral Warm',
        atmosphere: 'Pristine dustless studio air'
      },
      visualDirection: {
        visualIntent: 'Photorealistic commercial master grade',
        realismLevel: 'photorealistic',
        colorPalette: ['#030712', '#78350F', '#D4AF37'],
        colorGrading: 'Deep black commercial luxury',
        motionPacing: 'calm'
      },
      audio: {
        soundEffects: ['Subtle deep water drop tone', 'Ethereal ambient pad'],
        audioPriority: 'medium'
      },
      transitions: { incoming: 'fade_to_black', outgoing: 'cut' },
      referencedAssetIds: ['asset_serum_hero_front'],
      continuity: {
        inheritedStates: [],
        producedStates: [{ entityId: 'prod_serum_01', stateDescription: 'Bottle upright with droplet suspended' }]
      },
      constraints: {
        mustHappen: ['Droplet remains amber gold', 'Bottle label remains razor-sharp'],
        mustNotHappen: ['Liquid turbulence', 'Flickering reflections']
      },
      qaExpectations: {
        requiredSubjects: ['Lumina Nocturne Recovery Serum'],
        requiredActions: ['Droplet suspension on pipette'],
        forbiddenActions: ['Morphing', 'Distorted typography'],
        requiredFraming: 'macro',
        requiredCameraMovement: 'slow_push_in',
        productVisibility: 'prominent_front',
        characterIdentityRules: [],
        brandRules: ['Lumina emblem must remain upright and front-facing']
      }
    }],
    continuity: { links: [] },
    constraints: [{
      id: 'const_01',
      category: 'product',
      severity: 'must',
      rule: 'Bottle label text "LUMINA NOCTURNE" must remain front-facing throughout entire 6 seconds',
      targetEntityId: 'prod_serum_01'
    }],
    generationIntent: {
      desiredDurationSeconds: 6,
      aspectRatio: '16:9',
      qualityIntent: 'broadcast_master',
      audioRequired: true,
      continuityPriority: 'strict',
      realism: 'photorealistic',
      generationStrategy: 'shot_by_shot',
      modelRequirements: {
        requiresFirstFrame: true,
        requiresLastFrame: false,
        minimumReferenceCount: 1,
        requiresNativeAudio: false
      }
    },
    metadata: {
      authorId: 'usr_director_01',
      originatingGem: 'video_generation_gem'
    }
  };

  const valA = validateAdSpec(fixtureA);
  assert(valA.valid, 'Fixture A (6s Product Hero) validates without errors', JSON.stringify(valA.errors));
  assert(valA.metrics.shotCount === 1, 'Fixture A has 1 shot');
  assert(valA.metrics.calculatedDuration === 6, 'Fixture A duration is exactly 6.0s');
  assert(valA.metrics.confirmedFieldsCount >= 4, 'User confirmed provenance fields counted correctly');

  // ---------------------------------------------------------------------------
  // FIXTURE B: 18-second social ad (1 character, 1 product, 4 shots, continuity)
  // ---------------------------------------------------------------------------
  console.log('\nFixture B: 18-Second Social Ad (1 Character, 1 Product, 4 Shots)');
  const fixtureB: AdSpec = {
    ...fixtureA,
    identity: {
      ...fixtureA.identity,
      adId: 'ad_social_18s_02',
      title: 'Lumina 18s Social Transformation Reel'
    },
    brief: {
      ...fixtureA.brief,
      platform: 'instagram_reels',
      aspectRatio: '9:16',
      desiredDurationSeconds: { value: 18, source: 'user', confidence: 1.0, confirmed: true }
    },
    assets: {
      assets: [
        ...fixtureA.assets.assets,
        {
          assetId: 'asset_char_chloe_face',
          semanticRole: 'character_face',
          targetEntityId: 'char_chloe',
          label: 'Chloe Close Portrait',
          url: 'https://assets.writopedia.com/chloe.png',
          priority: 1,
          usageConstraints: ['Maintain facial bone structure and freckles'],
          provenance: 'user'
        }
      ]
    },
    characters: [{
      id: 'char_chloe',
      displayName: 'Chloe Martinez',
      narrativeRole: 'protagonist',
      referenceAssetIds: ['asset_char_chloe_face'],
      appearance: {
        apparentAge: '28',
        gender: 'Female',
        ethnicity: 'Latina',
        hairColor: 'Warm Brunette',
        hairStyle: 'Soft natural waves',
        distinguishingFeatures: ['Light freckles over nose bridge']
      },
      wardrobe: {
        outfit: 'Silk oyster-white camisole and linen robe',
        colors: ['#F8F9FA', '#E2E8F0']
      },
      behaviorPersonality: 'Authentic, exhausted at first then radiant and relaxed',
      identityLockStrength: 'strict',
      continuityConstraints: ['Hair remains softly tied back', 'No sudden jewelry additions'],
      forbiddenChanges: ['Altering eye color', 'Changing hairstyle mid-sequence']
    }],
    story: {
      structureType: 'problem_solution',
      logline: 'From late-night exhaustion to morning dew radiance.',
      beats: [
        { beatId: 'b1', beatType: 'opening_hook', title: 'Tired Evening', narrativeGoal: 'Establish fatigue', assignedShotIds: ['shot_01'] },
        { beatId: 'b2', beatType: 'development', title: 'The Application', narrativeGoal: 'Product in use', assignedShotIds: ['shot_02'] },
        { beatId: 'b3', beatType: 'escalation', title: 'Overnight Rejuvenation', narrativeGoal: 'Cellular transformation', assignedShotIds: ['shot_03'] },
        { beatId: 'b4', beatType: 'climax_payoff', title: 'Morning Radiance', narrativeGoal: 'Glowing result & CTA', assignedShotIds: ['shot_04'] }
      ]
    },
    shots: [
      {
        ...fixtureA.shots[0],
        shotId: 'shot_01',
        sequence: 1,
        timing: { startTime: 0, endTime: 4.5, duration: 4.5 },
        subjects: [{ entityId: 'char_chloe', entityType: 'character', roleInShot: 'Exhausted protagonist', focalPriority: 1 }],
        action: {
          startingState: 'Chloe sits at minimalist vanity mirror looking tired after long workday',
          action: 'She sighs gently, gently touching her tired under-eyes before reaching for the bottle',
          choreography: 'Hand reaches into frame toward vanity tray',
          endingState: 'Fingers rest upon the Lumina Nocturne bottle'
        },
        referencedAssetIds: ['asset_char_chloe_face'],
        continuity: {
          inheritedStates: [],
          producedStates: [{ entityId: 'char_chloe', stateDescription: 'Hand resting on bottle' }]
        }
      },
      {
        ...fixtureA.shots[0],
        shotId: 'shot_02',
        sequence: 2,
        timing: { startTime: 4.5, endTime: 9.0, duration: 4.5 },
        subjects: [
          { entityId: 'char_chloe', entityType: 'character', roleInShot: 'Applying serum', focalPriority: 1 },
          { entityId: 'prod_serum_01', entityType: 'product', roleInShot: 'In-use applicator', focalPriority: 2 }
        ],
        action: {
          startingState: 'Chloe holds dropper poised above cheekbone',
          action: 'A single amber droplet falls smoothly onto cheek and she presses it into skin with a soft smile',
          choreography: 'Gentle upward massage with fingertips',
          endingState: 'Face relaxed with light sheen on cheek'
        },
        referencedAssetIds: ['asset_char_chloe_face', 'asset_serum_hero_front'],
        continuity: {
          inheritedStates: [{ sourceShotId: 'shot_01', entityId: 'char_chloe', aspect: 'wardrobe', requirement: 'Identical oyster silk camisole' }],
          producedStates: [{ entityId: 'char_chloe', stateDescription: 'Serum applied to cheek' }]
        }
      },
      {
        ...fixtureA.shots[0],
        shotId: 'shot_03',
        sequence: 3,
        timing: { startTime: 9.0, endTime: 13.5, duration: 4.5 },
        subjects: [{ entityId: 'prod_serum_01', entityType: 'product', roleInShot: 'Centerpiece', focalPriority: 1 }],
        action: {
          startingState: 'Bottle on bedside table as room lighting transitions from moonlight blue to golden sunrise',
          action: 'Shadows shift dynamically as dawn sunlight hits the amber bottle and illuminates the golden formula',
          choreography: 'Camera tracks laterally around bottle',
          endingState: 'Golden sunlight floods the scene'
        },
        referencedAssetIds: ['asset_serum_hero_front'],
        continuity: {
          inheritedStates: [{ sourceShotId: 'shot_02', entityId: 'prod_serum_01', aspect: 'product_state', requirement: 'Bottle cap closed on table' }],
          producedStates: [{ entityId: 'prod_serum_01', stateDescription: 'Bathed in morning sunlight' }]
        }
      },
      {
        ...fixtureA.shots[0],
        shotId: 'shot_04',
        sequence: 4,
        timing: { startTime: 13.5, endTime: 18.0, duration: 4.5 },
        subjects: [{ entityId: 'char_chloe', entityType: 'character', roleInShot: 'Radiant morning payoff', focalPriority: 1 }],
        action: {
          startingState: 'Chloe opens eyes in morning sunlight looking effortlessly radiant and hydrated',
          action: 'She smiles into mirror with fresh dewy skin and turns to camera confidently',
          choreography: 'Turn toward lens with natural morning warmth',
          endingState: 'Confident joyful gaze as CTA overlays'
        },
        referencedAssetIds: ['asset_char_chloe_face'],
        continuity: {
          inheritedStates: [{ sourceShotId: 'shot_03', entityId: 'char_chloe', aspect: 'expression', requirement: 'Morning waking state' }],
          producedStates: [{ entityId: 'char_chloe', stateDescription: 'Radiant and smiling' }]
        }
      }
    ],
    continuity: {
      links: [
        { fromShotId: 'shot_01', toShotId: 'shot_02', entityId: 'char_chloe', aspect: 'wardrobe', invariant: 'Silk camisole identical' },
        { fromShotId: 'shot_02', toShotId: 'shot_03', entityId: 'prod_serum_01', aspect: 'product_state', invariant: 'Bottle on table' },
        { fromShotId: 'shot_03', toShotId: 'shot_04', entityId: 'char_chloe', aspect: 'lighting', invariant: 'Morning sunlight continuum' }
      ]
    },
    generationIntent: {
      ...fixtureA.generationIntent,
      desiredDurationSeconds: 18,
      aspectRatio: '9:16'
    }
  };

  const valB = validateAdSpec(fixtureB);
  assert(valB.valid, 'Fixture B (18s Social Ad) validates with 4 contiguous shots', JSON.stringify(valB.errors));
  assert(valB.metrics.shotCount === 4, 'Fixture B has 4 shots');
  assert(valB.metrics.calculatedDuration === 18, 'Fixture B duration is 18.0s');
  assert(valB.metrics.characterCount === 1, 'Fixture B has 1 character');

  // ---------------------------------------------------------------------------
  // FIXTURE C: 30-Second Narrative Ad (2 Characters, 2 Locations, Transitions)
  // ---------------------------------------------------------------------------
  console.log('\nFixture C: 30-Second Narrative Commercial (2 Characters, 2 Locations)');
  const fixtureC: AdSpec = {
    ...fixtureB,
    identity: {
      ...fixtureB.identity,
      adId: 'ad_narrative_30s_03',
      title: 'Lumina 30s Cinematic Master'
    },
    brief: {
      ...fixtureB.brief,
      aspectRatio: '16:9',
      desiredDurationSeconds: { value: 30, source: 'user', confidence: 1.0, confirmed: true }
    },
    characters: [
      fixtureB.characters[0],
      {
        id: 'char_dr_elena',
        displayName: 'Dr. Elena Rostova',
        narrativeRole: 'expert',
        referenceAssetIds: ['asset_char_chloe_face'],
        appearance: { apparentAge: '38', gender: 'Female', ethnicity: 'Caucasian', hairColor: 'Silver Blonde' },
        wardrobe: { outfit: 'Tailored white laboratory coat over navy blouse', colors: ['#FFFFFF', '#0F172A'] },
        behaviorPersonality: 'Poised, scientifically authoritative, warm',
        identityLockStrength: 'strict',
        continuityConstraints: ['Hair pinned in clean French twist'],
        forbiddenChanges: ['Changing laboratory attire']
      }
    ],
    locations: [
      fixtureA.locations[0],
      {
        id: 'loc_zurich_lab',
        name: 'Zurich Botanical Formulation Lab',
        description: 'High-tech glass formulation lab overlooking the Swiss Alps',
        referenceAssetIds: [],
        architecture: 'Minimalist glass and stainless steel laboratory',
        spatialCharacteristics: { indoor: true, dimensions: 'spacious', depthOfSpace: 'deep alpine backdrop' },
        lightingCharacteristics: { timeOfDay: 'midday', mood: 'Pristine diffused daylight' },
        palette: ['#FFFFFF', '#94A3B8', '#38BDF8'],
        atmosphere: 'Cleanroom purified air',
        continuityConstraints: ['Alpine mountains visible through glass windows']
      }
    ],
    shots: [
      {
        ...fixtureB.shots[0],
        timing: { startTime: 0, endTime: 7.5, duration: 7.5 }
      },
      {
        ...fixtureB.shots[1],
        timing: { startTime: 7.5, endTime: 15.0, duration: 7.5 },
        environment: { locationId: 'loc_zurich_lab' },
        subjects: [{ entityId: 'char_dr_elena', entityType: 'character', roleInShot: 'Formulator inspecting active lipids', focalPriority: 1 }],
        continuity: {
          inheritedStates: [{ sourceShotId: 'shot_01', entityId: 'char_chloe', aspect: 'expression', requirement: 'Problem established' }],
          producedStates: [{ entityId: 'char_dr_elena', stateDescription: 'Formula validated' }]
        }
      },
      {
        ...fixtureB.shots[2],
        timing: { startTime: 15.0, endTime: 22.5, duration: 7.5 },
        continuity: {
          inheritedStates: [{ sourceShotId: 'shot_02', entityId: 'prod_serum_01', aspect: 'product_state', requirement: 'Formula certified' }],
          producedStates: [{ entityId: 'prod_serum_01', stateDescription: 'Beauty reveal' }]
        }
      },
      {
        ...fixtureB.shots[3],
        timing: { startTime: 22.5, endTime: 30.0, duration: 7.5 },
        continuity: {
          inheritedStates: [{ sourceShotId: 'shot_03', entityId: 'char_chloe', aspect: 'expression', requirement: 'Glow payoff' }],
          producedStates: [{ entityId: 'char_chloe', stateDescription: 'Final payoff' }]
        }
      }
    ],
    generationIntent: {
      ...fixtureB.generationIntent,
      desiredDurationSeconds: 30,
      aspectRatio: '16:9'
    }
  };

  const valC = validateAdSpec(fixtureC);
  assert(valC.valid, 'Fixture C (30s Narrative Ad) validates successfully', JSON.stringify(valC.errors));
  assert(valC.metrics.characterCount === 2, 'Fixture C has 2 characters');
  assert(valC.metrics.locationCount === 2, 'Fixture C has 2 locations');
  assert(valC.metrics.calculatedDuration === 30, 'Fixture C duration is 30.0s');

  // ---------------------------------------------------------------------------
  // FIXTURE D: Product-Focused Ad with Packaging/Logo Constraints
  // ---------------------------------------------------------------------------
  console.log('\nFixture D: Product Constraints Verification');
  const productConstraints = fixtureA.products[0].labelLogoConstraints;
  assert(
    productConstraints.includes('No distortion of serif letters'),
    'Label logo constraints properly cataloged on product'
  );
  assert(
    fixtureA.constraints.some(c => c.category === 'product' && c.severity === 'must'),
    'First-class must constraint cataloged in constraints dictionary'
  );

  // ---------------------------------------------------------------------------
  // SECTION 32: SHOT REVISION INVARIANT TEST (ISOLATION & PURITY)
  // ---------------------------------------------------------------------------
  console.log('\nSection 32: Shot Revision Invariant Test (Modifying Shot 3 Only)');
  const shot1Pre = JSON.parse(JSON.stringify(fixtureB.shots[0]));
  const shot2Pre = JSON.parse(JSON.stringify(fixtureB.shots[1]));
  const shot4Pre = JSON.parse(JSON.stringify(fixtureB.shots[3]));
  const briefPre = JSON.parse(JSON.stringify(fixtureB.brief));
  const brandPre = JSON.parse(JSON.stringify(fixtureB.brand));
  const charsPre = JSON.parse(JSON.stringify(fixtureB.characters));
  const prodsPre = JSON.parse(JSON.stringify(fixtureB.products));
  const locsPre = JSON.parse(JSON.stringify(fixtureB.locations));

  const shot3Patch: AdSpecPatch = {
    revisionId: 'rev_shot3_camera_push',
    targetScope: 'shot',
    targetEntityId: 'shot_03',
    reason: 'Make shot 3 camera movement dynamic orbital arc with dramatic contrast',
    changes: {
      'camera.cameraMovement': 'orbital_arc',
      'camera.framing': 'close_up',
      'lighting.contrast': 'high'
    },
    actor: { id: 'usr_director_01', role: 'user' },
    timestamp: new Date().toISOString()
  };

  const { newSpec: revisedSpec, delta: shotDelta } = applyAdSpecPatch(fixtureB, shot3Patch);

  // Verify Shot 3 modified
  assert(revisedSpec.shots[2].camera.cameraMovement === 'orbital_arc', 'Shot 3 cameraMovement updated to orbital_arc');
  assert(revisedSpec.shots[2].camera.framing === 'close_up', 'Shot 3 framing updated to close_up');
  assert(revisedSpec.shots[2].lighting.contrast === 'high', 'Shot 3 lighting contrast updated to high');

  // Verify ALL UNRELATED FIELDS REMAIN 100% UNCHANGED
  assert(JSON.stringify(revisedSpec.shots[0]) === JSON.stringify(shot1Pre), 'Shot 1 remained 100% untouched');
  assert(JSON.stringify(revisedSpec.shots[1]) === JSON.stringify(shot2Pre), 'Shot 2 remained 100% untouched');
  assert(JSON.stringify(revisedSpec.shots[3]) === JSON.stringify(shot4Pre), 'Shot 4 remained 100% untouched');
  assert(JSON.stringify(revisedSpec.brief) === JSON.stringify(briefPre), 'Brief remained 100% untouched');
  assert(JSON.stringify(revisedSpec.brand) === JSON.stringify(brandPre), 'Brand remained 100% untouched');
  assert(JSON.stringify(revisedSpec.characters) === JSON.stringify(charsPre), 'Characters remained 100% untouched');
  assert(JSON.stringify(revisedSpec.products) === JSON.stringify(prodsPre), 'Products remained 100% untouched');
  assert(JSON.stringify(revisedSpec.locations) === JSON.stringify(locsPre), 'Locations remained 100% untouched');
  assert(revisedSpec.identity.specVersion === 2, 'AdSpec specVersion bumped from 1 to 2');
  assert(revisedSpec.identity.parentVersionId === `${fixtureB.identity.adId}_v1`, 'parentVersionId accurately records v1 ancestry');
  assert(shotDelta.modifiedPaths.length === 3, 'Delta recorded exactly 3 modified paths');

  // ---------------------------------------------------------------------------
  // SECTION 33: EXECUTION SNAPSHOT IMMUTABILITY TEST
  // ---------------------------------------------------------------------------
  console.log('\nSection 33: Execution Snapshot Immutability Test');
  const executionSnapshot = createExecutionSnapshot(revisedSpec, 'usr_director_01');

  assert(executionSnapshot.snapshotId.startsWith(`snap_${revisedSpec.identity.adId}_v2`), 'Execution snapshot generated with version-tagged ID');
  assert(executionSnapshot.frozenAdSpec.shots[2].camera.cameraMovement === 'orbital_arc', 'Snapshot contains exact v2 shot 3 state');

  // Modify draft to v3
  const shot3DraftPatch: AdSpecPatch = {
    revisionId: 'rev_shot3_draft_v3',
    targetScope: 'shot',
    targetEntityId: 'shot_03',
    reason: 'Experimenting with whip pan in subsequent draft',
    changes: {
      'camera.cameraMovement': 'whip_pan'
    },
    actor: { id: 'usr_director_01', role: 'user' },
    timestamp: new Date().toISOString()
  };

  const { newSpec: draftV3 } = applyAdSpecPatch(revisedSpec, shot3DraftPatch);
  assert(draftV3.identity.specVersion === 3, 'Draft successfully advanced to specVersion 3');
  assert(draftV3.shots[2].camera.cameraMovement === 'whip_pan', 'Draft v3 now has whip_pan');

  // VERIFY: The previously created Execution Snapshot still retains v2 orbital_arc!
  assert(
    executionSnapshot.frozenAdSpec.shots[2].camera.cameraMovement === 'orbital_arc',
    'IMMUTABILITY VERIFIED: Execution snapshot E1 remains completely unchanged despite live draft advancing to v3'
  );

  // ---------------------------------------------------------------------------
  // SECTION 34: PROVIDER INDEPENDENCE TEST
  // ---------------------------------------------------------------------------
  console.log('\nSection 34: Provider Independence Test');
  const adSpecRawString = JSON.stringify(fixtureA);
  assert(!adSpecRawString.includes('veo-pro'), 'AdSpec does not contain Veo provider key');
  assert(!adSpecRawString.includes('fal.ai'), 'AdSpec does not contain Fal endpoints or keys');
  assert(!adSpecRawString.includes('seedance'), 'AdSpec does not contain Seedance payloads');
  assert(!adSpecRawString.includes('providerJobId'), 'AdSpec does not contain temporary provider job IDs');

  // ---------------------------------------------------------------------------
  // CONFIRMED STATE PROTECTION TEST
  // ---------------------------------------------------------------------------
  console.log('\nConfirmed State Protection Test (AI cannot mutate user-confirmed values)');
  let aiMutationBlocked = false;
  try {
    const unauthorizedAiPatch: AdSpecPatch = {
      revisionId: 'rev_ai_tamper',
      targetScope: 'brief',
      reason: 'AI director attempting to unilaterally reduce duration from 6s to 4s',
      changes: {
        'desiredDurationSeconds.value': 4
      },
      actor: { id: 'ai_director_agent', role: 'ai_director' },
      timestamp: new Date().toISOString()
    };
    applyAdSpecPatch(fixtureA, unauthorizedAiPatch);
  } catch (err: any) {
    if (err.message.includes('Confirmed state protection violation')) {
      aiMutationBlocked = true;
    }
  }
  assert(aiMutationBlocked, 'AI mutation of user-confirmed field blocked with explicit protection error');

  // ---------------------------------------------------------------------------
  // FIXTURE F: INVALID REFERENCES & TIMING DETECTION
  // ---------------------------------------------------------------------------
  console.log('\nFixture F: Invalid References and Timing Detection');
  const invalidTimingSpec: AdSpec = JSON.parse(JSON.stringify(fixtureA));
  invalidTimingSpec.shots[0].timing = {
    startTime: 0,
    endTime: 6,
    duration: 10 // Mismatch: 6 - 0 !== 10
  };
  const valF1 = validateAdSpec(invalidTimingSpec);
  assert(!valF1.valid && valF1.errors.some(e => e.code === 'TIMING_DURATION_MISMATCH'), 'Caught TIMING_DURATION_MISMATCH');

  const invalidEntitySpec: AdSpec = JSON.parse(JSON.stringify(fixtureA));
  invalidEntitySpec.shots[0].subjects = [{
    entityId: 'char_phantom_ghost',
    entityType: 'character',
    roleInShot: 'Uncataloged ghost',
    focalPriority: 1
  }];
  const valF2 = validateAdSpec(invalidEntitySpec);
  assert(!valF2.valid && valF2.errors.some(e => e.code === 'CHARACTER_NOT_FOUND'), 'Caught CHARACTER_NOT_FOUND for phantom character');

  // ---------------------------------------------------------------------------
  // LEGACY ADAPTER TEST
  // ---------------------------------------------------------------------------
  console.log('\nLegacy Adapter Test (VideoGenerationRequest -> AdSpec v1)');
  const adaptedSpec = adaptLegacyVideoRequestToAdSpec(
    {
      prompt: 'Cinematic shot of luxury wristwatch in obsidian water stage',
      aspectRatio: '16:9',
      durationSeconds: 8,
      startFrameAssetId: 'asset_start_01',
      referenceAssetIds: ['asset_ref_01', 'asset_ref_02']
    },
    {
      workspaceId: 'ws_test_01',
      userId: 'usr_test_01',
      title: 'Adapted Legacy Luxury Commercial'
    }
  );

  const valAdapted = validateAdSpec(adaptedSpec);
  assert(valAdapted.valid, 'Adapted legacy request produces valid canonical AdSpec v1', JSON.stringify(valAdapted.errors));
  assert(adaptedSpec.shots[0].timing.duration === 8, 'Adapted shot duration matches legacy input (8s)');
  assert(adaptedSpec.assets.assets.length === 3, 'Adapted asset catalog created for start frame + 2 references');

  console.log('\n================================================================');
  console.log(`🎉 ADSPEC V1 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdSpecTestSuite().catch(err => {
  console.error('Fatal error running AdSpec test suite:', err);
  process.exit(1);
});
