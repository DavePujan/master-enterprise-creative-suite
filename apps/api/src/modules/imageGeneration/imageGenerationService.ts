/**
 * Image Generation Domain Service.
 * Central production orchestrator for image requests, capability checks, two-phase credit holds,
 * provider execution, Supabase Storage uploads, and database audit persistence.
 */

import type {
  NormalizedImageRequest,
  NormalizedImageResult,
  ImageModelDefinition,
} from "@shared-types/imageGeneration.js";
import { imageModelResolver } from "./imageModelResolver.js";
import { capabilityValidator } from "./capabilityValidator.js";
import { imagePromptBuilder } from "./imagePromptBuilder.js";
import { falImageProvider } from "./providers/fal/falImageProvider.js";
import { googleImageProvider } from "./providers/google/googleImageProvider.js";
import { creditService } from "../../services/creditService.js";
import { storageService } from "../../services/storageService.js";
import { assetRepository } from "../../repositories/assetRepository.js";
import { aiJobRepository } from "../../repositories/aiJobRepository.js";
import { historyRepository } from "../../repositories/historyRepository.js";

export class ImageGenerationService {
  async generateImage(params: {
    request: NormalizedImageRequest;
    workspaceId: string;
    userId: string;
    idempotencyKey?: string;
  }): Promise<NormalizedImageResult> {
    const { request, workspaceId, userId } = params;

    // 1. Resolve model definition from approved registry
    const { model, error: modelError } = imageModelResolver.resolve(request.modelKey);
    if (modelError) {
      const err = new Error(modelError.message);
      (err as any).status = modelError.status;
      (err as any).code = modelError.code;
      throw err;
    }

    /**
     * PRODUCTION & DEPLOYMENT ARCHITECTURE NOTES (FOR FUTURE REFERENCE):
     * 
     * 1. DEDICATED VPS / DOCKER / PERSISTENT NODE RUNTIMES (Render, Railway, Fly.io, EC2, VPS):
     *    - Inline base64 payloads work 100% reliably. Express is configured with `express.json({ limit: '50mb' })`.
     *    - Image generation adapters (Fal AI and Google GenAI) natively ingest base64 data URIs or inline image parts.
     *
     * 2. SERVERLESS PLATFORMS & EDGE GATEWAYS (Vercel Serverless Functions, AWS Lambda, Netlify):
     *    - Vercel Serverless Functions enforce a strict incoming request body limit of 4.5 MB (AWS Lambda: 6 MB).
     *    - When users upload multiple high-res photos (Product + Face + 3 Ingredients), raw uncompressed base64
     *      can exceed 4.5 MB and cause Vercel to return `413 Request Entity Too Large` before reaching Express.
     *    - Mitigation:
     *      a) Frontend `resizeImageIfNeeded` / `compressBase64Image` reduces dimensions to <= 768px JPEG (~150KB/image),
     *         keeping the combined JSON payload well under ~1 MB even with 5 images attached.
     *      b) For enterprise high-res assets (>4.5MB), use presigned direct-to-Supabase-Storage uploads from the client,
     *         passing true Supabase asset UUIDs instead of inline base64 data.
     *
     * 3. ASSET AUTHORIZATION VS INLINE LOCAL UPLOADS:
     *    - Workspace Database Assets: Validated via `UUID_REGEX` against `assetRepository.getById(id, workspaceId)`
     *      to ensure tenant isolation and prevent cross-workspace asset leakage.
     *    - Inline Local Uploads: Client-generated IDs (e.g. `product-context-*`, `face-context-*`) containing
     *      inline `data:` URLs are allowed directly without triggering false 403 UNAUTHORIZED_ASSET_ACCESS errors.
     */
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isDbUuid = (id?: string): boolean => !!id && UUID_REGEX.test(id);

    // 2. Authorize reference assets if persistent DB IDs provided; otherwise accept inline local uploads
    if (request.productReference?.enabled) {
      if (isDbUuid(request.productReference.assetId)) {
        const asset = await assetRepository.getById(request.productReference.assetId!, workspaceId);
        if (!asset) {
          const err = new Error("Product reference asset does not exist or does not belong to your workspace.");
          (err as any).status = 403;
          (err as any).code = "UNAUTHORIZED_ASSET_ACCESS";
          throw err;
        }
        if (!request.productReference.url) {
          request.productReference.url = (await storageService.getSignedUrl(asset.storagePath)) || undefined;
        }
      } else if (request.productReference.data && !request.productReference.url) {
        // Direct local PC upload (e.g., 'product-context-*' with base64 data)
        request.productReference.url = request.productReference.data;
      }
    }

    if (request.faceReference?.enabled) {
      if (isDbUuid(request.faceReference.assetId)) {
        const asset = await assetRepository.getById(request.faceReference.assetId!, workspaceId);
        if (!asset) {
          const err = new Error("Face reference asset does not exist or does not belong to your workspace.");
          (err as any).status = 403;
          (err as any).code = "UNAUTHORIZED_ASSET_ACCESS";
          throw err;
        }
        if (!request.faceReference.url) {
          request.faceReference.url = (await storageService.getSignedUrl(asset.storagePath)) || undefined;
        }
      } else if (request.faceReference.data && !request.faceReference.url) {
        // Direct local PC upload (e.g., 'face-context-*' with base64 data)
        request.faceReference.url = request.faceReference.data;
      }
    }

    // 3. Validate capabilities against model contract
    const capResult = capabilityValidator.validate(request, model);
    if (!capResult.valid && capResult.error) {
      const err = new Error(capResult.error.message);
      (err as any).status = capResult.error.status;
      (err as any).code = capResult.error.code;
      throw err;
    }

    // 4. Reserve credits via two-phase PostgreSQL hold
    const clientKey =
      params.idempotencyKey ||
      `img_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const reservation = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: model.credits,
      referenceId: clientKey,
      description: `Image Generation (${model.label})`,
      idempotencyKey: `hold_${clientKey}`,
    });

    if (!reservation.success) {
      const err = new Error("Insufficient credits available in workspace.");
      (err as any).status = 402;
      (err as any).code = "INSUFFICIENT_CREDITS";
      (err as any).available = reservation.available;
      (err as any).required = model.credits;
      throw err;
    }

    const holdId = reservation.holdId || (reservation as any).hold_id;

    // 5. Create AI generation job record for observability
    const job = await aiJobRepository.createJob({
      workspaceId,
      requestedBy: userId,
      operation: "image_generation",
      provider: model.provider,
      modelRequested: model.modelId,
      creditsReserved: model.credits,
      idempotencyKey: clientKey,
    });
    const jobId = job?.id || `job_${Date.now()}`;

    // 6. Build structured, logo-safe prompt with ingredient context
    const promptText = imagePromptBuilder.buildPrompt(request, model);
    const refImgs = [...(request.referenceImages || [])];
    if (model.capabilities.references.supported) {
      if (request.productReference?.enabled && (request.productReference.url || request.productReference.data)) {
        const target = request.productReference.url || request.productReference.data!;
        if (!refImgs.includes(target)) refImgs.push(target);
      }
      if (request.faceReference?.enabled && (request.faceReference.url || request.faceReference.data)) {
        const target = request.faceReference.url || request.faceReference.data!;
        if (!refImgs.includes(target)) refImgs.push(target);
      }
      if (request.ingredients) {
        for (const ing of request.ingredients) {
          if (ing.data && !refImgs.includes(ing.data)) {
            refImgs.push(ing.data);
          }
        }
      }
    }

    const enrichedRequest: NormalizedImageRequest = {
      ...request,
      prompt: promptText,
      referenceImages: refImgs.length > 0 ? refImgs : undefined,
    };

    let executionResult;
    try {
      // 7. Dispatch to provider adapter
      if (model.provider === "fal") {
        executionResult = await falImageProvider.generate(enrichedRequest, model, workspaceId);
      } else {
        executionResult = await googleImageProvider.generate(enrichedRequest, model, workspaceId);
      }
    } catch (providerError: any) {
      console.error(`[ImageGenerationService] Provider ${model.provider} failed:`, providerError.message);
      // Release credit hold on provider error
      if (holdId) {
        await creditService.releaseCredits(holdId, providerError.message || "Provider Failure");
      }
      throw providerError;
    }

    // 8. Process and upload output images to Supabase Storage
    const outputImages: NormalizedImageResult["images"] = [];

    for (let i = 0; i < executionResult.images.length; i++) {
      const rawImage = executionResult.images[i];
      let imageBuffer: Buffer;

      if (rawImage.buffer) {
        imageBuffer = rawImage.buffer;
      } else if (rawImage.url) {
        const fetchRes = await fetch(rawImage.url);
        if (!fetchRes.ok) {
          throw new Error(`Failed to download provider output image from ${rawImage.url}`);
        }
        const arrayBuf = await fetchRes.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuf);
      } else {
        throw new Error("Provider returned image without buffer or url");
      }

      // Upload binary to Supabase Storage user-assets bucket
      const storageRelativePath = `generations/${userId}/${jobId}_${i}.png`;
      const uploadResult = await storageService.uploadFile({
        workspaceId,
        path: storageRelativePath,
        fileBuffer: imageBuffer,
        contentType: rawImage.mimeType || "image/png",
      });

      const permanentPath = uploadResult?.storagePath || `${workspaceId}/${storageRelativePath}`;
      const sha256 = uploadResult?.sha256 || storageService.computeSha256(imageBuffer);

      // Persist in public.assets table
      const assetRecord = await assetRepository.create({
        workspaceId,
        uploadedBy: userId,
        name: `${request.prompt.slice(0, 30) || "Generated Visual"} (${model.label})`,
        storageBucket: "user-assets",
        storagePath: permanentPath,
        type: "image",
        prompt: request.prompt,
        fileSizeBytes: imageBuffer.length,
        mimeType: rawImage.mimeType || "image/png",
        sha256,
      });

      // Generate signed URL for instant display
      const signedUrl = (await storageService.getSignedUrl(permanentPath, 86400)) || rawImage.url || "";

      outputImages.push({
        url: signedUrl,
        storagePath: permanentPath,
        assetId: assetRecord?.id || jobId,
        width: rawImage.width,
        height: rawImage.height,
        mimeType: rawImage.mimeType || "image/png",
      });
    }

    // 9. Capture credit hold in immutable ledger & update balance
    let newBalance: number | undefined;
    if (holdId) {
      const captureResult = await creditService.captureCredits(holdId, `capture_${holdId}`);
      newBalance = captureResult.newBalance ?? (captureResult as any)?.new_balance;
    }

    // 10. Complete generation job in Supabase DB
    await aiJobRepository.completeJob({
      jobId,
      modelUsed: model.modelId,
      creditsCharged: model.credits,
      providerRequestId: executionResult.providerRequestId,
      outputs: outputImages.map((out) => ({
        assetId: out.assetId,
        storageBucket: "user-assets",
        storagePath: out.storagePath,
        mimeType: out.mimeType || "image/png",
      })),
    });

    // Record usage metrics
    await aiJobRepository.recordUsage({
      workspaceId,
      userId,
      jobId,
      provider: model.provider,
      model: model.modelId,
      operation: "image_generation",
      inputUnits: 1,
      outputUnits: outputImages.length,
      providerCostMicrounits: model.provider === "fal" ? 30000 : 15000,
      creditsCharged: model.credits,
    });

    // Record history log
    await historyRepository.addHistory({
      workspaceId,
      userId,
      jobId,
      gemId: "standard-image",
      title: `${request.prompt.slice(0, 40) || "Image Generation"}`,
      prompt: request.prompt,
      resultSummary: {
        imageUrl: outputImages[0]?.url,
        model: model.label,
        aspectRatio: request.aspectRatio,
        credits: model.credits,
      },
    }).catch((e) => console.warn("History log creation failed non-fatally:", e.message));

    return {
      images: outputImages,
      provider: model.provider,
      model: model.modelId,
      modelKey: model.key,
      requestId: executionResult.providerRequestId,
      creditsCharged: model.credits,
      newBalance,
      metadata: {
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
        latencyMs: executionResult.latencyMs,
      },
    };
  }
}

export const imageGenerationService = new ImageGenerationService();
