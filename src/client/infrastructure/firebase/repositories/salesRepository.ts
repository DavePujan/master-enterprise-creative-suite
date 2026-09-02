/**
 * Sales Submissions Firestore Repository.
 * Collection: `salesSubmissions/{submissionId}`
 */

import { doc, collection, onSnapshot, setDoc, query, orderBy, db, handleFirestoreError } from '../firestore.js';
import type { SalesSubmission } from '../../../../shared/types/user.js';

export async function submitSalesInquiry(
  submissionId: string,
  data: SalesSubmission
): Promise<void> {
  const submissionRef = doc(db, 'salesSubmissions', submissionId);
  await setDoc(submissionRef, data);
}

export function subscribeSalesSubmissions(
  onData: (submissions: (SalesSubmission & { id: string })[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, 'salesSubmissions');
  const q = query(colRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: (SalesSubmission & { id: string })[] = [];
      snapshot.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...(docSnap.data() as SalesSubmission)
        });
      });
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, 'subscribeSalesSubmissions', 'salesSubmissions');
      if (onError) onError(err);
    }
  );
}
