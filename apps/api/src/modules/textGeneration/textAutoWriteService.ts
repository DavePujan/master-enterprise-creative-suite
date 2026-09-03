/**
 * Text & Caption Auto-Write Service.
 * Acts as an AI Senior Social Copywriter and Brand Strategist.
 * Infers creative angles, applies selected Voice Emotion, grounds in Brand Guidelines,
 * generates platform-adapted captions, and enforces Supabase ACID credit accounting.
 */

import { Type } from "@google/genai";
import { getServerAI } from "../../infrastructure/gemini/serverGeminiClient.js";
import { creditService } from "../../services/creditService.js";
import { aiJobRepository } from "../../repositories/aiJobRepository.js";
import { workspaceRepository } from "../../repositories/workspaceRepository.js";
import { sanitizeTextOutput } from "./textOutputValidator.js";
import type {
  TextAutoWriteRequest,
  TextAutoWriteResponse,
  TextAutoWriteIdea,
  CaptionPlatformOutput,
  CaptionEmotion,
} from "@shared-types/textAutoWrite.js";

const DEFAULT_PLATFORMS = ["Instagram", "LinkedIn", "X", "Threads"];

const EMOTION_DIRECTIVES: Record<CaptionEmotion, string> = {
  Neutral: "Tone is balanced, clear, informative, and objective. State facts and benefits directly with composure.",
  Cheerful: "Tone is warm, positive, approachable, and optimistic. Radiate uplifting enthusiasm and welcoming joy.",
  Energetic: "Tone is bold, punchy, high-momentum, and dynamic. Use staccato hooks, strong verbs, and infectious drive.",
  Professional: "Tone is polished, authoritative, concise, and insightful. Grounded in executive clarity and business depth.",
  Calming: "Tone is measured, soothing, grounded, and reassuring. Cultivate presence, mindful connection, and subtle elegance.",
};

const PLATFORM_GUIDES: Record<string, string> = {
  Instagram: "Opening hook that stops the scroll, visual connection to imagery, conversational body, clear engagement CTA, 3-6 relevant hashtags.",
  LinkedIn: "Professional context, strategic insight, business relevance, thought-leadership structure, polite professional CTA, 2-3 focused hashtags.",
  X: "Ultra-crisp and punchy under 250 characters total, striking observation or bold hook, clean link/action CTA, 1-2 hashtags.",
  Threads: "Casual, relatable storytelling, candid insider perspective, community engagement question or discussion prompt, 0-2 hashtags.",
  Facebook: "Accessible community narrative, storytelling angle, relatable everyday context, friendly conversation-starting CTA, 1-3 hashtags.",
};

export class TextAutoWriteService {
  /**
   * Builds the trusted system instruction for the AI Senior Social Copywriter.
   */
  private buildSystemInstruction(
    emotion: CaptionEmotion,
    platforms: string[],
    targetLanguage?: string
  ): string {
    const emotionGuidance = EMOTION_DIRECTIVES[emotion] || EMOTION_DIRECTIVES.Neutral;
    const platformList = platforms.join(", ");
    const platformInstructions = platforms
      .map((p) => `- ${p}: ${PLATFORM_GUIDES[p] || "Engaging, platform-tailored copy with clear hook and CTA."}`)
      .join("\n");

    return `You are an elite Senior Social Media Copywriter and Brand Strategist at a premier creative agency.
Your mission is to transform the user's intent into high-converting, platform-ready copy and a sharp strategic concept.

CRITICAL OPERATIONAL RULES:
1. USER INTENT IS CENTRAL:
   - If the user provided a specific subject, product, event, or announcement, that is the unyielding core subject.
   - Expand and elevate it into a compelling marketing hook. Do NOT drift into generic abstractions.

2. VOICE EMOTION DIRECTIVE:
   - Active Emotion: ${emotion}.
   - ${emotionGuidance}
   - Let this emotion genuinely shape the cadence, sentence length, and vocabulary throughout all platforms.

3. PLATFORM ADAPTATION (Target Platforms: ${platformList}):
${platformInstructions}
   - Never copy-paste identical copy across platforms. Each must feel natively written for that audience and interface.

4. FACTUAL INTEGRITY (NO HALLUCINATIONS):
   - Never fabricate specs, stats, awards, customer numbers, certifications, pricing, or dates not explicitly provided.
   - If missing, speak to the experience and core benefit authentically without inventing unsupported claims.

5. BANNED GENERIC AI CLICHÉS:
   - DO NOT USE: "Level up", "Unlock your potential", "Game changer", "Where innovation meets...", "Seamless", "Revolutionary", "Dive into", "In today's fast-paced world".
   - Avoid repetitive em-dashes and robotic buzzwords. Write with authentic human flair.

6. EMOJIS & HASHTAGS:
   - Tailor emoji frequency to the emotion and platform (minimal for Professional/LinkedIn; energetic for Instagram/Cheerful).
   - Generate hashtags that are specific to the brand, industry, and topic.

7. LANGUAGE:
   - Deliver copy in ${targetLanguage || "English"}.

8. OUTPUT FORMAT:
   - You MUST output ONLY a valid, raw JSON object matching this exact schema:
{
  "concept": {
    "angle": "Brief strategic creative angle title",
    "coreMessage": "One concise core message sentence",
    "emotionalTone": "${emotion}",
    "targetAudience": "Specific audience description",
    "keyBenefit": "Core value proposition"
  },
  "captions": [
    {
      "platform": "Instagram | LinkedIn | X | Threads",
      "hook": "Platform-tailored opening hook",
      "body": "Full compelling body copy",
      "cta": "Appropriate call to action",
      "hashtags": ["relevant", "hashtags"]
    }
  ]
}
   - DO NOT wrap in Markdown code blocks. Output the pure JSON object directly.
`.trim();
  }

  /**
   * Formats the structured captions and concept into clean, platform-ready Markdown.
   */
  private formatMarkdownCopy(idea: Omit<TextAutoWriteIdea, "formattedCopy">): string {
    const lines: string[] = [];

    // Title / Concept Header
    lines.push(`# Concept: ${idea.concept.angle}`);
    lines.push(`*${idea.concept.coreMessage}*\n`);

    for (const item of idea.captions) {
      const platformName = item.platform === "X" ? "X (Twitter)" : item.platform;
      lines.push(`---\n\n### ${platformName}\n`);
      if (item.hook) {
        lines.push(`**Hook:** ${item.hook}\n`);
      }
      lines.push(`${item.body}\n`);
      if (item.cta) {
        lines.push(`**CTA:** ${item.cta}\n`);
      }
      if (item.hashtags && item.hashtags.length > 0) {
        const formattedTags = item.hashtags
          .map((t) => (t.startsWith("#") ? t : `#${t}`))
          .join(" ");
        lines.push(`**Hashtags:** ${formattedTags}\n`);
      }
    }

    return lines.join("\n").trim();
  }

  /**
   * Generates a structured creative text/caption concept and platform-ready copy.
   */
  async generateAutoWriteIdea(
    request: TextAutoWriteRequest,
    authContext: { userId: string; workspaceId?: string }
  ): Promise<TextAutoWriteResponse> {
    const { userId } = authContext;
    const workspaces = await workspaceRepository.getUserWorkspaces(userId);
    const workspaceId = authContext.workspaceId || workspaces?.[0]?.id;
    if (!workspaceId) {
      throw new Error("No authorized workspace resolved for user.");
    }

    const emotion: CaptionEmotion = request.emotion || "Neutral";
    const platforms =
      request.platforms && request.platforms.length > 0
        ? request.platforms
        : DEFAULT_PLATFORMS;
    const model =
      request.quality === "premium" ? "gemini-3.8-flash" : "gemini-3.7-flash";
    const clientKey = request.idempotencyKey || `autowrite_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const creditsToCharge = 1;

    // 1. Two-phase ACID Credit Reservation
    const holdResult = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: creditsToCharge,
      idempotencyKey: `hold_${clientKey}`,
      referenceId: clientKey,
      description: `Auto-Write Caption Concept (${emotion})`,
    });

    if (!holdResult.success || !holdResult.holdId) {
      throw {
        statusCode: 402,
        code: "INSUFFICIENT_CREDITS",
        message: "Insufficient credits to generate Auto-Write caption concept.",
        requiredCredits: creditsToCharge,
      };
    }

    const holdId = holdResult.holdId;
    let jobId: string | null = null;

    try {
      // 2. Log Generation Job in Supabase
      const job = await aiJobRepository.createJob({
        workspaceId,
        requestedBy: userId,
        provider: "google-gemini",
        modelRequested: model,
        operation: "text-autowrite",
        creditsReserved: creditsToCharge,
        idempotencyKey: clientKey,
      });
      jobId = job?.id || null;

      // 3. Build Trusted Context
      const systemInstruction = this.buildSystemInstruction(
        emotion,
        platforms,
        request.targetLanguage
      );

      const brand = request.brandContext;
      const brandContextParts: string[] = [];
      if (brand?.name) brandContextParts.push(`Brand Name: ${brand.name}`);
      if (brand?.industry) brandContextParts.push(`Industry: ${brand.industry}`);
      if (brand?.tone) brandContextParts.push(`Brand Tone: ${brand.tone}`);
      if (brand?.pillars && brand.pillars.length > 0) {
        brandContextParts.push(`Core Brand Pillars: ${brand.pillars.join(", ")}`);
      }
      if (brand?.targetAudience) {
        brandContextParts.push(`Target Audience: ${brand.targetAudience}`);
      }
      if (brand?.location) brandContextParts.push(`Region: ${brand.location}`);

      const product = request.productContext;
      const productParts: string[] = [];
      if (product?.name) productParts.push(`Product Name: ${product.name}`);
      if (product?.details) productParts.push(`Product Details: ${product.details}`);

      const userMessage = `
BRAND GUIDELINES:
${brandContextParts.length > 0 ? brandContextParts.join("\n") : "General modern commercial brand."}

${productParts.length > 0 ? `PRODUCT CONTEXT:\n${productParts.join("\n")}\n` : ""}
<untrusted_user_intent>
${request.userIntent ? request.userIntent.trim() : "Create a high-impact social media campaign."}
</untrusted_user_intent>

Generate a strategic creative concept and platform-adapted captions for: ${platforms.join(", ")}.
`.trim();

      // 4. Invoke Gemini Interactions API with Structured Schema
      const ai = getServerAI();
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          concept: {
            type: Type.OBJECT,
            properties: {
              angle: { type: Type.STRING },
              coreMessage: { type: Type.STRING },
              emotionalTone: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              keyBenefit: { type: Type.STRING },
            },
            required: [
              "angle",
              "coreMessage",
              "emotionalTone",
              "targetAudience",
              "keyBenefit",
            ],
          },
          captions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                platform: { type: Type.STRING },
                hook: { type: Type.STRING },
                body: { type: Type.STRING },
                cta: { type: Type.STRING },
                hashtags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["platform", "hook", "body"],
            },
          },
        },
        required: ["concept", "captions"],
      };

      const interaction = await ai.interactions.create({
        model,
        input: userMessage,
        system_instruction: systemInstruction,
        generation_config: {
          thinking_level: request.quality === "premium" ? "medium" : "low",
        } as any,
      });

      const rawJson = interaction.output_text?.trim() || "{}";
      const sanitizedJson = sanitizeTextOutput(rawJson);
      let parsed: any;
      try {
        parsed = JSON.parse(sanitizedJson);
      } catch (parseErr) {
        // Safe recovery if markdown backticks wrap the JSON
        const matched = sanitizedJson.match(/\{[\s\S]*\}/);
        if (matched) {
          parsed = JSON.parse(matched[0]);
        } else {
          throw new Error("Failed to parse structured Auto-Write response from model.");
        }
      }

      if (!parsed.concept || !parsed.captions || !Array.isArray(parsed.captions)) {
        throw new Error("Invalid structured schema returned by model.");
      }

      const idea: TextAutoWriteIdea = {
        concept: {
          angle: parsed.concept.angle || "Strategic Creative Angle",
          coreMessage: parsed.concept.coreMessage || request.userIntent || "Elevating our brand presence.",
          emotionalTone: emotion,
          targetAudience: parsed.concept.targetAudience || brand?.targetAudience || "Target Audience",
          keyBenefit: parsed.concept.keyBenefit || "Premium quality and distinct craft.",
        },
        captions: parsed.captions.map((c: any) => ({
          platform: c.platform || "Platform",
          hook: c.hook || "",
          body: c.body || "",
          cta: c.cta || undefined,
          hashtags: Array.isArray(c.hashtags) ? c.hashtags : [],
        })),
        formattedCopy: "",
      };

      idea.formattedCopy = this.formatMarkdownCopy(idea);

      // 5. Capture Credit Reservation
      const captureResult = await creditService.captureCredits(
        holdId,
        `capture_${clientKey}`
      );
      const newBalance =
        captureResult.newBalance ?? (captureResult as any)?.new_balance;

      // 6. Complete Job & Record Usage
      if (jobId) {
        await aiJobRepository.completeJob({
          jobId,
          modelUsed: model,
          creditsCharged: creditsToCharge,
          outputs: [],
        });

        await aiJobRepository.recordUsage({
          workspaceId,
          userId,
          jobId,
          provider: "google-gemini",
          model,
          operation: "text-autowrite",
          inputUnits: (interaction.usage as any)?.total_input_tokens || 150,
          outputUnits: (interaction.usage as any)?.total_output_tokens || 350,
          providerCostMicrounits: 1000,
          creditsCharged: creditsToCharge,
        });
      }

      return {
        success: true,
        idea,
        modelUsed: model,
        creditsCharged: creditsToCharge,
        newBalance,
      };
    } catch (err: any) {
      // On failure: release the credit hold
      await creditService
        .releaseCredits(holdId, err?.message || "Text Auto-Write failed")
        .catch(() => {});
      if (jobId) {
        await aiJobRepository
          .failJob(jobId, err?.code || "AUTOWRITE_FAILED", err?.message || "Failed to generate Auto-Write idea")
          .catch(() => {});
      }
      throw err;
    }
  }
}

export const textAutoWriteService = new TextAutoWriteService();
