/**
 * User Account & Balance Firestore Repository.
 * Collection: `users/{userId}`
 */

import { doc, onSnapshot, setDoc, updateDoc, db, handleFirestoreError } from '../firestore.js';
import { apiClient } from '../../api/apiClient.js';
import type { UserAccountData } from '@shared-types/user.js';

export function subscribeUserAccount(
  userId: string,
  onData: (data: UserAccountData | null) => void,
  onError?: (err: any) => void
): () => void {
  let isCancelled = false;

  // 1. Primary: Fetch authoritative balance from Supabase PostgreSQL (public.credit_balances)
  apiClient.get<{ success: boolean; balance: number; availableBalance: number }>('/api/payment/balance')
    .then((res) => {
      if (!isCancelled && res?.balance !== undefined) {
        onData({
          balance: res.availableBalance ?? res.balance,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    })
    .catch((err) => {
      console.warn('[UserRepository] Supabase fetch fallback to Firestore:', err.message);
    });

  // 2. Secondary fallback: Firestore listener
  const userRef = doc(db, 'users', userId);
  const unsubscribe = onSnapshot(
    userRef,
    (snap) => {
      if (isCancelled) return;
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

  return () => {
    isCancelled = true;
    unsubscribe();
  };
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
