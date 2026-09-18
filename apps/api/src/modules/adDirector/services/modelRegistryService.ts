/**
 * Model Registry & Capability Validation Service.
 * Provides authoritative capability profiles for AI video engines and evaluates
 * compatibility against approved AdSpecs without mutating creative truth.
 */

import type { AdSpec } from '@shared-types/adSpec.js';
import type { VideoEngineKey, VideoEngineCapability } from '@shared-types/videoGeneration.js';
import { VIDEO_CAPABILITIES } from '../../videoGeneration/videoCapabilityRegistry.js';
import type {
  ModelCompatibilityResult,
  ModelCompatibilityIssue
} from '../../../../../../packages/contracts/adSpecContracts.js';

export interface EngineModelProfile {
  engineKey: VideoEngineKey | string;
  displayName: string;
  provider: 'google' | 'fal';
  maxDurationSeconds: number;
  minDurationSeconds: number;
  supportedAspectRatios: string[];
  firstFrameSupported: boolean;
  lastFrameSupported: boolean;
  nativeAudioSupported: boolean;
  maxReferenceImages: number;
  creditCost: number;
  active: boolean;
}

export const ENGINE_PROFILES: Record<string, EngineModelProfile> = {
  'google-omni': {
    engineKey: 'google-omni',
    displayName: 'Google Omni-Motion (Fast Concepting)',
    provider: 'google',
    maxDurationSeconds: 8,
    minDurationSeconds: 2,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    firstFrameSupported: true,
    lastFrameSupported: false,
    nativeAudioSupported: false,
    maxReferenceImages: 1,
    creditCost: 15,
    active: true
  },
  'veo-pro': {
    engineKey: 'veo-pro',
    displayName: 'Google Veo 3.1 Pro (Cinematic Master)',
    provider: 'google',
    maxDurationSeconds: 10,
    minDurationSeconds: 3,
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:5'],
    firstFrameSupported: true,
    lastFrameSupported: true,
    nativeAudioSupported: true,
    maxReferenceImages: 3,
    creditCost: 35,
    active: true
  },
  'kling-v3': {
    engineKey: 'kling-v3',
    displayName: 'Kling 2.1 Master (Physical Realism)',
    provider: 'fal',
    maxDurationSeconds: 10,
    minDurationSeconds: 3,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    firstFrameSupported: true,
    lastFrameSupported: false,
    nativeAudioSupported: false,
    maxReferenceImages: 2,
    creditCost: 30,
    active: true
  },
  'seedance-2': {
    engineKey: 'seedance-2',
    displayName: 'Seedance 2.0 Pro (High Motion & VFX)',
    provider: 'fal',
    maxDurationSeconds: 12,
    minDurationSeconds: 2,
    supportedAspectRatios: ['16:9', '9:16'],
    firstFrameSupported: true,
    lastFrameSupported: true,
    nativeAudioSupported: false,
    maxReferenceImages: 4,
    creditCost: 25,
    active: true
  }
};

export class ModelRegistryService {
  /**
   * Retrieves all active model profiles from registry.
   */
  getAvailableModels(): EngineModelProfile[] {
    return Object.values(ENGINE_PROFILES).filter(m => m.active);
  }

  /**
   * Resolves a model profile by key, with resilient fallback.
   */
  getModelProfile(engineKey: string): EngineModelProfile {
    // Check direct match
    if (ENGINE_PROFILES[engineKey]) {
      return ENGINE_PROFILES[engineKey];
    }
    // Check alias mappings
    if (engineKey.includes('veo')) return ENGINE_PROFILES['veo-pro'];
    if (engineKey.includes('omni')) return ENGINE_PROFILES['google-omni'];
    if (engineKey.includes('kling')) return ENGINE_PROFILES['kling-v3'];
    if (engineKey.includes('seedance')) return ENGINE_PROFILES['seedance-2'];

    return ENGINE_PROFILES['veo-pro'];
  }

  /**
   * Deterministically validates an AdSpec against a target model's physical capabilities.
   * INVARIANT: AdSpec is NEVER mutated.
   */
  validateModelCompatibility(adSpec: AdSpec, engineKey: string): ModelCompatibilityResult {
    const profile = this.getModelProfile(engineKey);
    const blockingIssues: ModelCompatibilityIssue[] = [];
    const warnings: ModelCompatibilityIssue[] = [];

    const reqs = adSpec.generationRequirements || {
      firstFrameRequired: false,
      lastFrameRequired: false,
      audioRequired: false,
      maxReferenceImages: 0
    };

    // 1. Aspect Ratio Check
    const requestedAspect = adSpec.brief?.aspectRatio || '16:9';
    if (!profile.supportedAspectRatios.includes(requestedAspect)) {
      blockingIssues.push({
        type: 'aspect_ratio_unsupported',
        field: 'brief.aspectRatio',
        message: `Engine "${profile.displayName}" does not support aspect ratio "${requestedAspect}". Supported: [${profile.supportedAspectRatios.join(', ')}].`,
        required: requestedAspect,
        supported: profile.supportedAspectRatios
      });
    }

    // 2. Shot Duration Checks
    const shots = adSpec.shots || [];
    for (const shot of shots) {
      if (shot.timing && shot.timing.durationSeconds > profile.maxDurationSeconds) {
        blockingIssues.push({
          type: 'shot_duration_exceeded',
          field: `shots.${shot.id}.timing.durationSeconds`,
          message: `Shot "${shot.name || shot.id}" duration (${shot.timing.durationSeconds}s) exceeds maximum supported duration (${profile.maxDurationSeconds}s) for ${profile.displayName}.`,
          required: shot.timing.durationSeconds,
          supported: profile.maxDurationSeconds
        });
      }
    }

    // 3. First Frame Requirement
    if (reqs.firstFrameRequired && !profile.firstFrameSupported) {
      blockingIssues.push({
        type: 'first_frame_unsupported',
        field: 'generationRequirements.firstFrameRequired',
        message: `Engine "${profile.displayName}" cannot initialize from a precise first frame asset.`,
        required: true,
        supported: false
      });
    }

    // 4. Last Frame Requirement
    if (reqs.lastFrameRequired && !profile.lastFrameSupported) {
      blockingIssues.push({
        type: 'last_frame_unsupported',
        field: 'generationRequirements.lastFrameRequired',
        message: `Engine "${profile.displayName}" does not support tail frame continuity locking.`,
        required: true,
        supported: false
      });
    }

    // 5. Reference Image Capacity
    const refCount = (adSpec.assets || []).length;
    if (refCount > profile.maxReferenceImages) {
      blockingIssues.push({
        type: 'reference_count_exceeded',
        field: 'assets',
        message: `Ad requires ${refCount} reference assets, but ${profile.displayName} supports a maximum of ${profile.maxReferenceImages}.`,
        required: refCount,
        supported: profile.maxReferenceImages
      });
    }

    // 6. Native Audio Warnings
    if (reqs.audioRequired && !profile.nativeAudioSupported) {
      warnings.push({
        type: 'native_audio_unsupported',
        field: 'generationRequirements.audioRequired',
        message: `Engine "${profile.displayName}" does not generate native audio. Audio will be synthesized in downstream audio pass.`,
        required: true,
        supported: false
      });
    }

    const status: 'compatible' | 'warning' | 'incompatible' =
      blockingIssues.length > 0 ? 'incompatible' : warnings.length > 0 ? 'warning' : 'compatible';

    return {
      engineKey: profile.engineKey,
      status,
      blockingIssues,
      warnings,
      supportedFeatures: {
        maxDurationSeconds: profile.maxDurationSeconds,
        aspectRatioSupported: profile.supportedAspectRatios.includes(requestedAspect),
        firstFrameSupported: profile.firstFrameSupported,
        lastFrameSupported: profile.lastFrameSupported,
        nativeAudioSupported: profile.nativeAudioSupported,
        maxReferenceImages: profile.maxReferenceImages
      }
    };
  }
}

export const modelRegistryService = new ModelRegistryService();
