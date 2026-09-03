/**
 * Image Model Resolver.
 * Resolves application model keys to approved ImageModelDefinition records.
 * Rejects unapproved or disabled models to protect against arbitrary user endpoints.
 */

import {
  IMAGE_MODEL_DEFINITIONS,
  DEFAULT_IMAGE_MODEL_KEY,
  type ImageModelDefinition,
} from "@shared-types/imageGeneration.js";

export class ImageModelResolver {
  resolve(modelKey?: string | null): {
    model: ImageModelDefinition;
    error?: { status: number; message: string; code: string };
  } {
    const key = (modelKey || DEFAULT_IMAGE_MODEL_KEY).trim();

    const model = IMAGE_MODEL_DEFINITIONS.find(
      (m) =>
        m.key === key ||
        m.modelId === key ||
        m.label.toLowerCase() === key.toLowerCase()
    );

    if (!model) {
      return {
        model: IMAGE_MODEL_DEFINITIONS.find((m) => m.key === DEFAULT_IMAGE_MODEL_KEY)!,
        error: {
          status: 400,
          message: `Unknown or unapproved image model key: '${modelKey}'. Approved keys: ${IMAGE_MODEL_DEFINITIONS.map((m) => m.key).join(", ")}`,
          code: "INVALID_MODEL_KEY",
        },
      };
    }

    if (model.status === "disabled") {
      return {
        model,
        error: {
          status: 400,
          message: `Model '${model.label}' is currently disabled.`,
          code: "MODEL_DISABLED",
        },
      };
    }

    return { model };
  }

  getAvailableModels(): ImageModelDefinition[] {
    return IMAGE_MODEL_DEFINITIONS.filter((m) => m.status === "enabled" || m.status === "experimental");
  }
}

export const imageModelResolver = new ImageModelResolver();
