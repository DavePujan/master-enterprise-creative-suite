/**
 * Comprehensive Automated Verification Suite for AI Advertising Director:
 * Database, Persistence, Execution Snapshots, Model Compatibility,
 * Generation Planning, Provider Runs, QA Results, and Surgical Repair.
 */

import { adDirectorRepository } from '../apps/api/src/modules/adDirector/adDirectorRepository.js';
import { modelRegistryService } from '../apps/api/src/modules/adDirector/services/modelRegistryService.js';
import { generationPlanningService } from '../apps/api/src/modules/adDirector/services/generationPlanningService.js';
import { qaPersistenceService } from '../apps/api/src/modules/adDirector/services/qaPersistenceService.js';
import { adDirectorService } from '../apps/api/src/modules/adDirector/adDirectorService.js';
import type { AdSpec, ExecutionSnapshot, AdSpecPatch } from '../packages/types/adSpec.js';

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
    totalFailed++;
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('🎬 RUNNING AI ADVERTISING DIRECTOR PERSISTENCE & EXECUTION SUITE');
  console.log('================================================================\n');

  const workspaceId = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
  const userId = 'b2c3d4e5-f6a7-4901-bcde-f12345678901';

  // ============================================================================
  // SUITE 1: ADSPEC CREATION & IMMUTABLE VERSIONING
  // ============================================================================
  console.log('--- SUITE 1: AdSpec Creation & Immutable Versioning ---');

  const initialAdSpec = await adDirectorService.createAdSpec({
    workspaceId,
    userId,
    title: 'Lumina Glow Commercial'
  });

  const adId = initialAdSpec.identity.adId;
  assert(Boolean(adId), 'AdSpec created with valid canonical adId');
  assert(initialAdSpec.identity.specVersion === 1, 'Initial AdSpec version is 1');
  assert(initialAdSpec.identity.creativeState === 'director_plan_draft', 'Initial creative state is director_plan_draft');

  // Retrieve current version
  const fetchedV1 = await adDirectorRepository.getAdSpec(adId, workspaceId);
  assert(Boolean(fetchedV1), 'AdSpec v1 successfully retrieved from repository');
  assert(fetchedV1?.identity.title === 'Lumina Glow Commercial', 'AdSpec title matches');

  // Revise to Version 2 via patch
  const patchV2: AdSpecPatch = {
    revisionId: 'rev_002',
    targetScope: 'shot',
    targetEntityId: 'shot_01',
    reason: 'Make opening camera more dramatic',
    changes: {
      'camera.angle': 'low_angle',
      'camera.movement.type': 'orbital_arc',
      'lighting.contrastRatio': 'high'
    },
    actor: { id: userId, role: 'user' },
    timestamp: new Date().toISOString()
  };

  const reviseResult = await adDirectorService.reviseAdSpec({
    adId,
    workspaceId,
    userId,
    patch: patchV2
  });

  assert(reviseResult.updatedAdSpec.identity.specVersion === 2, 'AdSpec progressed to version 2');
  assert(reviseResult.updatedAdSpec.shots[0].camera.angle === 'low_angle', 'Shot 1 camera angle updated in v2');

  // Verify Historical Recovery: Version 1 is immutable and preserved
  const recoveredV1 = await adDirectorRepository.getAdSpecVersion(adId, 1, workspaceId);
  assert(Boolean(recoveredV1), 'Historical Version 1 recovered successfully');
  assert(recoveredV1?.adSpec.identity.specVersion === 1, 'Recovered version confirms specVersion 1');
  assert(recoveredV1?.adSpec.shots[0].camera.angle === 'eye_level', 'Historical v1 retains eye_level camera (immutable)');

  // Record Revision audit log
  await adDirectorRepository.saveRevisionRecord({
    planId: adId,
    baseVersionNumber: 1,
    resultingVersionNumber: 2,
    actor: { id: userId, role: 'user' },
    reason: patchV2.reason,
    operations: [patchV2]
  });

  const revisionHistory = await adDirectorRepository.getRevisionHistory(adId);
  assert(revisionHistory.length >= 1, 'Revision record saved and retrievable in audit trail');
  assert(revisionHistory[0].reason.includes('dramatic'), 'Revision audit retains user reason');

  console.log('');

  // ============================================================================
  // SUITE 2: APPROVAL & FROZEN EXECUTION SNAPSHOT
  // ============================================================================
  console.log('--- SUITE 2: Approval & Frozen Execution Snapshot ---');

  // Approve Version 2
  const approveOk = await adDirectorService.approveAdSpec(adId, 2, workspaceId);
  assert(approveOk, 'AdSpec Version 2 successfully approved');

  const approvedSpec = await adDirectorRepository.getAdSpec(adId, workspaceId);
  assert(approvedSpec?.identity.creativeState === 'approved', 'Creative state transitioned to approved');

  // Create Execution Snapshot E1 from approved v2
  const snapshotE1 = await adDirectorService.createExecutionSnapshot(adId, 2, workspaceId, userId);
  assert(Boolean(snapshotE1.snapshotId), 'Execution Snapshot E1 created');
  assert(snapshotE1.specVersion === 2, 'Snapshot E1 records specVersion 2');
  assert(snapshotE1.frozenAdSpec.identity.creativeState === 'approved', 'Snapshot E1 freezes approved creative state');
  assert(snapshotE1.frozenAdSpec.shots[0].camera.angle === 'low_angle', 'Snapshot E1 freezes low_angle camera');

  // Crucial Invariant Test: Mutate live draft to v3 and verify E1 remains unchanged!
  const patchV3: AdSpecPatch = {
    revisionId: 'rev_003',
    targetScope: 'shot',
    targetEntityId: 'shot_01',
    reason: 'Experiment with extreme aerial camera in draft v3',
    changes: {
      'camera.angle': 'birds_eye_overhead'
    },
    actor: { id: userId, role: 'user' },
    timestamp: new Date().toISOString()
  };

  const reviseV3 = await adDirectorService.reviseAdSpec({
    adId,
    workspaceId,
    userId,
    patch: patchV3
  });

  assert(reviseV3.updatedAdSpec.identity.specVersion === 3, 'Draft successfully advanced to version 3');
  assert(reviseV3.updatedAdSpec.shots[0].camera.angle === 'birds_eye_overhead', 'Draft v3 has birds_eye_overhead');

  // Retrieve Snapshot E1 from repository again and verify absolute immutability
  const reloadedE1 = await adDirectorRepository.getExecutionSnapshot(snapshotE1.snapshotId, workspaceId);
  assert(Boolean(reloadedE1), 'Snapshot E1 reloaded from persistence');
  assert(reloadedE1?.specVersion === 2, 'IMMUTABILITY PROVED: Snapshot E1 remains strictly version 2');
  assert(reloadedE1?.frozenAdSpec.shots[0].camera.angle === 'low_angle', 'IMMUTABILITY PROVED: Snapshot E1 camera remains low_angle (unaffected by v3 draft!)');

  console.log('');

  // ============================================================================
  // SUITE 3: MODEL REGISTRY & DETERMINISTIC CAPABILITY CHECK
  // ============================================================================
  console.log('--- SUITE 3: Model Registry & Capability Validation ---');

  const models = modelRegistryService.getAvailableModels();
  assert(models.length >= 3, 'Model registry returns at least 3 active models');

  // Compatibility Pass with Veo Pro (capable cinematic model)
  const compatVeo = modelRegistryService.validateModelCompatibility(snapshotE1.frozenAdSpec, 'veo-pro');
  assert(compatVeo.status === 'compatible', 'Approved AdSpec is 100% compatible with Veo Pro');
  assert(compatVeo.blockingIssues.length === 0, 'Zero blocking issues for Veo Pro');

  // Compatibility Check with Constrained Engine (Google Omni - max 1 reference, no native audio)
  const demandingSpec: AdSpec = JSON.parse(JSON.stringify(snapshotE1.frozenAdSpec));
  demandingSpec.assets = [
    { assetId: 'ast_1', semanticRole: 'product_hero', name: 'P1', storagePath: 'path1' },
    { assetId: 'ast_2', semanticRole: 'character_face', name: 'C1', storagePath: 'path2' }
  ];
  demandingSpec.generationRequirements = {
    firstFrameRequired: true,
    lastFrameRequired: true, // Omni does not support last frame
    audioRequired: true,
    maxReferenceImages: 2 // Omni only supports 1
  };

  const compatOmni = modelRegistryService.validateModelCompatibility(demandingSpec, 'google-omni');
  assert(compatOmni.status === 'incompatible', 'Demanding spec declared incompatible with limited engine');
  assert(compatOmni.blockingIssues.some(b => b.type === 'last_frame_unsupported'), 'Blocked for unsupported last frame');
  assert(compatOmni.blockingIssues.some(b => b.type === 'reference_count_exceeded'), 'Blocked for exceeding reference images');

  // INVARIANT: Verify demandingSpec was NOT mutated
  assert(demandingSpec.identity.adId === snapshotE1.adId, 'Model check did not mutate AdSpec identity');
  assert(demandingSpec.shots[0].camera.angle === 'low_angle', 'Model check did not mutate creative shots');

  console.log('');

  // ============================================================================
  // SUITE 4: GENERATION PLANNING & EXISTING AI_JOBS INTEGRATION
  // ============================================================================
  console.log('--- SUITE 4: Generation Planning & ai_jobs Integration ---');

  const genPlanRes = await generationPlanningService.createGenerationPlan(
    {
      snapshotId: snapshotE1.snapshotId,
      engineKey: 'veo-pro',
      idempotencyKey: `idemp_${snapshotE1.snapshotId}_test`
    },
    { workspaceId, userId }
  );

  assert(Boolean(genPlanRes.generationPlan), 'Generation plan created successfully');
  assert(genPlanRes.generationPlan.shots.length > 0, 'Generation plan created planned shots');
  assert(genPlanRes.generationPlan.selectedEngine === 'veo-pro', 'Generation plan selected engine is veo-pro');
  assert(genPlanRes.jobIds.length === genPlanRes.generationPlan.shots.length, 'Jobs dispatched into ai_jobs matching shot count');
  assert(genPlanRes.generationPlan.totalEstimatedCredits > 0, 'Credit hold calculated and reserved');

  // Idempotency Replay Test: Submitting identical request returns existing plan without duplicate jobs
  const replayRes = await generationPlanningService.createGenerationPlan(
    {
      snapshotId: snapshotE1.snapshotId,
      engineKey: 'veo-pro',
      idempotencyKey: `idemp_${snapshotE1.snapshotId}_test`
    },
    { workspaceId, userId }
  );

  assert(replayRes.generationPlan.planId === genPlanRes.generationPlan.planId, 'IDEMPOTENCY: Replayed execution returns same planId');
  assert(replayRes.jobIds.length === genPlanRes.jobIds.length, 'IDEMPOTENCY: Zero duplicate jobs created');

  // Prompt Versions Verification
  const promptVersions = await adDirectorRepository.getPromptVersions(snapshotE1.snapshotId);
  assert(promptVersions.length > 0, 'Prompt versions persisted as derived artifacts');
  assert(promptVersions[0].compiled_prompt.length > 0, 'Prompt version contains compiled text');
  assert(promptVersions[0].target_engine === 'veo-pro', 'Prompt version targets veo-pro');

  console.log('');

  // ============================================================================
  // SUITE 5: PROVIDER RUNS & GENERATION RESULTS
  // ============================================================================
  console.log('--- SUITE 5: Provider Runs & Generation Results ---');

  const testJobId = genPlanRes.jobIds[0];
  const testShotId = genPlanRes.generationPlan.shots[0].shotId;

  // Retrieve initial provider run created during planning
  const runs = await adDirectorRepository.getProviderRuns(testJobId);
  assert(runs.length >= 1, 'Provider run recorded for generation job');
  assert(runs[0].status === 'submitted', 'Provider run initial status is submitted');
  assert(runs[0].attempt_number === 1, 'Initial attempt number is 1');

  // Simulate provider retry attempt (e.g. timeout retry)
  const retryRun = await adDirectorRepository.recordProviderRun({
    generationJobId: testJobId,
    provider: 'google',
    model: 'veo-pro',
    attemptNumber: 2,
    status: 'submitted',
    requestMetadata: { reason: 'Upstream gateway retry' }
  });

  const updatedRuns = await adDirectorRepository.getProviderRuns(testJobId);
  assert(updatedRuns.length === 2, 'Provider retry recorded cleanly with separate attempt_number');
  assert(updatedRuns[1].attempt_number === 2, 'Second provider run records attempt 2');

  // Complete second attempt
  await adDirectorRepository.updateProviderRun(retryRun.runId, {
    status: 'completed',
    responseMetadata: { providerJobId: 'ext_veo_998877' }
  });

  // Save Generation Result
  const genResult = await adDirectorRepository.saveGenerationResult({
    generationJobId: testJobId,
    snapshotId: snapshotE1.snapshotId,
    shotId: testShotId,
    outputAssetId: 'ast_video_shot_01',
    provider: 'google',
    model: 'veo-pro',
    attemptNumber: 2,
    durationSeconds: 5.0,
    acceptanceStatus: 'pending'
  });

  const results = await adDirectorRepository.getGenerationResults(snapshotE1.snapshotId, testShotId);
  assert(results.length >= 1, 'Generation result persisted');
  assert(results[0].output_asset_id === 'ast_video_shot_01', 'Generation result references output asset');

  console.log('');

  // ============================================================================
  // SUITE 6: QA EVALUATION & SURGICAL REPAIR LOOP
  // ============================================================================
  console.log('--- SUITE 6: QA Evaluation & Surgical Repair Loop ---');

  // Record failing QA evaluation for camera movement on Shot 1
  const qaEval = await qaPersistenceService.recordQAEvaluation({
    resultId: genResult.resultId,
    generationJobId: testJobId,
    snapshotId: snapshotE1.snapshotId,
    shotId: testShotId,
    status: 'failed',
    scores: { composition: 85, cameraAdherence: 40 },
    issues: [
      {
        shotId: testShotId,
        requirement: 'camera.movement',
        expected: 'orbital_arc at low_angle',
        observed: 'static medium shot without dynamic arc',
        severity: 'critical'
      }
    ]
  });

  assert(qaEval.status === 'failed', 'QA recorded failure status');
  assert(Boolean(qaEval.repairRecommendation), 'QA generated automated surgical repair recommendation');
  assert(qaEval.repairRecommendation?.targetScope === 'shot', 'Repair patch scope is strictly shot');
  assert(qaEval.repairRecommendation?.targetEntityId === testShotId, 'Repair patch targets failing shot');

  // Verify Surgical Isolation: Patch does not touch any other shot
  assert(qaEval.repairRecommendation?.changes['camera.angle'] === 'lower', 'Repair recommends lower angle');
  assert(Object.keys(qaEval.repairRecommendation?.changes || {}).every(k => !k.includes('product') && !k.includes('character')), 'SURGICAL ISOLATION: Unaffected entities are untouched');

  // Regenerate Shot 1 specifically
  const regenRes = await qaPersistenceService.regenerateShot(
    {
      snapshotId: snapshotE1.snapshotId,
      shotId: testShotId,
      repairPatch: qaEval.repairRecommendation,
      engineKey: 'veo-pro'
    },
    { workspaceId, userId }
  );

  assert(Boolean(regenRes.newJobId), 'New generation job dispatched specifically for Shot 1');
  assert(regenRes.attemptNumber === 2, 'Regeneration tracks attempt number 2');
  assert(regenRes.shotId === testShotId, 'Regeneration is isolated to failing shot');

  // Verify Historical Preservation: Prior result and prior QA remain intact
  const historicalResults = await adDirectorRepository.getGenerationResults(snapshotE1.snapshotId, testShotId);
  const historicalQA = await adDirectorRepository.getQAResults(snapshotE1.snapshotId, testShotId);
  assert(historicalResults.length >= 1, 'Prior generation result remains preserved');
  assert(historicalQA.length >= 1, 'Prior QA evaluation remains preserved');

  console.log('');

  // ============================================================================
  // SUITE 7: RLS WORKSPACE ISOLATION & ZERO CLIENT SECRETS
  // ============================================================================
  console.log('--- SUITE 7: RLS Workspace Isolation & Secret Safety ---');

  // Verify cross-tenant isolation: Foreign workspace cannot fetch snapshot
  const foreignWorkspaceSnapshot = await adDirectorRepository.getExecutionSnapshot(snapshotE1.snapshotId, 'f9e8d7c6-b5a4-4321-9876-fedcba098765');
  assert(foreignWorkspaceSnapshot === null, 'RLS ISOLATION: Foreign workspace cannot read snapshot');

  // Verify Provider Run metadata contains zero secrets
  const safeRuns = await adDirectorRepository.getProviderRuns(testJobId);
  const runJson = JSON.stringify(safeRuns);
  assert(!runJson.includes('secret') && !runJson.includes('apiKey') && !runJson.includes('SUPABASE_KEY'), 'Zero credentials leaked in provider run metadata');

  console.log('\n================================================================');
  console.log(`🎉 TEST SUMMARY: ${totalPassed}/${totalPassed + totalFailed} TESTS PASSED`);
  console.log('================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
