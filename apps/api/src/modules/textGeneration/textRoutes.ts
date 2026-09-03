/**
 * Text Generation Express Routes.
 * Exposes:
 * - POST /api/text/generate (Standard synchronous execution)
 * - POST /api/text/generate/stream (Server-Sent Events streaming execution)
 */

import { Router } from "express";
import { textGenerationService } from "./textGenerationService.js";
import { workspaceRepository } from "../../repositories/workspaceRepository.js";
import type { NormalizedTextRequest, TextTask } from "@shared-types/textGeneration.js";

export const textRouter = Router();

const ALLOWED_TASKS = new Set<TextTask>([
  "caption",
  "copy",
  "strategy",
  "manifesto",
  "brief",
  "title",
  "general",
]);

/**
 * Validates the raw request body into a strict NormalizedTextRequest.
 */
function validateTextRequest(body: any): { request?: NormalizedTextRequest; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object." };
  }

  const task = body.task as TextTask;
  if (!task || !ALLOWED_TASKS.has(task)) {
    return { error: `Invalid or missing task. Allowed: ${Array.from(ALLOWED_TASKS).join(", ")}` };
  }

  const input = typeof body.input === "string" ? body.input.trim() : "";
  if (!input && task !== "title") {
    return { error: "Field 'input' is required and must be a non-empty string." };
  }

  if (input.length > 8000) {
    return { error: "Field 'input' exceeds maximum allowed length of 8000 characters." };
  }

  return {
    request: {
      task,
      input,
      quality: body.quality,
      outputFormat: body.outputFormat,
      schema: body.schema,
      thinkingLevel: body.thinkingLevel,
      stream: !!body.stream,
      conversationId: body.conversationId,
      targetLanguage: body.targetLanguage,
      platform: body.platform,
      brandContext: body.brandContext,
      multimodalAssets: body.multimodalAssets,
      systemInstructionHint: body.systemInstructionHint,
    },
  };
}

/**
 * POST /api/text/generate
 * Standard text generation with ACID credit safety.
 */
textRouter.post("/generate", async (req, res) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({
      error: "Unauthorized: Authenticated user session required.",
      code: "AUTH_REQUIRED",
    });
  }

  const { request, error } = validateTextRequest(req.body);
  if (error || !request) {
    return res.status(400).json({ error, code: "TEXT_INPUT_INVALID" });
  }

  const userId = req.user.uid;
  const workspaceId =
    req.user.workspaceId || (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

  const idempotencyKey = (req.headers["x-idempotency-key"] as string) || undefined;

  try {
    const result = await textGenerationService.generateText(request, workspaceId, userId, idempotencyKey);
    return res.json(result);
  } catch (err: any) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Text generation failed.",
      code: err.code || "TEXT_GENERATION_FAILED",
      available: err.available,
      required: err.required,
    });
  }
});

/**
 * POST /api/text/generate/stream
 * Server-Sent Events (SSE) streaming text generation.
 */
textRouter.post("/generate/stream", async (req, res) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({
      error: "Unauthorized: Authenticated user session required.",
      code: "AUTH_REQUIRED",
    });
  }

  const { request, error } = validateTextRequest(req.body);
  if (error || !request) {
    return res.status(400).json({ error, code: "TEXT_INPUT_INVALID" });
  }

  const userId = req.user.uid;
  const workspaceId =
    req.user.workspaceId || (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

  const idempotencyKey = (req.headers["x-idempotency-key"] as string) || undefined;

  let streamPrepped: Awaited<ReturnType<typeof textGenerationService.prepareStream>> | null = null;

  try {
    // 1. Pre-authorize and hold credits
    streamPrepped = await textGenerationService.prepareStream(request, workspaceId, userId, idempotencyKey);

    // 2. Set SSE Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let fullAccumulatedText = "";

    // 3. Stream Chunks
    for await (const chunk of textGenerationService.streamText(request, workspaceId, userId)) {
      if (chunk.text) {
        fullAccumulatedText += chunk.text;
        res.write(`data: ${JSON.stringify({ text: chunk.text, id: chunk.id })}\n\n`);
      }
      if (chunk.done) {
        break;
      }
    }

    // 4. Complete stream and capture credits
    const newBalance = await textGenerationService.completeStream(
      streamPrepped.holdId,
      streamPrepped.jobId,
      streamPrepped.clientKey,
      streamPrepped.resolvedConfig.model,
      streamPrepped.resolvedConfig.creditsRequired,
      fullAccumulatedText
    );

    res.write(`data: ${JSON.stringify({ done: true, newBalance })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("[TextRouter /generate/stream] Stream error:", err);
    if (streamPrepped) {
      await textGenerationService.cancelStream(
        streamPrepped.holdId,
        streamPrepped.jobId,
        streamPrepped.clientKey,
        err.message || "Stream interrupted"
      );
    }

    if (!res.headersSent) {
      return res.status(err.status || 500).json({
        error: err.message || "Streaming failed.",
        code: err.code || "TEXT_STREAM_FAILED",
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message || "Stream error" })}\n\n`);
      res.end();
    }
  }
});
