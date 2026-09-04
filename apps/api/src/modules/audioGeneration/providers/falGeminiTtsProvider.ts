/**
 * Fal.ai Production Provider Adapter for Gemini 3.1 Flash TTS.
 * Model: fal-ai/gemini-3.1-flash-tts
 * Supports: Single/Two-Speaker, 30 Gemini Voices, Style Instructions, Expressive Tags, Language Enums, MP3/WAV.
 * Implements strict SSRF protection, payload validation, and cost auditing ($0.05/1k chars).
 */

import { serverConfig } from "../../../config/env.js";
import type {
  VoiceProvider,
  VoiceProviderRequest,
  VoiceGenerationResult,
} from "./types.js";

// Documented fal.ai Gemini voices
export const FAL_GEMINI_VOICES = new Set([
  "Kore", "Puck", "Charon", "Fenrir", "Zephyr",
  "Aoede", "Callirrhoe", "Enceladus", "Iapetus", "Achird",
  "Algieba", "Alkalurops", "Alphecca", "Antares", "Bellatrix",
  "Canopus", "Capella", "Castor", "Epsilondraconis", "Gacrux",
  "Hadar", "Kausaustralis", "Mirach", "Muphrid", "Nunki",
  "Polars", "Procyon", "Rasalgethi", "Rigel", "Sadalsuud"
]);

// Map generic locale/language inputs to documented fal language_code enum values
export function mapToFalLanguageCode(language?: string, location?: string): string {
  if (!language) {
    return location?.toLowerCase().includes("india") ? "English (India)" : "English (US)";
  }
  const lower = language.toLowerCase();
  if (lower.includes("hindi")) return "Hindi (India)";
  if (lower.includes("gujarati")) return "Gujarati (India)";
  if (lower.includes("marathi")) return "Marathi (India)";
  if (lower.includes("tamil")) return "Tamil (India)";
  if (lower.includes("telugu")) return "Telugu (India)";
  if (lower.includes("kannada")) return "Kannada (India)";
  if (lower.includes("malayalam")) return "Malayalam (India)";
  if (lower.includes("punjabi")) return "Punjabi (India)";
  if (lower.includes("bengali")) return "Bengali (India)";
  if (lower.includes("urdu")) return "Urdu (Pakistan)";
  if (lower.includes("uk") || lower.includes("british")) return "English (UK)";
  if (lower.includes("india") || lower.includes("hinglish")) return "English (India)";
  if (lower.includes("spanish")) return "Spanish (Spain)";
  if (lower.includes("french")) return "French (France)";
  if (lower.includes("german")) return "German (Germany)";
  if (lower.includes("japanese")) return "Japanese (Japan)";
  if (lower.includes("korean")) return "Korean (South Korea)";
  if (lower.includes("chinese")) return "Mandarin Chinese (China)";
  return "English (US)";
}

export class FalGeminiTtsProvider implements VoiceProvider {
  readonly providerName = "fal" as const;
  readonly modelId = "fal-ai/gemini-3.1-flash-tts";
  private readonly endpoint = "https://fal.run/fal-ai/gemini-3.1-flash-tts";

  private getApiKey(): string {
    const key = serverConfig.falApiKey.trim();
    if (!key) {
      throw new Error("FAL_API_KEY is not configured on the server.");
    }
    return key;
  }

  /**
   * SSRF-safe downloader for audio media produced by fal.ai.
   */
  private async safeDownloadMedia(mediaUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
    let parsed: URL;
    try {
      parsed = new URL(mediaUrl);
    } catch {
      throw new Error("Invalid fal audio URL format.");
    }

    if (parsed.protocol !== "https:") {
      throw new Error(`SSRF blocked: Audio URL must use HTTPS, received: ${parsed.protocol}`);
    }

    const host = parsed.hostname.toLowerCase();
    const isAllowedHost =
      host === "fal.media" ||
      host.endsWith(".fal.media") ||
      host === "fal.run" ||
      host.endsWith(".fal.run");

    if (!isAllowedHost) {
      throw new Error(`SSRF blocked: Disallowed media domain '${host}'. Only fal.media domains are permitted.`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const res = await fetch(mediaUrl, {
        signal: controller.signal,
        headers: { Accept: "audio/*" },
      });

      if (!res.ok) {
        throw new Error(`Failed to download fal audio file (${res.status} ${res.statusText})`);
      }

      const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
      if (contentLength > 50 * 1024 * 1024) {
        throw new Error("Audio download exceeded maximum permitted size of 50MB.");
      }

      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      if (buffer.length > 50 * 1024 * 1024) {
        throw new Error("Audio buffer exceeded maximum permitted size of 50MB.");
      }

      const headerMime = res.headers.get("content-type") || "";
      let detectedMime = "audio/mpeg";
      if (headerMime.includes("wav") || buffer.slice(0, 4).toString("ascii") === "RIFF") {
        detectedMime = "audio/wav";
      } else if (headerMime.includes("ogg") || buffer.slice(0, 4).toString("ascii") === "OggS") {
        detectedMime = "audio/ogg";
      } else {
        detectedMime = "audio/mpeg";
      }

      return { buffer, mimeType: detectedMime };
    } finally {
      clearTimeout(timeout);
    }
  }

  async synthesize(request: VoiceProviderRequest): Promise<VoiceGenerationResult> {
    const apiKey = this.getApiKey();

    // 1. Validate speaker count
    const speakerCount = request.speakers?.length || 1;
    if (speakerCount > 2) {
      throw {
        statusCode: 400,
        code: "EXCESSIVE_SPEAKERS",
        message: "Gemini TTS supports a maximum of 2 speakers.",
      };
    }

    // 2. Validate voice enum
    const primaryVoice = request.speakers?.[0]?.voice || "Kore";
    if (!FAL_GEMINI_VOICES.has(primaryVoice)) {
      throw {
        statusCode: 400,
        code: "INVALID_VOICE",
        message: `Voice '${primaryVoice}' is not in the documented Gemini voice catalogue.`,
      };
    }

    // 3. Build style instructions (voice performance direction ONLY)
    const emotion = request.performance.emotion || "Professional";
    const pace = request.performance.pace || "normal";
    const accent = request.performance.accent || "natural";
    const style = request.performance.style || "polished commercial voiceover";
    const styleInstructions = `Tone: ${emotion}. Pace: ${pace}. Accent: ${accent}. Delivery style: ${style}.`;

    // 4. Build prompt (spoken transcript with optional expressive tags)
    let prompt = request.transcript.trim();

    // 5. Build fal request payload
    const falPayload: Record<string, unknown> = {
      prompt,
      style_instructions: styleInstructions,
      voice: primaryVoice,
      language_code: mapToFalLanguageCode(request.language, request.brandContext?.location),
      temperature: request.performance.emotion === "Dramatic" ? 1.0 : 0.9,
      output_format: request.outputFormat === "wav" ? "wav" : "mp3",
    };

    if (request.speakerMode === "two-speaker" && request.speakers.length === 2) {
      const speaker2Voice = request.speakers[1].voice;
      if (!FAL_GEMINI_VOICES.has(speaker2Voice)) {
        throw {
          statusCode: 400,
          code: "INVALID_VOICE",
          message: `Second speaker voice '${speaker2Voice}' is invalid.`,
        };
      }
      falPayload.speakers = [
        { speaker_id: request.speakers[0].name, voice: primaryVoice },
        { speaker_id: request.speakers[1].name, voice: speaker2Voice },
      ];
    }

    console.log(`[FalGeminiTtsProvider] Dispatching to ${this.endpoint} (voice: ${primaryVoice}, mode: ${request.speakerMode})...`);

    const submitRes = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(falPayload),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      const isTransient =
        submitRes.status === 429 ||
        submitRes.status >= 500 ||
        errText.includes("RESOURCE_EXHAUSTED") ||
        errText.includes("overloaded");

      throw {
        statusCode: submitRes.status,
        code: isTransient ? "FAL_TTS_TRANSIENT_ERROR" : "FAL_TTS_SUBMISSION_FAILED",
        message: `fal.ai Gemini TTS failed (${submitRes.status}): ${errText}`,
        isTransient,
      };
    }

    const resData = (await submitRes.json()) as any;
    const mediaUrl = resData.audio?.url;
    if (!mediaUrl || typeof mediaUrl !== "string") {
      throw new Error(`fal.ai response did not contain a valid audio.url: ${JSON.stringify(resData)}`);
    }

    // 6. Download media server-side with SSRF protection
    const { buffer: audioBytes, mimeType } = await this.safeDownloadMedia(mediaUrl);

    // 7. Calculate duration
    let durationSeconds = 5;
    if (mimeType === "audio/wav" && audioBytes.length > 44) {
      // 24kHz 16-bit mono = 48000 B/s
      durationSeconds = Math.round(((audioBytes.length - 44) / 48000) * 100) / 100;
    } else {
      // 128 kbps MP3 ~ 16,000 bytes/sec
      durationSeconds = Math.max(1, Math.round((audioBytes.length / 16000) * 10) / 10);
    }

    // 8. Calculate provider cost ($0.05 / 1000 characters)
    const charCount = request.transcript.length;
    const costUsd = Math.round((charCount / 1000) * 0.05 * 10000) / 10000;

    return {
      audio: {
        bytes: audioBytes,
        mimeType,
        durationSeconds,
      },
      provider: "fal",
      model: this.modelId,
      requestId: resData.request_id || undefined,
      voice: primaryVoice,
      language: falPayload.language_code as string,
      providerCost: {
        amount: costUsd,
        currency: "USD",
        billingUnit: "character",
      },
      metadata: {
        charCount,
        outputFormat: falPayload.output_format,
        originalFalUrl: mediaUrl,
      },
    };
  }
}

export const falGeminiTtsProvider = new FalGeminiTtsProvider();
