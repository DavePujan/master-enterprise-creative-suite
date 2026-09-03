/**
 * Tier-Aware Storage Domain Service.
 * Enforces server-authoritative upload quotas, canonical storage paths, SHA-256 hashing,
 * and ephemeral signed URL generation for the private user-assets bucket.
 */

import crypto from "crypto";
import { getSupabaseAdmin } from "../infrastructure/supabase/supabaseClient.js";
import { CURRENT_TIER_POLICY } from "../../../../packages/types/tierPolicy.js";

export class StorageService {
  private bucketName = "user-assets";

  /**
   * Computes SHA-256 hash from Buffer or string.
   */
  computeSha256(data: Buffer | string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Server-authoritative validation against effective tier limits.
   */
  validateUploadSize(type: "image" | "video" | "audio" | "doc", fileSizeBytes: number): {
    valid: boolean;
    maxAllowedBytes: number;
    error?: string;
  } {
    let maxAllowedBytes = CURRENT_TIER_POLICY.effectiveMaxDocBytes;

    if (type === "video") {
      maxAllowedBytes = CURRENT_TIER_POLICY.effectiveMaxVideoBytes; // 50 MB Free Tier ceiling
    } else if (type === "image") {
      maxAllowedBytes = CURRENT_TIER_POLICY.effectiveMaxImageBytes; // 25 MB
    } else if (type === "audio") {
      maxAllowedBytes = CURRENT_TIER_POLICY.effectiveMaxAudioBytes; // 25 MB
    }

    if (fileSizeBytes > maxAllowedBytes) {
      const maxMb = (maxAllowedBytes / (1024 * 1024)).toFixed(0);
      return {
        valid: false,
        maxAllowedBytes,
        error: `File size exceeds current tier upload limit of ${maxMb} MB.`,
      };
    }

    return { valid: true, maxAllowedBytes };
  }

  /**
   * Generates an ephemeral signed URL for private bucket access.
   */
  async getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data) {
      console.error("StorageService.getSignedUrl error:", error);
      return null;
    }

    return data.signedUrl;
  }

  /**
   * Generates a signed download URL (alias for getSignedUrl).
   */
  async getSignedDownloadUrl(storagePath: string, expiresIn = 3600): Promise<string> {
    const url = await this.getSignedUrl(storagePath, expiresIn);
    if (!url) throw new Error("Failed to generate signed download URL");
    return url;
  }

  /**
   * Creates a signed upload URL for direct browser uploads.
   */
  async createSignedUploadUrl(
    storagePath: string,
    expiresIn = 3600
  ): Promise<{ signedUrl: string; token: string }> {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error("Supabase storage client not configured");

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      throw error || new Error("Failed to generate signed upload URL");
    }

    return { signedUrl: data.signedUrl, token: data.token };
  }

  /**
   * Uploads binary buffer directly to private storage bucket.
   */
  async uploadFile(params: {
    workspaceId: string;
    path: string;
    fileBuffer: Buffer;
    contentType: string;
  }): Promise<{ storagePath: string; sha256: string } | null> {
    const supabase = getSupabaseAdmin();
    const sha256 = this.computeSha256(params.fileBuffer);

    if (!supabase) {
      return { storagePath: params.path, sha256 };
    }

    const fullPath = `${params.workspaceId}/${params.path}`;

    const { error } = await supabase.storage.from(this.bucketName).upload(fullPath, params.fileBuffer, {
      contentType: params.contentType,
      upsert: true,
    });

    if (error) {
      console.error("StorageService.uploadFile error:", error);
      return null;
    }

    return { storagePath: fullPath, sha256 };
  }
}

export const storageService = new StorageService();
