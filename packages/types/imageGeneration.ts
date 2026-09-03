/**
 * Pure Domain Definitions for Image Generation V2.
 * Canonical contracts for image models, capabilities, requests, and normalized results.
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type { BrandGuidelines } from './brand.js';

export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3";

export type ImageQualityTier = "fast" | "standard" | "premium";

export type ImageCapabilityStatus = "supported" | "unsupported" | "inspirational";

export interface ImageModelCapabilities {
  aspectRatios: ImageAspectRatio[];
  supportsReferenceImages: boolean;
  supportsImageEditing: boolean;
  supportsLogoOverlay: boolean; // Application-level deterministic logo layer
  supportsFaceReference: "supported" | "unsupported";
  supportsProductReference: "supported" | "inspirational" | "unsupported";
  supportsIngredientsInput: "supported" | "unsupported";
  supportedResolutions?: string[];
}

export interface ImageModelDefinition {
  key: string;               // Unique product key: 'fal-studio', 'flux-schnell', 'flux-pro', 'gemini-preview', 'nano-banana-2'
  provider: "fal" | "google";
  modelId: string;           // Real provider endpoint: 'openai/gpt-image-2', 'fal-ai/flux/schnell', 'fal-ai/flux/dev', 'gemini-2.5-flash-image', 'fal-ai/nano-banana-2'
  label: string;             // UI display label: 'Fal Studio', 'Fal FLUX Schnell', 'Fal FLUX Pro', 'Gemini Preview'
  description: string;
  quality: ImageQualityTier;
  credits: number;           // User credits: 3, 2, 4, 2
  humanTouch: number;        // Human Touch points: 30, 20, 40, 20
  capabilities: ImageModelCapabilities;
  status: "enabled" | "disabled" | "experimental" | "deprecated";
}

/**
 * Authoritative Canonical Image Model Registry.
 * Single source of truth driving UI capability pills, backend validation, and payload routing.
 */
export const IMAGE_MODEL_DEFINITIONS: ImageModelDefinition[] = [
  {
    key: "fal-studio",
    provider: "fal",
    modelId: "openai/gpt-image-2",
    label: "Fal Studio",
    description: "Commercial grade high-fidelity visual engine",
    quality: "standard",
    credits: 3,
    humanTouch: 30,
    status: "enabled",
    capabilities: {
      aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
      supportsReferenceImages: true,
      supportsImageEditing: true,
      supportsLogoOverlay: true,
      supportsFaceReference: "unsupported",
      supportsProductReference: "inspirational",
      supportsIngredientsInput: "unsupported",
      supportedResolutions: ["1024x1024", "1536x1024", "1024x1536", "2048x1152"],
    },
  },
  {
    key: "flux-schnell",
    provider: "fal",
    modelId: "fal-ai/flux/schnell",
    label: "Fal FLUX Schnell",
    description: "Ultra-fast photorealistic visual composition",
    quality: "fast",
    credits: 2,
    humanTouch: 20,
    status: "enabled",
    capabilities: {
      aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
      supportsReferenceImages: false,
      supportsImageEditing: false,
      supportsLogoOverlay: true,
      supportsFaceReference: "unsupported",
      supportsProductReference: "unsupported",
      supportsIngredientsInput: "unsupported",
      supportedResolutions: ["square_hd", "landscape_16_9", "portrait_16_9", "landscape_4_3"],
    },
  },
  {
    key: "flux-pro",
    provider: "fal",
    modelId: "fal-ai/flux/dev",
    label: "Fal FLUX Pro",
    description: "High-detail commercial advertising rendering",
    quality: "premium",
    credits: 4,
    humanTouch: 40,
    status: "enabled",
    capabilities: {
      aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
      supportsReferenceImages: false,
      supportsImageEditing: false,
      supportsLogoOverlay: true,
      supportsFaceReference: "unsupported",
      supportsProductReference: "unsupported",
      supportsIngredientsInput: "unsupported",
      supportedResolutions: ["square_hd", "landscape_16_9", "portrait_16_9", "landscape_4_3"],
    },
  },
  {
    key: "gemini-preview",
    provider: "google",
    modelId: "gemini-2.5-flash-image",
    label: "Gemini Preview",
    description: "Standard preview draft generator",
    quality: "fast",
    credits: 2,
    humanTouch: 20,
    status: "enabled",
    capabilities: {
      aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
      supportsReferenceImages: true,
      supportsImageEditing: false,
      supportsLogoOverlay: true,
      supportsFaceReference: "unsupported",
      supportsProductReference: "inspirational",
      supportsIngredientsInput: "unsupported",
    },
  },
  {
    key: "nano-banana-2",
    provider: "fal",
    modelId: "fal-ai/nano-banana-2",
    label: "Nano Banana 2",
    description: "Next-gen creative diffusion engine with web grounding",
    quality: "fast",
    credits: 2,
    humanTouch: 20,
    status: "enabled",
    capabilities: {
      aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
      supportsReferenceImages: true,
      supportsImageEditing: true,
      supportsLogoOverlay: true,
      supportsFaceReference: "unsupported",
      supportsProductReference: "inspirational",
      supportsIngredientsInput: "unsupported",
    },
  },
];

export const DEFAULT_IMAGE_MODEL_KEY = "fal-studio";

/**
 * Resolves an ImageModelDefinition from either its application key or provider modelId.
 */
export function resolveImageModel(keyOrId?: string | null): ImageModelDefinition {
  if (!keyOrId) {
    return IMAGE_MODEL_DEFINITIONS.find((m) => m.key === DEFAULT_IMAGE_MODEL_KEY)!;
  }

  const normalized = keyOrId.trim();
  const match = IMAGE_MODEL_DEFINITIONS.find(
    (m) => m.key === normalized || m.modelId === normalized || m.label.toLowerCase() === normalized.toLowerCase()
  );

  return match || IMAGE_MODEL_DEFINITIONS.find((m) => m.key === DEFAULT_IMAGE_MODEL_KEY)!;
}

/**
 * Retrieves the capabilities for a model key or model ID.
 */
export function getImageModelCapabilities(keyOrId?: string | null): ImageModelCapabilities {
  return resolveImageModel(keyOrId).capabilities;
}

/**
 * Normalized Image Generation Request.
 * Pure application-level request representing user intent without provider-specific syntax.
 */
export interface NormalizedImageRequest {
  prompt: string;
  aspectRatio: ImageAspectRatio;
  modelKey: string;
  quality?: ImageQualityTier;
  style?: string;
  resolution?: string;
  logo?: {
    enabled: boolean;
    bakeLogo: boolean;
    assetId?: string;
    url?: string;
  };
  faceReference?: {
    enabled: boolean;
    assetId?: string;
    url?: string;
    data?: string;
  };
  productReference?: {
    enabled: boolean;
    assetId?: string;
    url?: string;
    data?: string;
  };
  ingredients?: Array<{
    id?: string;
    name: string;
    url?: string;
    data?: string;
  }>;
  referenceImages?: string[];
  guidelines?: BrandGuidelines;
  numImages?: number;
  seed?: number;
}

/**
 * Normalized Image Generation Result.
 * Standardized output format returned to the caller regardless of provider.
 */
export interface NormalizedImageResult {
  images: Array<{
    url: string;             // Ephemeral signed URL or direct asset URL
    storagePath: string;     // Permanent Supabase Storage path
    assetId: string;         // UUID in public.assets table
    width?: number;
    height?: number;
    mimeType?: string;
  }>;
  provider: "fal" | "google";
  model: string;             // Real provider model ID
  modelKey: string;          // Application model key
  requestId?: string;        // Provider queue request ID
  creditsCharged: number;
  newBalance?: number;
  metadata?: {
    aspectRatio?: ImageAspectRatio;
    resolution?: string;
    seed?: number;
    latencyMs?: number;
  };
}
