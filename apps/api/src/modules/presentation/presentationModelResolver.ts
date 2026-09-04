/**
 * Presentation Model Resolver.
 * Connects the Presentation Engine to approved Gemini production models via the Interactions API.
 * Uses gemini-3.8-flash as primary GA model with fallback chain.
 */

export interface ResolvedPresentationModelConfig {
  stage: 'strategy' | 'content';
  model: string;
  fallbacks: string[];
  thinkingLevel: 'minimal' | 'low' | 'medium' | 'high';
  creditsRequired: number;
  maxOutputTokens: number;
}

export const PRESENTATION_MODELS = {
  primary: 'gemini-3.8-flash',
  fallbacks: ['gemini-3.7-flash', 'gemini-3.5-flash']
} as const;

export function resolvePresentationConfig(
  stage: 'strategy' | 'content'
): ResolvedPresentationModelConfig {
  return {
    stage,
    model: PRESENTATION_MODELS.primary,
    fallbacks: [...PRESENTATION_MODELS.fallbacks],
    thinkingLevel: stage === 'strategy' ? 'medium' : 'low',
    creditsRequired: stage === 'strategy' ? 3 : 2, // Combined total = 5 credits
    maxOutputTokens: stage === 'strategy' ? 4096 : 8192
  };
}
