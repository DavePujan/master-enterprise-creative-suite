/**
 * AI Generation Jobs, Outputs & Observability Repository.
 * Direct persistence interface to ai_generation_jobs, ai_generation_outputs, and ai_usage.
 */

import { getSupabaseAdmin } from "../infrastructure/supabase/supabaseClient.js";

export interface CreateAiJobParams {
  workspaceId: string;
  requestedBy: string;
  operation: string;
  provider: string;
  modelRequested: string;
  creditsReserved: number;
  idempotencyKey?: string;
}

export interface CompleteAiJobParams {
  jobId: string;
  modelUsed: string;
  creditsCharged: number;
  providerRequestId?: string;
  outputs: Array<{
    assetId?: string;
    storageBucket?: string;
    storagePath: string;
    storageGeneration?: string;
    mimeType: string;
    sha256?: string;
    metadata?: any;
  }>;
}

export interface RecordUsageParams {
  workspaceId: string;
  userId: string;
  jobId: string;
  provider: string;
  model: string;
  operation: string;
  inputUnits: number;
  outputUnits: number;
  providerCostMicrounits: number;
  creditsCharged: number;
}

export class AiJobRepository {
  async createJob(params: CreateAiJobParams): Promise<{ id: string; isReplay?: boolean } | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return null;
    }

    // Check idempotency if key provided
    if (params.idempotencyKey) {
      const { data: existing } = await supabase
        .from("ai_generation_jobs")
        .select("id")
        .eq("idempotency_key", params.idempotencyKey)
        .single();

      if (existing) {
        return { id: existing.id, isReplay: true };
      }
    }

    const { data, error } = await supabase
      .from("ai_generation_jobs")
      .insert({
        workspace_id: params.workspaceId,
        requested_by: params.requestedBy,
        operation: params.operation,
        provider: params.provider,
        model_requested: params.modelRequested,
        status: "pending",
        credits_reserved: params.creditsReserved,
        idempotency_key: params.idempotencyKey,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("AiJobRepository.createJob error:", error);
      return null;
    }

    return { id: data.id };
  }

  async completeJob(params: CompleteAiJobParams): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return true;

    // 1. Update job status
    const { error: jobError } = await supabase
      .from("ai_generation_jobs")
      .update({
        status: "completed",
        model_used: params.modelUsed,
        credits_charged: params.creditsCharged,
        provider_request_id: params.providerRequestId,
        completed_at: new Date().toISOString(),
      })
      .eq("id", params.jobId);

    if (jobError) {
      console.error("AiJobRepository.completeJob error:", jobError);
      return false;
    }

    // 2. Insert outputs if any
    if (params.outputs && params.outputs.length > 0) {
      const outputRows = params.outputs.map((out) => ({
        generation_job_id: params.jobId,
        asset_id: out.assetId,
        storage_bucket: out.storageBucket || "user-assets",
        storage_path: out.storagePath,
        storage_generation: out.storageGeneration || "1",
        mime_type: out.mimeType,
        sha256: out.sha256,
        metadata: out.metadata || {},
      }));

      await supabase.from("ai_generation_outputs").insert(outputRows);
    }

    return true;
  }

  async failJob(jobId: string, errorCode: string, errorMessage: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return true;

    const { error } = await supabase
      .from("ai_generation_jobs")
      .update({
        status: "failed",
        error_code: errorCode,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      console.error("AiJobRepository.failJob error:", error);
      return false;
    }

    return true;
  }

  async recordUsage(params: RecordUsageParams): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return true;

    const { error } = await supabase.from("ai_usage").insert({
      workspace_id: params.workspaceId,
      user_id: params.userId,
      generation_job_id: params.jobId,
      provider: params.provider,
      model: params.model,
      operation: params.operation,
      input_units: params.inputUnits,
      output_units: params.outputUnits,
      provider_cost_microunits: params.providerCostMicrounits,
      credits_charged: params.creditsCharged,
    });

    if (error) {
      console.error("AiJobRepository.recordUsage error:", error);
      return false;
    }

    return true;
  }
}

export const aiJobRepository = new AiJobRepository();
