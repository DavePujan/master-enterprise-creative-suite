/**
 * History Logs Repository.
 * Backed authoritatively by Supabase PostgreSQL (public.history_logs).
 */

import { apiClient } from '../api/apiClient.js';
import type { HistoryItem } from '@shared-types/user.js';

export function subscribeUserHistory(
  _userId: string,
  onData: (items: HistoryItem[]) => void,
  limitCount: number = 20,
  onError?: (err: any) => void
): () => void {
  let isCancelled = false;

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
      if (onError) onError(err);
    });

  return () => {
    isCancelled = true;
  };
}

export async function addUserHistoryItem(
  _userId: string,
  _historyId: string,
  item: Omit<HistoryItem, 'id'>
): Promise<void> {
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
}

export async function updateHistoryTitle(
  _userId: string,
  historyId: string,
  title: string
): Promise<void> {
  try {
    await apiClient.patch(`/api/history/${historyId}`, { title });
  } catch (err) {
    console.warn('[HistoryRepository] updateHistoryTitle error:', err);
  }
}

export async function deleteHistoryItem(_userId: string, historyId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/history/${historyId}`);
  } catch (err) {
    console.warn('[HistoryRepository] API delete error:', err);
  }
}

export async function clearAllHistory(_userId: string): Promise<void> {
  try {
    await apiClient.delete('/api/history');
  } catch (err) {
    console.warn('[HistoryRepository] clearAllHistory error:', err);
  }
}
