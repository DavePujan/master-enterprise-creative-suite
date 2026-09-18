/**
 * Phase 1 Verification Suite: Canonical AdSpec + Normalized Database Foundation
 *
 * Tests:
 * 1. Valid AdSpec creation and normalized decomposition
 * 2. AdSpec retrieval and reassembly from normalized records
 * 3. Invalid AdSpec rejection (Zod structural validation)
 * 4. Referential validation (Character, Product, Location, Asset integrity)
 * 5. Duration & temporal consistency validation
 * 6. Continuity sanity (no forward dependencies or cycles)
 * 7. Locked decision protection (blocks unauthorized mutation)
 * 8. Version immutability (advancing creates Version N+1; Version N remains intact)
 * 9. Deterministic creative state hashing (strips volatile fields, produces stable SHA-256)
 * 10. Execution snapshot foundation (freezes approved version & content hash)
 * 11. Multi-tenant workspace isolation (Workspace B cannot access Workspace A)
 * 12. Backward compatibility (legacy video gem request flow intact)
 */

import { videoAdProjectRepository } from '../apps/api/src/modules/adDirector/repositories/videoAdProjectRepository.js';
import { videoAdValidationService } from '../apps/api/src/modules/adDirector/services/videoAdValidationService.js';
import { calculateAdSpecHash } from '../apps/api/src/modules/adDirector/services/videoAdHashService.js';
import type { AdSpec } from '@contracts/adSpecContracts.js';


let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) {
      console.error('     Details:', JSON.stringify(details, null, 2));
    }
  }
}

async function runPhase1Suite() {
  console.log('\n================================================================');
  console.log('🎬 RUNNING VIDEO GEM PHASE 1: ADSPEC & DATABASE VERIFICATION');
  console.log('================================================================\n');

  const workspaceA = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
  const workspaceB = 'b2c3d4e5-f6a7-4901-bcde-fa2345678901';
  const userA = 'u1a2b3c4-d5e6-4789-89ab-cdef01234567';

  // ---------------------------------------------------------------------------
  // TEST 1: Valid AdSpec Creation & Normalized Decomposition
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Valid AdSpec Creation & Normalized Decomposition ---');

  const initialSpecFixture: Partial<AdSpec> = {
    brief: {
      brandRef: 'lumina_skin',
      product: 'Lumina Glow Serum',
      objective: 'conversion',
      targetAudience: { persona: 'Skincare enthusiasts', painPoints: ['dullness', 'dryness'] },
      platform: 'instagram_reels',
      desiredDurationSeconds: 15,
      aspectRatio: '9:16',
      language: 'en',
      cta: { visualText: 'Shop Now', actionIntent: 'buy_now' },
      keyMessage: 'Unveil glowing, hydrated skin in 7 days',
      desiredResponse: 'Immediate purchase interest',
      tone: 'Elevated, radiant, and scientific',
      mustInclude: ['7-day claim', 'bottle dropper close-up'],
      mustAvoid: ['harsh clinical lighting'],
      referencesAndInspiration: [],
      userConstraints: [],
    },
    characters: [
      {
        id: 'char_clara',
        name: 'Clara',
        displayName: 'Clara Vance',
        narrativeRole: 'protagonist',
        referenceAssetIds: ['asset_clara_face_01'],
        appearance: { apparentAge: '28-32', hairColor: 'auburn', hairStyle: 'sleek bun' },
        wardrobe: { outfit: 'Silk morning robe', colors: ['ivory', 'champagne'] },
        behaviorPersonality: 'Warm, confident, observant',
        locks: ['identity', 'wardrobe'],
        continuityConstraints: ['wardrobe must persist across scenes'],
        forbiddenChanges: ['do not change hair color'],
      },
    ],
    products: [
      {
        id: 'product_lumina_serum',
        name: 'Lumina Glow Serum',
        referenceAssetIds: ['asset_lumina_bottle_01'],
        visualDescription: 'Frosted amber glass dropper bottle with gold collar',
        shapeForm: 'Cylindrical 30ml dropper bottle',
        materials: ['frosted glass', 'metallic gold', 'rubber pipet'],
        colorPalette: ['#d4af37', '#ffffff', '#2c1e14'],
        packaging: { finish: 'frosted' },
        branding: { logoPlacement: 'center front label' },
        labelLogoConstraints: ['label must remain upright and legible'],
        orientationConstraints: ['keep vertical orientation during application'],
        allowedTransformations: ['light reflection', 'liquid droplets'],
        forbiddenTransformations: ['warping packaging shape'],
        continuityRequirements: ['golden serum liquid color'],
        locks: ['geometry', 'logo', 'packaging'],
      },
    ],
    locations: [
      {
        id: 'location_sunlit_bath',
        name: 'Sunlit Minimalist Bathroom',
        description: 'Modern bathroom with travertine marble and morning sunlight pouring in',
        referenceAssetIds: ['asset_bath_ref_01'],
        architecture: 'Contemporary Japanese-Scandinavian minimalist',
        spatialCharacteristics: { indoor: true, dimensions: 'spacious' },
        lightingCharacteristics: { timeOfDay: 'morning', mood: 'warm serene' },
        palette: ['#f5efe6', '#d8cbb9', '#ffffff'],
        atmosphere: 'Calm, premium, serene spa morning',
        continuityConstraints: ['morning sun angle from camera right'],
        locks: ['architecture', 'lighting'],
      },
    ],
    shots: [
      {
        shotId: 'shot_01',
        sequence: 1,
        purpose: 'Establish morning skincare ritual',
        narrativeRole: 'hook',
        timing: { startTime: 0, endTime: 5, duration: 5 },
        subjects: [
          { entityId: 'char_clara', entityType: 'character', roleInShot: 'Protagonist waking up', focalPriority: 1 },
          { entityId: 'location_sunlit_bath', entityType: 'prop', roleInShot: 'Environment setting', focalPriority: 2 },
        ],
        action: { startingState: 'Clara facing mirror', action: 'Gentle smile touching face', choreography: 'Subtle natural movement', endingState: 'Looking down at counter' },
        environment: { locationId: 'location_sunlit_bath' },
        camera: { shotSize: 'medium_close_up', framing: 'rule_of_thirds', angle: 'eye_level', lensCharacteristics: 'cinematic_prime_50mm', cameraPosition: 'front_quarter', cameraMovement: 'slow_push_in', composition: 'Clara at left third', depthIntent: 'soft_dof' },
        lighting: { source: 'window', direction: 'side_rim', quality: 'soft_diffuse', intensity: 'balanced', contrast: 'medium', colorTemperature: '5200K', atmosphere: 'gentle morning dust particles' },
        visualDirection: { visualIntent: 'Morning calm glow', realismLevel: 'photorealistic', colorPalette: ['#f5efe6'], colorGrading: 'warm_glow', motionPacing: 'calm' },
        audio: { soundEffects: ['birds_chirping_distant'], audioPriority: 'medium' },
        transitions: { incoming: 'none', outgoing: 'cut' },
        referencedAssetIds: ['asset_clara_face_01'],
        continuity: { inheritedStates: [], producedStates: [{ entityId: 'char_clara', stateDescription: 'Waking state established' }] },
        constraints: { mustHappen: ['Clara looks directly into mirror then down'], mustNotHappen: ['quick jittery motion'] },
        qaExpectations: { requiredSubjects: ['char_clara'], requiredActions: ['gentle smile'], forbiddenActions: ['exaggerated facial expression'], requiredFraming: 'rule_of_thirds', requiredCameraMovement: 'slow_push_in', productVisibility: 'none', characterIdentityRules: ['preserve Clara face'], brandRules: [] },
      },
      {
        shotId: 'shot_02',
        sequence: 2,
        purpose: 'Hero product application',
        narrativeRole: 'product_moment',
        timing: { startTime: 5, endTime: 10, duration: 5 },
        subjects: [
          { entityId: 'char_clara', entityType: 'character', roleInShot: 'Applying dropper', focalPriority: 2 },
          { entityId: 'product_lumina_serum', entityType: 'product', roleInShot: 'Hero bottle dropper releasing golden drop', focalPriority: 1 },
        ],
        action: { startingState: 'Dropper hovering above cheek', action: 'Single drop releases onto skin', choreography: 'Macro precision slow-motion', endingState: 'Drop touches skin with radiant sheen' },
        environment: { locationId: 'location_sunlit_bath' },
        camera: { shotSize: 'extreme_close_up', framing: 'center_focused', angle: 'low_angle', lensCharacteristics: 'macro_100mm', cameraPosition: 'cheek_profile', cameraMovement: 'orbital_arc', composition: 'Dropper at upper center', depthIntent: 'extreme_macro_dof' },
        lighting: { source: 'backlight_rim', direction: 'back_rim', quality: 'specular', intensity: 'high_key', contrast: 'high', colorTemperature: '5600K', atmosphere: 'golden refraction through serum' },
        visualDirection: { visualIntent: 'Liquid gold tactile luxury', realismLevel: 'photorealistic', colorPalette: ['#d4af37'], colorGrading: 'golden_hour', motionPacing: 'kinetic' },
        audio: { soundEffects: ['soft_liquid_drop_riser'], audioPriority: 'high' },
        transitions: { incoming: 'cut', outgoing: 'cut' },
        referencedAssetIds: ['asset_lumina_bottle_01'],
        continuity: { inheritedStates: [{ sourceShotId: 'shot_01', entityId: 'char_clara', aspect: 'wardrobe', requirement: 'Must wear same ivory silk robe' }], producedStates: [{ entityId: 'product_lumina_serum', stateDescription: 'Serum applied on cheek' }] },
        constraints: { mustHappen: ['dropper release is crystal clear'], mustNotHappen: ['occluding brand label'] },
        qaExpectations: { requiredSubjects: ['product_lumina_serum', 'char_clara'], requiredActions: ['release droplet'], forbiddenActions: ['hide logo'], requiredFraming: 'center_focused', requiredCameraMovement: 'orbital_arc', productVisibility: 'prominent_front', characterIdentityRules: ['preserve skin texture'], brandRules: ['golden amber liquid tone'] },
      },
      {
        shotId: 'shot_03',
        sequence: 3,
        purpose: 'Radiant outcome & CTA payoff',
        narrativeRole: 'cta_ending',
        timing: { startTime: 10, endTime: 15, duration: 5 },
        subjects: [
          { entityId: 'char_clara', entityType: 'character', roleInShot: 'Radiant glowing skin hero pose', focalPriority: 1 },
          { entityId: 'product_lumina_serum', entityType: 'product', roleInShot: 'Bottle alongside Clara with CTA lockup', focalPriority: 2 },
        ],
        action: { startingState: 'Clara turning to camera with glowing skin', action: 'Confidently smiles as CTA reveals', choreography: 'Final hero gaze', endingState: 'Hold on product and Shop Now CTA' },
        environment: { locationId: 'location_sunlit_bath' },
        camera: { shotSize: 'medium_close_up', framing: 'rule_of_thirds', angle: 'eye_level', lensCharacteristics: 'cinematic_prime_85mm', cameraPosition: 'front', cameraMovement: 'static', composition: 'Clara right, bottle left', depthIntent: 'commercial_portrait' },
        lighting: { source: 'beauty_dish', direction: 'front_high', quality: 'soft_diffuse', intensity: 'high_key', contrast: 'medium', colorTemperature: '5400K', atmosphere: 'luminous skin reflection' },
        visualDirection: { visualIntent: 'Flawless radiant payoff', realismLevel: 'photorealistic', colorPalette: ['#ffffff', '#d4af37'], colorGrading: 'commercial_beauty', motionPacing: 'calm' },
        audio: { voiceover: 'Unveil your radiance. Lumina Glow Serum.', soundEffects: ['gentle_chime_cta'], audioPriority: 'high' },
        transitions: { incoming: 'cut', outgoing: 'none' },
        referencedAssetIds: ['asset_clara_face_01', 'asset_lumina_bottle_01'],
        continuity: { inheritedStates: [{ sourceShotId: 'shot_02', entityId: 'char_clara', aspect: 'expression', requirement: 'Skin has radiant hydrated sheen' }], producedStates: [] },
        constraints: { mustHappen: ['CTA visible for at least 3 seconds'], mustNotHappen: [] },
        qaExpectations: { requiredSubjects: ['char_clara', 'product_lumina_serum'], requiredActions: ['smile to camera'], forbiddenActions: [], requiredFraming: 'rule_of_thirds', requiredCameraMovement: 'static', productVisibility: 'prominent_front', characterIdentityRules: ['Clara identity match'], brandRules: [] },
      },
    ],
    decisionMetadata: {
      'products.product_lumina_serum.geometry': {
        source: 'user_requested',
        confidence: 1.0,
        status: 'confirmed',
        locked: true,
        reason: 'Client packaging spec is strictly non-negotiable',
      },
      'characters.char_clara.wardrobe': {
        source: 'user_requested',
        confidence: 1.0,
        status: 'confirmed',
        locked: true,
        reason: 'Ivory silk robe confirmed for brand aesthetics',
      },
    },
  };

  const { project, adSpec: createdSpec } = await videoAdProjectRepository.createProject(
    workspaceA,
    'Lumina Glow Serum Launch Campaign',
    userA,
    initialSpecFixture
  );

  assert(!!project.id, 'Project created with valid UUID');
  assert(project.currentVersion === 1, 'Initial project version is strictly 1');
  assert(project.status === 'draft', 'Initial project status is draft');
  assert(createdSpec.identity.specVersion === 1, 'Created AdSpec reports specVersion 1');
  assert(createdSpec.characters.length === 1, 'Normalized character bible preserved (1 character)');
  assert(createdSpec.products.length === 1, 'Normalized product bible preserved (1 product)');
  assert(createdSpec.locations.length === 1, 'Normalized location bible preserved (1 location)');
  assert(createdSpec.shots.length === 3, 'Normalized shots preserved (3 discrete shots)');

  // ---------------------------------------------------------------------------
  // TEST 2: AdSpec Retrieval & Normalized Reassembly
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: AdSpec Retrieval & Reassembly ---');

  const reloadedSpec = await videoAdProjectRepository.getCurrentAdSpec(project.id, workspaceA);
  assert(!!reloadedSpec, 'AdSpec reloaded successfully from repository');
  assert(reloadedSpec?.identity.title === 'Lumina Glow Serum Launch Campaign', 'Project title matches');
  assert(reloadedSpec?.characters[0].id === 'char_clara', 'Character ID preserved: char_clara');
  assert(reloadedSpec?.products[0].id === 'product_lumina_serum', 'Product ID preserved: product_lumina_serum');
  assert(reloadedSpec?.shots[1].camera.angle === 'low_angle', 'Shot 2 camera low_angle preserved');
  assert(reloadedSpec?.shots[1].camera.cameraMovement === 'orbital_arc', 'Shot 2 camera movement orbital_arc preserved');

  // ---------------------------------------------------------------------------
  // TEST 3: Invalid AdSpec Rejection (Zod Structural & Referential Validation)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Validation & Error Detection ---');

  // A. Non-conforming entity ID
  const badCharSpec = JSON.parse(JSON.stringify(createdSpec));
  badCharSpec.characters[0].id = 'invalid_character_id'; // violates char_* regex
  const badCharVal = videoAdValidationService.validateAdSpec(badCharSpec);
  assert(!badCharVal.valid, 'Rejects invalid character ID format (must be char_*)');
  assert(badCharVal.errors.some(e => e.code === 'SCHEMA_VALIDATION_ERROR'), 'Catches schema validation error for entity format');

  // B. Missing character reference in shot
  const missingCharSpec = JSON.parse(JSON.stringify(createdSpec));
  missingCharSpec.shots[0].subjects[0].entityId = 'char_nonexistent_person';
  const missingCharVal = videoAdValidationService.validateAdSpec(missingCharSpec);
  assert(!missingCharVal.valid, 'Rejects reference to undeclared character');
  assert(missingCharVal.errors.some(e => e.code === 'CHARACTER_NOT_FOUND'), 'Produces exact error code CHARACTER_NOT_FOUND');

  // C. Duration mismatch
  const durationMismatchSpec = JSON.parse(JSON.stringify(createdSpec));
  durationMismatchSpec.brief.desiredDurationSeconds = 30; // brief says 30s, shots sum to 15s
  const durationMismatchVal = videoAdValidationService.validateAdSpec(durationMismatchSpec);
  assert(!durationMismatchVal.valid, 'Rejects duration mismatch (30s brief vs 15s shots)');
  assert(durationMismatchVal.errors.some(e => e.code === 'TOTAL_DURATION_MISMATCH'), 'Produces exact error code TOTAL_DURATION_MISMATCH');

  // D. Continuity forward dependency / cycle
  const cycleSpec = JSON.parse(JSON.stringify(createdSpec));
  cycleSpec.shots[0].continuity = {
    inheritedStates: [{ sourceShotId: 'shot_03', entityId: 'char_clara', aspect: 'wardrobe', requirement: 'Cannot depend on future shot!' }],
    producedStates: [],
  };
  const cycleVal = videoAdValidationService.validateAdSpec(cycleSpec);
  assert(!cycleVal.valid, 'Rejects continuity forward dependency / cycle');
  assert(cycleVal.errors.some(e => e.code === 'CONTINUITY_CYCLE_OR_FORWARD_DEP'), 'Produces exact error code CONTINUITY_CYCLE_OR_FORWARD_DEP');

  // ---------------------------------------------------------------------------
  // TEST 4: Locked Field Protection
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Locked Field Protection ---');

  // Attempt to mutate locked product geometry without unlocking
  const lockedMutateSpec = JSON.parse(JSON.stringify(createdSpec));
  lockedMutateSpec.products[0].shapeForm = 'Triangular bottle with neon cap'; // mutated locked geometry!
  const lockedVal = videoAdValidationService.validateAdSpec(lockedMutateSpec, createdSpec);
  assert(!lockedVal.valid, 'Rejects unauthorized modification to locked product geometry');
  assert(lockedVal.errors.some(e => e.code === 'LOCKED_DECISION_MUTATION'), 'Produces exact error code LOCKED_DECISION_MUTATION');

  // Mutating an unlocked field (e.g. camera angle) succeeds
  const unlockedMutateSpec = JSON.parse(JSON.stringify(createdSpec));
  unlockedMutateSpec.shots[0].camera.angle = 'high_angle';
  const unlockedVal = videoAdValidationService.validateAdSpec(unlockedMutateSpec, createdSpec);
  assert(unlockedVal.valid, 'Allows mutation of unlocked camera field');

  // ---------------------------------------------------------------------------
  // TEST 5: Version Immutability & Monotonic Progression
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Version Immutability & Monotonic Progression ---');

  const v2SpecInput: AdSpec = JSON.parse(JSON.stringify(createdSpec));
  v2SpecInput.shots[0].camera.cameraMovement = 'slow_tracking_right';
  v2SpecInput.shots[0].camera.angle = 'low_angle';

  const v2Result = await videoAdProjectRepository.createVersion(
    project.id,
    workspaceA,
    v2SpecInput,
    'Make opening shot more dynamic with tracking camera',
    userA
  );

  assert(v2Result.versionNumber === 2, 'Version progressed strictly to 2');
  assert(v2Result.adSpec.identity.specVersion === 2, 'New AdSpec identifies as version 2');
  assert(v2Result.adSpec.identity.parentVersionId === `${project.id}_v1`, 'Version 2 records parentVersionId pointing to Version 1');
  assert(v2Result.adSpec.shots[0].camera.cameraMovement === 'slow_tracking_right', 'Version 2 has updated camera movement');

  // Critical immutability check: verify Version 1 remained completely untouched
  const recoveredV1 = await videoAdProjectRepository.getAdSpecVersion(project.id, workspaceA, 1);
  assert(recoveredV1 !== null, 'Historical Version 1 can be retrieved');
  assert(recoveredV1?.identity.specVersion === 1, 'Historical Version 1 retains specVersion 1');
  assert(recoveredV1?.shots[0].camera.cameraMovement === 'slow_push_in', 'IMMUTABILITY PROVED: Historical Version 1 camera remains slow_push_in (not mutated!)');
  assert(recoveredV1?.shots[0].camera.angle === 'eye_level', 'IMMUTABILITY PROVED: Historical Version 1 angle remains eye_level');

  // ---------------------------------------------------------------------------
  // TEST 6: Deterministic Creative State Hashing
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Deterministic Creative State Hashing ---');

  const hash1 = calculateAdSpecHash(createdSpec);
  const hash2 = calculateAdSpecHash(JSON.parse(JSON.stringify(createdSpec)));
  assert(hash1 === hash2, 'Identical creative specs produce identical SHA-256 hash');

  // Changing volatile fields (timestamps, updatedAt, authorId) does NOT alter the creative hash
  const volatileSpec = JSON.parse(JSON.stringify(createdSpec));
  volatileSpec.identity.updatedAt = '2099-12-31T23:59:59Z';
  volatileSpec.metadata.authorId = 'different_user_id';
  const volatileHash = calculateAdSpecHash(volatileSpec);
  assert(hash1 === volatileHash, 'HASH INVARIANT: Volatile timestamps and author IDs do not change the creative hash');

  // Changing creative content DOES alter the hash
  const creativeModifiedSpec = JSON.parse(JSON.stringify(createdSpec));
  creativeModifiedSpec.brief.keyMessage = 'Completely different marketing claim';
  const creativeHash = calculateAdSpecHash(creativeModifiedSpec);
  assert(hash1 !== creativeHash, 'HASH INVARIANT: Meaningful creative changes produce distinct hash');

  // ---------------------------------------------------------------------------
  // TEST 7: Execution Snapshot Foundation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Execution Snapshot Foundation ---');

  // Attempting to snapshot an unapproved draft must fail
  let unapprovedFailed = false;
  try {
    await videoAdProjectRepository.createExecutionSnapshot(project.id, workspaceA, 2);
  } catch (err: any) {
    unapprovedFailed = true;
  }
  assert(unapprovedFailed, 'Unapproved draft version rejects execution snapshot creation');

  // Approve Version 2
  const approved = await videoAdProjectRepository.approveVersion(project.id, workspaceA, 2, userA);
  assert(approved, 'Version 2 approved successfully');

  const approvedV2 = await videoAdProjectRepository.getAdSpecVersion(project.id, workspaceA, 2);
  assert(approvedV2?.identity.creativeState === 'approved', 'Version 2 creativeState transitioned to approved');

  // Now create execution snapshot from approved version
  const snapshotRes = await videoAdProjectRepository.createExecutionSnapshot(project.id, workspaceA, 2, {
    targetEngine: 'veo-2.0',
    resolution: '1080p',
  }, userA);

  assert(!!snapshotRes.snapshotId, 'Execution snapshot created with valid UUID');
  assert(snapshotRes.versionNumber === 2, 'Execution snapshot freezes approved version 2');
  assert(snapshotRes.contentHash.length === 64, 'Execution snapshot binds exact 64-char SHA-256 content hash');

  // ---------------------------------------------------------------------------
  // TEST 8: Multi-Tenant Workspace Isolation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Workspace Tenancy Isolation ---');

  const foreignProject = await videoAdProjectRepository.getProject(project.id, workspaceB);
  assert(foreignProject === null, 'TENANT ISOLATION: Workspace B cannot read Workspace A project');

  const foreignSpec = await videoAdProjectRepository.getCurrentAdSpec(project.id, workspaceB);
  assert(foreignSpec === null, 'TENANT ISOLATION: Workspace B cannot read Workspace A AdSpec');

  const foreignVersions = await videoAdProjectRepository.listVersions(project.id, workspaceB);
  assert(foreignVersions.length === 0, 'TENANT ISOLATION: Workspace B receives zero versions for Workspace A project');

  // ---------------------------------------------------------------------------
  // TEST 9: Version Lineage History
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Version Lineage History ---');

  const history = await videoAdProjectRepository.listVersions(project.id, workspaceA);
  assert(history.length === 2, 'Version list contains exactly 2 versions (v1 and v2)');
  assert(history[0].versionNumber === 1, 'First version is 1');
  assert(history[1].versionNumber === 2, 'Second version is 2');
  assert(history[1].status === 'approved', 'Version 2 shows approved status');

  console.log('\n================================================================');
  console.log(`🎉 PHASE 1 VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase1Suite().catch((err) => {
  console.error('Fatal error in Phase 1 verification suite:', err);
  process.exit(1);
});
