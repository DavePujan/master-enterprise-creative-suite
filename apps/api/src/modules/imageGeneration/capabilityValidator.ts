/**
 * Capability Validator for Image Generation.
 * Validates requested features against the resolved model's declared capabilities.
 * Strictly adheres to rule: Never silently ignore an unsupported capability.
 */

import type {
  NormalizedImageRequest,
  ImageModelDefinition,
} from "@shared-types/imageGeneration.js";

export interface CapabilityValidationResult {
  valid: boolean;
  error?: {
    status: number;
    message: string;
    code: string;
  };
}

export class CapabilityValidator {
  validate(
    request: NormalizedImageRequest,
    model: ImageModelDefinition
  ): CapabilityValidationResult {
    const { capabilities } = model;

    // 1. Validate Aspect Ratio
    const allowedRatios = capabilities.aspectRatio?.values || capabilities.aspectRatios;
    if (!allowedRatios.includes(request.aspectRatio)) {
      return {
        valid: false,
        error: {
          status: 400,
          message: `Aspect ratio '${request.aspectRatio}' is not supported by model '${model.label}'. Supported ratios: ${allowedRatios.join(", ")}`,
          code: "UNSUPPORTED_ASPECT_RATIO",
        },
      };
    }

    // 2. Validate Face Reference
    if (request.faceReference?.enabled) {
      const faceStatus = capabilities.faceReference?.status;
      if (faceStatus === "unsupported" || capabilities.supportsFaceReference === "unsupported") {
        return {
          valid: false,
          error: {
            status: 400,
            message: `Face reference is unavailable for model '${model.label}' (${capabilities.faceReference?.reason || "Endpoint does not accept reference images"}).`,
            code: "UNSUPPORTED_FACE_REFERENCE",
          },
        };
      }
    }

    // 3. Validate Product Placement / Preservation
    if (request.productReference?.enabled) {
      const prodStatus = capabilities.productReference?.status;
      if (prodStatus === "unsupported" || capabilities.supportsProductReference === "unsupported") {
        return {
          valid: false,
          error: {
            status: 400,
            message: `Product reference is unavailable for model '${model.label}' (${capabilities.productReference?.reason || "Endpoint does not accept reference images"}).`,
            code: "UNSUPPORTED_PRODUCT_REFERENCE",
          },
        };
      }
    }

    // 4. Validate Ingredients Input
    if (request.ingredients && request.ingredients.length > 0) {
      const ingStatus = capabilities.ingredients?.status;
      if (ingStatus === "unsupported" || capabilities.supportsIngredientsInput === "unsupported") {
        return {
          valid: false,
          error: {
            status: 400,
            message: `Ingredients input is unavailable for model '${model.label}'.`,
            code: "UNSUPPORTED_INGREDIENTS",
          },
        };
      }
    }

    return { valid: true };
  }
}

export const capabilityValidator = new CapabilityValidator();
