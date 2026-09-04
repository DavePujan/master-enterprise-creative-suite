/**
 * Production Audio Generation Domain Service.
 * Governs the entire generative audio lifecycle for:
 * 1. Voiceover (Scriptwriting + Gemini 3.1 Flash TTS + PCM→WAV Containerization)
 * 2. Music Generation (Lyria 3.5 Clip / Pro + MP3/WAV Normalization)
 *
 * Implements two-phase ACID credit accounting, Supabase Storage uploads,
 * asset catalog logging, and strict error rollbacks.
 */

import { getServerAI } from "../../infrastructure/gemini/serverGeminiClient.js";
import { getSupabaseAdmin } from "../../infrastructure/supabase/supabaseClient.js";
import { creditService } from "../../services/creditService.js";
import { aiJobRepository } from "../../repositories/aiJobRepository.js";
import { assetRepository } from "../../repositories/assetRepository.js";
import { workspaceRepository } from "../../repositories/workspaceRepository.js";
import { storageService } from "../../services/storageService.js";
import {
  AUDIO_MODELS,
  AUDIO_CREDIT_POLICY,
  resolveAudioCredits,
} from "./audioModelResolver.js";
import {
  buildScriptwriterPrompt,
  buildTtsPerformancePrompt,
  buildTTSInstructionPrompt,
  buildMusicPrompt,
} from "./audioPromptBuilder.js";
import { ttsPcmToWav } from "./ttsPcmToWav.js";
import { normalizeMusicOutput } from "./musicOutputNormalizer.js";
import { voiceProviderRouter } from "./providers/voiceProviderRouter.js";
import type {
  AudioGenerationRequest,
  AudioGenerationResponse,
  VoiceoverRequest,
  MusicRequest,
  VoiceoverResult,
  MusicResult,
} from "../../../../../packages/types/audioGeneration.js";

function isTransientError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err || "").toLowerCase();
  const status = err?.status || err?.statusCode || err?.code;
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    msg.includes("high demand") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed")
  );
}

export class AudioGenerationService {
  /**
   * Generates production audio (Voiceover or Music) with two-phase credit management.
   */
  async generateAudio(
    request: AudioGenerationRequest,
    authContext: { userId: string; workspaceId?: string }
  ): Promise<AudioGenerationResponse> {
    const { userId } = authContext;
    const workspaces = await workspaceRepository.getUserWorkspaces(userId);
    const workspaceId = authContext.workspaceId || workspaces?.[0]?.id;
    if (!workspaceId) {
      throw new Error("No authorized workspace resolved for user.");
    }

    // 1. Validation & Speaker Constraint Enforcement
    if (request.generationType === "voiceover") {
      const speakerCount = request.voiceConfig?.speakers?.length || 1;
      if (speakerCount > 2) {
        throw {
          statusCode: 400,
          code: "EXCESSIVE_SPEAKERS",
          message: "Gemini TTS supports a maximum of 2 speakers.",
        };
      }
    }

    // 2. Resolve Credits & Idempotency
    const creditsToCharge = resolveAudioCredits(
      request.generationType,
      request.generationType === "music" ? request.mode : undefined
    );
    const clientKey =
      request.idempotencyKey ||
      `audio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 3. Two-phase ACID Credit Reservation
    const holdResult = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: creditsToCharge,
      idempotencyKey: `hold_${clientKey}`,
      referenceId: clientKey,
      description: `Audio Studio (${request.generationType})`,
    });

    if (!holdResult.success || !holdResult.holdId) {
      throw {
        statusCode: 402,
        code: "INSUFFICIENT_CREDITS",
        message: `Insufficient credits to generate ${request.generationType}. Required: ${creditsToCharge}.`,
        requiredCredits: creditsToCharge,
      };
    }

    const holdId = holdResult.holdId;
    let jobId: string | null = null;

    try {
      if (request.generationType === "voiceover") {
        return await this.executeVoiceoverPipeline({
          request,
          workspaceId,
          userId,
          holdId,
          creditsToCharge,
          clientKey,
        });
      } else {
        return await this.executeMusicPipeline({
          request,
          workspaceId,
          userId,
          holdId,
          creditsToCharge,
          clientKey,
        });
      }
    } catch (pipelineErr: any) {
      // 4. Automatic Credit Rollback on Failure
      try {
        await creditService.releaseCredits(holdId, `Generation failed: ${pipelineErr?.message || "Unknown error"}`);
      } catch (rollbackErr) {
        console.error("Credit rollback warning:", rollbackErr);
      }
      if (jobId) {
        try {
          await aiJobRepository.failJob(jobId, "AUDIO_GENERATION_FAILED", pipelineErr?.message || "Audio generation failed");
        } catch (jobErr) {
          console.error("Failed to mark job as failed:", jobErr);
        }
      }
      throw pipelineErr;
    }
  }

  /**
   * Executes the Voiceover Pipeline:
   * Scriptwriting (Gemini 3.8 Flash) -> TTS (Gemini 3.1 Flash TTS) -> PCM->WAV -> Supabase Storage.
   */
  private async executeVoiceoverPipeline(params: {
    request: VoiceoverRequest;
    workspaceId: string;
    userId: string;
    holdId: string;
    creditsToCharge: number;
    clientKey: string;
  }): Promise<AudioGenerationResponse> {
    const { request, workspaceId, userId, holdId, creditsToCharge, clientKey } = params;
    const ai = getServerAI();

    // Log AI generation job
    const job = await aiJobRepository.createJob({
      workspaceId,
      requestedBy: userId,
      provider: "google-gemini",
      modelRequested: AUDIO_MODELS.tts.primary,
      operation: "voiceover-generation",
      creditsReserved: creditsToCharge,
      idempotencyKey: clientKey,
    });
    const jobId = job?.id || null;

    // Step A: Transcript resolution
    let finalTranscript = request.transcript?.trim() || "";
    if (!finalTranscript) {
      const scriptPrompt = buildScriptwriterPrompt(request);
      let scriptRes: any;
      const candidateModels = [
        AUDIO_MODELS.script,
        ...AUDIO_MODELS.scriptFallbacks,
      ];
      let lastScriptErr: any = null;
      for (const candidateModel of candidateModels) {
        try {
          console.log(`[AudioGenerationService] Scriptwriting with model: ${candidateModel}...`);
          scriptRes = await ai.models.generateContent({
            model: candidateModel,
            contents: scriptPrompt.userMessage,
            config: {
              systemInstruction: scriptPrompt.systemInstruction,
              temperature: 0.7,
            },
          });
          break;
        } catch (scriptErr: any) {
          lastScriptErr = scriptErr;
          if (isTransientError(scriptErr)) {
            console.warn(
              `[AudioGenerationService] Script model ${candidateModel} transient failure (${scriptErr?.status || scriptErr?.statusCode || "503/429"}): ${scriptErr?.message?.slice(0, 100)}. Failing over to next candidate...`
            );
            await new Promise((resolve) => setTimeout(resolve, 300));
            continue;
          }
          throw scriptErr;
        }
      }
      if (!scriptRes) {
        throw lastScriptErr || new Error("Failed to generate voiceover script from creative intent.");
      }
      finalTranscript = scriptRes.text?.trim() || request.userIntent;
    }

    // Step B & C: Speech Synthesis via VoiceProviderRouter
    // Deterministic hierarchy: Google Gemini 3.1 Flash TTS -> bounded retry -> fal.ai Gemini 3.1 Flash TTS -> graceful failure
    const { result: voiceResult, failoverState } = await voiceProviderRouter.synthesize({
      transcript: finalTranscript,
      speakers: request.voiceConfig.speakers,
      speakerMode: request.voiceConfig.speakerMode,
      performance: {
        emotion: request.performanceConfig?.emotion,
        pace: request.performanceConfig?.pace,
        accent: request.performanceConfig?.accent,
        style: request.performanceConfig?.style,
        tagsEnabled: request.performanceConfig?.tagsEnabled ?? true,
      },
      language: request.languageCode || (request.voiceConfig as any)?.targetLanguage || "English",
      brandContext: request.brandContext,
    });

    const isWav = voiceResult.audio.mimeType.includes("wav");
    const ext = isWav ? "wav" : "mp3";
    const audioMimeType = isWav ? "audio/wav" : "audio/mpeg";
    const audioBase64 = voiceResult.audio.bytes.toString("base64");

    // Step D: Upload to Supabase Storage (user-assets bucket)
    const storagePath = `${workspaceId}/audio/voiceover_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const supabase = getSupabaseAdmin();
    let storageUrl: string | undefined;

    if (supabase) {
      const { error: uploadError } = await supabase.storage
        .from("user-assets")
        .upload(storagePath, voiceResult.audio.bytes, {
          contentType: audioMimeType,
          upsert: true,
        });

      if (!uploadError) {
        storageUrl = (await storageService.getSignedUrl(storagePath, 86400)) || undefined;
      } else {
        console.warn("Supabase Storage audio upload failed:", uploadError);
      }
    }

    // Step E: Record asset in public.assets with full provider and failover audit metadata
    if (supabase) {
      await assetRepository.create({
        workspaceId,
        uploadedBy: userId,
        name: `Voiceover: ${finalTranscript.slice(0, 40)}...`,
        type: "audio",
        storagePath,
        fileSizeBytes: voiceResult.audio.bytes.length,
        mimeType: audioMimeType,
        prompt: request.userIntent,
        sha256: storageService.computeSha256(voiceResult.audio.bytes),
        analysis: {
          transcript: finalTranscript,
          durationSeconds: voiceResult.audio.durationSeconds,
          voice: voiceResult.voice,
          model: voiceResult.model,
          provider: voiceResult.provider,
          fallbackUsed: failoverState.fallbackUsed,
          failoverState,
          providerCost: voiceResult.providerCost,
        },
      });
    }

    // Step F: Capture single credit hold
    const captureResult = await creditService.captureCredits(holdId, `capture_${holdId}`);

    // Step G: Complete AI Job
    if (jobId) {
      await aiJobRepository.completeJob({
        jobId,
        modelUsed: voiceResult.model,
        creditsCharged: creditsToCharge,
        outputs: [
          {
            storageBucket: "user-assets",
            storagePath,
            mimeType: audioMimeType,
          },
        ],
      });
    }

    const voiceoverResult: VoiceoverResult = {
      audioBase64,
      mimeType: audioMimeType as any,
      transcript: finalTranscript,
      durationSeconds: voiceResult.audio.durationSeconds,
      voice: voiceResult.voice,
      speakers: request.voiceConfig.speakers,
      modelUsed: voiceResult.model,
      provider: voiceResult.provider,
      storageUrl,
      storagePath,
      failoverState,
      providerCost: voiceResult.providerCost,
    };

    return {
      success: true,
      generationType: "voiceover",
      voiceoverResult,
      modelUsed: voiceResult.model,
      creditsCharged: creditsToCharge,
      newBalance: captureResult.newBalance,
      fallbackUsed: failoverState.fallbackUsed,
      fallbackReason: failoverState.fallbackReason,
      failoverState,
    };
  }

  /**
   * Executes the Music Pipeline:
   * Musical Direction Prompt -> Lyria Interactions API (Clip or Pro) -> Normalization -> Supabase Storage.
   */
  private async executeMusicPipeline(params: {
    request: MusicRequest;
    workspaceId: string;
    userId: string;
    holdId: string;
    creditsToCharge: number;
    clientKey: string;
  }): Promise<AudioGenerationResponse> {
    const { request, workspaceId, userId, holdId, creditsToCharge, clientKey } = params;
    const ai = getServerAI();

    const modelRequested =
      request.mode === "full-track"
        ? AUDIO_MODELS.music.pro
        : AUDIO_MODELS.music.clip;

    // Log AI generation job
    const job = await aiJobRepository.createJob({
      workspaceId,
      requestedBy: userId,
      provider: "google-gemini",
      modelRequested,
      operation: "music-generation",
      creditsReserved: creditsToCharge,
      idempotencyKey: clientKey,
    });
    const jobId = job?.id || null;

    // Step A: Structured musical production prompt
    const musicPrompt = buildMusicPrompt(request);

    // Step B: Invoke Lyria model via Gemini Interactions API
    let rawResult: any;
    try {
      try {
        rawResult = await (ai as any).interactions.create({
          model: modelRequested,
          input: musicPrompt,
          response_format: { type: "audio" },
        });
      } catch (firstErr: any) {
        // Fallback between 3.5 and 3 aliases if 404
        const isNotFound =
          firstErr?.status === 404 ||
          firstErr?.statusCode === 404 ||
          firstErr?.message?.includes("not found");
        if (isNotFound) {
          const alternateModel = modelRequested.includes("3.5")
            ? modelRequested.replace("3.5", "3")
            : modelRequested.replace("lyria-3-", "lyria-3.5-");
          rawResult = await (ai as any).interactions.create({
            model: alternateModel,
            input: musicPrompt,
            response_format: { type: "audio" },
          });
        } else {
          throw firstErr;
        }
      }
    } catch (lyriaErr: any) {
      console.warn("Lyria music generation error:", lyriaErr?.message || lyriaErr);
      const isQuota =
        lyriaErr?.status === 429 ||
        lyriaErr?.statusCode === 429 ||
        lyriaErr?.message?.includes("429") ||
        lyriaErr?.message?.includes("RESOURCE_EXHAUSTED") ||
        lyriaErr?.message?.includes("Quota exceeded") ||
        lyriaErr?.message?.includes("limit: 0");
      if (isQuota) {
        throw {
          statusCode: 429,
          code: "LYRIA_QUOTA_UNAVAILABLE",
          message:
            "Music generation (Lyria) is currently blocked by Google provider zero-quota (limit: 0) on this tier. No credits were deducted.",
        };
      }
      throw lyriaErr;
    }

    // Step C: Dedicated Music Output Normalization (MP3/WAV)
    const normalized = normalizeMusicOutput(rawResult, request.mode);

    // Step D: Upload to Supabase Storage
    const ext = normalized.mimeType === "audio/wav" ? "wav" : "mp3";
    const storagePath = `${workspaceId}/audio/music_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const supabase = getSupabaseAdmin();
    let storageUrl: string | undefined;

    if (supabase) {
      const { error: uploadError } = await supabase.storage
        .from("user-assets")
        .upload(storagePath, normalized.audioBuffer, {
          contentType: normalized.mimeType,
          upsert: true,
        });

      if (!uploadError) {
        storageUrl = await storageService.getSignedUrl(storagePath, 86400) || undefined;
      }
    }

    // Step E: Record asset in public.assets
    if (supabase) {
      await assetRepository.create({
        workspaceId,
        uploadedBy: userId,
        name: `Music: ${request.genre || "Soundtrack"} (${request.mode})`,
        type: "audio",
        storagePath,
        fileSizeBytes: normalized.audioBuffer.length,
        mimeType: normalized.mimeType,
        prompt: request.prompt,
        sha256: storageService.computeSha256(normalized.audioBuffer),
        analysis: {
          mode: request.mode,
          genre: request.genre,
          mood: request.mood,
          tempoBpm: request.tempoBpm,
          durationSeconds: normalized.durationSeconds,
          model: modelRequested,
          lyrics: normalized.lyrics,
          structure: normalized.structure,
        },
      });
    }

    // Step F: Capture credit hold
    const captureResult = await creditService.captureCredits(holdId, `capture_${holdId}`);

    // Step G: Complete AI Job
    if (jobId) {
      await aiJobRepository.completeJob({
        jobId,
        modelUsed: modelRequested,
        creditsCharged: creditsToCharge,
        outputs: [
          {
            storageBucket: "user-assets",
            storagePath,
            mimeType: normalized.mimeType,
          },
        ],
      });
    }

    const musicResult: MusicResult = {
      audioBase64: normalized.audioBase64,
      mimeType: normalized.mimeType,
      mode: request.mode,
      durationSeconds: normalized.durationSeconds,
      lyrics: normalized.lyrics,
      structure: normalized.structure,
      modelUsed: modelRequested,
      storageUrl,
      storagePath,
    };

    return {
      success: true,
      generationType: "music",
      musicResult,
      modelUsed: modelRequested,
      creditsCharged: creditsToCharge,
      newBalance: captureResult.newBalance,
    };
  }
}

export const audioGenerationService = new AudioGenerationService();
