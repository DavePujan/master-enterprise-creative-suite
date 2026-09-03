/**
 * History Logs Firestore Repository.
 * Collection: `users/{userId}/historyLogs/{historyId}`
 */

import { doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, query, orderBy, limit, db, handleFirestoreError } from '../firestore.js';
import { auth } from '../auth.js';
import { apiClient } from '../../api/apiClient.js';
import type { HistoryItem } from '@shared-types/user.js';

export function subscribeUserHistory(
  userId: string,
  onData: (items: HistoryItem[]) => void,
  limitCount: number = 20,
  onError?: (err: any) => void
): () => void {
  let isCancelled = false;

  // 1. Primary: Load from Supabase PostgreSQL API
  apiClient.get<{ success: boolean; history: any[] }>(`/api/history?limit=${limitCount}`)
    .then((res) => {
      if (!isCancelled && res?.history) {
        const mappedItems: HistoryItem[] = res.history.map((row) => ({
          id: row.id,
          gemId: row.gem_id,
          prompt: row.prompt,
          title: row.title,
          result: row.result_summary,
          timestamp: new Date(row.created_at).getTime()
        }));
        onData(mappedItems);
      }
    })
    .catch((err) => {
      console.warn('[HistoryRepository] Supabase fetch error:', err.message);
      if (!auth.currentUser && onError) {
        onError(err);
      }
    });

  // 2. Secondary fallback: ONLY if active in Firebase Auth
  if (auth.currentUser) {
    const historyColRef = collection(db, 'users', userId, 'historyLogs');
    const q = query(historyColRef, orderBy('timestamp', 'desc'), limit(limitCount));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (isCancelled) return;
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
        if (items.length > 0) {
          onData(items);
        }
      },
      (err) => {
        handleFirestoreError(err, 'subscribeUserHistory', `users/${userId}/historyLogs`);
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

export async function addUserHistoryItem(
  userId: string,
  historyId: string,
  item: Omit<HistoryItem, 'id'>
): Promise<void> {
  // 1. Primary: Save to Supabase PostgreSQL (public.history_logs)
  try {
    await apiClient.post('/api/history', {
      gemId: item.gemId,
      title: item.title,
      prompt: item.prompt,
      resultSummary: item.result || {}
    });
  } catch (err) {
    console.warn('[HistoryRepository] API save error:', err);
  }

  // 2. Secondary: Firestore retention sync only if logged into Firebase
  if (auth.currentUser) {
    try {
      const historyRef = doc(db, 'users', userId, 'historyLogs', historyId);
      await setDoc(historyRef, {
        ...item,
        timestamp: item.timestamp || Date.now()
      });
    } catch (err) {
      console.warn('[HistoryRepository] Firestore sync skipped:', err);
    }
  }
}

export async function updateHistoryTitle(
  userId: string,
  historyId: string,
  title: string
): Promise<void> {
  if (auth.currentUser) {
    try {
      const historyRef = doc(db, 'users', userId, 'historyLogs', historyId);
      await updateDoc(historyRef, { title });
    } catch (err) {
      console.warn('[HistoryRepository] updateHistoryTitle skipped:', err);
    }
  }
}

export async function deleteHistoryItem(userId: string, historyId: string): Promise<void> {
  // 1. Primary: Delete from Supabase PostgreSQL (public.history_logs)
  try {
    await apiClient.delete(`/api/history/${historyId}`);
  } catch (err) {
    console.warn('[HistoryRepository] API delete error:', err);
  }

  // 2. Secondary: Firestore delete only if logged into Firebase
  if (auth.currentUser) {
    try {
      const historyRef = doc(db, 'users', userId, 'historyLogs', historyId);
      await deleteDoc(historyRef);
    } catch (err) {
      console.warn('[HistoryRepository] Firestore delete skipped:', err);
    }
  }
}
