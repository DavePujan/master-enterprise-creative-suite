/**
 * Google Omni 1.1 Flash Provider Adapter.
 * Integrates directly with the Google Interactions API via @google/genai.
 * Supports conversational editing with previous_interaction_id, store=true, and delivery=uri.
 */

import { GoogleGenAI } from '@google/genai';
import { VideoGenerationRequest } from '../../../../../../packages/types/videoGeneration.js';
import { omniPayloadBuilder } from '../payloads/omniPayloadBuilder.js';

export interface ProviderSubmitResult {
  providerJobId: string;
  interactionId: string;
}

export interface ProviderCheckResult {
  status: 'queued' | 'generating_motion' | 'completed' | 'failed';
  progress?: number;
  videoUrl?: string;
  error?: string;
}

export class GoogleOmniProvider {
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
    const payload = await omniPayloadBuilder.build(request, workspaceId);

    console.log('[GoogleOmniProvider] Submitting interaction to gemini-omni-1.1-flash...');
    // Typecast to any because interactions API is dynamic in @google/genai
    const interaction = await (ai as any).interactions.create(payload);

    const interactionId = interaction?.id || interaction?.name;
    if (!interactionId) {
      throw new Error('Google Omni interaction creation returned no interaction ID.');
    }

    console.log(`[GoogleOmniProvider] Interaction created: ${interactionId}`);
    return {
      providerJobId: interactionId,
      interactionId
    };
  }

  async check(providerJobId: string): Promise<ProviderCheckResult> {
    const ai = this.getClient();
    try {
      const interaction = await (ai as any).interactions.get(providerJobId);
      const status = interaction?.status;

      if (status === 'completed' || status === 'done' || interaction?.done === true) {
        // Find video URI in outputs
        let videoUrl: string | undefined;
        const outputs = interaction?.outputs || interaction?.response?.outputs || [];

        for (const out of outputs) {
          if (out?.type === 'video' && out?.uri) {
            videoUrl = out.uri;
            break;
          }
          if (out?.video?.uri) {
            videoUrl = out.video.uri;
            break;
          }
          if (out?.media?.uri) {
            videoUrl = out.media.uri;
            break;
          }
        }

        // Check fallback properties
        if (!videoUrl && interaction?.response?.generatedVideos?.[0]?.video?.uri) {
          videoUrl = interaction.response.generatedVideos[0].video.uri;
        }

        if (videoUrl) {
          return { status: 'completed', videoUrl, progress: 100 };
        }

        return {
          status: 'failed',
          error: 'Omni completed interaction without video URI output.'
        };
      }

      if (status === 'failed' || status === 'error') {
        const errMsg = interaction?.error?.message || 'Omni interaction failed during generation.';
        return { status: 'failed', error: errMsg };
      }

      return {
        status: 'generating_motion',
        progress: interaction?.progress ? Math.round(interaction.progress * 100) : 50
      };
    } catch (err: any) {
      console.error(`[GoogleOmniProvider] Error checking interaction ${providerJobId}:`, err);
      return { status: 'failed', error: err?.message || 'Failed to poll Omni interaction.' };
    }
  }

  async cancel(providerJobId: string): Promise<boolean> {
    const ai = this.getClient();
    try {
      if (typeof (ai as any).interactions?.cancel === 'function') {
        await (ai as any).interactions.cancel(providerJobId);
        console.log(`[GoogleOmniProvider] Interaction ${providerJobId} cancelled upstream.`);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[GoogleOmniProvider] Failed to cancel interaction ${providerJobId}:`, err);
      return false;
    }
  }
}

export const googleOmniProvider = new GoogleOmniProvider();
