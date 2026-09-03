/**
 * Payload Builder for Nano Banana 2 on fal.ai.
 * Strictly adheres to model documentation: aspect_ratio, output_format, seed.
 */

import type { NormalizedImageRequest, ImageModelDefinition } from "@shared-types/imageGeneration.js";
import type { ImageProviderPayloadBuilder } from "../../../types.js";

export interface NanoBananaPayload {
  prompt: string;
  aspect_ratio: "1:1" | "16:9" | "9:16" | "4:3";
  output_format: "png" | "jpeg";
  num_images: number;
  seed?: number;
}

export class NanoBananaBuilder
  implements ImageProviderPayloadBuilder<NanoBananaPayload>
{
  buildPayload(
    request: NormalizedImageRequest,
    _model: ImageModelDefinition
  ): NanoBananaPayload {
    const payload: NanoBananaPayload = {
      prompt: request.prompt,
      aspect_ratio: request.aspectRatio,
      output_format: "png",
      num_images: 1,
    };

    if (request.seed !== undefined) {
      payload.seed = request.seed;
    }

    return payload;
  }
}

export const nanoBananaBuilder = new NanoBananaBuilder();
