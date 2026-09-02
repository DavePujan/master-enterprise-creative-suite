/**
 * Human Touch Review Requests Firestore Repository.
 * Collections: `users/{userId}/humanTouchRequests/{requestId}`, `humanTouchRequests/{requestId}`
 */

import { doc, collection, onSnapshot, setDoc, query, orderBy, db, handleFirestoreError } from '../firestore.js';
import type { HumanTouchRequest } from '../../../../shared/types/user.js';

export async function submitHumanTouchRequest(
  requestId: string,
  requestData: HumanTouchRequest
): Promise<void> {
  // 1. User specific subcollection (if userId provided)
  if (requestData.userId) {
    const userRequestRef = doc(db, 'users', requestData.userId, 'humanTouchRequests', requestId);
    await setDoc(userRequestRef, requestData);
  }

  // 2. Global collection for Admin queue
  const globalRequestRef = doc(db, 'humanTouchRequests', requestId);
  await setDoc(globalRequestRef, requestData);
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
