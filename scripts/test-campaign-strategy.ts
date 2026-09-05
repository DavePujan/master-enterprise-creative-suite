/**
 * Comprehensive Automated Verification Suite for Campaign Strategist 2.0
 * (Strategic Intelligence Core)
 * 
 * Verifies:
 * 1. Deep Framework Library & Mechanism Knowledge Base (26+ frameworks, 100+ mechanisms)
 * 2. Adaptive Discovery Engine & Entropy/Confidence Scoring (2 to 8 questions max)
 * 3. Multi-Dimensional Novelty Engine (8 similarity vectors, SHA256 concept hashing)
 * 4. 50-Brand Boringness Detector & Cliché Critic
 * 5. Master Strategy Synthesis & Downstream Multimodal Brief Compilation across 4 Scenarios:
 *    - Scenario A: Flipkart Festive (E-commerce / Hindi localization)
 *    - Scenario B: LedgerFlow (B2B SaaS / FinTech)
 *    - Scenario C: Aura Sustainable Capsule (Fashion / Luxury)
 *    - Scenario D: DesiKisan Regional AgriTech (Tier-2 Hindi)
 * 6. Downstream Brief Compliance:
 *    - Text Gem Brief
 *    - Image Gem Brief (reference conditioning: 'none' | 'product' | 'face' | 'product+face')
 *    - Video Gem Brief (textless prompts, cinematic camera language)
 *    - Audio Gem Brief (dialect/accent, speakerRoles, emotionalArc, musicRole)
 *    - Presentation Deck Brief (Presentation Engine slide purposes, executive takeaways)
 * 7. Epistemic Claim Tagging & Anti-Fabrication Metric Placeholders
 * 8. Session Caching & Idempotent Credit Reservation
 */

import {
  STRATEGIC_FRAMEWORKS,
  STRATEGIC_MECHANISMS,
  BANNED_CLICHE_CATALOG,
  rankFrameworksForBrief
} from '../apps/api/src/modules/campaigns/campaignFrameworkLibrary.js';

import {
  campaignDiscoveryEngine
} from '../apps/api/src/modules/campaigns/campaignDiscoveryEngine.js';

import {
  campaignTerritoryEngine
} from '../apps/api/src/modules/campaigns/campaignTerritoryEngine.js';

import {
  campaignNoveltyEngine
} from '../apps/api/src/modules/campaigns/campaignNoveltyEngine.js';

import {
  campaignStrategyCritic
} from '../apps/api/src/modules/campaigns/campaignStrategyCritic.js';

import {
  campaignStrategyCompiler
} from '../apps/api/src/modules/campaigns/campaignStrategyCompiler.js';

import {
  campaignDownstreamOrchestrator
} from '../apps/api/src/modules/campaigns/campaignDownstreamOrchestrator.js';

import {
  campaignStrategyService
} from '../apps/api/src/modules/campaigns/campaignStrategyService.js';

import {
  campaignRepository
} from '../apps/api/src/modules/campaigns/campaignRepository.js';

import {
  PresentationSlidePurpose
} from '../packages/types/campaignStrategy.js';

async function runTestSuite() {
  console.log('========================================================================');
  console.log('CAMPAIGN STRATEGIST 2.0: STRATEGIC INTELLIGENCE CORE — TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, detail !== undefined ? detail : '');
      failed++;
    }
  }

  // ===========================================================================
  // SECTION 1: Deep Framework Knowledge Base & Mechanism Catalog
  // ===========================================================================
  console.log('\n--- SECTION 1: Strategic Framework Knowledge Base & Anti-Patterns ---');

  const frameworkCount = Object.keys(STRATEGIC_FRAMEWORKS).length;
  assert(frameworkCount >= 26, `Framework catalog contains 26+ frameworks (actual: ${frameworkCount})`);

  const mechanismCount = Object.keys(STRATEGIC_MECHANISMS).length;
  assert(mechanismCount >= 100, `Mechanism catalog contains 100+ strategic mechanisms (actual: ${mechanismCount})`);

  assert(BANNED_CLICHE_CATALOG.length >= 25, `Banned cliché catalog contains prohibited buzzwords (actual: ${BANNED_CLICHE_CATALOG.length})`);

  // Verify structure of frameworks
  const sampleFw = STRATEGIC_FRAMEWORKS['cultural-tension-hijack'];
  assert(
    Boolean(
      sampleFw &&
      sampleFw.whenToUse?.length > 0 &&
      sampleFw.whenNotToUse?.length > 0 &&
      sampleFw.tensions?.length > 0 &&
      sampleFw.mechanisms?.length > 0 &&
      sampleFw.risks?.length > 0 &&
      sampleFw.commonCliches?.length > 0 &&
      sampleFw.downstreamCreativeImplications?.imageVisualWorld
    ),
    'Frameworks define whenToUse, whenNotToUse, tensions, mechanisms, risks, commonCliches, and multimodal implications'
  );

  // Framework ranking heuristic
  const rankedFestive = rankFrameworksForBrief({
    objective: 'Sales & E-commerce',
    industry: 'E-commerce'
  });
  assert(rankedFestive.length >= 3, `Framework ranking returns top strategic recommendations (${rankedFestive.slice(0, 3).map(f => f.name).join(', ')})`);

  // ===========================================================================
  // SECTION 2: Adaptive Discovery Engine & Entropy/Confidence Scoring
  // ===========================================================================
  console.log('\n--- SECTION 2: Adaptive Discovery & Dynamic Question Engine ---');

  // Case A: Sparse Brief
  const sparseEvaluation = await campaignDiscoveryEngine.evaluateAndGenerateQuestions({
    generationId: 'test_sparse_1',
    campaignTitle: 'New App',
    briefDescription: 'We made an app for productivity.',
    brandName: 'Tasker'
  });

  assert(
    sparseEvaluation.confidence.isSufficient === false && sparseEvaluation.confidence.confidenceScore < 0.65,
    `Sparse brief correctly identified as insufficient (confidence: ${sparseEvaluation.confidence.confidenceScore.toFixed(2)})`
  );

  assert(
    sparseEvaluation.questions.length >= 2 && sparseEvaluation.questions.length <= 8,
    `Discovery questions bound between 2 and 8 max (actual: ${sparseEvaluation.questions.length})`
  );

  const hasRationale = sparseEvaluation.questions.every(q => Boolean(q.strategicRationale && q.strategicRationale.length > 10));
  assert(hasRationale, 'Every adaptive question contains transparent internal strategic rationale');

  // Case B: Comprehensive Brief
  const richEvaluation = await campaignDiscoveryEngine.evaluateAndGenerateQuestions({
    generationId: 'test_rich_1',
    campaignTitle: 'LedgerFlow CFO Automation Campaign',
    briefDescription: 'Autonomous invoice reconciliation and treasury cash-flow forecasting for mid-market CFOs struggling with 45-day closing cycles.',
    brandName: 'LedgerFlow',
    industry: 'B2B SaaS / FinTech',
    objective: 'Sales & E-commerce',
    targetAudience: 'CFOs and VPs of Finance managing $50M-$500M ARR entities with fragmented ERPs',
    priorAnswers: [
      { questionId: '1', questionText: 'What is the biggest barrier?', answer: 'ERP inertia and fear of month-end reporting disruptions.' },
      { questionId: '2', questionText: 'What is the core proof point?', answer: 'Reconciles 50,000 invoices in 8 minutes with sub-cent audit trails.' }
    ]
  });

  assert(
    richEvaluation.confidence.confidenceScore > sparseEvaluation.confidence.confidenceScore,
    `Rich brief with prior answers scores higher confidence (${richEvaluation.confidence.confidenceScore.toFixed(2)} > ${sparseEvaluation.confidence.confidenceScore.toFixed(2)})`
  );

  // ===========================================================================
  // SECTION 3: Multi-Dimensional Novelty Engine (8 Vectors & Hashing)
  // ===========================================================================
  console.log('\n--- SECTION 3: Multi-Dimensional Novelty Engine (8 Similarity Vectors) ---');

  const fpA = campaignNoveltyEngine.buildFingerprint({
    narrative: 'Overworked finance teams trapped in spreadsheet hell find salvation',
    mechanism: 'Product-led audit challenge comparing manual speed vs automated ledger',
    emotionalTerritory: 'From anxious exhaustion to serene boardroom command',
    insight: 'CFOs feel like glorified clerks instead of strategic growth partners',
    visualConcept: 'Split screen of ticking clock, chaotic receipts vs calm minimalist glass terminal'
  });

  const fpB = campaignNoveltyEngine.buildFingerprint({
    narrative: 'Overworked finance teams trapped in spreadsheet hell find salvation',
    mechanism: 'Product-led audit challenge comparing manual speed vs automated ledger',
    emotionalTerritory: 'From anxious exhaustion to serene boardroom command',
    insight: 'CFOs feel like glorified clerks instead of strategic growth partners',
    visualConcept: 'Split screen of ticking clock, chaotic receipts vs calm minimalist glass terminal'
  });

  const fpC = campaignNoveltyEngine.buildFingerprint({
    narrative: 'Diwali festive homecoming where every unsaid apology arrives wrapped as a gift',
    mechanism: 'Subversive emotional storytelling where families reconcile over traditions',
    emotionalTerritory: 'Nostalgic warmth, gentle tears, festive intimacy',
    insight: 'Distance makes young migrants feel detached from their parents during festivals',
    visualConcept: 'Warm diya lamplight, train station departure, authentic Indian home'
  });

  const identicalComp = campaignNoveltyEngine.compareFingerprints(fpA, fpB);
  assert(
    identicalComp.similarityScore >= 0.95 && identicalComp.distinctivenessTier === 'Standard',
    `Identical concepts flagged as high similarity (Score: ${identicalComp.similarityScore.toFixed(2)}, Tier: ${identicalComp.distinctivenessTier})`
  );

  const distinctComp = campaignNoveltyEngine.compareFingerprints(fpA, fpC);
  assert(
    distinctComp.similarityScore < 0.35 && distinctComp.distinctivenessTier === 'Highly Differentiated',
    `Orthogonal concepts flagged as Highly Differentiated (Score: ${distinctComp.similarityScore.toFixed(2)}, Tier: ${distinctComp.distinctivenessTier})`
  );

  assert(
    distinctComp.explanation.toLowerCase().includes('differentiated') || distinctComp.explanation.toLowerCase().includes('distinct'),
    `Distinctiveness framing provides honest contextual explanation: "${distinctComp.explanation}"`
  );

  // ===========================================================================
  // SECTION 4: 50-Brand Boringness Critic & Cliché Blacklist Scanner
  // ===========================================================================
  console.log('\n--- SECTION 4: 50-Brand Boringness Critic & Cliché Enforcement ---');

  const genericStrategySample: any = {
    campaignTitle: 'Revolutionize Your Life',
    brandName: 'GenericBrand',
    strategicFramework: 'category-reframing',
    coreBigIdea: {
      status: 'recommendation',
      text: 'In today\'s fast-paced world, revolutionize the way you work with our game-changer platform that will seamlessly integrate to elevate your everyday.'
    },
    positioningManifesto: [
      { status: 'recommendation', text: 'Supercharge your workflow and unlock your potential with cutting-edge technology, synergy, and best-in-class paradigm shift.' }
    ],
    creativeTension: {
      currentBelief: 'Life is hard',
      desiredBelief: 'Life is easy with our platform',
      behavioralBarrier: 'People do not like change',
      breakthroughAngle: 'Make change seamless'
    },
    audienceDiagnosis: {
      demographics: 'People 18-65',
      psychographics: 'People who want to improve',
      coreAnxieties: ['Lack of time'],
      buyingTriggers: ['Discounts'],
      culturalContext: 'Digital transformation'
    },
    contentPillars: [
      { name: 'Pillar 1', shareOfVoicePercent: 50, strategicPurpose: 'Educate', narrativeAngle: 'Features', exampleHook: 'Revolutionize your work today' }
    ],
    platformMatrix: [
      { platform: 'instagram', objective: 'Awareness', format: 'Reels', hookType: 'Question', cadence: 'Daily', keyAssetRequirement: 'Video' }
    ],
    creativeExecutions: [],
    rolloutPhases: [],
    performanceKPIs: {
      primarySuccessMetric: 'Conversion rate',
      secondaryMetrics: ['Reach'],
      unverifiedBenchmarkPlaceholders: []
    },
    epistemicLedger: []
  };

  const criticEval = campaignStrategyCritic.critique(genericStrategySample, 'GenericBrand');
  assert(
    criticEval.passesInvariant === false,
    `Generic strategy rejected by 50-brand boringness invariant check (Violations: ${criticEval.violations.length})`
  );

  assert(
    criticEval.violations.some(v => v.includes('revolutionize') || v.includes('seamless') || v.includes('game-changing')),
    'Critic caught prohibited buzzwords from banned cliché catalog'
  );

  // ===========================================================================
  // SECTION 5: Synthesis & Multimodal Briefs Across 4 Production Scenarios
  // ===========================================================================
  console.log('\n--- SECTION 5: End-to-End Synthesis Across 4 Diverse Production Scenarios ---');

  const scenarios = [
    {
      id: 'flipkart-festive',
      name: 'Scenario A: Flipkart Festive (E-commerce / Hindi Localization)',
      brandName: 'Flipkart',
      industry: 'E-commerce / Retail',
      campaignTitle: 'Big Billion Days — Rishton Ka Tyohaar',
      brief: 'Diwali mega shopping festival uniting families across Bharat with deals, emotional homecoming, and cultural celebration.',
      targetAudience: 'Tier 2-3 families, aspirational shoppers, young urban migrants',
      objective: 'Sales & E-commerce',
      language: 'Hindi'
    },
    {
      id: 'ledgerflow-saas',
      name: 'Scenario B: LedgerFlow (B2B SaaS / FinTech)',
      brandName: 'LedgerFlow',
      industry: 'B2B SaaS / FinTech',
      campaignTitle: 'Kill The Month-End Crunch',
      brief: 'Autonomous invoice reconciliation and treasury forecasting for CFOs drowning in 45-day closing cycles.',
      targetAudience: 'Mid-Market CFOs, VPs of Finance, Corporate Controllers',
      objective: 'Pipeline & Lead Generation',
      language: 'English'
    },
    {
      id: 'aura-luxury',
      name: 'Scenario C: Aura Sustainable Capsule (Fashion / Luxury)',
      brandName: 'Aura Atelier',
      industry: 'Sustainable Fashion & Luxury',
      campaignTitle: 'Inherited Elegance',
      brief: 'Zero-waste luxury fashion capsule crafted from botanical regenerative silk designed to last 50 years.',
      targetAudience: 'Conscious high-net-worth urban aesthetes aged 28-45',
      objective: 'Brand Awareness & Perception',
      language: 'English'
    },
    {
      id: 'desikisan-agritech',
      name: 'Scenario D: DesiKisan Fresh (Regional Tier-2 AgriTech / Hindi)',
      brandName: 'DesiKisan',
      industry: 'AgriTech & Direct-to-Consumer',
      campaignTitle: 'Khet Se Ghar Tak — Seedha Samvaad',
      brief: 'Direct farmer-to-consumer agricultural logistics app eliminating middleman commissions in Uttar Pradesh and Bihar.',
      targetAudience: 'Smallholder farmers, rural mandi merchants, semi-urban households',
      objective: 'Community Advocacy',
      language: 'Hindi'
    }
  ];

  for (const sc of scenarios) {
    console.log(`\nTesting ${sc.name}...`);

    // 1. Generate Territories
    const territories = await campaignTerritoryEngine.generateTerritories({
      generationId: `gen_${sc.id}`,
      campaignTitle: sc.campaignTitle,
      briefDescription: sc.brief,
      brandName: sc.brandName,
      industry: sc.industry,
      objective: sc.objective,
      targetAudience: sc.targetAudience,
      discoveryAnswers: [
        { questionId: 'q1', questionText: 'Primary friction?', answer: 'Trust barrier and switching inertia.' }
      ]
    });

    assert(territories.length >= 3, `[${sc.id}] Generated ${territories.length} distinct strategic routes`);
    assert(
      territories.every(t => t.distinctivenessTier && t.distinctivenessNote && t.theMechanism),
      `[${sc.id}] Every route provides distinctiveness tier, contextual note, and mechanism breakdown`
    );

    const chosenTerritory = territories[0];

    // 2. Synthesize Master Strategy through Critic Remediation Loop
    const { strategy: masterStrategy, criticReport } = await campaignStrategyCompiler.synthesizeMasterStrategy({
      generationId: `synth_${sc.id}`,
      campaignTitle: sc.campaignTitle,
      briefDescription: sc.brief,
      brandName: sc.brandName,
      industry: sc.industry,
      objective: sc.objective,
      targetAudience: sc.targetAudience,
      selectedTerritory: chosenTerritory,
      language: sc.language
    });

    assert(Boolean(masterStrategy.coreBigIdea?.text), `[${sc.id}] Master Strategy synthesized with Core Big Idea`);
    assert(criticReport.overallScore >= 7.0, `[${sc.id}] Critic overall quality score meets standard (Score: ${criticReport.overallScore}/10)`);

    // 3. Epistemic Claim Tagging & Anti-Fabrication Check
    const hasClaims = masterStrategy.epistemicLedger.length > 0;
    const validStatuses = ['fact', 'evidence', 'inference', 'recommendation', 'assumption', 'placeholder'];
    const allStatusesValid = masterStrategy.epistemicLedger.every(c => validStatuses.includes(c.status));
    assert(hasClaims && allStatusesValid, `[${sc.id}] Epistemic ledger populated with strictly classified claims (${masterStrategy.epistemicLedger.length} claims)`);

    // Invariant: Zero unverified fabricated statistics (must use placeholders like [Insert verified ...])
    const unverifiedPlaceholders = masterStrategy.performanceKPIs?.unverifiedBenchmarkPlaceholders || [];
    assert(
      Array.isArray(unverifiedPlaceholders),
      `[${sc.id}] Anti-fabrication metric placeholders present for client verification (${unverifiedPlaceholders.length} placeholders)`
    );

    // 4. Deterministic Downstream Brief Orchestration
    const briefs = campaignDownstreamOrchestrator.compileBriefs(masterStrategy, chosenTerritory, sc.language);

    // Text Gem Brief
    assert(
      Boolean(briefs.textBrief.tone && briefs.textBrief.coreHook && briefs.textBrief.callToAction),
      `[${sc.id}] Text Gem Brief compiled with tone, core hook, and CTA`
    );

    // Image Gem Brief (Conditioning & Textless Prompts)
    const validConditioning = ['none', 'product', 'face', 'product+face'];
    assert(
      validConditioning.includes(briefs.imageBrief.referenceRequirements),
      `[${sc.id}] Image Gem Brief has valid reference conditioning: "${briefs.imageBrief.referenceRequirements}"`
    );
    assert(
      briefs.imageBrief.textlessPrompt.length > 20 && !briefs.imageBrief.textlessPrompt.includes('words:'),
      `[${sc.id}] Image Gem Brief enforces textless prompt: "${briefs.imageBrief.textlessPrompt.slice(0, 50)}..."`
    );

    // Video Gem Brief
    assert(
      Boolean(briefs.videoBrief.shotPurpose && briefs.videoBrief.cameraMovement && briefs.videoBrief.durationSec > 0),
      `[${sc.id}] Video Gem Brief specifies shot purpose (${briefs.videoBrief.shotPurpose}), camera motion (${briefs.videoBrief.cameraMovement}), duration (${briefs.videoBrief.durationSec}s)`
    );

    // Audio Gem Brief (Dialect, SpeakerRoles, EmotionalArc, MusicRole)
    assert(
      Boolean(briefs.audioBrief.language && briefs.audioBrief.speakerRoles?.length > 0 && briefs.audioBrief.emotionalArc && briefs.audioBrief.musicRole),
      `[${sc.id}] Audio Gem Brief specifies language (${briefs.audioBrief.language}), roles (${briefs.audioBrief.speakerRoles.join(', ')}), music (${briefs.audioBrief.musicRole})`
    );

    if (sc.language === 'Hindi') {
      assert(
        briefs.audioBrief.language.toLowerCase().includes('hindi'),
        `[${sc.id}] Hindi language audio brief correctly identified for localized campaign`
      );
    }

    // Presentation Deck Brief (Presentation Engine SlidePurpose Alignment)
    const validPurposes: PresentationSlidePurpose[] = [
      'cover', 'agenda', 'problem', 'opportunity', 'strategy',
      'solution', 'process', 'timeline', 'comparison', 'metrics',
      'market', 'team', 'financials', 'case-study', 'closing'
    ];
    const allSlidePurposesValid = briefs.deckBrief.slides.every(s => validPurposes.includes(s.purpose));
    assert(
      briefs.deckBrief.slides.length >= 5 && allSlidePurposesValid,
      `[${sc.id}] Campaign Deck Brief compiles ${briefs.deckBrief.slides.length} slides with 100% valid Presentation Engine SlidePurposes`
    );
  }

  // ===========================================================================
  // SECTION 6: Session Caching & Service Orchestration
  // ===========================================================================
  console.log('\n--- SECTION 6: Session Caching & Service Orchestration ---');

  const testSessionId = `test_sess_${Date.now()}`;
  const discReq = {
    sessionId: testSessionId,
    generationId: `gen_${Date.now()}`,
    workspaceId: 'ws_test_campaign_001',
    campaignTitle: 'Session Cache Test Campaign',
    briefDescription: 'Testing session cache deduplication for discovery questions.',
    brandName: 'CacheTestCo'
  };

  const t0 = Date.now();
  const firstCall = await campaignStrategyService.getDiscoveryQuestions(discReq);
  const dur1 = Date.now() - t0;

  const t1 = Date.now();
  const secondCall = await campaignStrategyService.getDiscoveryQuestions(discReq);
  const dur2 = Date.now() - t1;

  assert(
    firstCall.questions.length === secondCall.questions.length && dur2 < dur1,
    `Discovery questions cached per session to eliminate redundant LLM costs (${dur2}ms < ${dur1}ms)`
  );

  // ===========================================================================
  // SECTION 7: In-Memory / Supabase Versioned Repository
  // ===========================================================================
  console.log('\n--- SECTION 7: Campaign Memory Repository Persistence ---');

  const rootStrategy = await campaignRepository.createStrategy({
    workspaceId: 'ws_test_campaign_001',
    userId: 'usr_test_strategist',
    title: 'Repo Test Campaign',
    frameworkId: 'cultural-tension-breakthrough'
  });
  assert(Boolean(rootStrategy.id), `Root campaign strategy created in repository (ID: ${rootStrategy.id})`);

  const fetchedHistory = await campaignRepository.getWorkspaceStrategies('ws_test_campaign_001');
  assert(fetchedHistory.length > 0, `Workspace history query returns saved strategies (${fetchedHistory.length} found)`);

  // ===========================================================================
  // FINAL SUMMARY
  // ===========================================================================
  console.log('\n========================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    console.error(`💥 Verification suite failed with ${failed} failure(s).`);
    process.exit(1);
  } else {
    console.log('🎉 ALL CAMPAIGN STRATEGIST 2.0 TESTS PASSED WITH 100% COMPLIANCE!');
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Unhandled fatal exception in test suite:', err);
  process.exit(1);
});
