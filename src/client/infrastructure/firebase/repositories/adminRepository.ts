/**
 * Admin Settings Firestore Repository.
 * Collection: `adminSettings/{docId}`
 */

import { doc, onSnapshot, setDoc, db, handleFirestoreError } from '../firestore.js';
import type { PromptEngineSettings } from '../../../../shared/types/creative.js';

export function subscribeAdminSettings(
  docId: string = 'default',
  onData: (settings: PromptEngineSettings | null) => void,
  onError?: (err: any) => void
): () => void {
  const settingsRef = doc(db, 'adminSettings', docId);
  return onSnapshot(
    settingsRef,
    (snap) => {
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
}

export async function saveAdminSettings(
  settings: PromptEngineSettings,
  docId: string = 'default'
): Promise<void> {
  const settingsRef = doc(db, 'adminSettings', docId);
  await setDoc(settingsRef, settings, { merge: true });
}
