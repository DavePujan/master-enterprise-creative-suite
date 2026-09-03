/**
 * Billing & Payment Fulfillment Domain Service.
 * Orchestrates Razorpay payment orders, signature verification, and atomic credit granting.
 */

import { paymentRepository } from "../repositories/paymentRepository.js";
import { creditService } from "./creditService.js";
import { createRazorpayOrder, verifyRazorpaySignature } from "../infrastructure/payment/razorpayClient.js";
import { PLAN_PRICING_CATALOG, type PlanId } from "../../../../packages/types/billing.js";

export class BillingService {
  async createOrder(params: {
    workspaceId: string;
    userId: string;
    planId: PlanId;
    currency?: string;
  }) {
    const plan = PLAN_PRICING_CATALOG[params.planId];
    if (!plan) {
      throw new Error(`Invalid planId: ${params.planId}`);
    }

    const targetCurrency = params.currency === "INR" ? "INR" : "USD";
    const serverAmount = targetCurrency === "INR" ? plan.inrSubunits : plan.usdSubunits;

    // 1. Create order with Razorpay or sandbox fallback
    const orderResult = await createRazorpayOrder(serverAmount, targetCurrency);

    // 2. Persist order in payments table
    await paymentRepository.create({
      workspaceId: params.workspaceId,
      userId: params.userId,
      orderId: orderResult.id,
      planId: plan.id,
      amountSubunits: serverAmount,
      currency: targetCurrency,
      isSimulated: orderResult.isSimulated,
      idempotencyKey: `order_${orderResult.id}`,
    });

    return orderResult;
  }

  async verifyAndFulfillPayment(params: {
    workspaceId: string;
    userId: string;
    orderId: string;
    paymentId: string;
    signature: string;
    planId: PlanId;
    providerEventId?: string;
  }): Promise<{
    success: boolean;
    alreadyFulfilled?: boolean;
    newBalance?: number;
    error?: string;
  }> {
    // 1. Check existing payment in database
    const existingPayment = await paymentRepository.getByOrderId(params.orderId);
    if (existingPayment && existingPayment.status === "captured") {
      return {
        success: true,
        alreadyFulfilled: true,
      };
    }

    // 2. Verify Cryptographic HMAC Signature
    const isValidSignature = verifyRazorpaySignature(
      params.orderId,
      params.paymentId,
      params.signature
    );

    if (!isValidSignature) {
      await paymentRepository.updateStatus({
        orderId: params.orderId,
        paymentId: params.paymentId,
        signature: params.signature,
        status: "failed",
      });
      return { success: false, error: "Cryptographic signature verification failed" };
    }

    // 3. Mark payment as captured in database
    await paymentRepository.updateStatus({
      orderId: params.orderId,
      paymentId: params.paymentId,
      signature: params.signature,
      status: "captured",
      providerEventId: params.providerEventId || `pay_${params.paymentId}`,
    });

    // 4. Resolve plan credit entitlement
    const plan = PLAN_PRICING_CATALOG[params.planId];
    const creditsToGrant = plan?.credits || 100;

    // 5. Grant credits atomically via idempotent stored procedure
    const grantResult = await creditService.grantCredits({
      workspaceId: params.workspaceId,
      actorUserId: params.userId,
      amount: creditsToGrant,
      type: "topup_purchase",
      idempotencyKey: `fulfillment_${params.paymentId}`,
      referenceId: params.paymentId,
      description: `Payment fulfillment for ${params.planId} (${params.paymentId})`,
    });

    return {
      success: true,
      newBalance: grantResult.newBalance,
    };
  }
}

export const billingService = new BillingService();
