/**
 * Credit & Ledger Domain Service.
 * Business logic layer orchestrating credit reservations, holds, captures, and audits.
 * Strictly production-oriented: direct execution against PostgreSQL stored procedures with zero mock fallbacks.
 */

import { creditRepository } from "../repositories/creditRepository.js";
import { InsufficientCreditsError } from "../modules/billing/billingErrorUtils.js";

export class CreditService {
  async getAvailableBalance(workspaceId: string): Promise<number> {
    const balanceRecord = await creditRepository.getBalance(workspaceId);
    return balanceRecord ? balanceRecord.availableBalance : 0;
  }

  /**
   * Alias for getAvailableBalance for backward compatibility.
   */
  async getBalance(workspaceId: string): Promise<number> {
    return this.getAvailableBalance(workspaceId);
  }

  /**
   * Convenience wrapper to reserve credits and return the hold ID directly.
   */
  async holdCredits(
    workspaceId: string,
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    idempotencyKey?: string
  ): Promise<string> {
    const ref = referenceId || `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const res = await this.reserveCredits({
      workspaceId,
      userId,
      amount,
      referenceId: ref,
      description,
      idempotencyKey,
    });

    if (!res.success || !res.holdId) {
      const available = await this.getAvailableBalance(workspaceId).catch(() => 0);
      throw new InsufficientCreditsError({
        service: "Credit Service",
        requiredCredits: amount,
        availableCredits: res.available ?? available,
        customMessage: res.error || "Insufficient credits available in workspace."
      });
    }

    return res.holdId;
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
