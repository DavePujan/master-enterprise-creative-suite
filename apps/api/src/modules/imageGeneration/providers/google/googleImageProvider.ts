/**
 * Google Gemini Image Production Provider.
 * Dispatches normalized image generation requests to Google GenAI SDK.
 */

import { getServerAI } from "../../../../infrastructure/gemini/serverGeminiClient.js";
import type {
  NormalizedImageRequest,
  ImageModelDefinition,
} from "@shared-types/imageGeneration.js";
import type { ImageProvider, ProviderExecutionResult, RawProviderImageOutput } from "../../types.js";

export class GoogleImageProvider implements ImageProvider {
  readonly providerName = "google" as const;

  async generate(
    request: NormalizedImageRequest,
    model: ImageModelDefinition,
    _workspaceId: string
  ): Promise<ProviderExecutionResult> {
    const ai = getServerAI();
    const startTime = Date.now();

    const parts: any[] = [{ text: request.prompt }];

    // Handle reference images for Gemini if provided
    if (request.referenceImages && Array.isArray(request.referenceImages)) {
      for (const img of request.referenceImages) {
        if (img.startsWith("data:")) {
          const match = img.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        }
      }
    }

    console.log(`[GoogleImageProvider] Calling ${model.modelId} with aspect ratio ${request.aspectRatio}...`);

    const response = await ai.models.generateContent({
      model: model.modelId,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: request.aspectRatio as any,
        },
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts.find((p: any) => p.inlineData);
    if (!imagePart || !imagePart.inlineData?.data) {
      throw new Error("Google GenAI returned no image data in candidate output");
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const buffer = Buffer.from(imagePart.inlineData.data, "base64");

    const rawOutput: RawProviderImageOutput = {
      buffer,
      mimeType,
    };

    return {
      images: [rawOutput],
      latencyMs: Date.now() - startTime,
    };
  }
}

export const googleImageProvider = new GoogleImageProvider();
