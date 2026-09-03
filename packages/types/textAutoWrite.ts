/**
 * Pure domain definitions for Text & Caption Auto-Write.
 * Framework-free: MUST NOT import React, Firebase, Express, or vendor SDKs.
 */

import type { BrandContextSnapshot } from "./textGeneration.js";

export type CaptionEmotion =
  | "Neutral"
  | "Cheerful"
  | "Energetic"
  | "Professional"
  | "Calming";

export type CaptionPlatform =
  | "Instagram"
  | "LinkedIn"
  | "X"
  | "Threads"
  | "Facebook";

export interface CaptionPlatformOutput {
  platform: string;
  hook: string;
  body: string;
  cta?: string;
  hashtags: string[];
}

export interface TextAutoWriteConcept {
  angle: string;
  coreMessage: string;
  emotionalTone: CaptionEmotion;
  targetAudience: string;
  keyBenefit: string;
}

export interface TextAutoWriteIdea {
  concept: TextAutoWriteConcept;
  formattedCopy: string;
  captions: CaptionPlatformOutput[];
}

export interface TextAutoWriteRequest {
  userIntent: string;
  brandContext?: BrandContextSnapshot;
  emotion?: CaptionEmotion;
  quality?: "standard" | "premium";
  productContext?: {
    id?: string;
    name: string;
    details?: string;
  };
  targetLanguage?: string;
  platforms?: string[];
  idempotencyKey?: string;
}

export interface TextAutoWriteResponse {
  success: boolean;
  idea: TextAutoWriteIdea;
  modelUsed: string;
  creditsCharged: number;
  newBalance?: number;
}
