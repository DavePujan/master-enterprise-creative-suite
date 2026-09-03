/**
 * Human Touch Curation Request Repository.
 * Direct persistence interface to public.human_touch_requests.
 */

import { getSupabaseAdmin } from "../infrastructure/supabase/supabaseClient.js";

export interface HumanTouchInput {
  workspaceId: string;
  requesterId: string;
  assetType: string;
  storageBucket?: string;
  storagePath: string;
  originalPrompt: string;
  modelsUsed?: string;
  userComment: string;
  emailReceipt: string;
}

export interface HumanTouchRecord extends HumanTouchInput {
  id: string;
  status: "pending" | "in_review" | "completed" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export class HumanTouchRepository {
  async createRequest(req: HumanTouchInput): Promise<HumanTouchRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("human_touch_requests")
      .insert({
        workspace_id: req.workspaceId,
        requester_id: req.requesterId,
        asset_type: req.assetType,
        storage_bucket: req.storageBucket || "user-assets",
        storage_path: req.storagePath,
        original_prompt: req.originalPrompt,
        models_used: req.modelsUsed || "",
        user_comment: req.userComment,
        email_receipt: req.emailReceipt,
        status: "pending",
      })
      .select()
      .single();

    if (error || !data) {
      console.error("HumanTouchRepository.createRequest error:", error);
      return null;
    }

    return {
      id: data.id,
      workspaceId: data.workspace_id,
      requesterId: data.requester_id,
      assetType: data.asset_type,
      storageBucket: data.storage_bucket,
      storagePath: data.storage_path,
      originalPrompt: data.original_prompt,
      modelsUsed: data.models_used,
      userComment: data.user_comment,
      emailReceipt: data.email_receipt,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async listByWorkspace(workspaceId: string, limit = 50): Promise<HumanTouchRecord[]> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("human_touch_requests")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.error("HumanTouchRepository.listByWorkspace error:", error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      workspaceId: d.workspace_id,
      requesterId: d.requester_id,
      assetType: d.asset_type,
      storageBucket: d.storage_bucket,
      storagePath: d.storage_path,
      originalPrompt: d.original_prompt,
      modelsUsed: d.models_used,
      userComment: d.user_comment,
      emailReceipt: d.email_receipt,
      status: d.status,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  }
}

export const humanTouchRepository = new HumanTouchRepository();
