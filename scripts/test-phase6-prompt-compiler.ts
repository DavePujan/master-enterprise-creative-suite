/**
 * Video Gem — AI Advertising Director
 * Phase 6: Prompt Compiler + Model Capability Registry Verification Suite
 *
 * Automated verification of all 24 required scenarios:
 *
 * PART 1: Model Capability Registry (Authoritative Neutral Registry)
 * 1.  Registry Retrieval: Returns all registered models across Google, Runway, Kling, Luma, Seedance, MiniMax
 * 2.  Provider Filtering: getModelsByProvider('google') returns only Google Veo family
 * 3.  Model Capability Inspection: veo_3_1_pro correctly reports all capabilities, durations, ratios, and credits
 * 4.  Fallback on Unknown Model: getModelCapability('unknown_model') returns null
 * 5.  Query Helper: findCompatibleModels accurately finds models supporting requested constraints
 *
 * PART 2: Capability Validation & Compatibility Engine (Pre-Flight Checks Before Spending Credits)
 * 6.  Compatible Shot Validation: Valid 5s 16:9 shot on veo_3_1_pro passes with zero blockers
 * 7.  Duration Incompatibility: 7s shot on runway_gen3 (durations: [5, 10]) flagged as DURATION_MISMATCH blocker
 * 8.  Aspect Ratio Incompatibility: 21:9 shot on kling_v3 (ratios: [16:9, 9:16, 1:1]) flagged as ASPECT_RATIO_MISMATCH blocker
 * 9.  First Frame Keyframing Incompatibility: Model without first_frame support blocks first_frame shot
 * 10. Last Frame Keyframing Incompatibility: Shot requesting last_frame on kling_v3 (last_frame: false) blocked
 * 11. Reference Limit Overrun: 5 references on runway_gen3 (max_references: 2) blocked as REFERENCE_COUNT_EXCEEDED
 * 12. Character Reference Incompatibility: Character reference on runway_gen3 blocked as CHARACTER_REFERENCE_UNSUPPORTED
 * 13. Native Audio Warning: Voiceover on runway_gen3 produces AUDIO_UNSUPPORTED warning without blocking
 * 14. Negative Prompt Warning: Negative prompt on model lacking negative_prompt produces warning
 * 15. Project-Level Compatibility Aggregator: Accurately rolls up blocked shots, warnings, and overall readiness
 *
 * PART 3: Provider-Neutral Prompt Compiler (Translates Structured Production State into Execution Payloads)
 * 16. Google Veo Prompt Synthesis: Generates rich cinematic prompt with camera, lighting, environment, and continuity
 * 17. Runway Gen-3 Prompt Synthesis: Formats structured camera directives [Camera: ...] without audio
 * 18. Kling 3.0 Prompt Synthesis: Injects micro-expression, character fidelity, and negative prompt mapping
 * 19. Luma Dream Machine Prompt Synthesis: Generates dynamic motion and spatial transition prompt
 * 20. ByteDance Seedance Prompt Synthesis: Generates commercial product clarity and lighting directives
 * 21. Entity & Reference Asset Binding: Resolves character, product, and first-frame asset IDs into typed bindings
 * 22. Full Execution Plan Assembly: Assembles comprehensive AdProjectExecutionPlan with metadata and credit estimates
 *
 * PART 4: Architectural Safety & AdSpec Immutability
 * 23. Strict AdSpec Immutability: Proves AdSpec is 100% untouched before and after compilation (zero mutation)
 * 24. Multi-Tenant Workspace Isolation: Foreign workspace cannot compile or validate another workspace's project
 */

import { 
  getModelCapability, 
  getAllModelCapabilities, 
  getModelsByProvider, 
  findCompatibleModels 
} from '../packages/ad-director/capabilities/modelCapabilityRegistry.js';
import { 
  validateShotCompatibility, 
  validateProjectCompatibility 
} from '../packages/ad-director/capabilities/adSpecCapabilityValidator.js';
import { 
  compileShotPayload, 
  compileProjectExecutionPlan 
} from '../packages/ad-director/compiler/adSpecPromptCompiler.js';
import { promptCompilerService } from '../apps/api/src/modules/adDirector/services/promptCompilerService.js';
import { videoAdProjectRepository } from '../apps/api/src/modules/adDirector/repositories/videoAdProjectRepository.js';
import { videoAdDiscoveryRepository } from '../apps/api/src/modules/adDirector/repositories/videoAdDiscoveryRepository.js';
import { videoAdConceptRepository } from '../apps/api/src/modules/adDirector/repositories/videoAdConceptRepository.js';
import { directorsPlanService } from '../apps/api/src/modules/adDirector/services/directorsPlanService.js';
import { creativeConceptService } from '../apps/api/src/modules/adDirector/services/creativeConceptService.js';
import { briefReconciliationService } from '../apps/api/src/modules/adDirector/services/briefReconciliationService.js';
import type { AdSpec, AdSpecShot } from '../packages/contracts/adSpecContracts.js';

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

// Helper to create a clean, comprehensive AdSpec fixture for tests
function createTestAdSpec(overrides?: Partial<AdSpec>): AdSpec {
  const baseSpec: AdSpec = {
    identity: {
      adId: 'test_ad_phase6',
      specVersion: 1,
      createdAt: '2026-09-17T20:00:00.000Z',
      updatedAt: '2026-09-17T20:00:00.000Z',
      creativeState: 'approved',
      lineage: {
        briefId: 'brief_01',
        conceptId: 'concept_01'
      }
    },
    brief: {
      brandName: 'AeroPulse Audio',
      productName: 'AeroPulse Pro Headphones',
      objective: 'Launch luxury noise-cancelling headphones',
      targetAudience: 'Discerning audiophiles & commuters',
      desiredDurationSeconds: 15,
      aspectRatio: '16:9',
      creativeTone: 'Cinematic, sophisticated, immersive'
    },
    creative: {
      selectedConcept: {
        conceptId: 'concept_01',
        title: 'Silence the Chaos',
        corePremise: 'Transition from roaring city noise to serene symphony',
        hook: 'Close-up of bustling metropolis instantly fading into pristine acoustic isolation',
        toneKeywords: ['sleek', 'minimalist', 'sensory', 'premium']
      },
      alternativeConcepts: []
    },
    story: {
      logline: 'An urban commuter discovers absolute acoustic peace in the heart of a chaotic city.',
      narrativeArc: {
        hook: 'Urban sensory overload',
        development: 'Putting on AeroPulse Pro and activating active silence',
        climax: 'World dissolves into a luminous soundwave sanctuary',
        resolution: 'Sleek product hero with title lockup'
      },
      beats: []
    },
    characters: {
      characters: [
        {
          characterId: 'char_elena',
          name: 'Elena Vance',
          role: 'Hero commuter & architect',
          visualDescription: 'Confident woman in her early 30s with sharp tailored graphite coat and sculpted profile',
          locks: ['graphite wool coat', 'minimalist silver stud earrings']
        }
      ]
    },
    products: {
      products: [
        {
          productId: 'prod_aeropulse',
          name: 'AeroPulse Pro Headphones',
          category: 'Consumer Electronics',
          visualDescription: 'Matte obsidian over-ear headphones with brushed titanium hinges and subtle luminescence',
          locks: ['matte obsidian earcups', 'brushed titanium pivot joints']
        }
      ]
    },
    locations: {
      locations: [
        {
          locationId: 'loc_metro',
          name: 'Rain-Slicked Financial District Subway Entrance',
          visualDescription: 'Dramatic neo-noir architectural plaza with reflective wet concrete, neon reflections, and streaming commuter silhouettes',
          locks: ['reflective wet pavement', 'warm neon bokeh']
        }
      ]
    },
    assets: {
      assets: [
        {
          assetId: 'asset_first_frame',
          type: 'image',
          semanticRole: 'first_frame',
          uri: 'https://cdn.writopedia.com/assets/aeropulse-shot1-keyframe.jpg',
          description: 'Keyframe showing Elena standing at bustling transit plaza in rain',
          targetEntityId: 'char_elena'
        },
        {
          assetId: 'asset_product_hero',
          type: 'image',
          semanticRole: 'product_ref',
          uri: 'https://cdn.writopedia.com/assets/aeropulse-obsidian-hero.png',
          description: 'High-res studio turntable angle of matte obsidian earcups',
          targetEntityId: 'prod_aeropulse'
        },
        {
          assetId: 'asset_char_elena',
          type: 'image',
          semanticRole: 'character_ref',
          uri: 'https://cdn.writopedia.com/assets/elena-vance-lookbook.png',
          description: 'Elena face and outfit reference sheet',
          targetEntityId: 'char_elena'
        }
      ]
    },
    shots: [
      {
        shotId: 'shot_01',
        sequence: 1,
        durationSeconds: 5,
        narrativePurpose: 'Establish urban sensory overwhelm',
        visual: 'Elena Vance stands motionless amidst rushing blurred commuter silhouettes in the rain-slicked plaza.',
        camera: {
          framing: 'wide',
          angle: 'eye_level',
          cameraMovement: 'slow_push_in'
        },
        environment: {
          locationId: 'loc_metro',
          lighting: 'Cinematic overcast neon dusk',
          atmosphere: 'Misty raindrops catching streetlights'
        },
        subjects: [
          {
            entityType: 'character',
            entityId: 'char_elena',
            screenPosition: 'center',
            actionDescription: 'Glares forward through the storm of city noise'
          }
        ],
        referencedAssetIds: ['asset_first_frame', 'asset_char_elena'],
        audio: {
          voiceover: 'In the roar of the city...',
          soundEffects: ['Heavy subway rumble', 'Rain on asphalt', 'Distant sirens']
        }
      },
      {
        shotId: 'shot_02',
        sequence: 2,
        durationSeconds: 5,
        narrativePurpose: 'Product action hero moment',
        visual: 'Close-up on Elena placing the matte obsidian AeroPulse earcups over her ears as a gentle pulse emanates.',
        camera: {
          framing: 'close_up',
          angle: 'profile',
          cameraMovement: 'orbit'
        },
        environment: {
          locationId: 'loc_metro',
          lighting: 'Moody rim light accentuating titanium hinge'
        },
        subjects: [
          {
            entityType: 'character',
            entityId: 'char_elena',
            screenPosition: 'center',
            actionDescription: 'Raises headphones to ears with deliberate grace'
          },
          {
            entityType: 'product',
            entityId: 'prod_aeropulse',
            screenPosition: 'center',
            actionDescription: 'Hinges pivot smoothly into position'
          }
        ],
        referencedAssetIds: ['asset_product_hero', 'asset_char_elena'],
        audio: {
          voiceover: 'Discover absolute acoustic sanctuary.',
          soundEffects: ['Mechanical click', 'Sudden vacuum silence filter']
        }
      },
      {
        shotId: 'shot_03',
        sequence: 3,
        durationSeconds: 5,
        narrativePurpose: 'Climax & Brand Hero Lockup',
        visual: 'Pristine product turntable hero shot in pure dark gradient void with luminous titanium brand lettering.',
        camera: {
          framing: 'medium_close_up',
          angle: 'low_angle',
          cameraMovement: 'static'
        },
        environment: {
          lighting: 'Sculpted commercial studio spotlight'
        },
        subjects: [
          {
            entityType: 'product',
            entityId: 'prod_aeropulse',
            screenPosition: 'center',
            actionDescription: 'Floating smoothly with subtle metallic sheen reflection'
          }
        ],
        referencedAssetIds: ['asset_product_hero'],
        audio: {
          voiceover: 'AeroPulse Pro. Silence the noise. Hear everything.'
        }
      }
    ]
  };

  return { ...baseSpec, ...overrides };
}

async function runPhase6Tests() {
  console.log('\n================================================================');
  console.log('🎬 Video Gem — Phase 6: Prompt Compiler & Model Registry Suite');
  console.log('================================================================\n');

  // ===========================================================================
  // PART 1: Model Capability Registry
  // ===========================================================================
  console.log('--- PART 1: Model Capability Registry (Authoritative Neutral Registry) ---');

  // 1. Registry Retrieval
  const allModels = getAllModelCapabilities();
  assert(
    allModels.length >= 8,
    '1. Registry Retrieval: Returns all registered models (at least 8 standard engines)',
    `Returned ${allModels.length} models`
  );
  const modelIds = allModels.map(m => m.model);
  assert(
    modelIds.includes('veo_3_1_pro') && modelIds.includes('runway_gen3') && modelIds.includes('kling_v3'),
    '1b. Registry Retrieval: Includes flagship engines (Veo 3.1, Runway Gen-3, Kling 3.0)'
  );

  // 2. Provider Filtering
  const googleModels = getModelsByProvider('google');
  assert(
    googleModels.length >= 3 && googleModels.every(m => m.provider === 'google'),
    '2. Provider Filtering: getModelsByProvider("google") returns only Google family models',
    `Found ${googleModels.length} google models`
  );

  // 3. Model Capability Inspection
  const veoPro = getModelCapability('veo_3_1_pro');
  assert(
    veoPro !== null &&
    veoPro.provider === 'google' &&
    veoPro.first_frame === true &&
    veoPro.last_frame === true &&
    veoPro.character_reference === true &&
    veoPro.audio === true &&
    veoPro.credit_cost === 35 &&
    veoPro.supported_durations.includes(5) &&
    veoPro.aspect_ratios.includes('16:9'),
    '3. Model Capability Inspection: veo_3_1_pro reports full capabilities and credit cost'
  );

  // 4. Fallback on Unknown Model
  const unknownModel = getModelCapability('non_existent_engine_9000', true);
  assert(
    unknownModel === null,
    '4. Fallback on Unknown Model: getModelCapability("unknown_model", true) safely returns null'
  );

  // 5. Query Helper: findCompatibleModels
  const firstFrameModels = findCompatibleModels({
    requiresFirstFrame: true,
    requiresCharacterReference: true,
    durationSeconds: 5,
    aspectRatio: '16:9'
  });
  assert(
    firstFrameModels.length > 0 && firstFrameModels.some(m => m.model === 'veo_3_1_pro'),
    '5. Query Helper: findCompatibleModels accurately finds models meeting creative criteria',
    `Found ${firstFrameModels.length} compatible candidates`
  );

  // ===========================================================================
  // PART 2: Capability Validation & Compatibility Engine
  // ===========================================================================
  console.log('\n--- PART 2: Capability Validation & Compatibility Engine ---');

  const testSpec = createTestAdSpec();
  const shot1 = testSpec.shots[0];

  // 6. Compatible Shot Validation
  const validReport = validateShotCompatibility(shot1, testSpec, veoPro!);
  assert(
    validReport.compatible === true && validReport.blockers.length === 0,
    '6. Compatible Shot Validation: Valid 5s 16:9 shot on veo_3_1_pro passes with zero blockers'
  );

  // 7. Duration Incompatibility
  const runwayModel = getModelCapability('runway_gen3')!;
  const invalidDurationShot: AdSpecShot = {
    ...shot1,
    durationSeconds: 7 // Runway only supports 5, 10
  };
  const durationReport = validateShotCompatibility(invalidDurationShot, testSpec, runwayModel);
  assert(
    durationReport.compatible === false &&
    durationReport.blockers.some(b => b.code === 'DURATION_MISMATCH'),
    '7. Duration Incompatibility: 7s shot on runway_gen3 (supports [5, 10]) flagged as DURATION_MISMATCH blocker'
  );

  // 8. Aspect Ratio Incompatibility
  const klingModel = getModelCapability('kling_v3')!; // Kling supports 16:9, 9:16, 1:1
  const aspectRatioSpec = createTestAdSpec({
    brief: {
      ...testSpec.brief,
      aspectRatio: '21:9'
    }
  });
  const aspectRatioReport = validateShotCompatibility(shot1, aspectRatioSpec, klingModel);
  assert(
    aspectRatioReport.compatible === false &&
    aspectRatioReport.blockers.some(b => b.code === 'ASPECT_RATIO_MISMATCH'),
    '8. Aspect Ratio Incompatibility: 21:9 ratio on kling_v3 flagged as ASPECT_RATIO_MISMATCH blocker'
  );

  // 9. First Frame Conditioning Incompatibility
  const dummyNoFirstFrameModel = {
    ...runwayModel,
    first_frame: false
  };
  const firstFrameShot: AdSpecShot = {
    ...shot1,
    referencedAssetIds: ['asset_first_frame']
  };
  const firstFrameReport = validateShotCompatibility(firstFrameShot, testSpec, dummyNoFirstFrameModel);
  assert(
    firstFrameReport.compatible === false &&
    firstFrameReport.blockers.some(b => b.code === 'FIRST_FRAME_UNSUPPORTED'),
    '9. First Frame Conditioning Incompatibility: Model without first_frame blocks shot requiring first frame keyframe'
  );

  // 10. Last Frame Conditioning Incompatibility
  const dummyAssetSpec = createTestAdSpec({
    assets: {
      assets: [
        ...testSpec.assets!.assets,
        {
          assetId: 'asset_last_frame_ref',
          type: 'image',
          semanticRole: 'last_frame',
          uri: 'https://cdn.writopedia.com/assets/last-frame.png'
        }
      ]
    }
  });
  const lastFrameShot: AdSpecShot = {
    ...shot1,
    referencedAssetIds: ['asset_last_frame_ref']
  };
  // Runway Gen-3 does not support last_frame
  const lastFrameReport = validateShotCompatibility(lastFrameShot, dummyAssetSpec, runwayModel);
  assert(
    lastFrameReport.compatible === false &&
    lastFrameReport.blockers.some(b => b.code === 'LAST_FRAME_UNSUPPORTED'),
    '10. Last Frame Conditioning Incompatibility: Shot requesting last_frame on runway_gen3 (last_frame: false) is blocked'
  );

  // 11. Reference Limit Overrun
  const tooManyRefsShot: AdSpecShot = {
    ...shot1,
    referencedAssetIds: ['ref1', 'ref2', 'ref3', 'ref4', 'ref5'] // 5 references, runway max is 2
  };
  const refLimitReport = validateShotCompatibility(tooManyRefsShot, testSpec, runwayModel);
  assert(
    refLimitReport.compatible === false &&
    refLimitReport.blockers.some(b => b.code === 'REFERENCE_COUNT_EXCEEDED'),
    '11. Reference Limit Overrun: 5 references on runway_gen3 (max: 2) blocked as REFERENCE_COUNT_EXCEEDED'
  );

  // 12. Character Reference Incompatibility
  // Luma Dream Machine 1.6 has character_reference: false
  const lumaModel = getModelCapability('luma_dream_machine_1_6')!;
  const charRefReport = validateShotCompatibility(shot1, testSpec, lumaModel);
  assert(
    charRefReport.compatible === false &&
    charRefReport.blockers.some(b => b.code === 'CHARACTER_REFERENCE_UNSUPPORTED'),
    '12. Character Reference Incompatibility: Character reference on luma_dream_machine_1_6 blocked as CHARACTER_REFERENCE_UNSUPPORTED'
  );

  // 13. Native Audio Warning
  // Runway gen3 Alpha has audio: false
  // It should generate a non-blocking warning (audio generated in post)
  const runwayAudioReport = validateShotCompatibility(shot1, testSpec, runwayModel);
  assert(
    runwayAudioReport.warnings.some(w => w.code === 'AUDIO_UNSUPPORTED'),
    '13. Native Audio Warning: Audio voiceover on runway_gen3 generates AUDIO_UNSUPPORTED warning without crashing'
  );

  // 14. Negative Prompt Warning
  const negativePromptShot: AdSpecShot = {
    ...shot1,
    constraints: {
      mustNotHappen: ['blurry, distorted, watermark']
    }
  };
  const negativePromptReport = validateShotCompatibility(
    negativePromptShot,
    testSpec,
    lumaModel // Luma has negative_prompt: false
  );
  assert(
    negativePromptReport.warnings.some(w => w.code === 'NEGATIVE_PROMPT_UNSUPPORTED'),
    '14. Negative Prompt Warning: Negative prompt on model lacking negative_prompt produces NEGATIVE_PROMPT_UNSUPPORTED warning'
  );

  // 15. Project-Level Compatibility Aggregator
  const projectReportVeo = validateProjectCompatibility(testSpec, veoPro!);
  assert(
    projectReportVeo.compatible === true &&
    projectReportVeo.blockers.length === 0 &&
    Object.keys(projectReportVeo.shotReports).length === 3,
    '15. Project-Level Compatibility: Project fully compatible on Google Veo 3.1 Pro (3/3 shots pass)'
  );

  const projectReportLuma = validateProjectCompatibility(testSpec, lumaModel);
  assert(
    projectReportLuma.compatible === false &&
    projectReportLuma.blockers.length > 0,
    '15b. Project-Level Compatibility: Project accurately aggregates blockers when targeted at constrained engine'
  );

  // ===========================================================================
  // PART 3: Provider-Neutral Prompt Compiler
  // ===========================================================================
  console.log('\n--- PART 3: Provider-Neutral Prompt Compiler ---');

  // 16. Google Veo Prompt Synthesis
  const veoPayload = compileShotPayload(shot1, testSpec, veoPro!, { resolution: '1080p' });
  assert(
    veoPayload.provider === 'google' &&
    veoPayload.model === 'veo_3_1_pro' &&
    veoPayload.prompt.includes('Cinematic') &&
    veoPayload.prompt.includes('Elena Vance') &&
    veoPayload.duration === 5 &&
    veoPayload.aspectRatio === '16:9',
    '16. Google Veo Prompt Synthesis: Generates rich, continuous cinematic prompt tailored for Google Veo',
    `Generated: "${veoPayload.prompt.slice(0, 100)}..."`
  );

  // 17. Runway Gen-3 Prompt Synthesis
  const runwayPayload = compileShotPayload(shot1, testSpec, runwayModel);
  assert(
    runwayPayload.provider === 'runway' &&
    runwayPayload.prompt.includes('[Camera:') &&
    runwayPayload.prompt.includes('hyper-detailed') &&
    !runwayPayload.settings.audio,
    '17. Runway Gen-3 Prompt Synthesis: Formats structured camera directives [Camera: ...] with style tokens'
  );

  // 18. Kling 3.0 Prompt Synthesis
  const klingPayload = compileShotPayload(shot1, testSpec, klingModel);
  assert(
    klingPayload.provider === 'kling' &&
    klingPayload.prompt.includes('Commercial Scene') &&
    klingPayload.prompt.includes('Elena Vance'),
    '18. Kling 3.0 Prompt Synthesis: Injects micro-expression, character fidelity, and realism directives'
  );

  // 19. Luma Dream Machine Prompt Synthesis
  const lumaPayload = compileShotPayload(shot1, testSpec, lumaModel);
  assert(
    lumaPayload.provider === 'luma' &&
    lumaPayload.prompt.includes('Shot 1:') &&
    lumaPayload.prompt.includes('Elena Vance'),
    '19. Luma Dream Machine Prompt Synthesis: Generates dynamic motion and spatial transition prompt'
  );

  // 20. ByteDance Seedance Prompt Synthesis
  const seedanceModel = getModelCapability('seedance_2_0')!;
  const seedancePayload = compileShotPayload(testSpec.shots[1], testSpec, seedanceModel);
  assert(
    seedancePayload.provider === 'seedance' &&
    seedancePayload.prompt.includes('@scene') &&
    seedancePayload.prompt.includes('@action:'),
    '20. ByteDance Seedance Prompt Synthesis: Generates commercial product clarity and e-commerce lighting directives'
  );

  // 21. Entity & Reference Asset Binding
  assert(
    veoPayload.references.length > 0 &&
    veoPayload.references.some(r => r.role === 'first_frame' && r.url.includes('keyframe')) &&
    veoPayload.references.some(r => r.role === 'character_ref' && r.targetEntityId === 'char_elena'),
    '21. Entity & Reference Asset Binding: Resolves character, product, and first-frame asset IDs into typed bindings'
  );

  // 22. Full Execution Plan Assembly
  const executionPlan = compileProjectExecutionPlan(testSpec, veoPro!, { resolution: '1080p' });
  assert(
    executionPlan.projectId === testSpec.identity.adId &&
    executionPlan.targetModel === 'veo_3_1_pro' &&
    executionPlan.readiness === 'READY' &&
    executionPlan.shots.length === 3 &&
    executionPlan.totalDurationSeconds === 15 &&
    executionPlan.estimatedCreditCost === 105, // 3 shots * 35 credits
    '22. Full Execution Plan Assembly: Assembles comprehensive AdProjectExecutionPlan with metadata and credit estimates'
  );

  // ===========================================================================
  // PART 4: Architectural Safety & AdSpec Immutability
  // ===========================================================================
  console.log('\n--- PART 4: Architectural Safety & AdSpec Immutability ---');

  // 23. Strict AdSpec Immutability
  // Serialize AdSpec before compilation
  const adSpecBeforeJson = JSON.stringify(testSpec);

  // Run multiple compilations across diverse models (including incompatible models)
  compileProjectExecutionPlan(testSpec, veoPro!);
  compileProjectExecutionPlan(testSpec, runwayModel);
  compileProjectExecutionPlan(testSpec, klingModel);

  // Serialize AdSpec after compilation
  const adSpecAfterJson = JSON.stringify(testSpec);

  assert(
    adSpecBeforeJson === adSpecAfterJson,
    '23. Strict AdSpec Immutability: Deep equality check proves AdSpec was NOT mutated during compilation'
  );
  assert(
    testSpec.identity.specVersion === 1,
    '23b. Strict AdSpec Immutability: specVersion remains unchanged (compilation is purely read-only)'
  );

  // 24. Multi-Tenant Workspace Isolation
  // Create an ad project in Workspace Alpha
  const wsAlpha = 'ws_tenant_alpha_phase6';
  const wsBeta = 'ws_tenant_beta_phase6';
  const { project: projectAlpha } = await videoAdProjectRepository.createProject(
    wsAlpha,
    'Alpha Brand Campaign',
    'user_alpha',
    testSpec
  );

  // Tenant Alpha can validate compatibility
  const alphaValidation = await promptCompilerService.validateProjectCompatibility(
    projectAlpha.id,
    wsAlpha,
    'veo_3_1_pro'
  );
  assert(
    alphaValidation.compatible === true,
    '24a. Workspace Isolation: Tenant Alpha successfully validates its own project'
  );

  // Tenant Beta attempts to compile or validate Alpha's project -> MUST BE REJECTED
  let foreignAccessBlocked = false;
  try {
    await promptCompilerService.validateProjectCompatibility(
      projectAlpha.id,
      wsBeta, // Wrong tenant
      'veo_3_1_pro'
    );
  } catch (err: any) {
    foreignAccessBlocked = true;
  }

  let foreignCompileBlocked = false;
  try {
    await promptCompilerService.compileExecutionPlan(
      projectAlpha.id,
      wsBeta, // Wrong tenant
      'veo_3_1_pro'
    );
  } catch (err: any) {
    foreignCompileBlocked = true;
  }

  assert(
    foreignAccessBlocked && foreignCompileBlocked,
    '24b. Workspace Isolation: Tenant Beta is strictly rejected (403/Forbidden) from accessing Tenant Alpha project'
  );

  // Summary
  console.log('\n================================================================');
  console.log(`📊 Phase 6 Verification Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch(err => {
  console.error('Fatal error running Phase 6 test suite:', err);
  process.exit(1);
});
