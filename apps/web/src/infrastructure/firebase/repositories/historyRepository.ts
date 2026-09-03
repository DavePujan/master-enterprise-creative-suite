/**
 * History Logs Firestore Repository.
 * Collection: `users/{userId}/historyLogs/{historyId}`
 */

import { doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, query, orderBy, limit, db, handleFirestoreError } from '../firestore.js';
import type { HistoryItem } from '@shared-types/user.js';

export function subscribeUserHistory(
  userId: string,
  onData: (items: HistoryItem[]) => void,
  limitCount: number = 20,
  onError?: (err: any) => void
): () => void {
  const historyColRef = collection(db, 'users', userId, 'historyLogs');
  const q = query(historyColRef, orderBy('timestamp', 'desc'), limit(limitCount));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: HistoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          gemId: d.gemId || '',
          prompt: d.prompt || '',
          title: d.title || '',
          result: d.result,
          timestamp: d.timestamp || Date.now()
        });
      });
      onData(items);
    },
    (err) => {
      handleFirestoreError(err, 'subscribeUserHistory', `users/${userId}/historyLogs`);
      if (onError) onError(err);
    }
  );
}

export async function addUserHistoryItem(
  userId: string,
  historyId: string,
  item: Omit<HistoryItem, 'id'>
): Promise<void> {
  const historyRef = doc(db, 'users', userId, 'historyLogs', historyId);
  await setDoc(historyRef, {
    ...item,
    timestamp: item.timestamp || Date.now()
  });
}

export async function updateHistoryTitle(
  userId: string,
  historyId: string,
  title: string
): Promise<void> {
  const historyRef = doc(db, 'users', userId, 'historyLogs', historyId);
  await updateDoc(historyRef, { title });
}

export async function deleteHistoryItem(userId: string, historyId: string): Promise<void> {
  const historyRef = doc(db, 'users', userId, 'historyLogs', historyId);
  await deleteDoc(historyRef);
}
