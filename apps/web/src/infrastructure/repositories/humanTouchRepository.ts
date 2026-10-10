/**
 * Human Touch Review Requests Repository.
 * Backed authoritatively by Supabase PostgreSQL (public.human_touch_requests).
 */

import { apiClient } from '../api/apiClient.js';
import type { HumanTouchRequest } from '@shared-types/user.js';

export interface HumanTouchQueueOptions {
  scope?: 'workspace' | 'all';
  intervalMs?: number;
}

function normalizeRecord(d: any): HumanTouchRequest & { id: string } {
  return {
    id: d.id,
    userId: d.requesterId || d.requester_id || d.userId || '',
    userEmail: d.emailReceipt || d.email_receipt || d.userEmail || '',
    emailReceipt: d.emailReceipt || d.email_receipt || '',
    assetType: d.assetType || d.asset_type || 'image',
    assetUrl: d.storagePath || d.storage_path || d.assetUrl || '',
    originalPrompt: d.originalPrompt || d.original_prompt || '',
    modelsUsed: d.modelsUsed || d.models_used || '',
    userComment: d.userComment || d.user_comment || '',
    status: d.status || 'pending',
    timestamp: d.createdAt ? new Date(d.createdAt).getTime() : (d.created_at ? new Date(d.created_at).getTime() : d.timestamp || Date.now()),
    completedAssetUrl: d.completedStoragePath || d.completed_storage_path || d.completedAssetUrl || '',
    completedComment: d.completedComment || d.completed_comment || '',
    completedTimestamp: d.completedAt ? new Date(d.completedAt).getTime() : (d.completed_at ? new Date(d.completed_at).getTime() : undefined)
  };
}

export async function submitHumanTouchRequest(
  _requestId: string,
  requestData: HumanTouchRequest
): Promise<{ success: boolean; requestId?: string; message?: string }> {
  const res = await apiClient.post<{ success: boolean; requestId: string; message: string }>('/api/human-touch', {
    originalPrompt: requestData.originalPrompt,
    assetType: requestData.assetType || 'image',
    assetUrl: requestData.assetUrl || '',
    modelsUsed: requestData.modelsUsed || '',
    userComment: requestData.userComment || 'Review requested',
    emailReceipt: requestData.userEmail || requestData.emailReceipt || 'business@writopedia.com'
  });
  return res;
}

export function subscribeHumanTouchQueue(
  onData: (requests: (HumanTouchRequest & { id: string })[]) => void,
  onError?: (err: any) => void,
  options?: HumanTouchQueueOptions
): () => void {
  let isCancelled = false;
  let isFetching = false;
  const scope = options?.scope === 'all' ? 'all' : 'workspace';
  const intervalMs = options?.intervalMs ?? 25000;

  const fetchQueue = () => {
    if (isCancelled || isFetching) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    isFetching = true;
    apiClient.get<{ success: boolean; requests: any[] }>(`/api/human-touch/queue?scope=${scope}`)
      .then((res) => {
        if (!isCancelled && Array.isArray(res?.requests)) {
          const normalized = res.requests.map(normalizeRecord);
          onData(normalized);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('[HumanTouchRepository] API fetch error:', err?.message);
          if (onError) onError(err);
        }
      })
      .finally(() => {
        isFetching = false;
      });
  };

  // Initial fetch immediately
  fetchQueue();

  // Background polling for real-time queue updates
  const intervalId = setInterval(fetchQueue, intervalMs);

  // Resume immediately when user focuses back on the tab
  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && !document.hidden && !isCancelled) {
      fetchQueue();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return () => {
    isCancelled = true;
    clearInterval(intervalId);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
}

export async function updateHumanTouchRequestStatus(
  requestId: string,
  updateData: {
    status?: 'pending' | 'in_review' | 'completed' | 'rejected';
    completedAssetUrl?: string;
    completedComment?: string;
  }
): Promise<any> {
  const res = await apiClient.patch(`/api/human-touch/${requestId}`, updateData);
  return res;
}

export async function cancelHumanTouchRequest(requestId: string): Promise<any> {
  const res = await apiClient.post(`/api/human-touch/${requestId}/cancel`, {});
  return res;
}

export async function deleteHumanTouchRequest(requestId: string): Promise<void> {
  await cancelHumanTouchRequest(requestId);
}

