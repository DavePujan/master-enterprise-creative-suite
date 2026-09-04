/**
 * Client-side Service for Voiceover & Audio Studio.
 * Interfaces with /api/audio/generate and /api/audio/autowrite.
 */

import { apiClient } from "../../../infrastructure/api/apiClient.js";
import type {
  AudioGenerationRequest,
  AudioGenerationResponse,
} from "../../../../../../packages/types/audioGeneration.js";
import type {
  AudioAutoWriteRequest,
  AudioAutoWriteResponse,
} from "../../../../../../packages/types/audioAutoWrite.js";

export async function generateAudio(
  request: AudioGenerationRequest
): Promise<AudioGenerationResponse> {
  return await apiClient.post<AudioGenerationResponse>(
    "/api/audio/generate",
    request
  );
}

export async function generateAudioAutoWriteIdea(
  request: AudioAutoWriteRequest
): Promise<AudioAutoWriteResponse> {
  return await apiClient.post<AudioAutoWriteResponse>(
    "/api/audio/autowrite",
    request
  );
}
