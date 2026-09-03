/**
 * Brand Guidelines Repository.
 * Backed authoritatively by Supabase PostgreSQL (/api/brand-guidelines).
 */

import { uploadAssetToStorage } from '../storage/storageClient.js';
import { apiClient } from '../api/apiClient.js';
import type { BrandGuidelines } from '@shared-types/brand.js';

export function subscribeBrandGuidelines(
  _userId: string,
  _guidelineId: string = 'default',
  onData: (data: BrandGuidelines | null) => void,
  onError?: (err: any) => void
): () => void {
  let isCancelled = false;

  apiClient.get<{ success: boolean; guidelines: BrandGuidelines | null }>('/api/brand-guidelines')
    .then((res) => {
      if (!isCancelled && res?.guidelines) {
        onData(res.guidelines);
      }
    })
    .catch((err) => {
      console.warn('[BrandRepository] Supabase fetch error:', err.message);
      if (onError) onError(err);
    });

  return () => {
    isCancelled = true;
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
      console.warn('[BrandRepository] Storage upload fallback for brand logo:', e);
    }
  }

  const dataToSave = {
    ...guidelines,
    ...(logoUrl ? { logo: logoUrl } : {}),
    updatedAt: Date.now()
  };

  try {
    await apiClient.post('/api/brand-guidelines', { guidelines: dataToSave });
  } catch (err) {
    console.warn('[BrandRepository] API save error:', err);
    throw err;
  }
}
