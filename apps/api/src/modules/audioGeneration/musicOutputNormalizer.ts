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

  let audioBase64 = "";
  let mimeType: "audio/mp3" | "audio/wav" = "audio/mp3";
  let lyrics = "";
  let structure = "";

  // 1. Interleaved Steps Parsing (Gemini Interactions API)
  if (Array.isArray(rawCandidate.steps)) {
    for (const step of rawCandidate.steps) {
      const items = Array.isArray(step.content) ? step.content : [];
      for (const item of items) {
        if (item.type === "audio" && item.data) {
          audioBase64 = item.data;
          if (item.mime_type && item.mime_type.includes("wav")) {
            mimeType = "audio/wav";
          }
        } else if (item.type === "text" && item.text) {
          const text = item.text.trim();
          if (text.toLowerCase().includes("structure") || (text.includes("[") && text.includes("]") && (text.toLowerCase().includes("intro") || text.toLowerCase().includes("outro") || text.toLowerCase().includes("bridge") || text.toLowerCase().includes("drop")))) {
            structure = structure ? `${structure}\n${text}` : text;
          } else if (text.toLowerCase().includes("verse") || text.toLowerCase().includes("chorus") || text.toLowerCase().includes("lyrics")) {
            lyrics = lyrics ? `${lyrics}\n${text}` : text;
          } else if (text.includes("[") && text.includes("]")) {
            structure = structure ? `${structure}\n${text}` : text;
          }
        }
      }
    }
  }

  // 2. Legacy Outputs Array (Interactions API legacy envelope)
  if (!audioBase64 && Array.isArray(rawCandidate.outputs)) {
    for (const item of rawCandidate.outputs) {
      if (item.type === "audio" && item.data) {
        audioBase64 = item.data;
        if (item.mime_type && item.mime_type.includes("wav")) {
          mimeType = "audio/wav";
        }
      } else if (item.type === "text" && item.text) {
        const text = item.text.trim();
        if (text.toLowerCase().includes("verse") || text.toLowerCase().includes("chorus") || text.toLowerCase().includes("lyrics")) {
          lyrics = lyrics ? `${lyrics}\n${text}` : text;
        } else if (text.includes("[") && text.includes("]")) {
          structure = structure ? `${structure}\n${text}` : text;
        }
      }
    }
  }

  // 3. Direct Convenience Properties (Interactions API output_audio / output_text)
  if (!audioBase64 && rawCandidate.output_audio?.data) {
    audioBase64 = rawCandidate.output_audio.data;
    if (rawCandidate.output_audio.mime_type && rawCandidate.output_audio.mime_type.includes("wav")) {
      mimeType = "audio/wav";
    }
  }
  if (!lyrics && !structure && rawCandidate.output_text) {
    const text = rawCandidate.output_text.trim();
    if (text.toLowerCase().includes("verse") || text.toLowerCase().includes("chorus") || text.toLowerCase().includes("lyrics")) {
      lyrics = text;
    } else if (text.includes("[") && text.includes("]")) {
      structure = text;
    }
  }

  // 4. GenerateContent Candidates Format (content.parts)
  if (!audioBase64 && rawCandidate.content?.parts) {
    const parts = rawCandidate.content.parts;
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        audioBase64 = part.inlineData.data;
        if (part.inlineData.mimeType && part.inlineData.mimeType.includes("wav")) {
          mimeType = "audio/wav";
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
  }

  if (!audioBase64) {
    throw new Error("Lyria response did not contain any valid audio data.");
  }

  const audioBuffer = Buffer.from(audioBase64, "base64");

  // Format Auto-Detection via Binary Magic Header (detect RIFF for WAV)
  if (audioBuffer.length >= 4 && audioBuffer.slice(0, 4).toString("ascii") === "RIFF") {
    mimeType = "audio/wav";
  }

  // Duration estimation: Lyria Clip is strictly 30s. For Pro, estimate based on byte size / bit rate or fallback to 90s
  let durationSeconds = requestedMode === "clip" ? 30 : 90;
  if (requestedMode === "full-track") {
    if (mimeType === "audio/wav") {
      // 44.1kHz 16-bit stereo ~ 176,400 bytes/sec
      const estimated = Math.round(audioBuffer.length / 176400);
      if (estimated >= 15 && estimated <= 300) {
        durationSeconds = estimated;
      }
    } else {
      // 128 kbps MP3 ~ 16,000 bytes/sec
      const estimated = Math.round(audioBuffer.length / 16000);
      if (estimated >= 15 && estimated <= 300) {
        durationSeconds = estimated;
      }
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
      finishReason: rawCandidate.finishReason || (rawCandidate.status ? `interaction_${rawCandidate.status}` : undefined),
    },
  };
}
