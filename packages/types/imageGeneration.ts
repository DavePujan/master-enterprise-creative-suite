/**
 * Pure Domain Definitions for Image Generation V2.
 * Documentation-driven canonical contracts for image models, capabilities, requests, and normalized results.
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type { BrandGuidelines } from './brand.js';

export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3";

export type ImageQualityTier = "fast" | "standard" | "premium";

/**
 * Rich capability status model.
 * Distinguishes between:
 * - native: Provider API natively exposes a dedicated parameter/schema
 * - application: Application layer implements feature (e.g. canvas logo compositor)
 * - reference: Model accepts input/reference image conditioning
 * - prompt: Feature is guided via structured prompt context (inspirational)
 * - unsupported: Neither provider nor application supports the feature
 */
export type CapabilityStatus =
  | "native"
  | "application"
  | "reference"
  | "prompt"
  | "unsupported";

export interface CapabilityDetail {
  status: CapabilityStatus;
  badgeLabel: string;        // Human-friendly label: "Provider Native", "Application Layer", "Reference Input", "Prompt Guided", "Unavailable"
  source: "provider-api" | "application" | "prompt-only" | "unsupported";
  reason: string;            // Machine and human verifiable rationale
  implementation: string;    // Technical implementation mechanism
  parameter?: string;        // Exact documented provider parameter if native/reference
}

export interface ImageModelCapabilities {
  aspectRatio: CapabilityDetail & { values: string[] };
  resolution: CapabilityDetail & { values?: string[] };
  logoOverlay: CapabilityDetail;
  faceReference: CapabilityDetail;
  productReference: CapabilityDetail;
  ingredients: CapabilityDetail;
  style: CapabilityDetail;
  generation: {
    textToImage: boolean;
    imageToImage: boolean;
    editing: boolean;
  };
  references: {
    supported: boolean;
    maxImages?: number;
    mechanism?: "image_url" | "image_urls" | "inlineData" | "none";
  };
  // Backward-compatible accessors for existing consumers
  aspectRatios: ImageAspectRatio[];
  supportsReferenceImages: boolean;
  supportsImageEditing: boolean;
  supportsLogoOverlay: boolean;
  supportsFaceReference: "supported" | "unsupported";
  supportsProductReference: "supported" | "inspirational" | "unsupported";
  supportsIngredientsInput: "supported" | "unsupported";
  supportedResolutions?: string[];
}

export interface ImageModelDefinition {
  key: string;               // Unique product key: 'fal-studio', 'flux-schnell', 'flux-pro', 'gemini-preview', 'nano-banana-2'
  provider: "fal" | "google";
  modelId: string;           // Real provider endpoint: 'openai/gpt-image-2', 'fal-ai/flux/schnell', 'fal-ai/flux/dev', 'gemini-2.5-flash-image', 'fal-ai/nano-banana-2'
  label: string;             // UI display label: 'Fal Studio', 'Fal FLUX Schnell', 'Fal FLUX Pro', 'Gemini Preview', 'Nano Banana 2'
  description: string;
  quality: ImageQualityTier;
  credits: number;           // User credits: 3, 2, 4, 2, 2 (strictly between 2 and 5)
  humanTouch: number;        // Human Touch points: 30, 20, 40, 20, 20
  capabilities: ImageModelCapabilities;
  status: "enabled" | "disabled" | "experimental" | "deprecated";
}

/**
 * Authoritative Canonical Image Model Registry.
 * Based directly on documented provider API schemas and verified application capabilities.
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
      aspectRatio: {
        status: "native",
        badgeLabel: "Provider Native",
        source: "provider-api",
        parameter: "size",
        values: ["1:1", "16:9", "9:16", "4:3"],
        reason: "Mapped directly to OpenAI GPT Image 2 size parameters (1024x1024, 1536x1024, 1024x1536)",
        implementation: "provider-size-mapping",
      },
      resolution: {
        status: "native",
        badgeLabel: "Provider Native",
        source: "provider-api",
        parameter: "size",
        values: ["1024x1024", "1536x1024", "1024x1536", "2048x1152"],
        reason: "Native resolution presets exposed via size and quality parameters",
        implementation: "provider-size",
      },
      logoOverlay: {
        status: "application",
        badgeLabel: "Application Layer",
        source: "application",
        reason: "Real vector/PNG logo is deterministically composited onto generated clean background by application layer",
        implementation: "canvas-deterministic-layer",
      },
      faceReference: {
        status: "unsupported",
        badgeLabel: "Unavailable",
        source: "unsupported",
        reason: "OpenAI GPT Image 2 endpoint does not expose facial identity conditioning parameters",
        implementation: "unsupported",
      },
      productReference: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Product attributes and materials are guided through structured prompt engineering",
        implementation: "prompt-context",
      },
      ingredients: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Ingredients list is injected into descriptive prompt context; no dedicated structured parameter exists",
        implementation: "prompt-context",
      },
      style: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Aesthetic styles are converted into structured lighting and camera directives in prompt",
        implementation: "prompt-context",
      },
      generation: {
        textToImage: true,
        imageToImage: false,
        editing: false,
      },
      references: {
        supported: false,
        mechanism: "none",
      },
      // Backward-compatible accessors
      aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
      supportsReferenceImages: false,
      supportsImageEditing: false,
      supportsLogoOverlay: true,
      supportsFaceReference: "unsupported",
      supportsProductReference: "inspirational",
      supportsIngredientsInput: "supported",
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
      aspectRatio: {
        status: "native",
        badgeLabel: "Provider Native",
        source: "provider-api",
        parameter: "image_size",
        values: ["1:1", "16:9", "9:16", "4:3"],
        reason: "Provider exposes image_size presets (square_hd, landscape_16_9, portrait_16_9, landscape_4_3)",
        implementation: "provider-image-size",
      },
      resolution: {
        status: "native",
        badgeLabel: "Provider Native",
        source: "provider-api",
        parameter: "image_size",
        values: ["square_hd", "landscape_16_9", "portrait_16_9", "landscape_4_3"],
        reason: "Fixed high-definition presets governed by image_size parameter",
        implementation: "provider-image-size",
      },
      logoOverlay: {
        status: "application",
        badgeLabel: "Application Layer",
        source: "application",
        reason: "Real vector/PNG logo is deterministically composited onto generated clean background by application layer",
        implementation: "canvas-deterministic-layer",
      },
      faceReference: {
        status: "unsupported",
        badgeLabel: "Unavailable",
        source: "unsupported",
        reason: "FLUX Schnell text-to-image endpoint does not accept reference images",
        implementation: "unsupported",
      },
      productReference: {
        status: "unsupported",
        badgeLabel: "Unavailable",
        source: "unsupported",
        reason: "FLUX Schnell text-to-image endpoint has no reference image input for product preservation",
        implementation: "unsupported",
      },
      ingredients: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Ingredients described in text prompt; no native structured ingredient schema exists",
        implementation: "prompt-context",
      },
      style: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Prompt controls visual treatment, atmosphere, and lighting",
        implementation: "prompt-context",
      },
      generation: {
        textToImage: true,
        imageToImage: false,
        editing: false,
      },
      references: {
        supported: false,
        mechanism: "none",
      },
      // Backward-compatible accessors
      aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
      supportsReferenceImages: false,
      supportsImageEditing: false,
      supportsLogoOverlay: true,
      supportsFaceReference: "unsupported",
      supportsProductReference: "unsupported",
      supportsIngredientsInput: "supported",
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
      aspectRatio: {
        status: "native",
        badgeLabel: "Provider Native",
        source: "provider-api",
        parameter: "image_size",
        values: ["1:1", "16:9", "9:16", "4:3"],
        reason: "Provider exposes image_size presets (square_hd, landscape_16_9, portrait_16_9, landscape_4_3)",
        implementation: "provider-image-size",
      },
      resolution: {
        status: "native",
        badgeLabel: "Provider Native",
        source: "provider-api",
        parameter: "image_size",
        values: ["square_hd", "landscape_16_9", "portrait_16_9", "landscape_4_3"],
        reason: "Fixed high-definition presets governed by image_size parameter",
        implementation: "provider-image-size",
      },
      logoOverlay: {
        status: "application",
        badgeLabel: "Application Layer",
        source: "application",
        reason: "Real vector/PNG logo is deterministically composited onto generated clean background by application layer",
        implementation: "canvas-deterministic-layer",
      },
      faceReference: {
        status: "unsupported",
        badgeLabel: "Unavailable",
        source: "unsupported",
        reason: "FLUX Dev Pro text-to-image endpoint does not expose facial identity conditioning parameters",
        implementation: "unsupported",
      },
      productReference: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Guided via descriptive prompt engineering; endpoint does not take image_urls",
        implementation: "prompt-context",
      },
      ingredients: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Ingredients described in text prompt; no native structured ingredient schema exists",
        implementation: "prompt-context",
      },
      style: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Prompt controls visual treatment, atmosphere, and lighting",
        implementation: "prompt-context",
      },
      generation: {
        textToImage: true,
        imageToImage: false,
        editing: false,
      },
      references: {
        supported: false,
        mechanism: "none",
      },
      // Backward-compatible accessors
      aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
      supportsReferenceImages: false,
      supportsImageEditing: false,
      supportsLogoOverlay: true,
      supportsFaceReference: "unsupported",
      supportsProductReference: "unsupported",
      supportsIngredientsInput: "supported",
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
      aspectRatio: {
        status: "native",
        badgeLabel: "Provider Native",
        source: "provider-api",
        parameter: "imageConfig.aspectRatio",
        values: ["1:1", "16:9", "9:16", "4:3"],
        reason: "Google GenAI API natively accepts imageConfig.aspectRatio parameter",
        implementation: "google-genai-image-config",
      },
      resolution: {
        status: "native",
        badgeLabel: "Provider Native",
        source: "provider-api",
        values: ["1024x1024"],
        reason: "Standard 1024-based preview resolution natively produced by Google GenAI",
        implementation: "google-genai-native",
      },
      logoOverlay: {
        status: "application",
        badgeLabel: "Application Layer",
        source: "application",
        reason: "Real vector/PNG logo is deterministically composited onto generated clean background by application layer",
        implementation: "canvas-deterministic-layer",
      },
      faceReference: {
        status: "unsupported",
        badgeLabel: "Unavailable",
        source: "unsupported",
        reason: "Multimodal Gemini image generation does not guarantee facial biometric identity preservation",
        implementation: "unsupported",
      },
      productReference: {
        status: "reference",
        badgeLabel: "Reference Input",
        source: "provider-api",
        parameter: "contents.parts.inlineData",
        reason: "Accepts multimodal reference image parts for visual conditioning and texture guidance",
        implementation: "multimodal-inline-data",
      },
      ingredients: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Ingredients described in text prompt; no native structured ingredient schema exists",
        implementation: "prompt-context",
      },
      style: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Prompt controls visual treatment, atmosphere, and lighting",
        implementation: "prompt-context",
      },
      generation: {
        textToImage: true,
        imageToImage: true,
        editing: false,
      },
      references: {
        supported: true,
        maxImages: 3,
        mechanism: "inlineData",
      },
      // Backward-compatible accessors
      aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
      supportsReferenceImages: true,
      supportsImageEditing: false,
      supportsLogoOverlay: true,
      supportsFaceReference: "unsupported",
      supportsProductReference: "inspirational",
      supportsIngredientsInput: "supported",
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
      aspectRatio: {
        status: "native",
        badgeLabel: "Provider Native",
        source: "provider-api",
        parameter: "aspect_ratio",
        values: ["1:1", "16:9", "9:16", "4:3", "21:9", "3:2", "5:4", "4:5", "3:4", "2:3"],
        reason: "Fal Nano Banana 2 natively exposes aspect_ratio enum parameter",
        implementation: "provider-aspect-ratio",
      },
      resolution: {
        status: "native",
        badgeLabel: "Provider Native",
        source: "provider-api",
        parameter: "resolution",
        values: ["0.5K", "1K", "2K", "4K"],
        reason: "Fal Nano Banana 2 natively exposes resolution enum parameter (0.5K, 1K, 2K, 4K)",
        implementation: "provider-resolution",
      },
      logoOverlay: {
        status: "application",
        badgeLabel: "Application Layer",
        source: "application",
        reason: "Real vector/PNG logo is deterministically composited onto generated clean background by application layer",
        implementation: "canvas-deterministic-layer",
      },
      faceReference: {
        status: "unsupported",
        badgeLabel: "Unavailable",
        source: "unsupported",
        reason: "Nano Banana 2 text-to-image endpoint does not expose facial identity conditioning parameters",
        implementation: "unsupported",
      },
      productReference: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Text prompt guides product appearance in standard text-to-image generation",
        implementation: "prompt-context",
      },
      ingredients: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Ingredients described in text prompt; no native structured ingredient schema exists",
        implementation: "prompt-context",
      },
      style: {
        status: "prompt",
        badgeLabel: "Prompt Guided",
        source: "prompt-only",
        reason: "Prompt controls visual treatment, atmosphere, and lighting",
        implementation: "prompt-context",
      },
      generation: {
        textToImage: true,
        imageToImage: false,
        editing: false,
      },
      references: {
        supported: false,
        mechanism: "none",
      },
      // Backward-compatible accessors
      aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
      supportsReferenceImages: false,
      supportsImageEditing: false,
      supportsLogoOverlay: true,
      supportsFaceReference: "unsupported",
      supportsProductReference: "inspirational",
      supportsIngredientsInput: "supported",
      supportedResolutions: ["0.5K", "1K", "2K", "4K"],
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
