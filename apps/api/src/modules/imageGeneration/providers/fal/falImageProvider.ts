/**
 * Fal AI Production Image Provider.
 * Dispatches model-specific payloads to Fal AI queue endpoints, polls execution, and normalizes outputs.
 */

import { serverConfig } from "../../../../config/env.js";
import type {
  NormalizedImageRequest,
  ImageModelDefinition,
} from "@shared-types/imageGeneration.js";
import type { ImageProvider, ProviderExecutionResult, RawProviderImageOutput } from "../../types.js";
import { openAIGptImage2Builder } from "./payloadBuilders/openaiGptImage2Builder.js";
import { fluxBuilder } from "./payloadBuilders/fluxBuilder.js";
import { nanoBananaBuilder } from "./payloadBuilders/nanoBananaBuilder.js";

export class FalImageProvider implements ImageProvider {
  readonly providerName = "fal" as const;

  private resolveApiKey(): string {
    const key = serverConfig.falApiKey.trim();
    if (!key) {
      throw new Error("FAL_API_KEY environment variable is not configured on the server.");
    }
    return key;
  }

  private buildModelPayload(
    request: NormalizedImageRequest,
    model: ImageModelDefinition
  ): Record<string, unknown> {
    if (model.modelId === "openai/gpt-image-2") {
      return openAIGptImage2Builder.buildPayload(request, model) as unknown as Record<string, unknown>;
    }

    if (model.modelId.includes("flux")) {
      return fluxBuilder.buildPayload(request, model) as unknown as Record<string, unknown>;
    }

    if (model.modelId.includes("nano-banana")) {
      return nanoBananaBuilder.buildPayload(request, model) as unknown as Record<string, unknown>;
    }

    // Default fallback to flux builder
    return fluxBuilder.buildPayload(request, model) as unknown as Record<string, unknown>;
  }

  async generate(
    request: NormalizedImageRequest,
    model: ImageModelDefinition,
    _workspaceId: string
  ): Promise<ProviderExecutionResult> {
    const falKey = this.resolveApiKey();
    const startTime = Date.now();

    const payload = this.buildModelPayload(request, model);
    const falEndpoint = `https://queue.fal.run/${model.modelId}`;

    console.log(`[FalImageProvider] Submitting to ${falEndpoint} with payload keys:`, Object.keys(payload));

    const submitRes = await fetch(falEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${falKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      throw new Error(`Fal submission failed (${submitRes.status}): ${errText}`);
    }

    const queueData = await submitRes.json();
    const { status_url, response_url, request_id } = queueData;

    // If synchronous immediate response returned
    if (!status_url || !response_url) {
      if (queueData.images && queueData.images[0]?.url) {
        return {
          images: queueData.images.map((img: any) => ({
            url: img.url,
            mimeType: "image/png",
            width: img.width,
            height: img.height,
          })),
          providerRequestId: request_id,
          latencyMs: Date.now() - startTime,
        };
      }
      throw new Error(`Unexpected queue response structure from Fal: ${JSON.stringify(queueData)}`);
    }

    console.log(`[FalImageProvider] Polling request ${request_id}...`);

    let completed = false;
    let attempts = 0;
    const maxAttempts = 150; // 300s budget

    while (!completed && attempts < maxAttempts) {
      attempts++;
      await new Promise((r) => setTimeout(r, 2000));

      const statusRes = await fetch(status_url, {
        headers: { Authorization: `Key ${falKey}` },
      });

      if (!statusRes.ok) {
        console.warn(`[FalImageProvider] Polling attempt ${attempts} received status ${statusRes.status}. Retrying...`);
        continue;
      }

      const statusJson = await statusRes.json();
      const status = statusJson.status;

      if (status === "COMPLETED") {
        completed = true;
        break;
      } else if (status === "FAILED" || status === "CANCELLED") {
        throw new Error(`Fal generation failed in queue: ${statusJson.error || "Unknown error"}`);
      }
    }

    if (!completed) {
      throw new Error(`Fal generation timed out in queue after ${maxAttempts * 2}s`);
    }

    const finalRes = await fetch(response_url, {
      headers: { Authorization: `Key ${falKey}` },
    });

    if (!finalRes.ok) {
      const errText = await finalRes.text();
      throw new Error(`Failed to fetch Fal final response (${finalRes.status}): ${errText}`);
    }

    const finalJson = await finalRes.json();
    if (!finalJson.images || finalJson.images.length === 0 || !finalJson.images[0]?.url) {
      throw new Error("No images found in Fal response payload");
    }

    const rawOutputs: RawProviderImageOutput[] = finalJson.images.map((img: any) => ({
      url: img.url,
      mimeType: img.content_type || "image/png",
      width: img.width,
      height: img.height,
    }));

    return {
      images: rawOutputs,
      providerRequestId: request_id,
      latencyMs: Date.now() - startTime,
    };
  }
}

export const falImageProvider = new FalImageProvider();
