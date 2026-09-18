/**
 * Model Capability Validator for Ad Director Plans.
 * Evaluates whether a target video engine can satisfy the physical and creative requirements
 * of a given shot (framing, durations, aspect ratios, first/last frame, reference images, audio).
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type {
  DirectorShot,
  DirectorPlan,
  CapabilityValidationResult
} from '@shared-types/adDirector.js';
import type { VideoEngineCapability } from '@shared-types/videoGeneration.js';

export function validateShotCapabilities(
  shot: DirectorShot,
  plan: Pick<DirectorPlan, 'aspectRatio'>,
  capability: VideoEngineCapability
): CapabilityValidationResult {
  const blockers: string[] = [];
  const adaptationsRequired: string[] = [];

  if (!shot) {
    return {
      compatible: false,
      blockers: ['Shot object is required for capability validation'],
      adaptationsRequired: []
    };
  }

  if (!capability) {
    return {
      compatible: false,
      blockers: ['Target engine capability specification is missing or undefined'],
      adaptationsRequired: []
    };
  }

  // 1. Aspect Ratio compatibility
  const targetAspectRatio = plan?.aspectRatio || '16:9';
  if (capability.aspectRatios && capability.aspectRatios.length > 0) {
    if (!capability.aspectRatios.includes(targetAspectRatio)) {
      blockers.push(
        `Engine "${capability.displayName || capability.engineKey}" does not support aspect ratio "${targetAspectRatio}". Supported: ${capability.aspectRatios.join(', ')}`
      );
    }
  }

  // 2. Duration compatibility
  const shotDuration = shot.timing?.duration;
  if (typeof shotDuration === 'number' && capability.supportedDurations && capability.supportedDurations.length > 0) {
    const isAutoSupported = capability.supportedDurations.includes('auto');
    const numericDurations = capability.supportedDurations.filter((d): d is number => typeof d === 'number');

    if (!isAutoSupported && numericDurations.length > 0) {
      const exactMatch = numericDurations.includes(shotDuration);
      if (!exactMatch) {
        const closest = numericDurations.reduce((prev, curr) =>
          Math.abs(curr - shotDuration) < Math.abs(prev - shotDuration) ? curr : prev
        );
        adaptationsRequired.push(
          `Shot duration of ${shotDuration}s must be adapted to closest supported duration (${closest}s) for engine "${capability.displayName || capability.engineKey}".`
        );
      }
    }
  }

  // 3. First Frame / Image-to-Video
  if (shot.intendedCapabilities?.requiresFirstFrame && !capability.supportsFirstFrame) {
    blockers.push(
      `Shot "${shot.id}" requires first-frame keyframe anchoring, but engine "${capability.displayName || capability.engineKey}" does not support first-frame conditioning.`
    );
  }

  // 4. Last Frame conditioning
  if (shot.intendedCapabilities?.requiresLastFrame && !capability.supportsLastFrame) {
    blockers.push(
      `Shot "${shot.id}" requires last-frame conditioning, but engine "${capability.displayName || capability.engineKey}" does not support last-frame guidance.`
    );
  }

  // 5. Reference Media capacity
  const visualRefCount = shot.visualReferences?.length || 0;
  if (visualRefCount > 0) {
    if (!capability.supportsReferenceImages) {
      blockers.push(
        `Shot "${shot.id}" specifies ${visualRefCount} reference assets, but engine "${capability.displayName || capability.engineKey}" does not support reference images.`
      );
    } else if (visualRefCount > capability.maxReferenceImages) {
      blockers.push(
        `Shot "${shot.id}" specifies ${visualRefCount} reference assets, exceeding engine maximum of ${capability.maxReferenceImages}.`
      );
    }
  }

  // 6. Audio Generation
  const requiresAudio = shot.intendedCapabilities?.requiresNativeAudio ||
    (shot.executionSpec?.audio && shot.executionSpec.audio.audioIntent !== 'silent');

  if (requiresAudio && !capability.supportsAudio) {
    adaptationsRequired.push(
      `Shot "${shot.id}" specifies audio intent ("${shot.executionSpec?.audio?.audioIntent || 'native'}"), but engine "${capability.displayName || capability.engineKey}" produces video-only. Audio will need separate synthesis.`
    );
  }

  return {
    compatible: blockers.length === 0,
    blockers,
    adaptationsRequired,
    recommendedEngineKey: capability.engineKey
  };
}
