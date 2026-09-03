/**
 * Credit & Ledger Domain Service.
 * Business logic layer orchestrating credit reservations, holds, captures, and audits.
 */

import { creditRepository } from "../repositories/creditRepository.js";

export class CreditService {
  async getAvailableBalance(workspaceId: string): Promise<number> {
    const balanceRecord = await creditRepository.getBalance(workspaceId);
    return balanceRecord ? balanceRecord.availableBalance : 0;
  }

  async reserveCredits(params: {
    workspaceId: string;
    userId: string;
    amount: number;
    referenceId: string;
    description: string;
    idempotencyKey?: string;
  }) {
    const idempotencyKey =
      params.idempotencyKey || `hold_${params.workspaceId}_${params.referenceId}`;

    return creditRepository.reserveHold({
      workspaceId: params.workspaceId,
      userId: params.userId,
      amount: params.amount,
      idempotencyKey,
      referenceId: params.referenceId,
      description: params.description,
    });
  }

  async captureCredits(holdId: string, idempotencyKey: string) {
    return creditRepository.captureHold({
      holdId,
      idempotencyKey,
    });
  }

  async releaseCredits(holdId: string, reason: string) {
    return creditRepository.releaseHold({
      holdId,
      reason,
    });
  }

  async grantCredits(params: {
    workspaceId: string;
    actorUserId: string;
    amount: number;
    type: string;
    idempotencyKey: string;
    referenceId: string;
    description: string;
  }) {
    return creditRepository.grant(params);
  }

  async cleanupExpiredHolds() {
    return creditRepository.expireStaleHolds();
  }
}

export const creditService = new CreditService();
