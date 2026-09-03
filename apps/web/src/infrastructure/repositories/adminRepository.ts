/**
 * Admin Settings Repository.
 * Backed authoritatively by Supabase PostgreSQL (public.admin_settings).
 */

import { apiClient } from '../api/apiClient.js';
import type { PromptEngineSettings } from '@shared-types/creative.js';

export function subscribeAdminSettings(
  docId: string = 'default',
  onData: (settings: PromptEngineSettings | null) => void,
  onError?: (err: any) => void
): () => void {
  let isCancelled = false;

  apiClient.get<{ success: boolean; value: PromptEngineSettings | null }>(`/api/admin/settings/${docId}`)
    .then((res) => {
      if (!isCancelled && res?.value) {
        onData(res.value);
      }
    })
    .catch((err) => {
      console.warn('[AdminRepository] Supabase fetch error:', err.message);
      if (onError) onError(err);
    });

  return () => {
    isCancelled = true;
  };
}

export async function saveAdminSettings(
  settings: PromptEngineSettings,
  docId: string = 'default'
): Promise<void> {
  try {
    await apiClient.put(`/api/admin/settings/${docId}`, { value: settings });
  } catch (err) {
    console.warn('[AdminRepository] API save error:', err);
  }
}
