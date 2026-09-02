/**
 * Firebase Storage Client & Asset Upload Helper.
 * Preserves exact asset storage path: `users/${userId}/assets/${cleanAssetId}.${ext}`
 */

import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseApp.js';

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

  try {
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
    const storagePath = `users/${userId}/assets/${cleanAssetId}.${ext}`;
    const storageRef = ref(storage, storagePath);

    await uploadString(storageRef, data, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.warn("Storage upload fallback to data URL:", error);
    return data;
  }
}
