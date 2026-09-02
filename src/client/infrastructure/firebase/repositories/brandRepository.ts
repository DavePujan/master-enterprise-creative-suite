/**
 * Brand Guidelines Firestore Repository.
 * Collection: `users/{userId}/brand_guidelines/{guidelineId}`
 */

import { doc, onSnapshot, setDoc, db, handleFirestoreError } from '../firestore.js';
import { uploadAssetToStorage } from '../storage.js';
import type { BrandGuidelines } from '../../../../shared/types/brand.js';

export function subscribeBrandGuidelines(
  userId: string,
  guidelineId: string = 'default',
  onData: (data: BrandGuidelines | null) => void,
  onError?: (err: any) => void
): () => void {
  const guidelineRef = doc(db, 'users', userId, 'brand_guidelines', guidelineId);
  return onSnapshot(
    guidelineRef,
    (snap) => {
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

  const guidelineRef = doc(db, 'users', userId, 'brand_guidelines', guidelineId);
  const dataToSave = {
    ...guidelines,
    ...(logoUrl ? { logo: logoUrl } : {}),
    updatedAt: Date.now()
  };
  await setDoc(guidelineRef, dataToSave, { merge: true });
}

