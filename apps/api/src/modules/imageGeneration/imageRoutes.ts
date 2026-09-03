/**
 * Image Generation REST API Router.
 * Mounted at /api/images.
 */

import { Router } from "express";
import { imageGenerationService } from "./imageGenerationService.js";
import { imageModelResolver } from "./imageModelResolver.js";
import { workspaceRepository } from "../../repositories/workspaceRepository.js";
import type { NormalizedImageRequest } from "@shared-types/imageGeneration.js";

export const imageRouter = Router();

// GET /api/images/models - Returns list of approved image models with metadata and capabilities
imageRouter.get("/models", (_req, res) => {
  const models = imageModelResolver.getAvailableModels();
  return res.json({ models });
});

// GET /api/images/capabilities/:modelKey - Returns capability matrix for specific model
imageRouter.get("/capabilities/:modelKey", (req, res) => {
  const { modelKey } = req.params;
  const { model, error } = imageModelResolver.resolve(modelKey);
  if (error) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }
  return res.json({
    modelKey: model.key,
    label: model.label,
    capabilities: model.capabilities,
  });
});

// POST /api/images/generate - Normalized Image Generation Endpoint
imageRouter.post("/generate", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        error: "Unauthorized: Authenticated user session required.",
        code: "AUTH_REQUIRED",
      });
    }

    const {
      prompt,
      aspectRatio,
      modelKey,
      quality,
      style,
      resolution,
      logo,
      faceReference,
      productReference,
      ingredients,
      referenceImages,
      guidelines,
      numImages,
      seed,
    } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Missing required 'prompt' string in request body.",
        code: "MISSING_PROMPT",
      });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

    const normalizedRequest: NormalizedImageRequest = {
      prompt: prompt.trim(),
      aspectRatio: aspectRatio || "1:1",
      modelKey: modelKey || "fal-studio",
      quality,
      style,
      resolution,
      logo,
      faceReference,
      productReference,
      ingredients,
      referenceImages,
      guidelines,
      numImages: numImages || 1,
      seed,
    };

    const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined;

    const result = await imageGenerationService.generateImage({
      request: normalizedRequest,
      workspaceId,
      userId,
      idempotencyKey,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[imageRouter /generate] Error:", err.message);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Failed to generate image.",
      code: err.code || "IMAGE_GENERATION_FAILED",
      available: err.available,
      required: err.required,
    });
  }
});
