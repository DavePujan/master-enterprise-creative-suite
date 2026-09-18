/**
 * Provider-Neutral Model Capability Registry for Video Gem.
 * Defines authoritative runtime capabilities across AI video generation models
 * and provides query interfaces for pre-flight validation and execution planning.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type { ModelCapability, VideoProviderId } from '@contracts/modelCapabilityContracts.js';

export const MODEL_CAPABILITY_REGISTRY: Record<string, ModelCapability> = {
  // 1. Google Veo 3.1 Pro
  'veo_3_1_pro': {
    provider: 'google',
    model: 'veo_3_1_pro',
    displayName: 'Google Veo 3.1 Pro',
    supported_durations: [4, 5, 6, 8, 10],
    aspect_ratios: ['16:9', '9:16', '1:1', '4:5', '21:9'],
    resolutions: ['720p', '1080p', '4k'],
    max_references: 3,
    image_to_video: true,
    first_frame: true,
    last_frame: true,
    character_reference: true,
    audio: true,
    camera_control: true,
    motion_strength: false,
    negative_prompt: true,
    max_prompt_length: 2000,
    credit_cost: 35,
    status: 'AVAILABLE',
    other_capabilities: {
      dialogueGeneration: false,
      cinematicGradeControl: true,
      lensSimulation: true
    }
  },

  // 2. Google Veo 3.1 Fast
  'veo_3_1_fast': {
    provider: 'google',
    model: 'veo_3_1_fast',
    displayName: 'Google Veo 3.1 Fast',
    supported_durations: [5, 7],
    aspect_ratios: ['16:9', '9:16'],
    resolutions: ['720p', '1080p'],
    max_references: 1,
    image_to_video: true,
    first_frame: true,
    last_frame: false,
    character_reference: false,
    audio: true,
    camera_control: false,
    motion_strength: false,
    negative_prompt: true,
    max_prompt_length: 1500,
    credit_cost: 20,
    status: 'AVAILABLE',
    other_capabilities: {
      speedTier: 'rapid'
    }
  },

  // 3. Google Veo Lite
  'veo_lite': {
    provider: 'google',
    model: 'veo_lite',
    displayName: 'Google Veo Lite',
    supported_durations: [5],
    aspect_ratios: ['16:9', '9:16'],
    resolutions: ['720p'],
    max_references: 0,
    image_to_video: false,
    first_frame: false,
    last_frame: false,
    character_reference: false,
    audio: false,
    camera_control: false,
    motion_strength: false,
    negative_prompt: false,
    max_prompt_length: 1000,
    credit_cost: 10,
    status: 'AVAILABLE'
  },

  // 4. Kling 3.0 Standard
  'kling_v3': {
    provider: 'kling',
    model: 'kling_v3',
    displayName: 'Kling 3.0 Standard',
    supported_durations: [3, 5, 8, 10],
    aspect_ratios: ['16:9', '9:16', '1:1'],
    resolutions: ['720p', '1080p'],
    max_references: 4,
    image_to_video: true,
    first_frame: true,
    last_frame: true,
    character_reference: true,
    audio: true,
    camera_control: true,
    motion_strength: true,
    negative_prompt: true,
    max_prompt_length: 2500,
    credit_cost: 35,
    status: 'AVAILABLE',
    other_capabilities: {
      elementControl: true,
      dynamicMotionSensitivity: true
    }
  },

  // 5. Runway Gen-3 Alpha
  'runway_gen3': {
    provider: 'runway',
    model: 'runway_gen3',
    displayName: 'Runway Gen-3 Alpha',
    supported_durations: [5, 10],
    aspect_ratios: ['16:9', '9:16'],
    resolutions: ['720p', '1080p'],
    max_references: 2,
    image_to_video: true,
    first_frame: true,
    last_frame: false,
    character_reference: true,
    audio: false, // Video only, requires external audio synthesis
    camera_control: true,
    motion_strength: true,
    negative_prompt: true,
    max_prompt_length: 1800,
    credit_cost: 30,
    status: 'AVAILABLE',
    other_capabilities: {
      cameraMotionTokens: true,
      motionBrush: true
    }
  },

  // 6. Luma Dream Machine 1.6
  'luma_dream_machine_1_6': {
    provider: 'luma',
    model: 'luma_dream_machine_1_6',
    displayName: 'Luma Dream Machine 1.6',
    supported_durations: [5, 9],
    aspect_ratios: ['16:9', '9:16', '1:1', '4:5'],
    resolutions: ['720p', '1080p'],
    max_references: 2,
    image_to_video: true,
    first_frame: true,
    last_frame: true,
    character_reference: false,
    audio: false,
    camera_control: true,
    motion_strength: false,
    negative_prompt: false,
    max_prompt_length: 1500,
    credit_cost: 25,
    status: 'AVAILABLE',
    other_capabilities: {
      startEndKeyframeInterpolation: true
    }
  },

  // 7. Seedance 2.0 Cinematic
  'seedance_2_0': {
    provider: 'seedance',
    model: 'seedance_2_0',
    displayName: 'Seedance 2.0 Cinematic',
    supported_durations: [4, 6, 8, 10, 12],
    aspect_ratios: ['16:9', '9:16', '1:1', '21:9', '4:5'],
    resolutions: ['720p', '1080p'],
    max_references: 9,
    image_to_video: true,
    first_frame: true,
    last_frame: false,
    character_reference: true,
    audio: true,
    camera_control: true,
    motion_strength: true,
    negative_prompt: true,
    max_prompt_length: 3000,
    credit_cost: 50,
    status: 'AVAILABLE',
    other_capabilities: {
      multiReferenceBinding: true,
      productConsistencyModel: true
    }
  },

  // 8. MiniMax Hailuo 01
  'minimax_hailuo': {
    provider: 'minimax',
    model: 'minimax_hailuo',
    displayName: 'MiniMax Hailuo Video 01',
    supported_durations: [6, 10],
    aspect_ratios: ['16:9', '9:16'],
    resolutions: ['720p', '1080p'],
    max_references: 2,
    image_to_video: true,
    first_frame: true,
    last_frame: false,
    character_reference: true,
    audio: true,
    camera_control: false,
    motion_strength: false,
    negative_prompt: true,
    max_prompt_length: 2000,
    credit_cost: 25,
    status: 'AVAILABLE'
  }
};

/**
 * Retrieves capability definition for a specific model ID.
 */
export function getModelCapability(modelId: string, safe = false): ModelCapability | null {
  const model = MODEL_CAPABILITY_REGISTRY[modelId];
  if (!model) {
    if (safe) return null;
    throw new Error(`Model "${modelId}" is not registered in the Model Capability Registry. Available models: ${Object.keys(MODEL_CAPABILITY_REGISTRY).join(', ')}`);
  }
  return model;
}

/**
 * Returns all registered model capabilities.
 */
export function getAllModelCapabilities(): ModelCapability[] {
  return Object.values(MODEL_CAPABILITY_REGISTRY);
}

/**
 * Returns model capabilities filtered by provider.
 */
export function getModelsByProvider(provider: VideoProviderId): ModelCapability[] {
  return Object.values(MODEL_CAPABILITY_REGISTRY).filter(m => m.provider === provider);
}

/**
 * Finds models matching specific feature requirements.
 */
export function findCompatibleModels(requirements: {
  duration?: number;
  aspectRatio?: string;
  resolution?: '720p' | '1080p' | '4k';
  requiresFirstFrame?: boolean;
  requiresLastFrame?: boolean;
  requiresAudio?: boolean;
  requiresCharacterRef?: boolean;
  maxReferenceCount?: number;
}): ModelCapability[] {
  return Object.values(MODEL_CAPABILITY_REGISTRY).filter(m => {
    if (requirements.duration && !m.supported_durations.includes(requirements.duration)) return false;
    if (requirements.aspectRatio && !m.aspect_ratios.includes(requirements.aspectRatio as any)) return false;
    if (requirements.resolution && !m.resolutions.includes(requirements.resolution)) return false;
    if (requirements.requiresFirstFrame && !m.first_frame) return false;
    if (requirements.requiresLastFrame && !m.last_frame) return false;
    if (requirements.requiresAudio && !m.audio) return false;
    if (requirements.requiresCharacterRef && !m.character_reference) return false;
    if (requirements.maxReferenceCount && requirements.maxReferenceCount > m.max_references) return false;
    return true;
  });
}
