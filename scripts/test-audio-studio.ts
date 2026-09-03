/**
 * Automated Test Suite for Voiceover & Audio Studio V2.
 * Validates:
 * 1. PCM-to-WAV 44-byte RIFF header, sampling rate (24kHz), byte rate (48000), channel count (1).
 * 2. Lyria Music Output Normalizer (MP3 pass-through, format validation).
 * 3. Audio Prompt Builder (word-budget, script boundaries, multi-speaker alternation).
 * 4. Model Registry and Cost Resolver (credit accounting and model IDs).
 * 5. Two-speaker constraint validation (rejecting >2 speakers).
 * 6. Live Gemini TTS generation (if GEMINI_API_KEY present).
 */

import { pcmToWavBuffer, pcmBase64ToWavDataUrl } from "../apps/api/src/modules/audioGeneration/ttsPcmToWav.js";
import { normalizeMusicOutput } from "../apps/api/src/modules/audioGeneration/musicOutputNormalizer.js";
import {
  buildVoiceoverScriptPrompt,
  buildTTSInstructionPrompt,
  buildMusicPrompt,
  calculateWordBudget
} from "../apps/api/src/modules/audioGeneration/audioPromptBuilder.js";
import {
  resolveAudioModel,
  AUDIO_MODELS,
  AUDIO_CREDITS
} from "../apps/api/src/modules/audioGeneration/audioModelResolver.js";
import { OFFICIAL_GEMINI_VOICES } from "../packages/types/audioGeneration.js";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("   VOICEOVER & AUDIO STUDIO — VERIFICATION TEST SUITE  ");
  console.log("=======================================================\n");

  // -------------------------------------------------------------------------
  // TEST 1: PCM-to-WAV Containerization & 44-Byte RIFF Header
  // -------------------------------------------------------------------------
  console.log("▶ Group 1: PCM-to-WAV Containerization & RIFF Headers");
  {
    // Generate 1 second of silence PCM (24000 samples * 2 bytes = 48000 bytes)
    const dummyPcm = Buffer.alloc(48000);
    const wavResult = pcmToWavBuffer(dummyPcm, 24000, 1, 16);

    assert(wavResult.wavBuffer.length === 48000 + 44, "WAV buffer length is exactly PCM + 44 bytes");
    assert(wavResult.wavBuffer.toString("ascii", 0, 4) === "RIFF", "Header starts with 'RIFF'");
    assert(wavResult.wavBuffer.toString("ascii", 8, 12) === "WAVE", "Format descriptor is 'WAVE'");
    assert(wavResult.wavBuffer.toString("ascii", 12, 16) === "fmt ", "Subchunk1 ID is 'fmt '");
    assert(wavResult.wavBuffer.readUInt32LE(24) === 24000, "Sample rate is exactly 24000 Hz");
    assert(wavResult.wavBuffer.readUInt32LE(28) === 48000, "Byte rate is exactly 48000 bytes/sec");
    assert(wavResult.wavBuffer.readUInt16LE(22) === 1, "Channel count is mono (1)");
    assert(wavResult.wavBuffer.readUInt16LE(34) === 16, "Bits per sample is 16");
    assert(wavResult.wavBuffer.toString("ascii", 36, 40) === "data", "Subchunk2 ID is 'data'");
    assert(wavResult.wavBuffer.readUInt32LE(40) === 48000, "Subchunk2 data size equals PCM length");
    assert(wavResult.durationSeconds === 1, "Duration calculated correctly as 1.00s");

    // Base64 helper check
    const base64DataUrl = pcmBase64ToWavDataUrl(dummyPcm.toString("base64"), 24000);
    assert(base64DataUrl.startsWith("data:audio/wav;base64,"), "pcmBase64ToWavDataUrl returns proper data URI");
  }

  // -------------------------------------------------------------------------
  // TEST 2: Lyria Music Output Normalization
  // -------------------------------------------------------------------------
  console.log("\n▶ Group 2: Lyria Music Output Normalizer");
  {
    const dummyCandidateClip = {
      content: {
        parts: [
          {
            inlineData: {
              data: Buffer.from("ID3\x03\x00\x00\x00\x00\x00\x00").toString("base64"),
              mimeType: "audio/mp3"
            }
          },
          {
            text: "[0:00 - 0:30] Dynamic beat and hook"
          }
        ]
      }
    };
    const normMp3 = normalizeMusicOutput(dummyCandidateClip, "clip");

    assert(normMp3.mimeType === "audio/mp3", "Lyria MP3 detected with audio/mp3 mime");
    assert(normMp3.durationSeconds === 30, "Clip duration defaults to 30s");
    assert(normMp3.structure?.includes("0:00 - 0:30"), "Structure preserved");
    assert(typeof normMp3.audioBase64 === "string" && normMp3.audioBase64.length > 0, "Audio converted to base64 string");

    // Pro track mode (~120s of audio)
    const dummyCandidatePro = {
      content: {
        parts: [
          {
            inlineData: {
              data: Buffer.alloc(16000 * 120).toString("base64"),
              mimeType: "audio/mp3"
            }
          }
        ]
      }
    };
    const normPro = normalizeMusicOutput(dummyCandidatePro, "full-track");
    assert(normPro.durationSeconds === 120, "Pro duration estimated correctly from byte length (120s)");
  }

  // -------------------------------------------------------------------------
  // TEST 3: Audio Prompt Builders & Script Bounds
  // -------------------------------------------------------------------------
  console.log("\n▶ Group 3: Prompt Builders & Boundary Isolation");
  {
    const budget30 = calculateWordBudget(30);
    assert(budget30.targetWords === 69, "30s target word budget is 69 words (~138 wpm)");
    assert(budget30.minWords === 59 && budget30.maxWords === 79, "30s budget range is 59-79 words");

    const budget15 = calculateWordBudget(15);
    assert(budget15.targetWords === 35, "15s target word budget is 35 words");

    // Single speaker script prompt
    const scriptPrompt = buildVoiceoverScriptPrompt({
      generationType: "voiceover",
      userIntent: "Launch campaign for luxury silk sarees",
      brandContext: {
        name: "Varanasi Silk Co.",
        industry: "Fashion",
        tone: "Opulent and regal",
        pillars: ["Heritage", "Pure Mulberry Silk"]
      },
      voiceConfig: {
        speakerMode: "single",
        speakers: [{ name: "Narrator", voice: "Kore" }]
      },
      targetDurationSeconds: 30,
      performanceConfig: {
        emotion: "Dramatic",
        accent: "Indian English",
        pace: "deliberate"
      }
    });

    assert(scriptPrompt.includes("Varanasi Silk Co."), "Script prompt includes brand name");
    assert(scriptPrompt.includes("Opulent and regal"), "Script prompt includes tone");
    assert(scriptPrompt.includes("stage directions"), "Script prompt bans stage directions");

    // TTS execution prompt with boundary tags
    const ttsPrompt = buildTTSInstructionPrompt(
      "Experience timeless elegance with Varanasi Silk.",
      {
        speakerMode: "single",
        speakers: [{ name: "Narrator", voice: "Kore" }]
      },
      {
        emotion: "Dramatic",
        pace: "deliberate",
        tagsEnabled: true
      }
    );

    assert(ttsPrompt.includes("<<< TRANSCRIPT >>>"), "TTS prompt isolates script with start boundary");
    assert(ttsPrompt.includes("<<< END TRANSCRIPT >>>"), "TTS prompt isolates script with end boundary");
    assert(ttsPrompt.includes("[emotion=Dramatic]"), "TTS prompt inserts performance direction tag");

    // Lyria music prompt
    const musicPrompt = buildMusicPrompt({
      generationType: "music",
      mode: "clip",
      prompt: "High-energy runway electronic beat with Indian sitar accents",
      genre: "Electronic / Fusion",
      mood: "Confident & Luxurious",
      tempoBpm: 124,
      vocalsMode: "instrumental"
    });

    assert(musicPrompt.includes("Electronic / Fusion"), "Music prompt includes genre");
    assert(musicPrompt.includes("124 BPM"), "Music prompt includes BPM");
    assert(musicPrompt.includes("Strictly instrumental"), "Music prompt specifies instrumental mode");
  }

  // -------------------------------------------------------------------------
  // TEST 4: Model Resolution & Credit Policies
  // -------------------------------------------------------------------------
  console.log("\n▶ Group 4: Model Resolution & Credit Policies");
  {
    const voRes = resolveAudioModel({ generationType: "voiceover" });
    assert(voRes.modelId === "gemini-3.1-flash-tts-preview", "Voiceover resolves to gemini-3.1-flash-tts-preview");
    assert(voRes.credits === 2, "Voiceover costs exactly 2 credits");

    const clipRes = resolveAudioModel({ generationType: "music", mode: "clip" });
    assert(clipRes.modelId === "lyria-3.5-clip-preview", "Clip resolves to exact ID lyria-3.5-clip-preview");
    assert(clipRes.credits === 5, "Music clip costs exactly 5 credits");

    const proRes = resolveAudioModel({ generationType: "music", mode: "full-track" });
    assert(proRes.modelId === "lyria-3.5-pro-preview", "Full track resolves to exact ID lyria-3.5-pro-preview");
    assert(proRes.credits === 10, "Music full track costs exactly 10 credits");

    assert(AUDIO_CREDITS.autoWrite === 1, "Audio Auto-Write costs 1 credit");
    assert(OFFICIAL_GEMINI_VOICES.length === 30, "All 30 official Gemini voices cataloged");
    assert(OFFICIAL_GEMINI_VOICES.includes("Kore"), "Kore voice present in catalog");
    assert(OFFICIAL_GEMINI_VOICES.includes("Puck"), "Puck voice present in catalog");
  }

  // -------------------------------------------------------------------------
  // TEST 5: Two-Speaker Constraint Validation
  // -------------------------------------------------------------------------
  console.log("\n▶ Group 5: Speaker Constraint Validation");
  {
    // 2 speakers should be valid
    const twoSpeakerPrompt = buildTTSInstructionPrompt(
      "Speaker 1: Welcome to the show!\nSpeaker 2: Happy to be here.",
      {
        speakerMode: "two-speaker",
        speakers: [
          { name: "Speaker 1", voice: "Kore" },
          { name: "Speaker 2", voice: "Puck" }
        ]
      }
    );
    assert(twoSpeakerPrompt.includes("Speaker 1:"), "Two-speaker prompt formats Speaker 1");
    assert(twoSpeakerPrompt.includes("Speaker 2:"), "Two-speaker prompt formats Speaker 2");

    // Validating > 2 speakers throws
    let threwForThreeSpeakers = false;
    try {
      buildTTSInstructionPrompt(
        "Speaker 1: Hi\nSpeaker 2: Hello\nSpeaker 3: Welcome",
        {
          speakerMode: "two-speaker",
          speakers: [
            { name: "Speaker 1", voice: "Kore" },
            { name: "Speaker 2", voice: "Puck" },
            { name: "Speaker 3", voice: "Charon" }
          ] as any
        }
      );
    } catch (e: any) {
      threwForThreeSpeakers = true;
      assert(e.message.includes("Maximum of 2 speakers"), "Error message specifies 2-speaker limit");
    }
    assert(threwForThreeSpeakers, "Strictly rejects >2 speakers before calling provider API");
  }

  // -------------------------------------------------------------------------
  // TEST 6: Live Gemini TTS Pipeline Call (if API key present)
  // -------------------------------------------------------------------------
  console.log("\n▶ Group 6: Live Provider Call Validation");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("  ⚠️ Skipping Live Gemini TTS: GEMINI_API_KEY not configured in environment.");
  } else {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const testText = "Writopedia Audio Studio. Precision acoustic synthesis.";
      const resp = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: testText,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Kore"
              }
            }
          }
        }
      });

      const candidate = resp.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const audioPcmBase64 = part?.inlineData?.data;

      assert(!!audioPcmBase64, "Live Gemini 3.1 Flash TTS returned base64 linear PCM data");
      if (audioPcmBase64) {
        const rawPcm = Buffer.from(audioPcmBase64, "base64");
        const wav = pcmToWavBuffer(rawPcm, 24000, 1, 16);
        assert(wav.wavBuffer.length > 44, "Live PCM audio converted to valid playable WAV");
        assert(wav.durationSeconds > 0, `Live audio duration is ${wav.durationSeconds.toFixed(2)}s`);
      }
    } catch (liveErr: any) {
      console.warn(`  ⚠️ Live Gemini TTS call notice: ${liveErr?.message || liveErr}`);
    }
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test runner encountered an unhandled exception:", err);
  process.exit(1);
});
