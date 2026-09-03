/**
 * Express HTTP Router for Audio Studio (Voiceover & Music).
 * Routes:
 * - POST /api/audio/generate
 * - POST /api/audio/autowrite
 */

import { Router } from "express";
import { audioGenerationService } from "./audioGenerationService.js";
import { audioAutoWriteService } from "./audioAutoWriteService.js";
import type { AudioGenerationRequest } from "../../../../../packages/types/audioGeneration.js";
import type { AudioAutoWriteRequest } from "../../../../../packages/types/audioAutoWrite.js";

export const audioRouter = Router();

// Generation Gateway
audioRouter.post("/generate", async (req, res) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({
      error: "Unauthorized: Authenticated session required.",
      code: "AUTH_REQUIRED",
    });
  }

  const payload = req.body as AudioGenerationRequest;
  if (!payload || !payload.generationType) {
    return res.status(400).json({
      error: "Invalid request: 'generationType' must be 'voiceover' or 'music'.",
      code: "INVALID_GENERATION_TYPE",
    });
  }

  if (payload.generationType === "voiceover") {
    if (!payload.userIntent && !payload.transcript) {
      return res.status(400).json({
        error: "Missing voiceover intent or transcript.",
        code: "MISSING_VOICEOVER_INPUT",
      });
    }
  } else if (payload.generationType === "music") {
    if (!payload.prompt) {
      return res.status(400).json({
        error: "Missing musical prompt.",
        code: "MISSING_MUSIC_PROMPT",
      });
    }
  }

  try {
    const result = await audioGenerationService.generateAudio(payload, {
      userId: req.user.uid,
      workspaceId: req.user.workspaceId,
    });
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Audio generation route error:", err?.message || err);
    const statusCode =
      typeof err?.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500;
    return res.status(statusCode).json({
      error: err?.message || "Failed to generate audio.",
      code: err?.code || "AUDIO_GENERATION_FAILED",
      requiredCredits: err?.requiredCredits,
    });
  }
});

// Auto-Write Creative Director Gateway
audioRouter.post("/autowrite", async (req, res) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({
      error: "Unauthorized: Authenticated session required.",
      code: "AUTH_REQUIRED",
    });
  }

  const payload = req.body as AudioAutoWriteRequest;
  if (!payload || !payload.userIntent) {
    return res.status(400).json({
      error: "userIntent is required",
      code: "INVALID_REQUEST",
    });
  }

  try {
    const result = await audioAutoWriteService.generateAudioIdea(payload, {
      userId: req.user.uid,
      workspaceId: req.user.workspaceId,
    });
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Audio autowrite route error:", err?.message || err);
    const statusCode =
      typeof err?.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500;
    return res.status(statusCode).json({
      error: err?.message || "Failed to generate audio concept.",
      code: err?.code || "AUDIO_AUTOWRITE_FAILED",
      requiredCredits: err?.requiredCredits,
    });
  }
});
