/**
 * Video Creative Planner (Auto-Write Video Director).
 * Generates structured cinematography plans, multi-shot sequences,
 * and engine recommendations from raw user ideas using Google Gemini.
 */

import { GoogleGenAI } from '@google/genai';
import {
  VideoPlan,
  VideoEngineKey,
  VideoProductTier,
  VideoAutoWriteRequest
} from '../../../../../packages/types/videoGeneration.js';
import { workspaceRepository } from '../../repositories/workspaceRepository.js';
import { creditService } from '../../services/creditService.js';
import { aiJobRepository } from '../../repositories/aiJobRepository.js';
import { sendInsufficientCreditsResponse } from '../billing/billingErrorUtils.js';

export type { VideoAutoWriteRequest };

export class VideoCreativePlanner {
  private getAI(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY for VideoCreativePlanner.');
    }
    return new GoogleGenAI({ apiKey });
  }

  async generatePlan(
    request: VideoAutoWriteRequest,
    authContext: { userId: string; workspaceId?: string }
  ): Promise<VideoPlan> {
    const { userId } = authContext;
    const workspaces = await workspaceRepository.getUserWorkspaces(userId);
    const workspaceId = authContext.workspaceId || workspaces?.[0]?.id;
    if (!workspaceId) {
      throw new Error('No authorized workspace resolved for user.');
    }

    const creditsToCharge = 1;
    const clientKey = request.idempotencyKey || `video_autowrite_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. Credit reservation (1 credit)
    const holdResult = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: creditsToCharge,
      idempotencyKey: `hold_${clientKey}`,
      referenceId: clientKey,
      description: 'Video Auto-Write Director Plan'
    });

    if (!holdResult.success || !holdResult.holdId) {
      const err: any = new Error('Insufficient credits for Video Auto-Write.');
      err.statusCode = 402;
      err.code = 'INSUFFICIENT_CREDITS';
      err.requiredCredits = creditsToCharge;
      err.availableCredits = holdResult.available ?? 0;
      throw err;
    }

    const holdId = holdResult.holdId;

    try {
      const ai = this.getAI();

      const promptText = `
You are an expert Hollywood AI Video Director and Commercial Cinematographer.
Develop an actionable, high-production-value video concept and shot-by-shot production plan based on this user input:
- Topic / Concept: ${request.topic}
- Tone / Style: ${request.creativeTone || 'cinematic, commercial, premium'}
- Platform / Format: ${request.platform || 'commercial'}
- Product Name: ${request.productName || 'N/A'}
- Target Audience: ${request.targetAudience || 'General'}

Return ONLY valid JSON matching this exact structure:
{
  "conceptTitle": "string",
  "creativeConcept": "string (2-3 sentences explaining the creative vision)",
  "cinematicPrompt": "string (complete visual prompt for generation)",
  "recommendedEngine": "google-omni" | "veo-pro" | "veo-fast" | "veo-lite" | "kling-v3" | "seedance-2",
  "recommendedProductTier": "fast" | "standard" | "pro" | "plus" | "cinematic",
  "recommendationReason": "string (Why this engine was selected)",
  "shotPlan": [
    {
      "id": "scene_1",
      "durationSeconds": 3,
      "timeRange": "0-3s",
      "description": "Opening visual hook description",
      "camera": "Wide establishing drone orbit",
      "subjectAction": "What the subject is doing",
      "audio": "Ambient sound / voice cue"
    },
    {
      "id": "scene_2",
      "durationSeconds": 3,
      "timeRange": "3-6s",
      "description": "Mid shot revealing key feature or emotional core",
      "camera": "Slow dolly push-in, shallow depth of field",
      "subjectAction": "Subject interaction",
      "audio": "Music swell / Foley cue"
    }
  ],
  "cameraDirection": "string (lighting & lens specifications)",
  "lightingDirection": "string",
  "subjectMotion": "string",
  "environmentMotion": "string",
  "audioDirection": "string",
  "dialogue": "string (optional dialogue lines)",
  "suggestedAspectRatio": "16:9" | "9:16" | "1:1",
  "suggestedDurationSeconds": 6,
  "constraints": ["string (e.g. no distorted anatomy, smooth dolly motion)"]
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: promptText }],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '';
      const plan: VideoPlan = JSON.parse(responseText);

      // Capture credits
      await creditService.captureCredits(holdId, `capture_${clientKey}`);

      return plan;
    } catch (err: any) {
      console.error('[VideoCreativePlanner] Generation error:', err);
      // Release credit hold on failure
      await creditService.releaseCredits(holdId, `Auto-Write failed: ${err?.message}`);
      throw err;
    }
  }
}

export const videoCreativePlanner = new VideoCreativePlanner();
