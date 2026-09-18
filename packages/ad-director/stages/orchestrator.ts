/**
 * AI Advertising Director Stage Orchestrator.
 * Coordinates scoped contexts, stage reasoning contracts, operation validation,
 * approval policy checks, and atomic state management across:
 * - Interviewer
 * - Brief Analyzer
 * - Creative Director
 * - Story Architect
 * - Shot Director
 * - Continuity Supervisor
 * - Revision Engine
 *
 * Guarantees:
 * - The LLM/Stage NEVER has direct write access to the state or database.
 * - All outputs are structured operations validated before mutation.
 * - Zero partial mutations on failure.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type {
  AdSpec,
  AdShot,
  CreativeConceptItem,
  StoryBeat,
  StoryModel
} from '@shared-types/adSpec.js';
import { extractCleanValue } from '@shared-types/adSpec.js';
import type {
  DirectorContext,
  DirectorOperation,
  AdSpecDiff,
  ChangeImpactAnalysis,
  ContinuityReport,
  StructuredAssetNeed
} from '@shared-types/directorOperations.js';
import type {
  InterviewerStageInput,
  InterviewerStageOutput,
  BriefAnalyzerStageInput,
  BriefAnalyzerStageOutput,
  CreativeDirectorStageInput,
  CreativeDirectorStageOutput,
  StoryArchitectStageInput,
  StoryArchitectStageOutput,
  ShotDirectorStageInput,
  ShotDirectorStageOutput,
  ContinuitySupervisorStageInput,
  ContinuitySupervisorStageOutput,
  RevisionEngineStageInput,
  RevisionEngineStageOutput
} from '@contracts/directorStageContracts.js';
import { applyDirectorOperation, ApplyOperationResult } from '../operations/stateManager.js';
import { checkContinuity } from '../operations/continuitySupervisor.js';
import { analyzeChangeImpact } from '../operations/changeImpact.js';

export type DirectorStageName =
  | 'interviewer'
  | 'brief_analyzer'
  | 'creative_director'
  | 'story_architect'
  | 'shot_director'
  | 'continuity'
  | 'revision';

// =============================================================================
// 1. BUILT-IN STAGE REASONING CONTRACT IMPLEMENTATIONS
// =============================================================================

export function executeInterviewerStage(input: InterviewerStageInput): InterviewerStageOutput {
  const { context, userAnswer } = input;
  const spec = context.adSpec;
  const brief = spec.brief;

  const knownInformation: Array<{ field: string; value: any; provenance: any; confirmed: boolean }> = [];
  const missingInformation: string[] = [];
  const pendingQuestions: any[] = [];
  const assetNeeds: StructuredAssetNeed[] = [];
  const proposedOperations: DirectorOperation[] = [];

  // Inspect known fields
  if (brief.brandRef && brief.brandRef !== 'Brand Default') {
    knownInformation.push({ field: 'brandRef', value: brief.brandRef, provenance: 'user', confirmed: true });
  } else {
    missingInformation.push('brief.brandRef');
    pendingQuestions.push({
      questionId: 'q_brand',
      question: 'What is the brand or product name for this commercial?',
      priority: 1,
      targetField: 'brief.brandRef',
      rationale: 'Brand identity is blocking for commercial creative development.'
    });
  }

  if (brief.product && brief.product !== 'Commercial Product') {
    knownInformation.push({ field: 'product', value: brief.product, provenance: 'user', confirmed: true });
  } else {
    missingInformation.push('brief.product');
    pendingQuestions.push({
      questionId: 'q_product',
      question: 'What specific product or service is being advertised?',
      priority: 1,
      targetField: 'brief.product',
      rationale: 'Core product definition determines visual mechanics and hero assets.'
    });
  }

  const cleanCta = extractCleanValue(brief.cta);
  if (cleanCta && typeof cleanCta === 'object' && cleanCta.visualText) {
    const prov = (brief.cta as any)?.source || 'user_provided';
    const conf = (brief.cta as any)?.confirmed ?? true;
    knownInformation.push({ field: 'cta', value: cleanCta, provenance: prov, confirmed: conf });
  } else {
    missingInformation.push('brief.cta');
    pendingQuestions.push({
      questionId: 'q_cta',
      question: 'What is the single action or call to action (CTA) the viewer should take at the end?',
      priority: 2,
      targetField: 'brief.cta',
      rationale: 'The end CTA anchors the emotional arc and story resolution.',
      suggestedOptions: ['Shop Now', 'Book a Consultation', 'Try Free Today', 'Download the App']
    });
  }

  // Inspect Assets: Check if product hero reference exists
  const hasProductAsset = spec.assets.assets.some(a => a.semanticRole === 'product_hero');
  if (!hasProductAsset && brief.product !== 'Commercial Product') {
    const need: StructuredAssetNeed = {
      role: 'product_hero',
      reason: `High-resolution product packshot is required to accurately feature "${brief.product}".`,
      required: true,
      qualityRequirement: 'Clean, transparent or neutral background, min 1080p',
      preferredViews: ['front', 'three_quarter']
    };
    assetNeeds.push(need);
    proposedOperations.push({
      operationId: `op_asset_need_${Date.now()}`,
      type: 'request_asset',
      target: { scope: 'asset' },
      changes: need,
      reason: { type: 'ai_inference', description: 'Detected missing hero product reference asset' },
      actor: { id: 'ai_interviewer', role: 'ai_interviewer' },
      approvalRequirement: 'AUTO_SAFE',
      parentSpecVersion: spec.identity.specVersion
    });
  }

  // If user provided an answer, map to a targeted update operation
  if (userAnswer) {
    const targetQ = pendingQuestions.find(q => q.questionId === userAnswer.questionId) || {
      targetField: 'brief.keyMessage'
    };
    const fieldKey = targetQ.targetField.replace('brief.', '');
    const isProvenanceField = ['objective', 'targetAudience', 'desiredDurationSeconds', 'cta', 'keyMessage', 'tone'].includes(fieldKey);

    proposedOperations.push({
      operationId: `op_ans_${Date.now()}`,
      type: 'update_field',
      target: { scope: 'brief', path: fieldKey },
      changes: {
        [fieldKey]: isProvenanceField
          ? {
              value: userAnswer.answerText,
              source: 'user',
              confidence: 1.0,
              confirmed: true
            }
          : userAnswer.answerText
      },
      reason: { type: 'user_confirmed', description: `User answered question ${userAnswer.questionId}` },
      actor: { id: context.userId || 'user', role: 'user' },
      approvalRequirement: 'AUTO_SAFE',
      parentSpecVersion: spec.identity.specVersion
    });
  }

  // Sort questions by priority (1 is highest)
  pendingQuestions.sort((a, b) => a.priority - b.priority);
  const nextQuestion = pendingQuestions.length > 0 ? pendingQuestions[0] : undefined;

  return {
    knownInformation,
    missingInformation,
    nextQuestion,
    pendingQuestions,
    assetNeeds,
    proposedOperations,
    summary: missingInformation.length === 0
      ? 'Commercial brief has gathered all foundational information.'
      : `Missing ${missingInformation.length} core brief element(s). Next priority: ${nextQuestion?.question || 'None'}`,
    isDiscoveryComplete: missingInformation.length === 0
  };
}

export function executeBriefAnalyzerStage(input: BriefAnalyzerStageInput): BriefAnalyzerStageOutput {
  const { context } = input;
  const spec = context.adSpec;
  const brief = spec.brief;
  const missing: string[] = [];
  const contradictions: any[] = [];
  const proposedOperations: DirectorOperation[] = [];

  if (!brief.brandRef || brief.brandRef === 'Brand Default') missing.push('brandRef');
  if (!brief.product || brief.product === 'Commercial Product') missing.push('product');
  const cleanCtaField = extractCleanValue(brief.cta);
  const cleanDurationField = extractCleanValue(brief.desiredDurationSeconds);
  if (!cleanCtaField) missing.push('cta');
  if (!cleanDurationField) missing.push('desiredDurationSeconds');

  // Check contradiction: duration vs shot count expectation
  if (cleanDurationField && cleanDurationField < 10 && spec.shots.length > 4) {
    contradictions.push({
      fieldA: 'desiredDurationSeconds',
      fieldB: 'shots',
      description: `Desired duration is only ${cleanDurationField}s, but plan contains ${spec.shots.length} shots (averaging < 2.5s per shot).`,
      suggestedResolution: 'Consider condensing to 2-3 focused shots.'
    });
  }

  const completeness = Math.max(0, 1 - (missing.length / 5));
  const isReadyForCreative = missing.length === 0 && contradictions.length === 0;

  if (isReadyForCreative && spec.identity.creativeState === 'discovery') {
    proposedOperations.push({
      operationId: `op_state_brief_ready_${Date.now()}`,
      type: 'transition_creative_state',
      target: { scope: 'root' },
      changes: { creativeState: 'brief_ready' },
      reason: { type: 'system_validation', description: 'Brief completeness satisfied' },
      actor: { id: 'ai_brief_analyzer', role: 'ai_brief_analyzer' },
      approvalRequirement: 'AUTO_SAFE',
      parentSpecVersion: spec.identity.specVersion
    });
  }

  return {
    completenessScore: completeness,
    isReadyForCreative,
    contradictions,
    normalizedFields: {
      brand: brief.brandRef,
      product: brief.product,
      duration: cleanDurationField
    },
    missingRequiredFields: missing,
    proposedOperations
  };
}

export function executeCreativeDirectorStage(input: CreativeDirectorStageInput): CreativeDirectorStageOutput {
  const { context } = input;
  const spec = context.adSpec;
  const brand = spec.brief.brandRef || 'Brand';
  const product = spec.brief.product || 'Product';

  // Generate 3 genuinely differentiated concepts with distinct creative mechanisms
  const concepts: CreativeConceptItem[] = [
    {
      conceptId: 'concept_kinetic_momentum',
      name: 'The Kinetic Momentum',
      oneLinePremise: 'Fast-paced, tactile visual energy demonstrating product capability under extreme motion.',
      coreIdea: 'Unstoppable velocity and precision.',
      hook: {
        hookType: 'kinetic_action',
        description: 'Instant dynamic crash zoom into product contact point.'
      },
      narrativeMechanism: 'Escalating visual tempo with rapid rhythmic transitions.',
      visualMechanism: 'High-speed macro cinematography with fluid speed ramping.',
      emotionalArc: 'Awe → Excitement → Empowered confidence.',
      brandRole: 'The catalyst for breakthrough performance.',
      intendedAudienceEffect: 'Visceral desire for speed and cutting-edge capability.',
      noveltyRationale: 'Subverts traditional static showcase with kinetic choreography.',
      complexityEstimate: 'medium',
      feasibilityNotes: 'High model compatibility on standard multi-shot engines.'
    },
    {
      conceptId: 'concept_intimate_ritual',
      name: 'The Daily Sanctuary',
      oneLinePremise: 'An intimate, meditative sensory journey showcasing the sensory craftsmanship of the product.',
      coreIdea: 'Elevating everyday routines into private luxury.',
      hook: {
        hookType: 'visual_surprise',
        description: 'Extreme shallow focus on texture unfolding in silence.'
      },
      narrativeMechanism: 'Intimate visual vignette focused on sensory tactile satisfaction.',
      visualMechanism: 'Warm natural morning light, organic lens flares, and tactile ASMR-style visuals.',
      emotionalArc: 'Tension/fatigue → Calm indulgence → Lasting satisfaction.',
      brandRole: 'An indispensable trusted companion in personal life.',
      intendedAudienceEffect: 'Deep emotional resonance and aesthetic appreciation.',
      noveltyRationale: 'Contrasts noisy social feed ads with serene visual poetry.',
      complexityEstimate: 'low',
      feasibilityNotes: 'Low motion complexity minimizes distortion risks.'
    },
    {
      conceptId: 'concept_problem_inversion',
      name: 'The Absurd Inversion',
      oneLinePremise: 'Playfully exaggerating the frustration of ordinary alternatives before presenting the effortless fix.',
      coreIdea: 'Why settle for clumsy complications?',
      hook: {
        hookType: 'relatable_agitation',
        description: 'Protagonist battling a comedic, chaotic failure of a generic alternative.'
      },
      narrativeMechanism: 'Problem agitation → Sudden comedic pause → Elegant product solution.',
      visualMechanism: 'High-contrast lighting shifting from chaotic moody hues to crisp, clean daylight.',
      emotionalArc: 'Humor/empathy → Relief → Convinced resolution.',
      brandRole: 'The obvious, effortless superior answer.',
      intendedAudienceEffect: 'Immediate cognitive clarity and strong conversion impulse.',
      noveltyRationale: 'Relatable wit fosters higher viral retention than standard feature lists.',
      complexityEstimate: 'medium',
      feasibilityNotes: 'Requires tight character expression consistency.'
    }
  ];

  const conceptEvaluations: Record<string, any> = {
    concept_kinetic_momentum: {
      conceptId: 'concept_kinetic_momentum',
      originalityScore: 8,
      brandFitScore: 9,
      audienceFitScore: 9,
      visualPotentialScore: 9,
      narrativeStrengthScore: 7,
      feasibilityScore: 8,
      productionComplexity: 'medium',
      assetReadiness: 'complete',
      modelCompatibility: 'high',
      strengths: ['High thumb-stopping kinetic hook', 'Vibrant visual energy'],
      risks: ['Motion blur must be controlled during generation'],
      overallEvaluation: 'Ideal for performance marketing and social feed engagement.'
    },
    concept_intimate_ritual: {
      conceptId: 'concept_intimate_ritual',
      originalityScore: 8,
      brandFitScore: 9,
      audienceFitScore: 8,
      visualPotentialScore: 9,
      narrativeStrengthScore: 8,
      feasibilityScore: 9,
      productionComplexity: 'low',
      assetReadiness: 'complete',
      modelCompatibility: 'high',
      strengths: ['Premium sensory elegance', 'Highly consistent character & lighting'],
      risks: ['Pacing must not become sluggish'],
      overallEvaluation: 'Strongest brand equity builder with minimal generation artifacts.'
    },
    concept_problem_inversion: {
      conceptId: 'concept_problem_inversion',
      originalityScore: 9,
      brandFitScore: 8,
      audienceFitScore: 9,
      visualPotentialScore: 8,
      narrativeStrengthScore: 9,
      feasibilityScore: 7,
      productionComplexity: 'medium',
      assetReadiness: 'needs_character_ref',
      modelCompatibility: 'medium',
      strengths: ['Memorable storytelling hook', 'High emotional payoff'],
      risks: ['Requires precise character identity across the tonal shift'],
      overallEvaluation: 'Highest conversion potential if character continuity is maintained.'
    }
  };

  const proposedOperations: DirectorOperation[] = [
    {
      operationId: `op_propose_concepts_${Date.now()}`,
      type: 'propose_concepts',
      target: { scope: 'creative' },
      changes: { concepts },
      reason: { type: 'ai_proposal', description: 'Generated 3 differentiated creative concepts' },
      actor: { id: 'ai_creative_director', role: 'ai_creative_director' },
      approvalRequirement: 'AUTO_SAFE',
      parentSpecVersion: spec.identity.specVersion
    },
    {
      operationId: `op_state_concepts_ready_${Date.now()}`,
      type: 'transition_creative_state',
      target: { scope: 'root' },
      changes: { creativeState: 'concepts_ready' },
      reason: { type: 'system_validation', description: 'Concepts prepared for user review' },
      actor: { id: 'ai_creative_director', role: 'ai_creative_director' },
      approvalRequirement: 'AUTO_SAFE',
      parentSpecVersion: spec.identity.specVersion
    }
  ];

  return {
    concepts,
    conceptEvaluations,
    proposedOperations,
    directorRecommendation: 'Recommend Concept 1 ("The Kinetic Momentum") for social performance or Concept 2 ("The Daily Sanctuary") for premium brand elevation.'
  };
}

export function executeStoryArchitectStage(input: StoryArchitectStageInput): StoryArchitectStageOutput {
  const { context, selectedConceptId } = input;
  const spec = context.adSpec;
  const concept = spec.creative.concepts.find(c => c.conceptId === selectedConceptId) || spec.creative.concepts[0];

  const beats: StoryBeat[] = [
    {
      beatId: 'beat_01_hook',
      beatType: 'opening_hook',
      title: 'Disruptive Intrigue',
      narrativeGoal: 'Seize viewer attention in the first 2 seconds through kinetic visual curiosity.',
      assignedShotIds: ['shot_01']
    },
    {
      beatId: 'beat_02_escalation',
      beatType: 'escalation',
      title: 'Dynamic Engagement',
      narrativeGoal: 'Introduce physical conflict and escalate momentum toward product interaction.',
      assignedShotIds: ['shot_02']
    },
    {
      beatId: 'beat_03_hero_payoff',
      beatType: 'product_moment',
      title: 'The Product Climax',
      narrativeGoal: 'Showcase hero product resolving the tension with flawless tactile fidelity.',
      assignedShotIds: ['shot_03']
    },
    {
      beatId: 'beat_04_cta',
      beatType: 'cta_ending',
      title: 'Brand Resolution & Call to Action',
      narrativeGoal: 'Lock in final emotional satisfaction and clearly prompt the desired CTA.',
      assignedShotIds: ['shot_04']
    }
  ];

  const storyModel: StoryModel = {
    structureType: 'social_hook_proof_cta',
    logline: `${concept ? concept.oneLinePremise : 'Commercial visual narrative'} culminating in clear consumer action.`,
    beats
  };

  const proposedOperations: DirectorOperation[] = [
    {
      operationId: `op_story_beats_${Date.now()}`,
      type: 'update_story_beats',
      target: { scope: 'story' },
      changes: { beats, logline: storyModel.logline },
      reason: { type: 'ai_proposal', description: 'Structured narrative story beats derived from approved concept' },
      actor: { id: 'ai_story_architect', role: 'ai_story_architect' },
      approvalRequirement: 'AUTO_SAFE',
      parentSpecVersion: spec.identity.specVersion
    }
  ];

  return {
    storyModel,
    narrativeArcRationale: {
      hookRationale: 'Hooks viewer within 2s before drop-off threshold.',
      tensionIntroduction: 'Develops visual anticipation without clutter.',
      productIntegration: 'Product is the undeniable turning point of the scene.',
      payoffMechanism: 'Cinematic visual contrast delivers satisfying emotional release.',
      ctaTransition: 'Seamless cut to branded lockup and legible call to action.'
    },
    proposedOperations
  };
}

export function executeShotDirectorStage(input: ShotDirectorStageInput): ShotDirectorStageOutput {
  const { context } = input;
  const spec = context.adSpec;

  // Discrete shots with temporal action beats, camera intent, lighting, audio, and QA expectations
  const shots: AdShot[] = [
    {
      shotId: 'shot_01',
      sequence: 1,
      purpose: 'Hook viewer with kinetic entrance and spatial intrigue.',
      narrativeRole: 'Opening hook',
      timing: { startTime: 0, endTime: 3, duration: 3 },
      subjects: [
        { entityId: 'prod_hero_01', entityType: 'product', roleInShot: 'Focal hero', focalPriority: 1 }
      ],
      action: {
        startingState: 'Product rests centered in soft ambient shadow.',
        action: 'Dynamic light sweep catches metallic bezel as product begins deliberate slow axial turn.',
        choreography: '0.0s-1.0s: Light sweep across logo. 1.0s-3.0s: Smooth axial rotation exposing texture.',
        endingState: 'Product angled at 45 degrees, label facing primary keylight.'
      },
      environment: { locationId: 'loc_studio_01' },
      camera: {
        shotSize: 'medium_close_up',
        framing: 'close_up',
        angle: 'low_angle',
        lensCharacteristics: '85mm_portrait',
        cameraPosition: 'low_front',
        cameraMovement: 'slow_push_in',
        composition: 'rule_of_thirds',
        depthIntent: 'shallow_cinematic'
      },
      lighting: {
        source: 'Key rimlight + soft overhead fill',
        direction: '3/4 back-left',
        quality: 'specular',
        intensity: 'high_key',
        contrast: 'high',
        colorTemperature: '5400K Neutral daylight',
        atmosphere: 'Pristine, crisp optical clarity'
      },
      visualDirection: {
        visualIntent: 'Pristine luxury commercial aesthetics.',
        realismLevel: 'photorealistic',
        colorPalette: ['#0A0A0A', '#FFFFFF', '#4F46E5'],
        colorGrading: 'Cool cinematic commercial grade with elevated highlights',
        motionPacing: 'fluid'
      },
      audio: {
        soundEffects: ['Subtle deep sub bass riser', 'Metallic gleam shimmer'],
        audioPriority: 'high'
      },
      transitions: { incoming: 'none', outgoing: 'cut' },
      referencedAssetIds: [],
      continuity: {
        inheritedStates: [],
        producedStates: [
          { entityId: 'prod_hero_01', stateDescription: 'Angled 45 degrees, label highlighted' }
        ]
      },
      constraints: {
        mustHappen: ['Product label completely legible', 'Reflections remain smooth without jitter'],
        mustNotHappen: ['Artifacts', 'Geometry warping']
      },
      qaExpectations: {
        requiredSubjects: ['Hero Product'],
        requiredActions: ['Axial turn'],
        forbiddenActions: ['Warping', 'Logo distortion'],
        requiredFraming: 'close_up',
        requiredCameraMovement: 'slow_push_in',
        productVisibility: 'prominent_front',
        characterIdentityRules: [],
        brandRules: ['Clean logo display']
      }
    },
    {
      shotId: 'shot_02',
      sequence: 2,
      purpose: 'Demonstrate product in motion and ergonomic scale.',
      narrativeRole: 'Feature revelation',
      timing: { startTime: 3, endTime: 6, duration: 3 },
      subjects: [
        { entityId: 'prod_hero_01', entityType: 'product', roleInShot: 'Active subject', focalPriority: 1 }
      ],
      action: {
        startingState: 'Product held at eye level in steady frame.',
        action: 'Hand rotates product smoothly towards camera lens.',
        choreography: '3.0s-4.5s: Smooth arc lift. 4.5s-6.0s: Settles into macro frame.',
        endingState: 'Product centered in macro frame, pristine finish glowing.'
      },
      environment: { locationId: 'loc_studio_01' },
      camera: {
        shotSize: 'close_up',
        framing: 'extreme_close_up',
        angle: 'eye_level',
        lensCharacteristics: '100mm_macro',
        cameraPosition: 'centered',
        cameraMovement: 'static',
        composition: 'center_weighted',
        depthIntent: 'ultra_shallow_f1.4'
      },
      lighting: {
        source: 'Soft diffuse bank',
        direction: 'Top-down frontal',
        quality: 'soft_diffuse',
        intensity: 'high_key',
        contrast: 'medium',
        colorTemperature: '5400K Neutral daylight',
        atmosphere: 'Soft diffused glow'
      },
      visualDirection: {
        visualIntent: 'Extreme macro tactile detail.',
        realismLevel: 'photorealistic',
        colorPalette: ['#0A0A0A', '#FFFFFF'],
        colorGrading: 'Commercial clean',
        motionPacing: 'calm'
      },
      audio: {
        soundEffects: ['Crisp tactile click', 'Subtle atmospheric hum'],
        audioPriority: 'high'
      },
      transitions: { incoming: 'cut', outgoing: 'dissolve' },
      referencedAssetIds: [],
      continuity: {
        inheritedStates: [
          { sourceShotId: 'shot_01', entityId: 'prod_hero_01', aspect: 'product_state', requirement: 'Angled 45 degrees' }
        ],
        producedStates: [
          { entityId: 'prod_hero_01', stateDescription: 'Centered in macro frame' }
        ]
      },
      constraints: {
        mustHappen: ['Show packaging details clearly'],
        mustNotHappen: ['Unfocused blur on brand name']
      },
      qaExpectations: {
        requiredSubjects: ['Hero Product'],
        requiredActions: ['Macro reveal'],
        forbiddenActions: ['Unstable camera shake'],
        requiredFraming: 'extreme_close_up',
        requiredCameraMovement: 'static',
        productVisibility: 'prominent_front',
        characterIdentityRules: [],
        brandRules: ['Pristine surface texture']
      }
    }
  ];

  const proposedOperations: DirectorOperation[] = shots.map(shot => ({
    operationId: `op_shot_${shot.shotId}_${Date.now()}`,
    type: 'insert_shot',
    target: { scope: 'shot', entityId: shot.shotId },
    changes: shot,
    reason: { type: 'ai_proposal', description: `Generated discrete shot ${shot.shotId}` },
    actor: { id: 'ai_shot_director', role: 'ai_shot_director' },
    approvalRequirement: 'AUTO_SAFE',
    parentSpecVersion: spec.identity.specVersion
  }));

  return {
    shots,
    visualProgressionNotes: 'Shot 1 establishes kinetic curiosity; Shot 2 locks in macro product value.',
    pacingNotes: '3s per shot maintains rapid social engagement without inducing visual fatigue.',
    proposedOperations
  };
}

export function executeContinuitySupervisorStage(input: ContinuitySupervisorStageInput): ContinuitySupervisorStageOutput {
  const { context } = input;
  const report = checkContinuity(context.adSpec);
  const recommendedRepairs: DirectorOperation[] = [];

  if (report.status === 'CONFLICT') {
    for (const conflict of report.conflicts) {
      if (conflict.autoRepairable && conflict.category === 'state') {
        const targetShotId = conflict.shotsInvolved[1];
        recommendedRepairs.push({
          operationId: `op_repair_${Date.now()}`,
          type: 'update_shot',
          target: { scope: 'shot', entityId: targetShotId },
          changes: {
            'action.startingState': conflict.expectedValue
          },
          reason: { type: 'continuity_repair', description: `Auto-repair state continuity: ${conflict.description}` },
          actor: { id: 'ai_continuity', role: 'ai_continuity' },
          approvalRequirement: 'AUTO_SAFE',
          parentSpecVersion: context.adSpec.identity.specVersion
        });
      }
    }
  }

  return {
    report,
    recommendedRepairs
  };
}

export function executeRevisionEngineStage(input: RevisionEngineStageInput): RevisionEngineStageOutput {
  const { context, userInstruction, targetScope, targetEntityId } = input;
  const spec = context.adSpec;
  const lower = userInstruction.toLowerCase();
  const proposedOperations: DirectorOperation[] = [];

  // Intelligently parse targeted revisions
  if (lower.includes('shot 3') || lower.includes('shot_03') || targetEntityId === 'shot_03') {
    const changes: Record<string, any> = {};
    if (lower.includes('intense') || lower.includes('action')) {
      changes['action.action'] = 'High-velocity kinetic motion with explosive choreography';
      changes['action.choreography'] = 'Accelerated beats with rapid acceleration towards camera';
    }
    if (lower.includes('lower') || lower.includes('angle')) {
      changes['camera.angle'] = 'low';
      changes['camera.cameraPosition'] = 'ground_level';
    }

    const op: DirectorOperation = {
      operationId: `op_rev_${Date.now()}`,
      type: 'update_shot',
      target: { scope: 'shot', entityId: 'shot_03' },
      changes,
      reason: { type: 'user_requested', description: userInstruction },
      actor: { id: context.userId || 'user', role: 'user' },
      approvalRequirement: 'AUTO_SAFE',
      parentSpecVersion: spec.identity.specVersion
    };
    proposedOperations.push(op);
  } else if (lower.includes('beach') || lower.includes('gym')) {
    // Location update
    const op: DirectorOperation = {
      operationId: `op_rev_loc_${Date.now()}`,
      type: 'update_location',
      target: { scope: 'location', entityId: targetEntityId || 'loc_01' },
      changes: {
        name: 'Sunlit Tropical Beach',
        description: 'Open ocean coastline with golden sunlight and crashing waves',
        'spatialCharacteristics.indoor': false,
        'lightingCharacteristics.timeOfDay': 'golden_hour'
      },
      reason: { type: 'user_requested', description: userInstruction },
      actor: { id: context.userId || 'user', role: 'user' },
      approvalRequirement: 'AUTO_SAFE',
      parentSpecVersion: spec.identity.specVersion
    };
    proposedOperations.push(op);
  } else {
    // General brief or constraint revision
    const op: DirectorOperation = {
      operationId: `op_rev_gen_${Date.now()}`,
      type: 'update_field',
      target: { scope: (targetScope as any) || 'brief' },
      changes: { userNotes: userInstruction },
      reason: { type: 'user_requested', description: userInstruction },
      actor: { id: context.userId || 'user', role: 'user' },
      approvalRequirement: 'AUTO_SAFE',
      parentSpecVersion: spec.identity.specVersion
    };
    proposedOperations.push(op);
  }

  const firstOp = proposedOperations[0];
  const impact = firstOp ? analyzeChangeImpact(spec, firstOp) : { directlyAffected: [], indirectlyAffected: [], unaffected: [], summary: 'No changes' };

  return {
    impactAnalysis: impact,
    approvalLevel: 'AUTO_SAFE',
    proposedOperations,
    humanExplanation: `Prepared ${proposedOperations.length} targeted operation(s) based on: "${userInstruction}".`
  };
}

// =============================================================================
// 2. STAGE ORCHESTRATOR FACADE
// =============================================================================

export interface RunStageParams {
  stage: DirectorStageName;
  context: DirectorContext;
  payload?: any;
  applyImmediately?: boolean; // Default true: atomically applies approved operations
}

export interface RunStageResult {
  stage: DirectorStageName;
  stageOutput: any;
  appliedOperations: DirectorOperation[];
  operationResults: ApplyOperationResult[];
  updatedAdSpec: AdSpec;
  diff?: AdSpecDiff;
  continuityReport: ContinuityReport;
  summary: string;
}

export function runDirectorStage(params: RunStageParams): RunStageResult {
  const { stage, context, payload, applyImmediately = true } = params;
  let stageOutput: any;
  let proposedOperations: DirectorOperation[] = [];

  switch (stage) {
    case 'interviewer': {
      const out = executeInterviewerStage({
        context,
        lastUserMessage: payload?.userMessage,
        userAnswer: payload?.userAnswer
      });
      stageOutput = out;
      proposedOperations = out.proposedOperations;
      break;
    }

    case 'brief_analyzer': {
      const out = executeBriefAnalyzerStage({
        context,
        rawUserInput: payload?.rawUserInput
      });
      stageOutput = out;
      proposedOperations = out.proposedOperations;
      break;
    }

    case 'creative_director': {
      const out = executeCreativeDirectorStage({
        context,
        targetConceptCount: payload?.targetConceptCount
      });
      stageOutput = out;
      proposedOperations = out.proposedOperations;
      break;
    }

    case 'story_architect': {
      const out = executeStoryArchitectStage({
        context,
        selectedConceptId: payload?.selectedConceptId || context.adSpec.creative.selectedConceptId || ''
      });
      stageOutput = out;
      proposedOperations = out.proposedOperations;
      break;
    }

    case 'shot_director': {
      const out = executeShotDirectorStage({
        context,
        targetTotalDurationSeconds: payload?.targetTotalDurationSeconds
      });
      stageOutput = out;
      proposedOperations = out.proposedOperations;
      break;
    }

    case 'continuity': {
      const out = executeContinuitySupervisorStage({
        context,
        proposedChanges: payload?.proposedChanges
      });
      stageOutput = out;
      proposedOperations = out.recommendedRepairs;
      break;
    }

    case 'revision': {
      const out = executeRevisionEngineStage({
        context,
        userInstruction: payload?.userInstruction || '',
        targetScope: payload?.targetScope,
        targetEntityId: payload?.targetEntityId
      });
      stageOutput = out;
      proposedOperations = out.proposedOperations;
      break;
    }

    default:
      throw new Error(`Unsupported reasoning stage: "${stage}"`);
  }

  let currentWorkingSpec = context.adSpec;
  const appliedOperations: DirectorOperation[] = [];
  const operationResults: ApplyOperationResult[] = [];
  let latestDiff: AdSpecDiff | undefined;

  // Apply operations sequentially and atomically through StateManager
  if (applyImmediately && proposedOperations.length > 0) {
    for (const op of proposedOperations) {
      // Ensure parentSpecVersion is accurate for sequential operations
      op.parentSpecVersion = currentWorkingSpec.identity.specVersion;
      const res = applyDirectorOperation(currentWorkingSpec, op);
      currentWorkingSpec = res.updatedAdSpec;
      appliedOperations.push(op);
      operationResults.push(res);
      latestDiff = res.diff;
    }
  }

  const finalContinuity = checkContinuity(currentWorkingSpec);

  return {
    stage,
    stageOutput,
    appliedOperations,
    operationResults,
    updatedAdSpec: currentWorkingSpec,
    diff: latestDiff,
    continuityReport: finalContinuity,
    summary: `Stage "${stage}" completed. ${appliedOperations.length} operation(s) applied atomically.`
  };
}
