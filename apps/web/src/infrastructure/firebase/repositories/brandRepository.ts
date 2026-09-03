/**
 * Brand Guidelines Firestore Repository.
 * Collection: `users/{userId}/brand_guidelines/{guidelineId}`
 */

import { doc, onSnapshot, setDoc, db, handleFirestoreError } from '../firestore.js';
import { uploadAssetToStorage } from '../storage.js';
import { apiClient } from '../../api/apiClient.js';
import type { BrandGuidelines } from '@shared-types/brand.js';

export function subscribeBrandGuidelines(
  userId: string,
  guidelineId: string = 'default',
  onData: (data: BrandGuidelines | null) => void,
  onError?: (err: any) => void
): () => void {
  let isCancelled = false;

  // 1. Primary: Fetch from Supabase PostgreSQL API
  apiClient.get<{ success: boolean; guidelines: BrandGuidelines | null }>('/api/brand-guidelines')
    .then((res) => {
      if (!isCancelled && res?.guidelines) {
        onData(res.guidelines);
      }
    })
    .catch((err) => {
      console.warn('[BrandRepository] Supabase fetch fallback to Firestore:', err.message);
    });

  // 2. Secondary fallback: Firestore listener
  const guidelineRef = doc(db, 'users', userId, 'brand_guidelines', guidelineId);
  const unsubscribe = onSnapshot(
    guidelineRef,
    (snap) => {
      if (isCancelled) return;
      if (snap.exists()) {
        onData(snap.data() as BrandGuidelines);
      } else {
        onData(null);
      }
    },
    (err) => {
      handleFirestoreError(err, 'subscribeBrandGuidelines', `users/${userId}/brand_guidelines/${guidelineId}`);
      if (onError) onError(err);
    }
  );

  return () => {
    isCancelled = true;
    unsubscribe();
  };
}

export async function saveBrandGuidelines(
  userId: string,
  guidelines: BrandGuidelines,
  guidelineId: string = 'default'
): Promise<void> {
  let logoUrl = guidelines.logo;
  if (logoUrl && logoUrl.startsWith('data:')) {
    try {
      logoUrl = await uploadAssetToStorage(userId, `brand_logo_${guidelineId}`, logoUrl, 'image');
    } catch (e) {
      console.warn("Storage upload fallback for brand logo:", e);
    }
  }

  const dataToSave = {
    ...guidelines,
    ...(logoUrl ? { logo: logoUrl } : {}),
    updatedAt: Date.now()
  };

  // 1. Primary: Save to Supabase PostgreSQL (public.brand_guidelines)
  try {
    await apiClient.post('/api/brand-guidelines', { guidelines: dataToSave });
  } catch (err) {
    console.warn('[BrandRepository] API save error, proceeding to dual-save:', err);
  }

  // 2. Secondary: Dual-save to Firestore during retention window
  try {
    const guidelineRef = doc(db, 'users', userId, 'brand_guidelines', guidelineId);
    await setDoc(guidelineRef, dataToSave, { merge: true });
  } catch (err) {
    console.warn('[BrandRepository] Firestore sync skipped:', err);
  }
}

