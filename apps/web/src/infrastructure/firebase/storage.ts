/**
 * Firebase Storage Client & Asset Upload Helper.
 * Preserves exact asset storage path: `users/${userId}/assets/${cleanAssetId}.${ext}`
 */

import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseApp.js';
import { auth } from './auth.js';
import { getSupabaseClient } from '../supabase/supabaseClient.js';

export { storage };

export async function uploadAssetToStorage(
  userId: string,
  assetId: string,
  data: string,
  _type?: string
): Promise<string> {
  // If not a data URL or if it's already a hosted URL, return as-is
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

  // 1. Primary: Upload to Supabase Storage if Supabase client is active
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
          const { data: publicUrlData } = supabase.storage
            .from('user-assets')
            .getPublicUrl(filePath);
          return publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn('[Storage] Supabase storage upload skipped:', e);
    }
  }

  // 2. Secondary fallback: Firebase Storage ONLY if user is logged into Firebase Auth
  if (auth.currentUser) {
    try {
      const storagePath = `users/${userId}/assets/${cleanAssetId}.${ext}`;
      const storageRef = ref(storage, storagePath);
      await uploadString(storageRef, data, 'data_url');
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.warn('[Storage] Firebase storage upload error:', error);
    }
  }

  return data;
}
