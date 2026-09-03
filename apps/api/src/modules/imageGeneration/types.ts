/**
 * Internal Types and Interfaces for Image Generation Engine.
 */

import type {
  NormalizedImageRequest,
  NormalizedImageResult,
  ImageModelDefinition,
} from "@shared-types/imageGeneration.js";

export interface RawProviderImageOutput {
  buffer?: Buffer;
  url?: string;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface ProviderExecutionResult {
  images: RawProviderImageOutput[];
  providerRequestId?: string;
  latencyMs: number;
}

export interface ImageProvider {
  readonly providerName: "fal" | "google";
  generate(
    request: NormalizedImageRequest,
    model: ImageModelDefinition,
    workspaceId: string
  ): Promise<ProviderExecutionResult>;
}

export interface ImageProviderPayloadBuilder<T> {
  buildPayload(request: NormalizedImageRequest, model: ImageModelDefinition): T;
}
