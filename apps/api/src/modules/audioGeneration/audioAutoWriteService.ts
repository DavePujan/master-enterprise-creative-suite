/**
 * Audio Auto-Write Creative Director Domain Service.
 * Produces structured, brand-aligned Audio Production Briefs separating:
 * - Brand Audio Concept
 * - Voiceover Script
 * - Voice Performance Direction
 * - Musical Soundtrack Direction
 */

import { getServerAI } from "../../infrastructure/gemini/serverGeminiClient.js";
import { creditService } from "../../services/creditService.js";
import { aiJobRepository } from "../../repositories/aiJobRepository.js";
import { workspaceRepository } from "../../repositories/workspaceRepository.js";
import { sanitizeTextOutput } from "../textGeneration/textOutputValidator.js";
import { AUDIO_CREDIT_POLICY, AUDIO_MODELS } from "./audioModelResolver.js";
import type {
  AudioAutoWriteRequest,
  AudioAutoWriteResponse,
  AudioAutoWriteIdea,
} from "../../../../../packages/types/audioAutoWrite.js";

export class AudioAutoWriteService {
  async generateAudioIdea(
    request: AudioAutoWriteRequest,
    authContext: { userId: string; workspaceId?: string }
  ): Promise<AudioAutoWriteResponse> {
    const { userId } = authContext;
    const workspaces = await workspaceRepository.getUserWorkspaces(userId);
    const workspaceId = authContext.workspaceId || workspaces?.[0]?.id;
    if (!workspaceId) {
      throw new Error("No authorized workspace resolved for user.");
    }

    const creditsToCharge = AUDIO_CREDIT_POLICY.autoWrite; // 1 credit
    const clientKey =
      request.idempotencyKey ||
      `audio_autowrite_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. Two-phase ACID Credit Reservation
    const holdResult = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: creditsToCharge,
      idempotencyKey: `hold_${clientKey}`,
      referenceId: clientKey,
      description: "Audio Auto-Write Production Brief",
    });

    if (!holdResult.success || !holdResult.holdId) {
      throw {
        statusCode: 402,
        code: "INSUFFICIENT_CREDITS",
        message: "Insufficient credits for Audio Auto-Write.",
        requiredCredits: creditsToCharge,
      };
    }

    const holdId = holdResult.holdId;
    let jobId: string | null = null;

    try {
      // 2. Log Generation Job
      const job = await aiJobRepository.createJob({
        workspaceId,
        requestedBy: userId,
        provider: "google-gemini",
        modelRequested: AUDIO_MODELS.script,
        operation: "audio-autowrite",
        creditsReserved: creditsToCharge,
        idempotencyKey: clientKey,
      });
      jobId = job?.id || null;

      // 3. System Instruction & JSON Schema Prompt
      const brand = request.brandContext;
      const systemInstruction = `You are an elite Audio Creative Director and Soundtrack Producer at a world-class advertising agency.
Your task is to generate a cohesive, brand-accurate Audio Production Brief based on the user's intent and brand guidelines.

OUTPUT FORMAT:
Return ONLY a valid, raw JSON object matching this schema:
{
  "conceptTitle": "Concise creative audio title",
  "angle": "Strategic audio concept angle (1 sentence)",
  "targetAudience": "Target listener demographic",
  "modeRecommendation": "voiceover" | "music" | "hybrid",
  "voiceoverScript": "A natural, compelling, speakable 35-50 word voiceover script with natural rhythm.",
  "voiceDirection": {
    "recommendedVoice": "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr" | "Aoede" | "Callirrhoe",
    "emotion": "Professional" | "Cheerful" | "Energetic" | "Calming" | "Dramatic" | "Authoritative",
    "pace": "normal" | "fast" | "deliberate",
    "accent": "e.g. Indian English, Hinglish, Neutral, British RP",
    "performanceNotes": "1 sentence on vocal delivery, warmth, and inflection"
  },
  "musicDirection": {
    "genre": "e.g. Cinematic Electronic, Ambient Corporate, Tropical Lofi, Modern Synthwave",
    "mood": "e.g. Uplifting, Focused, High-momentum, Elegant",
    "tempoBpm": 110,
    "instrumentation": ["e.g. Analog warm synths", "Subtle live percussion", "Acoustic piano"],
    "musicalBrief": "2-3 sentence structured music production prompt for Lyria 3.5 with timed intro, groove, and resolution."
  }
}
DO NOT wrap in Markdown code blocks. Return pure JSON only.`.trim();

      let brandContextStr = "";
      if (brand) {
        brandContextStr = `
BRAND GUIDELINES:
- Brand: ${brand.name}
- Industry: ${brand.industry}
- Tone: ${brand.tone}
- Pillars: ${brand.pillars?.join(", ") || "Innovation, Quality"}
- Target Audience: ${brand.targetAudience || "General demographic"}
- Region: ${brand.location || "Global"}
`.trim();
      }

      const userMessage = `
${brandContextStr}

USER CREATIVE INTENT:
<untrusted_user_intent>
${request.userIntent ? request.userIntent.trim() : "Audio campaign for our upcoming launch"}
</untrusted_user_intent>

ACTIVE MODE PREFERENCE: ${request.activeMode || "voiceover"}
TARGET LANGUAGE: ${request.targetLanguage || "English"}

Generate the complete structured Audio Production Brief now.
`.trim();

      // 4. Invoke Gemini Model
      const ai = getServerAI();
      const response = await ai.models.generateContent({
        model: AUDIO_MODELS.script,
        contents: userMessage,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const rawText = response.text?.trim() || "{}";
      const sanitized = sanitizeTextOutput(rawText);
      let parsed: AudioAutoWriteIdea;

      try {
        parsed = JSON.parse(sanitized);
      } catch (parseErr) {
        const matched = sanitized.match(/\{[\s\S]*\}/);
        if (matched) {
          parsed = JSON.parse(matched[0]);
        } else {
          throw new Error("Failed to parse audio auto-write JSON response.");
        }
      }

      // 5. Capture Credits & Complete Job
      const captureResult = await creditService.captureCredits(holdId, `capture_${holdId}`);
      if (jobId) {
        await aiJobRepository.completeJob({
          jobId,
          modelUsed: AUDIO_MODELS.script,
          creditsCharged: creditsToCharge,
          outputs: [],
        });
      }

      return {
        success: true,
        idea: parsed,
        modelUsed: AUDIO_MODELS.script,
        creditsCharged: creditsToCharge,
        newBalance: captureResult.newBalance,
      };
    } catch (err: any) {
      try {
        await creditService.releaseCredits(holdId, `Auto-Write failed: ${err?.message || "Unknown error"}`);
      } catch (rollbackErr) {
        console.error("Auto-write rollback warning:", rollbackErr);
      }
      if (jobId) {
        try {
          await aiJobRepository.failJob(jobId, "AUDIO_AUTOWRITE_FAILED", err?.message || "Audio Auto-write failed");
        } catch (jobErr) {
          console.error("Failed to fail job:", jobErr);
        }
      }
      throw err;
    }
  }
}

export const audioAutoWriteService = new AudioAutoWriteService();
