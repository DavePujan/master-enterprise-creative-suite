/**
 * Video Request Capability Validator.
 * Enforces server-authoritative validation rules against declared engine capabilities.
 * Rejects impossible requests early before any external provider calls.
 */

import { VideoGenerationRequest, VideoEngineCapability } from '../../../../../packages/types/videoGeneration.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  field?: string;
}

export class VideoRequestValidator {
  validate(request: VideoGenerationRequest, capability: VideoEngineCapability): ValidationResult {
    // 1. Prompt validation
    if (!request.prompt || request.prompt.trim().length === 0) {
      if (request.mode !== 'image_to_video' || !request.startFrameAssetId) {
        return { valid: false, error: 'A creative prompt or start frame is required for video generation.', field: 'prompt' };
      }
    }

    // 2. Aspect Ratio
    if (request.aspectRatio && request.aspectRatio !== 'auto') {
      if (!capability.aspectRatios.includes(request.aspectRatio) && !capability.aspectRatios.includes('auto')) {
        return {
          valid: false,
          error: `Engine '${capability.displayName}' does not support aspect ratio ${request.aspectRatio}. Supported ratios: ${capability.aspectRatios.join(', ')}.`,
          field: 'aspectRatio'
        };
      }
    }

    // 3. Duration
    if (request.durationSeconds && request.durationSeconds !== 'auto') {
      const dur = typeof request.durationSeconds === 'number' ? request.durationSeconds : parseInt(request.durationSeconds, 10);
      const supportsDur = capability.supportedDurations.some(d => d === dur || d === 'auto');
      if (!supportsDur) {
        return {
          valid: false,
          error: `Engine '${capability.displayName}' does not support duration ${dur}s. Supported durations: ${capability.supportedDurations.join(', ')}s.`,
          field: 'durationSeconds'
        };
      }
    }

    // 4. Resolution
    if (request.resolution) {
      if (!capability.supportedResolutions.includes(request.resolution)) {
        return {
          valid: false,
          error: `Engine '${capability.displayName}' does not support resolution ${request.resolution}. Supported: ${capability.supportedResolutions.join(', ')}.`,
          field: 'resolution'
        };
      }
    }

    // 5. Start Frame
    if (request.startFrameAssetId && !capability.supportsFirstFrame && request.mode !== 'image_to_video') {
      return {
        valid: false,
        error: `Engine '${capability.displayName}' does not support start-frame conditioning.`,
        field: 'startFrameAssetId'
      };
    }

    // 6. End Frame
    if (request.endFrameAssetId && !capability.supportsLastFrame) {
      return {
        valid: false,
        error: `Engine '${capability.displayName}' does not support end-frame conditioning. Use Google Veo 3.1 Pro or Kling 3.0 Standard for interpolation.`,
        field: 'endFrameAssetId'
      };
    }

    // 7. References (Images, Videos, Audios)
    if (request.references && request.references.length > 0) {
      const imageRefs = request.references.filter(r => r.type !== 'motion_video' && r.type !== 'audio');
      const videoRefs = request.references.filter(r => r.type === 'motion_video');
      const audioRefs = request.references.filter(r => r.type === 'audio');

      if (imageRefs.length > capability.maxReferenceImages) {
        return {
          valid: false,
          error: `Engine '${capability.displayName}' supports up to ${capability.maxReferenceImages} image references, but ${imageRefs.length} were provided.`,
          field: 'references'
        };
      }

      if (videoRefs.length > capability.maxReferenceVideos) {
        return {
          valid: false,
          error: `Engine '${capability.displayName}' does not support video references (max: ${capability.maxReferenceVideos}). Use Seedance 2.0 for reference-to-video.`,
          field: 'references'
        };
      }

      if (audioRefs.length > capability.maxReferenceAudios) {
        return {
          valid: false,
          error: `Engine '${capability.displayName}' does not support audio references (max: ${capability.maxReferenceAudios}). Use Seedance 2.0 for reference-to-video.`,
          field: 'references'
        };
      }
    }

    // 8. Conversational Editing
    if (request.mode === 'edit_video' && !capability.supportsConversationalEditing) {
      return {
        valid: false,
        error: `Engine '${capability.displayName}' does not support conversational video editing. Use Google Omni 1.1 Flash for iterative edits.`,
        field: 'mode'
      };
    }

    return { valid: true };
  }
}

export const videoRequestValidator = new VideoRequestValidator();
