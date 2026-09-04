/**
 * Pure Domain Contracts for Audio Studio Auto-Write Creative Director.
 * Produces structured, modular briefs separating:
 * - Brand Audio Concept
 * - Voiceover Script
 * - Voice Direction (Performance & Voice Selection)
 * - Music Direction (Lyria Prompting)
 */

import type { BrandContextSnapshot } from "./textGeneration.js";
import type { OfficialGeminiVoice } from "./audioGeneration.js";

export interface AudioVoiceDirection {
  recommendedVoice: OfficialGeminiVoice;
  emotion: string;
  pace: string;
  accent: string;
  performanceNotes: string;
}

export interface AudioMusicDirection {
  genre: string;
  mood: string;
  tempoBpm: number;
  instrumentation: string[];
  musicalBrief: string;
}

export interface AudioAutoWriteIdea {
  conceptTitle: string;
  angle: string;
  targetAudience: string;
  modeRecommendation: "voiceover" | "music" | "hybrid";
  voiceoverScript: string;
  voiceDirection: AudioVoiceDirection;
  musicDirection: AudioMusicDirection;
}

export interface AudioAutoWriteRequest {
  userIntent: string;
  brandContext?: BrandContextSnapshot;
  activeMode?: "voiceover" | "music";
  targetLanguage?: string;
  idempotencyKey?: string;
}

export interface AudioAutoWriteResponse {
  success: boolean;
  idea: AudioAutoWriteIdea;
  modelUsed: string;
  creditsCharged: number;
  newBalance?: number;
}
