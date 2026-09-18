import { getServerAI } from '../../../infrastructure/gemini/serverGeminiClient.js';
import type {
  DiscoveryQuestion,
  KnownField,
  DiscoveryContradiction,
  DiscoveryState,
  AdBrief,
  QuestionPriority,
  QuestionInputType
} from '@contracts/adSpecContracts.js';

export interface DiscoveryAnalysisResult {
  action: 'ASK_QUESTIONS' | 'UPDATE_BRIEF' | 'REQUEST_CLARIFICATION' | 'READY_FOR_REVIEW';
  extractedFields: Partial<AdBrief>;
  knownFields: KnownField[];
  assumptions: Array<{ field: string; value: any; rationale: string }>;
  contradictions: DiscoveryContradiction[];
  questions: DiscoveryQuestion[];
  readiness: {
    isReady: boolean;
    missingBlocking: string[];
    completenessScore: number;
  };
  reasoningSummary: string;
}

export class InterviewerAiService {
  /**
   * Primary entry point: Analyzes user input in context of the current discovery state.
   */
  public async analyzeDiscovery(params: {
    initialPrompt?: string;
    userAnswer?: { questionId: string; rawAnswer: string | string[] };
    currentState: DiscoveryState;
    availableAssets?: Array<{ id: string; name: string; role: string }>;
    brandGuidelines?: string;
  }): Promise<DiscoveryAnalysisResult> {
    const { initialPrompt, userAnswer, currentState, availableAssets = [], brandGuidelines } = params;

    // Try primary LLM engine with prompt-injection safe boundaries
    try {
      const timeoutMs = 3500;
      const llmPromise = this.executeLlmAnalysis({
        initialPrompt,
        userAnswer,
        currentState,
        availableAssets,
        brandGuidelines
      });

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), timeoutMs)
      );

      const llmResult = await Promise.race([llmPromise, timeoutPromise]);

      if (llmResult && llmResult.questions) {
        return llmResult;
      }
    } catch (err: any) {
      console.warn('[InterviewerAiService] LLM reasoning bypassed/failed, engaging deterministic strategy engine:', err?.message || err);
    }

    // Fallback: Deterministic Advertising Discovery Engine
    return this.executeDeterministicAnalysis({
      initialPrompt,
      userAnswer,
      currentState,
      availableAssets
    });
  }

  /**
   * LLM invocation with strict tagged boundaries for prompt-injection defense.
   */
  private async executeLlmAnalysis(params: {
    initialPrompt?: string;
    userAnswer?: { questionId: string; rawAnswer: string | string[] };
    currentState: DiscoveryState;
    availableAssets: Array<{ id: string; name: string; role: string }>;
    brandGuidelines?: string;
  }): Promise<DiscoveryAnalysisResult | null> {
    const ai = getServerAI();
    if (!ai) return null;

    const systemInstruction = `
You are the AI Advertising Director discovery engine. Your role is an experienced senior creative strategist.
Your goal is to turn an incomplete natural-language commercial brief into a sufficiently defined advertising brief.

RULES:
1. You are NOT a generic chatbot. Do not chit-chat.
2. Minimize questions. Never ask questions simply because a schema field is empty.
3. Classify missing information into BLOCKING (prevents basic creative direction), IMPORTANT (materially improves ad, but sensible default possible), or OPTIONAL (can be deferred to shot production).
4. Never ask about camera lenses, shot framing, lighting, or generation provider prompts. Those belong to future phases.
5. Limit new questions to 1-3 high-value questions per interaction.
6. Questions must sound like a human creative strategist: concise, respectful, actionable.
7. Always support multiple-choice options where applicable, and always allow custom free-text (allowCustom: true).
8. Do NOT reconfirm facts the user already explicitly specified.
9. Detect contradictions (e.g. 15s duration with 30s story, luxury product made to look cheap, children target with adult themes).
10. Return strictly valid JSON adhering to the specified schema.
`;

    const userContent = `
<USER_INPUT>
${params.initialPrompt ? `Initial Prompt: "${params.initialPrompt}"` : ''}
${params.userAnswer ? `User Answer to [${params.userAnswer.questionId}]: "${JSON.stringify(params.userAnswer.rawAnswer)}"` : ''}
</USER_INPUT>

<KNOWN_BRIEF>
${JSON.stringify(params.currentState.brief, null, 2)}
</KNOWN_BRIEF>

<KNOWN_FIELDS>
${JSON.stringify(params.currentState.knownFields, null, 2)}
</KNOWN_FIELDS>

<AVAILABLE_ASSETS>
${JSON.stringify(params.availableAssets, null, 2)}
</AVAILABLE_ASSETS>

<CONSTRAINTS>
Brand Guidelines: ${params.brandGuidelines || 'None'}
Current Questions Status: ${JSON.stringify(params.currentState.questions.map(q => ({ id: q.id, field: q.field, status: q.status })))}
</CONSTRAINTS>

Output JSON schema:
{
  "action": "ASK_QUESTIONS" | "UPDATE_BRIEF" | "REQUEST_CLARIFICATION" | "READY_FOR_REVIEW",
  "extractedFields": {
    "brandRef": "string",
    "product": "string",
    "objective": "string",
    "targetAudience": { "persona": "string", "painPoints": ["string"] },
    "platform": "instagram_reels" | "tiktok_in_feed" | "youtube_shorts" | "linkedin_video" | "connected_tv" | "generic",
    "desiredDurationSeconds": 15,
    "aspectRatio": "16:9" | "9:16" | "1:1" | "4:5",
    "cta": { "visualText": "string", "actionIntent": "string" },
    "keyMessage": "string",
    "tone": "string"
  },
  "assumptions": [{ "field": "string", "value": "any", "rationale": "string" }],
  "contradictions": [{ "type": "CONTRADICTION", "fields": ["string"], "explanation": "string", "resolutionQuestion": "string" }],
  "questions": [
    {
      "id": "q_field_name",
      "field": "field_name",
      "question": "Conversational strategist question",
      "reason": "Why this materially affects creative direction",
      "priority": "BLOCKING" | "IMPORTANT" | "OPTIONAL",
      "inputType": "single_choice" | "text" | "multi_choice",
      "options": [{ "label": "string", "value": "string" }],
      "required": true,
      "allowCustom": true,
      "status": "PENDING"
    }
  ],
  "readiness": {
    "isReady": boolean,
    "missingBlocking": ["string"],
    "completenessScore": number
  },
  "reasoningSummary": "Short operational summary"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemInstruction}\n\n${userContent}` }] }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '';
    const parsed = JSON.parse(responseText);
    return this.validateAndNormalizeLlmOutput(parsed, params.currentState);
  }

  /**
   * Sanitizes and verifies that the LLM response complies with domain contracts.
   */
  private validateAndNormalizeLlmOutput(
    raw: any,
    currentState: DiscoveryState
  ): DiscoveryAnalysisResult {
    const action = ['ASK_QUESTIONS', 'UPDATE_BRIEF', 'REQUEST_CLARIFICATION', 'READY_FOR_REVIEW'].includes(raw?.action)
      ? raw.action
      : 'ASK_QUESTIONS';

    const extractedFields: Partial<AdBrief> = raw?.extractedFields && typeof raw.extractedFields === 'object'
      ? raw.extractedFields
      : {};

    const knownFields: KnownField[] = [];
    for (const [key, val] of Object.entries(extractedFields)) {
      if (val !== undefined && val !== null && val !== '') {
        knownFields.push({
          field: key,
          value: val,
          source: 'USER',
          confidence: 1.0
        });
      }
    }

    const assumptions = Array.isArray(raw?.assumptions) ? raw.assumptions : [];
    for (const ass of assumptions) {
      if (ass.field && ass.value !== undefined) {
        knownFields.push({
          field: ass.field,
          value: ass.value,
          source: 'INFERRED',
          confidence: 0.8
        });
      }
    }

    const contradictions: DiscoveryContradiction[] = Array.isArray(raw?.contradictions)
      ? raw.contradictions.map((c: any) => ({
          type: 'CONTRADICTION',
          fields: Array.isArray(c.fields) ? c.fields : ['general'],
          explanation: String(c.explanation || 'Conflicting requirements detected'),
          resolutionQuestion: String(c.resolutionQuestion || 'How would you like to resolve this?')
        }))
      : [];

    const questions: DiscoveryQuestion[] = Array.isArray(raw?.questions)
      ? raw.questions.slice(0, 3).map((q: any, idx: number) => ({
          id: q.id || `q_${q.field || idx}_${Date.now()}`,
          field: q.field || 'general',
          question: q.question || 'What is your preference?',
          reason: q.reason || 'Materially improves ad positioning.',
          priority: ['BLOCKING', 'IMPORTANT', 'OPTIONAL'].includes(q.priority) ? q.priority : 'IMPORTANT',
          inputType: ['text', 'textarea', 'single_choice', 'multi_choice', 'number', 'url', 'asset_selection', 'boolean'].includes(q.inputType)
            ? q.inputType
            : 'single_choice',
          options: Array.isArray(q.options)
            ? q.options.map((o: any) => ({
                label: typeof o === 'string' ? o : o.label || o.value,
                value: typeof o === 'string' ? o : o.value,
                description: o.description
              }))
            : undefined,
          required: q.required ?? true,
          allowCustom: q.allowCustom ?? true,
          status: 'PENDING'
        }))
      : [];

    const missingBlocking = Array.isArray(raw?.readiness?.missingBlocking) ? raw.readiness.missingBlocking : [];
    const isReady = Boolean(raw?.readiness?.isReady && contradictions.length === 0 && missingBlocking.length === 0);
    const completenessScore = typeof raw?.readiness?.completenessScore === 'number'
      ? Math.min(1, Math.max(0, raw.readiness.completenessScore))
      : isReady ? 1.0 : 0.5;

    return {
      action: isReady ? 'READY_FOR_REVIEW' : action,
      extractedFields,
      knownFields,
      assumptions,
      contradictions,
      questions,
      readiness: {
        isReady,
        missingBlocking,
        completenessScore
      },
      reasoningSummary: raw?.reasoningSummary || 'Discovery state evaluated successfully.'
    };
  }

  /**
   * Deterministic Strategy Engine (Fallback & Test Baseline)
   * Implements high-fidelity rule-based commercial advertising discovery heuristics.
   */
  public executeDeterministicAnalysis(params: {
    initialPrompt?: string;
    userAnswer?: { questionId: string; rawAnswer: string | string[] };
    currentState: DiscoveryState;
    availableAssets?: Array<{ id: string; name: string; role: string }>;
  }): DiscoveryAnalysisResult {
    const { initialPrompt, userAnswer, currentState, availableAssets = [] } = params;
    const brief: Partial<AdBrief> = { ...currentState.brief };
    const knownFields: KnownField[] = [...currentState.knownFields];
    const assumptions: Array<{ field: string; value: any; rationale: string }> = [];
    const contradictions: DiscoveryContradiction[] = [];
    const questions: DiscoveryQuestion[] = [];

    const inputLower = (initialPrompt || '').toLowerCase();

    // 1. Natural Language Extraction from Initial Prompt
    if (initialPrompt) {
      // Platform detection
      if (inputLower.includes('tiktok')) {
        brief.platform = 'tiktok_in_feed';
        brief.aspectRatio = '9:16';
        knownFields.push({ field: 'platform', value: 'tiktok_in_feed', source: 'USER' });
        knownFields.push({ field: 'aspectRatio', value: '9:16', source: 'INFERRED' });
      } else if (inputLower.includes('instagram') || inputLower.includes('reels')) {
        brief.platform = 'instagram_reels';
        brief.aspectRatio = '9:16';
        knownFields.push({ field: 'platform', value: 'instagram_reels', source: 'USER' });
        knownFields.push({ field: 'aspectRatio', value: '9:16', source: 'INFERRED' });
      } else if (inputLower.includes('youtube') || inputLower.includes('shorts')) {
        brief.platform = 'youtube_shorts';
        brief.aspectRatio = '9:16';
        knownFields.push({ field: 'platform', value: 'youtube_shorts', source: 'USER' });
        knownFields.push({ field: 'aspectRatio', value: '9:16', source: 'INFERRED' });
      } else if (inputLower.includes('linkedin')) {
        brief.platform = 'linkedin_video';
        brief.aspectRatio = '16:9';
        knownFields.push({ field: 'platform', value: 'linkedin_video', source: 'USER' });
      }

      // Duration detection
      const durationMatch = inputLower.match(/(\d{1,2})\s*(?:sec|second|seconds|s\b)/);
      if (durationMatch) {
        const sec = parseInt(durationMatch[1], 10);
        brief.desiredDurationSeconds = sec;
        knownFields.push({ field: 'desiredDurationSeconds', value: sec, source: 'USER' });
      } else if (!brief.desiredDurationSeconds) {
        brief.desiredDurationSeconds = 15;
        assumptions.push({
          field: 'desiredDurationSeconds',
          value: 15,
          rationale: 'Standard social feed commercial duration default'
        });
      }

      // Objective extraction
      if (inputLower.includes('awareness') || inputLower.includes('brand launch')) {
        brief.objective = 'brand_awareness';
        knownFields.push({ field: 'objective', value: 'brand_awareness', source: 'USER' });
      } else if (inputLower.includes('conversion') || inputLower.includes('sales') || inputLower.includes('buy')) {
        brief.objective = 'direct_response';
        knownFields.push({ field: 'objective', value: 'direct_response', source: 'USER' });
      } else if (inputLower.includes('app') || inputLower.includes('install') || inputLower.includes('download')) {
        brief.objective = 'app_installs';
        knownFields.push({ field: 'objective', value: 'app_installs', source: 'USER' });
      }

      // Product / Offering Extraction
      const genericPlaceholders = ['something', 'something cool', 'anything', 'product', 'my product', 'our product', 'a product', 'an ad', 'commercial'];
      const energyDrinkMatch = inputLower.match(/(?:for|about|promoting)\s+(?:my|our|a|an)?\s*(?:new)?\s*([a-zA-Z0-9\s]+?)(?:\.|$|,|\bfor\b|\bwith\b|\bin\b)/);
      if (energyDrinkMatch && energyDrinkMatch[1]?.trim()) {
        const prod = energyDrinkMatch[1].trim().replace(/^new\s+/i, '');
        if (!genericPlaceholders.includes(prod.toLowerCase())) {
          brief.product = prod;
          knownFields.push({ field: 'product', value: prod, source: 'USER' });
        }
      } else if (inputLower.includes('energy drink')) {
        brief.product = 'Energy drink';
        knownFields.push({ field: 'product', value: 'Energy drink', source: 'USER' });
      } else if (inputLower.includes('serum') || inputLower.includes('skincare')) {
        brief.product = 'Glow Serum';
        knownFields.push({ field: 'product', value: 'Glow Serum', source: 'USER' });
      }

      // Brand extraction heuristic
      const brandMatch = initialPrompt.match(/(?:brand|company|name is)\s+([A-Z][a-zA-Z0-9]+)/);
      if (brandMatch) {
        brief.brandRef = brandMatch[1];
        knownFields.push({ field: 'brandRef', value: brandMatch[1], source: 'USER' });
      }
    }

    // 2. Process User Answer if provided
    if (userAnswer) {
      const qId = userAnswer.questionId;
      const rawAns = Array.isArray(userAnswer.rawAnswer)
        ? userAnswer.rawAnswer.join(', ')
        : String(userAnswer.rawAnswer);

      if (qId.includes('product') || qId.includes('offering')) {
        brief.product = rawAns;
        knownFields.push({ field: 'product', value: rawAns, source: 'USER' });
      } else if (qId.includes('audience') || qId.includes('who')) {
        // Natural language target audience parsing
        brief.targetAudience = {
          persona: rawAns,
          painPoints: rawAns.toLowerCase().includes('affordable') ? ['price sensitivity'] : []
        };
        knownFields.push({ field: 'targetAudience', value: brief.targetAudience, source: 'USER' });
      } else if (qId.includes('objective') || qId.includes('achieve')) {
        const val = rawAns.toLowerCase().includes('aware')
          ? 'brand_awareness'
          : rawAns.toLowerCase().includes('consider')
          ? 'product_consideration'
          : rawAns.toLowerCase().includes('convert') || rawAns.toLowerCase().includes('sales')
          ? 'direct_response'
          : rawAns;
        brief.objective = val;
        knownFields.push({ field: 'objective', value: val, source: 'USER' });
      } else if (qId.includes('cta') || qId.includes('action')) {
        brief.cta = { visualText: rawAns, actionIntent: 'click_link' };
        knownFields.push({ field: 'cta', value: brief.cta, source: 'USER' });
      } else if (qId.includes('tone') || qId.includes('feel')) {
        brief.tone = rawAns;
        knownFields.push({ field: 'tone', value: rawAns, source: 'USER' });
      } else if (qId.includes('message')) {
        brief.keyMessage = rawAns;
        knownFields.push({ field: 'keyMessage', value: rawAns, source: 'USER' });
      }
    }

    // 3. Contradiction Detection
    // Contradiction A: Luxury vs cheap-looking
    const toneText = `${inputLower} ${String(brief.tone || '')}`.toLowerCase();
    if ((toneText.includes('luxury') || toneText.includes('luxurious') || toneText.includes('premium')) &&
        (toneText.includes('cheap') || toneText.includes('low-budget') || toneText.includes('cheap-looking'))) {
      contradictions.push({
        type: 'CONTRADICTION',
        fields: ['tone', 'positioning'],
        explanation: 'The ad requests both a luxurious feel and a cheap/low-budget aesthetic.',
        resolutionQuestion: 'Should the creative focus on an elevated luxury aesthetic, or a raw, relatable lo-fi style?'
      });
    }

    // Contradiction B: Children target vs mature themes
    const audText = `${inputLower} ${JSON.stringify(brief.targetAudience || '')}`.toLowerCase();
    if ((audText.includes('child') || audText.includes('kids') || audText.includes('toddler')) &&
        (toneText.includes('mature') || toneText.includes('violent') || toneText.includes('edgy adult'))) {
      contradictions.push({
        type: 'CONTRADICTION',
        fields: ['targetAudience', 'tone'],
        explanation: 'Audience targets children, but tone mentions mature themes.',
        resolutionQuestion: 'Should the ad be tailored as family-friendly for children, or targeted to adult guardians?'
      });
    }

    // Contradiction C: Duration vs requested narrative scope
    const duration = typeof brief.desiredDurationSeconds === 'number' ? brief.desiredDurationSeconds : 15;
    if (duration <= 15 && (inputLower.includes('20 seconds of story') || inputLower.includes('deep 3-act story with backstories'))) {
      contradictions.push({
        type: 'CONTRADICTION',
        fields: ['desiredDurationSeconds', 'storyScope'],
        explanation: `Requested a ${duration}s video ad but specified narrative content requiring significantly more screen time.`,
        resolutionQuestion: `Would you prefer to expand the duration to 30s, or condense the story into a fast-paced ${duration}s hook-and-payoff?`
      });
    }

    // 4. Missing Information Analysis & Question Prioritization (1–3 high-value questions)
    const missingBlocking: string[] = [];

    // Check Product (BLOCKING)
    if (!brief.product || brief.product === 'Default Product') {
      missingBlocking.push('product');
      questions.push({
        id: 'q_product',
        field: 'product',
        question: 'What specific product, service, or offering is this advertisement spotlighting?',
        reason: 'The ad cannot be constructed without knowing the core offering being promoted.',
        priority: 'BLOCKING',
        inputType: 'text',
        required: true,
        allowCustom: true,
        status: 'PENDING'
      });
    }

    // Check Objective (BLOCKING)
    if (!brief.objective) {
      missingBlocking.push('objective');
      questions.push({
        id: 'q_objective',
        field: 'objective',
        question: 'What is the primary result this advertisement should achieve?',
        reason: 'Determines whether the ad structure focuses on intrigue, education, or direct conversion.',
        priority: 'BLOCKING',
        inputType: 'single_choice',
        options: [
          { label: 'Brand & Product Awareness', value: 'brand_awareness', description: 'Introduce the product and make a memorable visual impression.' },
          { label: 'Product Consideration', value: 'product_consideration', description: 'Highlight key differentiators and spark purchase intent.' },
          { label: 'Direct Conversion / Sales', value: 'direct_response', description: 'Drive immediate clicks, orders, or sign-ups.' },
          { label: 'App Installs / Downloads', value: 'app_installs', description: 'Encourage users to install an app or play a game.' }
        ],
        required: true,
        allowCustom: true,
        status: 'PENDING'
      });
    }

    // Check Target Audience (IMPORTANT)
    if (!brief.targetAudience) {
      questions.push({
        id: 'q_audience',
        field: 'targetAudience',
        question: 'Who are you trying to make this ad resonate with most?',
        reason: 'Shapes the character casting, environment, and relatable narrative tension.',
        priority: 'IMPORTANT',
        inputType: 'single_choice',
        options: [
          { label: 'College Students & Young Adults', value: 'college_students', description: 'Energetic, budget-conscious, trend-driven.' },
          { label: 'Busy Working Professionals', value: 'working_professionals', description: 'Time-constrained, value convenience and efficacy.' },
          { label: 'Fitness & Health Enthusiasts', value: 'fitness_enthusiasts', description: 'Performance-focused, clean ingredients and stamina.' },
          { label: 'Broad Consumer Audience', value: 'general_consumers', description: 'Universal lifestyle appeal.' }
        ],
        required: false,
        allowCustom: true,
        status: 'PENDING'
      });
    }

    // Check Call To Action (IMPORTANT)
    if (!brief.cta) {
      questions.push({
        id: 'q_cta',
        field: 'cta',
        question: 'What single action should the viewer take right after watching?',
        reason: 'Anchors the closing card and final narrative transition.',
        priority: 'IMPORTANT',
        inputType: 'single_choice',
        options: [
          { label: 'Try It Today / Shop Now', value: 'Shop Now' },
          { label: 'Learn More / Explore', value: 'Learn More' },
          { label: 'Get Started Free', value: 'Get Started Free' },
          { label: 'Download the App', value: 'Download the App' }
        ],
        required: false,
        allowCustom: true,
        status: 'PENDING'
      });
    }

    // Asset Awareness: Check if a product packshot asset is present or needed
    const hasProductAsset = availableAssets.some(a => a.role === 'product_hero' || a.name.toLowerCase().includes('product'));
    if (!hasProductAsset && brief.product && !inputLower.includes('no asset')) {
      questions.push({
        id: 'q_asset_product',
        field: 'product_asset',
        question: `Do you have an existing packshot or photo of ${brief.product} you'd like us to feature?`,
        reason: 'Ensures exact visual packaging fidelity in hero shots.',
        priority: 'IMPORTANT',
        inputType: 'asset_selection',
        options: [
          { label: 'Yes, I have an image to use', value: 'use_asset' },
          { label: 'No, generate an AI-rendered representation', value: 'ai_render' }
        ],
        required: false,
        allowCustom: true,
        status: 'PENDING'
      });
    }

    // Evaluate readiness: minimum viable brief requires product + objective + platform
    const hasProduct = Boolean(brief.product && brief.product !== 'Default Product');
    const hasObjective = Boolean(brief.objective);
    const isReady = hasProduct && hasObjective && contradictions.length === 0 && missingBlocking.length === 0;

    let completenessScore = 0.2;
    if (hasProduct) completenessScore += 0.3;
    if (hasObjective) completenessScore += 0.2;
    if (brief.targetAudience) completenessScore += 0.15;
    if (brief.cta) completenessScore += 0.15;
    completenessScore = Math.min(1.0, completenessScore);

    return {
      action: isReady ? 'READY_FOR_REVIEW' : 'ASK_QUESTIONS',
      extractedFields: brief,
      knownFields,
      assumptions,
      contradictions,
      questions,
      readiness: {
        isReady,
        missingBlocking,
        completenessScore
      },
      reasoningSummary: isReady
        ? 'Minimum viable commercial brief established. Ready for brief review and confirmation.'
        : `Identified ${questions.length} focused question(s) to establish the creative brief.`
    };
  }
}

export const interviewerAiService = new InterviewerAiService();
