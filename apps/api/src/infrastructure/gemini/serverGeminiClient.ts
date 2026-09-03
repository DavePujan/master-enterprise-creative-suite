/**
 * Server-side Google GenAI Client.
 * Preserves exact lazy initialization and custom User-Agent headers.
 */

import { GoogleGenAI } from "@google/genai";
import { serverConfig } from "../../config/env.js";

let aiClient: GoogleGenAI | null = null;

export function getServerAI(): GoogleGenAI {
  if (!aiClient) {
    const key = serverConfig.geminiApiKey;
    if (!key) {
      console.error("[Server AI Error] GEMINI_API_KEY environment variable is not defined on server!");
      const err: any = new Error("GEMINI_API_KEY is not configured on the server. Please ensure GEMINI_API_KEY is set in your environment.");
      err.status = 503;
      err.code = "GEMINI_API_KEY_MISSING";
      throw err;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

