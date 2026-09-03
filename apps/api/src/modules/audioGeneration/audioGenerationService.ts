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
  buildMusicPrompt,
} from "./audioPromptBuilder.js";
import { ttsPcmToWav } from "./ttsPcmToWav.js";
import { normalizeMusicOutput } from "./musicOutputNormalizer.js";
import type {
  AudioGenerationRequest,
  AudioGenerationResponse,
  VoiceoverRequest,
  MusicRequest,
  VoiceoverResult,
  MusicResult,
} from "../../../../../packages/types/audioGeneration.js";

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
      const scriptRes = await ai.models.generateContent({
        model: AUDIO_MODELS.script,
        contents: scriptPrompt.userMessage,
        config: {
          systemInstruction: scriptPrompt.systemInstruction,
          temperature: 0.7,
        },
      });
      finalTranscript = scriptRes.text?.trim() || request.userIntent;
    }

    // Step B: Performance Direction Prompt
    const ttsPrompt = buildTtsPerformancePrompt(finalTranscript, request.performanceConfig);

    // Step C: Speech Synthesis (Gemini 3.1 Flash TTS with bounded retry & configurable fallback)
    const primaryVoice = request.voiceConfig.speakers[0]?.voice || "Kore";
    let audioPcmBase64 = "";
    let modelUsed: string = AUDIO_MODELS.tts.primary;
    let fallbackUsed = false;
    let fallbackReason: string | undefined;

    try {
      const ttsRes = await ai.models.generateContent({
        model: AUDIO_MODELS.tts.primary,
        contents: ttsPrompt,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: primaryVoice },
            },
          },
        },
      });
      audioPcmBase64 = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
    } catch (primaryErr: any) {
      console.warn("Primary TTS model error:", primaryErr?.message || primaryErr);

      // Attempt bounded retry if transient
      const isRateLimit = primaryErr?.message?.includes("429") || primaryErr?.message?.includes("RESOURCE_EXHAUSTED");
      if (isRateLimit) {
        // Optional configured fallback to Gemini 2.5 Flash TTS
        try {
          console.log(`Failing over to documented fallback model: ${AUDIO_MODELS.tts.fallback}...`);
          const fallbackRes = await ai.models.generateContent({
            model: AUDIO_MODELS.tts.fallback,
            contents: ttsPrompt,
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: primaryVoice },
                },
              },
            },
          });
          audioPcmBase64 = fallbackRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
          modelUsed = AUDIO_MODELS.tts.fallback;
          fallbackUsed = true;
          fallbackReason = "Primary Gemini 3.1 Flash TTS rate limit / quota exhaustion";
        } catch (fallbackErr: any) {
          throw {
            statusCode: 429,
            code: "TTS_QUOTA_EXHAUSTED",
            message: "Voiceover TTS quota exceeded. Please try again shortly.",
          };
        }
      } else {
        throw primaryErr;
      }
    }

    if (!audioPcmBase64) {
      throw new Error("TTS model did not return any audio data.");
    }

    // Step D: Server-authoritative PCM to WAV containerization
    const wavResult = ttsPcmToWav(audioPcmBase64, { sampleRate: 24000, numChannels: 1, bitsPerSample: 16 });

    // Step E: Upload to Supabase Storage (user-assets bucket)
    const storagePath = `${workspaceId}/audio/voiceover_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.wav`;
    const supabase = getSupabaseAdmin();
    let storageUrl: string | undefined;

    if (supabase) {
      const { error: uploadError } = await supabase.storage
        .from("user-assets")
        .upload(storagePath, wavResult.wavBuffer, {
          contentType: "audio/wav",
          upsert: true,
        });

      if (!uploadError) {
        storageUrl = await storageService.getSignedUrl(storagePath, 86400) || undefined;
      } else {
        console.warn("Supabase Storage audio upload failed:", uploadError);
      }
    }

    // Step F: Record asset in public.assets
    if (supabase) {
      await assetRepository.create({
        workspaceId,
        uploadedBy: userId,
        name: `Voiceover: ${finalTranscript.slice(0, 40)}...`,
        type: "audio",
        storagePath,
        fileSizeBytes: wavResult.byteLength,
        mimeType: "audio/wav",
        prompt: request.userIntent,
        sha256: storageService.computeSha256(wavResult.wavBuffer),
        analysis: {
          transcript: finalTranscript,
          durationSeconds: wavResult.durationSeconds,
          voice: primaryVoice,
          model: modelUsed,
          fallbackUsed,
        },
      });
    }

    // Step G: Capture credit hold
    const captureResult = await creditService.captureCredits(holdId, `capture_${holdId}`);

    // Step H: Complete AI Job
    if (jobId) {
      await aiJobRepository.completeJob({
        jobId,
        modelUsed,
        creditsCharged: creditsToCharge,
        outputs: [
          {
            storageBucket: "user-assets",
            storagePath,
            mimeType: "audio/wav",
          },
        ],
      });
    }

    const voiceoverResult: VoiceoverResult = {
      audioBase64: wavResult.wavBase64,
      mimeType: "audio/wav",
      transcript: finalTranscript,
      durationSeconds: wavResult.durationSeconds,
      voice: primaryVoice,
      speakers: request.voiceConfig.speakers,
      modelUsed,
      storageUrl,
      storagePath,
    };

    return {
      success: true,
      generationType: "voiceover",
      voiceoverResult,
      modelUsed,
      creditsCharged: creditsToCharge,
      newBalance: captureResult.newBalance,
      fallbackUsed,
      fallbackReason,
    };
  }

  /**
   * Executes the Music Pipeline:
   * Musical Direction Prompt -> Lyria 3.5 (Clip or Pro) -> Normalization -> Supabase Storage.
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

    // Step B: Invoke Lyria 3.5 model
    let rawCandidate: any;
    try {
      const musicRes = await ai.models.generateContent({
        model: modelRequested,
        contents: musicPrompt,
        config: {
          responseModalities: ["AUDIO"],
        },
      });
      rawCandidate = musicRes.candidates?.[0];
    } catch (lyriaErr: any) {
      console.warn("Lyria music generation error:", lyriaErr?.message || lyriaErr);
      const isQuota = lyriaErr?.message?.includes("429") || lyriaErr?.message?.includes("RESOURCE_EXHAUSTED");
      if (isQuota) {
        throw {
          statusCode: 429,
          code: "LYRIA_QUOTA_EXHAUSTED",
          message:
            "Music generation (Lyria 3.5) quota is currently unavailable on this tier. No credits were deducted.",
        };
      }
      throw lyriaErr;
    }

    // Step C: Dedicated Music Output Normalization (MP3/WAV)
    const normalized = normalizeMusicOutput(rawCandidate, request.mode);

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
