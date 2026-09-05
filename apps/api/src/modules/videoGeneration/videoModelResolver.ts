/**
 * Video Model & Engine Resolver.
 * Evaluates VideoGenerationRequest against Hard Requirements, Soft Preferences,
 * and Default Preferences to select or recommend the optimal video engine.
 */

import {
  VideoGenerationRequest,
  VideoEngineKey,
  VideoProductTier,
  VideoEngineCapability
} from '../../../../../packages/types/videoGeneration.js';
import { VIDEO_CAPABILITIES, getEngineCapability } from './videoCapabilityRegistry.js';

export interface ModelResolutionResult {
  engineKey: VideoEngineKey;
  productTier: VideoProductTier;
  capability: VideoEngineCapability;
  recommendationReason: string;
}

export function normalizeEngineKey(raw?: string): VideoEngineKey | undefined {
  if (!raw) return undefined;
  if (raw in VIDEO_CAPABILITIES) return raw as VideoEngineKey;
  if (raw === 'gemini-omni-1.1-flash') return 'google-omni';
  if (raw === 'veo-3.1-generate-preview') return 'veo-pro';
  if (raw === 'veo-3.1-fast-generate-preview') return 'veo-fast';
  if (raw === 'veo-3.1-lite-generate-preview') return 'veo-lite';
  if (raw === 'kling-video' || raw.includes('kling')) return 'kling-v3';
  if (raw === 'bytedance/seedance-2.0' || raw.includes('seedance')) return 'seedance-2';
  return undefined;
}

export class VideoModelResolver {
  /**
   * Resolves the authoritative engine and recommendation rationale for a request.
   */
  resolve(request: VideoGenerationRequest): ModelResolutionResult {
    // If the caller explicitly specified an engineKey or model ID, normalize and respect it
    const normalizedKey = normalizeEngineKey(request.selectedEngine);
    if (normalizedKey && VIDEO_CAPABILITIES[normalizedKey]) {
      const cap = getEngineCapability(normalizedKey);
      return {
        engineKey: normalizedKey,
        productTier: cap.productTier,
        capability: cap,
        recommendationReason: `Explicitly selected ${cap.displayName}.`
      };
    }

    // Evaluate Hard Requirements first
    const hardResult = this.evaluateHardRequirements(request);
    if (hardResult) {
      return hardResult;
    }

    // Evaluate Product Tier if specified and not 'auto'
    if (request.productTier && request.productTier !== 'auto') {
      return this.resolveByProductTier(request);
    }

    // Evaluate Soft Preferences
    const softResult = this.evaluateSoftPreferences(request);
    if (softResult) {
      return softResult;
    }

    // Default Preference: Google Omni 1.1 Flash for general creation & conversational power
    const defaultCap = VIDEO_CAPABILITIES['google-omni'];
    return {
      engineKey: 'google-omni',
      productTier: defaultCap.productTier,
      capability: defaultCap,
      recommendationReason: 'Recommended engine: Google Omni 1.1 Flash — Best match for multimodal generation, natural audio, and iterative creative control.'
    };
  }

  private evaluateHardRequirements(request: VideoGenerationRequest): ModelResolutionResult | null {
    // 1. Start frame + End frame interpolation
    if (request.startFrameAssetId && request.endFrameAssetId) {
      const cap = VIDEO_CAPABILITIES['veo-pro'];
      return {
        engineKey: 'veo-pro',
        productTier: cap.productTier,
        capability: cap,
        recommendationReason: 'Recommended engine: Google Veo 3.1 Pro — Best match for precise start-to-end frame interpolation.'
      };
    }

    // 2. Iterative conversational editing / continuation
    if (request.mode === 'edit_video' || Boolean(request.previousInteractionId)) {
      const cap = VIDEO_CAPABILITIES['google-omni'];
      return {
        engineKey: 'google-omni',
        productTier: cap.productTier,
        capability: cap,
        recommendationReason: 'Recommended engine: Google Omni 1.1 Flash — Required for conversational editing with context preservation.'
      };
    }

    // 3. Rich Multimodal Reference Board (>3 images, or video refs, or audio refs)
    const refCount = request.references?.length || 0;
    const hasVideoRefs = request.references?.some(r => r.type === 'motion_video') || false;
    const hasAudioRefs = request.references?.some(r => r.type === 'audio') || false;

    if (refCount > 3 || hasVideoRefs || hasAudioRefs || request.mode === 'reference_to_video') {
      const cap = VIDEO_CAPABILITIES['seedance-2'];
      return {
        engineKey: 'seedance-2',
        productTier: cap.productTier,
        capability: cap,
        recommendationReason: 'Recommended engine: Seedance 2.0 Cinematic — Required for rich multimodal reference board (up to 9 images, 3 videos, 3 audios).'
      };
    }

    // 4. Aspect ratios unsupported by Google (1:1, 21:9, 4:3, 3:4)
    if (request.aspectRatio === '1:1') {
      const cap = VIDEO_CAPABILITIES['kling-v3'];
      return {
        engineKey: 'kling-v3',
        productTier: cap.productTier,
        capability: cap,
        recommendationReason: 'Recommended engine: Kling 3.0 Standard — Native support for square 1:1 social formats.'
      };
    }
    if (request.aspectRatio === '21:9' || request.aspectRatio === '4:3' || request.aspectRatio === '3:4') {
      const cap = VIDEO_CAPABILITIES['seedance-2'];
      return {
        engineKey: 'seedance-2',
        productTier: cap.productTier,
        capability: cap,
        recommendationReason: `Recommended engine: Seedance 2.0 Cinematic — Native support for ${request.aspectRatio} cinema and social ratios.`
      };
    }

    return null;
  }

  private evaluateSoftPreferences(request: VideoGenerationRequest): ModelResolutionResult | null {
    const prompt = (request.prompt || '').toLowerCase();

    // Elements or dynamic physical motion
    if (prompt.includes('action') || prompt.includes('fight') || prompt.includes('crash') || prompt.includes('stunt') || prompt.includes('physics')) {
      const cap = VIDEO_CAPABILITIES['kling-v3'];
      return {
        engineKey: 'kling-v3',
        productTier: cap.productTier,
        capability: cap,
        recommendationReason: 'Recommended engine: Kling 3.0 Standard — Best match for dynamic physical motion and high-energy simulation.'
      };
    }

    // Multi-shot narrative sequences
    if (request.scenes && request.scenes.length > 1) {
      const cap = VIDEO_CAPABILITIES['seedance-2'];
      return {
        engineKey: 'seedance-2',
        productTier: cap.productTier,
        capability: cap,
        recommendationReason: 'Recommended engine: Seedance 2.0 Cinematic — Best match for multi-shot narrative sequences and cinematic pacing.'
      };
    }

    return null;
  }

  private resolveByProductTier(request: VideoGenerationRequest): ModelResolutionResult {
    const tier = request.productTier!;
    switch (tier) {
      case 'fast': {
        const cap = VIDEO_CAPABILITIES['veo-lite'];
        return { engineKey: 'veo-lite', productTier: tier, capability: cap, recommendationReason: 'Fast Tier: Google Veo 3.1 Lite (Rapid 720p draft).' };
      }
      case 'standard': {
        const cap = VIDEO_CAPABILITIES['veo-fast'];
        return { engineKey: 'veo-fast', productTier: tier, capability: cap, recommendationReason: 'Standard Tier: Google Veo 3.1 Fast (1080p balanced motion).' };
      }
      case 'pro': {
        // If image-to-video with first frame -> veo-pro; else omni
        if (request.startFrameAssetId) {
          const cap = VIDEO_CAPABILITIES['veo-pro'];
          return { engineKey: 'veo-pro', productTier: tier, capability: cap, recommendationReason: 'Pro Tier: Google Veo 3.1 Pro (Frame-conditioned cinematic).' };
        }
        const cap = VIDEO_CAPABILITIES['google-omni'];
        return { engineKey: 'google-omni', productTier: tier, capability: cap, recommendationReason: 'Pro Tier: Google Omni 1.1 Flash (Multimodal & audio).' };
      }
      case 'plus': {
        const cap = VIDEO_CAPABILITIES['kling-v3'];
        return { engineKey: 'kling-v3', productTier: tier, capability: cap, recommendationReason: 'Plus Tier: Kling 3.0 Standard (High-motion simulation).' };
      }
      case 'cinematic': {
        const cap = VIDEO_CAPABILITIES['seedance-2'];
        return { engineKey: 'seedance-2', productTier: tier, capability: cap, recommendationReason: 'Cinematic Tier: Seedance 2.0 Cinematic (Multimodal studio).' };
      }
      default: {
        const cap = VIDEO_CAPABILITIES['google-omni'];
        return { engineKey: 'google-omni', productTier: 'pro', capability: cap, recommendationReason: 'Recommended: Google Omni 1.1 Flash.' };
      }
    }
  }
}

export const videoModelResolver = new VideoModelResolver();
