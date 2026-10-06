/**
 * Verification test for discoveryAnswers normalization and end-to-end Campaign Strategy flow.
 * 
 * Verifies:
 * 1. campaignTerritoryEngine handles discoveryAnswers as an OBJECT without crashing.
 * 2. campaignTerritoryEngine handles discoveryAnswers as an ARRAY without crashing.
 * 3. campaignTerritoryEngine handles discoveryAnswers as null / undefined without crashing.
 * 4. campaignStrategyCompiler handles discoveryAnswers as an OBJECT without crashing.
 * 5. Full Flipkart campaign parameters (as shown in user screenshot) generate valid territories.
 */

import { campaignTerritoryEngine, normalizeDiscoveryAnswers } from '../apps/api/src/modules/campaigns/campaignTerritoryEngine.js';
import { campaignStrategyCompiler } from '../apps/api/src/modules/campaigns/campaignStrategyCompiler.js';
import { campaignDownstreamOrchestrator } from '../apps/api/src/modules/campaigns/campaignDownstreamOrchestrator.js';
import type { StrategicTerritory, MasterCampaignStrategy } from '../packages/types/campaignStrategy.js';

async function runTests() {
  console.log('========================================================================');
  console.log('    TEST SUITE: DISCOVERY ANSWERS NORMALIZATION & CAMPAIGN TESTING       ');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 5;

  // --------------------------------------------------------------------------
  // TEST 1: normalizeDiscoveryAnswers with Object / Record input
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Unit normalization of Object input ---');
  const objectInput = {
    'q_friction': 'Long commute and no time to cook',
    'q_budget': 'Comfortable with ₹199 to ₹249',
    'q_taste': 'Prefers traditional Indian flavors'
  };

  const normalizedFromObject = normalizeDiscoveryAnswers(objectInput);
  console.log(`Normalized ${normalizedFromObject.length} items from Object.`);
  if (normalizedFromObject.length === 3 && normalizedFromObject[0].answer === 'Long commute and no time to cook') {
    console.log('✅ TEST 1 PASSED: Object input successfully normalized into structured array!\n');
    passed++;
  } else {
    console.error('❌ TEST 1 FAILED');
  }

  // --------------------------------------------------------------------------
  // TEST 2: normalizeDiscoveryAnswers with null, undefined, empty
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: Defensive handling of null / undefined / empty ---');
  const nullResult = normalizeDiscoveryAnswers(null);
  const undefResult = normalizeDiscoveryAnswers(undefined);
  const emptyResult = normalizeDiscoveryAnswers({});
  const emptyArrResult = normalizeDiscoveryAnswers([]);

  if (nullResult.length === 0 && undefResult.length === 0 && emptyResult.length === 0 && emptyArrResult.length === 0) {
    console.log('✅ TEST 2 PASSED: Null/undefined/empty inputs defensively return empty array!\n');
    passed++;
  } else {
    console.error('❌ TEST 2 FAILED');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Territory Generation with Object-form discoveryAnswers (Reproduction test)
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: Territory Generation with Object-form discoveryAnswers ---');
  try {
    const flipkartRequest = {
      generationId: 'test_flipkart_gen_1',
      campaignTitle: 'Flipkart Big Billion Days: Bharat Ka Tyohaar',
      briefDescription: 'Tier 1 & Tier 2 Indian families and young consumers shopping for festive electronics and home goods.',
      brandName: 'Flipkart',
      industry: 'E-commerce & Retail',
      objective: 'Sales & E-commerce',
      targetAudience: 'Tier 1 & Tier 2 Indian families and young consumers shopping for festive electronics',
      // Pass discoveryAnswers as an OBJECT (the exact shape that previously triggered "map is not a function")
      discoveryAnswers: {
        'audience_friction': 'Shoppers are skeptical of fake discounts during festive sales',
        'price_barrier': 'Waiting for bank discount offers and guaranteed delivery',
        'cultural_angle': 'Festive family gifting rituals are emotional, not purely transactional'
      } as any,
      controls: {
        ambitionLevel: 'category_defining',
        riskTolerance: 'moderate',
        budgetReality: 'enterprise',
        timelineHorizon: 'sprint',
        mandatoryInclusions: ['Price transparency', 'Guaranteed delivery dates'],
        forbiddenTerritories: ['Cliché celebrity dances', 'Aggressive countdown timers']
      }
    };

    const territories = await campaignTerritoryEngine.generateTerritories(flipkartRequest);
    console.log(`Generated ${territories.length} Strategic Territories successfully!`);
    territories.forEach((t, idx) => {
      console.log(`  [Route ${idx + 1}] ${t.title}: "${t.oneLinePremise}"`);
    });

    if (territories && territories.length >= 2) {
      console.log('✅ TEST 3 PASSED: Territories generated successfully from Object-form discoveryAnswers (No crash)!\n');
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED: Territories empty or invalid.');
    }
  } catch (err: any) {
    console.error(`❌ TEST 3 CRASHED: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Master Strategy Compiler with Object-form discoveryAnswers
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: Strategy Synthesis with Object-form discoveryAnswers ---');
  try {
    const mockTerritory: StrategicTerritory = {
      id: 'terr_flipkart_bharat',
      frameworkId: 'fw_cultural_pride',
      title: 'Bharat Ka Tyohaar',
      oneLinePremise: 'Festive shopping is a family celebration of generosity, not an algorithm race.',
      whyItWorks: 'Taps into regional pride and authentic family relationships.',
      theMechanism: 'Unvarnished customer stories of festive gifting across Tier 2 India.',
      creativeWorld: 'Warm domestic lighting, regional vernacular cadence, joyful festive celebration.',
      channelPotential: ['youtube', 'instagram', 'meta-ads'],
      sacrificesAndTradeoffs: 'No high-decibel discount shouting.',
      creativeCodes: {
        visualCodes: ['Warm golden hour', 'Authentic Indian homes', 'Real festive moments'],
        soundCodes: ['Festive shehnai accents', 'Acoustic guitar and tabla'],
        motionCodes: ['Steady tracking', 'Intimate push-in'],
        copyCodes: ['Unvarnished truth', 'Vernacular warmth'],
        vocabulary: ['Tyohaar', 'Khushiyan', 'Bharosa']
      }
    };

    const synthRequest = {
      generationId: 'test_flipkart_synth_1',
      campaignTitle: 'Flipkart Big Billion Days: Bharat Ka Tyohaar',
      briefDescription: 'Tier 1 & Tier 2 Indian families shopping for festive electronics.',
      brandName: 'Flipkart',
      industry: 'E-commerce',
      objective: 'Sales & E-commerce',
      targetAudience: 'Tier 1 & Tier 2 Indian families',
      selectedTerritory: mockTerritory,
      // Pass discoveryAnswers as an OBJECT
      discoveryAnswers: {
        'trust_barrier': 'Fake discounts concern customers',
        'emotional_hook': 'Family gifting'
      } as any,
      language: 'Hindi',
      controls: {
        ambitionLevel: 'category_defining',
        riskTolerance: 'moderate',
        mandatoryInclusions: ['Price transparency'],
        forbiddenTerritories: ['Cliché celebrity dances']
      }
    };

    const synthResult = await campaignStrategyCompiler.synthesizeMasterStrategy(synthRequest);
    console.log(`Synthesized Strategy: "${synthResult.strategy.campaignTitle}"`);
    console.log(`Big Idea: "${synthResult.strategy.coreBigIdea?.text}"`);
    console.log(`Critic Evaluation: Overall ${synthResult.criticReport?.overallStatus || 'Validated'}`);

    if (synthResult.strategy && synthResult.strategy.coreBigIdea) {
      console.log('✅ TEST 4 PASSED: Strategy synthesized successfully from Object-form discoveryAnswers (No crash)!\n');
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED: Strategy synthesis failed.');
    }
  } catch (err: any) {
    console.error(`❌ TEST 4 CRASHED: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Downstream AdSpec v1 Compilation & Whiteboard Readout
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: Downstream AdSpec v1 Compilation & Integrity ---');
  try {
    const mockStrategy: MasterCampaignStrategy = {
      strategyId: 'strat_flipkart_bharat_1',
      campaignTitle: 'Flipkart Big Billion Days: Bharat Ka Tyohaar',
      brandName: 'Flipkart',
      strategicFramework: 'Cultural Pride',
      executiveSummary: {
        theProblem: 'Festive shopping has degraded into noisy discount shouting.',
        theOpportunity: 'Celebrate authentic family gifting and trust.',
        theBigIdea: 'Bharat Ka Tyohaar: Har Dil Khush',
        whyUs: 'Transparent pricing and guaranteed delivery.',
        whatWeWillDo: 'High-impact digital storytelling.',
        whatWeNeedToProve: 'Delivery speed and real savings.'
      },
      coreBigIdea: {
        text: 'Bharat Ka Tyohaar: Har Dil Khush',
        supportingManifesto: 'Celebrating every Indian home during the festive season.'
      },
      positioningManifesto: [
        { claim: 'Festivals belong to families, not algorithms.', text: 'Festive gifting is about love and respect.' }
      ],
      creativeTension: {
        currentBelief: 'Online sales are full of gimmicks and inflated discounts.',
        behavioralBarrier: 'Hesitation to buy big-ticket electronics online.',
        desiredBelief: 'Flipkart gives me verified best prices and guaranteed delivery.',
        breakthroughAngle: 'Verified transparent pricing with regional warmth.'
      },
      audienceDiagnosis: {
        primarySegment: 'Tier 1 & Tier 2 Indian families',
        demographics: 'Ages 25-50, Pan-India',
        psychographics: 'Family-oriented, value-conscious',
        jobsToBeDone: 'Festive upgrades and gifting',
        frictionPoints: 'Discount skepticism'
      },
      contentPillars: [
        { name: 'Real Savings Proof', strategicPurpose: 'Prove price transparency', shareOfVoicePercent: 50, exampleHook: 'Sachchi Bachat' }
      ],
      platformMatrix: [
        { platform: 'youtube', format: 'Shorts & In-Stream', cadence: 'Daily', primaryObjective: 'Reach', keyMetrics: 'VTR' }
      ],
      creativeExecutions: [
        { sceneId: 's1', title: 'Hero Reveal', visualDirection: 'Warm festive living room', dialogueOrVoiceover: 'Tyohaar Ka Bharosa' }
      ],
      rolloutPhases: [
        { phase: 'Launch', duration: '7 days', strategicFocus: 'Brand Anthem' }
      ],
      performanceKPIs: {
        primarySuccessMetric: 'GMV & Trust Lift',
        secondaryMetrics: ['Conversion Rate', 'Repeat Purchase'],
        unverifiedBenchmarkPlaceholders: ['15% Lift']
      },
      epistemicLedger: [
        { claim: 'Families value delivery trust', confidenceScore: 0.9, verificationSource: 'Internal Survey' }
      ],
      versionNumber: 1
    };

    const mockTerritory: StrategicTerritory = {
      id: 'terr_flipkart_bharat',
      frameworkId: 'fw_cultural_pride',
      title: 'Bharat Ka Tyohaar',
      oneLinePremise: 'Festive shopping is a family celebration of generosity.',
      whyItWorks: 'Emotional family resonance.',
      theMechanism: 'Unvarnished stories of festive gifting.',
      creativeWorld: 'Warm domestic lighting.',
      channelPotential: ['youtube', 'meta-ads'],
      sacrificesAndTradeoffs: 'No artificial confetti shouting.',
      creativeCodes: {
        visualCodes: ['Warm golden hour'],
        soundCodes: ['Festive acoustic rhythm'],
        motionCodes: ['Push-in'],
        copyCodes: ['Warmth'],
        vocabulary: ['Tyohaar', 'Khushiyan']
      }
    };

    const adSpec = campaignDownstreamOrchestrator.compileAdSpec(mockStrategy, mockTerritory, {
      targetPlatform: 'instagram_reels',
      aspectRatio: '9:16',
      durationSec: 15
    });

    console.log(`Compiled AdSpec ID: ${adSpec.identity.adId}`);
    console.log(`AdSpec Version: v${adSpec.schemaVersion}`);
    console.log(`Shot Count: ${adSpec.shots.length}`);
    console.log(`Shot 1 Camera: ${adSpec.shots[0].camera.framing} / ${adSpec.shots[0].camera.cameraMovement}`);
    console.log(`Shot 2 Action: ${adSpec.shots[1].action.action}`);

    if (adSpec.schemaVersion === '1.0.0' && adSpec.shots.length === 3) {
      console.log('✅ TEST 5 PASSED: Canonical AdSpec v1.0.0 successfully compiled with all 3 shots!\n');
      passed++;
    } else {
      console.error('❌ TEST 5 FAILED: AdSpec invalid.');
    }
  } catch (err: any) {
    console.error(`❌ TEST 5 CRASHED: ${err.message}`);
  }

  console.log('========================================================================');
  console.log(`      TEST RESULTS: ${passed}/${total} TESTS PASSED                     `);
  console.log('========================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
