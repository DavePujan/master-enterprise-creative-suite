/**
 * Server-side Google GenAI Client with Pay-As-You-Go & Vertex AI Enterprise Support.
 * Supports:
 * 1. Pay-As-You-Go dedicated production keys (GEMINI_PAYG_API_KEY / GEMINI_PROD_API_KEY)
 * 2. Multi-key pool rotation (GEMINI_API_KEYS)
 * 3. Standard Gemini API keys (GEMINI_API_KEY)
 * 4. Google Cloud Vertex AI (GOOGLE_GENAI_USE_VERTEXAI / GOOGLE_CLOUD_PROJECT)
 */

import { GoogleGenAI } from "@google/genai";
import { serverConfig } from "../../config/env.js";

let aiClient: GoogleGenAI | null = null;
let currentKeyPoolIndex = 0;

export interface GeminiBillingContext {
  tier: "free" | "pay_as_you_go" | "enterprise";
  isVertexAI: boolean;
  keySource: "payg_key" | "pool" | "standard_key" | "vertex_adc";
  poolSize: number;
  project?: string;
  location?: string;
}

export function getGeminiBillingContext(): GeminiBillingContext {
  const isVertex = serverConfig.useVertexAI && Boolean(serverConfig.googleCloudProject);
  let keySource: "payg_key" | "pool" | "standard_key" | "vertex_adc" = "standard_key";

  if (isVertex) {
    keySource = "vertex_adc";
  } else if (serverConfig.geminiPaygApiKey) {
    keySource = "payg_key";
  } else if (serverConfig.geminiApiKeyPool.length > 0) {
    keySource = "pool";
  }

  return {
    tier: serverConfig.geminiBillingTier,
    isVertexAI: isVertex,
    keySource,
    poolSize: serverConfig.geminiApiKeyPool.length,
    project: serverConfig.googleCloudProject || undefined,
    location: serverConfig.googleCloudLocation || undefined
  };
}

function resolveActiveKey(): string {
  if (serverConfig.geminiPaygApiKey) {
    return serverConfig.geminiPaygApiKey;
  }
  if (serverConfig.geminiApiKeyPool.length > 0) {
    const key = serverConfig.geminiApiKeyPool[currentKeyPoolIndex % serverConfig.geminiApiKeyPool.length];
    return key;
  }
  return serverConfig.geminiApiKey;
}

export function rotateGeminiClient(): GoogleGenAI {
  if (serverConfig.geminiApiKeyPool.length > 1) {
    currentKeyPoolIndex = (currentKeyPoolIndex + 1) % serverConfig.geminiApiKeyPool.length;
    console.log(`[Server AI] Rotating to next API key in pool (index ${currentKeyPoolIndex + 1}/${serverConfig.geminiApiKeyPool.length})`);
    aiClient = null;
  }
  return getServerAI();
}

export function getServerAI(): GoogleGenAI {
  if (!aiClient) {
    const isVertex = serverConfig.useVertexAI && Boolean(serverConfig.googleCloudProject);

    if (isVertex) {
      console.log(
        `[Server AI] Initializing Vertex AI client (Project: ${serverConfig.googleCloudProject}, Location: ${serverConfig.googleCloudLocation})`
      );
      aiClient = new GoogleGenAI({
        vertexai: true,
        project: serverConfig.googleCloudProject,
        location: serverConfig.googleCloudLocation || "us-central1",
        httpOptions: {
          headers: {
            "User-Agent": "writopedia-enterprise-suite/1.0.0 (vertex-ai)"
          }
        }
      });
      return aiClient;
    }

    const key = resolveActiveKey();
    if (!key) {
      console.error("[Server AI Error] No Gemini API key defined on server! (Checked GEMINI_PAYG_API_KEY, GEMINI_API_KEYS, and GEMINI_API_KEY)");
      const err: any = new Error("GEMINI_API_KEY is not configured on the server. Please ensure GEMINI_API_KEY or GEMINI_PAYG_API_KEY is set in your environment.");
      err.status = 503;
      err.code = "GEMINI_API_KEY_MISSING";
      throw err;
    }

    const isPayg = Boolean(serverConfig.geminiPaygApiKey) || serverConfig.geminiBillingTier === "pay_as_you_go";
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": isPayg ? "writopedia-enterprise-suite/1.0.0 (pay-as-you-go)" : "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}

