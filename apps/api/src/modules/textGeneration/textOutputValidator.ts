/**
 * Text Output Validator & Sanitizer.
 * Enforces output boundaries, strips dangerous tags/SVG, validates JSON schemas,
 * and eliminates internal reasoning leaks.
 */

export interface ValidationResult {
  isValid: boolean;
  cleanText: string;
  structuredData?: unknown;
  error?: string;
}

/**
 * Strips SVG tags, XML definitions, developer metadata, or internal thought blocks.
 */
export function sanitizeTextOutput(rawText: string): string {
  if (typeof rawText !== "string") return "";

  let sanitized = rawText;

  // 1. Strip raw SVG elements
  sanitized = sanitized.replace(/<svg[\s\S]*?<\/svg>/gi, "");
  sanitized = sanitized.replace(/```(?:svg|xml|html)?\s*<svg[\s\S]*?<\/svg>\s*```/gi, "");

  // 2. Strip internal thought/reasoning tags if leaked
  sanitized = sanitized.replace(/<thought[\s\S]*?<\/thought>/gi, "");
  sanitized = sanitized.replace(/<reasoning[\s\S]*?<\/reasoning>/gi, "");

  // 3. Strip system instruction or boundary reflection if echoed
  sanitized = sanitized.replace(/<untrusted_user_request>[\s\S]*?<\/untrusted_user_request>/gi, "");
  sanitized = sanitized.replace(/<analyzed_document[\s\S]*?<\/analyzed_document>/gi, "");

  return sanitized.trim();
}

/**
 * Validates and safely extracts structured JSON output.
 */
export function validateStructuredOutput(
  rawText: string,
  expectedSchema?: Record<string, unknown>
): ValidationResult {
  const clean = sanitizeTextOutput(rawText);

  // Extract JSON string from code fences if present
  let jsonString = clean;
  const jsonFenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonFenceMatch && jsonFenceMatch[1]) {
    jsonString = jsonFenceMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonString);

    if (expectedSchema && typeof expectedSchema === "object") {
      // Validate required properties if specified in schema
      const requiredProps = (expectedSchema as any).required;
      if (Array.isArray(requiredProps)) {
        for (const prop of requiredProps) {
          if (parsed[prop] === undefined) {
            return {
              isValid: false,
              cleanText: clean,
              error: `Missing required schema property: "${prop}"`,
            };
          }
        }
      }
    }

    return {
      isValid: true,
      cleanText: clean,
      structuredData: parsed,
    };
  } catch (err: any) {
    return {
      isValid: false,
      cleanText: clean,
      error: `Malformed JSON response: ${err?.message || "Syntax error"}`,
    };
  }
}
