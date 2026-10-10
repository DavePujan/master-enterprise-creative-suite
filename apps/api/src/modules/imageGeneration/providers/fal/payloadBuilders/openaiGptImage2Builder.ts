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
  image_urls?: string[];
  image_url?: string;
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

    // Collect reference image URLs
    const refUrls: string[] = [];
    if (request.referenceImages && Array.isArray(request.referenceImages)) {
      for (const url of request.referenceImages) {
        if (url && typeof url === "string" && !refUrls.includes(url)) {
          refUrls.push(url);
        }
      }
    }

    if (request.references && Array.isArray(request.references)) {
      for (const ref of request.references) {
        if (ref.source.kind === "url" && ref.source.url && !refUrls.includes(ref.source.url)) {
          refUrls.push(ref.source.url);
        }
      }
    }

    let promptText = request.prompt;
    if (refUrls.length > 0) {
      const preserveDirective = "Use the uploaded product reference exactly. Preserve: - packaging - logo - proportions - label - colors.";
      if (!promptText.includes("Preserve:")) {
        promptText = `${preserveDirective}\n\n${promptText}`;
      }
    }

    const payload: OpenAIGptImage2Payload = {
      prompt: promptText,
      size,
      quality: request.quality === "premium" ? "high" : "medium",
      num_images: 1,
    };

    if (refUrls.length > 0) {
      payload.image_urls = refUrls.slice(0, 3);
      payload.image_url = refUrls[0];
    }

    return payload;
  }
}

export const openAIGptImage2Builder = new OpenAIGptImage2Builder();

