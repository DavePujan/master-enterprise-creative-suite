/**
 * Shared domain contracts for Image Generation Auto-Write Creative Idea Engine.
 * Pure TypeScript definitions. No React, express, or SDK dependencies.
 */

import type { BrandGuidelines } from "./brand.js";
import type { ImageModelCapabilities } from "./imageGeneration.js";

export interface ImageAutoWriteImageConfig {
  aspectRatio: string;
  selectedModel: string;
  style?: string;
  bakeLogoOnGeneration: boolean;
  hasProductContext: boolean;
  productName?: string;
  hasFaceContext: boolean;
  faceName?: string;
  ingredients: string[];
}

export interface ImageAutoWriteContext {
  userIntent?: string;
  brandGuidelines: BrandGuidelines;
  imageConfig: ImageAutoWriteImageConfig;
  capabilities: ImageModelCapabilities;
}

export interface ImageAutoWriteVisualDirection {
  subject: string;
  composition: string;
  lighting: string;
  color: string;
  mood: string;
}

export interface ImageAutoWriteIdea {
  title: string;
  concept: string;
  prompt: string;
  negativePrompt?: string;
  visualDirection: ImageAutoWriteVisualDirection;
}

export interface ImageAutoWriteResponse {
  idea: ImageAutoWriteIdea;
}
