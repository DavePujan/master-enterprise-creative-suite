/**
 * Strategic Territory Generator for Campaign Strategist 2.0.
 * Synthesizes 3 to 4 fundamentally distinct Strategic Routes,
 * modeling Creative Tension, operational activation mechanisms,
 * explicit sacrifices/trade-offs, suitability boundaries, creative codes,
 * and transparent executive recommendation rationale.
 */

import {
  StrategicTerritory,
  DiscoveryAnswer,
  TerritoryNoveltyVector,
  CampaignBriefControls
} from '../../../../../packages/types/campaignStrategy.js';
import { campaignLLMGateway } from './campaignLLMGateway.js';
import { campaignNoveltyEngine, StoredStrategyMemory } from './campaignNoveltyEngine.js';
import { rankFrameworksForBrief } from './campaignFrameworkLibrary.js';

export interface TerritoryGenerationRequest {
  generationId: string;
  campaignTitle: string;
  briefDescription: string;
  brandName?: string;
  industry?: string;
  objective?: string;
  targetAudience?: string;
  discoveryAnswers?: DiscoveryAnswer[];
  workspaceHistory?: StoredStrategyMemory[];
  controls?: Partial<CampaignBriefControls>;
  directionVariant?: string; // Curated variant or free-form user steering
}

export class CampaignTerritoryEngine {
  /**
   * Generates 3-4 distinct Strategic Routes with Creative Tension, trade-offs, and comparison scores.
   */
  async generateTerritories(
    request: TerritoryGenerationRequest
  ): Promise<StrategicTerritory[]> {
    const {
      generationId,
      campaignTitle,
      briefDescription,
      brandName = 'Brand',
      industry = 'General',
      objective = 'Brand Growth',
      targetAudience = 'Core demographic',
      discoveryAnswers = [],
      workspaceHistory = [],
      controls,
      directionVariant
    } = request;

    // Pick top framework candidates for inspiration
    const frameworks = rankFrameworksForBrief({ industry, objective, targetAudience }).slice(0, 4);

    const isContrarian = directionVariant?.toLowerCase().includes('contrarian') || directionVariant?.toLowerCase().includes('disruptive');

    const prompt = `
You are an Executive Strategic Director at a world-class creative agency.
Your task is to generate 3 to 4 FUNDAMENTALLY DISTINCT Strategic Territories (Routes) for this campaign.
Each route must explore a completely different creative mechanism, emotional territory, and behavioral tension.

Brand: ${brandName}
Industry: ${industry}
Campaign Title: ${campaignTitle}
Objective: ${objective}
Target Audience: ${targetAudience}
Core Brief: ${briefDescription}

Operational Parameters:
- Ambition: ${controls?.ambitionLevel || 'Balanced'}
- Risk Appetite: ${controls?.riskTolerance || 'Moderate'}
- Budget Reality: ${controls?.budgetReality || 'Moderate'} (${controls?.approximateBudget ? `Budget: ${controls.approximateBudget}` : ''})
- Timeline: ${controls?.timelineHorizon || '1 to 3 months'}
- Brand Maturity: ${controls?.brandMaturity || 'Established'}
- Geographic Scale: ${controls?.geographicScale || 'National'}
- Available Proof: ${controls?.proofAvailability?.map(p => p.type).join(', ') || 'None specified'}
- Must Include: ${controls?.mandatoryInclusions?.join(', ') || 'None'}
- Must Avoid: ${controls?.forbiddenTerritories?.join(', ') || 'None'}

Discovery Q&A Context:
${discoveryAnswers.map(a => `- ${a.questionText}: ${a.answer}`).join('\n') || 'None'}

Inspirational Strategic Frameworks:
${frameworks.map(f => `1. ${f.name} (Mechanism: ${f.mechanisms.join(', ')})`).join('\n')}

${directionVariant ? `DIRECTIONAL STEERING VARIANT: "${directionVariant}" (Focus routes strongly around this vector!)` : ''}
${isContrarian ? `CONTRARIAN MANDATE: Intentionally propose at least one territory that reverses common category conventions.` : ''}

For each territory, you MUST provide:
1. "id": "territory-1", "territory-2", etc.
2. "title": Punchy, memorable name (e.g. "The Unvarnished Receipt", "The 4AM Club", "The Impossible Dare")
3. "oneLinePremise": The core strategic hook in one sharp sentence
4. "whyItWorks": The underlying human tension: Current Belief vs Desired Belief vs Breakthrough Realization
5. "theMechanism": The concrete activation mechanism: What actually happens in the real world / social platforms
6. "creativeWorld": Sonic, visual, and tonal atmosphere
7. "creativeCodes": {
     "visualCodes": ["Specific visual rule 1", "Rule 2"],
     "soundCodes": ["Specific sound rule 1", "Rule 2"],
     "motionCodes": ["Specific motion rule 1", "Rule 2"],
     "copyCodes": ["Specific headline/copy tone 1", "Rule 2"],
     "vocabulary": ["Keyword 1", "Keyword 2", "Keyword 3"]
   }
8. "channelPotential": Array of top 3 platforms where this travels best
9. "sacrificesAndTradeoffs": EXPLICIT statement of what this route sacrifices (e.g. "Sacrifices mass direct-response conversion simplicity for high PR memorability and cultural buzz")
10. "targetFit": {
      "bestFor": ["High-risk appetite", "Social-first audiences"],
      "lessSuitableFor": ["Compliance-heavy messaging", "Pure transactional performance flights"]
    }
11. "comparisonScores": {
      "brandFit": "High" | "Medium" | "Low",
      "audienceRelevance": "High" | "Medium" | "Low",
      "distinctiveness": "Very High" | "High" | "Medium",
      "executionComplexity": "Low" | "Medium" | "High",
      "prPotential": "Very High" | "High" | "Medium" | "Low",
      "conversionPotential": "High" | "Medium" | "Low",
      "riskLevel": "Low" | "Moderate" | "High"
    }
12. "internalScores": {
      "brandFitRaw": 0-100,
      "audienceResonanceRaw": 0-100,
      "noveltyRaw": 0-100,
      "overallWeighted": 0-100
    }
13. "risksAndMitigations": Honest assessment of what could go wrong and how to protect the brand
14. "frameworkId": Associated framework ID
15. "scores": { "brandFit": 0-100, "audienceResonance": 0-100, "platformPotential": 0-100 }
16. "noveltyVector": {
      "narrative": "summary of narrative premise",
      "mechanism": "summary of physical/social mechanism",
      "emotionalTerritory": "core emotional feeling",
      "visualConcept": "distinct visual signature"
    }

CRITICAL INVARIANTS:
- Do NOT make all territories variations of the same social challenge.
- Strictly adhere to "Must Include" items and completely avoid "Must Avoid" items.
- Zero generic marketing clichés (no "elevate", "unlock", "game-changer", "seamless").

Return JSON with this EXACT structure:
{
  "territories": [
    {
      "id": "territory-1",
      "title": "...",
      "oneLinePremise": "...",
      "whyItWorks": "...",
      "theMechanism": "...",
      "creativeWorld": "...",
      "creativeCodes": {
        "visualCodes": ["..."],
        "soundCodes": ["..."],
        "motionCodes": ["..."],
        "copyCodes": ["..."],
        "vocabulary": ["..."]
      },
      "channelPotential": ["instagram", "youtube"],
      "sacrificesAndTradeoffs": "...",
      "targetFit": {
        "bestFor": ["..."],
        "lessSuitableFor": ["..."]
      },
      "comparisonScores": {
        "brandFit": "High",
        "audienceRelevance": "High",
        "distinctiveness": "Very High",
        "executionComplexity": "Medium",
        "prPotential": "Very High",
        "conversionPotential": "Medium",
        "riskLevel": "Moderate"
      },
      "internalScores": {
        "brandFitRaw": 92,
        "audienceResonanceRaw": 88,
        "noveltyRaw": 94,
        "overallWeighted": 91
      },
      "risksAndMitigations": "...",
      "frameworkId": "${frameworks[0]?.id || 'creator-led-momentum'}",
      "scores": { "brandFit": 92, "audienceResonance": 88, "platformPotential": 90 },
      "noveltyVector": {
        "narrative": "...",
        "mechanism": "...",
        "emotionalTerritory": "...",
        "visualConcept": "..."
      }
    }
  ]
}
`;

    const systemInstruction = `You are a visionary brand strategist. You build distinct, high-tension strategic territories that inspire breakthrough creative execution. You explicitly detail strategic trade-offs, target suitability, and creative codes. Always return valid JSON.`;

    const result = await campaignLLMGateway.executeStructured<{
      territories: Array<Omit<StrategicTerritory, 'distinctivenessTier' | 'distinctivenessNote'>>;
    }>({
      generationId,
      stage: 'territories',
      systemInstruction,
      userInput: prompt,
      temperature: 0.8,
      semanticValidator: (data) => {
        if (!data || !Array.isArray(data.territories) || data.territories.length < 3) {
          return { isValid: false, errors: ['Must generate at least 3 distinct territories'] };
        }
        return { isValid: true };
      }
    });

    // Evaluate each candidate territory against workspace history
    let bestScore = -1;
    let recommendedIdx = 0;

    const evaluatedTerritories: StrategicTerritory[] = result.data.territories.map((raw, idx) => {
      const noveltyCheck = campaignNoveltyEngine.evaluateNovelty(raw.noveltyVector, workspaceHistory);
      const distinctiveness = campaignNoveltyEngine.resolveDistinctiveness(noveltyCheck.overallSimilarity);

      const weightedScore = raw.internalScores?.overallWeighted || (raw.scores.brandFit * 0.4 + raw.scores.audienceResonance * 0.3 + (1 - noveltyCheck.overallSimilarity) * 100 * 0.3);
      if (weightedScore > bestScore) {
        bestScore = weightedScore;
        recommendedIdx = idx;
      }

      return {
        ...raw,
        id: raw.id || `territory-${idx + 1}`,
        distinctivenessTier: distinctiveness.tier,
        distinctivenessNote: noveltyCheck.distinctivenessCritique || distinctiveness.label,
        internalScores: raw.internalScores || {
          brandFitRaw: raw.scores.brandFit,
          audienceResonanceRaw: raw.scores.audienceResonance,
          noveltyRaw: Math.round((1 - noveltyCheck.overallSimilarity) * 100),
          overallWeighted: Math.round(weightedScore)
        }
      };
    });

    // Assign isRecommended to the top route and generate transparent rationale
    if (evaluatedTerritories.length > 0) {
      const topRoute = evaluatedTerritories[recommendedIdx];
      topRoute.isRecommended = true;

      const whyNotOthers: Record<string, string> = {};
      evaluatedTerritories.forEach((t, i) => {
        if (i !== recommendedIdx) {
          whyNotOthers[t.id] = t.sacrificesAndTradeoffs || `Less balanced between brand fit (${t.comparisonScores?.brandFit}) and distinctiveness (${t.comparisonScores?.distinctiveness}).`;
        }
      });

      topRoute.recommendationRationale = {
        whyThis: `Highest composite balance of category distinctiveness (${topRoute.comparisonScores?.distinctiveness}) and audience resonance (${topRoute.comparisonScores?.audienceRelevance}) without excessive execution risk.`,
        whyNotOthers
      };
    }

    return evaluatedTerritories;
  }
}

export const campaignTerritoryEngine = new CampaignTerritoryEngine();
