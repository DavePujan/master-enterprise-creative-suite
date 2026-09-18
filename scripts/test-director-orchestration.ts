/**
 * Comprehensive AI Advertising Director Orchestration Test Suite.
 * Validates the operation-based AI boundary:
 * DirectorContext → Stage → StructuredOperation → Validator → StateManager → AdSpec.
 *
 * Covers all 14 mandatory test scenarios (TEST A through TEST N):
 * - TEST A: User gives minimal brief -> Interviewer identifies missing info.
 * - TEST B: User answers one missing question -> Only relevant brief field changes.
 * - TEST C: Creative Director creates 3 genuinely different concepts with distinct mechanisms.
 * - TEST D: User selects concept 2 -> Concept selected and confirmed.
 * - TEST E: Story Architect creates structured narrative arc.
 * - TEST F: Shot Director creates multi-shot storyboard with temporal action beats & camera intent.
 * - TEST G: Targeted Revision: "Make shot 3 more intense" -> Only shot 3 modified.
 * - TEST H: Revision: "Move gym to beach" -> Impact analysis classifies direct, indirect, and unaffected fields.
 * - TEST I: Continuity conflict: white shirt -> black shirt without approved change -> CONFLICT.
 * - TEST J: User-confirmed product geometry changed by AI proposal -> Blocked / requires confirmation.
 * - TEST K: Execution snapshot v4, then draft v5 -> Snapshot remains v4.
 * - TEST L: Malformed LLM operation -> No AdSpec mutation.
 * - TEST M: Operation targets nonexistent shot -> No mutation.
 * - TEST N: Approved AdSpec receives unauthorized mutation -> Blocked.
 */

import {
  applyDirectorOperation,
  analyzeChangeImpact,
  checkContinuity,
  validateDirectorOperation,
  evaluateApprovalPolicy,
  runDirectorStage,
  executeInterviewerStage,
  executeBriefAnalyzerStage,
  executeCreativeDirectorStage,
  executeStoryArchitectStage,
  executeShotDirectorStage,
  executeContinuitySupervisorStage,
  executeRevisionEngineStage,
  createExecutionSnapshot,
  validateAdSpec
} from '../packages/ad-director/index.js';
import type {
  AdSpec,
  AdShot,
  ProvenanceValue
} from '../packages/types/adSpec.js';
import type {
  DirectorContext,
  DirectorOperation,
  ChangeImpactAnalysis,
  ContinuityReport
} from '../packages/types/directorOperations.js';

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

function makeInitialAdSpec(options: {
  adId?: string;
  creativeState?: any;
  version?: number;
  productConfirmed?: boolean;
}): AdSpec {
  return {
    schemaVersion: '1.0.0',
    identity: {
      adId: options.adId || 'ad_lumina_launch_01',
      specVersion: options.version || 1,
      revisionId: 'rev_init',
      creativeState: options.creativeState || 'discovery',
      executionState: 'idle',
      title: 'Lumina Commercial Campaign',
      workspaceId: 'ws_prod_01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    brief: {
      brandRef: 'Brand Default',
      product: 'Commercial Product',
      objective: { value: 'awareness', source: 'user', confidence: 1.0, confirmed: true },
      targetAudience: {
        persona: 'Discerning consumer',
        painPoints: ['Inefficient alternatives'],
        demographics: 'Ages 25-45'
      },
      platform: 'instagram_reels',
      placement: 'Feed & Stories',
      desiredDurationSeconds: { value: 9, source: 'user', confidence: 1.0, confirmed: true },
      aspectRatio: '9:16',
      language: 'en',
      cta: {
        value: { visualText: '', actionIntent: 'learn_more' },
        source: 'ai_proposed',
        confidence: 0.5,
        confirmed: false
      },
      keyMessage: { value: 'Precision luxury', source: 'ai_proposed', confidence: 0.7, confirmed: false },
      desiredResponse: 'Desire to experience product',
      tone: { value: 'Modern & Confident', source: 'user', confidence: 1.0, confirmed: true },
      emotionalGoal: { primaryEmotion: 'Awe', finalImpression: 'Empowerment' },
      mustInclude: ['Clean logo display'],
      mustAvoid: ['Visual flicker', 'Distorted labels'],
      referencesAndInspiration: [],
      userConstraints: []
    },
    creative: {
      concepts: [],
      selectedConceptId: undefined
    },
    brand: {
      adSpecificOverrides: {},
      priorityHierarchy: ['brand_restriction', 'campaign_rule', 'creative_direction', 'shot_preference']
    },
    assets: {
      assets: []
    },
    characters: [
      {
        id: 'char_sarah',
        displayName: 'Sarah (Creative Founder)',
        narrativeRole: 'protagonist',
        referenceAssetIds: ['ast_sarah_01'],
        appearance: {
          gender: 'female',
          apparentAge: '30s',
          hairColor: 'Dark Chestnut',
          hairStyle: 'Sleek Bob'
        },
        wardrobe: {
          outfit: 'Crisp white cotton shirt',
          colors: ['#FFFFFF', '#1A1A1A']
        },
        behaviorPersonality: 'Confident, meticulous, poised',
        identityLockStrength: 'strict',
        continuityConstraints: ['Wardrobe must remain consistent unless scene cut occurs'],
        forbiddenChanges: ['Altering hair color', 'Distorting facial proportions']
      }
    ],
    products: [
      {
        id: 'prod_lumina_serum',
        name: 'Lumina Nocturne Serum',
        referenceAssetIds: ['ast_lumina_packshot_01'],
        visualDescription: 'Frosted amber glass cylindrical bottle with brushed gold dropper collar',
        shapeForm: 'Cylindrical 30ml dropper bottle',
        materials: ['frosted amber glass', 'brushed anodized gold', 'black rubber pipette'],
        colorPalette: ['#B45309', '#D97706', '#F59E0B'],
        packaging: {
          containerType: 'dropper_bottle',
          materials: ['frosted_glass', 'brushed_gold'],
          finish: options.productConfirmed ? 'matte' : 'gloss',
          closureType: 'dropper_pipette'
        },
        branding: {
          logoPlacement: 'Vertically centered on front face',
          labelDetails: 'Embossed gold foil typography "LUMINA NOCTURNE"'
        },
        labelLogoConstraints: ['Logo must remain strictly horizontal and undistorted'],
        orientationConstraints: ['Upright orientation preferred in hero shots'],
        allowedTransformations: ['slow axial rotation', 'macro depth of field racking'],
        forbiddenTransformations: ['crushing bottle', 'inverting label typography'],
        continuityRequirements: ['Liquid meniscus level must remain consistent']
      }
    ],
    locations: [
      {
        id: 'loc_gym',
        name: 'Minimalist Modern Gym',
        description: 'Polished concrete, matte black equipment, floor-to-ceiling glass mirrors',
        referenceAssetIds: ['ast_gym_01'],
        architecture: 'Industrial Brutalist Minimal',
        spatialCharacteristics: {
          indoor: true,
          dimensions: 'spacious',
          depthOfSpace: 'Long focal hallway with reflective polished floor'
        },
        lightingCharacteristics: {
          timeOfDay: 'midday',
          mood: 'High-contrast directional daylight with subtle rim highlights'
        },
        palette: ['#1A1A1A', '#525252', '#E5E5E5'],
        atmosphere: 'Pristine, intense, focused',
        continuityConstraints: ['Polished concrete reflections must remain stable']
      }
    ],
    story: {
      structureType: 'minimal_hero',
      logline: 'An elevated commercial experience highlighting Lumina serum.',
      beats: []
    },
    shots: [
      {
        shotId: 'shot_01',
        sequence: 1,
        purpose: 'Establish atmosphere and protagonist in gym setting',
        narrativeRole: 'Opening hook',
        timing: { startTime: 0, endTime: 3, duration: 3 },
        subjects: [
          { entityId: 'char_sarah', entityType: 'character', roleInShot: 'Protagonist', focalPriority: 1 }
        ],
        action: {
          startingState: 'Sarah sits on bench in gym, focusing intently.',
          action: 'Sarah raises her gaze toward the mirror with calm determination.',
          choreography: '0.0s-1.5s: Still focus. 1.5s-3.0s: Confident head turn towards lens plane.',
          endingState: 'Sarah looks directly at camera.'
        },
        environment: { locationId: 'loc_gym' },
        camera: {
          shotSize: 'medium_shot',
          framing: 'medium_shot',
          angle: 'eye_level',
          lensCharacteristics: '50mm_natural',
          cameraPosition: 'front_centered',
          cameraMovement: 'slow_push_in',
          composition: 'rule_of_thirds',
          depthIntent: 'medium_focus'
        },
        lighting: {
          source: 'Soft directional fill',
          direction: 'Lateral left',
          quality: 'soft_diffuse',
          intensity: 'high_key',
          contrast: 'medium',
          colorTemperature: '5400K',
          atmosphere: 'Clean high-key gym atmosphere'
        },
        visualDirection: {
          visualIntent: 'Athletic premium commercial.',
          realismLevel: 'photorealistic',
          colorPalette: ['#1A1A1A', '#FFFFFF'],
          colorGrading: 'Cool commercial',
          motionPacing: 'fluid'
        },
        audio: {
          soundEffects: ['Subtle rhythmic breath'],
          audioPriority: 'high'
        },
        transitions: { incoming: 'none', outgoing: 'cut' },
        referencedAssetIds: [],
        continuity: {
          inheritedStates: [],
          producedStates: [{ entityId: 'char_sarah', stateDescription: 'Looking at camera' }]
        },
        constraints: { mustHappen: ['Show Sarah clearly'], mustNotHappen: ['Face distortion'] },
        qaExpectations: {
          requiredSubjects: ['Sarah'],
          requiredActions: ['Looking towards camera'],
          forbiddenActions: ['Unnatural jitter'],
          requiredFraming: 'medium_shot',
          requiredCameraMovement: 'slow_push_in',
          productVisibility: 'none',
          characterIdentityRules: ['Crisp white cotton shirt'],
          brandRules: []
        }
      },
      {
        shotId: 'shot_02',
        sequence: 2,
        purpose: 'Protagonist reaches for Lumina Serum',
        narrativeRole: 'Setup',
        timing: { startTime: 3, endTime: 6, duration: 3 },
        subjects: [
          { entityId: 'char_sarah', entityType: 'character', roleInShot: 'Protagonist', focalPriority: 1 },
          { entityId: 'prod_lumina_serum', entityType: 'product', roleInShot: 'Hero object', focalPriority: 2 }
        ],
        action: {
          startingState: 'Sarah looking at camera.',
          action: 'Sarah reaches down to pick up the serum bottle.',
          choreography: '3.0s-4.5s: Reaches forward. 4.5s-6.0s: Lifts bottle into frame.',
          endingState: 'Sarah holds Lumina Serum in hand.'
        },
        environment: { locationId: 'loc_gym' },
        camera: {
          shotSize: 'close_up',
          framing: 'close_up',
          angle: 'eye_level',
          lensCharacteristics: '85mm_portrait',
          cameraPosition: 'profile_right',
          cameraMovement: 'static',
          composition: 'center_weighted',
          depthIntent: 'shallow_cinematic'
        },
        lighting: {
          source: 'Rimlight + key',
          direction: 'Frontal',
          quality: 'soft_diffuse',
          intensity: 'high_key',
          contrast: 'medium',
          colorTemperature: '5400K',
          atmosphere: 'Clean'
        },
        visualDirection: {
          visualIntent: 'Tactile interaction.',
          realismLevel: 'photorealistic',
          colorPalette: ['#1A1A1A', '#FFFFFF'],
          colorGrading: 'Cool commercial',
          motionPacing: 'fluid'
        },
        audio: { soundEffects: ['Glass touch'], audioPriority: 'high' },
        transitions: { incoming: 'cut', outgoing: 'cut' },
        referencedAssetIds: [],
        continuity: {
          inheritedStates: [{ sourceShotId: 'shot_01', entityId: 'char_sarah', aspect: 'wardrobe', requirement: 'White shirt' }],
          producedStates: [{ entityId: 'prod_lumina_serum', stateDescription: 'Held in hand' }]
        },
        constraints: { mustHappen: ['Product visible'], mustNotHappen: [] },
        qaExpectations: {
          requiredSubjects: ['Sarah', 'Lumina Serum'],
          requiredActions: ['Picking up bottle'],
          forbiddenActions: [],
          requiredFraming: 'close_up',
          requiredCameraMovement: 'static',
          productVisibility: 'in_use',
          characterIdentityRules: ['Crisp white cotton shirt'],
          brandRules: ['Clean label']
        }
      },
      {
        shotId: 'shot_03',
        sequence: 3,
        purpose: 'Hero macro shot of Lumina Serum application',
        narrativeRole: 'Product moment',
        timing: { startTime: 6, endTime: 9, duration: 3 },
        subjects: [
          { entityId: 'prod_lumina_serum', entityType: 'product', roleInShot: 'Hero product', focalPriority: 1 }
        ],
        action: {
          startingState: 'Bottle held at eye level.',
          action: 'Dropper releases golden amber droplet in extreme slow motion.',
          choreography: '6.0s-7.5s: Dropper draws droplet. 7.5s-9.0s: Droplet suspends and falls.',
          endingState: 'Droplet falls towards palm.'
        },
        environment: { locationId: 'loc_gym' },
        camera: {
          shotSize: 'close_up',
          framing: 'extreme_close_up',
          angle: 'eye_level',
          lensCharacteristics: '100mm_macro',
          cameraPosition: 'front_macro',
          cameraMovement: 'static',
          composition: 'center_weighted',
          depthIntent: 'ultra_shallow_f1.4'
        },
        lighting: {
          source: 'Backlit specular key',
          direction: 'Backlight',
          quality: 'specular',
          intensity: 'high_key',
          contrast: 'high',
          colorTemperature: '5400K',
          atmosphere: 'Golden optical glow'
        },
        visualDirection: {
          visualIntent: 'Macro liquid luxury.',
          realismLevel: 'photorealistic',
          colorPalette: ['#D97706', '#000000'],
          colorGrading: 'Warm luxury',
          motionPacing: 'calm'
        },
        audio: { soundEffects: ['Liquid drop resonance'], audioPriority: 'high' },
        transitions: { incoming: 'cut', outgoing: 'dissolve' },
        referencedAssetIds: [],
        continuity: {
          inheritedStates: [{ sourceShotId: 'shot_02', entityId: 'prod_lumina_serum', aspect: 'product_state', requirement: 'Held in hand' }],
          producedStates: [{ entityId: 'prod_lumina_serum', stateDescription: 'Droplet released' }]
        },
        constraints: { mustHappen: ['Amber color accurate'], mustNotHappen: [] },
        qaExpectations: {
          requiredSubjects: ['Lumina Serum'],
          requiredActions: ['Liquid droplet release'],
          forbiddenActions: [],
          requiredFraming: 'extreme_close_up',
          requiredCameraMovement: 'static',
          productVisibility: 'prominent_front',
          characterIdentityRules: [],
          brandRules: ['Pristine glass finish']
        }
      }
    ],
    continuity: { links: [] },
    constraints: [],
    generationIntent: {
      desiredDurationSeconds: 9,
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
        requiresNativeAudio: false
      }
    },
    metadata: {
      authorId: 'usr_director_01',
      originatingGem: 'video_generation_gem'
    }
  };
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING AI ADVERTISING DIRECTOR ORCHESTRATION & CONTRACTS SUITE');
  console.log('================================================================\n');

  // ===========================================================================
  // TEST A: Minimal brief discovery -> Interviewer identifies missing info
  // ===========================================================================
  console.log('--- TEST A: Minimal Brief Discovery (Interviewer Stage) ---');
  const specA = makeInitialAdSpec({});
  const contextA: DirectorContext = {
    adSpec: specA,
    specVersion: 1,
    workspaceId: 'ws_prod_01',
    userId: 'usr_director_01'
  };

  const interviewerOutA = executeInterviewerStage({ context: contextA });
  assert(
    interviewerOutA.missingInformation.includes('brief.brandRef') &&
    interviewerOutA.missingInformation.includes('brief.product') &&
    interviewerOutA.missingInformation.includes('brief.cta'),
    'Test A.1: Interviewer computes required - known = missing info',
    `Missing fields: ${interviewerOutA.missingInformation.join(', ')}`
  );
  assert(
    interviewerOutA.nextQuestion !== undefined && interviewerOutA.nextQuestion.priority === 1,
    'Test A.2: Interviewer prioritizes smallest blocking question first',
    `Next question: ${interviewerOutA.nextQuestion?.question}`
  );
  assert(
    interviewerOutA.assetNeeds.length > 0 || interviewerOutA.pendingQuestions.length > 0,
    'Test A.3: Structured questions and asset needs generated without inventing facts'
  );

  // ===========================================================================
  // TEST B: User answers one missing question -> Only relevant brief field changes
  // ===========================================================================
  console.log('\n--- TEST B: User Answers Question (Targeted Operation Application) ---');
  const answerInput = {
    questionId: 'q_product',
    answerText: 'Lumina Nocturne Eye Elixir'
  };
  const interviewerOutB = executeInterviewerStage({
    context: contextA,
    userAnswer: answerInput
  });
  assert(
    interviewerOutB.proposedOperations.length === 1 &&
    interviewerOutB.proposedOperations[0].type === 'update_field' &&
    interviewerOutB.proposedOperations[0].target.path === 'product',
    'Test B.1: Interviewer emits targeted update_field operation for user answer'
  );

  const appliedB = applyDirectorOperation(specA, interviewerOutB.proposedOperations[0]);
  assert(
    appliedB.updatedAdSpec.brief.product === 'Lumina Nocturne Eye Elixir',
    'Test B.2: Target brief field updated with exact user answer'
  );
  assert(
    appliedB.updatedAdSpec.brief.brandRef === specA.brief.brandRef &&
    ((appliedB.updatedAdSpec.brief.desiredDurationSeconds as any)?.value ?? appliedB.updatedAdSpec.brief.desiredDurationSeconds) ===
      ((specA.brief.desiredDurationSeconds as any)?.value ?? specA.brief.desiredDurationSeconds),
    'Test B.3: Unrelated brief fields remain completely untouched'
  );
  assert(
    appliedB.diff.specVersionAfter === 2 && appliedB.diff.specVersionBefore === 1,
    'Test B.4: Version progressed strictly from 1 to 2'
  );

  // ===========================================================================
  // TEST C: Creative Director creates 3 genuinely different concepts
  // ===========================================================================
  console.log('\n--- TEST C: Creative Director Concept Creation ---');
  const specC = makeInitialAdSpec({ version: 2 });
  specC.brief.brandRef = 'Lumina Skincare';
  specC.brief.product = 'Nocturne Recovery Serum';
  const contextC: DirectorContext = {
    adSpec: specC,
    specVersion: 2,
    workspaceId: 'ws_prod_01',
    userId: 'usr_director_01'
  };

  const cdOut = executeCreativeDirectorStage({ context: contextC });
  assert(
    cdOut.concepts.length === 3,
    'Test C.1: Generates exactly 3 genuinely differentiated concepts'
  );
  const mechanisms = cdOut.concepts.map(c => c.narrativeMechanism);
  const uniqueMechanisms = new Set(mechanisms);
  assert(
    uniqueMechanisms.size === 3,
    'Test C.2: Concepts differ in underlying creative & narrative mechanism',
    `Mechanisms: ${mechanisms.join(' | ')}`
  );
  assert(
    Object.keys(cdOut.conceptEvaluations).length === 3 &&
    cdOut.conceptEvaluations['concept_kinetic_momentum'].feasibilityScore > 0,
    'Test C.3: Structured quality evaluations (originality, feasibility, model compatibility) present'
  );

  // ===========================================================================
  // TEST D: User selects concept 2 -> Confirmed state
  // ===========================================================================
  console.log('\n--- TEST D: Concept Selection & Confirmation ---');
  const selectOp: DirectorOperation = {
    operationId: 'op_sel_concept_02',
    type: 'select_concept',
    target: { scope: 'creative', entityId: 'concept_intimate_ritual' },
    changes: { selectedConceptId: 'concept_intimate_ritual' },
    reason: { type: 'user_confirmed', description: 'User selected Concept 2: The Daily Sanctuary' },
    actor: { id: 'usr_director_01', role: 'user' },
    approvalRequirement: 'AUTO_SAFE',
    parentSpecVersion: 2
  };

  const appliedD = applyDirectorOperation(specC, selectOp);
  assert(
    appliedD.updatedAdSpec.creative.selectedConceptId === 'concept_intimate_ritual',
    'Test D.1: Selected concept ID locked into AdSpec'
  );
  assert(
    appliedD.updatedAdSpec.creative.selectionProvenance?.selectedBy === 'user',
    'Test D.2: Selection provenance recorded as confirmed by user'
  );
  assert(
    appliedD.diff.specVersionAfter === 3,
    'Test D.3: AdSpec version incremented to 3'
  );

  // ===========================================================================
  // TEST E: Story Architect creates narrative
  // ===========================================================================
  console.log('\n--- TEST E: Story Architect Narrative Formulation ---');
  const specE = appliedD.updatedAdSpec;
  const contextE: DirectorContext = {
    adSpec: specE,
    specVersion: 3,
    workspaceId: 'ws_prod_01',
    userId: 'usr_director_01'
  };

  const storyOut = executeStoryArchitectStage({
    context: contextE,
    selectedConceptId: 'concept_intimate_ritual'
  });
  assert(
    storyOut.storyModel.beats.length === 4,
    'Test E.1: Story model contains 4 structured narrative beats'
  );
  assert(
    storyOut.narrativeArcRationale.hookRationale.length > 0 &&
    storyOut.narrativeArcRationale.ctaTransition.length > 0,
    'Test E.2: Rationale explains why story starts, changes, and leads to CTA'
  );
  assert(
    storyOut.proposedOperations.length > 0 &&
    storyOut.proposedOperations[0].type === 'update_story_beats',
    'Test E.3: Story architect proposes update_story_beats without provider prompt syntax'
  );

  // ===========================================================================
  // TEST F: Shot Director creates multi-shot storyboard
  // ===========================================================================
  console.log('\n--- TEST F: Shot Director Multi-Shot Storyboard ---');
  const contextF: DirectorContext = {
    adSpec: specE,
    specVersion: 3,
    workspaceId: 'ws_prod_01',
    userId: 'usr_director_01'
  };
  const shotDirectorOut = executeShotDirectorStage({ context: contextF });
  assert(
    shotDirectorOut.shots.length === 2,
    'Test F.1: Shot Director creates discrete shots'
  );
  const shot1 = shotDirectorOut.shots[0];
  assert(
    shot1.action.choreography.includes('0.0s-1.0s') &&
    shot1.action.startingState.length > 0 &&
    shot1.action.endingState.length > 0,
    'Test F.2: Action model contains structured temporal beats, starting state, and ending state'
  );
  assert(
    shot1.camera.framing === 'close_up' &&
    shot1.camera.angle === 'low_angle' &&
    shot1.camera.cameraMovement === 'slow_push_in',
    'Test F.3: Structured camera model captures framing, angle, lens, and movement without plain "cinematic"'
  );

  // ===========================================================================
  // TEST G: Revision: "Make shot 3 more intense and lower camera"
  // ===========================================================================
  console.log('\n--- TEST G: Targeted Shot Revision ---');
  const specG = makeInitialAdSpec({ version: 3 });
  const revOpG: DirectorOperation = {
    operationId: 'op_rev_shot3_intense',
    type: 'update_shot',
    target: { scope: 'shot', entityId: 'shot_03' },
    changes: {
      'camera.angle': 'ground_level',
      'camera.framing': 'extreme_close_up',
      'action.action': 'High-intensity kinetic dropper release with explosive fluid dynamics'
    },
    reason: { type: 'user_requested', description: 'Make shot 3 more intense and lower camera' },
    actor: { id: 'usr_director_01', role: 'user' },
    approvalRequirement: 'AUTO_SAFE',
    parentSpecVersion: 3
  };

  const appliedG = applyDirectorOperation(specG, revOpG);
  const updatedShot3 = appliedG.updatedAdSpec.shots.find(s => s.shotId === 'shot_03')!;
  const untouchedShot1 = appliedG.updatedAdSpec.shots.find(s => s.shotId === 'shot_01')!;
  const untouchedShot2 = appliedG.updatedAdSpec.shots.find(s => s.shotId === 'shot_02')!;

  assert(
    updatedShot3.camera.angle === 'ground_level' &&
    updatedShot3.action.action.includes('High-intensity kinetic dropper release'),
    'Test G.1: Targeted Shot 3 properties updated'
  );
  assert(
    untouchedShot1.camera.angle === specG.shots[0].camera.angle &&
    untouchedShot2.action.action === specG.shots[1].action.action,
    'Test G.2: Shots 1 and 2 remain 100% untouched'
  );
  assert(
    appliedG.explanation.includes('Shot 03') && appliedG.explanation.includes('No other shots were changed'),
    'Test G.3: Revision explanation generated deterministically from diff',
    `Explanation: ${appliedG.explanation}`
  );

  // ===========================================================================
  // TEST H: Revision: "Move gym to beach" -> Change Impact Analysis
  // ===========================================================================
  console.log('\n--- TEST H: Change Impact Analysis (Gym to Beach) ---');
  const revOpH: DirectorOperation = {
    operationId: 'op_move_to_beach',
    type: 'update_location',
    target: { scope: 'location', entityId: 'loc_gym' },
    changes: {
      name: 'Sunlit Coastal Beach',
      description: 'Golden sandy ocean beach with crashing waves'
    },
    reason: { type: 'user_requested', description: 'Move the gym scene to a beach' },
    actor: { id: 'usr_director_01', role: 'user' },
    approvalRequirement: 'AUTO_SAFE',
    parentSpecVersion: 3
  };

  const impactH = analyzeChangeImpact(specG, revOpH);
  assert(
    impactH.directlyAffected.includes('loc_gym'),
    'Test H.1: Directly affected correctly identifies target location'
  );
  assert(
    impactH.indirectlyAffected.includes('shot_01') &&
    impactH.indirectlyAffected.includes('shot_02') &&
    impactH.indirectlyAffected.includes('shot_03'),
    'Test H.2: Indirectly affected correctly identifies all dependent shots set in that location'
  );
  assert(
    impactH.unaffected.includes('product') &&
    impactH.unaffected.includes('char_sarah') &&
    impactH.unaffected.includes('brief.brandRef'),
    'Test H.3: Unaffected correctly preserves brand, product, and character identities'
  );

  // ===========================================================================
  // TEST I: Continuity conflict: white shirt -> black shirt without approved change
  // ===========================================================================
  console.log('\n--- TEST I: Continuity Conflict Detection ---');
  const specI = makeInitialAdSpec({});
  // Introduce wardrobe contradiction in QA rules between shot 1 and shot 2
  specI.shots[0].qaExpectations.characterIdentityRules = ['Crisp white cotton shirt'];
  specI.shots[1].qaExpectations.characterIdentityRules = ['Black leather motorcycle jacket'];

  const continuityI = checkContinuity(specI);
  assert(
    continuityI.status === 'CONFLICT',
    'Test I.1: Continuity Supervisor detects CONFLICT status'
  );
  const conflict = continuityI.conflicts.find(c => c.conflictingAspect === 'wardrobe');
  assert(
    conflict !== undefined &&
    conflict.shotsInvolved.includes('shot_01') &&
    conflict.shotsInvolved.includes('shot_02') &&
    conflict.requiresUserConfirmation === true,
    'Test I.2: Conflict accurately reports involved shots, entity, conflicting aspect, and requires confirmation'
  );

  // ===========================================================================
  // TEST J: User-confirmed product geometry changed by AI proposal
  // ===========================================================================
  console.log('\n--- TEST J: Confirmed State Protection (Product Geometry) ---');
  const specJ = makeInitialAdSpec({ productConfirmed: true });
  const aiProposalOpJ: DirectorOperation = {
    operationId: 'op_ai_alter_geometry',
    type: 'update_product',
    target: { scope: 'product', entityId: 'prod_lumina_serum' },
    changes: {
      packaging: { containerType: 'aluminum_canister', finish: 'gloss' },
      shapeForm: 'Hexagonal prism'
    },
    reason: { type: 'ai_proposal', description: 'AI suggests modern hexagonal canister packaging' },
    actor: { id: 'ai_creative_director', role: 'ai_creative_director' },
    parentSpecVersion: 1
  };

  const validationJ = validateDirectorOperation(specJ, aiProposalOpJ);
  assert(
    validationJ.valid === false,
    'Test J.1: AI proposal altering critical product geometry is rejected'
  );
  assert(
    validationJ.approvalPolicy.level === 'USER_CONFIRMATION_REQUIRED',
    'Test J.2: Approval policy classifies change as USER_CONFIRMATION_REQUIRED'
  );

  // ===========================================================================
  // TEST K: Execution snapshot v4, then draft v5
  // ===========================================================================
  console.log('\n--- TEST K: Execution Snapshot Immutability ---');
  const specK_v4 = makeInitialAdSpec({ version: 4, creativeState: 'approved' });
  const snapshotK = createExecutionSnapshot(specK_v4, 'usr_approver_01');
  assert(
    snapshotK.specVersion === 4 && snapshotK.frozenAdSpec.identity.specVersion === 4,
    'Test K.1: Execution snapshot created at version 4'
  );

  // Mutate draft AdSpec to version 5
  const draftRevOp: DirectorOperation = {
    operationId: 'op_draft_rev_v5',
    type: 'update_field',
    target: { scope: 'brief', path: 'desiredResponse' },
    changes: { desiredResponse: 'Immediate purchase intent' },
    reason: { type: 'user_requested', description: 'Refine response goal' },
    actor: { id: 'usr_director_01', role: 'user' },
    approvalRequirement: 'AUTO_SAFE',
    parentSpecVersion: 4
  };
  const appliedK = applyDirectorOperation(specK_v4, draftRevOp);
  assert(
    appliedK.updatedAdSpec.identity.specVersion === 5,
    'Test K.2: Draft AdSpec progresses to version 5'
  );
  assert(
    snapshotK.frozenAdSpec.identity.specVersion === 4 &&
    snapshotK.frozenAdSpec.brief.desiredResponse === 'Desire to experience product',
    'Test K.3: Execution snapshot remains strictly frozen at version 4 with original values'
  );

  // ===========================================================================
  // TEST L: Malformed LLM operation -> No AdSpec mutation
  // ===========================================================================
  console.log('\n--- TEST L: Malformed Operation Rejection (Zero Partial Mutation) ---');
  const specL = makeInitialAdSpec({ version: 1 });
  const malformedOp: any = {
    operationId: 'op_malformed',
    // Missing type, target, and changes
    actor: { id: 'ai_unknown', role: 'system' },
    parentSpecVersion: 1
  };

  let caughtErrorL = false;
  try {
    applyDirectorOperation(specL, malformedOp);
  } catch (err: any) {
    caughtErrorL = true;
  }
  assert(
    caughtErrorL === true,
    'Test L.1: StateManager throws error on malformed operation'
  );
  assert(
    specL.identity.specVersion === 1,
    'Test L.2: Active AdSpec remains completely unchanged (zero partial mutation)'
  );

  // ===========================================================================
  // TEST M: Operation targets nonexistent shot -> No mutation
  // ===========================================================================
  console.log('\n--- TEST M: Nonexistent Target Entity Rejection ---');
  const specM = makeInitialAdSpec({ version: 1 });
  const nonexistentOp: DirectorOperation = {
    operationId: 'op_target_fake_shot',
    type: 'update_shot',
    target: { scope: 'shot', entityId: 'shot_999' },
    changes: { 'camera.angle': 'low_angle' },
    reason: { type: 'ai_proposal', description: 'Attempt to update nonexistent shot' },
    actor: { id: 'ai_shot_director', role: 'ai_shot_director' },
    approvalRequirement: 'AUTO_SAFE',
    parentSpecVersion: 1
  };

  let caughtErrorM = false;
  try {
    applyDirectorOperation(specM, nonexistentOp);
  } catch (err: any) {
    caughtErrorM = true;
  }
  assert(
    caughtErrorM === true,
    'Test M.1: Targeting nonexistent shot throws validation error'
  );
  assert(
    specM.shots.length === 3 && specM.identity.specVersion === 1,
    'Test M.2: AdSpec remains completely unchanged'
  );

  // ===========================================================================
  // TEST N: Approved AdSpec receives unauthorized mutation -> Blocked
  // ===========================================================================
  console.log('\n--- TEST N: Approved AdSpec Mutation Protection ---');
  const specN = makeInitialAdSpec({ version: 4, creativeState: 'approved' });
  const unauthorizedAiOp: DirectorOperation = {
    operationId: 'op_unauth_ai_mutation',
    type: 'update_shot',
    target: { scope: 'shot', entityId: 'shot_01' },
    changes: { 'camera.angle': 'overhead_flatlay' },
    reason: { type: 'ai_inference', description: 'AI attempts to tweak approved shot' },
    actor: { id: 'ai_shot_director', role: 'ai_shot_director' },
    approvalRequirement: 'AUTO_SAFE',
    parentSpecVersion: 4
  };

  const validationN = validateDirectorOperation(specN, unauthorizedAiOp);
  assert(
    validationN.valid === false && validationN.approvalPolicy.level === 'REJECTED_UNAUTHORIZED',
    'Test N.1: AI mutation on approved AdSpec is classified as REJECTED_UNAUTHORIZED'
  );

  let caughtErrorN = false;
  try {
    applyDirectorOperation(specN, unauthorizedAiOp);
  } catch (err: any) {
    caughtErrorN = true;
  }
  assert(
    caughtErrorN === true && specN.identity.creativeState === 'approved',
    'Test N.2: Unauthorized operation blocked; approved AdSpec remains pristine'
  );

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================');
  console.log(`📊 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
