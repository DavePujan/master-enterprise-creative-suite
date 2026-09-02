/**
 * Razorpay Payment Client & HMAC Signature Verifier.
 * Preserves exact order creation, simulation fallbacks, and HMAC SHA256 logic.
 */

import crypto from "crypto";
import { serverConfig } from "../../config/env.js";

export async function createRazorpayOrder(
  amount: number | string,
  currency: string = "USD"
): Promise<{ id: string; amount: number | string; currency: string; receipt: string; isSimulated?: boolean }> {
  const keyId = serverConfig.razorpayKeyId;
  const keySecret = serverConfig.razorpayKeySecret;

  if (!keyId || !keySecret) {
    console.log("-----------------------------------------------------------------");
    console.log("⚠️ RAZORPAY BILLING: KEYS MISSING OR INCOMPLETE IN ENVIRONMENT");
    console.log("Simulating secure order creation in sandbox mode.");
    console.log(`Amount requested: ${amount} subunits (Currency: ${currency || "USD"})`);
    console.log("To unlock live processing, configure VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
    console.log("-----------------------------------------------------------------");

    const sandboxId = "order_sandbox_" + Math.random().toString(36).substring(2, 11);
    return {
      id: sandboxId,
      amount: amount,
      currency: currency || "USD",
      receipt: "receipt_sandbox_" + Date.now(),
      isSimulated: true
    };
  }

  console.log(`Creating Live Razorpay Order for amount: ${amount} (${currency || "USD"})`);
  const authHeader = "Basic " + Buffer.from(keyId.trim() + ":" + keySecret.trim()).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader
    },
    body: JSON.stringify({
      amount: Math.round(Number(amount)),
      currency: currency || "USD",
      receipt: "rec_" + Math.random().toString(36).substring(2, 10),
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn("Razorpay order creation request returned failure:", response.status, errorText);
    console.log("-----------------------------------------------------------------");
    console.log("⚠️ RAZORPAY BILLING: API AUTHORIZATION/REQUEST FAILED");
    console.log("Simulating secure order creation in sandbox mode as a fallback.");
    console.log(`Amount requested: ${amount} subunits (Currency: ${currency || "USD"})`);
    console.log("-----------------------------------------------------------------");

    const sandboxId = "order_sandbox_" + Math.random().toString(36).substring(2, 11);
    return {
      id: sandboxId,
      amount: amount,
      currency: currency || "USD",
      receipt: "receipt_sandbox_" + Date.now(),
      isSimulated: true
    };
  }

  const data = await response.json();
  console.log(`Successfully acquired Live Razorpay Order ID: ${data.id}`);
  return data;
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): { verified: boolean; isSimulated?: boolean } {
  const keySecret = serverConfig.razorpayKeySecret;

  if (!keySecret) {
    console.log("-----------------------------------------------------------------");
    console.log("⚠️ RAZORPAY BILLING: SECRET KEY MISSING");
    console.log(`Simulating signature verification Success for payment: ${paymentId}`);
    console.log("-----------------------------------------------------------------");
    return { verified: true, isSimulated: true };
  }

  if (String(orderId).includes("sandbox") || String(orderId).includes("fallback")) {
    console.log(`Simulated or fallback order ID received during verification. Approving: ${orderId}`);
    return { verified: true, isSimulated: true };
  }

  const hmac = crypto.createHmac("sha256", keySecret.trim());
  hmac.update(orderId + "|" + paymentId);
  const generatedSignature = hmac.digest("hex");

  if (generatedSignature === signature) {
    console.log(`Razorpay Secure Signature verified successfully: ${paymentId}`);
    return { verified: true };
  } else {
    console.warn(`Razorpay Signature Verification mismatch!`);
    console.warn(`Received: ${signature}`);
    console.warn(`Generated: ${generatedSignature}`);
    return { verified: false };
  }
}
