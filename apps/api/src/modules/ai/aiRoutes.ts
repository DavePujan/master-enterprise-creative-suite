/**
 * Internal Server-Side AI Gateway Router.
 * Executes Google GenAI SDK operations securely server-side through a governed control plane.
 * Routes: POST /api/ai/generate-content, POST /api/ai/generate-videos, POST /api/ai/poll-videos, POST /api/ai/tts
 */

import { Router } from "express";
import { getServerAI } from "../../infrastructure/gemini/serverGeminiClient.js";
import { validateGenerateContentInput, validateTTSInput, validateVideoInput } from "./aiSchemas.js";
import { orchestrateGenerateContent, orchestrateTTS, orchestrateVideoGeneration } from "./aiOrchestrator.js";

export const aiRouter = Router();

// Secure Governed Content Generation Gateway
aiRouter.post("/generate-content", async (req, res) => {
  const { data, error } = validateGenerateContentInput(req.body);
  if (error) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }

  try {
    const userIdentifier = req.user?.email || req.user?.uid || "authenticated";
    const result = await orchestrateGenerateContent(data!, userIdentifier);
    return res.json(result);
  } catch (err: any) {
    const status = err?.status || 500;
    const statusCode = typeof status === "number" && status >= 400 && status < 600 ? status : 500;
    return res.status(statusCode).json({
      error: err?.message || "Failed to generate AI content",
      code: err?.code || "AI_GENERATION_FAILED"
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
      code: err?.code || "TTS_GENERATION_FAILED"
    });
  }
});
