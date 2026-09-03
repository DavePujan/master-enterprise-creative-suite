/**
 * Human Touch Review Requests Firestore Repository.
 * Collections: `users/{userId}/humanTouchRequests/{requestId}`, `humanTouchRequests/{requestId}`
 */

import { doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, query, orderBy, db, handleFirestoreError } from '../firestore.js';
import { apiClient } from '../../api/apiClient.js';
import type { HumanTouchRequest } from '@shared-types/user.js';

export async function submitHumanTouchRequest(
  requestId: string,
  requestData: HumanTouchRequest
): Promise<void> {
  // 1. Primary: Save to Supabase PostgreSQL (public.human_touch_requests)
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
    console.warn('[HumanTouchRepository] API submit error, proceeding to dual-save:', err);
  }

  // 2. Secondary: Firestore retention sync
  try {
    if (requestData.userId) {
      const userRequestRef = doc(db, 'users', requestData.userId, 'humanTouchRequests', requestId);
      await setDoc(userRequestRef, requestData);
    }

    const globalRequestRef = doc(db, 'humanTouchRequests', requestId);
    await setDoc(globalRequestRef, requestData);
  } catch (err) {
    console.warn('[HumanTouchRepository] Firestore sync skipped:', err);
  }
}

export function subscribeHumanTouchQueue(
  onData: (requests: (HumanTouchRequest & { id: string })[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, 'humanTouchRequests');
  const q = query(colRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: (HumanTouchRequest & { id: string })[] = [];
      snapshot.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...(docSnap.data() as HumanTouchRequest)
        });
      });
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, 'subscribeHumanTouchQueue', 'humanTouchRequests');
      if (onError) onError(err);
    }
  );
}

export async function updateHumanTouchRequestStatus(
  requestId: string,
  updateData: Partial<HumanTouchRequest>,
  userId?: string
): Promise<void> {
  const globalRef = doc(db, 'humanTouchRequests', requestId);
  await updateDoc(globalRef, updateData);
  if (userId) {
    const userRef = doc(db, 'users', userId, 'humanTouchRequests', requestId);
    await updateDoc(userRef, updateData).catch(() => {});
  }
}

export async function deleteHumanTouchRequest(requestId: string, userId?: string): Promise<void> {
  const globalRef = doc(db, 'humanTouchRequests', requestId);
  await deleteDoc(globalRef);
  if (userId) {
    const userRef = doc(db, 'users', userId, 'humanTouchRequests', requestId);
    await deleteDoc(userRef).catch(() => {});
  }
}
