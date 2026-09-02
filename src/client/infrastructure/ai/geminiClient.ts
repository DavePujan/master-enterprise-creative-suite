/**
 * Client AI Gateway Adapter & Utilities.
 * Proxies all model executions through secure server endpoints so ZERO secrets reach the browser.
 */

export const getAI = () => {
  return {
    models: {
      async generateContent(params: { model: string; contents: any; config?: any }) {
        const res = await fetch("/api/ai/generate-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: res.statusText }));
          const error: any = new Error(errData.error || "Failed to generate AI content");
          error.status = res.status;
          error.code = errData.code || res.status;
          throw error;
        }
        return await res.json();
      },
      async generateVideos(params: { model: string; prompt: string; image?: any; config?: any }) {
        const res = await fetch("/api/ai/generate-videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: res.statusText }));
          const error: any = new Error(errData.error || "Failed to start video generation");
          error.status = res.status;
          throw error;
        }
        return await res.json();
      }
    },
    operations: {
      async getVideosOperation(params: { operation: any }) {
        const res = await fetch("/api/ai/poll-videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: res.statusText }));
          const error: any = new Error(errData.error || "Failed to poll video operation");
          error.status = res.status;
          throw error;
        }
        return await res.json();
      }
    }
  };
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
    const isQuotaError = errorStr.includes("RESOURCE_EXHAUSTED") || error?.status === 429 || error?.code === 429;
    const isInternalError = errorStr.includes("INTERNAL") || error?.status === 500 || error?.code === 500;
    const isServiceUnavailable = errorStr.includes("SERVICE_UNAVAILABLE") || errorStr.includes("UNAVAILABLE") || error?.status === 503 || error?.code === 503;
    const isDeadlineExceeded = errorStr.includes("DEADLINE_EXCEEDED") || error?.status === 504 || error?.code === 504;
    const isSpendingCap = errorStr.includes("exceeded its spending cap");

    if (isSpendingCap) {
      throw error;
    }

    if ((isQuotaError || isInternalError || isServiceUnavailable || isDeadlineExceeded) && retries > 0) {
      let waitTime = delay;
      if (errorStr.includes("Please retry in")) {
        const match = errorStr.match(/Please retry in ([\d\.]+)s/);
        if (match && match[1]) {
          waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
        }
      }
      console.warn(`Transient API error. Retrying in ${waitTime}ms... (${retries} attempts left). Error:`, errorStr);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export function getQuotaErrorMessage(error: any): string {
  const errorStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
  if (errorStr.includes("RESOURCE_EXHAUSTED") || error?.status === 429) {
    const match = errorStr.match(/Please retry in ([\d\.]+)s/);
    if (match && match[1]) {
      return `Rate limit reached. Please wait ${Math.ceil(parseFloat(match[1]))} seconds before generating again.`;
    }
    return "API rate limit reached. Please wait a moment before trying again.";
  }
  return "Failed to generate content. Please try again.";
}

export async function generateHistoryTitle(prompt: string, context?: string): Promise<string> {
  try {
    const ai = getAI();
    const contextPrompt = context ? ` for ${context}` : '';
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a very short, punchy 2 to 4-word title${contextPrompt} for this user prompt: "${prompt}". Return ONLY the plain text title, no punctuation, no quotes, no markdown.`
    }));
    return response.text?.trim() || prompt.slice(0, 30);
  } catch (e) {
    return prompt.slice(0, 30);
  }
}
