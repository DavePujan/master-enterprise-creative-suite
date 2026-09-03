/**
 * Brand Guidelines Firestore Repository.
 * Collection: `users/{userId}/brand_guidelines/{guidelineId}`
 */

import { doc, onSnapshot, setDoc, db, handleFirestoreError } from '../firestore.js';
import { auth } from '../auth.js';
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
      console.warn('[BrandRepository] Supabase fetch error:', err.message);
      if (!auth.currentUser && onError) {
        onError(err);
      }
    });

  // 2. Secondary fallback: ONLY if active in Firebase Auth
  if (auth.currentUser) {
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

  return () => {
    isCancelled = true;
  };
}

export async function saveBrandGuidelines(
  userId: string,
  guidelines: BrandGuidelines,
  guidelineId: string = 'default'
): Promise<void> {
  const dataToSave = {
    ...guidelines,
    updatedAt: Date.now()
  };

  // 1. Primary: Save to Supabase PostgreSQL (public.brand_guidelines)
  try {
    await apiClient.post('/api/brand-guidelines', { guidelines: dataToSave });
  } catch (err) {
    console.warn('[BrandRepository] API save error:', err);
  }

  // 2. Secondary: Dual-save to Firestore only if logged into Firebase
  if (auth.currentUser) {
    try {
      let logoUrl = guidelines.logo;
      if (logoUrl && logoUrl.startsWith('data:')) {
        try {
          logoUrl = await uploadAssetToStorage(userId, `brand_logo_${guidelineId}`, logoUrl, 'image');
        } catch (e) {
          console.warn("Storage upload fallback for brand logo:", e);
        }
      }
      const guidelineRef = doc(db, 'users', userId, 'brand_guidelines', guidelineId);
      await setDoc(guidelineRef, { ...dataToSave, ...(logoUrl ? { logo: logoUrl } : {}) }, { merge: true });
    } catch (err) {
      console.warn('[BrandRepository] Firestore sync skipped:', err);
    }
  }
}

