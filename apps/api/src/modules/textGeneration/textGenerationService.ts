/**
 * Text Generation Service.
 * Governs the entire text generation lifecycle:
 * 1. Authorization & Workspace resolution
 * 2. Multimodal asset validation via Supabase
 * 3. ACID Two-Phase credit reservation
 * 4. Gemini Interactions API execution (standard or stream)
 * 5. Output sanitization & schema validation
 * 6. Credit capture / release & job observability
 */

import { creditService } from "../../services/creditService.js";
import { aiJobRepository } from "../../repositories/aiJobRepository.js";
import { assetRepository } from "../../repositories/assetRepository.js";
import { resolveTextConfig } from "./textModelResolver.js";
import { generateTextInteraction, streamTextInteraction } from "./geminiTextAdapter.js";
import type {
  NormalizedTextRequest,
  NormalizedTextResult,
} from "@shared-types/textGeneration.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isDbUuid = (id?: string): boolean => !!id && UUID_REGEX.test(id);

export class TextGenerationService {
  /**
   * Generates text synchronously with full ACID credit safety.
   */
  async generateText(
    request: NormalizedTextRequest,
    workspaceId: string,
    userId: string,
    idempotencyKey?: string
  ): Promise<NormalizedTextResult & { newBalance?: number }> {
    const clientKey = idempotencyKey || `txt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const resolvedConfig = resolveTextConfig(request.task, request.quality, request.thinkingLevel);

    // 1. Authorize any database assets if provided
    if (request.multimodalAssets && request.multimodalAssets.length > 0) {
      for (const assetRef of request.multimodalAssets) {
        if (assetRef.id && isDbUuid(assetRef.id)) {
          const asset = await assetRepository.getById(assetRef.id, workspaceId);
          if (!asset) {
            const err: any = new Error("Attached context asset does not exist or does not belong to your workspace.");
            err.status = 403;
            err.code = "UNAUTHORIZED_ASSET_ACCESS";
            throw err;
          }
        }
      }
    }

    // 2. ACID Two-Phase Credit Reservation
    const reservation = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: resolvedConfig.creditsRequired,
      referenceId: clientKey,
      description: `Text Generation (${request.task} / ${resolvedConfig.model})`,
      idempotencyKey: `hold_${clientKey}`,
    });

    if (!reservation.success) {
      const err: any = new Error("Insufficient credits available in workspace.");
      err.status = 402;
      err.code = "INSUFFICIENT_CREDITS";
      err.available = reservation.available;
      err.required = resolvedConfig.creditsRequired;
      throw err;
    }

    const holdId = reservation.holdId || reservation.hold_id || null;
    let jobId: string | null = null;

    try {
      // 3. Create AI Job record in Supabase
      const job = await aiJobRepository.createJob({
        workspaceId,
        requestedBy: userId,
        operation: `text-generate-${request.task}`,
        provider: "google-gemini",
        modelRequested: resolvedConfig.model,
        creditsReserved: resolvedConfig.creditsRequired,
        idempotencyKey: `job_${clientKey}`,
      });
      jobId = job?.id || null;

      // 4. Execute through Gemini Interactions Adapter
      const result = await generateTextInteraction({
        request,
        workspaceId,
        userId,
      });

      // 5. On Success: Capture credit hold and log usage
      let newBalance: number | undefined;
      if (holdId) {
        const captureResult = await creditService.captureCredits(holdId, `capture_${clientKey}`);
        newBalance = captureResult.newBalance ?? (captureResult as any)?.new_balance;
      }

      if (jobId) {
        await aiJobRepository.completeJob({
          jobId,
          modelUsed: result.modelUsed,
          creditsCharged: result.creditsCharged,
          outputs: [],
        });

        await aiJobRepository.recordUsage({
          workspaceId,
          userId,
          jobId,
          provider: "google-gemini",
          model: result.modelUsed,
          operation: `text-generate-${request.task}`,
          inputUnits: result.usage?.inputTokens || 100,
          outputUnits: result.usage?.outputTokens || 200,
          providerCostMicrounits: 1000,
          creditsCharged: result.creditsCharged,
        });
      }

      return {
        ...result,
        newBalance,
      };
    } catch (error) {
      // On Failure: Release credit hold so user is not penalized
      if (holdId) {
        await creditService.releaseCredits(holdId, (error as any)?.message || "Text generation failed").catch((relErr) => {
          console.error(`[TextGenerationService] Failed to release credit hold ${holdId}:`, relErr);
        });
      }
      if (jobId) {
        await aiJobRepository.failJob(jobId, (error as any)?.code || "TEXT_GEN_FAILED", (error as any)?.message || "Text generation failed").catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Pre-authorizes streaming text generation with credit reservation.
   */
  async prepareStream(
    request: NormalizedTextRequest,
    workspaceId: string,
    userId: string,
    idempotencyKey?: string
  ): Promise<{
    holdId: string;
    jobId: string;
    resolvedConfig: ReturnType<typeof resolveTextConfig>;
    clientKey: string;
  }> {
    const clientKey = idempotencyKey || `stream_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const resolvedConfig = resolveTextConfig(request.task, request.quality, request.thinkingLevel);

    const reservation = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: resolvedConfig.creditsRequired,
      referenceId: clientKey,
      description: `Text Stream (${request.task} / ${resolvedConfig.model})`,
      idempotencyKey: `hold_${clientKey}`,
    });

    if (!reservation.success) {
      const err: any = new Error("Insufficient credits available in workspace.");
      err.status = 402;
      err.code = "INSUFFICIENT_CREDITS";
      throw err;
    }

    const holdId = reservation.holdId || reservation.hold_id || "";
    const job = await aiJobRepository.createJob({
      workspaceId,
      requestedBy: userId,
      operation: `text-stream-${request.task}`,
      provider: "google-gemini",
      modelRequested: resolvedConfig.model,
      creditsReserved: resolvedConfig.creditsRequired,
      idempotencyKey: `job_${clientKey}`,
    });

    return {
      holdId,
      jobId: job?.id || "",
      resolvedConfig,
      clientKey,
    };
  }

  /**
   * Executes streaming generator.
   */
  async *streamText(
    request: NormalizedTextRequest,
    workspaceId: string,
    userId: string
  ) {
    yield* streamTextInteraction({
      request,
      workspaceId,
      userId,
    });
  }

  /**
   * Completes a stream and captures credits.
   */
  async completeStream(
    holdId: string,
    jobId: string,
    clientKey: string,
    modelUsed: string,
    credits: number,
    fullText: string
  ): Promise<number | undefined> {
    let newBalance: number | undefined;
    if (holdId) {
      const captureResult = await creditService.captureCredits(holdId, `capture_${clientKey}`);
      newBalance = captureResult.newBalance ?? (captureResult as any)?.new_balance;
    }
    if (jobId) {
      await aiJobRepository.completeJob({
        jobId,
        modelUsed,
        creditsCharged: credits,
        outputs: [],
      }).catch(() => {});
    }
    return newBalance;
  }

  /**
   * Cancels a stream and releases credits.
   */
  async cancelStream(holdId: string, jobId: string, clientKey: string, reason: string): Promise<void> {
    if (holdId) {
      await creditService.releaseCredits(holdId, reason).catch(() => {});
    }
    if (jobId) {
      await aiJobRepository.failJob(jobId, "STREAM_CANCELLED", reason).catch(() => {});
    }
  }
}

export const textGenerationService = new TextGenerationService();
