/**
 * Production Supabase Storage Client.
 * Handles client-side asset uploads directly to the 'user-assets' Supabase bucket.
 * Enforces canonical paths: `${userId}/${cleanAssetId}.${ext}`.
 */

import { getSupabaseClient } from '../supabase/supabaseClient.js';

export async function uploadAssetToStorage(
  userId: string,
  assetId: string,
  data: string,
  _type?: string
): Promise<string> {
  // If not a data URL or already hosted, return as-is
  if (!data || !data.startsWith('data:')) {
    return data;
  }

  const extMatch = data.match(/^data:([^;]+);/);
  const mime = extMatch ? extMatch[1] : 'image/png';
  const ext = mime.includes('svg')
    ? 'svg'
    : mime.includes('jpeg') || mime.includes('jpg')
    ? 'jpg'
    : mime.includes('mp4')
    ? 'mp4'
    : mime.includes('audio') || mime.includes('mp3')
    ? 'mp3'
    : 'png';
  const cleanAssetId = assetId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `${userId}/${cleanAssetId}.${ext}`;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const base64Content = data.split(',')[1];
      if (base64Content) {
        const byteCharacters = atob(base64Content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });

        const { data: uploadData, error } = await supabase.storage
          .from('user-assets')
          .upload(filePath, blob, { upsert: true, contentType: mime });

        if (!error && uploadData) {
          // Attempt signed URL first (bucket is private)
          const { data: signedData, error: signErr } = await supabase.storage
            .from('user-assets')
            .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

          if (!signErr && signedData?.signedUrl) {
            return signedData.signedUrl;
          }

          const { data: publicUrlData } = supabase.storage
            .from('user-assets')
            .getPublicUrl(filePath);
          return publicUrlData.publicUrl;
        } else if (error) {
          console.warn('[StorageClient] Upload error:', error.message);
        }
      }
    } catch (e) {
      console.warn('[StorageClient] Failed to process upload:', e);
    }
  }

  return data;
}
