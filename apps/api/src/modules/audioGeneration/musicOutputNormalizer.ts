/**
 * Dedicated Music Output Normalizer for Lyria 3.5 Models.
 * Handles native MP3 (Clip & Pro) and native WAV (Pro).
 * Normalizes audio buffers, extracts lyrics, structural tags, and duration.
 * NEVER routes Lyria MP3 through the PCM-to-WAV containerizer.
 */

export interface NormalizedMusicOutput {
  audioBuffer: Buffer;
  audioBase64: string;
  mimeType: "audio/mp3" | "audio/wav";
  durationSeconds: number;
  lyrics?: string;
  structure?: string;
  metadata: Record<string, any>;
}

export function normalizeMusicOutput(
  rawCandidate: any,
  requestedMode: "clip" | "full-track"
): NormalizedMusicOutput {
  if (!rawCandidate) {
    throw new Error("No candidate returned by Lyria music model.");
  }

  const parts = rawCandidate.content?.parts || [];
  let audioBase64 = "";
  let mimeType: "audio/mp3" | "audio/wav" = "audio/mp3";
  let lyrics = "";
  let structure = "";

  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      audioBase64 = part.inlineData.data;
      if (part.inlineData.mimeType && part.inlineData.mimeType.includes("wav")) {
        mimeType = "audio/wav";
      } else {
        mimeType = "audio/mp3";
      }
    } else if (part.text) {
      const text = part.text.trim();
      if (text.toLowerCase().includes("verse") || text.toLowerCase().includes("chorus") || text.toLowerCase().includes("lyrics")) {
        lyrics = lyrics ? `${lyrics}\n${text}` : text;
      } else if (text.includes("[") && text.includes("]")) {
        structure = structure ? `${structure}\n${text}` : text;
      }
    }
  }

  if (!audioBase64) {
    throw new Error("Lyria response did not contain any valid audio data.");
  }

  const audioBuffer = Buffer.from(audioBase64, "base64");

  // Duration estimation: Lyria Clip is strictly 30s. For Pro, estimate based on audio byte size / bit rate or fallback to 90s
  let durationSeconds = requestedMode === "clip" ? 30 : 90;
  if (requestedMode === "full-track") {
    // 128 kbps MP3 ~ 16 KB/sec
    const estimated = Math.round(audioBuffer.length / 16000);
    if (estimated >= 15 && estimated <= 300) {
      durationSeconds = estimated;
    }
  }

  return {
    audioBuffer,
    audioBase64,
    mimeType,
    durationSeconds,
    lyrics: lyrics || undefined,
    structure: structure || undefined,
    metadata: {
      byteLength: audioBuffer.length,
      mode: requestedMode,
      finishReason: rawCandidate.finishReason,
    },
  };
}
