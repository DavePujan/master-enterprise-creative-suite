/**
 * Google Veo 3.1 Payload Builder.
 * Prepares parameters for @google/genai models.generateVideos.
 * Supports first frame, last frame interpolation, reference images (up to 3), and duration/aspect ratio formatting.
 */

import { VideoGenerationRequest } from '../../../../../../packages/types/videoGeneration.js';
import { videoAssetResolver } from '../videoAssetResolver.js';
import { VIDEO_CAPABILITIES } from '../videoCapabilityRegistry.js';

export interface VeoGenerateVideosPayload {
  model: string;
  prompt: string;
  image?: {
    imageBytes: string;
    mimeType: string;
  };
  config: {
    aspectRatio?: '16:9' | '9:16';
    durationSeconds?: number;
    resolution?: '720p' | '1080p' | '4k';
    lastFrame?: {
      imageBytes: string;
      mimeType: string;
    };
    referenceImages?: Array<{
      image: {
        imageBytes: string;
        mimeType: string;
      };
      referenceType?: string;
    }>;
    seed?: number;
  };
}

export class VeoPayloadBuilder {
  async build(request: VideoGenerationRequest, workspaceId: string): Promise<VeoGenerateVideosPayload> {
    const engineKey = request.selectedEngine || 'veo-fast';
    const capability = VIDEO_CAPABILITIES[engineKey] || VIDEO_CAPABILITIES['veo-fast'];
    const model = capability.modelId;

    // Aspect ratio: Veo supports 16:9 and 9:16
    let aspectRatio: '16:9' | '9:16' = '16:9';
    if (request.aspectRatio === '9:16') {
      aspectRatio = '9:16';
    }

    // Duration: default to capability default
    let durationSeconds: number = 5;
    if (typeof request.durationSeconds === 'number') {
      durationSeconds = request.durationSeconds;
    } else if (engineKey === 'veo-pro') {
      durationSeconds = 8;
    } else if (engineKey === 'veo-lite') {
      durationSeconds = 5;
    }

    // Resolution
    let resolution: '720p' | '1080p' | '4k' = '1080p';
    if (engineKey === 'veo-lite' || request.resolution === '720p') {
      resolution = '720p';
    } else if (request.resolution === '4k' && engineKey === 'veo-pro') {
      resolution = '4k';
    }

    const config: VeoGenerateVideosPayload['config'] = {
      aspectRatio,
      durationSeconds,
      resolution
    };

    if (request.seed !== undefined) {
      config.seed = request.seed;
    }

    // First frame conditioning
    let firstFrame: VeoGenerateVideosPayload['image'] | undefined;
    if (request.startFrameAssetId) {
      const resolved = await videoAssetResolver.resolveAsBuffer(request.startFrameAssetId, workspaceId);
      if (resolved?.buffer) {
        firstFrame = {
          imageBytes: resolved.buffer.toString('base64'),
          mimeType: resolved.mimeType
        };
      }
    }

    // Last frame interpolation (Veo Pro only)
    if (request.endFrameAssetId && capability.supportsLastFrame) {
      const resolved = await videoAssetResolver.resolveAsBuffer(request.endFrameAssetId, workspaceId);
      if (resolved?.buffer) {
        config.lastFrame = {
          imageBytes: resolved.buffer.toString('base64'),
          mimeType: resolved.mimeType
        };
      }
    }

    // Reference images (Veo Pro supports up to 3)
    if (request.references && capability.supportsReferenceImages) {
      const imageRefs = request.references.filter(r => r.type !== 'motion_video' && r.type !== 'audio').slice(0, 3);
      if (imageRefs.length > 0) {
        config.referenceImages = [];
        for (const ref of imageRefs) {
          const resolved = await videoAssetResolver.resolveAsBuffer(ref.assetId, workspaceId);
          if (resolved?.buffer) {
            config.referenceImages.push({
              image: {
                imageBytes: resolved.buffer.toString('base64'),
                mimeType: resolved.mimeType
              },
              referenceType: 'REFERENCE_TYPE_SUBJECT'
            });
          }
        }
      }
    }

    return {
      model,
      prompt: request.prompt.trim(),
      image: firstFrame,
      config
    };
  }
}

export const veoPayloadBuilder = new VeoPayloadBuilder();
