/**
 * Dynamic Adaptive Discovery Engine for Campaign Strategist 2.0.
 * Evaluates dimension-based Strategic Readiness (Objective, Audience, Brand, Competitive,
 * Barrier, Proof, Channel, Constraints) and asks targeted questions to resolve
 * behavioral friction and uncover non-obvious creative mechanisms.
 */

import {
  AdaptiveQuestion,
  DiscoveryConfidence,
  DiscoveryAnswer,
  StrategicReadiness,
  ReadinessDimension,
  CampaignBriefControls,
  StrategicDimensionKey,
  SemanticDimensionResult
} from '../../../../../packages/types/campaignStrategy.js';
import { campaignLLMGateway } from './campaignLLMGateway.js';
import { rankFrameworksForBrief } from './campaignFrameworkLibrary.js';

export interface DiscoveryEvaluationRequest {
  generationId: string;
  campaignTitle: string;
  briefDescription: string;
  targetAudience?: string;
  brandName?: string;
  industry?: string;
  objective?: string;
  priorAnswers?: DiscoveryAnswer[];
  controls?: Partial<CampaignBriefControls>;
}

export interface DiscoveryEvaluationResult {
  confidence: DiscoveryConfidence;
  questions: AdaptiveQuestion[];
  recommendedFrameworks: string[];
}

export class CampaignDiscoveryEngine {
  /**
   * Evaluates input brief, operational controls, and prior answers to determine
   * dimension-based Strategic Readiness and generate adaptive inquiries.
   */
  async evaluateAndGenerateQuestions(
    request: DiscoveryEvaluationRequest
  ): Promise<DiscoveryEvaluationResult> {
    const {
      generationId,
      campaignTitle,
      briefDescription,
      targetAudience = '',
      brandName = 'Brand',
      industry = 'General',
      objective = 'Brand Growth',
      priorAnswers = [],
      controls
    } = request;

    // 1. Determine recommended frameworks based on rich library
    const matchedFrameworks = rankFrameworksForBrief({
      industry,
      objective,
      targetAudience
    });
    const topFrameworkNames = matchedFrameworks.slice(0, 3).map(f => f.name);

    // 2. Perform dimension-based Strategic Readiness evaluation
    // Uses semantic analysis + negation detection to prevent false positives like "I don't know who our audience is yet"
    const semanticResults = await this.evaluateSemanticDimensions(
      generationId,
      priorAnswers,
      { campaignTitle, briefDescription, targetAudience, brandName, industry, objective }
    );

    const dimensions: ReadinessDimension[] = [
      // 1. Business Objective
      {
        id: 'objective',
        label: 'Business Objective & Metrics',
        status: semanticResults.objective?.isNegated
          ? 'missing'
          : (controls?.businessOutcome?.primaryOutcome || objective || semanticResults.objective?.status === 'strong')
          ? 'strong'
          : (semanticResults.objective?.status === 'partial' ? 'partial' : 'missing'),
        detail: semanticResults.objective?.extractedValue || (controls?.businessOutcome?.targetKPI
          ? `KPI: ${controls.businessOutcome.targetKPI} (${controls.businessOutcome.timeHorizon || 'Flexible'})`
          : (objective ? `Primary objective: ${objective}` : 'Awaiting concrete conversion or reach target.')),
        quickFixPrompt: 'What is the #1 measurable metric that decides if this campaign succeeds?'
      },
      // 2. Audience Understanding
      {
        id: 'audience',
        label: 'Audience Context & Mindset',
        status: semanticResults.audience?.isNegated
          ? 'missing'
          : semanticResults.audience?.status === 'strong'
          ? 'strong'
          : (targetAudience.length > 20)
          ? 'strong'
          : (targetAudience.length > 5 || semanticResults.audience?.status === 'partial')
          ? 'partial'
          : 'missing',
        detail: semanticResults.audience?.isNegated
          ? `Audience intentionally undefined: ${semanticResults.audience.extractedValue || 'Needs scoping'}`
          : (semanticResults.audience?.extractedValue || targetAudience || 'Target audience demographic or psychographic segment needed.'),
        quickFixPrompt: 'Who is the exact customer segment we must move, and what is their default routine?'
      },
      // 3. Brand Grounding & Maturity
      {
        id: 'brand',
        label: 'Brand Grounding & Maturity',
        status: semanticResults.brand?.isNegated
          ? 'missing'
          : (brandName && brandName !== 'Brand')
          ? 'strong'
          : (semanticResults.brand?.status || 'partial'),
        detail: semanticResults.brand?.extractedValue || (controls?.brandMaturity
          ? `${brandName} (${controls.brandMaturity.replace(/_/g, ' ')}) in ${industry}`
          : `${brandName} grounded in ${industry}`),
        quickFixPrompt: 'What is the undeniable core truth of this brand that competitors cannot replicate?'
      },
      // 4. Competitive Context
      {
        id: 'competitive',
        label: 'Competitive White Space Context',
        status: semanticResults.competitive?.isNegated
          ? 'missing'
          : (controls?.competitorContext?.competitors || semanticResults.competitive?.status === 'strong')
          ? 'strong'
          : (controls?.competitorKnowledgeSource === 'live_web' || controls?.competitorKnowledgeSource === 'imported_from_workspace')
          ? 'strong'
          : (controls?.competitorKnowledgeSource === 'no_research_supplied' || semanticResults.competitive?.status === 'partial')
          ? 'partial'
          : 'missing',
        detail: controls?.competitorKnowledgeSource === 'live_web'
          ? 'Live web research active: Grounding search queries and source citations enabled.'
          : (semanticResults.competitive?.extractedValue || (controls?.competitorContext?.competitors
          ? `Competing against: ${controls.competitorContext.competitors}`
          : controls?.competitorKnowledgeSource === 'imported_from_workspace'
          ? `Grounded in workspace brand guidelines and category positioning for ${brandName}.`
          : (controls?.competitorKnowledgeSource === 'no_research_supplied' ? 'No client research supplied; strategist will model category baselines.' : 'Key competitor patterns undefined.'))),
        quickFixPrompt: 'What are competitors constantly over-promising or repeating that customers are tired of hearing?'
      },
      // 5. Behavioral Barrier & Tension
      {
        id: 'barrier',
        label: 'Customer Behavioral Barrier',
        status: semanticResults.barrier?.isNegated
          ? 'missing'
          : (semanticResults.barrier?.status === 'strong')
          ? 'strong'
          : (semanticResults.barrier?.status === 'partial' || briefDescription.length > 200)
          ? 'partial'
          : 'missing',
        detail: semanticResults.barrier?.extractedValue || (semanticResults.barrier?.status === 'strong' ? 'Customer friction identified in discovery.' : 'Underlying friction or skepticism preventing customer action.'),
        quickFixPrompt: 'Why does the customer currently hesitate, distrust, or delay buying from us?'
      },
      // 6. Proof & Verifiable Evidence
      {
        id: 'proof',
        label: 'Proof & Substantiation',
        status: semanticResults.proof?.isNegated
          ? 'missing'
          : (controls?.proofAvailability && controls.proofAvailability.length > 0 && !controls.proofAvailability.some(p => p.type === 'none_yet'))
          ? 'strong'
          : (semanticResults.proof?.status === 'strong')
          ? 'strong'
          : (semanticResults.proof?.status === 'partial' ? 'partial' : 'missing'),
        detail: semanticResults.proof?.extractedValue || ((controls?.proofAvailability && controls.proofAvailability.length > 0 && !controls.proofAvailability.some(p => p.type === 'none_yet'))
          ? `Available proof assets: ${controls.proofAvailability.map(p => p.type.replace(/_/g, ' ')).join(', ')}`
          : 'Zero verified proof supplied; claims must rely on explicit client guarantee.'),
        quickFixPrompt: 'Do we have tangible case studies, customer reviews, product teardowns, or demo proof?'
      },
      // 7. Distribution Channels & Budget
      {
        id: 'channel',
        label: 'Distribution Channels & Budget',
        status: semanticResults.channel?.isNegated
          ? 'missing'
          : (controls?.budgetReality || semanticResults.channel?.status === 'strong')
          ? 'strong'
          : (semanticResults.channel?.status === 'partial' ? 'partial' : 'missing'),
        detail: semanticResults.channel?.extractedValue || (controls?.budgetReality
          ? `Budget reality: ${controls.budgetReality.replace(/_/g, ' ')} (${controls.timelineHorizon?.replace(/_/g, ' ') || 'Flexible'})`
          : 'Platform mix and budget constraints.'),
        quickFixPrompt: 'Which platforms must carry this campaign and what is the media investment reality?'
      },
      // 8. Strategic Guardrails & Constraints
      {
        id: 'constraints',
        label: 'Strategic Guardrails (Must Include / Must Avoid)',
        status: semanticResults.constraints?.isNegated
          ? 'missing'
          : (controls?.mandatoryInclusions?.length || controls?.forbiddenTerritories?.length || semanticResults.constraints?.status === 'strong')
          ? 'strong'
          : (semanticResults.constraints?.status === 'partial' ? 'partial' : 'missing'),
        detail: semanticResults.constraints?.extractedValue || `Must include: ${controls?.mandatoryInclusions?.length || 0} items • Must avoid: ${controls?.forbiddenTerritories?.length || 0} boundaries`,
        quickFixPrompt: 'Are there explicit corporate constraints, banned topics, or mandatory product messages?'
      }
    ];

    const strongCount = dimensions.filter(d => d.status === 'strong').length;
    const missingCount = dimensions.filter(d => d.status === 'missing').length;

    let overallReadiness: 'needs_context' | 'ready_for_routes' | 'comprehensive' = 'needs_context';
    if (strongCount >= 6 && missingCount === 0) {
      overallReadiness = 'comprehensive';
    } else if (strongCount >= 4 && missingCount <= 2) {
      overallReadiness = 'ready_for_routes';
    }

    const confidenceScore = Math.min(1.0, (strongCount * 1.0 + (8 - strongCount - missingCount) * 0.5) / 8);

    const readiness: StrategicReadiness = {
      overallReadiness,
      dimensions,
      summaryGuidance: overallReadiness === 'comprehensive'
        ? 'Full strategic foundation established across business goals, audience friction, proof, and brand guardrails.'
        : overallReadiness === 'ready_for_routes'
        ? 'Core strategic clarity achieved. Ready to synthesize high-divergence Strategic Routes.'
        : 'Crucial strategic dimensions remain unmapped. Deepen discovery to prevent generic campaign angles.'
    };

    const isSufficient = overallReadiness === 'ready_for_routes' || overallReadiness === 'comprehensive' || priorAnswers.length >= 6;

    // If readiness is sufficient and we already have prior answers, return 0 questions
    if (isSufficient && priorAnswers.length > 0) {
      return {
        confidence: {
          isSufficient: true,
          confidenceScore,
          missingCriticalDimensions: dimensions.filter(d => d.status === 'missing').map(d => d.label),
          reasoning: readiness.summaryGuidance,
          readiness
        },
        questions: [],
        recommendedFrameworks: topFrameworkNames
      };
    }

    // 3. Generate hyper-targeted adaptive questions via LLM Gateway
    const missingDimLabels = dimensions.filter(d => d.status === 'missing').map(d => d.label);
    const partialDimLabels = dimensions.filter(d => d.status === 'partial').map(d => d.label);

    const prompt = `
You are a Chief Strategy Officer at a world-class creative agency.
Analyze the following strategic inputs and formulate 2 to 4 high-leverage discovery inquiries.

Brand: ${brandName}
Industry: ${industry}
Campaign Title: ${campaignTitle}
Primary Objective: ${objective}
Target Audience: ${targetAudience}
Core Brief: ${briefDescription}

Operational Reality:
- Ambition: ${controls?.ambitionLevel || 'Balanced'}
- Risk Tolerance: ${controls?.riskTolerance || 'Moderate'}
- Budget Reality: ${controls?.budgetReality || 'Moderate'}
- Timeline: ${controls?.timelineHorizon || '1 to 3 months'}
- Brand Maturity: ${controls?.brandMaturity || 'Established'}
- Geographic Scale: ${controls?.geographicScale || 'National'}
- Available Proof: ${controls?.proofAvailability?.map(p => p.type).join(', ') || 'None specified'}
- Must Include: ${controls?.mandatoryInclusions?.join(', ') || 'None'}
- Must Avoid: ${controls?.forbiddenTerritories?.join(', ') || 'None'}

Prior Discovery Answers:
${priorAnswers.map((a, i) => `Q${i + 1}: ${a.questionText}\nA: ${a.answer}`).join('\n\n') || 'None yet.'}

Unresolved Dimensions:
${missingDimLabels.length > 0 ? `Missing: ${missingDimLabels.join(', ')}` : `Refining: ${partialDimLabels.join(', ')}`}

Rules:
1. Zero generic questions ("What is your target audience?", "Tell us your budget").
2. Ask questions that illuminate:
   - Hidden behavioral friction / customer hesitation
   - Category cliches that competitors overuse
   - Concrete proof points that make this proposition believable
3. For each question, explain the internal strategic rationale (why this changes the creative route).

Return JSON matching this exact structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "The specific question text",
      "strategicRationale": "Why answering this reveals behavioral friction or uncopyable truth",
      "dimension": "tension",
      "inputType": "text",
      "suggestedPlaceholder": "e.g. Customers assume that..."
    }
  ]
}
`;

    const systemInstruction = `You are an elite creative strategist. You ask provocative, insight-mining questions that dig beneath surface briefs to find emotional and behavioral truth. Always return valid JSON.`;

    const result = await campaignLLMGateway.executeStructured<{
      questions: AdaptiveQuestion[];
    }>({
      generationId,
      stage: 'discovery',
      systemInstruction,
      userInput: prompt,
      temperature: 0.7,
      semanticValidator: (data) => {
        if (!data || !Array.isArray(data.questions)) {
          return { isValid: false, errors: ['Response missing questions array'] };
        }
        return { isValid: true };
      }
    });

    return {
      confidence: {
        isSufficient,
        confidenceScore,
        missingCriticalDimensions: missingDimLabels,
        reasoning: readiness.summaryGuidance,
        readiness
      },
      questions: result.data.questions || [],
      recommendedFrameworks: topFrameworkNames
    };
  }

  /**
   * Semantically evaluates user answers against strategic dimensions,
   * detecting negation (e.g., "I don't know who our audience is yet") to prevent
   * false positives from naive keyword matching.
   */
  private async evaluateSemanticDimensions(
    generationId: string,
    priorAnswers: DiscoveryAnswer[],
    context: {
      campaignTitle: string;
      briefDescription: string;
      targetAudience: string;
      brandName: string;
      industry: string;
      objective: string;
    }
  ): Promise<Record<StrategicDimensionKey, SemanticDimensionResult>> {
    const result: Record<StrategicDimensionKey, SemanticDimensionResult> = {
      objective: { status: 'missing', confidence: 0 },
      audience: { status: 'missing', confidence: 0 },
      brand: { status: 'missing', confidence: 0 },
      competitive: { status: 'missing', confidence: 0 },
      barrier: { status: 'missing', confidence: 0 },
      proof: { status: 'missing', confidence: 0 },
      channel: { status: 'missing', confidence: 0 },
      constraints: { status: 'missing', confidence: 0 }
    };

    if (!priorAnswers || priorAnswers.length === 0) {
      return result;
    }

    // Explicit Negation & Indecision Guard:
    // Regex matching phrases indicating the user doesn't know, hasn't established, or rejects the dimension
    const NEGATION_PATTERNS = /\b(don'?t\s+know|haven'?t|cannot|can't|not\s+sure|unknown|unclear|tbd|to\s+be\s+decided|none|no\s+idea|not\s+identified|no\s+clue|haven'?t\s+decided|undecided|not\s+yet|zero)\b/i;

    const combinedText = priorAnswers.map(a => `Q: ${a.questionText}\nA: ${a.answer}`).join('\n\n');

    // Attempt high-accuracy LLM semantic dimension extraction
    try {
      const evaluationPrompt = `
Analyze the user's discovery interview answers for a creative campaign strategy.
Campaign Title: ${context.campaignTitle}
Brand: ${context.brandName} (${context.industry})

User Discovery Interview:
${combinedText}

Evaluate whether each of these 8 strategic dimensions is resolved, partially resolved, or missing/negated:
- objective: business KPI, conversion, revenue target
- audience: specific customer segment, persona, mindset, demographic
- brand: distinctive assets, heritage, identity, tone
- competitive: key rivals, white space, category cliches
- barrier: customer hesitation, friction, skepticism
- proof: empirical data, reviews, awards, teardowns, demos
- channel: media platforms, formats, distribution budget
- constraints: forbidden claims, mandatory inclusions, compliance

CRITICAL EVALUATION RULES:
1. NEGATION RULE: If the user states they DO NOT know, haven't decided, or lack info (e.g. "I don't know who our audience is yet", "Our biggest problem is we haven't identified the customer"), mark status as "missing", isNegated: true, with confidence: 0.95. NEVER mark it as strong or partial!
2. Mark "strong" ONLY if substantive, concrete specifics are given.
3. Mark "partial" if hinted at or ambiguous.
4. Mark "missing" if absent or explicitly unknown.

Return JSON in this format:
{
  "dimensions": {
    "objective": { "status": "strong" | "partial" | "missing", "confidence": number, "extractedValue": "string", "isNegated": boolean },
    "audience": { "status": "strong" | "partial" | "missing", "confidence": number, "extractedValue": "string", "isNegated": boolean },
    "brand": { "status": "strong" | "partial" | "missing", "confidence": number, "extractedValue": "string", "isNegated": boolean },
    "competitive": { "status": "strong" | "partial" | "missing", "confidence": number, "extractedValue": "string", "isNegated": boolean },
    "barrier": { "status": "strong" | "partial" | "missing", "confidence": number, "extractedValue": "string", "isNegated": boolean },
    "proof": { "status": "strong" | "partial" | "missing", "confidence": number, "extractedValue": "string", "isNegated": boolean },
    "channel": { "status": "strong" | "partial" | "missing", "confidence": number, "extractedValue": "string", "isNegated": boolean },
    "constraints": { "status": "strong" | "partial" | "missing", "confidence": number, "extractedValue": "string", "isNegated": boolean }
  }
}
`;

      const response = await campaignLLMGateway.executeStructured<{
        dimensions: Record<StrategicDimensionKey, SemanticDimensionResult>;
      }>({
        generationId,
        stage: 'discovery',
        systemInstruction: 'You are an elite campaign discovery auditor. Evaluate strategic readiness strictly. Detect negations and unmapped dimensions accurately. Always return valid JSON.',
        userInput: evaluationPrompt,
        temperature: 0.2
      });

      if (response.data && response.data.dimensions) {
        for (const [key, dim] of Object.entries(response.data.dimensions)) {
          const k = key as StrategicDimensionKey;
          if (result[k]) {
            result[k] = {
              status: dim.status || 'missing',
              confidence: typeof dim.confidence === 'number' ? dim.confidence : 0.8,
              extractedValue: dim.extractedValue,
              isNegated: !!dim.isNegated
            };
          }
        }
        return result;
      }
    } catch (err) {
      console.warn('[CampaignDiscoveryEngine] LLM semantic evaluation fell back to deterministic heuristic:', err);
    }

    // Deterministic fallback with negation guard
    for (const ans of priorAnswers) {
      const lower = ans.answer.toLowerCase();
      const isNegated = NEGATION_PATTERNS.test(lower);

      const checkDim = (key: StrategicDimensionKey, keywords: string[]) => {
        const matches = keywords.some(k => lower.includes(k) || ans.questionText.toLowerCase().includes(k));
        if (matches) {
          if (isNegated) {
            result[key] = { status: 'missing', confidence: 0.9, isNegated: true, extractedValue: ans.answer };
          } else if (ans.answer.trim().length > 30) {
            result[key] = { status: 'strong', confidence: 0.85, isNegated: false, extractedValue: ans.answer };
          } else {
            result[key] = { status: 'partial', confidence: 0.6, isNegated: false, extractedValue: ans.answer };
          }
        }
      };

      checkDim('audience', ['audience', 'customer', 'demographic', 'who']);
      checkDim('barrier', ['problem', 'barrier', 'hesitation', 'friction', 'skepticism']);
      checkDim('competitive', ['competitor', 'alternative', 'rival', 'differentiator', 'cliché']);
      checkDim('objective', ['metric', 'kpi', 'goal', 'outcome', 'revenue', 'conversion']);
      checkDim('proof', ['proof', 'evidence', 'testimonial', 'demo', 'case study', 'data']);
      checkDim('channel', ['channel', 'platform', 'format', 'placement', 'tiktok', 'youtube', 'meta']);
      checkDim('constraints', ['constraint', 'avoid', 'forbidden', 'must', 'rule', 'compliance']);
    }

    return result;
  }
}

export const campaignDiscoveryEngine = new CampaignDiscoveryEngine();
