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
    if (!capabilities.aspectRatios.includes(request.aspectRatio)) {
      return {
        valid: false,
        error: {
          status: 400,
          message: `Aspect ratio '${request.aspectRatio}' is not supported by model '${model.label}'. Supported ratios: ${capabilities.aspectRatios.join(", ")}`,
          code: "UNSUPPORTED_ASPECT_RATIO",
        },
      };
    }

    // 2. Validate Face Reference
    if (request.faceReference?.enabled) {
      if (capabilities.supportsFaceReference === "unsupported") {
        return {
          valid: false,
          error: {
            status: 400,
            message: `Face reference is not supported by model '${model.label}'.`,
            code: "UNSUPPORTED_FACE_REFERENCE",
          },
        };
      }
    }

    // 3. Validate Product Placement / Preservation
    if (request.productReference?.enabled) {
      if (capabilities.supportsProductReference === "unsupported") {
        return {
          valid: false,
          error: {
            status: 400,
            message: `Product reference is not supported by model '${model.label}'.`,
            code: "UNSUPPORTED_PRODUCT_REFERENCE",
          },
        };
      }
    }

    // 4. Validate Ingredients Input
    if (request.ingredients && request.ingredients.length > 0) {
      if (capabilities.supportsIngredientsInput === "unsupported") {
        return {
          valid: false,
          error: {
            status: 400,
            message: `Ingredients input is not supported by model '${model.label}'.`,
            code: "UNSUPPORTED_INGREDIENTS",
          },
        };
      }
    }

    return { valid: true };
  }
}

export const capabilityValidator = new CapabilityValidator();
