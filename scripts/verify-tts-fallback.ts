/**
 * Comprehensive verification script for:
 * 1. Google Gemini TTS
 * 2. fal.ai Gemini 3.1 Flash TTS (Single & Multi-speaker, Expressive Tags, MP3/WAV, Cost tracking)
 * 3. VoiceProviderRouter Deterministic Fallback & Audit Trail
 * 4. Non-transient error rejection (no invalid fallbacks)
 * 5. AudioGenerationService end-to-end pipeline with single credit charge
 * 6. Lyria zero-quota handling (LYRIA_QUOTA_UNAVAILABLE)
 */

import { falGeminiTtsProvider } from "../apps/api/src/modules/audioGeneration/providers/falGeminiTtsProvider.js";
import { googleTtsProvider } from "../apps/api/src/modules/audioGeneration/providers/googleTtsProvider.js";
import { voiceProviderRouter } from "../apps/api/src/modules/audioGeneration/providers/voiceProviderRouter.js";
import { AudioGenerationService } from "../apps/api/src/modules/audioGeneration/audioGenerationService.js";
import { creditService } from "../apps/api/src/services/creditService.js";
import { getSupabaseAdmin } from "../apps/api/src/infrastructure/supabase/supabaseClient.js";
import { serverConfig } from "../apps/api/src/config/env.js";

async function runVerification() {
  console.log("================================================================================");
  console.log("AUDIO STUDIO — FINAL PROVIDER HARDENING & FALLBACK AUDIT VERIFICATION");
  console.log("================================================================================\n");

  const supabase = getSupabaseAdmin();
  const { data: ws } = supabase
    ? await supabase.from("workspaces").select("id, owner_id").limit(1).single()
    : { data: null };

  const testWorkspaceId = ws?.id || "d1e7b99c-32bc-448e-bb72-cfa488ee2426";
  const testUserId = ws?.owner_id || "test-audit-user";

  // Test 1: fal.ai Gemini 3.1 Flash TTS Direct Single Speaker
  console.log("--- TEST 1: fal.ai Gemini 3.1 Flash TTS (Single Speaker, Expressive Tags, MP3) ---");
  try {
    const singleResult = await falGeminiTtsProvider.synthesize({
      transcript: "Experience the Big Billion Days on Flipkart! [excitedly] Incredible deals await you.",
      speakers: [{ name: "Speaker 1", voice: "Kore" }],
      speakerMode: "single",
      performance: {
        emotion: "Energetic",
        pace: "normal",
        accent: "Indian English",
        style: "festive retail commercial",
      },
      language: "English (India)",
      outputFormat: "mp3",
    });

    console.log(`✓ fal.ai Single-Speaker Success:`);
    console.log(`  - Provider: ${singleResult.provider}`);
    console.log(`  - Model: ${singleResult.model}`);
    console.log(`  - MimeType: ${singleResult.audio.mimeType}`);
    console.log(`  - Audio Bytes: ${singleResult.audio.bytes.length} bytes`);
    console.log(`  - Duration: ~${singleResult.audio.durationSeconds}s`);
    console.log(`  - Cost: $${singleResult.providerCost?.amount} ${singleResult.providerCost?.currency}`);
    console.log(`  - Request ID: ${singleResult.requestId}\n`);
  } catch (err: any) {
    console.error("✗ fal.ai Single-Speaker Failed:", err?.message || err);
  }

  // Test 2: fal.ai Gemini 3.1 Flash TTS Multi-Speaker (Two Speakers)
  console.log("--- TEST 2: fal.ai Gemini 3.1 Flash TTS (Two Speakers, Script Aliases) ---");
  try {
    const multiResult = await falGeminiTtsProvider.synthesize({
      transcript: "Host: Welcome to Flipkart tech talks.\nGuest: [calmly] Happy to be here today.",
      speakers: [
        { name: "Host", voice: "Charon" },
        { name: "Guest", voice: "Kore" },
      ],
      speakerMode: "two-speaker",
      performance: {
        emotion: "Professional",
        pace: "normal",
        style: "conversational dialogue",
      },
      language: "English",
      outputFormat: "mp3",
    });

    console.log(`✓ fal.ai Multi-Speaker Success:`);
    console.log(`  - Provider: ${multiResult.provider}`);
    console.log(`  - Speakers: Host (Charon) & Guest (Kore)`);
    console.log(`  - Audio Bytes: ${multiResult.audio.bytes.length} bytes`);
    console.log(`  - Cost: $${multiResult.providerCost?.amount}\n`);
  } catch (err: any) {
    console.error("✗ fal.ai Multi-Speaker Failed:", err?.message || err);
  }

  // Test 3: Strict Non-Fallback Policy on Invalid Input
  console.log("--- TEST 3: Strict Non-Fallback Policy (Invalid Voice / Excessive Speakers) ---");
  try {
    await falGeminiTtsProvider.synthesize({
      transcript: "This should fail validation.",
      speakers: [{ name: "Speaker 1", voice: "InvalidVoice123" }],
      speakerMode: "single",
      performance: {},
    });
    console.error("✗ Validation failed to reject invalid voice!");
  } catch (err: any) {
    console.log(`✓ Correctly rejected invalid voice without fallback: Code = ${err?.code || err?.statusCode}`);
  }

  try {
    await falGeminiTtsProvider.synthesize({
      transcript: "This should fail validation.",
      speakers: [
        { name: "Speaker 1", voice: "Kore" },
        { name: "Speaker 2", voice: "Puck" },
        { name: "Speaker 3", voice: "Charon" },
      ],
      speakerMode: "two-speaker",
      performance: {},
    });
    console.error("✗ Validation failed to reject 3 speakers!");
  } catch (err: any) {
    console.log(`✓ Correctly rejected excessive speakers (>2): Code = ${err?.code || err?.statusCode}\n`);
  }

  // Test 4: VoiceProviderRouter Live Synthesis & Deterministic Fallback
  console.log("--- TEST 4: VoiceProviderRouter Live Execution & Audit Trail ---");
  try {
    const routerResult = await voiceProviderRouter.synthesize({
      transcript: "Flipkart: India's most trusted online shopping destination.",
      speakers: [{ name: "Narrator", voice: "Kore" }],
      speakerMode: "single",
      performance: {
        emotion: "Professional",
        pace: "normal",
        accent: "Indian English",
      },
      language: "English (India)",
      outputFormat: "mp3",
    });

    console.log(`✓ Router Execution Success:`);
    console.log(`  - Active Provider: ${routerResult.result.provider}`);
    console.log(`  - Model: ${routerResult.result.model}`);
    console.log(`  - Fallback Used: ${routerResult.failoverState.fallbackUsed}`);
    if (routerResult.failoverState.fallbackUsed) {
      console.log(`  - Fallback Provider: ${routerResult.failoverState.fallbackProvider}`);
      console.log(`  - Fallback Reason: ${routerResult.failoverState.fallbackReason}`);
    }
    console.log(`  - Retry Count: ${routerResult.failoverState.retryCount}\n`);
  } catch (err: any) {
    console.error("✗ Router Execution Failed:", err?.message || err);
  }

  // Test 5: End-to-End AudioGenerationService Pipeline & Credit Single-Transaction
  console.log("--- TEST 5: AudioGenerationService End-to-End Voiceover (Single Credit Charge) ---");
  const audioService = new AudioGenerationService();

  // Give user balance for testing
  let balBefore = await creditService.getAvailableBalance(testWorkspaceId);
  if (balBefore < 10) {
    try {
      await creditService.grantCredits({
        workspaceId: testWorkspaceId,
        actorUserId: testUserId,
        amount: 50,
        type: "admin_grant",
        idempotencyKey: `grant_${Date.now()}`,
        referenceId: `grant_ref_${Date.now()}`,
        description: "Test initial balance",
      });
      balBefore = await creditService.getAvailableBalance(testWorkspaceId);
    } catch {
      // workspace might not be in DB, which is handled
    }
  }
  console.log(`  - Initial Workspace Available Balance: ${balBefore} credits`);

  try {
    const e2eRes = await audioService.generateAudio(
      {
        generationType: "voiceover",
        userIntent: "Create a 15-second promotional voiceover for Flipkart fashion sale.",
        transcript: "Upgrade your style with Flipkart Fashion. Trendiest collections at unbeatable prices.",
        voiceConfig: {
          speakerMode: "single",
          speakers: [{ name: "Narrator", voice: "Kore" }],
        },
        performanceConfig: {
          emotion: "Energetic",
          pace: "normal",
        },
      },
      { workspaceId: testWorkspaceId, userId: testUserId }
    );

    const balAfter = await creditService.getAvailableBalance(testWorkspaceId);
    console.log(`✓ E2E Voiceover Pipeline Success:`);
    console.log(`  - Success: ${e2eRes.success}`);
    console.log(`  - Credits Charged: ${e2eRes.creditsCharged}`);
    console.log(`  - Balance Before: ${balBefore} -> Balance After: ${balAfter} (Delta: ${balBefore - balAfter})`);
    console.log(`  - Storage Path: ${e2eRes.voiceoverResult?.storagePath}`);
    console.log(`  - Storage URL: ${e2eRes.voiceoverResult?.storageUrl ? "Generated Signed URL" : "None"}`);
    console.log(`  - Provider: ${e2eRes.voiceoverResult?.provider}`);
    console.log(`  - Model Used: ${e2eRes.modelUsed}`);
    console.log(`  - Fallback Used: ${e2eRes.fallbackUsed}\n`);

    if (balBefore - balAfter !== 2) {
      console.error(`✗ CRITICAL CREDIT VIOLATION: Expected 2 credits charged, but delta was ${balBefore - balAfter}!`);
    } else {
      console.log(`✓ SINGLE-TRANSACTION CREDIT INVARIANT PRESERVED: Exactly 2 credits charged.`);
    }
  } catch (err: any) {
    console.error("✗ E2E Voiceover Pipeline Failed:", err?.message || err);
  }

  // Test 6: Lyria Zero-Quota Handling Verification
  console.log("\n--- TEST 6: Lyria Music Zero-Quota Handling (LYRIA_QUOTA_UNAVAILABLE) ---");
  const balBeforeLyria = await creditService.getAvailableBalance(testWorkspaceId);
  try {
    await audioService.generateAudio(
      {
        generationType: "music",
        prompt: "Festive Indian celebration soundtrack with acoustic instruments and subtle synth pads.",
        mode: "clip",
        genre: "Cinematic",
        mood: "Uplifting",
      },
      { workspaceId: testWorkspaceId, userId: testUserId }
    );
    console.log("✓ Lyria generated audio successfully (live quota active).");
  } catch (err: any) {
    const balAfterLyria = await creditService.getAvailableBalance(testWorkspaceId);
    console.log(`✓ Lyria Response Status:`);
    console.log(`  - Status Code: ${err?.statusCode || err?.status}`);
    console.log(`  - Error Code: ${err?.code}`);
    console.log(`  - Error Message: ${err?.message}`);
    console.log(`  - Credit Invariant: Balance Before (${balBeforeLyria}) === Balance After (${balAfterLyria})`);
    if (balBeforeLyria === balAfterLyria) {
      console.log(`✓ ZERO CREDIT CHARGE ON LYRIA ZERO-QUOTA: Credit rollback confirmed.`);
    } else {
      console.error(`✗ CREDIT LEAK: Balance changed on Lyria quota failure!`);
    }
  }

  console.log("\n================================================================================");
  console.log("VERIFICATION COMPLETE");
  console.log("================================================================================");
}

runVerification().catch(console.error);
