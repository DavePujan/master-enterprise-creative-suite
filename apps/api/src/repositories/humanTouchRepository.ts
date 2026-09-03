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
      return {
        id: `mock_ht_${Date.now()}`,
        ...req,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
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
}

export const humanTouchRepository = new HumanTouchRepository();
