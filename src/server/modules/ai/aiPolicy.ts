/**
 * Server-Owned AI Model Policy & Fallback Matrix.
 * Governs capability allowlists, generation constraints, and cost-aware fallback policies.
 */

export const ALLOWED_TEXT_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro'
]);

export const ALLOWED_VIDEO_MODELS = new Set([
  'veo-3.1-lite-generate-preview',
  'veo-3.1-fast-generate-preview',
  'veo-3.1-generate-preview'
]);

export const ALLOWED_TTS_MODELS = new Set([
  'gemini-2.5-flash-preview-tts'
]);

// Deprecated or shut down models that must NEVER be invoked
export const DEPRECATED_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.0-pro'
]);

/**
 * Resolves model and cost-matched fallback chain.
 * Avoids automatically escalating cost-effective Flash operations to expensive Pro models on transient spikes.
 */
export function resolveModelFallbackChain(requestedModel?: string): { primary: string; fallbacks: string[] } {
  let primary = requestedModel || 'gemini-2.5-flash';

  // If a deprecated/shut-down model is requested, map it cleanly to active stable 2.5 Flash
  if (DEPRECATED_MODELS.has(primary)) {
    console.warn(`[AI Policy] Requested deprecated model '${primary}', remapping to 'gemini-2.5-flash'`);
    primary = 'gemini-2.5-flash';
  }

  // Cost-aware fallback chains
  if (primary === 'gemini-2.5-pro') {
    return {
      primary: 'gemini-2.5-pro',
      fallbacks: ['gemini-2.5-flash']
    };
  }

  // Standard Flash text generation
  return {
    primary: 'gemini-2.5-flash',
    fallbacks: ['gemini-2.5-flash-lite']
  };
}
