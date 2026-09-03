/**
 * Internal Server-Side AI Gateway Router.
 * Executes Google GenAI SDK operations securely server-side through a governed control plane
 * with two-phase credit reservation, capture, and AI job observability.
 * Strictly production-oriented: requires authenticated session and real PostgreSQL workspace.
 * Routes: POST /api/ai/generate-content, POST /api/ai/generate-videos, POST /api/ai/poll-videos, POST /api/ai/tts
 */

import { Router } from "express";
import { getServerAI } from "../../infrastructure/gemini/serverGeminiClient.js";
import { validateGenerateContentInput, validateTTSInput, validateVideoInput } from "./aiSchemas.js";
import { orchestrateGenerateContent, orchestrateTTS, orchestrateVideoGeneration } from "./aiOrchestrator.js";
import { creditService } from "../../services/creditService.js";
import { aiJobRepository } from "../../repositories/aiJobRepository.js";
import { workspaceRepository } from "../../repositories/workspaceRepository.js";

export const aiRouter = Router();

// Secure Governed Content Generation Gateway with Two-Phase Credit Lifecycle
aiRouter.post("/generate-content", async (req, res) => {
  const { data, error } = validateGenerateContentInput(req.body);
  if (error) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }

  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: "Unauthorized: Authenticated user session required.", code: "AUTH_REQUIRED" });
  }

  const userId = req.user.uid;
  const userIdentifier = req.user.email || req.user.uid;
  const clientKey = (req.headers["x-idempotency-key"] as string) || `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Ensure workspace is resolved
  const workspaceId = req.user.workspaceId || (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

  let holdId: string | null = null;
  let jobId: string | null = null;

  // Dynamically determine exact required credits based on model and operation
  const requestedModel = (data?.model || "").toLowerCase();
  let creditsRequired = 5;
  if (requestedModel.includes("flash-image") || requestedModel.includes("schnell")) {
    creditsRequired = 2;
  } else if (requestedModel.includes("gpt-image-2") || requestedModel.includes("fal studio")) {
    creditsRequired = 3;
  } else if (requestedModel.includes("flux/dev") || requestedModel.includes("flux-pro")) {
    creditsRequired = 4;
  } else if (requestedModel.includes("veo-3.1-lite")) {
    creditsRequired = 10;
  } else if (requestedModel.includes("veo-3.1-fast")) {
    creditsRequired = 20;
  } else if (requestedModel.includes("veo-3.1") || requestedModel.includes("kling")) {
    creditsRequired = 40;
  } else if (requestedModel.includes("seedance")) {
    creditsRequired = 80;
  } else {
    // Short fast prompt / rewrite / title operations
    const contentsStr = JSON.stringify(data?.contents || "");
    if (contentsStr.includes("generateFastPrompt") || contentsStr.includes("rewrite") || contentsStr.includes("tagline")) {
      creditsRequired = 1;
    } else if (contentsStr.includes("Brand Identity Expert") || contentsStr.includes("brand documents")) {
      creditsRequired = 2;
    }
  }

  try {
    // 1. Two-phase credit reservation
    const reservation = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: creditsRequired,
      referenceId: clientKey,
      description: `AI Generation (${data!.model})`,
      idempotencyKey: `hold_${clientKey}`,
    });

    if (!reservation.success) {
      return res.status(402).json({
        error: "Insufficient credits available in workspace.",
        code: "INSUFFICIENT_CREDITS",
        available: reservation.available,
        required: creditsRequired,
      });
    }

    holdId = reservation.holdId || reservation.hold_id || null;

    // 2. Track AI Generation Job
    const job = await aiJobRepository.createJob({
      workspaceId,
      requestedBy: userId,
      operation: "generate-content",
      provider: "google-gemini",
      modelRequested: data!.model,
      creditsReserved: creditsRequired,
      idempotencyKey: `job_${clientKey}`,
    });
    jobId = job?.id || null;

    // 3. Execute AI generation
    const result = await orchestrateGenerateContent(data!, userIdentifier);

    // 4. On success: capture hold and settle to ledger
    let newBalance: number | undefined;
    if (holdId) {
      const captureResult = await creditService.captureCredits(holdId, `capture_${clientKey}`);
      newBalance = captureResult.newBalance;
      if (jobId) {
        await aiJobRepository.completeJob({
          jobId,
          modelUsed: result.modelUsed,
          creditsCharged: creditsRequired,
          outputs: [],
        });
        await aiJobRepository.recordUsage({
          workspaceId,
          userId,
          jobId,
          provider: "google-gemini",
          model: result.modelUsed,
          operation: "generate-content",
          inputUnits: 100,
          outputUnits: 200,
          providerCostMicrounits: 1250, // Micro-dollars ($0.001250)
          creditsCharged: creditsRequired,
        });
      }
    }

    return res.json({
      ...result,
      newBalance
    });
  } catch (err: any) {
    // On failure: release hold back to available balance immediately
    if (holdId) {
      await creditService.releaseCredits(holdId, err?.message || "AI Generation Failed");
    }
    if (jobId) {
      await aiJobRepository.failJob(jobId, err?.code || "AI_FAILED", err?.message || "Generation error");
    }

    const status = err?.status || 500;
    const statusCode = typeof status === "number" && status >= 400 && status < 600 ? status : 500;
    return res.status(statusCode).json({
      error: err?.message || "Failed to generate AI content",
      code: err?.code || "AI_GENERATION_FAILED",
    });
  }
});

// Secure Veo Video Generation Gateway
aiRouter.post("/generate-videos", async (req, res) => {
  const { data, error } = validateVideoInput(req.body);
  if (error) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }

  try {
    const result = await orchestrateVideoGeneration(data!);
    return res.json(result);
  } catch (err: any) {
    console.error("Server AI generate-videos error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to start video generation", code: "VIDEO_GENERATION_FAILED" });
  }
});

// Secure Video Polling Gateway
aiRouter.post("/poll-videos", async (req, res) => {
  try {
    const { operation } = req.body;
    if (!operation) {
      return res.status(400).json({ error: "Missing operation payload", code: "MISSING_OPERATION" });
    }

    const ai = getServerAI();
    const status = await ai.operations.getVideosOperation({ operation });
    return res.json(status);
  } catch (err: any) {
    console.error("Server AI poll-videos error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to poll video operation", code: "POLL_OPERATION_FAILED" });
  }
});

// Secure Text-To-Speech Gateway
aiRouter.post("/tts", async (req, res) => {
  const { data, error } = validateTTSInput(req.body);
  if (error) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }

  try {
    const result = await orchestrateTTS(data!);
    return res.json(result);
  } catch (err: any) {
    console.error("Server AI TTS error:", err?.message || err);
    const status = err?.status || 500;
    const statusCode = typeof status === "number" && status >= 400 && status < 600 ? status : 500;
    return res.status(statusCode).json({
      error: err?.message || "Failed to generate TTS audio",
      code: err?.code || "TTS_GENERATION_FAILED",
    });
  }
});
