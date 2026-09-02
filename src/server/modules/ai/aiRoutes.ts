/**
 * Internal Server-Side AI Gateway Router.
 * Executes Google GenAI SDK operations securely server-side so zero API keys reach the client bundle.
 * Routes: POST /api/ai/generate-content, POST /api/ai/generate-videos, POST /api/ai/poll-videos, POST /api/ai/tts
 */

import { Router } from "express";
import { Modality } from "@google/genai";
import { getServerAI } from "../../infrastructure/gemini/serverGeminiClient.js";

export const aiRouter = Router();

const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

function isTransientError(err: any): boolean {
  const status = err?.status || err?.code || 0;
  const message = String(err?.message || "").toUpperCase();
  return (
    status === 503 ||
    status === 429 ||
    status === 404 ||
    message.includes("UNAVAILABLE") ||
    message.includes("HIGH DEMAND") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("TEMPORARY") ||
    message.includes("OVERLOADED") ||
    message.includes("NOT FOUND") ||
    message.includes("NOT_FOUND")
  );
}

// Secure Content Generation Gateway with Resilience & Model Fallback
aiRouter.post("/generate-content", async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    if (!contents) {
      return res.status(400).json({ error: "Missing contents payload" });
    }

    const ai = getServerAI();
    const primaryModel = model || "gemini-2.5-flash";
    const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter(m => m !== primaryModel)];

    let lastError: any = null;

    for (const currentModel of modelsToTry) {
      try {
        console.log(`[Server AI] Attempting generate-content (model: ${currentModel}, user: ${req.user?.email || req.user?.uid || 'authenticated'})`);

        const response = await ai.models.generateContent({
          model: currentModel,
          contents,
          config
        });

        if (currentModel !== primaryModel) {
          console.log(`[Server AI] ✅ Successfully recovered with fallback model: ${currentModel}`);
        }

        return res.json({
          text: response.text,
          candidates: response.candidates,
          modelUsed: currentModel
        });
      } catch (err: any) {
        lastError = err;
        console.warn(`[Server AI Warning] Model "${currentModel}" failed:`, err?.message || err);

        // If error is not a transient capacity/model error (e.g. 400 Bad Request / invalid schema), fail immediately
        if (!isTransientError(err)) {
          break;
        }

        // Brief jitter delay before trying next fallback model
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
      }
    }

    console.error("[Server AI generate-content all models failed]:", {
      message: lastError?.message || lastError,
      status: lastError?.status,
      code: lastError?.code
    });

    const status = lastError?.status || lastError?.code || 500;
    const statusCode = typeof status === "number" && status >= 400 && status < 600 ? status : 503;
    const userMessage = isTransientError(lastError)
      ? "AI service is temporarily experiencing high demand. Please try again shortly."
      : lastError?.message || "Failed to generate AI content";

    return res.status(statusCode).json({
      error: userMessage,
      code: lastError?.code || "AI_GENERATION_FAILED"
    });
  } catch (err: any) {
    console.error("[Server AI unexpected error]:", err);
    return res.status(500).json({
      error: "Unexpected server error during content generation",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});



// Secure Veo Video Generation Gateway
aiRouter.post("/generate-videos", async (req, res) => {
  try {
    const { model, prompt, image, config } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt payload" });
    }

    const ai = getServerAI();
    const modelId = model || "veo-3.1-fast-generate-preview";

    const operation = await ai.models.generateVideos({
      model: modelId,
      prompt,
      image,
      config
    });

    return res.json({
      name: operation.name,
      done: operation.done,
      response: operation.response
    });
  } catch (err: any) {
    console.error("Server AI generate-videos error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to start video generation" });
  }
});

// Secure Video Polling Gateway
aiRouter.post("/poll-videos", async (req, res) => {
  try {
    const { operation } = req.body;
    if (!operation) {
      return res.status(400).json({ error: "Missing operation payload" });
    }

    const ai = getServerAI();
    const status = await ai.operations.getVideosOperation({ operation });
    return res.json(status);
  } catch (err: any) {
    console.error("Server AI poll-videos error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to poll video operation" });
  }
});

// Secure Text-To-Speech Gateway
aiRouter.post("/tts", async (req, res) => {
  try {
    const { text, voice = "Kore", emotion = "Professional" } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing text payload" });
    }

    const ai = getServerAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say in a natural, ${emotion} accent: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({ audioPcmBase64: base64Audio });
    }
    return res.status(500).json({ error: "No audio data produced by TTS model" });
  } catch (err: any) {
    console.error("Server AI TTS error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to generate TTS audio" });
  }
});
