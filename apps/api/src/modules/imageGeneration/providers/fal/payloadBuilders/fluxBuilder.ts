/**
 * Payload Builder for FLUX models on fal.ai (FLUX Schnell and FLUX Dev Pro).
 * Handles model-specific num_inference_steps, guidance_scale, and image_size enums.
 */

import type { NormalizedImageRequest, ImageModelDefinition } from "@shared-types/imageGeneration.js";
import type { ImageProviderPayloadBuilder } from "../../../types.js";

export interface FluxPayload {
  prompt: string;
  image_size: "square_hd" | "landscape_16_9" | "portrait_16_9" | "landscape_4_3" | "portrait_4_3";
  num_inference_steps: number;
  guidance_scale?: number;
  seed?: number;
  num_images: number;
  enable_prompt_expansion?: boolean;
}

export class FluxBuilder implements ImageProviderPayloadBuilder<FluxPayload> {
  buildPayload(
    request: NormalizedImageRequest,
    model: ImageModelDefinition
  ): FluxPayload {
    let imageSize: FluxPayload["image_size"] = "square_hd";

    switch (request.aspectRatio) {
      case "16:9":
        imageSize = "landscape_16_9";
        break;
      case "9:16":
        imageSize = "portrait_16_9";
        break;
      case "4:3":
        imageSize = "landscape_4_3";
        break;
      case "1:1":
      default:
        imageSize = "square_hd";
        break;
    }

    const isSchnell = model.modelId.includes("schnell");

    const payload: FluxPayload = {
      prompt: request.prompt,
      image_size: imageSize,
      num_inference_steps: isSchnell ? 4 : 28,
      num_images: 1,
    };

    if (!isSchnell) {
      payload.guidance_scale = 3.5;
    } else {
      payload.enable_prompt_expansion = false;
    }

    if (request.seed !== undefined) {
      payload.seed = request.seed;
    }

    return payload;
  }
}

export const fluxBuilder = new FluxBuilder();
