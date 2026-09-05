/**
 * fal Seedance 2.0 Payload Builder.
 * Prepares parameters for official ByteDance Seedance 2.0 endpoints on fal.ai:
 * - bytedance/seedance-2.0/reference-to-video
 * - bytedance/seedance-2.0/text-to-video
 */

import { VideoGenerationRequest } from '../../../../../../packages/types/videoGeneration.js';
import { videoAssetResolver } from '../videoAssetResolver.js';

export interface SeedancePayload {
  endpoint: 'bytedance/seedance-2.0/reference-to-video' | 'bytedance/seedance-2.0/text-to-video';
  input: {
    prompt: string;
    aspect_ratio?: string;
    duration?: number | 'auto';
    image_urls?: string[];
    video_urls?: string[];
    audio_urls?: string[];
    generate_audio?: boolean;
    seed?: number;
  };
}

export class SeedancePayloadBuilder {
  async build(request: VideoGenerationRequest, workspaceId: string): Promise<SeedancePayload> {
    const imageUrls: string[] = [];
    const videoUrls: string[] = [];
    const audioUrls: string[] = [];

    // If start frame provided, add as primary image reference
    if (request.startFrameAssetId) {
      const resolved = await videoAssetResolver.resolve(request.startFrameAssetId, workspaceId);
      if (resolved?.url) {
        imageUrls.push(resolved.url);
      }
    }

    // Resolve references
    if (request.references && request.references.length > 0) {
      for (const ref of request.references) {
        if (ref.type === 'motion_video') {
          if (videoUrls.length < 3) {
            const resolved = await videoAssetResolver.resolve(ref.assetId, workspaceId);
            if (resolved?.url) videoUrls.push(resolved.url);
          }
        } else if (ref.type === 'audio') {
          if (audioUrls.length < 3) {
            const resolved = await videoAssetResolver.resolve(ref.assetId, workspaceId);
            if (resolved?.url) audioUrls.push(resolved.url);
          }
        } else {
          if (imageUrls.length < 9) {
            const resolved = await videoAssetResolver.resolve(ref.assetId, workspaceId);
            if (resolved?.url) imageUrls.push(resolved.url);
          }
        }
      }
    }

    const hasReferences = imageUrls.length > 0 || videoUrls.length > 0 || audioUrls.length > 0;
    const endpoint: SeedancePayload['endpoint'] = hasReferences
      ? 'bytedance/seedance-2.0/reference-to-video'
      : 'bytedance/seedance-2.0/text-to-video';

    let duration: number | 'auto' = 5;
    if (request.durationSeconds === 'auto') {
      duration = 'auto';
    } else if (typeof request.durationSeconds === 'number') {
      duration = request.durationSeconds;
    }

    const input: SeedancePayload['input'] = {
      prompt: request.prompt.trim(),
      aspect_ratio: request.aspectRatio || '16:9',
      duration,
      generate_audio: request.generateAudio ?? (request.audioIntent !== 'none')
    };

    if (imageUrls.length > 0) input.image_urls = imageUrls;
    if (videoUrls.length > 0) input.video_urls = videoUrls;
    if (audioUrls.length > 0) input.audio_urls = audioUrls;
    if (request.seed !== undefined) input.seed = request.seed;

    return { endpoint, input };
  }
}

export const seedancePayloadBuilder = new SeedancePayloadBuilder();
