/**
 * User Asset Firestore & Storage Repository.
 * Collection: `users/{userId}/assets/{assetId}`
 */

import { doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, db, handleFirestoreError } from '../firestore.js';
import { uploadAssetToStorage } from '../storage.js';
import { apiClient } from '../../api/apiClient.js';
import type { Asset } from '@shared-types/creative.js';

export function subscribeUserAssets(
  userId: string,
  onData: (assets: Asset[]) => void,
  onError?: (err: any) => void
): () => void {
  let isCancelled = false;

  // 1. Primary: Load from Supabase PostgreSQL (public.assets)
  apiClient.get<{ success: boolean; assets: any[] }>('/api/assets')
    .then((res) => {
      if (!isCancelled && res?.assets && res.assets.length > 0) {
        const loaded: Asset[] = res.assets.map((d) => ({
          id: d.id,
          name: d.name || 'Untitled Asset',
          data: d.storagePath || '',
          type: d.type || 'image',
          selected: false,
          analysis: d.analysis
        }));
        onData(loaded);
      }
    })
    .catch((err) => {
      console.warn('[AssetRepository] Supabase fetch fallback to Firestore:', err.message);
    });

  // 2. Secondary fallback: Firestore listener
  const assetsColRef = collection(db, 'users', userId, 'assets');
  const unsubscribe = onSnapshot(
    assetsColRef,
    (snapshot) => {
      if (isCancelled) return;
      const loaded: Asset[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        loaded.push({
          id: docSnap.id,
          name: d.name || d.title || 'Untitled Asset',
          data: d.content || d.data || '',
          type: d.type || 'image',
          selected: false,
          analysis: d.analysis
        });
      });
      if (loaded.length > 0) {
        onData(loaded);
      }
    },
    (err) => {
      handleFirestoreError(err, 'subscribeUserAssets', `users/${userId}/assets`);
      if (onError) onError(err);
    }
  );

  return () => {
    isCancelled = true;
    unsubscribe();
  };
}

export async function saveUserAsset(
  userId: string,
  assetId: string,
  name: string,
  dataUrl: string,
  type: 'image' | 'doc' | 'video' | 'audio',
  prompt?: string
): Promise<string> {
  // Upload to Storage if data URL, otherwise store as is
  const hostedUrl = await uploadAssetToStorage(userId, assetId, dataUrl, type);

  // 1. Primary: Save to Supabase PostgreSQL (public.assets)
  try {
    await apiClient.post('/api/assets', {
      name,
      storagePath: hostedUrl,
      type,
      prompt: prompt || ''
    });
  } catch (err) {
    console.warn('[AssetRepository] API save error, proceeding to dual-save:', err);
  }

  // 2. Secondary: Firestore retention sync
  try {
    const assetRef = doc(db, 'users', userId, 'assets', assetId);
    await setDoc(assetRef, {
      name,
      title: name,
      content: hostedUrl,
      type,
      prompt: prompt || '',
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('[AssetRepository] Firestore sync skipped:', err);
  }

  return hostedUrl;
}

export async function updateUserAsset(
  userId: string,
  assetId: string,
  updates: Partial<Asset>
): Promise<void> {
  try {
    const assetRef = doc(db, 'users', userId, 'assets', assetId);
    const mappedUpdates: any = { ...updates };
    if (updates.data) mappedUpdates.content = updates.data;
    if (updates.name) mappedUpdates.title = updates.name;
    await updateDoc(assetRef, mappedUpdates);
  } catch (err) {
    console.warn('[AssetRepository] updateUserAsset skipped:', err);
  }
}

export async function deleteUserAsset(userId: string, assetId: string): Promise<void> {
  // 1. Primary: Delete from Supabase PostgreSQL (public.assets)
  try {
    await apiClient.delete(`/api/assets/${assetId}`);
  } catch (err) {
    console.warn('[AssetRepository] API delete error:', err);
  }

  // 2. Secondary: Firestore delete
  try {
    const assetRef = doc(db, 'users', userId, 'assets', assetId);
    await deleteDoc(assetRef);
  } catch (err) {
    console.warn('[AssetRepository] Firestore delete skipped:', err);
  }
}
