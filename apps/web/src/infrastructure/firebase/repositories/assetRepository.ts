/**
 * User Asset Firestore & Storage Repository.
 * Collection: `users/{userId}/assets/{assetId}`
 */

import { doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, db, handleFirestoreError } from '../firestore.js';
import { uploadAssetToStorage } from '../storage.js';
import type { Asset } from '@shared-types/creative.js';

export function subscribeUserAssets(
  userId: string,
  onData: (assets: Asset[]) => void,
  onError?: (err: any) => void
): () => void {
  const assetsColRef = collection(db, 'users', userId, 'assets');
  return onSnapshot(
    assetsColRef,
    (snapshot) => {
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
      onData(loaded);
    },
    (err) => {
      handleFirestoreError(err, 'subscribeUserAssets', `users/${userId}/assets`);
      if (onError) onError(err);
    }
  );
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
  const assetRef = doc(db, 'users', userId, 'assets', assetId);

  await setDoc(assetRef, {
    name,
    title: name,
    content: hostedUrl,
    type,
    prompt: prompt || '',
    timestamp: Date.now()
  });

  return hostedUrl;
}

export async function updateUserAsset(
  userId: string,
  assetId: string,
  updates: Partial<Asset>
): Promise<void> {
  const assetRef = doc(db, 'users', userId, 'assets', assetId);
  const mappedUpdates: any = { ...updates };
  if (updates.data) mappedUpdates.content = updates.data;
  if (updates.name) mappedUpdates.title = updates.name;
  await updateDoc(assetRef, mappedUpdates);
}

export async function deleteUserAsset(userId: string, assetId: string): Promise<void> {
  const assetRef = doc(db, 'users', userId, 'assets', assetId);
  await deleteDoc(assetRef);
}
