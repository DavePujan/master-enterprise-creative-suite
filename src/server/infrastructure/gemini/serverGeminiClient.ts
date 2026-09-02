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
      console.warn("GEMINI_API_KEY environment variable is not defined");
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
