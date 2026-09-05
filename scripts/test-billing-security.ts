/**
 * Automated Security & Regression Test Suite for Billing, Pricing & Payment Infrastructure.
 * Strictly verifies:
 * 1. Commercial Immutability: zero drift across pricing, currencies, and credit allocations.
 * 2. Security Invariants: fail-closed simulation lockdown in production.
 * 3. Cryptographic Signature Verification: timing-safe HMAC validation.
 * 4. Webhook Security: raw-body HMAC verification and deduplication.
 * 5. Tampering Defenses: client plan-mismatch rejection and workspace isolation.
 */

import crypto from "crypto";
import { PLAN_PRICING_CATALOG, type PlanId } from "../packages/types/billing.js";
import {
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from "../apps/api/src/infrastructure/payment/razorpayClient.js";
import { billingService } from "../apps/api/src/services/billingService.js";
import { paymentRepository } from "../apps/api/src/repositories/paymentRepository.js";
import { serverConfig, validatePaymentConfig } from "../apps/api/src/config/env.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function runSecurityTestSuite() {
  console.log("\n============================================================");
  console.log("🛡️  WRITOPEDIA BILLING SECURITY & REGRESSION TEST SUITE");
  console.log("============================================================\n");

  // ---------------------------------------------------------------------------
  // 1. Commercial Immutability Invariant Tests
  // ---------------------------------------------------------------------------
  console.log("--- 1. Commercial Immutability Invariant Tests ---");

  // Booster Starter
  const boosterStarter = PLAN_PRICING_CATALOG["booster-starter"];
  assert(boosterStarter.credits === 100, "Starter Booster credits = 100");
  assert(boosterStarter.inrSubunits === 150000, "Starter Booster INR = ₹1,500 (150,000 paise)");
  assert(boosterStarter.usdSubunits === 1700, "Starter Booster USD = $17 (1,700 cents)");

  // Booster Power
  const boosterPower = PLAN_PRICING_CATALOG["booster-power"];
  assert(boosterPower.credits === 500, "Power Booster credits = 500");
  assert(boosterPower.inrSubunits === 625000, "Power Booster INR = ₹6,250 (625,000 paise)");
  assert(boosterPower.usdSubunits === 6600, "Power Booster USD = $66 (6,600 cents)");

  // Booster Super
  const boosterSuper = PLAN_PRICING_CATALOG["booster-super"];
  assert(boosterSuper.credits === 1100, "Super Booster credits = 1,100");
  assert(boosterSuper.inrSubunits === 1100000, "Super Booster INR = ₹11,000 (1,100,000 paise)");
  assert(boosterSuper.usdSubunits === 11500, "Super Booster USD = $115 (11,500 cents)");

  // Pilot Monthly
  const pilotMonthly = PLAN_PRICING_CATALOG["plan-pilot-monthly"];
  assert(pilotMonthly.credits === 130, "Pilot Monthly credits = 130");
  assert(pilotMonthly.inrSubunits === 195000, "Pilot Monthly INR = ₹1,950 (195,000 paise)");
  assert(pilotMonthly.usdSubunits === 2200, "Pilot Monthly USD = $22 (2,200 cents)");

  // Pilot Yearly
  const pilotYearly = PLAN_PRICING_CATALOG["plan-pilot-yearly"];
  assert(pilotYearly.credits === 1560, "Pilot Yearly credits = 1,560 (130 * 12)");
  assert(pilotYearly.inrSubunits === 2106000, "Pilot Yearly total INR = ₹21,060 (2,106,000 paise)");
  assert(pilotYearly.usdSubunits === 23760, "Pilot Yearly total USD = $237.60 (23,760 cents)");
  assert(pilotYearly.advertisedMonthlyEquivalentInr === 1755, "Pilot Yearly advertised INR = ₹1,755/mo");
  assert(pilotYearly.advertisedMonthlyEquivalentUsd === 19, "Pilot Yearly advertised USD = $19/mo");

  // Plus Monthly
  const plusMonthly = PLAN_PRICING_CATALOG["plan-plus-monthly"];
  assert(plusMonthly.credits === 800, "Plus Monthly credits = 800");
  assert(plusMonthly.inrSubunits === 1000000, "Plus Monthly INR = ₹10,000 (1,000,000 paise)");
  assert(plusMonthly.usdSubunits === 10600, "Plus Monthly USD = $106 (10,600 cents)");

  // Plus Yearly
  const plusYearly = PLAN_PRICING_CATALOG["plan-plus-yearly"];
  assert(plusYearly.credits === 9600, "Plus Yearly credits = 9,600 (800 * 12)");
  assert(plusYearly.inrSubunits === 10800000, "Plus Yearly total INR = ₹108,000 (10,800,000 paise)");
  assert(plusYearly.usdSubunits === 114480, "Plus Yearly total USD = $1,144.80 (114,480 cents)");
  assert(plusYearly.advertisedMonthlyEquivalentInr === 9000, "Plus Yearly advertised INR = ₹9,000/mo");
  assert(plusYearly.advertisedMonthlyEquivalentUsd === 96, "Plus Yearly advertised USD = $96/mo");

  // Pro Monthly
  const proMonthly = PLAN_PRICING_CATALOG["plan-pro-monthly"];
  assert(proMonthly.credits === 2500, "Pro Monthly credits = 2,500");
  assert(proMonthly.inrSubunits === 2500000, "Pro Monthly INR = ₹25,000 (2,500,000 paise)");
  assert(proMonthly.usdSubunits === 26500, "Pro Monthly USD = $265 (26,500 cents)");

  // Pro Yearly
  const proYearly = PLAN_PRICING_CATALOG["plan-pro-yearly"];
  assert(proYearly.credits === 30000, "Pro Yearly credits = 30,000 (2,500 * 12)");
  assert(proYearly.inrSubunits === 27000000, "Pro Yearly total INR = ₹270,000 (27,000,000 paise)");
  assert(proYearly.usdSubunits === 286200, "Pro Yearly total USD = $2,862.00 (286,200 cents)");
  assert(proYearly.advertisedMonthlyEquivalentInr === 22500, "Pro Yearly advertised INR = ₹22,500/mo");
  assert(proYearly.advertisedMonthlyEquivalentUsd === 239, "Pro Yearly advertised USD = $239/mo");

  // ---------------------------------------------------------------------------
  // 2. Fail-Closed Environment Security Tests
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Environment & Simulation Lockdown Tests ---");

  // Test: validatePaymentConfig throws in production when simulation is true
  const originalEnv = serverConfig.nodeEnv;
  const originalSim = serverConfig.enablePaymentSimulation;

  try {
    (serverConfig as any).nodeEnv = "production";
    (serverConfig as any).enablePaymentSimulation = true;

    let threw = false;
    try {
      validatePaymentConfig();
    } catch (e: any) {
      threw = true;
      assert(
        e.message.includes("FATAL SECURITY VIOLATION"),
        "Fatal error thrown when simulation enabled in production"
      );
    }
    assert(threw, "validatePaymentConfig halts process in production simulation mode");
  } finally {
    (serverConfig as any).nodeEnv = originalEnv;
    (serverConfig as any).enablePaymentSimulation = originalSim;
  }

  // ---------------------------------------------------------------------------
  // 3. Cryptographic Signature & Timing-Safe Verification Tests
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Cryptographic Signature Verification Tests ---");

  const testSecret = "test_rzp_secret_key_123456";
  const origSecret = serverConfig.razorpayKeySecret;
  (serverConfig as any).razorpayKeySecret = testSecret;

  try {
    const testOrderId = "order_test_998877";
    const testPaymentId = "pay_test_112233";
    const expectedHmac = crypto
      .createHmac("sha256", testSecret)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest("hex");

    // Valid signature
    const validResult = verifyRazorpaySignature(testOrderId, testPaymentId, expectedHmac);
    assert(validResult.verified === true, "Valid HMAC-SHA256 signature returns verified: true");

    // Tampered signature
    const badSignature = expectedHmac.substring(0, expectedHmac.length - 4) + "0000";
    const invalidResult = verifyRazorpaySignature(testOrderId, testPaymentId, badSignature);
    assert(invalidResult.verified === false, "Tampered signature returns verified: false");

    // Length-mismatched signature
    const shortSignature = "abcdef";
    const shortResult = verifyRazorpaySignature(testOrderId, testPaymentId, shortSignature);
    assert(shortResult.verified === false, "Length-mismatched signature safely rejected without crash");
  } finally {
    (serverConfig as any).razorpayKeySecret = origSecret;
  }

  // ---------------------------------------------------------------------------
  // 4. Raw-Body Webhook HMAC Signature Tests
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Webhook Raw-Body HMAC Ingestion Tests ---");

  const webhookSecret = "whsec_test_secret_abc123";
  const webhookBody = Buffer.from(JSON.stringify({ event: "payment.captured", payload: { id: "1" } }));
  const validWebhookSig = crypto.createHmac("sha256", webhookSecret).update(webhookBody).digest("hex");

  assert(
    verifyWebhookSignature(webhookBody, validWebhookSig, webhookSecret) === true,
    "Valid rawBody webhook signature verified successfully"
  );

  const tamperedWebhookBody = Buffer.from(JSON.stringify({ event: "payment.captured", payload: { id: "2" } }));
  assert(
    verifyWebhookSignature(tamperedWebhookBody, validWebhookSig, webhookSecret) === false,
    "Tampered rawBody payload rejected by webhook verification"
  );

  assert(
    verifyWebhookSignature(webhookBody, "invalid_sig", webhookSecret) === false,
    "Invalid webhook signature rejected safely"
  );

  // ---------------------------------------------------------------------------
  // 5. Payment State Machine & Tampering Defenses
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Payment State Machine & Tampering Defenses ---");

  assert(
    paymentRepository.isValidTransition("created", "captured") === true,
    "Transition 'created' -> 'captured' is valid"
  );
  assert(
    paymentRepository.isValidTransition("captured", "captured") === true,
    "Transition 'captured' -> 'captured' (idempotent) is valid"
  );
  assert(
    paymentRepository.isValidTransition("captured", "failed") === false,
    "Transition 'captured' -> 'failed' is strictly prohibited"
  );
  assert(
    paymentRepository.isValidTransition("failed", "captured") === false,
    "Transition 'failed' -> 'captured' is strictly prohibited"
  );
  assert(
    paymentRepository.isValidTransition("captured", "refunded") === true,
    "Transition 'captured' -> 'refunded' is permitted"
  );

  // ---------------------------------------------------------------------------
  // 6. Billing Service Plan Mismatch & Tampering Defenses
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. Billing Service Server-Authoritative Defenses ---");

  // Mock getByOrderId to return an order created for booster-starter
  const origGetByOrderId = paymentRepository.getByOrderId;
  const mockOrder = {
    id: "pay_rec_1",
    workspaceId: "ws_valid_1",
    userId: "usr_valid_1",
    orderId: "order_mock_123",
    planId: "booster-starter",
    amountSubunits: 150000,
    currency: "INR",
    status: "created" as const,
    isSimulated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  (paymentRepository as any).getByOrderId = async (orderId: string) => {
    if (orderId === "order_mock_123") return mockOrder;
    return null;
  };

  try {
    // Attack 1: Unregistered Order ID
    const ghostOrder = await billingService.verifyAndFulfillPayment({
      workspaceId: "ws_valid_1",
      userId: "usr_valid_1",
      orderId: "order_non_existent",
      paymentId: "pay_1",
      signature: "sig_1",
    });
    assert(ghostOrder.success === false, "Rejects verification of unrecorded/ghost order");

    // Attack 2: Cross-Workspace Hijack
    const hijackAttempt = await billingService.verifyAndFulfillPayment({
      workspaceId: "ws_attacker_2",
      userId: "usr_valid_1",
      orderId: "order_mock_123",
      paymentId: "pay_1",
      signature: "sig_1",
    });
    assert(hijackAttempt.success === false, "Rejects cross-workspace verification attempt");

    // Attack 3: Client Plan Tampering (bought 100c booster-starter, claims 30,000c plan-pro-yearly)
    const tamperingAttempt = await billingService.verifyAndFulfillPayment({
      workspaceId: "ws_valid_1",
      userId: "usr_valid_1",
      orderId: "order_mock_123",
      paymentId: "pay_1",
      signature: "sig_1",
      clientPlanId: "plan-pro-yearly",
    });
    assert(tamperingAttempt.success === false, "Rejects client plan tampering when clientPlanId != storedPlanId");
    assert(
      tamperingAttempt.error?.includes("Plan tampering detected"),
      "Error explicitly flags plan tampering"
    );

    // Defense 4: Idempotency (Order already captured)
    const capturedMockOrder = { ...mockOrder, status: "captured" as const };
    (paymentRepository as any).getByOrderId = async () => capturedMockOrder;

    const replayAttempt = await billingService.verifyAndFulfillPayment({
      workspaceId: "ws_valid_1",
      userId: "usr_valid_1",
      orderId: "order_mock_123",
      paymentId: "pay_1",
      signature: "sig_1",
    });
    assert(replayAttempt.success === true, "Replay verification returns success");
    assert(replayAttempt.alreadyFulfilled === true, "Replay verification flags alreadyFulfilled: true");
    assert(replayAttempt.creditsGranted === 100, "Entitlement derived strictly from stored booster-starter (100c)");
  } finally {
    paymentRepository.getByOrderId = origGetByOrderId;
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n============================================================");
  console.log(`🏁 BILLING SECURITY RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTestSuite().catch((err) => {
  console.error("Fatal test runner failure:", err);
  process.exit(1);
});
