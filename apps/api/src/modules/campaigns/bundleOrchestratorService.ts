/**
 * Ecommerce Bundle Orchestrator Domain Service.
 * Central production orchestrator for multi-asset ecommerce campaign generation.
 * Enforces:
 * 1. Idempotency protection against duplicate requests.
 * 2. Canonical engine resolution & dynamic role manifest pricing.
 * 3. Upfront atomic credit holds across all assets with strict balance validation.
 * 4. Reference normalization (converting inline data URIs to stable private storage URLs).
 * 5. Concurrency-controlled worker queue (concurrency = 2) for backend-managed execution.
 * 6. Atomic per-asset settlement: capture on success, release on failure.
 * 7. Persisted job status & auditable billing ledger.
 */

import crypto from "crypto";
import { Type } from "@google/genai";
import { getServerAI } from "../../infrastructure/gemini/serverGeminiClient.js";
import { creditService } from "../../services/creditService.js";
import { storageService } from "../../services/storageService.js";
import { aiJobRepository } from "../../repositories/aiJobRepository.js";
import { historyRepository } from "../../repositories/historyRepository.js";
import { imageGenerationService } from "../imageGeneration/imageGenerationService.js";
import { InsufficientCreditsError } from "../billing/billingErrorUtils.js";
import {
  AssetReference,
  RenderEngine,
  resolveCanonicalEngine,
  ECOMMERCE_BUNDLE_ROLES,
  BundleRoleSpec,
  EngineRegistryEntry,
} from "@shared-types/imageGeneration.js";
import type { BrandGuidelines } from "@shared-types/brand.js";

export interface GenerateBundleParams {
  concept: string;
  commerceMode?: "e-commerce" | "quick-commerce";
  engine?: string;
  guidelines?: BrandGuidelines;
  references?: AssetReference[];
  workspaceId: string;
  userId: string;
  idempotencyKey: string;
}

export interface AssetExecutionDetail {
  role: "Hero" | "Closeup" | "Lifestyle" | "Offer" | "Alternate";
  title: string;
  description: string;
  prompt: string;
  imageUrl?: string;
  status: "idle" | "generating" | "success" | "failed";
  error?: string;
  warning?: string;
  isFallback?: boolean;
  assetId?: string;
}

export interface BundleExecutionResult {
  bundleId: string;
  campaign_title: string;
  aesthetic: string;
  engine: EngineRegistryEntry;
  assets: Record<string, AssetExecutionDetail>;
  billingLedger: {
    bundleId: string;
    totalReserved: number;
    successfulCount: number;
    failedCount: number;
    totalConsumed: number;
    totalReleased: number;
    availableBalance: number;
  };
  exportReady: boolean;
  isReplay?: boolean;
}

// In-memory idempotency cache for fast replaying duplicate requests
const idempotentBundleCache = new Map<string, BundleExecutionResult>();

export class BundleOrchestratorService {
  /**
   * Helper to run an array of async functions with bounded concurrency (concurrency = 2).
   */
  private async runWithConcurrency<T>(
    tasks: (() => Promise<T>)[],
    concurrency = 2
  ): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < tasks.length) {
        const currentIndex = nextIndex++;
        results[currentIndex] = await tasks[currentIndex]();
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
  }

  /**
   * Normalizes reference images: uploads data URIs to private Supabase storage
   * and converts them to stable, accessible signed URLs so provider adapters receive HTTP URLs.
   */
  async normalizeReferences(
    references: AssetReference[] | undefined,
    workspaceId: string,
    userId: string,
    bundleId: string
  ): Promise<AssetReference[]> {
    if (!references || references.length === 0) return [];

    const normalized: AssetReference[] = [];

    for (let i = 0; i < references.length; i++) {
      const ref = references[i];

      if (ref.source.kind === "url") {
        normalized.push(ref);
        continue;
      }

      // Handle data_uri: convert to buffer and upload to storage
      if (ref.source.kind === "data_uri" && ref.source.dataUri) {
        try {
          const dataUri = ref.source.dataUri;
          const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);

          if (!match) {
            console.warn(`[BundleOrchestrator] Malformed dataUri in reference ${ref.id}, skipping upload.`);
            normalized.push(ref);
            continue;
          }

          const mimeType = match[1] || "image/png";
          const buffer = Buffer.from(match[2], "base64");
          const storagePath = `campaign-references/${userId}/${bundleId}_${ref.id || i}.png`;

          await storageService.uploadFile({
            workspaceId,
            path: storagePath,
            fileBuffer: buffer,
            contentType: mimeType,
          });

          const signedUrl = await storageService.getSignedUrl(
            `${workspaceId}/${storagePath}`,
            86400
          );

          if (signedUrl) {
            normalized.push({
              ...ref,
              source: {
                kind: "url",
                url: signedUrl,
              },
            });
            continue;
          }
        } catch (uploadErr) {
          console.error(`[BundleOrchestrator] Failed uploading reference ${ref.id} to storage:`, uploadErr);
        }
      }

      normalized.push(ref);
    }

    return normalized;
  }

  /**
   * Generates cohesive visual prompts for all 5 bundle assets using Google Gemini.
   */
  async generateCohesivePrompts(params: {
    concept: string;
    commerceMode?: "e-commerce" | "quick-commerce";
    guidelines?: BrandGuidelines;
    references?: AssetReference[];
  }): Promise<{
    campaign_title: string;
    aesthetic: string;
    prompts: Record<string, { title: string; description: string; prompt: string }>;
  }> {
    const { concept, commerceMode, guidelines, references } = params;

    const guidelinesContext = guidelines
      ? `
Brand Guidelines Context:
- Brand Name: ${guidelines.name || "Not Specified"}
- Industry: ${guidelines.industry || "Not Specified"}
- Pillars: ${(guidelines.pillars || []).join(", ")}
- Tone: ${guidelines.tone || "Not Specified"}
- Prime Colors: ${(guidelines.colors || []).join(", ")}
- Location/Target: ${guidelines.location || "India"}
- Target Voicestyle: ${guidelines.voiceAccentStyle || "Indian English"}
- Ethnic Demographics: ${guidelines.visualEthnicityStyle || "Indian"}
`
      : "";

    const referenceContext = references && references.length > 0
      ? `
Reference Contexts Attached:
${references.map((r) => `- Type: ${r.type}, Role: ${r.role}, Instructions: ${r.instructions || "Preserve exactly"}`).join("\n")}
`
      : "No direct reference photos attached (use guidelines/description as primary guide)";

    const promptText = `
You are an award-winning Creative Director. Solve the following task:
Generate 5 cohesive, high-fashion, complementary image prompts suitable for a premium visual digital marketing campaign centered on the product: "${concept}".

Commerce Mode: ${
      commerceMode === "quick-commerce"
        ? "Quick-Commerce (High visual impact, clear delivery details, vibrant pop framing, fast visual readability)"
        : "E-commerce (Editorial storytelling, natural setting, studio premium soft lighting)"
    }

${guidelinesContext}
${referenceContext}

CULTURAL/REGIONAL GUIDELINE:
Any human model, face, or characters described in the prompts MUST look like they belong to the '${
      guidelines?.visualEthnicityStyle || "Indian"
    }' ethnic demographic in ${guidelines?.location || "India"}.

DELIVERABLES REQUIRED (Exact 5 roles):
1. 'Hero': Grand overarching banner displaying key branding product, epic lighting, 16:9 framing.
2. 'Closeup': Macro-focus shot highlighting rich product textures, glossy finish, 1:1 framing.
3. 'Lifestyle': Ambient scene with product in contemporary usage with target demographic, 3:4 framing.
4. 'Offer': Commercial promotional backdrop with generous negative space for discount text overlays, 1:1 framing.
5. 'Alternate': Alternative artistic mood sharing the unified palette, 1:1 framing.

COHESION LAW: All 5 prompts must share a singular aesthetic, color temperature, and lighting philosophy.
State this unified style in the "aesthetic" field.
`;

    const gClient = getServerAI();
    const geminiRes = await gClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            campaign_title: { type: Type.STRING },
            aesthetic: { type: Type.STRING },
            assets: {
              type: Type.OBJECT,
              properties: {
                Hero: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING },
                  },
                  required: ["title", "description", "prompt"],
                },
                Closeup: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING },
                  },
                  required: ["title", "description", "prompt"],
                },
                Lifestyle: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING },
                  },
                  required: ["title", "description", "prompt"],
                },
                Offer: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING },
                  },
                  required: ["title", "description", "prompt"],
                },
                Alternate: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING },
                  },
                  required: ["title", "description", "prompt"],
                },
              },
              required: ["Hero", "Closeup", "Lifestyle", "Offer", "Alternate"],
            },
          },
          required: ["campaign_title", "aesthetic", "assets"],
        },
      },
    });

    if (!geminiRes.text) {
      throw new Error("No response string from Gemini during cohesive prompt generation");
    }

    const parsed = JSON.parse(geminiRes.text.trim());
    return {
      campaign_title: parsed.campaign_title,
      aesthetic: parsed.aesthetic,
      prompts: parsed.assets,
    };
  }

  /**
   * Main orchestrator: generates the complete 5-asset ecommerce campaign bundle.
   */
  async generateBundle(params: GenerateBundleParams): Promise<BundleExecutionResult> {
    const {
      concept,
      commerceMode = "e-commerce",
      engine: engineInput,
      guidelines,
      references: rawReferences,
      workspaceId,
      userId,
      idempotencyKey,
    } = params;

    // 1. Check idempotency cache
    const cacheKey = `bundle_${workspaceId}_${idempotencyKey}`;
    const cached = idempotentBundleCache.get(cacheKey);
    if (cached) {
      console.log(`[BundleOrchestrator] Idempotency hit for key ${idempotencyKey}. Returning cached result.`);
      return { ...cached, isReplay: true };
    }

    // 2. Resolve canonical engine and dynamic role manifest pricing
    const engineEntry = resolveCanonicalEngine(engineInput);
    const bundleId = `bundle_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const roleSpecs = ECOMMERCE_BUNDLE_ROLES;
    const creditsPerAsset = engineEntry.creditsPerAsset;
    const totalRequired = roleSpecs.length * creditsPerAsset;

    console.log(
      `[BundleOrchestrator] Initiating bundle ${bundleId} (${roleSpecs.length} assets, ${creditsPerAsset} cr/asset = ${totalRequired} total) on engine '${engineEntry.engine}'`
    );

    // 3. Verify balance and reserve credits atomically upfront
    const currentBalance = await creditService.getAvailableBalance(workspaceId).catch(() => 0);
    if (currentBalance < totalRequired) {
      throw new InsufficientCreditsError({
        service: "Ecommerce Bundle Orchestrator",
        requiredCredits: totalRequired,
        availableCredits: currentBalance,
        customMessage: `Insufficient credits to initiate Ecommerce Bundle. Required: ${totalRequired}, Available: ${currentBalance}.`,
      });
    }

    // Atomically reserve individual holds upfront per asset
    // This allows granular per-asset capture on success and release on failure
    const reservedHolds: { role: string; holdId: string }[] = [];
    try {
      for (const spec of roleSpecs) {
        const holdRes = await creditService.reserveCredits({
          workspaceId,
          userId,
          amount: creditsPerAsset,
          referenceId: `${bundleId}_${spec.role}`,
          description: `Ecommerce Bundle ${spec.role} (${engineEntry.label})`,
          idempotencyKey: `hold_${bundleId}_${spec.role}_${idempotencyKey}`,
        });

        if (!holdRes.success || !holdRes.holdId) {
          throw new InsufficientCreditsError({
            service: "Ecommerce Bundle Orchestrator",
            requiredCredits: totalRequired,
            availableCredits: holdRes.available ?? currentBalance,
            customMessage: "Credit reservation failed during bundle hold setup.",
          });
        }

        reservedHolds.push({ role: spec.role, holdId: holdRes.holdId });
      }
    } catch (holdErr) {
      // Rollback any holds acquired before failure
      console.error("[BundleOrchestrator] Batch reservation failed. Rolling back partial holds:", holdErr);
      for (const item of reservedHolds) {
        await creditService.releaseCredits(item.holdId, "Bundle reservation initialization rollback").catch(() => {});
      }
      throw holdErr;
    }

    // 4. Normalize reference assets (converting data URIs to stable storage URLs)
    const normalizedReferences = await this.normalizeReferences(
      rawReferences,
      workspaceId,
      userId,
      bundleId
    );

    // Extract reference URLs for image models
    const referenceUrls = normalizedReferences
      .filter((r) => r.source.kind === "url" && Boolean(r.source.url))
      .map((r) => (r.source as { kind: "url"; url: string }).url);

    // 5. Generate cohesive creative prompts
    let campaignBrief;
    try {
      campaignBrief = await this.generateCohesivePrompts({
        concept,
        commerceMode,
        guidelines,
        references: normalizedReferences,
      });
    } catch (promptErr: any) {
      // Release all holds if prompt planning fails
      console.error("[BundleOrchestrator] Prompt planning failed. Releasing all holds:", promptErr);
      for (const item of reservedHolds) {
        await creditService.releaseCredits(item.holdId, "Prompt planning error").catch(() => {});
      }
      throw promptErr;
    }

    // 6. Execute 5 asset generation jobs with controlled concurrency (concurrency = 2)
    const assetResults: Record<string, AssetExecutionDetail> = {};
    let successfulCount = 0;
    let failedCount = 0;

    const assetTasks = roleSpecs.map((spec) => {
      const holdItem = reservedHolds.find((h) => h.role === spec.role);
      const holdId = holdItem?.holdId;
      const plannedPrompt = campaignBrief.prompts[spec.role] || {
        title: `${spec.role} Deliverable`,
        description: spec.description,
        prompt: `${concept}, ${spec.title}`,
      };

      return async (): Promise<AssetExecutionDetail> => {
        try {
          console.log(`[BundleOrchestrator] Generating ${spec.role} (${spec.aspectRatio}) on ${engineEntry.modelKey}...`);

          const genResult = await imageGenerationService.generateImage({
            request: {
              prompt: plannedPrompt.prompt,
              aspectRatio: spec.aspectRatio as any,
              modelKey: engineEntry.modelKey,
              quality: engineEntry.engine === "premium" ? "premium" : "standard",
              guidelines,
              references: normalizedReferences,
              referenceImages: referenceUrls.length > 0 ? referenceUrls : undefined,
            },
            workspaceId,
            userId,
            idempotencyKey: `${idempotencyKey}_${spec.role}`,
          });

          // Settle hold on success
          if (holdId) {
            await creditService.captureCredits(holdId, `capture_${holdId}`).catch((err) => {
              console.warn(`[BundleOrchestrator] Failed settling hold ${holdId} (may already be captured):`, err.message);
            });
          }

          successfulCount++;
          return {
            role: spec.role,
            title: plannedPrompt.title,
            description: plannedPrompt.description,
            prompt: plannedPrompt.prompt,
            imageUrl: genResult.images[0]?.url || "",
            status: "success",
            assetId: genResult.images[0]?.assetId,
          };
        } catch (assetErr: any) {
          console.error(`[BundleOrchestrator] Asset ${spec.role} failed:`, assetErr.message);

          // Release hold on failure (refund credit back to user balance)
          if (holdId) {
            await creditService.releaseCredits(
              holdId,
              `Asset ${spec.role} generation failed: ${assetErr.message || "Provider Error"}`
            ).catch(() => {});
          }

          failedCount++;
          return {
            role: spec.role,
            title: plannedPrompt.title,
            description: plannedPrompt.description,
            prompt: plannedPrompt.prompt,
            status: "failed",
            error: assetErr.message || "Failed to render asset",
          };
        }
      };
    });

    const completedDetails = await this.runWithConcurrency(assetTasks, 2);

    for (const detail of completedDetails) {
      assetResults[detail.role] = detail;
    }

    // 7. Calculate final billing ledger
    const totalConsumed = successfulCount * creditsPerAsset;
    const totalReleased = failedCount * creditsPerAsset;
    const newAvailable = await creditService.getAvailableBalance(workspaceId).catch(() => 0);

    const billingLedger = {
      bundleId,
      totalReserved: totalRequired,
      successfulCount,
      failedCount,
      totalConsumed,
      totalReleased,
      availableBalance: newAvailable,
    };

    console.log(
      `[BundleOrchestrator] Bundle ${bundleId} finished. Success: ${successfulCount}, Failed: ${failedCount}, Consumed: ${totalConsumed} cr, Released: ${totalReleased} cr.`
    );

    const finalResult: BundleExecutionResult = {
      bundleId,
      campaign_title: campaignBrief.campaign_title,
      aesthetic: campaignBrief.aesthetic,
      engine: engineEntry,
      assets: assetResults,
      billingLedger,
      exportReady: successfulCount > 0,
      isReplay: false,
    };

    // Store in history
    await historyRepository.addHistory({
      workspaceId,
      userId,
      jobId: bundleId,
      gemId: "bundles-campaigns",
      title: `Campaign: ${campaignBrief.campaign_title}`,
      prompt: concept,
      resultSummary: {
        campaign_title: campaignBrief.campaign_title,
        aesthetic: campaignBrief.aesthetic,
        engine: engineEntry.label,
        successfulAssets: successfulCount,
        creditsConsumed: totalConsumed,
      },
    }).catch((hErr) => console.warn("[BundleOrchestrator] Failed writing history record:", hErr));

    // Cache idempotent result
    idempotentBundleCache.set(cacheKey, finalResult);

    return finalResult;
  }
}

export const bundleOrchestratorService = new BundleOrchestratorService();
