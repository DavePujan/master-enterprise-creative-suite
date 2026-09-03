/**
 * User Account & Balance Repository.
 * Backed authoritatively by Supabase PostgreSQL (public.credit_balances).
 */

import { apiClient } from '../api/apiClient.js';
import type { UserAccountData } from '@shared-types/user.js';

export function subscribeUserAccount(
  _userId: string,
  onData: (data: UserAccountData | null) => void,
  onError?: (err: any) => void
): () => void {
  let isCancelled = false;

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
      console.warn('[UserRepository] Supabase balance fetch error:', err.message);
      if (onError) onError(err);
    });

  return () => {
    isCancelled = true;
  };
}

export async function initUserAccount(_userId: string, _initialBalance: number = 50): Promise<void> {
  // Balance is initialized authoritatively in Supabase PostgreSQL by serverAuth.ts
}

export async function updateUserBalance(_userId: string, _newBalance: number): Promise<void> {
  // Balance is managed authoritatively in Supabase PostgreSQL by server-side payment/generation routes
}
