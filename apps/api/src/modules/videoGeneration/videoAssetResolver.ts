/**
 * Video Asset Resolver.
 * Resolves canonical asset IDs from public.assets to authenticated signed URLs
 * or download streams for upstream AI video providers.
 */

import { assetRepository } from '../../repositories/assetRepository.js';
import { storageService } from '../../services/storageService.js';
import { getSupabaseAdmin } from '../../infrastructure/supabase/supabaseClient.js';

export interface ResolvedAsset {
  assetId: string;
  url: string;
  mimeType: string;
  name: string;
  buffer?: Buffer;
}

export class VideoAssetResolver {
  async resolve(assetId: string, workspaceId: string): Promise<ResolvedAsset | null> {
    const asset = await assetRepository.getById(assetId, workspaceId);
    if (!asset) {
      console.warn(`[VideoAssetResolver] Asset ${assetId} not found in workspace ${workspaceId}`);
      return null;
    }

    const signedUrl = await storageService.getSignedUrl(asset.storagePath, 3600);
    if (!signedUrl) {
      console.warn(`[VideoAssetResolver] Failed to generate signed URL for asset ${assetId}`);
      return null;
    }

    return {
      assetId: asset.id,
      url: signedUrl,
      mimeType: asset.mimeType || 'image/png',
      name: asset.name
    };
  }

  async resolveAsBuffer(assetId: string, workspaceId: string): Promise<ResolvedAsset | null> {
    const resolved = await this.resolve(assetId, workspaceId);
    if (!resolved) return null;

    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const asset = await assetRepository.getById(assetId, workspaceId);
        if (asset) {
          const { data, error } = await supabase.storage
            .from(asset.storageBucket || 'user-assets')
            .download(asset.storagePath);
          if (data && !error) {
            const arrayBuffer = await data.arrayBuffer();
            resolved.buffer = Buffer.from(arrayBuffer);
            return resolved;
          }
        }
      }

      // Fallback to fetch from signed URL
      const res = await fetch(resolved.url);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        resolved.buffer = Buffer.from(arrayBuffer);
      }
    } catch (err) {
      console.error(`[VideoAssetResolver] Error downloading asset buffer ${assetId}:`, err);
    }

    return resolved;
  }
}

export const videoAssetResolver = new VideoAssetResolver();
