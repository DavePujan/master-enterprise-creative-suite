/**
 * Master Campaign Strategy Compiler for Campaign Strategist 2.0.
 * Ingests the selected Strategic Route, operational controls, and discovery answers.
 * Compiles a deep, executive-friendly strategic playbook:
 * - "In 30 Seconds" Executive Summary
 * - "What Changed From My Brief" transformation card
 * - Potential Failure Modes & Mitigation Playbooks
 * - "Still Unknown" Unknowns Panel (Epistemic Humility)
 * - Competitor White Space
 * - 5-Stage Customer Decision Journey (Problem Recognition -> Retention/Advocacy)
 * - Channel Elimination & Fitness Matrix (with monitor_only and excluded)
 * - Dynamic 5-Tier Campaign Production Plan with Gem-resolved costs
 * Validates quality via the multi-tier Strategy Critic loop.
 */

import {
  MasterCampaignStrategy,
  StrategicTerritory,
  DiscoveryAnswer,
  CampaignBriefControls,
  CustomerJourneyStage,
  ChannelDecision
} from '../../../../../packages/types/campaignStrategy.js';
import { campaignLLMGateway } from './campaignLLMGateway.js';
import { campaignStrategyCritic, CriticEvaluationResult } from './campaignStrategyCritic.js';
import { campaignDownstreamOrchestrator } from './campaignDownstreamOrchestrator.js';

export interface StrategySynthesisRequest {
  generationId: string;
  campaignTitle: string;
  briefDescription: string;
  brandName?: string;
  industry?: string;
  objective?: string;
  targetAudience?: string;
  selectedTerritory: StrategicTerritory;
  discoveryAnswers?: DiscoveryAnswer[];
  language?: string;
  controls?: Partial<CampaignBriefControls>;
  parentVersionId?: string;
  changeReason?: string;
}

export interface StrategySynthesisResult {
  strategy: MasterCampaignStrategy;
  criticReport: CriticEvaluationResult;
}

export class CampaignStrategyCompiler {
  /**
   * Compiles the authoritative Master Campaign Strategy from the approved Strategic Territory.
   */
  async synthesizeMasterStrategy(
    request: StrategySynthesisRequest
  ): Promise<StrategySynthesisResult> {
    const {
      generationId,
      campaignTitle,
      briefDescription,
      brandName = 'Brand',
      industry = 'General',
      objective = 'Brand Growth',
      targetAudience = 'Target audience',
      selectedTerritory,
      discoveryAnswers = [],
      language = 'English',
      controls,
      parentVersionId,
      changeReason
    } = request;

    const basePrompt = `
You are the Chief Strategy Officer at an internationally renowned creative agency.
Compile the authoritative Master Campaign Strategy based on the following approved Strategic Route.

CAMPAIGN BRIEF & CONTROLS:
- Brand: ${brandName}
- Industry: ${industry}
- Campaign Title: ${campaignTitle}
- Objective: ${objective}
- Target Audience: ${targetAudience}
- Core Brief: ${briefDescription}
- Preferred Language: ${language}
- Ambition: ${controls?.ambitionLevel || 'Balanced'}
- Risk Appetite: ${controls?.riskTolerance || 'Moderate'}
- Budget Reality: ${controls?.budgetReality || 'Moderate'}
- Timeline: ${controls?.timelineHorizon || '1 to 3 months'}
- Brand Maturity: ${controls?.brandMaturity || 'Established'}
- Geographic Scale: ${controls?.geographicScale || 'National'}
- Available Proof: ${controls?.proofAvailability?.map(p => p.type).join(', ') || 'None specified'}
- Must Include (MANDATORY): ${controls?.mandatoryInclusions?.join(', ') || 'None'}
- Must Avoid (STRICTLY FORBIDDEN): ${controls?.forbiddenTerritories?.join(', ') || 'None'}
- Competitor Knowledge Source: ${controls?.competitorKnowledgeSource || 'no_research_supplied'}
- Competitor Context: ${controls?.competitorKnowledgeSource === 'imported_from_workspace' ? `Workspace brand guidelines & stored assets for ${brandName}` : controls?.competitorContext?.competitors || 'Standard category players'}

APPROVED STRATEGIC ROUTE (TERRITORY):
- Title: ${selectedTerritory.title}
- Premise: ${selectedTerritory.oneLinePremise}
- Why It Works: ${selectedTerritory.whyItWorks}
- The Mechanism: ${selectedTerritory.theMechanism}
- Creative World: ${selectedTerritory.creativeWorld}
- Target Channels: ${selectedTerritory.channelPotential.join(', ')}
- Sacrifices & Trade-offs: ${selectedTerritory.sacrificesAndTradeoffs}
- Target Fit: Best for: ${selectedTerritory.targetFit?.bestFor?.join(', ') || 'General'}, Less suitable for: ${selectedTerritory.targetFit?.lessSuitableFor?.join(', ') || 'None'}

DISCOVERY CONTEXT:
${discoveryAnswers.map(a => `- ${a.questionText}: ${a.answer}`).join('\n') || 'None'}

EPISTEMIC HONESTY & PROVENANCE RULES:
1. Every claim must have an explicit epistemic status and basis:
   - "evidence" / "user_provided" (Facts from brief/controls)
   - "inference" / "ai_inference" (Strategic logic derived from customer friction)
   - "recommendation" / "ai_inference" (Creative and distribution choices)
   - "assumption" / "assumption_validate_before_launch" (Hypotheses requiring field validation)
   - "placeholder" (Unverified benchmarks, formatted as "[Insert verified %]")
2. ZERO NUMBER FABRICATION: Do not invent fake statistics. Format as "[Insert verified benchmark]".
3. IF LANGUAGE IS HINDI: Render key hooks, headlines, and manifesto lines in authentic Devanagari script.
4. STRICT NEGATIVE CONSTRAINTS: Forbid anything in "Must Avoid". Enforce all "Must Include".

Return JSON matching this EXACT structure:
{
  "executiveSummary": {
    "theProblem": "Crisp 1-2 sentence definition of the core customer dilemma / category failure",
    "theOpportunity": "Why this specific cultural or market moment unlocks high leverage",
    "theBigIdea": "The overarching provocative creative concept in one unforgettable line",
    "whyUs": "The undeniable brand truth or asset competitors cannot copy",
    "whatWeWillDo": "The physical and digital activation mechanism that engages the audience",
    "whatWeNeedToProve": "The key working assumptions that must be validated prior to scaling"
  },
  "whatChangedFromBrief": {
    "youToldUs": ["Raw input bullet 1", "Raw input bullet 2"],
    "weDiscovered": ["Strategic tension discovery 1", "Uncovered behavioral friction 2"],
    "weRecommend": ["Breakthrough recommendation 1", "Distribution recommendation 2"]
  },
  "unknownsPanel": [
    {
      "variable": "e.g. Actual festive customer price elasticity",
      "riskImpact": "Moderate",
      "recommendedResearchAction": "Pilot a 48h dark ad test with 2 price tiers"
    }
  ],
  "failureModes": [
    {
      "riskDescription": "How this strategy could fail in market",
      "failureLikelihood": "Low",
      "mitigationPlaybook": "Exact contingency action to protect the campaign"
    }
  ],
  "competitorWhiteSpace": {
    "categoryNorm": "What everyone in this industry routinely does and says",
    "competitorPattern": "The repetitive messaging or creative tropes competitors exhaust",
    "brandOpportunity": "The distinct, uncrowded position our campaign commands"
  },
  "customerJourney": [
    {
      "stage": "problem_recognition",
      "stageLabel": "1. Problem Recognition",
      "currentCustomerState": "Mindset before encountering campaign",
      "desiredCustomerState": "Awakened awareness of the friction",
      "barrier": "Inertia or acceptance of flawed category norm",
      "trigger": "Pattern interrupt hook that exposes the dilemma",
      "evidence": "Concrete observation or proof",
      "keyDeliverable": "Top-of-funnel asset answering this stage"
    },
    {
      "stage": "awareness",
      "stageLabel": "2. Awareness & Intrigue",
      "currentCustomerState": "Curious but skeptical",
      "desiredCustomerState": "Intrigued by brand breakthrough angle",
      "barrier": "Distrust of advertised claims",
      "trigger": "Provocative contrast visual or film",
      "evidence": "Product demo or customer story",
      "keyDeliverable": "Social hook / hero film"
    },
    {
      "stage": "consideration",
      "stageLabel": "3. Consideration & Proof",
      "currentCustomerState": "Evaluating alternative solutions",
      "desiredCustomerState": "Convinced our mechanism is superior",
      "barrier": "Fear of making the wrong choice",
      "trigger": "Verifiable receipts / comparison teardown",
      "evidence": "Case study or certified benchmark",
      "keyDeliverable": "Proof carousel / teardown deck"
    },
    {
      "stage": "decision_conversion",
      "stageLabel": "4. Decision & Conversion",
      "currentCustomerState": "Ready to act but hesitating at checkout",
      "desiredCustomerState": "Decisive action taken with high confidence",
      "barrier": "Friction in purchase or onboarding",
      "trigger": "Transparent offer with risk-reversal guarantee",
      "evidence": "Explicit guarantee or immediate value deliverable",
      "keyDeliverable": "Direct conversion ad visual & retargeting copy"
    },
    {
      "stage": "retention_advocacy",
      "stageLabel": "5. Retention & Advocacy",
      "currentCustomerState": "First-time purchaser or user",
      "desiredCustomerState": "Passionate brand advocate and repeat buyer",
      "barrier": "Post-purchase regret or neglected onboarding",
      "trigger": "Ritualized customer welcome & review community",
      "evidence": "Community recognition & ongoing proof",
      "keyDeliverable": "Customer ritual onboarding & UGC brief"
    }
  ],
  "channelDecisions": [
    {
      "channel": "instagram",
      "status": "primary",
      "rationale": "High visual affinity and strong format travel for this creative world",
      "format": "Reels & Carousels",
      "creativeRule": "Lead with unpolished 35mm flash aesthetic; zero corporate stock",
      "cta": "Explore now"
    },
    {
      "channel": "linkedin",
      "status": "excluded",
      "rationale": "Low relevance for festive consumer gifting; creative tone conflicts with corporate posture"
    }
  ],
  "coreBigIdea": {
    "status": "recommendation",
    "basis": "ai_inference",
    "text": "The overarching provocative creative concept in one unforgettable line",
    "sourceOrRationale": "Derived from approved territory mechanism"
  },
  "positioningManifesto": [
    {
      "status": "inference",
      "basis": "ai_inference",
      "text": "Stirring, declarative manifesto line articulating the tension and the brand stand",
      "sourceOrRationale": "Tension resolution"
    }
  ],
  "creativeTension": {
    "currentBelief": "What audience currently believes or accepts as normal",
    "desiredBelief": "The transformative belief we instill",
    "behavioralBarrier": "The specific friction stopping them",
    "breakthroughAngle": "The realization that dissolves the friction"
  },
  "audienceDiagnosis": {
    "demographics": "Crisp demographic profile",
    "psychographics": "Values, identity, media habits",
    "coreAnxieties": ["Specific anxiety 1", "Specific anxiety 2"],
    "buyingTriggers": ["Moment of need 1", "Trigger event 2"],
    "culturalContext": "Current cultural backdrop"
  },
  "contentPillars": [
    {
      "name": "Pillar Name",
      "shareOfVoicePercent": 40,
      "strategicPurpose": "Strategic role of this pillar",
      "narrativeAngle": "Angle of attack",
      "exampleHook": "Provocative social hook"
    }
  ],
  "platformMatrix": [
    {
      "platform": "instagram",
      "objective": "Audience Hook & Brand Resonance",
      "format": "Carousel / Reels",
      "hookType": "Pattern Interrupt",
      "cadence": "4x per week",
      "keyAssetRequirement": "Master Key Visual and 15s kinetic cuts"
    }
  ],
  "creativeExecutions": [
    {
      "name": "Hero Concept",
      "headlineHook": "Unforgettable opening hook",
      "narrativeArc": "From skepticism to realization",
      "visualDirection": "Visual and lighting description",
      "channelFormat": "Reels / Key Visual"
    }
  ],
  "rolloutPhases": [
    {
      "phase": "Phase 1: Spark Curiosity",
      "duration": "Days 1-7",
      "strategicFocus": "Establish cultural tension without revealing the complete answer",
      "primaryChannels": ["instagram", "youtube"],
      "triggerToNextPhase": "Engagement threshold met"
    }
  ],
  "performanceKPIs": {
    "primarySuccessMetric": "Primary business conversion metric",
    "secondaryMetrics": ["Secondary metric 1", "Secondary metric 2"],
    "unverifiedBenchmarkPlaceholders": ["[Insert verified CPA/CAC benchmark]"]
  }
}
`;

    const systemInstruction = `You are a visionary Chief Strategy Officer. You formulate deep, evidence-grounded, highly differentiated campaign strategies. You rigorously enforce strategic guardrails, customer journey architecture, and failure mitigation playbooks. Always return valid JSON.`;

    const result = await campaignLLMGateway.executeStructured<MasterCampaignStrategy>({
      generationId,
      stage: 'synthesis',
      systemInstruction,
      userInput: basePrompt,
      temperature: 0.7,
      semanticValidator: (data) => {
        if (!data || !data.coreBigIdea || !data.creativeTension) {
          return { isValid: false, errors: ['Response missing coreBigIdea or creativeTension'] };
        }
        return { isValid: true };
      }
    });

    const strategyId = `strat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const compiledStrategy: MasterCampaignStrategy = {
      ...result.data,
      strategyId,
      versionNumber: 1,
      parentVersionId,
      changeReason: changeReason || 'Initial master strategy synthesis from approved route',
      campaignTitle,
      brandName,
      strategicFramework: selectedTerritory.title,
      epistemicLedger: [
        result.data.coreBigIdea,
        ...(result.data.positioningManifesto || [])
      ]
    };

    // Compile dynamic 5-tier Campaign Production Plan
    compiledStrategy.productionPlan = campaignDownstreamOrchestrator.compileProductionPlan(
      compiledStrategy,
      selectedTerritory,
      controls
    );

    // Evaluate with Strategy Critic
    const criticReport = campaignStrategyCritic.evaluateStrategy(compiledStrategy, industry);

    return {
      strategy: compiledStrategy,
      criticReport
    };
  }
}

export const campaignStrategyCompiler = new CampaignStrategyCompiler();
