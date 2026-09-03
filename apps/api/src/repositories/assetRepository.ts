/**
 * Assets Repository.
 * Direct persistence interface to public.assets table.
 */

import { getSupabaseAdmin } from "../infrastructure/supabase/supabaseClient.js";

export interface CreateAssetInput {
  workspaceId: string;
  uploadedBy: string;
  name: string;
  storageBucket?: string;
  storagePath: string;
  storageGeneration?: string;
  type: "image" | "doc" | "video" | "audio";
  prompt?: string;
  analysis?: any;
  fileSizeBytes?: number;
  mimeType?: string;
  sha256?: string;
}

export interface AssetRecord extends CreateAssetInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export class AssetRepository {
  async create(input: CreateAssetInput): Promise<AssetRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("assets")
      .insert({
        workspace_id: input.workspaceId,
        uploaded_by: input.uploadedBy,
        name: input.name,
        storage_bucket: input.storageBucket || "user-assets",
        storage_path: input.storagePath,
        storage_generation: input.storageGeneration || "1",
        type: input.type,
        prompt: input.prompt,
        analysis: input.analysis,
        file_size_bytes: input.fileSizeBytes,
        mime_type: input.mimeType,
        sha256: input.sha256,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("AssetRepository.create error:", error);
      return null;
    }

    return {
      id: data.id,
      workspaceId: data.workspace_id,
      uploadedBy: data.uploaded_by,
      name: data.name,
      storageBucket: data.storage_bucket,
      storagePath: data.storage_path,
      storageGeneration: data.storage_generation,
      type: data.type,
      prompt: data.prompt,
      analysis: data.analysis,
      fileSizeBytes: data.file_size_bytes,
      mimeType: data.mime_type,
      sha256: data.sha256,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async list(workspaceId: string, limit = 50, offset = 0): Promise<AssetRecord[]> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      console.error("AssetRepository.list error:", error);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      workspaceId: d.workspace_id,
      uploadedBy: d.uploaded_by,
      name: d.name,
      storageBucket: d.storage_bucket,
      storagePath: d.storage_path,
      storageGeneration: d.storage_generation,
      type: d.type,
      prompt: d.prompt,
      analysis: d.analysis,
      fileSizeBytes: d.file_size_bytes,
      mimeType: d.mime_type,
      sha256: d.sha256,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  }

  async getById(id: string, workspaceId: string): Promise<AssetRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      workspaceId: data.workspace_id,
      uploadedBy: data.uploaded_by,
      name: data.name,
      storageBucket: data.storage_bucket,
      storagePath: data.storage_path,
      storageGeneration: data.storage_generation,
      type: data.type,
      prompt: data.prompt,
      analysis: data.analysis,
      fileSizeBytes: data.file_size_bytes,
      mimeType: data.mime_type,
      sha256: data.sha256,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async delete(id: string, workspaceId: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;

    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("AssetRepository.delete error:", error);
      return false;
    }

    return true;
  }
}

export const assetRepository = new AssetRepository();
