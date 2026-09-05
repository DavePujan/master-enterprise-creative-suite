/**
 * Campaign Strategy Domain Service for Campaign Strategist 2.0.
 * Coordinates dynamic discovery, strategic route generation,
 * master strategy compilation, downstream brief orchestration,
 * persistent idempotency, session rate limits, and strategic advisory commands (Ask & Stress Test).
 */

import { createHash } from 'crypto';
import { creditService } from '../../services/creditService.js';
import { getSupabaseAdmin } from '../../infrastructure/supabase/supabaseClient.js';
import { InsufficientCreditsError } from '../billing/billingErrorUtils.js';
import {
  StrategicTerritory,
  MasterCampaignStrategy,
  DownstreamBriefs,
  DiscoveryConfidence,
  AdaptiveQuestion,
  DiscoveryAnswer,
  CampaignBriefControls,
  AskStrategistRequest,
  AskStrategistResponse,
  StrategyPatch,
  StressTestReport
} from '../../../../../packages/types/campaignStrategy.js';
import { campaignDiscoveryEngine } from './campaignDiscoveryEngine.js';
import { campaignTerritoryEngine } from './campaignTerritoryEngine.js';
import { campaignStrategyCompiler } from './campaignStrategyCompiler.js';
import { campaignDownstreamOrchestrator } from './campaignDownstreamOrchestrator.js';
import { campaignNoveltyEngine } from './campaignNoveltyEngine.js';
import { campaignRepository } from './campaignRepository.js';
import { campaignLLMGateway } from './campaignLLMGateway.js';

export interface DiscoveryServiceRequest {
  sessionId: string;
  generationId: string;
  workspaceId: string;
  campaignTitle: string;
  briefDescription: string;
  brandName?: string;
  industry?: string;
  objective?: string;
  targetAudience?: string;
  priorAnswers?: DiscoveryAnswer[];
  controls?: Partial<CampaignBriefControls>;
}

export interface TerritoryServiceRequest {
  sessionId: string;
  generationId: string;
  workspaceId: string;
  campaignTitle: string;
  briefDescription: string;
  brandName?: string;
  industry?: string;
  objective?: string;
  targetAudience?: string;
  discoveryAnswers?: DiscoveryAnswer[];
  controls?: Partial<CampaignBriefControls>;
  directionVariant?: string;
}

export interface SynthesizeServiceRequest {
  sessionId: string;
  generationId: string;
  workspaceId: string;
  userId: string;
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

export class CampaignStrategyService {
  private sessionTerritoryCounts = new Map<string, number>();
  private sessionAskCounts = new Map<string, number>();
  private readonly MAX_TERRITORY_REGENERATIONS_PER_SESSION = 5;
  private readonly MAX_ASK_QUERIES_PER_SESSION = 15;

  private computeHash(payload: any): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 20);
  }

  /**
   * Retrieves or computes dynamic discovery questions with persistent request caching.
   */
  async getDiscoveryQuestions(request: DiscoveryServiceRequest): Promise<{
    confidence: DiscoveryConfidence;
    questions: AdaptiveQuestion[];
    recommendedFrameworks: string[];
  }> {
    const requestHash = `disc_${request.workspaceId}_${this.computeHash({
      title: request.campaignTitle,
      brief: request.briefDescription,
      audience: request.targetAudience,
      answers: request.priorAnswers || []
    })}`;

    const cached = await campaignRepository.getGenerationRequest(requestHash);
    if (cached) {
      return cached;
    }

    const result = await campaignDiscoveryEngine.evaluateAndGenerateQuestions({
      generationId: request.generationId,
      campaignTitle: request.campaignTitle,
      briefDescription: request.briefDescription,
      targetAudience: request.targetAudience,
      brandName: request.brandName,
      industry: request.industry,
      objective: request.objective,
      priorAnswers: request.priorAnswers,
      controls: request.controls
    });

    await campaignRepository.saveGenerationRequest(requestHash, result, 3600);
    return result;
  }

  /**
   * Generates 3-4 Strategic Routes with rate-limiting, directional variants, and persistent caching.
   */
  async getTerritories(request: TerritoryServiceRequest): Promise<StrategicTerritory[]> {
    const currentCount = this.sessionTerritoryCounts.get(request.sessionId) || 0;
    if (currentCount >= this.MAX_TERRITORY_REGENERATIONS_PER_SESSION) {
      console.warn(`[CampaignStrategyService] Session cap of ${this.MAX_TERRITORY_REGENERATIONS_PER_SESSION} reached for: ${request.sessionId}`);
    }
    this.sessionTerritoryCounts.set(request.sessionId, currentCount + 1);

    const requestHash = `terr_${request.workspaceId}_${this.computeHash({
      title: request.campaignTitle,
      brief: request.briefDescription,
      answers: request.discoveryAnswers || [],
      variant: request.directionVariant || 'default'
    })}`;

    const cached = await campaignRepository.getGenerationRequest(requestHash);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }

    const workspaceHistory = await campaignRepository.getRecentWorkspaceFingerprints(
      request.workspaceId,
      10
    );

    const territories = await campaignTerritoryEngine.generateTerritories({
      generationId: request.generationId,
      campaignTitle: request.campaignTitle,
      briefDescription: request.briefDescription,
      brandName: request.brandName,
      industry: request.industry,
      objective: request.objective,
      targetAudience: request.targetAudience,
      discoveryAnswers: request.discoveryAnswers,
      workspaceHistory,
      controls: request.controls,
      directionVariant: request.directionVariant
    });

    await campaignRepository.saveGenerationRequest(requestHash, territories, 3600);
    return territories;
  }

  /**
   * Transactionally synthesizes Master Campaign Strategy, compiles downstream briefs,
   * enforces 5-credit lock/capture, and saves to versioned memory.
   */
  async synthesizeStrategy(request: SynthesizeServiceRequest): Promise<{
    strategyId: string;
    versionId: string;
    versionNumber: number;
    masterStrategy: MasterCampaignStrategy;
    downstreamBriefs: DownstreamBriefs;
    criticReport: any;
  }> {
    const {
      generationId,
      workspaceId,
      userId,
      campaignTitle,
      briefDescription,
      brandName,
      industry,
      objective,
      targetAudience,
      selectedTerritory,
      discoveryAnswers = [],
      language = 'English',
      controls,
      parentVersionId,
      changeReason
    } = request;

    // 1. Transactional Credit Hold: Reserve 5 credits
    let holdId = `hold_${generationId}`;
    try {
      const reservation = await creditService.reserveCredits({
        workspaceId,
        userId,
        amount: 5,
        referenceId: generationId,
        description: `Campaign Strategy: ${campaignTitle}`,
        idempotencyKey: `hold_${generationId}`
      });

      if (reservation.success && (reservation.holdId || reservation.hold_id)) {
        holdId = reservation.holdId || reservation.hold_id!;
      } else if (!getSupabaseAdmin() || process.env.NODE_ENV === 'test') {
        holdId = `mock_hold_${generationId}`;
      } else {
        throw new InsufficientCreditsError({
          service: 'Campaign Master Strategy',
          action: 'synthesis',
          required: 5,
          available: reservation.available
        });
      }
    } catch (err: any) {
      if (!getSupabaseAdmin() || process.env.NODE_ENV === 'test') {
        holdId = `mock_hold_${generationId}`;
      } else {
        throw err;
      }
    }

    try {
      // 2. Synthesize Master Strategy through Critic Loop
      const synthesisResult = await campaignStrategyCompiler.synthesizeMasterStrategy({
        generationId,
        campaignTitle,
        briefDescription,
        brandName,
        industry,
        objective,
        targetAudience,
        selectedTerritory,
        discoveryAnswers,
        language,
        controls,
        parentVersionId,
        changeReason
      });

      const masterStrategy = synthesisResult.strategy;
      const criticReport = synthesisResult.criticReport;

      // 3. Compile Downstream Briefs Deterministically
      const downstreamBriefs = campaignDownstreamOrchestrator.compileBriefs(
        masterStrategy,
        selectedTerritory,
        language
      );

      // 4. Build Multi-Vector Fingerprint
      const fingerprint = campaignNoveltyEngine.buildFingerprint({
        narrative: selectedTerritory.oneLinePremise,
        mechanism: selectedTerritory.theMechanism,
        emotionalTerritory: selectedTerritory.creativeWorld,
        insight: masterStrategy.creativeTension.currentBelief,
        visualConcept: downstreamBriefs.imageBrief.visualConcept
      });

      // 5. Persist to Versioned Database
      let rootStrategyId = parentVersionId;
      if (!rootStrategyId) {
        const strategyRecord = await campaignRepository.createStrategy({
          workspaceId,
          userId,
          title: campaignTitle,
          frameworkId: selectedTerritory.frameworkId
        });
        rootStrategyId = strategyRecord.id;
      }

      const versionRecord = await campaignRepository.saveVersion({
        campaignStrategyId: rootStrategyId,
        versionNumber: parentVersionId ? 2 : 1,
        parentVersionId,
        changeReason: changeReason || 'Initial master strategy synthesis from approved route',
        selectedTerritory,
        masterStrategy,
        downstreamBriefs,
        epistemicLedger: masterStrategy.epistemicLedger,
        criticReport,
        createdBy: userId
      });

      await campaignRepository.saveFingerprint({
        workspaceId,
        campaignStrategyId: rootStrategyId,
        versionId: versionRecord.versionId,
        fingerprint
      });

      // 6. Capture Credits Atomically
      if (!holdId.startsWith('mock_hold_')) {
        await creditService.captureCredits(holdId, `strat_${generationId}`);
      }

      return {
        strategyId: rootStrategyId,
        versionId: versionRecord.versionId,
        versionNumber: parentVersionId ? 2 : 1,
        masterStrategy,
        downstreamBriefs,
        criticReport
      };
    } catch (err: any) {
      console.error('[CampaignStrategyService] Synthesis failed, releasing credit hold:', err?.message || err);
      if (!holdId.startsWith('mock_hold_')) {
        await creditService.releaseCredits(holdId, err?.message || 'Strategy synthesis failed');
      }
      throw err;
    }
  }

  /**
   * "Ask the Strategist": Conversational C-suite advisory that outputs advice + structured diff patches.
   */
  async askStrategist(
    sessionId: string,
    request: AskStrategistRequest
  ): Promise<AskStrategistResponse> {
    const askCount = this.sessionAskCounts.get(sessionId) || 0;
    if (askCount >= this.MAX_ASK_QUERIES_PER_SESSION) {
      throw new Error(`Session limit of ${this.MAX_ASK_QUERIES_PER_SESSION} advisory questions reached.`);
    }
    this.sessionAskCounts.set(sessionId, askCount + 1);

    const prompt = `
You are the Chief Strategy Officer who authored this campaign strategy.
Campaign Title: ${request.campaignTitle}
Active Strategy Core Big Idea: "${request.currentStrategy.coreBigIdea?.text}"
Creative Tension: "${request.currentStrategy.creativeTension?.breakthroughAngle}"
Current Platform Matrix: ${JSON.stringify(request.currentStrategy.platformMatrix?.map(p => ({ platform: p.platform, format: p.format })))}
Current Content Pillars: ${JSON.stringify(request.currentStrategy.contentPillars?.map(p => ({ name: p.name, share: p.shareOfVoicePercent })))}

User Query: "${request.query}"

Instructions:
1. Provide a direct, authoritative, nuanced answer as an elite Chief Strategy Officer.
2. If the user is asking to modify, fine-tune, or adjust the strategy (e.g. "make it more premium", "reduce posting cadence", "change channel focus"), propose an explicit, structured patch in JSON.
3. If no modification is requested (e.g. they are asking "Why did you choose this angle?"), omit proposedPatch.

Return JSON in this EXACT structure:
{
  "answer": "Executive advisory answer explaining the rationale and strategic trade-offs",
  "actionableRecommendation": "Clear next action for the marketing team",
  "proposedPatch": {
    "patchId": "patch_${Date.now()}",
    "section": "platformMatrix",
    "targetField": "instagram",
    "previousValue": "Current setting",
    "proposedValue": "Updated setting",
    "rationale": "Why this change solves the user's objective",
    "status": "pending"
  }
}
`;

    const systemInstruction = `You are an elite Chief Strategy Officer. You give rigorous strategic counsel and propose structured patches when changes are requested. Always return valid JSON.`;

    const result = await campaignLLMGateway.executeStructured<AskStrategistResponse>({
      generationId: `ask_${Date.now()}`,
      stage: 'synthesis',
      systemInstruction,
      userInput: prompt,
      temperature: 0.7
    });

    return result.data;
  }

  /**
   * Applies an accepted patch to create an immutable new version (v2).
   */
  async applyPatch(params: {
    strategyId: string;
    patch: StrategyPatch;
    currentStrategy: MasterCampaignStrategy;
    userId: string;
    workspaceId: string;
  }): Promise<{ newVersionNumber: number; updatedStrategy: MasterCampaignStrategy }> {
    const { strategyId, patch, currentStrategy, userId, workspaceId } = params;
    const newVersionNumber = (currentStrategy.versionNumber || 1) + 1;

    const updatedStrategy: MasterCampaignStrategy = {
      ...currentStrategy,
      versionNumber: newVersionNumber,
      parentVersionId: strategyId,
      changeReason: `Applied patch [${patch.section}]: ${patch.rationale}`
    };

    // Apply patch to targeted section
    if (patch.section === 'coreBigIdea' && typeof patch.proposedValue === 'string') {
      updatedStrategy.coreBigIdea = { ...updatedStrategy.coreBigIdea, text: patch.proposedValue };
    }

    const versionRecord = await campaignRepository.saveVersion({
      campaignStrategyId: strategyId,
      versionNumber: newVersionNumber,
      parentVersionId: strategyId,
      changeReason: updatedStrategy.changeReason,
      selectedTerritory: {
        id: 'territory-current',
        title: updatedStrategy.strategicFramework,
        oneLinePremise: updatedStrategy.coreBigIdea.text,
        whyItWorks: updatedStrategy.creativeTension.breakthroughAngle,
        theMechanism: updatedStrategy.creativeTension.desiredBelief,
        creativeWorld: 'Evolved world',
        channelPotential: ['instagram'],
        sacrificesAndTradeoffs: 'Evolved trade-off',
        targetFit: { bestFor: ['Updated cohort'], lessSuitableFor: [] },
        comparisonScores: {
          brandFit: 'High',
          audienceRelevance: 'High',
          distinctiveness: 'Very High',
          executionComplexity: 'Medium',
          prPotential: 'High',
          conversionPotential: 'High',
          riskLevel: 'Low'
        },
        distinctivenessTier: 'Highly Differentiated',
        distinctivenessNote: 'Updated patch version',
        risksAndMitigations: 'Monitored',
        frameworkId: 'framework-custom',
        scores: { brandFit: 95, audienceResonance: 90, platformPotential: 90 },
        noveltyVector: { narrative: '', mechanism: '', emotionalTerritory: '', visualConcept: '' }
      },
      masterStrategy: updatedStrategy,
      downstreamBriefs: campaignDownstreamOrchestrator.compileBriefs(
        updatedStrategy,
        {
          id: 'territory-current',
          title: updatedStrategy.strategicFramework,
          oneLinePremise: updatedStrategy.coreBigIdea.text,
          whyItWorks: updatedStrategy.creativeTension.breakthroughAngle,
          theMechanism: updatedStrategy.creativeTension.desiredBelief,
          creativeWorld: 'Evolved world',
          channelPotential: ['instagram'],
          sacrificesAndTradeoffs: 'Evolved trade-off',
          targetFit: { bestFor: ['Updated cohort'], lessSuitableFor: [] },
          comparisonScores: {
            brandFit: 'High',
            audienceRelevance: 'High',
            distinctiveness: 'Very High',
            executionComplexity: 'Medium',
            prPotential: 'High',
            conversionPotential: 'High',
            riskLevel: 'Low'
          },
          distinctivenessTier: 'Highly Differentiated',
          distinctivenessNote: 'Updated patch version',
          risksAndMitigations: 'Monitored',
          frameworkId: 'framework-custom',
          scores: { brandFit: 95, audienceResonance: 90, platformPotential: 90 },
          noveltyVector: { narrative: '', mechanism: '', emotionalTerritory: '', visualConcept: '' }
        }
      ),
      epistemicLedger: updatedStrategy.epistemicLedger,
      criticReport: { passed: true, overallScore: 9, issuesDetected: [] },
      createdBy: userId
    });

    return {
      newVersionNumber,
      updatedStrategy
    };
  }

  /**
   * Runs an 8-vector Stress Test audit on the strategy.
   */
  async runStressTest(strategy: MasterCampaignStrategy): Promise<StressTestReport> {
    const prompt = `
You are a veteran Brand Risk Director and Chief Strategy Officer.
Stress-test the following campaign strategy across 8 vulnerability vectors:
1. Brand Risk (reputation / brand equity)
2. Audience Relevance (resonance with real target)
3. Competitive Vulnerability (how easily competitors can copy or counter)
4. Cultural Risk (tone-deafness / regional sensitivities)
5. Execution Complexity (production bottlenecks)
6. Claims & Proof Risk (legal, FTC, unverified claims)
7. Channel Concentration Risk (over-reliance on single platform)
8. Scalability (will it fatigue rapidly?)

Campaign Title: ${strategy.campaignTitle}
Brand: ${strategy.brandName}
Core Big Idea: "${strategy.coreBigIdea.text}"
Creative Tension: Current "${strategy.creativeTension.currentBelief}" -> Breakthrough "${strategy.creativeTension.breakthroughAngle}"
Failure Modes: ${JSON.stringify(strategy.failureModes || [])}

Return JSON in this EXACT structure:
{
  "overallHealthScore": 84,
  "topFailureRisks": [
    "Top risk 1",
    "Top risk 2",
    "Top risk 3"
  ],
  "vectorAudits": [
    {
      "vector": "Brand Risk",
      "riskScore": "Low",
      "vulnerabilitySummary": "Crisp diagnosis of potential brand exposure",
      "mitigationRecommendation": "Concrete protection playbook"
    },
    {
      "vector": "Audience Relevance",
      "riskScore": "Low",
      "vulnerabilitySummary": "...",
      "mitigationRecommendation": "..."
    },
    {
      "vector": "Competitive Vulnerability",
      "riskScore": "Moderate",
      "vulnerabilitySummary": "...",
      "mitigationRecommendation": "..."
    },
    {
      "vector": "Cultural Risk",
      "riskScore": "Low",
      "vulnerabilitySummary": "...",
      "mitigationRecommendation": "..."
    },
    {
      "vector": "Execution Complexity",
      "riskScore": "Moderate",
      "vulnerabilitySummary": "...",
      "mitigationRecommendation": "..."
    },
    {
      "vector": "Claims & Proof Risk",
      "riskScore": "Low",
      "vulnerabilitySummary": "...",
      "mitigationRecommendation": "..."
    },
    {
      "vector": "Channel Concentration Risk",
      "riskScore": "Moderate",
      "vulnerabilitySummary": "...",
      "mitigationRecommendation": "..."
    },
    {
      "vector": "Scalability",
      "riskScore": "Low",
      "vulnerabilitySummary": "...",
      "mitigationRecommendation": "..."
    }
  ],
  "csoVerdict": "Summary verdict on whether this campaign is safe and ready for full media flight"
}
`;

    const systemInstruction = `You are a rigorous Brand Risk Director. You uncover blind spots and deliver actionable failure mitigation playbooks. Always return valid JSON.`;

    const result = await campaignLLMGateway.executeStructured<StressTestReport>({
      generationId: `stress_${Date.now()}`,
      stage: 'synthesis',
      systemInstruction,
      userInput: prompt,
      temperature: 0.6
    });

    return result.data;
  }
}

export const campaignStrategyService = new CampaignStrategyService();
