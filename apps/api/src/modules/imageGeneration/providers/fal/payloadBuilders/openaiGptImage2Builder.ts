/**
 * Payload Builder for openai/gpt-image-2 on fal.ai.
 * Strictly adheres to model documentation: size, quality, prompt, num_images.
 * NEVER sends num_inference_steps or guidance_scale.
 */

import type { NormalizedImageRequest, ImageModelDefinition } from "@shared-types/imageGeneration.js";
import type { ImageProviderPayloadBuilder } from "../../../types.js";

export interface OpenAIGptImage2Payload {
  prompt: string;
  size: "1024x1024" | "1536x1024" | "1024x1536" | "2048x2048" | "2048x1152" | "1152x2048";
  quality: "medium" | "high";
  num_images: number;
}

export class OpenAIGptImage2Builder
  implements ImageProviderPayloadBuilder<OpenAIGptImage2Payload>
{
  buildPayload(
    request: NormalizedImageRequest,
    _model: ImageModelDefinition
  ): OpenAIGptImage2Payload {
    let size: OpenAIGptImage2Payload["size"] = "1024x1024";

    switch (request.aspectRatio) {
      case "16:9":
        size = "1536x1024";
        break;
      case "9:16":
        size = "1024x1536";
        break;
      case "4:3":
        size = "1536x1024";
        break;
      case "1:1":
      default:
        size = "1024x1024";
        break;
    }

    return {
      prompt: request.prompt,
      size,
      quality: request.quality === "premium" ? "high" : "medium",
      num_images: 1,
    };
  }
}

export const openAIGptImage2Builder = new OpenAIGptImage2Builder();
