/**
 * Automated Verification Script for Video Generation Engine (v2).
 * Exercises capability registry, model resolver, request validator,
 * and payload builders with ZERO unwanted external API calls.
 */

import { VIDEO_CAPABILITIES, getEngineCapability } from '../apps/api/src/modules/videoGeneration/videoCapabilityRegistry.js';
import { videoModelResolver, normalizeEngineKey } from '../apps/api/src/modules/videoGeneration/videoModelResolver.js';
import { videoRequestValidator } from '../apps/api/src/modules/videoGeneration/videoRequestValidator.js';
import { omniPayloadBuilder } from '../apps/api/src/modules/videoGeneration/payloads/omniPayloadBuilder.js';
import { veoPayloadBuilder } from '../apps/api/src/modules/videoGeneration/payloads/veoPayloadBuilder.js';
import { klingPayloadBuilder } from '../apps/api/src/modules/videoGeneration/payloads/klingPayloadBuilder.js';
import { seedancePayloadBuilder } from '../apps/api/src/modules/videoGeneration/payloads/seedancePayloadBuilder.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 VIDEO GENERATION ENGINE (v2) OFFLINE TEST SUITE');
  console.log('======================================================\n');

  // Test 1: Capability Registry Integrity
  console.log('--- 1. Authoritative Capability Registry Tests ---');
  const omniCap = getEngineCapability('google-omni');
  assert(omniCap.supportsConversationalEditing === true, 'Omni supports conversational editing');
  assert(omniCap.supportsFirstFrame === false, 'Omni does NOT claim explicit first-frame control');
  assert(omniCap.supportsLastFrame === false, 'Omni does NOT claim explicit last-frame interpolation');
  assert(omniCap.creditCost === 20, 'Omni credit cost is 20');

  const veoProCap = getEngineCapability('veo-pro');
  assert(veoProCap.supportsFirstFrame === true && veoProCap.supportsLastFrame === true, 'Veo Pro supports first & last frame interpolation');
  assert(veoProCap.creditCost === 40, 'Veo Pro credit cost is 40');

  const klingCap = getEngineCapability('kling-v3');
  assert(klingCap.aspectRatios.includes('1:1'), 'Kling V3 supports 1:1 square ratio');
  assert(klingCap.supportsElements === true, 'Kling V3 supports elements');

  const seedanceCap = getEngineCapability('seedance-2');
  assert(seedanceCap.maxReferenceImages === 9, 'Seedance 2.0 supports up to 9 image references');
  assert(seedanceCap.maxReferenceVideos === 3, 'Seedance 2.0 supports up to 3 video references');
  assert(seedanceCap.creditCost === 80, 'Seedance 2.0 credit cost is 80');

  // Test 2: Engine Key Normalization
  console.log('\n--- 2. Engine Key Normalization Tests ---');
  assert(normalizeEngineKey('google-omni') === 'google-omni', 'Normalizes canonical google-omni');
  assert(normalizeEngineKey('veo-3.1-generate-preview') === 'veo-pro', 'Normalizes veo-3.1-generate-preview to veo-pro');
  assert(normalizeEngineKey('veo-3.1-fast-generate-preview') === 'veo-fast', 'Normalizes veo-3.1-fast to veo-fast');
  assert(normalizeEngineKey('kling-video') === 'kling-v3', 'Normalizes kling-video to kling-v3');
  assert(normalizeEngineKey('bytedance/seedance-2.0') === 'seedance-2', 'Normalizes bytedance/seedance-2.0 to seedance-2');

  // Test 3: Model Resolver Tiered Rules
  console.log('\n--- 3. Tiered Model Resolver Tests ---');

  // Hard Requirement: Start + End frame -> Veo Pro
  const resInterpolation = videoModelResolver.resolve({
    mode: 'text_to_video',
    prompt: 'A car transitioning into an airplane',
    startFrameAssetId: 'asset_start_123',
    endFrameAssetId: 'asset_end_456'
  });
  assert(resInterpolation.engineKey === 'veo-pro', 'Start + end frame resolves to veo-pro');

  // Hard Requirement: edit_video -> Google Omni
  const resEdit = videoModelResolver.resolve({
    mode: 'edit_video',
    prompt: 'Change lighting to night',
    previousInteractionId: 'interaction_987'
  });
  assert(resEdit.engineKey === 'google-omni', 'edit_video mode resolves to google-omni');

  // Hard Requirement: 1:1 Aspect Ratio -> Kling V3
  const resSquare = videoModelResolver.resolve({
    mode: 'text_to_video',
    prompt: 'Square social ad',
    aspectRatio: '1:1'
  });
  assert(resSquare.engineKey === 'kling-v3', '1:1 aspect ratio resolves to kling-v3');

  // Hard Requirement: Rich Reference Board (>3 image refs) -> Seedance 2.0
  const resMultiRef = videoModelResolver.resolve({
    mode: 'text_to_video',
    prompt: 'Fashion runway showcase',
    references: [
      { assetId: 'a1', type: 'product', label: 'Dress' },
      { assetId: 'a2', type: 'character', label: 'Model' },
      { assetId: 'a3', type: 'style', label: 'Lighting' },
      { assetId: 'a4', type: 'environment', label: 'Backdrop' }
    ]
  });
  assert(resMultiRef.engineKey === 'seedance-2', 'More than 3 references resolves to seedance-2');

  // Default Preference: General prompt -> Google Omni Flash
  const resDefault = videoModelResolver.resolve({
    mode: 'text_to_video',
    prompt: 'A beautiful morning coffee pour'
  });
  assert(resDefault.engineKey === 'google-omni', 'Default prompt resolves to google-omni');

  // Test 4: Request Validator Enforcement
  console.log('\n--- 4. Request Validator Tests ---');

  // Rejects empty prompt
  const vEmpty = videoRequestValidator.validate(
    { mode: 'text_to_video', prompt: '' },
    omniCap
  );
  assert(!vEmpty.valid, 'Rejects empty prompt');

  // Rejects 1:1 on Google Omni
  const vOmniSquare = videoRequestValidator.validate(
    { mode: 'text_to_video', prompt: 'Sample', aspectRatio: '1:1' },
    omniCap
  );
  assert(!vOmniSquare.valid, 'Rejects 1:1 on Google Omni');

  // Rejects end frame on Veo Lite
  const veoLiteCap = getEngineCapability('veo-lite');
  const vVeoLiteEnd = videoRequestValidator.validate(
    { mode: 'text_to_video', prompt: 'Sample', endFrameAssetId: 'end_1' },
    veoLiteCap
  );
  assert(!vVeoLiteEnd.valid, 'Rejects endFrame on Veo Lite');

  // Accepts valid Seedance 2.0 multi-reference request
  const vSeedanceValid = videoRequestValidator.validate(
    {
      mode: 'reference_to_video',
      prompt: 'Cinematic brand story',
      aspectRatio: '16:9',
      references: [
        { assetId: 'a1', type: 'product', label: 'Shoe' },
        { assetId: 'a2', type: 'motion_video', label: 'Walk sequence' }
      ]
    },
    seedanceCap
  );
  assert(vSeedanceValid.valid, 'Accepts valid Seedance multi-reference request');

  // Test 5: Semantic Payload Compilers
  console.log('\n--- 5. Semantic Payload Compiler Tests ---');

  // Omni prompt negative constraints embedding
  const compiledOmni = omniPayloadBuilder.compilePrompt({
    mode: 'text_to_video',
    prompt: 'A golden retriever running through fields',
    audioIntent: 'cinematic_soundscape'
  });
  assert(compiledOmni.includes('No sudden camera glitches'), 'Omni embeds quality negative constraints');
  assert(compiledOmni.includes('Audio Direction:'), 'Omni embeds audio direction');

  // Omni edit invariant preservation
  const compiledOmniEdit = omniPayloadBuilder.compilePrompt({
    mode: 'edit_video',
    prompt: '',
    editInstruction: 'Make the sky golden sunset'
  });
  assert(compiledOmniEdit.includes('Keep everything else the same'), 'Omni edit automatically appends context preservation phrase');

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
