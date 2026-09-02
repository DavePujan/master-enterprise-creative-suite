/**
 * Client Google GenAI SDK Wrapper & Utilities.
 * Preserves exact retry logic, JSON repair, quota handling, and title generators.
 */

import { GoogleGenAI } from "@google/genai";

// API key is managed server-side or injected via bundler defines
export const getAI = () => {
  const apiKey =
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    '';
  if (!apiKey) {
    console.warn("[Gemini Service] No Gemini API key configured in environment.");
  }
  return new GoogleGenAI({ apiKey });
};

export function parseJSON(text: string) {
  try {
    let cleaned = text.replace(/```json\n?|```/g, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn("JSON Parse failed, attempting to fix truncation...", e);

      if (cleaned.endsWith('"')) {
        try { return JSON.parse(cleaned + '}'); } catch (e2) { }
        try { return JSON.parse(cleaned + '"}'); } catch (e2) { }
      } else if (cleaned.endsWith(',')) {
        try { return JSON.parse(cleaned.slice(0, -1) + '}'); } catch (e2) { }
      } else {
        try { return JSON.parse(cleaned + '}'); } catch (e2) { }
        try { return JSON.parse(cleaned + '"}'); } catch (e2) { }
        try { return JSON.parse(cleaned + '"]}'); } catch (e2) { }
      }
      throw e;
    }
  } catch (e) {
    console.error("JSON Parse error:", e, "Original text:", text);
    throw new Error("Unable to parse JSON string. The AI response might have been truncated or malformed.");
  }
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
    const isQuotaError = errorStr.includes("RESOURCE_EXHAUSTED") || error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429;
    const isInternalError = errorStr.includes("INTERNAL") || error?.status === "INTERNAL" || error?.code === 500;
    const isServiceUnavailable = errorStr.includes("SERVICE_UNAVAILABLE") || errorStr.includes("UNAVAILABLE") || error?.status === "SERVICE_UNAVAILABLE" || error?.status === "UNAVAILABLE" || error?.code === 503;
    const isDeadlineExceeded = errorStr.includes("DEADLINE_EXCEEDED") || error?.status === "DEADLINE_EXCEEDED" || error?.code === 504;
    const isNotFoundError = errorStr.includes("Requested entity was not found");
    const isPermissionDenied = errorStr.includes("PERMISSION_DENIED") || error?.status === "PERMISSION_DENIED" || error?.code === 403;
    const isSpendingCap = errorStr.includes("exceeded its spending cap");

    if ((isNotFoundError || isPermissionDenied) && retries > 0 && typeof window !== 'undefined' && (window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      return withRetry(fn, retries - 1, delay * 2);
    }

    if (isSpendingCap) {
      throw error;
    }

    if ((isQuotaError || isInternalError || isServiceUnavailable || isDeadlineExceeded) && retries > 0) {
      let waitTime = delay;

      try {
        const errorObj = typeof error === 'string' ? JSON.parse(error) : error;
        const details = errorObj?.error?.details || errorObj?.details;
        if (Array.isArray(details)) {
          const retryInfo = details.find((d: any) => d['@type']?.includes('RetryInfo') || d.retryDelay);
          if (retryInfo?.retryDelay) {
            const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
            if (!isNaN(seconds)) {
              waitTime = (seconds + 1) * 1000;
            }
          }
        }
      } catch (e) { }

      console.warn(`Transient error or quota exceeded. Retrying in ${waitTime}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return withRetry(fn, retries - 1, waitTime * 1.5);
    }
    throw error;
  }
}

export const getQuotaErrorMessage = (error: any) => {
  const errorStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
  const isQuota = errorStr.includes("RESOURCE_EXHAUSTED") || error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429;
  const isUnavailable = errorStr.includes("UNAVAILABLE") || error?.status === "UNAVAILABLE" || error?.code === 503;
  const isSpendingCap = errorStr.includes("exceeded its spending cap");

  if (isUnavailable) {
    return "The AI model is currently experiencing high demand. We are automatically retrying, but if this persists, please try again in a few minutes.";
  }

  if (isSpendingCap) {
    return "Your Google Cloud project has exceeded its spending cap. Please check your billing settings in the Google Cloud Console or Google AI Studio to increase your limit.";
  }

  if (!isQuota) return null;

  try {
    const errorObj = typeof error === 'string' ? JSON.parse(error) : error;
    const details = errorObj?.error?.details || errorObj?.details;
    if (Array.isArray(details)) {
      const retryInfo = details.find((d: any) => d['@type']?.includes('RetryInfo') || d.retryDelay);
      if (retryInfo?.retryDelay) {
        return `API Quota exceeded. Please wait ${retryInfo.retryDelay} or select a different API key.`;
      }
    }
  } catch (e) { }

  return "API Quota exceeded. Please wait a moment or select a different API key.";
};

export async function generateHistoryTitle(prompt: string, gemName: string): Promise<string> {
  try {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a very short, clear, and descriptive title (max 5 words) for a creative task based on the following prompt and tool name. 
      Tool: ${gemName}
      Prompt: ${prompt}
      
      Return ONLY the title string, no quotes or extra text.`,
    }));
    return response.text?.trim() || prompt.substring(0, 30) + '...';
  } catch (e) {
    console.error("Failed to generate history title:", e);
    return prompt.substring(0, 30) + '...';
  }
}
