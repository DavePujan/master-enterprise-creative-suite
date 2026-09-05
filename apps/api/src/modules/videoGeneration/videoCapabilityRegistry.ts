/**
 * Authoritative Server-Side Video Capability Registry.
 * Declares supported modes, aspect ratios, durations, frame controls, reference limits,
 * audio features, and credit costs for each video engine.
 */

import { VideoEngineKey, VideoEngineCapability, VideoProductTier } from '../../../../../packages/types/videoGeneration.js';

export const VIDEO_CAPABILITIES: Record<VideoEngineKey, VideoEngineCapability> = {
  'google-omni': {
    engineKey: 'google-omni',
    modelId: 'gemini-omni-1.1-flash',
    provider: 'google',
    displayName: 'Google Omni 1.1 Flash',
    productTier: 'pro',
    supportedModes: ['text_to_video', 'image_to_video', 'edit_video', 'extend_video'],
    aspectRatios: ['16:9', '9:16'],
    supportedDurations: [4, 6, 8, 10],
    supportedResolutions: ['720p', '1080p'],
    supportsAudio: true,
    supportsDialogue: true,
    supportsFirstFrame: false, // Takes image conditioning / reference parts, not explicit start-frame interpolation
    supportsLastFrame: false,
    supportsReferenceImages: true,
    maxReferenceImages: 3,
    supportsReferenceVideos: true,
    maxReferenceVideos: 1,
    supportsReferenceAudios: false,
    maxReferenceAudios: 0,
    supportsElements: false,
    supportsMultiShot: true,
    supportsExtension: true,
    supportsConversationalEditing: true,
    supportsSeed: false,
    creditCost: 20,
    status: 'AVAILABLE'
  },
  'veo-pro': {
    engineKey: 'veo-pro',
    modelId: 'veo-3.1-generate-preview',
    provider: 'google',
    displayName: 'Google Veo 3.1 Pro',
    productTier: 'pro',
    supportedModes: ['text_to_video', 'image_to_video', 'extend_video'],
    aspectRatios: ['16:9', '9:16'],
    supportedDurations: [4, 6, 8],
    supportedResolutions: ['720p', '1080p', '4k'],
    supportsAudio: true,
    supportsDialogue: false,
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferenceImages: true,
    maxReferenceImages: 3,
    supportsReferenceVideos: false,
    maxReferenceVideos: 0,
    supportsReferenceAudios: false,
    maxReferenceAudios: 0,
    supportsElements: false,
    supportsMultiShot: false,
    supportsExtension: true,
    supportsConversationalEditing: false,
    supportsSeed: true,
    creditCost: 40,
    status: 'AVAILABLE'
  },
  'veo-fast': {
    engineKey: 'veo-fast',
    modelId: 'veo-3.1-fast-generate-preview',
    provider: 'google',
    displayName: 'Google Veo 3.1 Fast',
    productTier: 'standard',
    supportedModes: ['text_to_video', 'image_to_video'],
    aspectRatios: ['16:9', '9:16'],
    supportedDurations: [5, 7],
    supportedResolutions: ['720p', '1080p'],
    supportsAudio: true,
    supportsDialogue: false,
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferenceImages: false,
    maxReferenceImages: 0,
    supportsReferenceVideos: false,
    maxReferenceVideos: 0,
    supportsReferenceAudios: false,
    maxReferenceAudios: 0,
    supportsElements: false,
    supportsMultiShot: false,
    supportsExtension: false,
    supportsConversationalEditing: false,
    supportsSeed: true,
    creditCost: 20,
    status: 'AVAILABLE'
  },
  'veo-lite': {
    engineKey: 'veo-lite',
    modelId: 'veo-3.1-lite-generate-preview',
    provider: 'google',
    displayName: 'Google Veo 3.1 Lite',
    productTier: 'fast',
    supportedModes: ['text_to_video'],
    aspectRatios: ['16:9', '9:16'],
    supportedDurations: [5],
    supportedResolutions: ['720p'],
    supportsAudio: false,
    supportsDialogue: false,
    supportsFirstFrame: false,
    supportsLastFrame: false,
    supportsReferenceImages: false,
    maxReferenceImages: 0,
    supportsReferenceVideos: false,
    maxReferenceVideos: 0,
    supportsReferenceAudios: false,
    maxReferenceAudios: 0,
    supportsElements: false,
    supportsMultiShot: false,
    supportsExtension: false,
    supportsConversationalEditing: false,
    supportsSeed: false,
    creditCost: 10,
    status: 'AVAILABLE'
  },
  'kling-v3': {
    engineKey: 'kling-v3',
    modelId: 'fal-ai/kling-video/v3/standard/text-to-video',
    provider: 'fal',
    displayName: 'Kling 3.0 Standard',
    productTier: 'plus',
    supportedModes: ['text_to_video', 'image_to_video', 'multi_shot'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    supportedDurations: [3, 5, 8, 10, 15],
    supportedResolutions: ['720p', '1080p'],
    supportsAudio: true,
    supportsDialogue: false,
    supportsFirstFrame: true,
    supportsLastFrame: true,
    supportsReferenceImages: true,
    maxReferenceImages: 4,
    supportsReferenceVideos: false,
    maxReferenceVideos: 0,
    supportsReferenceAudios: false,
    maxReferenceAudios: 0,
    supportsElements: true,
    supportsMultiShot: true,
    supportsExtension: false,
    supportsConversationalEditing: false,
    supportsSeed: true,
    creditCost: 40,
    status: 'AVAILABLE'
  },
  'seedance-2': {
    engineKey: 'seedance-2',
    modelId: 'bytedance/seedance-2.0/reference-to-video',
    provider: 'fal',
    displayName: 'Seedance 2.0 Cinematic',
    productTier: 'cinematic',
    supportedModes: ['text_to_video', 'image_to_video', 'reference_to_video', 'multi_shot'],
    aspectRatios: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    supportedDurations: [4, 6, 8, 10, 12, 15, 'auto'],
    supportedResolutions: ['720p', '1080p'],
    supportsAudio: true,
    supportsDialogue: false,
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferenceImages: true,
    maxReferenceImages: 9,
    supportsReferenceVideos: true,
    maxReferenceVideos: 3,
    supportsReferenceAudios: true,
    maxReferenceAudios: 3,
    supportsElements: false,
    supportsMultiShot: true,
    supportsExtension: false,
    supportsConversationalEditing: false,
    supportsSeed: true,
    creditCost: 80,
    status: 'AVAILABLE'
  }
};

/**
 * Helper to retrieve capabilities for a specific engine key.
 */
export function getEngineCapability(key: VideoEngineKey): VideoEngineCapability {
  const cap = VIDEO_CAPABILITIES[key];
  if (!cap) {
    throw new Error(`Unknown video engine key: ${key}`);
  }
  return cap;
}

/**
 * Returns candidate engines for a given product tier.
 */
export function getEnginesForTier(tier: VideoProductTier): VideoEngineCapability[] {
  if (tier === 'auto') {
    return Object.values(VIDEO_CAPABILITIES);
  }
  return Object.values(VIDEO_CAPABILITIES).filter(c => c.productTier === tier);
}
