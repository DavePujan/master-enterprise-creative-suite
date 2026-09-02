/**
 * User Account & Balance Firestore Repository.
 * Collection: `users/{userId}`
 */

import { doc, onSnapshot, setDoc, updateDoc, db, handleFirestoreError } from '../firestore.js';
import type { UserAccountData } from '../../../../shared/types/user.js';

export function subscribeUserAccount(
  userId: string,
  onData: (data: UserAccountData | null) => void,
  onError?: (err: any) => void
): () => void {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as UserAccountData);
      } else {
        onData(null);
      }
    },
    (err) => {
      handleFirestoreError(err, 'subscribeUserAccount', `users/${userId}`);
      if (onError) onError(err);
    }
  );
}

export async function initUserAccount(userId: string, initialBalance: number = 36): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    balance: initialBalance,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

export async function updateUserBalance(userId: string, newBalance: number): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    balance: newBalance,
    updatedAt: Date.now()
  });
}
