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
  CampaignBriefControls
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
    const answeredDimensions = new Set<string>();
    for (const ans of priorAnswers) {
      const lower = (ans.questionText + ' ' + ans.answer).toLowerCase();
      if (lower.includes('audience') || lower.includes('customer') || lower.includes('who')) answeredDimensions.add('audience');
      if (lower.includes('problem') || lower.includes('barrier') || lower.includes('hesitation') || lower.includes('friction')) answeredDimensions.add('barrier');
      if (lower.includes('competitor') || lower.includes('alternative') || lower.includes('differentiator') || lower.includes('cliché')) answeredDimensions.add('competitive');
      if (lower.includes('metric') || lower.includes('kpi') || lower.includes('goal') || lower.includes('outcome')) answeredDimensions.add('objective');
      if (lower.includes('proof') || lower.includes('evidence') || lower.includes('testimonial') || lower.includes('demo')) answeredDimensions.add('proof');
      if (lower.includes('channel') || lower.includes('platform') || lower.includes('format')) answeredDimensions.add('channel');
      if (lower.includes('constraint') || lower.includes('avoid') || lower.includes('must') || lower.includes('rule')) answeredDimensions.add('constraints');
    }

    const dimensions: ReadinessDimension[] = [
      // 1. Business Objective
      {
        id: 'objective',
        label: 'Business Objective & Metrics',
        status: (controls?.businessOutcome?.primaryOutcome || objective) ? 'strong' : (answeredDimensions.has('objective') ? 'partial' : 'missing'),
        detail: controls?.businessOutcome?.targetKPI
          ? `KPI: ${controls.businessOutcome.targetKPI} (${controls.businessOutcome.timeHorizon || 'Flexible'})`
          : (objective ? `Primary objective: ${objective}` : 'Awaiting concrete conversion or reach target.'),
        quickFixPrompt: 'What is the #1 measurable metric that decides if this campaign succeeds?'
      },
      // 2. Audience Understanding
      {
        id: 'audience',
        label: 'Audience Context & Mindset',
        status: targetAudience.length > 15 ? 'strong' : (targetAudience || answeredDimensions.has('audience') ? 'partial' : 'missing'),
        detail: targetAudience || 'Target audience demographic or psychographic segment needed.',
        quickFixPrompt: 'Who is the exact customer segment we must move, and what is their default routine?'
      },
      // 3. Brand Grounding & Maturity
      {
        id: 'brand',
        label: 'Brand Grounding & Maturity',
        status: (brandName && brandName !== 'Brand') ? 'strong' : 'partial',
        detail: controls?.brandMaturity
          ? `${brandName} (${controls.brandMaturity.replace(/_/g, ' ')}) in ${industry}`
          : `${brandName} grounded in ${industry}`,
        quickFixPrompt: 'What is the undeniable core truth of this brand that competitors cannot replicate?'
      },
      // 4. Competitive Context
      {
        id: 'competitive',
        label: 'Competitive White Space Context',
        status: (controls?.competitorContext?.competitors || answeredDimensions.has('competitive'))
          ? 'strong'
          : (controls?.competitorKnowledgeSource === 'imported_from_workspace' ? 'strong' : controls?.competitorKnowledgeSource === 'no_research_supplied' ? 'partial' : 'missing'),
        detail: controls?.competitorContext?.competitors
          ? `Competing against: ${controls.competitorContext.competitors}`
          : controls?.competitorKnowledgeSource === 'imported_from_workspace'
          ? `Grounded in workspace brand guidelines and category positioning for ${brandName}.`
          : (controls?.competitorKnowledgeSource === 'no_research_supplied' ? 'No client research supplied; strategist will model category baselines.' : 'Key competitor patterns undefined.'),
        quickFixPrompt: 'What are competitors constantly over-promising or repeating that customers are tired of hearing?'
      },
      // 5. Behavioral Barrier & Tension
      {
        id: 'barrier',
        label: 'Customer Behavioral Barrier',
        status: answeredDimensions.has('barrier') ? 'strong' : (briefDescription.length > 200 ? 'partial' : 'missing'),
        detail: answeredDimensions.has('barrier') ? 'Customer friction identified in discovery.' : 'Underlying friction or skepticism preventing customer action.',
        quickFixPrompt: 'Why does the customer currently hesitate, distrust, or delay buying from us?'
      },
      // 6. Proof & Verifiable Evidence
      {
        id: 'proof',
        label: 'Proof & Substantiation',
        status: (controls?.proofAvailability && controls.proofAvailability.length > 0 && !controls.proofAvailability.some(p => p.type === 'none_yet'))
          ? 'strong'
          : (answeredDimensions.has('proof') ? 'partial' : 'missing'),
        detail: (controls?.proofAvailability && controls.proofAvailability.length > 0 && !controls.proofAvailability.some(p => p.type === 'none_yet'))
          ? `Available proof assets: ${controls.proofAvailability.map(p => p.type.replace(/_/g, ' ')).join(', ')}`
          : 'Zero verified proof supplied; claims must rely on explicit client guarantee.',
        quickFixPrompt: 'Do we have tangible case studies, customer reviews, product teardowns, or demo proof?'
      },
      // 7. Distribution Channels & Budget
      {
        id: 'channel',
        label: 'Distribution Channels & Budget',
        status: (controls?.budgetReality || answeredDimensions.has('channel')) ? 'strong' : 'partial',
        detail: controls?.budgetReality
          ? `Budget reality: ${controls.budgetReality.replace(/_/g, ' ')} (${controls.timelineHorizon?.replace(/_/g, ' ') || 'Flexible'})`
          : 'Platform mix and budget constraints.',
        quickFixPrompt: 'Which platforms must carry this campaign and what is the media investment reality?'
      },
      // 8. Strategic Guardrails & Constraints
      {
        id: 'constraints',
        label: 'Strategic Guardrails (Must Include / Must Avoid)',
        status: (controls?.mandatoryInclusions?.length || controls?.forbiddenTerritories?.length || answeredDimensions.has('constraints')) ? 'strong' : 'partial',
        detail: `Must include: ${controls?.mandatoryInclusions?.length || 0} items • Must avoid: ${controls?.forbiddenTerritories?.length || 0} boundaries`,
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
}

export const campaignDiscoveryEngine = new CampaignDiscoveryEngine();
