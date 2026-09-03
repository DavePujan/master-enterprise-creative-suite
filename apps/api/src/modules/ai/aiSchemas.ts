/**
 * Server-Side AI Request Schemas & Input Validators.
 * Strictly validates incoming AI gateway payloads and rejects out-of-bounds/invalid parameters.
 */

export interface ValidatedGenerateContentPayload {
  model?: string;
  contents: any;
  config?: Record<string, any>;
}

export interface ValidatedTTSPayload {
  text: string;
  voice: string;
  emotion: string;
}

export interface ValidatedVideoPayload {
  model: string;
  prompt: string;
  image?: any;
  config?: Record<string, any>;
}

export interface ValidationError {
  status: number;
  message: string;
  code: string;
}

const ALLOWED_CONFIG_KEYS = new Set([
  'temperature',
  'topP',
  'topK',
  'maxOutputTokens',
  'systemInstruction',
  'responseMimeType',
  'responseSchema',
  'candidateCount',
  'stopSequences'
]);

export function validateGenerateContentInput(body: any): { data?: ValidatedGenerateContentPayload; error?: ValidationError } {
  if (!body || typeof body !== 'object') {
    return { error: { status: 400, message: "Request body must be a valid JSON object", code: "INVALID_REQUEST_BODY" } };
  }

  const { model, contents, config } = body;

  if (!contents) {
    return { error: { status: 400, message: "Missing required 'contents' payload", code: "MISSING_CONTENTS" } };
  }

  // Validate contents length
  if (typeof contents === 'string') {
    if (contents.length === 0) {
      return { error: { status: 400, message: "'contents' cannot be empty", code: "EMPTY_CONTENTS" } };
    }
    if (contents.length > 100000) {
      return { error: { status: 400, message: "Contents exceed maximum allowable length of 100,000 characters", code: "PAYLOAD_TOO_LARGE" } };
    }
  } else if (Array.isArray(contents)) {
    if (contents.length === 0) {
      return { error: { status: 400, message: "'contents' array cannot be empty", code: "EMPTY_CONTENTS" } };
    }
    const totalChars = JSON.stringify(contents).length;
    if (totalChars > 120000) {
      return { error: { status: 400, message: "Contents payload exceeds maximum allowable length of 100,000 characters", code: "PAYLOAD_TOO_LARGE" } };
    }
  } else if (typeof contents === 'object') {
    const totalChars = JSON.stringify(contents).length;
    if (totalChars > 120000) {
      return { error: { status: 400, message: "Contents payload exceeds maximum allowable length of 100,000 characters", code: "PAYLOAD_TOO_LARGE" } };
    }
  } else {
    return { error: { status: 400, message: "Invalid 'contents' type: expected string, object, or array", code: "INVALID_CONTENTS" } };
  }

  // Validate config if present (Strict rejection, no silent clamping)
  if (config !== undefined && config !== null) {
    if (typeof config !== 'object' || Array.isArray(config)) {
      return { error: { status: 400, message: "'config' must be an object", code: "INVALID_CONFIG" } };
    }

    for (const key of Object.keys(config)) {
      if (!ALLOWED_CONFIG_KEYS.has(key)) {
        return { error: { status: 400, message: `Disallowed configuration parameter: '${key}'`, code: "DISALLOWED_CONFIG_PROPERTY" } };
      }
    }

    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number' || isNaN(config.temperature) || config.temperature < 0.0 || config.temperature > 2.0) {
        return { error: { status: 400, message: "Temperature must be a number between 0.0 and 2.0", code: "INVALID_TEMPERATURE" } };
      }
    }

    if (config.topP !== undefined) {
      if (typeof config.topP !== 'number' || isNaN(config.topP) || config.topP < 0.0 || config.topP > 1.0) {
        return { error: { status: 400, message: "topP must be a number between 0.0 and 1.0", code: "INVALID_TOP_P" } };
      }
    }

    if (config.topK !== undefined) {
      if (typeof config.topK !== 'number' || !Number.isInteger(config.topK) || config.topK < 1 || config.topK > 100) {
        return { error: { status: 400, message: "topK must be an integer between 1 and 100", code: "INVALID_TOP_K" } };
      }
    }

    if (config.maxOutputTokens !== undefined) {
      if (typeof config.maxOutputTokens !== 'number' || !Number.isInteger(config.maxOutputTokens) || config.maxOutputTokens < 1 || config.maxOutputTokens > 8192) {
        return { error: { status: 400, message: "maxOutputTokens must be an integer between 1 and 8192", code: "INVALID_MAX_OUTPUT_TOKENS" } };
      }
    }

    if (config.systemInstruction !== undefined) {
      const sysInstStr = typeof config.systemInstruction === 'string' ? config.systemInstruction : JSON.stringify(config.systemInstruction);
      if (sysInstStr.length > 50000) {
        return { error: { status: 400, message: "System instruction exceeds maximum allowable length of 50,000 characters", code: "SYSTEM_INSTRUCTION_TOO_LARGE" } };
      }
    }
  }

  return {
    data: {
      model: typeof model === 'string' ? model.trim() : undefined,
      contents,
      config: config || undefined
    }
  };
}

export function validateTTSInput(body: any): { data?: ValidatedTTSPayload; error?: ValidationError } {
  if (!body || typeof body !== 'object') {
    return { error: { status: 400, message: "Request body must be a valid JSON object", code: "INVALID_REQUEST_BODY" } };
  }

  const { text, voice = "Kore", emotion = "Professional" } = body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { error: { status: 400, message: "Missing or empty 'text' payload", code: "MISSING_TEXT" } };
  }

  if (text.length > 10000) {
    return { error: { status: 400, message: "TTS text exceeds maximum allowable limit of 10,000 characters", code: "TEXT_TOO_LARGE" } };
  }

  if (typeof voice !== 'string' || voice.length > 50) {
    return { error: { status: 400, message: "Invalid 'voice' parameter", code: "INVALID_VOICE" } };
  }

  if (typeof emotion !== 'string' || emotion.length > 50) {
    return { error: { status: 400, message: "Invalid 'emotion' parameter", code: "INVALID_EMOTION" } };
  }

  return {
    data: {
      text: text.trim(),
      voice: voice.trim(),
      emotion: emotion.trim()
    }
  };
}

export function validateVideoInput(body: any): { data?: ValidatedVideoPayload; error?: ValidationError } {
  if (!body || typeof body !== 'object') {
    return { error: { status: 400, message: "Request body must be a valid JSON object", code: "INVALID_REQUEST_BODY" } };
  }

  const { model = "veo-3.1-fast-generate-preview", prompt, image, config } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return { error: { status: 400, message: "Missing or empty 'prompt' payload", code: "MISSING_PROMPT" } };
  }

  if (prompt.length > 2000) {
    return { error: { status: 400, message: "Video prompt exceeds maximum allowable length of 2,000 characters", code: "PROMPT_TOO_LARGE" } };
  }

  if (typeof model !== 'string' || model.length > 100) {
    return { error: { status: 400, message: "Invalid 'model' parameter", code: "INVALID_MODEL" } };
  }

  return {
    data: {
      model: model.trim(),
      prompt: prompt.trim(),
      image,
      config: config && typeof config === 'object' ? config : undefined
    }
  };
}
