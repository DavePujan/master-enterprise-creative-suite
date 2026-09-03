/**
 * Human Touch Review Requests Repository.
 * Backed authoritatively by Supabase PostgreSQL (public.human_touch_requests).
 */

import { apiClient } from '../api/apiClient.js';
import type { HumanTouchRequest } from '@shared-types/user.js';

export async function submitHumanTouchRequest(
  _requestId: string,
  requestData: HumanTouchRequest
): Promise<void> {
  try {
    await apiClient.post('/api/human-touch', {
      originalPrompt: requestData.originalPrompt,
      assetType: requestData.assetType || 'image',
      assetUrl: requestData.assetUrl || '',
      modelsUsed: requestData.modelsUsed || '',
      userComment: requestData.userComment || 'Review requested',
      emailReceipt: requestData.userEmail || requestData.emailReceipt || 'business@writopedia.com'
    });
  } catch (err) {
    console.warn('[HumanTouchRepository] API submit error:', err);
  }
}

export function subscribeHumanTouchQueue(
  onData: (requests: (HumanTouchRequest & { id: string })[]) => void,
  onError?: (err: any) => void
): () => void {
  let isCancelled = false;

  apiClient.get<{ success: boolean; requests: any[] }>('/api/human-touch/queue')
    .then((res) => {
      if (!isCancelled && res?.requests) {
        onData(res.requests as any);
      }
    })
    .catch((err) => {
      console.warn('[HumanTouchRepository] API fetch error:', err.message);
      if (onError) onError(err);
    });

  return () => {
    isCancelled = true;
  };
}

export async function updateHumanTouchRequestStatus(
  requestId: string,
  updateData: Partial<HumanTouchRequest>,
  _userId?: string
): Promise<void> {
  try {
    await apiClient.patch(`/api/human-touch/${requestId}`, updateData);
  } catch (e) {
    console.warn('[HumanTouchRepository] API update error:', e);
  }
}

export async function deleteHumanTouchRequest(requestId: string, _userId?: string): Promise<void> {
  try {
    await apiClient.delete(`/api/human-touch/${requestId}`);
  } catch (e) {
    console.warn('[HumanTouchRepository] API delete error:', e);
  }
}
