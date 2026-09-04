/**
 * Presentation Planner (Stage 1: Strategy & Outline).
 * Determines deck objective, audience, narrative arc, slide count, and semantic purposes.
 * Enforces allowedLayoutsByPurpose and variable slide counts (4 to 15 slides).
 */

import { getServerAI } from '../../infrastructure/gemini/serverGeminiClient.js';
import { resolvePresentationConfig } from './presentationModelResolver.js';
import { SlidePurpose, SlideLayoutType } from '@presentation-engine/index.js';
import { ALLOWED_LAYOUTS_BY_PURPOSE } from '@presentation-engine/layouts/matrix.js';

export interface Stage1StrategyRequest {
  prompt: string;
  brandGuidelines?: any;
  targetSlideCount?: number;
  productContext?: any;
}

export interface PlannedSlideOutline {
  index: number;
  purpose: SlidePurpose;
  coreIdea: string;
  suggestedLayout?: SlideLayoutType;
  requiresChart?: boolean;
  requiresMetric?: boolean;
}

export interface PresentationStrategyPlan {
  title: string;
  objective: string;
  targetAudience: string;
  narrativeArc: string;
  brandName: string;
  industry: string;
  targetSlideCount: number;
  slides: PlannedSlideOutline[];
}

export async function planPresentationStrategy(
  request: Stage1StrategyRequest
): Promise<PresentationStrategyPlan> {
  const ai = getServerAI();
  const config = resolvePresentationConfig('strategy');
  const brandName = request.brandGuidelines?.name || 'Corporate';
  const targetCount = Math.max(4, Math.min(15, request.targetSlideCount || 6));

  const systemInstruction = `You are an elite enterprise management consultant and creative director.
Your mission is to formulate the high-level strategy, narrative arc, and slide-by-slide purpose plan for an executive presentation.

CRITICAL RULES:
1. Target slide count: formulate exactly ${targetCount} logical slides.
2. Structure the presentation around a compelling executive narrative arc (e.g. Opportunity -> Regional Penetration -> Operational Scale).
3. The first slide MUST have purpose: "cover".
4. The final slide MUST have purpose: "closing" or "case-study".
5. Available slide purposes: "cover", "agenda", "problem", "opportunity", "strategy", "solution", "process", "timeline", "comparison", "metrics", "market", "team", "financials", "case-study", "closing".
6. Return strictly valid JSON adhering to the specified schema.`;

  const userInput = `User Creative Brief: "${request.prompt}"
Brand Name: ${brandName}
Target Slide Count: ${targetCount}
${request.productContext ? `Product Context: ${JSON.stringify(request.productContext)}` : ''}

Generate the PresentationStrategyPlan JSON object with:
- title: Executive deck title (under 10 words)
- objective: Core business objective of this deck
- targetAudience: Specific executive audience (e.g. "C-Suite & Category Directors")
- narrativeArc: Summary of the narrative progression (e.g. "Context -> Strategy -> Impact")
- brandName: "${brandName}"
- industry: Relevant business sector
- targetSlideCount: ${targetCount}
- slides: Array of ${targetCount} items with:
    - index: 0-indexed number
    - purpose: One of the allowed slide purposes
    - coreIdea: 1-2 sentence core message of this slide
    - requiresChart: boolean (true if this slide focuses on quantitative comparisons)
    - requiresMetric: boolean (true if this slide focuses on key performance indicators)`;

  const modelsToTry = [config.model, ...config.fallbacks];
  let lastError: any = null;

  for (const modelId of modelsToTry) {
    try {
      console.log(`[PresentationPlanner] Executing Stage 1 with model: ${modelId}`);

      let responseText = '';

      // Check if interactions API is supported on ai instance
      if ((ai as any).interactions?.create) {
        const interaction = await (ai as any).interactions.create({
          model: modelId,
          input: userInput,
          system_instruction: systemInstruction,
          response_format: 'json',
          generation_config: {
            thinking_level: config.thinkingLevel,
            max_output_tokens: config.maxOutputTokens
          }
        });
        responseText = interaction.output_text || '';
      } else {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ text: `${systemInstruction}\n\n${userInput}` }],
          config: {
            responseMimeType: 'application/json'
          }
        });
        responseText = response.text || '';
      }

      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const plan: PresentationStrategyPlan = JSON.parse(cleanJson);

      // Sanitize and ensure slide count matches reality
      if (!plan.slides || plan.slides.length === 0) {
        throw new Error('Planner returned empty slide list.');
      }

      // Enforce purpose compatibility
      plan.slides.forEach((s, idx) => {
        s.index = idx;
        const allowed = ALLOWED_LAYOUTS_BY_PURPOSE[s.purpose] || ['standard'];
        if (s.suggestedLayout && !allowed.includes(s.suggestedLayout)) {
          s.suggestedLayout = allowed[0];
        }
      });

      return plan;
    } catch (err: any) {
      lastError = err;
      console.warn(`[PresentationPlanner] Stage 1 attempt on ${modelId} failed:`, err?.message || err);
    }
  }

  throw new Error(`Presentation Stage 1 Planning failed across all models: ${lastError?.message || lastError}`);
}
