/**
 * fal Kling V3 Payload Builder.
 * Prepares parameters for official Kling V3 standard endpoints on fal.ai:
 * - fal-ai/kling-video/v3/standard/text-to-video
 * - fal-ai/kling-video/v3/standard/image-to-video
 */

import { VideoGenerationRequest } from '../../../../../../packages/types/videoGeneration.js';
import { videoAssetResolver } from '../videoAssetResolver.js';

export interface KlingPayload {
  endpoint: 'fal-ai/kling-video/v3/standard/text-to-video' | 'fal-ai/kling-video/v3/standard/image-to-video';
  input: {
    prompt: string;
    duration?: '5' | '10';
    aspect_ratio?: '16:9' | '9:16' | '1:1';
    image_url?: string;
    end_image_url?: string;
    generate_audio?: boolean;
    elements?: Array<{
      image_url: string;
    }>;
    shots?: Array<{
      prompt: string;
      duration: number;
    }>;
  };
}

export class KlingPayloadBuilder {
  async build(request: VideoGenerationRequest, workspaceId: string): Promise<KlingPayload> {
    let endpoint: KlingPayload['endpoint'] = 'fal-ai/kling-video/v3/standard/text-to-video';
    let startImageUrl: string | undefined;
    let endImageUrl: string | undefined;

    // Resolve start frame if available
    if (request.startFrameAssetId) {
      const resolved = await videoAssetResolver.resolve(request.startFrameAssetId, workspaceId);
      if (resolved?.url) {
        startImageUrl = resolved.url;
        endpoint = 'fal-ai/kling-video/v3/standard/image-to-video';
      }
    }

    // Resolve end frame if available
    if (request.endFrameAssetId) {
      const resolved = await videoAssetResolver.resolve(request.endFrameAssetId, workspaceId);
      if (resolved?.url) {
        endImageUrl = resolved.url;
      }
    }

    // Aspect ratio
    let aspectRatio: '16:9' | '9:16' | '1:1' = '16:9';
    if (request.aspectRatio === '9:16' || request.aspectRatio === '1:1') {
      aspectRatio = request.aspectRatio;
    }

    // Duration: Kling V3 uses '5' or '10'
    let duration: '5' | '10' = '5';
    if (request.durationSeconds === 10 || request.durationSeconds === 15) {
      duration = '10';
    }

    // Elements mapping
    const elements: Array<{ image_url: string }> = [];
    if (request.references && request.references.length > 0) {
      const imageRefs = request.references.filter(r => r.type !== 'motion_video' && r.type !== 'audio');
      for (const ref of imageRefs.slice(0, 4)) {
        const resolved = await videoAssetResolver.resolve(ref.assetId, workspaceId);
        if (resolved?.url) {
          elements.push({ image_url: resolved.url });
        }
      }
    }

    // Multi-shot sequence
    let shots: Array<{ prompt: string; duration: number }> | undefined;
    if (request.scenes && request.scenes.length > 1) {
      shots = request.scenes.map(s => ({
        prompt: `${s.description}. Camera: ${s.camera}. Action: ${s.subjectAction}.`,
        duration: s.durationSeconds || 3
      }));
    }

    const input: KlingPayload['input'] = {
      prompt: request.prompt.trim(),
      duration,
      aspect_ratio: aspectRatio,
      generate_audio: request.generateAudio ?? (request.audioIntent !== 'none')
    };

    if (startImageUrl) input.image_url = startImageUrl;
    if (endImageUrl) input.end_image_url = endImageUrl;
    if (elements.length > 0) input.elements = elements;
    if (shots && shots.length > 0) input.shots = shots;

    return { endpoint, input };
  }
}

export const klingPayloadBuilder = new KlingPayloadBuilder();
