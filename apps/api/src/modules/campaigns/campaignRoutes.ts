/**
 * Campaign Module Router: Prompts, Rendering, and Video generation.
 * Routes: POST /api/campaign/prompts, POST /api/campaign/render, POST /api/campaign/video, POST /api/campaign/video-poll
 */

import { Router } from "express";
import { Type } from "@google/genai";
import { getServerAI } from "../../infrastructure/gemini/serverGeminiClient.js";
import { renderFalImage, createFalVideoJob, pollFalVideoJob, resolveFalKey } from "../../infrastructure/fal/falClient.js";
import { generatePollinationsFallback } from "../../infrastructure/fallback/pollinationsFallback.js";
import { CreditService } from "../../services/creditService.js";
import { workspaceRepository } from "../../repositories/workspaceRepository.js";

const creditService = new CreditService();

export const campaignRouter = Router();

// Cohesive campaign prompt generation endpoint using Google GenAI
campaignRouter.post("/prompts", async (req, res) => {
  try {
    const { concept, commerceMode, guidelines, referenceContexts } = req.body;
    if (!concept) {
      return res.status(400).json({ error: "Missing campaign product description concept" });
    }

    console.log(`Generating cohesive prompts for concept: "${concept}" [Mode: ${commerceMode || 'default'}]`);

    const guidelinesContext = guidelines
      ? `
Brand Guidelines Context:
- Brand Name: ${guidelines.name || 'Not Specified'}
- Industry: ${guidelines.industry || 'Not Specified'}
- Pillars: ${(guidelines.pillars || []).join(', ')}
- Tone: ${guidelines.tone || 'Not Specified'}
- Prime Colors: ${(guidelines.colors || []).join(', ')}
- Location/Target: ${guidelines.location || 'India'}
- Target Voicestyle: ${guidelines.voiceAccentStyle || 'Indian English'}
- Ethnic Demographics: ${guidelines.visualEthnicityStyle || 'Indian'}
`
      : '';

    const referenceDescription = referenceContexts
      ? `
Reference Contexts Available:
- Product Reference uploaded: ${referenceContexts.hasProduct ? 'Yes, product photo' : 'No (Use fallback to guidelines/description)'}
- Face/Model Reference uploaded: ${referenceContexts.hasFace ? 'Yes, model/face photo' : 'No'}
- Logo Reference uploaded: ${referenceContexts.hasLogo ? 'Yes, guidelines logo' : 'No'}
`
      : '';

    const userTonePrompt = `
You are an award-winning Creative Director. Solve the following task:
Generate 5 cohesive, high-fashion, complementary image prompts suitable for a premium visual digital campaign centered on the product: "${concept}".

Commerce Mode: ${
      commerceMode === 'quick-commerce'
        ? 'Quick-Commerce (High visual impact, clear delivery details, clean uncluttered arrangements, extremely fast visual readability, vibrant pop framing)'
        : 'E-commerce (Editorial, rich storytelling, natural setting, studio premium soft lighting)'
    }

${guidelinesContext}
${referenceDescription}

CULTURAL/REGIONAL GUIDELINE:
Any human model, face, or characters described in the prompts MUST look like they belong to the '${
      guidelines?.visualEthnicityStyle || 'Indian'
    }' ethnic demographic. The environment, clothing, props, and lifestyle context must naturally and premiumly reflect a gorgeous contemporary style in ${
      guidelines?.location || 'India'
    }. Avoid generic default western styles.

DELIVERABLE SPECIFICS (You must generate prompt descriptions for these exact 5 assets):
1. 'Hero' Asset: A grand overarching banner displaying the key branding product, epic cinematic lighting, breathtaking clean framing.
2. 'Closeup' Asset: A macro-focus shot centering beautiful rich textures, delicate organic details, or glossy material finish of the product.
3. 'Lifestyle' Asset: A lifestyle/ambient scene featuring the product active in a real premium scenario (e.g. skin routine, kitchen counter, active run in local landmarks) styled with high-fashion models/faces matching the target ethnic demographic.
4. 'Offer' Asset: A beautifully polished commercial backdrop designed with generous breathing space, sleek flat lays, or side-lit empty area perfectly suited for clean overlay of digital discount tags or deal text.
5. 'Alternate' Asset: A creative, artistic or alternative color-mood variation that introduces a distinct perspective while sharing the unified aesthetic palette.

COHESION LAW: All 5 prompts must explicitly share a singular aesthetic, color temperature, lighting philosophy, and artistic direction. State this unified style directory in the "aesthetic" field.

Construct a gorgeous JSON response matching the precise structure schema requested.
`;

    const gClient = getServerAI();
    const promptResponse = await gClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userTonePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            campaign_title: { type: Type.STRING, description: "A catchy high-end title for this visual campaign" },
            aesthetic: { type: Type.STRING, description: "A high-level description of the unified visual aesthetic direction" },
            assets: {
              type: Type.OBJECT,
              properties: {
                Hero: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING, description: "Highly detailed visual description prompt for the image engine" }
                  },
                  required: ["title", "role", "description", "prompt"]
                },
                Closeup: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING, description: "Highly detailed visual description prompt for the image engine" }
                  },
                  required: ["title", "role", "description", "prompt"]
                },
                Lifestyle: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING, description: "Highly detailed visual description prompt for the image engine" }
                  },
                  required: ["title", "role", "description", "prompt"]
                },
                Offer: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING, description: "Highly detailed visual description prompt for the image engine" }
                  },
                  required: ["title", "role", "description", "prompt"]
                },
                Alternate: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING, description: "Highly detailed visual description prompt for the image engine" }
                  },
                  required: ["title", "role", "description", "prompt"]
                }
              },
              required: ["Hero", "Closeup", "Lifestyle", "Offer", "Alternate"]
            }
          },
          required: ["campaign_title", "aesthetic", "assets"]
        }
      }
    });

    if (!promptResponse.text) {
      throw new Error("No response string from Gemini");
    }

    const campaignData = JSON.parse(promptResponse.text.trim());
    return res.json(campaignData);
  } catch (e: any) {
    console.error("Error generating campaign prompts:", e);
    return res.status(500).json({ error: e.message || "Failed to generate cohesive campaign prompts" });
  }
});

// Secure Image Generation endpoint (delegates to ImageGenerationService)
campaignRouter.post("/render", async (req, res) => {
  try {
    const { prompt, size, engine, guidelines, referenceImages } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing render prompt text" });
    }

    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: Authenticated user session required.", code: "AUTH_REQUIRED" });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

    let aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" = "1:1";
    if (size === "16:9" || size === "9:16" || size === "4:3") {
      aspectRatio = size;
    }

    let modelKey = "fal-studio";
    const eng = (engine || "").toLowerCase();
    if (eng.includes("schnell")) {
      modelKey = "flux-schnell";
    } else if (eng.includes("dev") || eng.includes("pro")) {
      modelKey = "flux-pro";
    } else if (eng.includes("banana")) {
      modelKey = "nano-banana-2";
    } else if (eng.includes("gemini")) {
      modelKey = "gemini-preview";
    }

    const { imageGenerationService } = await import("../imageGeneration/imageGenerationService.js");

    const result = await imageGenerationService.generateImage({
      request: {
        prompt,
        aspectRatio,
        modelKey,
        guidelines,
        referenceImages,
      },
      workspaceId,
      userId,
      idempotencyKey: req.headers["x-idempotency-key"] as string | undefined,
    });

    return res.json({
      url: result.images[0]?.url || "",
      engine: result.model,
      isFallback: false,
      newBalance: result.newBalance,
      assetId: result.images[0]?.assetId,
    });
  } catch (e: any) {
    console.error("Error rendering creative asset image:", e);
    const status = e.status || 500;
    return res.status(status).json({
      error: e.message || "Failed to render asset image",
      code: e.code || "RENDER_FAILED",
      available: e.available,
      required: e.required,
    });
  }
});

// Secure Video Generation proxy endpoint calling Fal AI
campaignRouter.post("/video", async (req, res) => {
  try {
    const { prompt, size, engine } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing video generation prompt text" });
    }

    console.log(`Starting Fal Video Generation: "${prompt.slice(0, 40)}..." Engine: ${engine}. Size: ${size}`);

    const targetFalKey = resolveFalKey();
    if (!targetFalKey) {
      return res.status(400).json({ error: "FAL_API_KEY environment variable is required for ByteDance/Kling video generation" });
    }

    const jobResult = await createFalVideoJob(prompt, size, engine);
    return res.json(jobResult);
  } catch (e: any) {
    console.error("Error setting up Fal video generation queue:", e);
    return res.status(500).json({ error: e.message || "Failed to initialize video generation" });
  }
});

// Polling endpoint for Fal AI video queue status
campaignRouter.post("/video-poll", async (req, res) => {
  try {
    const { operation } = req.body;
    if (!operation || !operation.status_url) {
      return res.status(400).json({ error: "Missing status tracking descriptors in payload" });
    }

    const targetFalKey = resolveFalKey();
    if (!targetFalKey) {
      return res.status(400).json({ error: "FAL_API_KEY is required to check status" });
    }

    const pollResult = await pollFalVideoJob(operation);
    return res.json(pollResult);
  } catch (e: any) {
    console.error("Error polling Fal video status:", e);
    return res.status(500).json({ error: e.message || "Failed to check generation status" });
  }
});
