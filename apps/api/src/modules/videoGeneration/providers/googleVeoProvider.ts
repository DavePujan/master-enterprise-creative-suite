/**
 * Google Veo 3.1 Provider Adapter.
 * Integrates with @google/genai models.generateVideos and operations.getVideosOperation.
 * Supports Veo Pro, Veo Fast, and Veo Lite.
 */

import { GoogleGenAI } from '@google/genai';
import { VideoGenerationRequest } from '../../../../../../packages/types/videoGeneration.js';
import { veoPayloadBuilder } from '../payloads/veoPayloadBuilder.js';
import { ProviderSubmitResult, ProviderCheckResult } from './googleOmniProvider.js';

export class GoogleVeoProvider {
  private ai: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
      if (!apiKey) {
        throw new Error('Google GenAI API Key is missing. Set GEMINI_API_KEY in environment.');
      }
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  async submit(request: VideoGenerationRequest, workspaceId: string): Promise<ProviderSubmitResult> {
    const ai = this.getClient();
    const payload = await veoPayloadBuilder.build(request, workspaceId);

    console.log(`[GoogleVeoProvider] Submitting video generation to ${payload.model}...`);
    const operation = await ai.models.generateVideos({
      model: payload.model,
      prompt: payload.prompt,
      image: payload.image,
      config: payload.config as any
    });

    const operationName = operation?.name;
    if (!operationName) {
      throw new Error('Google Veo generation returned no operation name.');
    }

    console.log(`[GoogleVeoProvider] Operation started: ${operationName}`);
    return {
      providerJobId: operationName,
      interactionId: operationName
    };
  }

  async check(providerJobId: string): Promise<ProviderCheckResult> {
    const ai = this.getClient();
    try {
      const operation = await ai.operations.getVideosOperation({
        operation: { name: providerJobId } as any
      });

      if (operation?.done) {
        if (operation?.error) {
          return {
            status: 'failed',
            error: String((operation.error as any)?.message || 'Veo video generation failed.')
          };
        }

        const generatedVideos = operation?.response?.generatedVideos;
        const videoUri = generatedVideos?.[0]?.video?.uri;

        if (videoUri) {
          return {
            status: 'completed',
            videoUrl: videoUri,
            progress: 100
          };
        }

        return {
          status: 'failed',
          error: 'Veo generation finished without video output URI.'
        };
      }

      return {
        status: 'generating_motion',
        progress: 50
      };
    } catch (err: any) {
      console.error(`[GoogleVeoProvider] Error polling operation ${providerJobId}:`, err);
      return {
        status: 'failed',
        error: err?.message || 'Failed to poll Veo operation.'
      };
    }
  }

  async cancel(providerJobId: string): Promise<boolean> {
    // Veo long-running operations do not expose a public cancel endpoint.
    console.log(`[GoogleVeoProvider] Upstream cancel not supported for Veo operation ${providerJobId}.`);
    return false;
  }
}

export const googleVeoProvider = new GoogleVeoProvider();
