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
import { campaignStrategyService } from "./campaignStrategyService.js";
import { campaignRepository } from "./campaignRepository.js";
import { campaignDownstreamOrchestrator } from "./campaignDownstreamOrchestrator.js";
import { videoAdProjectRepository } from "../adDirector/repositories/videoAdProjectRepository.js";
import { sendInsufficientCreditsResponse, InsufficientCreditsError } from "../billing/billingErrorUtils.js";
import JSZip from "jszip";
import { bundleOrchestratorService } from "./bundleOrchestratorService.js";
import { validateSafeAssetUrl } from "./services/ssrfValidator.js";
import { resolveCanonicalEngine, AssetReference } from "@shared-types/imageGeneration.js";

const creditService = new CreditService();

export const campaignRouter = Router();

// ============================================================================
// Campaign Strategist 2.0 Strategic Intelligence Endpoints
// ============================================================================

// 1. Dynamic Adaptive Discovery Questions
campaignRouter.post(["/strategy/discovery-questions", "/strategy/discovery"], async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: Authenticated session required", code: "AUTH_REQUIRED" });
    }

    const {
      sessionId = `sess_${Date.now()}`,
      generationId = `gen_${Date.now()}`,
      campaignTitle,
      briefDescription,
      brandName,
      industry,
      objective,
      targetAudience,
      priorAnswers,
      controls
    } = req.body;

    if (!campaignTitle || !briefDescription) {
      return res.status(400).json({ error: "Missing required campaignTitle or briefDescription" });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

    const result = await campaignStrategyService.getDiscoveryQuestions({
      sessionId,
      generationId,
      workspaceId,
      campaignTitle,
      briefDescription,
      brandName,
      industry,
      objective,
      targetAudience,
      priorAnswers,
      controls
    });

    return res.json(result);
  } catch (err: any) {
    console.error("Error in /strategy/discovery-questions:", err);
    return res.status(500).json({ error: err?.message || "Failed to evaluate discovery questions" });
  }
});

// 2. Strategic Routes (Territories) Generator
campaignRouter.post("/strategy/territories", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: Authenticated session required", code: "AUTH_REQUIRED" });
    }

    const {
      sessionId = `sess_${Date.now()}`,
      generationId = `gen_${Date.now()}`,
      campaignTitle,
      briefDescription,
      brandName,
      industry,
      objective,
      targetAudience,
      discoveryAnswers,
      controls,
      directionVariant
    } = req.body;

    if (!campaignTitle || !briefDescription) {
      return res.status(400).json({ error: "Missing required campaignTitle or briefDescription" });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

    const territories = await campaignStrategyService.getTerritories({
      sessionId,
      generationId,
      workspaceId,
      campaignTitle,
      briefDescription,
      brandName,
      industry,
      objective,
      targetAudience,
      discoveryAnswers,
      controls,
      directionVariant
    });

    return res.json({ territories });
  } catch (err: any) {
    console.error("Error in /strategy/territories:", err);
    return res.status(500).json({ error: err?.message || "Failed to generate strategic territories" });
  }
});

// 3. Master Strategy Synthesis (Transactionally locks & captures 5 credits)
campaignRouter.post("/strategy/synthesize", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: Authenticated session required", code: "AUTH_REQUIRED" });
    }

    const {
      sessionId = `sess_${Date.now()}`,
      generationId = `gen_${Date.now()}`,
      campaignTitle,
      briefDescription,
      brandName,
      industry,
      objective,
      targetAudience,
      selectedTerritory,
      discoveryAnswers,
      language,
      controls,
      parentVersionId,
      changeReason
    } = req.body;

    if (!campaignTitle || !selectedTerritory) {
      return res.status(400).json({ error: "Missing required campaignTitle or selectedTerritory" });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

    const result = await campaignStrategyService.synthesizeStrategy({
      sessionId,
      generationId,
      workspaceId,
      userId,
      campaignTitle,
      briefDescription,
      brandName,
      industry,
      objective,
      targetAudience,
      selectedTerritory,
      discoveryAnswers,
      language,
      controls,
      parentVersionId,
      changeReason
    });

    return res.json(result);
  } catch (err: any) {
    console.error("Error in /strategy/synthesize:", err);
    if (err instanceof InsufficientCreditsError || err?.status === 402 || err?.message?.includes("Insufficient credits")) {
      return sendInsufficientCreditsResponse(res, {
        service: "Campaign Master Strategy",
        action: "synthesis",
        required: err.requiredCredits || err.required || 5,
        available: err.availableCredits ?? err.available
      });
    }
    return res.status(500).json({
      error: err?.message || "Failed to synthesize campaign strategy",
      code: "SYNTHESIS_FAILED"
    });
  }
});

// 4. "Ask the Strategist" Advisory Q&A and Patch Generation
campaignRouter.post("/strategy/ask", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: Authenticated session required", code: "AUTH_REQUIRED" });
    }

    const {
      sessionId = `sess_${Date.now()}`,
      strategyId,
      campaignTitle,
      currentStrategy,
      query,
      chatHistory
    } = req.body;

    if (!query || !currentStrategy) {
      return res.status(400).json({ error: "Missing required query or currentStrategy payload" });
    }

    const response = await campaignStrategyService.askStrategist(sessionId, {
      strategyId,
      campaignTitle: campaignTitle || currentStrategy.campaignTitle,
      currentStrategy,
      query,
      chatHistory
    });

    return res.json(response);
  } catch (err: any) {
    console.error("Error in /strategy/ask:", err);
    return res.status(500).json({ error: err?.message || "Failed to query strategist" });
  }
});

// 5. Apply Strategy Patch to Create v2 Snapshot
campaignRouter.post("/strategy/apply-patch", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: Authenticated session required", code: "AUTH_REQUIRED" });
    }

    const { strategyId, patch, currentStrategy } = req.body;
    if (!strategyId || !patch || !currentStrategy) {
      return res.status(400).json({ error: "Missing required strategyId, patch, or currentStrategy" });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

    const result = await campaignStrategyService.applyPatch({
      strategyId,
      patch,
      currentStrategy,
      userId,
      workspaceId
    });

    return res.json(result);
  } catch (err: any) {
    console.error("Error in /strategy/apply-patch:", err);
    return res.status(500).json({ error: err?.message || "Failed to apply strategy patch" });
  }
});

// 6. Strategy Stress Test Audit
campaignRouter.post("/strategy/stress-test", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: Authenticated session required", code: "AUTH_REQUIRED" });
    }

    const { strategy } = req.body;
    if (!strategy || !strategy.coreBigIdea) {
      return res.status(400).json({ error: "Missing required strategy object" });
    }

    const report = await campaignStrategyService.runStressTest(strategy);
    return res.json(report);
  } catch (err: any) {
    console.error("Error in /strategy/stress-test:", err);
    return res.status(500).json({ error: err?.message || "Failed to stress-test strategy" });
  }
});

// 7. Canonical AdSpec Compilation for Video Gem / Downstream Multimodal Pipeline
campaignRouter.post("/strategy/adspec", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: Authenticated session required", code: "AUTH_REQUIRED" });
    }

    const { strategy, territory, options, persistToProject = true } = req.body;
    if (!strategy || !territory) {
      return res.status(400).json({ error: "Missing required strategy or territory" });
    }

    const adSpec = campaignDownstreamOrchestrator.compileAdSpec(strategy, territory, options);
    
    let projectId: string | undefined;
    if (persistToProject) {
      try {
        const workspaceId =
          req.user.workspaceId ||
          (await workspaceRepository.ensurePersonalWorkspace(req.user.uid, req.user.email || ''));
        const projectTitle = strategy.campaignTitle || territory.name || "Campaign Video Project";
        const result = await videoAdProjectRepository.createProject(workspaceId, projectTitle, req.user.uid, adSpec);
        projectId = result.project.id;
      } catch (persistErr) {
        console.warn("Could not persist video project to repository, continuing with in-memory AdSpec:", persistErr);
      }
    }

    return res.json({ adSpec, projectId });
  } catch (err: any) {
    console.error("Error in /strategy/adspec:", err);
    return res.status(500).json({ error: err?.message || "Failed to compile canonical AdSpec" });
  }
});

// 4. Workspace Strategy Memory / History List
campaignRouter.get("/strategy/workspace-history", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

    const history = await campaignRepository.listWorkspaceStrategies(workspaceId);
    return res.json({ history });
  } catch (err: any) {
    console.error("Error in /strategy/workspace-history:", err);
    return res.status(500).json({ error: err?.message || "Failed to load workspace history" });
  }
});

// 5. Get Strategy by ID
campaignRouter.get("/strategy/:id", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

    const strategy = await campaignRepository.getStrategyById(req.params.id, workspaceId);
    if (!strategy) {
      return res.status(404).json({ error: "Campaign strategy not found" });
    }

    return res.json({ strategy });
  } catch (err: any) {
    console.error("Error in /strategy/:id:", err);
    return res.status(500).json({ error: err?.message || "Failed to load strategy" });
  }
});

// 6. Update / Rename Strategy
campaignRouter.patch("/strategy/:id", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
    }

    const { title, status } = req.body;
    if (!title && !status) {
      return res.status(400).json({ error: "At least title or status must be provided" });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

    const updated = await campaignRepository.updateStrategy(req.params.id, workspaceId, { title, status });
    if (!updated) {
      return res.status(404).json({ error: "Strategy not found or update failed" });
    }

    return res.json({ success: true, id: req.params.id, title, status });
  } catch (err: any) {
    console.error("Error in PATCH /strategy/:id:", err);
    return res.status(500).json({ error: err?.message || "Failed to update strategy" });
  }
});

// 7. Duplicate Strategy
campaignRouter.post("/strategy/:id/duplicate", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

    const duplicated = await campaignRepository.duplicateStrategy(req.params.id, workspaceId, userId);
    if (!duplicated) {
      return res.status(404).json({ error: "Original strategy not found to duplicate" });
    }

    return res.status(201).json({ success: true, strategy: duplicated });
  } catch (err: any) {
    console.error("Error in POST /strategy/:id/duplicate:", err);
    return res.status(500).json({ error: err?.message || "Failed to duplicate strategy" });
  }
});

// 8. Delete Strategy
campaignRouter.delete("/strategy/:id", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

    const deleted = await campaignRepository.deleteStrategy(req.params.id, workspaceId);
    if (!deleted) {
      return res.status(404).json({ error: "Strategy not found or delete failed" });
    }

    return res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    console.error("Error in DELETE /strategy/:id:", err);
    return res.status(500).json({ error: err?.message || "Failed to delete strategy" });
  }
});

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

// ============================================================================
// Ecommerce Bundle Orchestrator & Export Endpoints
// ============================================================================

// 1. Backend-Governed Bundle Generation Endpoint with Atomic Holds & Concurrency Control
campaignRouter.post("/bundle/generate", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: Authenticated user session required.", code: "AUTH_REQUIRED" });
    }

    const { concept, commerceMode, engine, guidelines, references } = req.body;
    if (!concept || typeof concept !== "string" || !concept.trim()) {
      return res.status(400).json({ error: "Missing required product concept description." });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ""));

    const idempotencyKey =
      (req.headers["idempotency-key"] as string) ||
      (req.headers["x-idempotency-key"] as string) ||
      `bundle_idemp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const bundleResult = await bundleOrchestratorService.generateBundle({
      concept: concept.trim(),
      commerceMode,
      engine,
      guidelines,
      references,
      workspaceId,
      userId,
      idempotencyKey,
    });

    return res.json(bundleResult);
  } catch (err: any) {
    console.error("Error in /bundle/generate:", err);

    if (err instanceof InsufficientCreditsError || err?.code === "INSUFFICIENT_CREDITS" || err?.status === 402 || err?.message?.includes("Insufficient credits")) {
      return sendInsufficientCreditsResponse(res, {
        service: "Ecommerce Bundle Orchestrator",
        action: "bundle_generate",
        required: err.requiredCredits || err.required || 15,
        available: err.availableCredits || err.available || 0,
      });
    }

    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Failed to generate ecommerce campaign bundle",
      code: err.code || "BUNDLE_FAILED",
    });
  }
});

// 2. SSRF-Safe Server-Side Bundle ZIP Exporter with Download Status Verification
campaignRouter.post("/bundle/export-zip", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: Authenticated user session required.", code: "AUTH_REQUIRED" });
    }

    const {
      bundleTitle = "Campaign Bundle",
      aesthetic = "Unified Visual Spec",
      commerceMode = "e-commerce",
      engine = "Quality",
      brandName = "Brand",
      assets = [],
      allowPartial = false,
    } = req.body;

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ error: "No asset specifications supplied for ZIP export." });
    }

    const downloadResults: Array<{
      role: string;
      title: string;
      filename: string;
      status: "downloaded" | "failed";
      buffer?: Buffer;
      error?: string;
    }> = [];

    // Safely download each remote asset with SSRF protection
    for (const item of assets) {
      const role = item.role || "Deliverable";
      const filename = `${role.toLowerCase()}-deliverable.jpg`;

      if (!item.imageUrl) {
        downloadResults.push({
          role,
          title: item.title || role,
          filename,
          status: "failed",
          error: "Asset has no rendered image URL",
        });
        continue;
      }

      // Enforce SSRF validation on target URL
      const ssrfCheck = validateSafeAssetUrl(item.imageUrl);
      if (!ssrfCheck.valid) {
        console.warn(`[ZIP Export] SSRF rejected asset URL for ${role}: ${ssrfCheck.error}`);
        downloadResults.push({
          role,
          title: item.title || role,
          filename,
          status: "failed",
          error: ssrfCheck.error,
        });
        continue;
      }

      try {
        const fetchRes = await fetch(item.imageUrl, {
          signal: AbortSignal.timeout(15000), // 15s download budget per asset
        });

        if (!fetchRes.ok) {
          throw new Error(`Remote storage returned HTTP ${fetchRes.status}: ${fetchRes.statusText}`);
        }

        const arrayBuf = await fetchRes.arrayBuffer();
        downloadResults.push({
          role,
          title: item.title || role,
          filename,
          status: "downloaded",
          buffer: Buffer.from(arrayBuf),
        });
      } catch (dlErr: any) {
        console.warn(`[ZIP Export] Download failed for ${role}:`, dlErr.message);
        downloadResults.push({
          role,
          title: item.title || role,
          filename,
          status: "failed",
          error: dlErr.message || "Failed downloading remote image",
        });
      }
    }

    const failedDownloads = downloadResults.filter((d) => d.status === "failed");
    const successfulDownloads = downloadResults.filter((d) => d.status === "downloaded");

    // Fail loudly if any assets failed and client has not explicitly authorized partial bundle
    if (failedDownloads.length > 0 && !allowPartial) {
      return res.status(400).json({
        success: false,
        partial: true,
        failedRoles: failedDownloads.map((d) => d.role),
        availableRoles: successfulDownloads.map((d) => d.role),
        message: `${failedDownloads.length} of ${assets.length} visual deliverables could not be downloaded from remote storage.`,
      });
    }

    // Assemble robust ZIP package using JSZip
    const zip = new JSZip();
    const folderSlug = bundleTitle.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const rootFolder = zip.folder(`${folderSlug}-bundle`);
    const assetsFolder = rootFolder?.folder("assets");

    let markdownContent = `# ${bundleTitle}\n\n`;
    markdownContent += `### Unified Campaign Aesthetic Spec\n> *${aesthetic}*\n\n`;
    markdownContent += `**Commerce Alignment Mode**: ${commerceMode}\n`;
    markdownContent += `**Engine Pipeline**: ${engine}\n`;
    markdownContent += `**Associated Corporate Profile**: ${brandName}\n\n`;
    markdownContent += `---\n\n## Multi-Asset Campaign Specs\n\n`;

    for (const item of assets) {
      const dl = downloadResults.find((d) => d.role === item.role);
      const isDownloaded = dl && dl.status === "downloaded" && dl.buffer;

      markdownContent += `### ${item.role} Deliverable\n`;
      markdownContent += `- **Creative Title**: ${item.title || item.role}\n`;
      markdownContent += `- **Deliverable Role**: ${item.role}\n`;
      markdownContent += `- **Target Purpose**: ${item.description || "Marketing Visual"}\n`;
      markdownContent += `- **Visual Prompt Written**: \`\`\`${item.prompt || ""}\`\`\`\n`;

      if (isDownloaded) {
        assetsFolder?.file(dl.filename, dl.buffer!);
        markdownContent += `- **Asset Binary**: Located inside \`assets/${dl.filename}\`\n`;
      } else {
        markdownContent += `- **Asset Binary**: (Download Incomplete / Remote Fallback: ${item.imageUrl || "None"})\n`;
      }
      markdownContent += `\n---\n\n`;
    }

    rootFolder?.file("campaign-spec.md", markdownContent);

    // Add machine-verifiable manifest.json
    rootFolder?.file(
      "manifest.json",
      JSON.stringify(
        {
          bundleTitle,
          exportTimestamp: new Date().toISOString(),
          assetsExpected: assets.length,
          assetsIncluded: successfulDownloads.length,
          assetsMissing: failedDownloads.map((f) => ({ role: f.role, error: f.error })),
          status: failedDownloads.length === 0 ? "complete" : "partial",
        },
        null,
        2
      )
    );

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${folderSlug}-marketing-pack.zip"`);
    res.setHeader("Content-Length", zipBuffer.length);
    return res.end(zipBuffer);
  } catch (exportErr: any) {
    console.error("Error generating bundle ZIP package:", exportErr);
    return res.status(500).json({ error: exportErr.message || "Failed to generate ZIP export package" });
  }
});

// 3. Modernized Secure Single Image Generation Endpoint (with Canonical Engine Mapping & References)
campaignRouter.post("/render", async (req, res) => {
  try {
    const { prompt, size, engine, guidelines, referenceImages, references } = req.body;
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

    // Resolve canonical engine cleanly via central registry
    const engineEntry = resolveCanonicalEngine(engine);
    const modelKey = engineEntry.modelKey;

    const { imageGenerationService } = await import("../imageGeneration/imageGenerationService.js");

    const result = await imageGenerationService.generateImage({
      request: {
        prompt,
        aspectRatio,
        modelKey,
        guidelines,
        referenceImages,
        references,
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
    if (e.status === 402 || e.code === "INSUFFICIENT_CREDITS" || e.message?.includes("Insufficient credits")) {
      return sendInsufficientCreditsResponse(res, {
        service: "Campaign Deck Visual",
        action: "image_render",
        required: e.required || 3,
        available: e.available
      });
    }
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
