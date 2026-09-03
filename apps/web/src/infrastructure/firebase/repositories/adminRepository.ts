/**
 * Admin Settings Firestore Repository.
 * Collection: `adminSettings/{docId}`
 */

import { doc, onSnapshot, setDoc, db, handleFirestoreError } from '../firestore.js';
import { auth } from '../auth.js';
import { apiClient } from '../../api/apiClient.js';
import type { PromptEngineSettings } from '@shared-types/creative.js';

export function subscribeAdminSettings(
  docId: string = 'default',
  onData: (settings: PromptEngineSettings | null) => void,
  onError?: (err: any) => void
): () => void {
  let isCancelled = false;

  // 1. Primary: Load from Supabase PostgreSQL (public.admin_settings)
  apiClient.get<{ success: boolean; value: PromptEngineSettings | null }>(`/api/admin/settings/${docId}`)
    .then((res) => {
      if (!isCancelled && res?.value) {
        onData(res.value);
      }
    })
    .catch((err) => {
      console.warn('[AdminRepository] Supabase fetch error:', err.message);
      if (!auth.currentUser && onError) {
        onError(err);
      }
    });

  // 2. Secondary fallback: ONLY if active in Firebase Auth
  if (auth.currentUser) {
    const settingsRef = doc(db, 'adminSettings', docId);
    const unsubscribe = onSnapshot(
      settingsRef,
      (snap) => {
        if (isCancelled) return;
        if (snap.exists()) {
          onData(snap.data() as PromptEngineSettings);
        } else {
          onData(null);
        }
      },
      (err) => {
        handleFirestoreError(err, 'subscribeAdminSettings', `adminSettings/${docId}`);
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

export async function saveAdminSettings(
  settings: PromptEngineSettings,
  docId: string = 'default'
): Promise<void> {
  // 1. Primary: Save to Supabase PostgreSQL (public.admin_settings)
  try {
    await apiClient.put(`/api/admin/settings/${docId}`, { value: settings });
  } catch (err) {
    console.warn('[AdminRepository] API save error:', err);
  }

  // 2. Secondary: Firestore retention sync only if logged into Firebase
  if (auth.currentUser) {
    try {
      const settingsRef = doc(db, 'adminSettings', docId);
      await setDoc(settingsRef, settings, { merge: true });
    } catch (err) {
      console.warn('[AdminRepository] Firestore sync skipped:', err);
    }
  }
}
