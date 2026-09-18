/**
 * Video Gem — AI Advertising Director
 * Phase 7: Provider Adapters (Google / Fal / Seedance) Verification Suite
 *
 * Automated verification of all 24 required scenarios across:
 *
 * PART 1: Provider Adapter Registry & Model Routing
 * 1.  Registry Discovery: Returns all registered adapters (Google, Fal, Seedance)
 * 2.  Status Telemetry: getProviderStatusReports() returns configured state and capabilities
 * 3.  Model-to-Adapter Routing (Google): veo_3_1_pro routes to GoogleAdapter
 * 4.  Model-to-Adapter Routing (Fal): kling_v3 and runway_gen3 route to FalAdapter
 * 5.  Model-to-Adapter Routing (Seedance): seedance_2_0 routes strictly to SeedanceAdapter
 * 6.  Unknown Model Rejection: Request for non-existent model throws informative error
 *
 * PART 2: Canonical Reference Resolution Layer
 * 7.  Google Veo Reference Mapping: Extracts primary keyframe URI and supporting subject references
 * 8.  Fal Keyframe Reference Mapping: Maps first_frame to image_url and last_frame to tail_image_url
 * 9.  Seedance Multimodal Array Mapping: Maps references up to 9 images into multimodal arrays
 * 10. Entity Fallback Handling: Handles shots with no visual references (pure text-to-video)
 *
 * PART 3: Provider Submissions & Payload Dispatch
 * 11. Google Veo Dispatch: Submits structured prompt, aspect ratio, duration, and keyframes
 * 12. Fal Kling Dispatch: Submits to fal queue with prompt, duration, and keyframe URLs
 * 13. Seedance-via-Fal Dispatch: Submits to bytedance/seedance-2.0 endpoint via Fal.ai queue
 *
 * PART 4: Output & Status Normalization
 * 14. Normalized Success Output: Maps completed job to standard ProviderGenerationResult
 * 15. In-Progress Polling: Maps processing/queued status with progress percentage
 *
 * PART 5: Creative Intent Preservation (Zero Silent Degradation)
 * 16. Incompatible Keyframe Rejection: Rejects last_frame on unsupported model with UNSUPPORTED_CONFIGURATION
 * 17. Incompatible Duration Rejection: Rejects duration mismatch with UNSUPPORTED_CONFIGURATION
 * 18. Reference Count Overrun Rejection: Rejects reference count exceeding model capability
 *
 * PART 6: Error Normalization & Retry Classification
 * 19. Authentication Error: Maps 401/403 to AUTHENTICATION_ERROR (non-retryable)
 * 20. Rate Limiting with Backoff: Maps 429 to RATE_LIMITED with parsed retryAfterSeconds (retryable)
 * 21. Content Moderation Rejection: Maps safety blocks to CONTENT_REJECTED (non-retryable)
 * 22. Provider Outage: Maps 503/network disconnect to PROVIDER_UNAVAILABLE (retryable)
 *
 * PART 7: Secret Scrubbing & Safe Logging
 * 23. Credential Sanitization: Scrubs Gemini AIzaSy..., Fal fal_..., and Bearer tokens from error traces
 *
 * PART 8: Cancellation Handling
 * 24. Job Cancellation: Cancels queue job on Fal and Seedance-via-Fal; gracefully handles Google
 */

import { providerAdapterRegistry } from '../apps/api/src/modules/adDirector/adapters/providerAdapterRegistry.js';
import { GoogleAdapter } from '../apps/api/src/modules/adDirector/adapters/google/googleAdapter.js';
import { FalAdapter } from '../apps/api/src/modules/adDirector/adapters/fal/falAdapter.js';
import { SeedanceAdapter } from '../apps/api/src/modules/adDirector/adapters/seedance/seedanceAdapter.js';
import { adapterReferenceResolver } from '../apps/api/src/modules/adDirector/adapters/shared/referenceResolver.js';
import { adapterErrorNormalizer } from '../apps/api/src/modules/adDirector/adapters/shared/errorNormalizer.js';
import type { 
  ProviderExecutionRequest, 
  ProviderGenerationResult 
} from '../packages/contracts/providerAdapterContracts.js';
import { 
  ProviderGenerationResultZodSchema,
  ProviderExecutionRequestZodSchema 
} from '../packages/contracts/providerAdapterContracts.js';
import type { CompiledReferenceBinding } from '../packages/contracts/modelCapabilityContracts.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('🚀 VIDEO GEM — PHASE 7: PROVIDER ADAPTERS VERIFICATION SUITE');
  console.log('================================================================\n');

  // ===========================================================================
  // PART 1: Provider Adapter Registry & Model Routing
  // ===========================================================================
  console.log('--- PART 1: Adapter Registry & Model Routing ---');

  // 1. Registry Discovery
  const allAdapters = providerAdapterRegistry.getAllAdapters();
  assert(
    allAdapters.length === 3 &&
    allAdapters.some(a => a.provider === 'google') &&
    allAdapters.some(a => a.provider === 'fal') &&
    allAdapters.some(a => a.provider === 'seedance'),
    '1. Registry Discovery: Returns all 3 adapters (Google, Fal, Seedance)',
    `Found adapters: ${allAdapters.map(a => a.provider).join(', ')}`
  );

  // 2. Status Telemetry
  const statusReports = providerAdapterRegistry.getProviderStatusReports();
  const seedanceReport = statusReports.find(s => s.provider === 'seedance');
  assert(
    statusReports.length === 3 &&
    seedanceReport !== undefined &&
    seedanceReport.supportedModels.includes('seedance_2_0'),
    '2. Status Telemetry: getProviderStatusReports() returns configured state and features',
    `Seedance report: ${JSON.stringify(seedanceReport)}`
  );

  // 3. Model Routing (Google)
  const googleAdapter = providerAdapterRegistry.getAdapterForModel('veo_3_1_pro');
  assert(
    googleAdapter.provider === 'google',
    '3. Model Routing (Google): veo_3_1_pro routes to GoogleAdapter'
  );

  // 4. Model Routing (Fal)
  const klingAdapter = providerAdapterRegistry.getAdapterForModel('kling_v3');
  const runwayAdapter = providerAdapterRegistry.getAdapterForModel('runway_gen3');
  assert(
    klingAdapter.provider === 'fal' && runwayAdapter.provider === 'fal',
    '4. Model Routing (Fal): kling_v3 and runway_gen3 route to FalAdapter'
  );

  // 5. Model Routing (Seedance via Fal API)
  const seedanceAdapter = providerAdapterRegistry.getAdapterForModel('seedance_2_0');
  assert(
    seedanceAdapter.provider === 'seedance',
    '5. Model Routing (Seedance): seedance_2_0 routes strictly to SeedanceAdapter'
  );

  // 6. Unknown Model Rejection
  let unknownModelFailed = false;
  try {
    providerAdapterRegistry.getAdapterForModel('non_existent_engine_xyz');
  } catch (err: any) {
    unknownModelFailed = err.message.includes('No provider adapter registered');
  }
  assert(
    unknownModelFailed,
    '6. Unknown Model Rejection: Non-existent model throws informative error'
  );

  // ===========================================================================
  // PART 2: Shared Reference Resolution Layer
  // ===========================================================================
  console.log('\n--- PART 2: Canonical Reference Resolution Layer ---');

  const testReferences: CompiledReferenceBinding[] = [
    {
      assetId: 'asset_first_frame',
      url: 'https://cdn.example.com/assets/start_scene.jpg',
      role: 'first_frame',
      type: 'style',
      label: 'Shot 1 Start Frame'
    },
    {
      assetId: 'asset_last_frame',
      url: 'https://cdn.example.com/assets/end_scene.jpg',
      role: 'last_frame',
      type: 'style',
      label: 'Shot 1 End Frame'
    },
    {
      assetId: 'asset_hero_character',
      url: 'https://cdn.example.com/assets/elena_portrait.jpg',
      role: 'character_ref',
      type: 'character',
      label: 'Elena (Lead Designer)'
    },
    {
      assetId: 'asset_bottle_product',
      url: 'https://cdn.example.com/assets/serum_bottle.png',
      role: 'product_ref',
      type: 'product',
      label: 'Glow Serum Bottle'
    }
  ];

  // 7. Google Veo Reference Mapping
  const googleMapping = adapterReferenceResolver.resolveForGoogleVeo(testReferences);
  assert(
    googleMapping.firstFrameUrl === 'https://cdn.example.com/assets/start_scene.jpg' &&
    googleMapping.referenceImageUrls.length === 2 &&
    googleMapping.referenceImageUrls.includes('https://cdn.example.com/assets/elena_portrait.jpg'),
    '7. Google Veo Reference Mapping: Extracts primary keyframe URI and supporting subject references'
  );

  // 8. Fal Keyframe Reference Mapping
  const falMapping = adapterReferenceResolver.resolveForFal(testReferences);
  assert(
    falMapping.imageUrl === 'https://cdn.example.com/assets/start_scene.jpg' &&
    falMapping.tailImageUrl === 'https://cdn.example.com/assets/end_scene.jpg' &&
    falMapping.elementUrls.length === 2,
    '8. Fal Keyframe Reference Mapping: Maps first_frame to image_url and last_frame to tail_image_url'
  );

  // 9. Seedance Multimodal Array Mapping
  const seedanceMapping = adapterReferenceResolver.resolveForSeedance(testReferences);
  assert(
    seedanceMapping.firstFrameUrl === 'https://cdn.example.com/assets/start_scene.jpg' &&
    seedanceMapping.allReferenceUrls.length === 4 &&
    seedanceMapping.characterImageUrls.length === 1 &&
    seedanceMapping.productImageUrls.length === 1 &&
    seedanceMapping.characterImageUrls[0] === 'https://cdn.example.com/assets/elena_portrait.jpg',
    '9. Seedance Multimodal Array Mapping: Maps references up to 9 images into multimodal arrays'
  );

  // 10. Entity Fallback Handling (Text-to-Video)
  const emptyMapping = adapterReferenceResolver.resolveForSeedance([]);
  assert(
    emptyMapping.firstFrameUrl === undefined &&
    emptyMapping.allReferenceUrls.length === 0 &&
    emptyMapping.characterImageUrls.length === 0,
    '10. Entity Fallback Handling: Correctly resolves empty references for text-to-video mode'
  );

  // ===========================================================================
  // PART 3: Provider Submissions & Payload Transformation
  // ===========================================================================
  console.log('\n--- PART 3: Provider Submissions & Payload Transformation ---');

  // Test Request Fixture
  const validRequest: ProviderExecutionRequest = {
    projectId: 'proj_p7_test',
    shotId: 'shot_1',
    sequence: 1,
    provider: 'google',
    model: 'veo_3_1_pro',
    prompt: 'Cinematic commercial shot of luxury perfume bottle on marble pedestal, warm studio lighting',
    negativePrompt: 'grainy, low quality, artifacts',
    duration: 5,
    aspectRatio: '16:9',
    resolution: '1080p',
    references: [testReferences[0], testReferences[3]], // first_frame + product
    settings: { cameraMotion: 'slow pan right' },
    workspaceId: 'ws_enterprise'
  };

  // 11. Google Veo Dispatch
  let capturedGooglePayload: any = null;
  const mockGoogleClient = {
    models: {
      generateVideos: async (payload: any) => {
        capturedGooglePayload = payload;
        return {
          name: 'operations/veo_op_12345',
          done: false,
          metadata: { state: 'RUNNING' }
        };
      }
    }
  };

  const testGoogleAdapter = new GoogleAdapter(mockGoogleClient as any);
  const googleResult = await testGoogleAdapter.submit(validRequest);

  assert(
    googleResult.status === 'queued' &&
    googleResult.provider === 'google' &&
    googleResult.providerRequestId === 'operations/veo_op_12345' &&
    capturedGooglePayload?.prompt === validRequest.prompt &&
    capturedGooglePayload?.config?.durationSeconds === 5 &&
    capturedGooglePayload?.config?.aspectRatio === '16:9' &&
    capturedGooglePayload?.image?.imageUri === testReferences[0].url,
    '11. Google Veo Dispatch: Submits structured prompt, aspect ratio, duration, and keyframes',
    `Captured payload: ${JSON.stringify(capturedGooglePayload)}`
  );

  // 12. Fal Kling Dispatch
  let capturedFalPayload: any = null;
  let capturedFalEndpoint: string = '';
  const mockFalClient = {
    queue: {
      submit: async (endpoint: string, options: any) => {
        capturedFalEndpoint = endpoint;
        capturedFalPayload = options.input;
        return { request_id: 'fal_req_kling_98765' };
      },
      status: async () => ({ status: 'IN_QUEUE', logs: [] }),
      result: async () => ({}),
      cancel: async () => ({ status: 'CANCELLED' })
    }
  };

  const testFalAdapter = new FalAdapter(mockFalClient as any);
  const falRequest: ProviderExecutionRequest = {
    ...validRequest,
    provider: 'fal',
    model: 'kling_v3',
    references: [testReferences[0]]
  };
  const falResult = await testFalAdapter.submit(falRequest);

  assert(
    falResult.status === 'queued' &&
    falResult.provider === 'fal' &&
    falResult.providerRequestId.includes('fal_req_kling_98765') &&
    capturedFalEndpoint === 'fal-ai/kling-video/v3/image-to-video' &&
    capturedFalPayload?.prompt === validRequest.prompt &&
    capturedFalPayload?.image_url === testReferences[0].url,
    '12. Fal Kling Dispatch: Submits to fal queue with prompt, duration, and keyframe URLs',
    `Endpoint: ${capturedFalEndpoint}`
  );

  // 13. Seedance-via-Fal Dispatch (ByteDance Seedance 2.0 via Fal.ai queue)
  let capturedSeedancePayload: any = null;
  let capturedSeedanceEndpoint: string = '';
  const mockSeedanceFalClient = {
    queue: {
      submit: async (endpoint: string, options: any) => {
        capturedSeedanceEndpoint = endpoint;
        capturedSeedancePayload = options.input;
        return { request_id: 'fal_req_seedance_44332' };
      },
      status: async () => ({ status: 'IN_PROGRESS', progress: 45 }),
      result: async () => ({}),
      cancel: async () => ({ status: 'CANCELLED' })
    }
  };

  const testSeedanceAdapter = new SeedanceAdapter(mockSeedanceFalClient as any);
  const seedanceRequest: ProviderExecutionRequest = {
    ...validRequest,
    provider: 'seedance',
    model: 'seedance_2_0',
    duration: 6,
    references: [testReferences[0], testReferences[2], testReferences[3]] // first_frame, character, product
  };
  const seedanceResult = await testSeedanceAdapter.submit(seedanceRequest);

  assert(
    seedanceResult.status === 'queued' &&
    seedanceResult.provider === 'seedance' &&
    seedanceResult.providerRequestId.includes('fal_req_seedance_44332') &&
    capturedSeedanceEndpoint === 'bytedance/seedance-2.0' &&
    capturedSeedancePayload?.prompt === validRequest.prompt &&
    Array.isArray(capturedSeedancePayload?.reference_images) &&
    capturedSeedancePayload?.reference_images.length === 3 &&
    capturedSeedancePayload?.character_images.includes('https://cdn.example.com/assets/elena_portrait.jpg'),
    '13. Seedance-via-Fal Dispatch: Submits to bytedance/seedance-2.0 endpoint via Fal.ai queue',
    `Endpoint: ${capturedSeedanceEndpoint}, RefImages: ${capturedSeedancePayload?.reference_images?.length}`
  );

  // ===========================================================================
  // PART 4: Output & Status Normalization
  // ===========================================================================
  console.log('\n--- PART 4: Output & Status Normalization ---');

  // 14. Normalized Success Output
  const completedFalMock = {
    queue: {
      submit: async () => ({ request_id: 'req_done_1' }),
      status: async () => ({ status: 'COMPLETED' }),
      result: async () => ({
        data: {
          video: { url: 'https://v.fal.media/output/generated_shot_1.mp4' }
        }
      }),
      cancel: async () => ({})
    }
  };
  const completedFalAdapter = new FalAdapter(completedFalMock as any);
  const checkResult = await completedFalAdapter.checkStatus('fal-ai/kling-video/v3/image-to-video::req_done_1', 'kling_v3');
  const parsedCheckResult = ProviderGenerationResultZodSchema.safeParse(checkResult);

  assert(
    parsedCheckResult.success &&
    checkResult.status === 'completed' &&
    checkResult.outputUrl === 'https://v.fal.media/output/generated_shot_1.mp4' &&
    checkResult.progress === 100,
    '14. Normalized Success Output: Maps completed job to standard ProviderGenerationResult schema'
  );

  // 15. In-Progress Polling
  const inProgressSeedanceMock = {
    queue: {
      submit: async () => ({ request_id: 'req_prog_1' }),
      status: async () => ({
        status: 'IN_PROGRESS',
        progress: 60
      }),
      result: async () => ({}),
      cancel: async () => ({})
    }
  };
  const inProgressAdapter = new SeedanceAdapter(inProgressSeedanceMock as any);
  const progResult = await inProgressAdapter.checkStatus('bytedance/seedance-2.0::req_prog_1', 'seedance_2_0');
  assert(
    progResult.status === 'processing' &&
    progResult.progress === 60,
    '15. In-Progress Polling: Maps processing status with progress percentage'
  );

  // ===========================================================================
  // PART 5: Creative Intent Preservation (Zero Silent Degradation)
  // ===========================================================================
  console.log('\n--- PART 5: Creative Intent Preservation (Zero Silent Degradation) ---');

  // 16. Incompatible Keyframe Rejection
  // Runway Gen-3 does NOT support last_frame (supportsLastFrame: false). If a shot requests last_frame,
  // the adapter MUST report UNSUPPORTED_CONFIGURATION rather than silently dropping last_frame!
  const invalidKeyframeRequest: ProviderExecutionRequest = {
    ...validRequest,
    provider: 'fal',
    model: 'runway_gen3',
    duration: 5,
    references: [
      {
        assetId: 'asset_end_frame',
        url: 'https://cdn.example.com/end.jpg',
        role: 'last_frame',
        type: 'style',
        label: 'End Frame'
      }
    ]
  };

  const keyframeRejectedResult = await testFalAdapter.submit(invalidKeyframeRequest);
  assert(
    keyframeRejectedResult.status === 'failed' &&
    keyframeRejectedResult.error?.code === 'UNSUPPORTED_CONFIGURATION' &&
    keyframeRejectedResult.error?.message.includes('Last-frame keyframe conditioning is not supported') &&
    keyframeRejectedResult.error?.retryable === false,
    '16. Incompatible Keyframe Rejection: Rejects last_frame on unsupported model with UNSUPPORTED_CONFIGURATION',
    `Error: ${keyframeRejectedResult.error?.message}`
  );

  // 17. Incompatible Duration Rejection
  // Runway Gen-3 only supports [5, 10] seconds. Requesting 8 seconds must be strictly rejected.
  const invalidDurationRequest: ProviderExecutionRequest = {
    ...validRequest,
    provider: 'fal',
    model: 'runway_gen3',
    duration: 8,
    references: []
  };

  const durationRejectedResult = await testFalAdapter.submit(invalidDurationRequest);
  assert(
    durationRejectedResult.status === 'failed' &&
    durationRejectedResult.error?.code === 'UNSUPPORTED_CONFIGURATION' &&
    durationRejectedResult.error?.message.includes('uration 8s is not supported'),
    '17. Incompatible Duration Rejection: Rejects duration mismatch with UNSUPPORTED_CONFIGURATION',
    `Error: ${durationRejectedResult.error?.message}`
  );

  // 18. Reference Count Overrun Rejection
  // Runway Gen-3 supports maximum 2 reference images. Requesting 5 must be rejected.
  const invalidRefRequest: ProviderExecutionRequest = {
    ...validRequest,
    provider: 'fal',
    model: 'runway_gen3',
    duration: 5,
    references: [
      { assetId: '1', url: 'http://a.com/1.jpg', role: 'product_ref', type: 'product', label: '1' },
      { assetId: '2', url: 'http://a.com/2.jpg', role: 'product_ref', type: 'product', label: '2' },
      { assetId: '3', url: 'http://a.com/3.jpg', role: 'product_ref', type: 'product', label: '3' },
      { assetId: '4', url: 'http://a.com/4.jpg', role: 'style_ref', type: 'style', label: '4' },
      { assetId: '5', url: 'http://a.com/5.jpg', role: 'style_ref', type: 'style', label: '5' }
    ]
  };

  const refOverrunResult = await testFalAdapter.submit(invalidRefRequest);
  assert(
    refOverrunResult.status === 'failed' &&
    refOverrunResult.error?.code === 'UNSUPPORTED_CONFIGURATION' &&
    refOverrunResult.error?.message.includes('exceeding runway_gen3 maximum capacity of 2'),
    '18. Reference Count Overrun Rejection: Rejects reference count exceeding model capability'
  );

  // ===========================================================================
  // PART 6: Error Normalization & Retry Classification
  // ===========================================================================
  console.log('\n--- PART 6: Error Normalization & Retry Classification ---');

  // 19. Authentication Error (401/403)
  const authErr = adapterErrorNormalizer.normalize(
    new Error('HTTP 401: Invalid Fal API Key provided in Authorization header'),
    'fal',
    'kling_v3'
  );
  assert(
    authErr.code === 'AUTHENTICATION_ERROR' &&
    authErr.retryable === false,
    '19. Authentication Error: Maps 401/403 to AUTHENTICATION_ERROR (non-retryable)'
  );

  // 20. Rate Limiting with Backoff (429)
  const rateLimitErr = adapterErrorNormalizer.normalize(
    new Error('HTTP 429: Too Many Requests. Quota exceeded. Retry-After: 45'),
    'google',
    'veo_3_1_pro'
  );
  assert(
    rateLimitErr.code === 'RATE_LIMITED' &&
    rateLimitErr.retryable === true &&
    rateLimitErr.retryAfterSeconds === 45,
    '20. Rate Limiting with Backoff: Maps 429 to RATE_LIMITED with parsed retryAfterSeconds (retryable)',
    `RetryAfter: ${rateLimitErr.retryAfterSeconds}`
  );

  // 21. Content Moderation Rejection
  const safetyErr = adapterErrorNormalizer.normalize(
    new Error('The request was blocked by content moderation policy (SAFETY_BLOCKED)'),
    'seedance',
    'seedance_2_0'
  );
  assert(
    safetyErr.code === 'CONTENT_REJECTED' &&
    safetyErr.retryable === false,
    '21. Content Moderation Rejection: Maps safety blocks to CONTENT_REJECTED (non-retryable)'
  );

  // 22. Provider Outage (503 / network)
  const outageErr = adapterErrorNormalizer.normalize(
    new Error('503 Service Unavailable: upstream server temporary overload'),
    'fal',
    'runway_gen3'
  );
  assert(
    outageErr.code === 'PROVIDER_UNAVAILABLE' &&
    outageErr.retryable === true,
    '22. Provider Outage: Maps 503 to PROVIDER_UNAVAILABLE (retryable)'
  );

  // ===========================================================================
  // PART 7: Secret Scrubbing & Safe Logging
  // ===========================================================================
  console.log('\n--- PART 7: Secret Scrubbing & Safe Logging ---');

  // 23. Credential Sanitization
  const leakAttemptError = new Error(
    'Failed to authenticate with key fal_a8b9c0d1e2f3a4b5c6d7e8f9 and Gemini AIzaSyD9876543210ABCDEF token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
  );
  const sanitizedErr = adapterErrorNormalizer.normalize(leakAttemptError, 'fal', 'kling_v3');

  const containsRawFalKey = sanitizedErr.rawError?.includes('fal_a8b9c0d1e2f3a4b5c6d7e8f9');
  const containsRawGeminiKey = sanitizedErr.rawError?.includes('AIzaSyD9876543210ABCDEF');
  const containsBearer = sanitizedErr.rawError?.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  const hasRedactionTag = 
    sanitizedErr.rawError?.includes('[REDACTED_FAL_KEY]') &&
    sanitizedErr.rawError?.includes('[REDACTED_GEMINI_KEY]') &&
    sanitizedErr.rawError?.includes('[REDACTED_TOKEN]');

  assert(
    !containsRawFalKey &&
    !containsRawGeminiKey &&
    !containsBearer &&
    hasRedactionTag === true,
    '23. Credential Sanitization: Scrubs Gemini AIzaSy..., Fal fal_..., and Bearer tokens from error traces',
    `Sanitized rawError: ${sanitizedErr.rawError}`
  );

  // ===========================================================================
  // PART 8: Cancellation Handling
  // ===========================================================================
  console.log('\n--- PART 8: Cancellation Handling ---');

  // 24. Job Cancellation
  let cancelledReqId = '';
  const cancellableFalMock = {
    queue: {
      submit: async () => ({ request_id: 'cancellable_1' }),
      status: async () => ({ status: 'IN_QUEUE' }),
      cancel: async (endpoint: string, opts: any) => {
        cancelledReqId = opts.requestId;
        return { status: 'CANCELLED' };
      }
    }
  };
  const cancellableAdapter = new FalAdapter(cancellableFalMock as any);
  const cancelSuccess = await cancellableAdapter.cancel('fal-ai/kling-video/v3/image-to-video::fal_job_to_cancel', 'kling_v3');

  // Google cancellation graceful fallback
  const googleCancelResult = await testGoogleAdapter.cancel('veo_op_123', 'veo_3_1_pro');

  assert(
    cancelSuccess === true &&
    cancelledReqId === 'fal_job_to_cancel' &&
    googleCancelResult === false,
    '24. Job Cancellation: Cancels queue job on Fal; gracefully handles Google unsupported cancel',
    `Cancelled Req: ${cancelledReqId}, Google Cancel: ${googleCancelResult}`
  );

  // ===========================================================================
  // VERIFICATION SUMMARY
  // ===========================================================================
  console.log('\n================================================================');
  console.log(`🏁 PHASE 7 TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
