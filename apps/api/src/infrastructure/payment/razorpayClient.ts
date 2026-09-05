/**
 * Razorpay Payment Client & HMAC Signature Verifier.
 * Server-authoritative gateway interface with timing-safe cryptographic verification.
 * Fail-closed security: simulation is restricted exclusively to explicit test mode flags.
 */

import crypto from "crypto";
import { serverConfig } from "../../config/env.js";

export interface RazorpayOrderResult {
  id: string;
  amount: number | string;
  currency: string;
  receipt: string;
  isSimulated?: boolean;
}

/**
 * Creates an order directly with Razorpay gateway.
 * Throws if credentials are missing (unless ENABLE_PAYMENT_SIMULATION=true in non-production).
 * Throws if the gateway returns an error. Never silently simulates a success on API failure.
 */
export async function createRazorpayOrder(
  amount: number | string,
  currency: string = "USD"
): Promise<RazorpayOrderResult> {
  const keyId = serverConfig.razorpayKeyId;
  const keySecret = serverConfig.razorpayKeySecret;

  if (!keyId || !keySecret) {
    if (serverConfig.enablePaymentSimulation && serverConfig.nodeEnv !== "production") {
      console.warn("⚠️ RAZORPAY BILLING: Keys missing, but ENABLE_PAYMENT_SIMULATION=true in dev/test environment.");
      const sandboxId = "order_simulated_" + Math.random().toString(36).substring(2, 11);
      return {
        id: sandboxId,
        amount,
        currency: currency || "USD",
        receipt: "receipt_sim_" + Date.now(),
        isSimulated: true,
      };
    }

    throw new Error(
      "Razorpay gateway credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing. Cannot process payment order."
    );
  }

  const targetCurrency = (currency || "USD").toUpperCase();
  const targetAmount = Math.round(Number(amount));
  const authHeader = "Basic " + Buffer.from(`${keyId.trim()}:${keySecret.trim()}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      amount: targetAmount,
      currency: targetCurrency,
      receipt: "rec_" + Math.random().toString(36).substring(2, 10),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Razorpay order creation failed (HTTP ${response.status}):`, errorText);
    throw new Error(`Razorpay gateway error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { id: string; amount: number; currency: string; receipt: string };
  return {
    id: data.id,
    amount: data.amount,
    currency: data.currency,
    receipt: data.receipt,
    isSimulated: false,
  };
}

/**
 * Timing-safe cryptographic HMAC-SHA256 signature verification for order checkout callbacks.
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): { verified: boolean; isSimulated?: boolean } {
  const keySecret = serverConfig.razorpayKeySecret;

  // Controlled simulation only if enabled and explicit simulated order ID
  if (
    serverConfig.enablePaymentSimulation &&
    serverConfig.nodeEnv !== "production" &&
    (String(orderId).includes("simulated") || String(orderId).includes("sandbox"))
  ) {
    console.warn(`Simulated payment signature approved in dev/test mode for order: ${orderId}`);
    return { verified: true, isSimulated: true };
  }

  if (!keySecret) {
    console.error("Razorpay signature verification rejected: RAZORPAY_KEY_SECRET is missing.");
    return { verified: false };
  }

  if (!orderId || !paymentId || !signature) {
    return { verified: false };
  }

  try {
    const hmac = crypto.createHmac("sha256", keySecret.trim());
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const genBuffer = Buffer.from(generatedSignature, "hex");

    if (sigBuffer.length !== genBuffer.length) {
      return { verified: false };
    }

    const isMatch = crypto.timingSafeEqual(sigBuffer, genBuffer);
    return { verified: isMatch };
  } catch (err) {
    console.error("Error during Razorpay signature verification:", err);
    return { verified: false };
  }
}

/**
 * Timing-safe cryptographic HMAC-SHA256 verification for Razorpay Webhook payloads.
 * Must use the exact raw unparsed request Buffer body.
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secretOverride?: string
): boolean {
  const secret = secretOverride || serverConfig.razorpayWebhookSecret;
  if (!secret || !signature || !rawBody) {
    return false;
  }

  try {
    const hmac = crypto.createHmac("sha256", secret.trim());
    hmac.update(rawBody);
    const generatedSignature = hmac.digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const genBuffer = Buffer.from(generatedSignature, "hex");

    if (sigBuffer.length !== genBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, genBuffer);
  } catch (err) {
    console.error("Error during Webhook signature verification:", err);
    return false;
  }
}
