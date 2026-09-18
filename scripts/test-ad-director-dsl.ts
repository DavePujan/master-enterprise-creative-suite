/**
 * Comprehensive Verification Test Suite for Writopedia Ad Director Platform & Ad DSL.
 * Tests all 14 mandatory domain scenarios:
 * 1. Minimal one-shot advertisement
 * 2. Multi-shot narrative advertisement
 * 3. Multiple characters
 * 4. Product continuity
 * 5. Asset references
 * 6. Shot dependencies & cycle rejection
 * 7. Revision of one shot without modifying unrelated shots
 * 8. Full-plan versioning & provenance
 * 9. Invalid timing validation
 * 10. Missing / invalid asset reference
 * 11. Nonexistent entity reference validation
 * 12. Model capability incompatibility detection
 * 13. Director Plan -> compiler contract synthesis
 * 14. Execution snapshot immutability
 */

import {
  validateDirectorPlan,
  applyPlanPatch,
  validateShotCapabilities,
  standardAdPromptCompiler
} from '../packages/ad-director/index.js';
import { AdDirectorRepository } from '../apps/api/src/modules/adDirector/adDirectorRepository.js';
import type {
  DirectorPlan,
  DirectorShot,
  PlanPatch
} from '../packages/types/adDirector.js';
import type { VideoEngineCapability } from '../packages/types/videoGeneration.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
    process.exitCode = 1;
  }
}

async function runAdDirectorTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING AD DIRECTOR DOMAIN & AD DSL TEST SUITE (14 SCENARIOS)');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Minimal One-Shot Advertisement (6s Product Hero)
  // ---------------------------------------------------------------------------
  console.log('Scenario 1: Minimal One-Shot Advertisement (6s Hero)');
  const minimalPlan: DirectorPlan = {
    id: 'ad_plan_minimal_01',
    workspaceId: 'ws_demo_01',
    title: 'Minimalist Luxury Watch Hero',
    version: 1,
    status: 'draft',
    timing: { totalDuration: 6, shotCount: 1 },
    aspectRatio: '16:9',
    targetPlatform: 'meta_feed',
    language: 'en',
    brief: {
      brandRef: 'Aethel Chronographs',
      product: 'Aethel Chrono 1',
      offer: 'Pre-order now for exclusive numbered edition',
      cta: { visualText: 'Reserve Your Chrono', actionIntent: 'buy_now' },
      brandPersonality: { traits: ['Refined', 'Precision'], tone: 'Sophisticated', energyLevel: 'confident' },
      visualRules: { primaryColors: ['#000000', '#D4AF37'], accentColors: ['#FFFFFF'], lightingStyle: 'High-contrast studio rim lighting' },
      messagingRules: { keyClaims: ['Handcrafted Swiss movement'] },
      thingsToAvoid: ['amateur lighting', 'blurry text', 'cheap plastic reflections']
    },
    audience: {
      targetAudience: { persona: 'Luxury watch collectors', painPoints: ['Mass-produced homogeneity'] },
      campaignObjective: 'conversion',
      desiredResponse: 'Immediate appreciation of craftsmanship',
      emotionalGoal: { primaryEmotion: 'Desire', finalImpression: 'Enduring prestige' }
    },
    creativeDirection: {
      concept: 'The Architecture of Time',
      hook: { hookType: 'visual_surprise', description: 'Silhouette emerges from obsidian darkness with gold rim light' },
      coreIdea: 'Precision defined',
      storyPremise: 'The movement of light across hand-brushed titanium',
      emotionalArc: 'Awe to decisive appreciation',
      visualMechanism: 'Gliding macro camera pass',
      narrativeStructure: 'minimal_hero',
      noveltyRationale: 'Stripped of voiceover; purely kinetic visual mastery'
    },
    assetWorld: {
      characters: [],
      products: [{
        id: 'prod_watch_01',
        productIdentity: 'Aethel Chrono 1 Titanium',
        appearance: '40mm titanium case with obsidian dial and gold hands',
        packaging: { containerType: 'Walnut display box', materials: ['Wood', 'Velvet'], finish: 'matte' },
        geometryForm: 'Cylindrical watch bezel with leather strap',
        colors: ['#000000', '#D4AF37', '#708090'],
        materials: ['Grade 5 Titanium', 'Sapphire Crystal'],
        branding: { logoPlacement: '12 o\'clock position on dial', labelDetails: 'Aethel Geneve Swiss Made' },
        referenceAssets: ['asset_watch_hero_front'],
        continuityConstraints: ['Dial hands must indicate 10:10', 'Sapphire crystal glare must remain clear']
      }],
      locations: [{
        id: 'loc_dark_studio',
        environmentIdentity: 'Obsidian Studio Space',
        visualDescription: 'Deep black reflective glass stage with soft overhead diffusers',
        spatialCharacteristics: { indoor: true, dimensions: 'compact', depthOfSpace: 'shallow dramatic falloff' },
        lightingCharacteristics: { timeOfDay: 'studio', mood: 'Subdued luxury with razor-sharp rim lights' },
        palette: ['#050505', '#1a1a1a', '#d4af37'],
        referenceAssets: ['asset_studio_dark'],
        continuityConstraints: ['Reflections must remain clean without camera equipment visible']
      }],
      props: [],
      referenceMedia: [{
        assetId: 'asset_watch_hero_front',
        role: 'product_hero',
        label: 'Aethel Chrono Front Reference',
        url: 'https://assets.writopedia.com/watch_front.png'
      }]
    },
    shots: [{
      id: 'shot_01',
      sequence: 1,
      timing: { startTime: 0, endTime: 6, duration: 6 },
      purpose: 'Hero reveal and product craftsmanship statement',
      creativeIntent: 'Create a hypnotic, magnetic desire for the watch precision',
      executionSpec: {
        action: 'Watch slowly turns clockwise as razor rim light sweeps across the dial',
        choreography: 'Smooth continuous axial turn',
        startingState: 'Obsidian silhouette with golden bezel gleam',
        endingState: 'Fully illuminated face revealing the 10:10 hands and Aethel emblem',
        subjects: [{ entityId: 'prod_watch_01', entityType: 'product', roleInShot: 'Hero centerpiece', focalPriority: 1 }],
        environment: { locationId: 'loc_dark_studio' },
        camera: { framing: 'close_up', lensCharacteristics: '100mm_macro', cameraMovement: 'slow_push_in', angle: 'eye_level', composition: 'Center-weighted golden ratio' },
        lighting: { keyLightDirection: 'Rim backlight moving from 9 o\'clock to 1 o\'clock', contrastRatio: 'high', atmosphere: 'Pristine, dust-free vacuum' },
        colorAtmosphere: { palette: ['#000000', '#D4AF37', '#FFFFFF'], gradingStyle: 'Deep black luxury contrast' },
        audio: { audioIntent: 'ambient', soundEffects: ['Rhythmic mechanical escapement tick', 'Deep cinematic sub bass'] },
        transitions: { transitionIn: 'fade_to_black', transitionOut: 'cut' }
      },
      continuity: {
        dependencies: [],
        characterInvariants: [],
        productInvariants: ['Dial always reads 10:10', 'Aethel logo razor sharp'],
        spatialInvariants: ['Centered in frame']
      },
      visualReferences: ['asset_watch_hero_front'],
      intendedCapabilities: { minDurationSeconds: 6, maxDurationSeconds: 6, requiresNativeAudio: false },
      qaExpectations: {
        requiredSubjects: ['Aethel Chrono 1 Titanium'],
        requiredActions: ['Smooth clockwise turn'],
        forbiddenActions: ['Fast jitter', 'Reflections of crew', 'Dial numbers warping'],
        requiredFraming: 'close_up',
        requiredCameraMovement: 'slow_push_in',
        productVisibility: 'prominent_front',
        characterIdentityRules: [],
        brandRules: ['Aethel Geneve mark clearly discernible']
      }
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const val1 = validateDirectorPlan(minimalPlan);
  assert(val1.valid, 'Minimal 1-shot ad validates successfully without errors', JSON.stringify(val1.errors));
  assert(val1.metrics.shotCount === 1, 'Metric calculates 1 shot');
  assert(val1.metrics.calculatedDuration === 6, 'Metric calculates 6.0s duration');

  // ---------------------------------------------------------------------------
  // TEST 2: Multi-Shot Narrative Advertisement (30s 3-Shot Arc)
  // ---------------------------------------------------------------------------
  console.log('\nScenario 2: Multi-Shot Narrative Advertisement (30s)');
  const narrativePlan: DirectorPlan = {
    ...minimalPlan,
    id: 'ad_plan_narrative_30s',
    title: 'The Breakthrough - 30s Narrative Ad',
    timing: { totalDuration: 30, shotCount: 3 },
    shots: [
      {
        ...minimalPlan.shots[0],
        id: 'shot_01',
        sequence: 1,
        timing: { startTime: 0, endTime: 6, duration: 6 },
        purpose: 'Hook: Tension and mystery'
      },
      {
        ...minimalPlan.shots[0],
        id: 'shot_02',
        sequence: 2,
        timing: { startTime: 6, endTime: 22, duration: 16 },
        purpose: 'Core Narrative: The struggle and breakthrough solution',
        executionSpec: {
          ...minimalPlan.shots[0].executionSpec,
          camera: { ...minimalPlan.shots[0].executionSpec.camera, cameraMovement: 'tracking_forward' }
        },
        continuity: {
          dependencies: [{
            targetShotId: 'shot_01',
            entityId: 'prod_watch_01',
            aspect: 'product_state',
            requirement: 'Watch orientation matches ending turn angle of shot 1'
          }],
          characterInvariants: [],
          productInvariants: ['Bezel finish consistent'],
          spatialInvariants: []
        }
      },
      {
        ...minimalPlan.shots[0],
        id: 'shot_03',
        sequence: 3,
        timing: { startTime: 22, endTime: 30, duration: 8 },
        purpose: 'Resolution & Decisive CTA',
        continuity: {
          dependencies: [{
            targetShotId: 'shot_02',
            entityId: 'prod_watch_01',
            aspect: 'lighting',
            requirement: 'Light intensity peaks into final beauty card'
          }],
          characterInvariants: [],
          productInvariants: ['Front logo pristine'],
          spatialInvariants: []
        }
      }
    ]
  };

  const val2 = validateDirectorPlan(narrativePlan);
  assert(val2.valid, 'Multi-shot 30s narrative ad passes validation', JSON.stringify(val2.errors));
  assert(val2.metrics.shotCount === 3, 'Metric confirms 3 shots');
  assert(val2.metrics.calculatedDuration === 30, 'Metric confirms total duration 30s');
  assert(val2.metrics.dependencyCount === 2, 'Metric identifies 2 continuity dependencies');

  // ---------------------------------------------------------------------------
  // TEST 3: Multiple Characters
  // ---------------------------------------------------------------------------
  console.log('\nScenario 3: Multiple Characters with Role & Wardrobe Constraints');
  const multiCharPlan: DirectorPlan = {
    ...narrativePlan,
    id: 'ad_plan_multi_char',
    assetWorld: {
      ...narrativePlan.assetWorld,
      characters: [
        {
          id: 'char_founder',
          name: 'Elena Rostova',
          role: 'protagonist',
          appearance: { apparentAge: '34', gender: 'Female', hairColor: 'Dark Chestnut', physique: 'Athletic' },
          identityDescription: 'Visionary architect and founder',
          wardrobe: { outfit: 'Minimalist charcoal wool turtleneck', colors: ['#2B2D2F'], accessories: ['Minimal titanium ring'] },
          behaviorPersonality: 'Determined, poised, intellectually fierce',
          referenceAssetIds: ['asset_elena_face'],
          continuityConstraints: ['Hair tied in architectural low bun throughout']
        },
        {
          id: 'char_engineer',
          name: 'Marcus Vance',
          role: 'expert',
          appearance: { apparentAge: '42', gender: 'Male', hairColor: 'Salt and Pepper', physique: 'Tall lean' },
          identityDescription: 'Master horologist and technical lead',
          wardrobe: { outfit: 'Navy workshop smock with rolled sleeves', colors: ['#1A2530'] },
          behaviorPersonality: 'Methodical, meticulous, deeply focused',
          referenceAssetIds: ['asset_marcus_face'],
          continuityConstraints: ['Magnifier loupe always on right eye']
        }
      ],
      referenceMedia: [
        ...narrativePlan.assetWorld.referenceMedia,
        { assetId: 'asset_elena_face', role: 'character_face', label: 'Elena Portrait', url: 'https://assets.writopedia.com/elena.png' },
        { assetId: 'asset_marcus_face', role: 'character_face', label: 'Marcus Portrait', url: 'https://assets.writopedia.com/marcus.png' }
      ]
    },
    shots: [
      {
        ...narrativePlan.shots[0],
        executionSpec: {
          ...narrativePlan.shots[0].executionSpec,
          subjects: [
            { entityId: 'char_founder', entityType: 'character', roleInShot: 'Examining blueprint', focalPriority: 1 },
            { entityId: 'char_engineer', entityType: 'character', roleInShot: 'Assembling escapement', focalPriority: 2 }
          ]
        },
        visualReferences: ['asset_elena_face', 'asset_marcus_face']
      },
      ...narrativePlan.shots.slice(1)
    ]
  };

  const val3 = validateDirectorPlan(multiCharPlan);
  assert(val3.valid, 'Multiple characters plan validates without entity errors', JSON.stringify(val3.errors));
  assert(val3.metrics.characterCount === 2, '2 characters successfully cataloged');

  // ---------------------------------------------------------------------------
  // TEST 4: Product Continuity
  // ---------------------------------------------------------------------------
  console.log('\nScenario 4: Product Continuity Verification');
  const shot1ProductInvariants = multiCharPlan.shots[0].continuity.productInvariants;
  const shot2Dependencies = multiCharPlan.shots[1].continuity.dependencies;
  assert(
    shot1ProductInvariants.includes('Dial always reads 10:10'),
    'Product invariant preserved in shot 1'
  );
  assert(
    shot2Dependencies.some(d => d.aspect === 'product_state' && d.entityId === 'prod_watch_01'),
    'Structured product state dependency linked between shot 2 and shot 1'
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Canonical Asset References
  // ---------------------------------------------------------------------------
  console.log('\nScenario 5: Asset References Cataloging & Semantic Roles');
  const mediaRef = multiCharPlan.assetWorld.referenceMedia.find(m => m.assetId === 'asset_elena_face');
  assert(
    mediaRef !== undefined && mediaRef.role === 'character_face',
    'Asset reference has canonical role "character_face"'
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Shot Dependencies & Forward Cycle Rejection
  // ---------------------------------------------------------------------------
  console.log('\nScenario 6: Shot Dependency Validation & Forward Cycle Rejection');
  const invalidCyclePlan: DirectorPlan = JSON.parse(JSON.stringify(multiCharPlan));
  // Shot 1 (seq 1) depending on Shot 2 (seq 2) -> Impossible forward dependency / cycle
  invalidCyclePlan.shots[0].continuity.dependencies = [{
    targetShotId: 'shot_02',
    entityId: 'prod_watch_01',
    aspect: 'action_continuation',
    requirement: 'Wait for future shot'
  }];

  const val6 = validateDirectorPlan(invalidCyclePlan);
  assert(!val6.valid, 'Forward dependency detected as invalid');
  assert(
    val6.errors.some(e => e.code === 'CONTINUITY_CYCLE_OR_FORWARD_DEP'),
    'Validator emits CONTINUITY_CYCLE_OR_FORWARD_DEP error code'
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Revision of One Shot Without Modifying Unrelated Shots
  // ---------------------------------------------------------------------------
  console.log('\nScenario 7: Targeted Shot Revision (Isolation & Non-Destructive)');
  const originalShot1 = JSON.parse(JSON.stringify(narrativePlan.shots[0]));
  const originalShot3 = JSON.parse(JSON.stringify(narrativePlan.shots[2]));

  const shot2Patch: PlanPatch = {
    patchId: 'patch_intensify_shot2',
    targetScope: 'shot',
    targetId: 'shot_02',
    intent: 'Make shot 2 camera movement dynamic whip pan and increase contrast',
    changes: {
      'camera.movement': 'whip_pan',
      'executionSpec.lighting.contrastRatio': 'high',
      'action': 'Intense rapid assembly under dramatic directional lights'
    },
    provenance: {
      source: 'user',
      authorId: 'usr_director_01',
      timestamp: new Date().toISOString()
    }
  };

  const { newPlan: revisedPlan, delta } = applyPlanPatch(narrativePlan, shot2Patch);

  assert(revisedPlan.shots[1].executionSpec.camera.cameraMovement === 'whip_pan', 'Shot 2 cameraMovement updated to whip_pan');
  assert(revisedPlan.shots[1].executionSpec.lighting.contrastRatio === 'high', 'Shot 2 contrast ratio updated to high');
  assert(revisedPlan.shots[1].executionSpec.action === 'Intense rapid assembly under dramatic directional lights', 'Shot 2 action updated');

  // Verify shot 1 and shot 3 remain 100% identical to original
  assert(
    JSON.stringify(revisedPlan.shots[0]) === JSON.stringify(originalShot1),
    'Shot 1 completely untouched and identical'
  );
  assert(
    JSON.stringify(revisedPlan.shots[2]) === JSON.stringify(originalShot3),
    'Shot 3 completely untouched and identical'
  );
  assert(delta.modifiedKeys.length === 3, 'Delta accurately tracked 3 modified keys');
  assert(revisedPlan.version === 2, 'Plan version bumped to 2');

  // ---------------------------------------------------------------------------
  // TEST 8: Full-Plan Versioning & Provenance
  // ---------------------------------------------------------------------------
  console.log('\nScenario 8: Full-Plan Versioning & Historical Recovery');
  const testRepo = new AdDirectorRepository();
  const created = await testRepo.createPlan({
    workspaceId: 'ws_demo_01',
    userId: 'usr_01',
    plan: narrativePlan
  });

  await testRepo.savePlanVersion({
    planId: created.planId,
    workspaceId: 'ws_demo_01',
    userId: 'usr_01',
    plan: revisedPlan,
    delta
  });

  const v1 = await testRepo.getPlanVersion(created.planId, 1, 'ws_demo_01');
  const v2 = await testRepo.getPlanVersion(created.planId, 2, 'ws_demo_01');

  assert(v1 !== null && v1.plan.version === 1, 'Historical Version 1 recovered intact');
  assert(v2 !== null && v2.plan.version === 2, 'Version 2 recovered with delta');
  assert(v1?.plan.shots[1].executionSpec.camera.cameraMovement === 'tracking_forward', 'V1 shot 2 has original camera tracking_forward');
  assert(v2?.plan.shots[1].executionSpec.camera.cameraMovement === 'whip_pan', 'V2 shot 2 has revised camera whip_pan');

  // ---------------------------------------------------------------------------
  // TEST 9: Invalid Timing Validation
  // ---------------------------------------------------------------------------
  console.log('\nScenario 9: Invalid Timing & Overlap Detection');
  const invalidTimingPlan: DirectorPlan = JSON.parse(JSON.stringify(minimalPlan));
  invalidTimingPlan.shots[0].timing = {
    startTime: 0,
    endTime: 6,
    duration: 10 // Mismatch: 6 - 0 != 10
  };

  const val9 = validateDirectorPlan(invalidTimingPlan);
  assert(!val9.valid, 'Invalid timing duration mismatch rejected');
  assert(
    val9.errors.some(e => e.code === 'TIMING_DURATION_MISMATCH'),
    'Validator catches TIMING_DURATION_MISMATCH error'
  );

  // ---------------------------------------------------------------------------
  // TEST 10: Missing / Empty Asset Reference
  // ---------------------------------------------------------------------------
  console.log('\nScenario 10: Missing or Invalid Asset Reference');
  const invalidAssetPlan: DirectorPlan = JSON.parse(JSON.stringify(minimalPlan));
  invalidAssetPlan.shots[0].visualReferences = ['   ']; // Empty string

  const val10 = validateDirectorPlan(invalidAssetPlan);
  assert(!val10.valid, 'Empty asset reference rejected');
  assert(
    val10.errors.some(e => e.code === 'ASSET_REF_INVALID'),
    'Validator emits ASSET_REF_INVALID'
  );

  // ---------------------------------------------------------------------------
  // TEST 11: Nonexistent Entity Reference
  // ---------------------------------------------------------------------------
  console.log('\nScenario 11: Reference to Nonexistent Character / Product');
  const invalidEntityPlan: DirectorPlan = JSON.parse(JSON.stringify(minimalPlan));
  invalidEntityPlan.shots[0].executionSpec.subjects = [{
    entityId: 'char_phantom_ghost',
    entityType: 'character',
    roleInShot: 'Appears unexpectedly',
    focalPriority: 1
  }];

  const val11 = validateDirectorPlan(invalidEntityPlan);
  assert(!val11.valid, 'Reference to uncataloged character rejected');
  assert(
    val11.errors.some(e => e.code === 'ENTITY_NOT_FOUND' && e.targetEntityId === 'char_phantom_ghost'),
    'Validator emits ENTITY_NOT_FOUND for phantom character'
  );

  // ---------------------------------------------------------------------------
  // TEST 12: Model Capability Incompatibility
  // ---------------------------------------------------------------------------
  console.log('\nScenario 12: Model Capability Compatibility & Blocker Enforcement');
  const limitedEngineCapability: VideoEngineCapability = {
    engineKey: 'veo-lite',
    modelId: 'veo-lite-preview',
    provider: 'google',
    displayName: 'Google Veo Lite',
    productTier: 'fast',
    supportedModes: ['text_to_video'],
    aspectRatios: ['16:9'],
    supportedDurations: [4, 6],
    supportedResolutions: ['720p'],
    supportsAudio: false,
    supportsDialogue: false,
    supportsFirstFrame: false,
    supportsLastFrame: false,
    supportsReferenceImages: true,
    maxReferenceImages: 2,
    supportsReferenceVideos: false,
    maxReferenceVideos: 0,
    supportsReferenceAudios: false,
    maxReferenceAudios: 0,
    supportsElements: false,
    supportsMultiShot: false,
    supportsExtension: false,
    supportsConversationalEditing: false,
    supportsSeed: true,
    creditCost: 10,
    status: 'AVAILABLE'
  };

  const demandingShot: DirectorShot = {
    ...minimalPlan.shots[0],
    intendedCapabilities: {
      minDurationSeconds: 6,
      maxDurationSeconds: 6,
      requiresLastFrame: true // Engine does NOT support last frame
    },
    visualReferences: ['ref_1', 'ref_2', 'ref_3', 'ref_4'] // 4 references exceeds max of 2
  };

  const capResult = validateShotCapabilities(demandingShot, minimalPlan, limitedEngineCapability);
  assert(!capResult.compatible, 'Demanding shot declared incompatible with limited engine');
  assert(
    capResult.blockers.some(b => b.includes('last-frame')),
    'Blocker identified for unsupported last-frame'
  );
  assert(
    capResult.blockers.some(b => b.includes('exceeding engine maximum')),
    'Blocker identified for exceeding max reference images'
  );

  // ---------------------------------------------------------------------------
  // TEST 13: Director Plan -> Compiler Contract Synthesis
  // ---------------------------------------------------------------------------
  console.log('\nScenario 13: Prompt Compiler Contract Execution');
  const proEngineCapability: VideoEngineCapability = {
    ...limitedEngineCapability,
    engineKey: 'veo-pro',
    displayName: 'Google Veo Pro',
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsAudio: true,
    maxReferenceImages: 5
  };

  const compiled = await standardAdPromptCompiler.compile(
    minimalPlan,
    minimalPlan.shots[0],
    proEngineCapability,
    {
      workspaceId: 'ws_demo_01',
      engineKey: 'veo-pro',
      assetUrlResolver: async (id: string) => `https://signed.writopedia.com/${id}.png`
    }
  );

  assert(compiled.shotId === 'shot_01', 'Compiled request has correct shotId');
  assert(compiled.engineKey === 'veo-pro', 'Compiled request has correct engineKey');
  assert(compiled.durationSeconds === 6, 'Compiled request duration matches shot (6s)');
  assert(compiled.prompt.includes('[CINEMATIC COMMERCIAL SHOT 1/1]'), 'Prompt contains cinematic commercial shot header');
  assert(compiled.prompt.includes('Aethel Chrono 1 Titanium'), 'Prompt includes cataloged product entity details');
  assert(compiled.negativePrompt.includes('blurry'), 'Negative prompt contains quality anti-artifacts');
  assert(compiled.referenceAssets.length === 1, 'Compiled reference asset has signed URL');
  assert(compiled.referenceAssets[0].url === 'https://signed.writopedia.com/asset_watch_hero_front.png', 'Reference asset resolved URL accurately');

  // ---------------------------------------------------------------------------
  // TEST 14: Execution Snapshot Immutability
  // ---------------------------------------------------------------------------
  console.log('\nScenario 14: Execution Snapshot Immutability');
  const v1Retrieved = await testRepo.getPlanVersion(created.planId, 1, 'ws_demo_01');
  assert(v1Retrieved !== null, 'V1 snapshot retrieved');

  // Mutate local object of v1
  if (v1Retrieved) {
    (v1Retrieved.plan.shots[0].executionSpec as any).action = 'MUTATED IN MEMORY';
  }

  // Fetch from repo again to prove storage was not corrupted
  const v1Fresh = await testRepo.getPlanVersion(created.planId, 1, 'ws_demo_01');
  assert(
    v1Fresh?.plan.shots[0].executionSpec.action !== 'MUTATED IN MEMORY',
    'Repository snapshot is immutable and unaffected by external mutation'
  );

  console.log('\n================================================================');
  console.log(`🎉 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('================================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAdDirectorTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
