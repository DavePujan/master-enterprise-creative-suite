/**
 * Google Gemini Primary TTS Provider Adapter.
 * Model: gemini-3.1-flash-tts-preview
 * Supports: Single/Two-Speaker, 30 Prebuilt Gemini Voices, Linear PCM extraction -> WAV containerization.
 */

import { getServerAI } from "../../../infrastructure/gemini/serverGeminiClient.js";
import { ttsPcmToWav } from "../ttsPcmToWav.js";
import { buildTTSInstructionPrompt } from "../audioPromptBuilder.js";
import type {
  VoiceProvider,
  VoiceProviderRequest,
  VoiceGenerationResult,
} from "./types.js";

export class GoogleTtsProvider implements VoiceProvider {
  readonly providerName = "google" as const;
  readonly modelId = "gemini-3.1-flash-tts-preview";

  async synthesize(request: VoiceProviderRequest): Promise<VoiceGenerationResult> {
    const ai = getServerAI();

    const speakerCount = request.speakers?.length || 1;
    if (speakerCount > 2) {
      throw {
        statusCode: 400,
        code: "EXCESSIVE_SPEAKERS",
        message: "Gemini TTS supports a maximum of 2 speakers.",
      };
    }

    const primaryVoice = request.speakers?.[0]?.voice || "Kore";
    const isTwoSpeaker = request.speakerMode === "two-speaker" && request.speakers?.length === 2;

    const speechConfig: any = isTwoSpeaker
      ? {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: request.speakers[0].name,
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: request.speakers[0].voice },
                },
              },
              {
                speaker: request.speakers[1].name,
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: request.speakers[1].voice },
                },
              },
            ],
          },
        }
      : {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: primaryVoice },
          },
        };

    const voiceConfigParam = {
      speakerMode: request.speakerMode,
      speakers: request.speakers,
      targetLanguage: request.language || "English",
    };

    const performanceConfigParam = {
      emotion: (request.performance.emotion as any) || "Professional",
      pace: (request.performance.pace as any) || "normal",
      accent: request.performance.accent || "natural",
      style: request.performance.style || "polished commercial voiceover",
      tagsEnabled: request.performance.tagsEnabled ?? true,
    };

    const ttsPrompt = buildTTSInstructionPrompt(
      request.transcript,
      voiceConfigParam as any,
      performanceConfigParam
    );

    console.log(`[GoogleTtsProvider] Calling ${this.modelId} (voice: ${primaryVoice}, mode: ${request.speakerMode})...`);

    const ttsRes = await ai.models.generateContent({
      model: this.modelId,
      contents: ttsPrompt,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig,
      },
    });

    const audioPcmBase64 = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
    if (!audioPcmBase64) {
      throw new Error(`Google TTS model ${this.modelId} did not return audio inline data.`);
    }

    // Convert raw 24kHz 16-bit linear PCM to standard WAV
    const wavResult = ttsPcmToWav(audioPcmBase64, {
      sampleRate: 24000,
      numChannels: 1,
      bitsPerSample: 16,
    });

    return {
      audio: {
        bytes: wavResult.wavBuffer,
        mimeType: "audio/wav",
        durationSeconds: wavResult.durationSeconds,
      },
      provider: "google",
      model: this.modelId,
      voice: primaryVoice,
      language: request.language || "English",
      metadata: {
        charCount: request.transcript.length,
        pcmByteLength: wavResult.byteLength,
        speakerCount,
      },
    };
  }
}

export const googleTtsProvider = new GoogleTtsProvider();
