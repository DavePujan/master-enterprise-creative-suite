/**
 * Billing & Payment Fulfillment Domain Service.
 * Server-authoritative order creation, cryptographic verification, and idempotent credit granting.
 * Strict Defenses: DB-derived entitlements, client plan-mismatch rejection, and atomic credit grants.
 */

import { paymentRepository } from "../repositories/paymentRepository.js";
import { creditService } from "./creditService.js";
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchRazorpayOrderPayments,
} from "../infrastructure/payment/razorpayClient.js";
import { PLAN_PRICING_CATALOG, type PlanId } from "../../../../packages/types/billing.js";

export class BillingService {
  /**
   * Server-authoritative order creation.
   * Client provides ONLY planId and desired currency. Payable amount is derived strictly from PLAN_PRICING_CATALOG.
   */
  async createOrder(params: {
    workspaceId: string;
    userId: string;
    planId: PlanId;
    currency?: string;
  }) {
    const plan = PLAN_PRICING_CATALOG[params.planId];
    if (!plan) {
      throw new Error(`Invalid planId: "${params.planId}". Not found in canonical catalog.`);
    }

    const targetCurrency = params.currency === "INR" ? "INR" : "USD";
    const serverAmountSubunits = targetCurrency === "INR" ? plan.inrSubunits : plan.usdSubunits;

    // 1. Create order with Razorpay gateway
    const orderResult = await createRazorpayOrder(serverAmountSubunits, targetCurrency);

    // 2. Persist order in payments table with initial status 'created'
    await paymentRepository.create({
      workspaceId: params.workspaceId,
      userId: params.userId,
      orderId: orderResult.id,
      planId: plan.id,
      amountSubunits: serverAmountSubunits,
      currency: targetCurrency,
      isSimulated: orderResult.isSimulated,
      idempotencyKey: `order_${orderResult.id}`,
    });

    return {
      id: orderResult.id,
      amount: serverAmountSubunits,
      currency: targetCurrency,
      planId: plan.id,
      isSimulated: orderResult.isSimulated,
    };
  }

  /**
   * Server-authoritative verification & idempotent credit fulfillment.
   * Derives entitlement strictly from the persisted database order record, never client input.
   */
  async verifyAndFulfillPayment(params: {
    workspaceId: string;
    userId: string;
    orderId: string;
    paymentId: string;
    signature: string;
    clientPlanId?: string;
    providerEventId?: string;
  }): Promise<{
    success: boolean;
    alreadyFulfilled?: boolean;
    creditsGranted?: number;
    newBalance?: number;
    error?: string;
  }> {
    // 1. Authoritative lookup of stored order record
    const storedPayment = await paymentRepository.getByOrderId(params.orderId);
    if (!storedPayment) {
      return {
        success: false,
        error: `Payment order "${params.orderId}" not found in database. Cannot fulfill unrecorded order.`,
      };
    }

    // 2. Tenant isolation & ownership verification
    if (storedPayment.workspaceId !== params.workspaceId || storedPayment.userId !== params.userId) {
      console.error(`Billing security violation: Cross-workspace payment verification attempt.`, {
        storedWorkspace: storedPayment.workspaceId,
        requestWorkspace: params.workspaceId,
        storedUser: storedPayment.userId,
        requestUser: params.userId,
      });
      return {
        success: false,
        error: "Unauthorized: Payment does not belong to the authenticated user or workspace.",
      };
    }

    // 3. Strict Plan Mismatch Protection: Reject if client claims a different plan than the order record
    if (params.clientPlanId && params.clientPlanId !== storedPayment.planId) {
      console.error(`Billing fraud attempt: Client plan mismatch.`, {
        orderId: storedPayment.orderId,
        storedPlan: storedPayment.planId,
        clientPlan: params.clientPlanId,
      });
      return {
        success: false,
        error: `Plan tampering detected: Order was registered for plan "${storedPayment.planId}", but client requested "${params.clientPlanId}".`,
      };
    }

    const plan = PLAN_PRICING_CATALOG[storedPayment.planId as PlanId];
    const creditsToGrant = plan?.credits || 100;

    // 4. Check terminal states: expired or failed orders can never receive credits
    if (storedPayment.status === "expired") {
      return {
        success: false,
        error: `Cannot fulfill payment for order "${params.orderId}": Order has expired.`,
      };
    }
    if (storedPayment.status === "failed") {
      return {
        success: false,
        error: `Cannot fulfill payment for order "${params.orderId}": Order is marked as failed.`,
      };
    }

    // 5. Idempotency Check: If already captured, return existing fulfillment without granting duplicate credits
    if (storedPayment.status === "captured") {
      return {
        success: true,
        alreadyFulfilled: true,
        creditsGranted: creditsToGrant,
      };
    }

    // 6. Cryptographic HMAC Signature Verification
    const verification = verifyRazorpaySignature(
      storedPayment.orderId,
      params.paymentId,
      params.signature
    );

    if (!verification.verified) {
      await paymentRepository.updateStatus({
        orderId: storedPayment.orderId,
        paymentId: params.paymentId,
        signature: params.signature,
        status: "failed",
      });
      return {
        success: false,
        error: "Cryptographic signature verification failed. Payment authenticity could not be verified.",
      };
    }

    // 7. Transition state to 'captured'
    const updated = await paymentRepository.updateStatus({
      orderId: storedPayment.orderId,
      paymentId: params.paymentId,
      signature: params.signature,
      status: "captured",
      providerEventId: params.providerEventId || `pay_${params.paymentId}`,
    });

    if (!updated) {
      return {
        success: false,
        error: `State transition rejected: Order "${storedPayment.orderId}" cannot transition to captured from "${storedPayment.status}".`,
      };
    }

    // 8. Atomic Credit Grant via idempotent stored procedure
    const grantResult = await creditService.grantCredits({
      workspaceId: storedPayment.workspaceId,
      actorUserId: storedPayment.userId,
      amount: creditsToGrant,
      type: "purchase",
      referenceId: storedPayment.orderId,
      description: `Payment fulfillment for ${plan ? plan.name : storedPayment.planId} (Order: ${storedPayment.orderId}, Payment: ${params.paymentId})`,
      idempotencyKey: `fulfillment_${params.paymentId}`,
    });

    return {
      success: true,
      creditsGranted: creditsToGrant,
      newBalance: grantResult.newBalance,
    };
  }

  /**
   * Processes server-to-server Razorpay Webhooks (payment.captured, order.paid).
   * Fully idempotent: safe against out-of-order or duplicate webhook deliveries.
   */
  async handleWebhookEvent(
    event: {
      event: string;
      payload: any;
      id?: string;
    },
    headerEventId?: string
  ): Promise<{ handled: boolean; message: string }> {
    const { event: eventName, payload } = event;
    const providerEventId = headerEventId || event.id;

    if (eventName === "payment.captured") {
      const paymentEntity = payload?.payment?.entity;
      if (!paymentEntity) return { handled: false, message: "Missing payment entity in webhook payload" };

      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      if (!orderId) {
        return { handled: false, message: "Payment entity lacks order_id" };
      }

      const storedPayment = await paymentRepository.getByOrderId(orderId);
      if (!storedPayment) {
        return { handled: false, message: `No order found for order_id: ${orderId}` };
      }

      if (storedPayment.status === "captured") {
        // If previously captured by order.paid before payment.captured arrived, record paymentId if missing
        if (!storedPayment.paymentId && paymentId) {
          await paymentRepository.updateStatus({
            orderId,
            paymentId,
            status: "captured",
          });
        }
        return { handled: true, message: "Order already captured; idempotent no-op." };
      }

      if (storedPayment.status === "expired" || storedPayment.status === "failed") {
        return {
          handled: false,
          message: `Order "${orderId}" is in terminal state "${storedPayment.status}". Cannot transition to captured.`,
        };
      }

      const plan = PLAN_PRICING_CATALOG[storedPayment.planId as PlanId];
      const creditsToGrant = plan?.credits || 100;

      const updated = await paymentRepository.updateStatus({
        orderId,
        paymentId,
        status: "captured",
        providerEventId: providerEventId || `webhook_${paymentId}`,
      });

      if (!updated) {
        return { handled: false, message: `State transition rejected: Order "${orderId}" cannot transition to captured.` };
      }

      await creditService.grantCredits({
        workspaceId: storedPayment.workspaceId,
        actorUserId: storedPayment.userId,
        amount: creditsToGrant,
        type: "purchase",
        referenceId: orderId,
        description: `Webhook fulfillment for ${plan ? plan.name : storedPayment.planId} (Order: ${orderId})`,
        idempotencyKey: `fulfillment_${paymentId}`,
      });

      return { handled: true, message: `Successfully captured and granted ${creditsToGrant} credits.` };
    }

    if (eventName === "order.paid") {
      const orderEntity = payload?.order?.entity;
      if (!orderEntity) return { handled: false, message: "Missing order entity in webhook payload" };

      const orderId = orderEntity.id;
      const storedPayment = await paymentRepository.getByOrderId(orderId);
      if (!storedPayment) {
        return { handled: false, message: `No order found for order_id: ${orderId}` };
      }

      if (storedPayment.status === "captured") {
        return { handled: true, message: "Order already captured; idempotent no-op." };
      }

      if (storedPayment.status === "expired" || storedPayment.status === "failed") {
        return {
          handled: false,
          message: `Order "${orderId}" is in terminal state "${storedPayment.status}". Cannot transition to captured.`,
        };
      }

      const plan = PLAN_PRICING_CATALOG[storedPayment.planId as PlanId];
      const creditsToGrant = plan?.credits || 100;

      const updated = await paymentRepository.updateStatus({
        orderId,
        status: "captured",
        providerEventId: providerEventId || `webhook_order_${orderId}`,
      });

      if (!updated) {
        return { handled: false, message: `State transition rejected: Order "${orderId}" cannot transition to captured.` };
      }

      await creditService.grantCredits({
        workspaceId: storedPayment.workspaceId,
        actorUserId: storedPayment.userId,
        amount: creditsToGrant,
        type: "purchase",
        referenceId: orderId,
        description: `Webhook order.paid fulfillment for ${plan ? plan.name : storedPayment.planId} (Order: ${orderId})`,
        idempotencyKey: `fulfillment_order_${orderId}`,
      });

      return { handled: true, message: `Successfully completed order.paid fulfillment.` };
    }

    return { handled: true, message: `Event ${eventName} ignored (no action required).` };
  }

  /**
   * Server-side Payment Status Reconciliation (Fallback when webhook is delayed/missing).
   * Queries Razorpay API to inspect if a payment has been captured, and idempotently fulfills it.
   */
  async reconcilePaymentStatus(orderId: string): Promise<{
    success: boolean;
    alreadyFulfilled?: boolean;
    reconciled?: boolean;
    creditsGranted?: number;
    newBalance?: number;
    error?: string;
  }> {
    const storedPayment = await paymentRepository.getByOrderId(orderId);
    if (!storedPayment) {
      return { success: false, error: `Order "${orderId}" not found in database.` };
    }

    // Check terminal states: expired or failed orders can never receive credits
    if (storedPayment.status === "expired" || storedPayment.status === "failed") {
      return {
        success: false,
        error: `Cannot reconcile payment for order "${orderId}": Order is in terminal state "${storedPayment.status}".`,
      };
    }

    const plan = PLAN_PRICING_CATALOG[storedPayment.planId as PlanId];
    const creditsToGrant = plan?.credits || 100;

    if (storedPayment.status === "captured") {
      return {
        success: true,
        alreadyFulfilled: true,
        creditsGranted: creditsToGrant,
      };
    }

    try {
      const payments = await fetchRazorpayOrderPayments(orderId);
      const capturedPayment = payments.find((p: any) => p.status === "captured");

      if (!capturedPayment) {
        return {
          success: false,
          error: `No captured payment found on Razorpay for order "${orderId}". Current status: ${storedPayment.status}`,
        };
      }

      // Reconcile amount and currency
      const paymentAmount = Number(capturedPayment.amount);
      if (paymentAmount !== storedPayment.amountSubunits || capturedPayment.currency !== storedPayment.currency) {
        console.error("Reconciliation amount/currency mismatch:", {
          expected: { amount: storedPayment.amountSubunits, currency: storedPayment.currency },
          actual: { amount: paymentAmount, currency: capturedPayment.currency },
        });
        return {
          success: false,
          error: "Reconciliation failed: Amount or currency does not match stored order.",
        };
      }

      // Transition to captured
      await paymentRepository.updateStatus({
        orderId,
        paymentId: capturedPayment.id,
        status: "captured",
        providerEventId: `recon_${capturedPayment.id}`,
      });

      // Grant credits idempotently
      const grantResult = await creditService.grantCredits({
        workspaceId: storedPayment.workspaceId,
        actorUserId: storedPayment.userId,
        amount: creditsToGrant,
        type: "purchase",
        referenceId: orderId,
        description: `Reconciled payment fulfillment for ${plan ? plan.name : storedPayment.planId} (Order: ${orderId}, Payment: ${capturedPayment.id})`,
        idempotencyKey: `fulfillment_${capturedPayment.id}`,
      });

      return {
        success: true,
        reconciled: true,
        creditsGranted: creditsToGrant,
        newBalance: grantResult.newBalance,
      };
    } catch (err: any) {
      console.error("Error during payment status reconciliation:", err);
      return { success: false, error: err.message || "Failed to query Razorpay order payments." };
    }
  }
}

export const billingService = new BillingService();
