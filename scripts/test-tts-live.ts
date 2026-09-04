import { getServerAI } from '../apps/api/src/infrastructure/gemini/serverGeminiClient.js';
import { ttsPcmToWav } from '../apps/api/src/modules/audioGeneration/ttsPcmToWav.js';
import { buildTTSInstructionPrompt } from '../apps/api/src/modules/audioGeneration/audioPromptBuilder.js';

async function testSingleSpeakerTTS() {
  console.log("\n=================== 1. SINGLE-SPEAKER TTS TEST ===================");
  const ai = getServerAI();
  const transcript = "Flipkart brings you India's greatest festive sale. Unbeatable deals, authentic brands, delivered directly to your doorstep.";
  const prompt = buildTTSInstructionPrompt(transcript, {
    speakerMode: "single",
    speakers: [{ name: "Narrator", voice: "Kore" }]
  }, {
    emotion: "Energetic",
    pace: "normal",
    accent: "natural",
    style: "vibrant commercial"
  });

  console.log("TTS Instruction Prompt:\n", prompt);

  const ttsRes = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: prompt,
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Kore" },
        },
      },
    },
  });

  const candidate = ttsRes.candidates?.[0];
  const audioPart = candidate?.content?.parts?.find(p => p.inlineData?.data);
  const base64Data = audioPart?.inlineData?.data;
  console.log("Returned audio part mimeType:", audioPart?.inlineData?.mimeType);
  console.log("Audio base64 length:", base64Data?.length || 0);

  if (base64Data) {
    const wav = ttsPcmToWav(base64Data, { sampleRate: 24000, numChannels: 1, bitsPerSample: 16 });
    console.log("PCM->WAV Success! WAV byte length:", wav.byteLength, "Duration:", wav.durationSeconds, "s");
  } else {
    console.error("No audio returned!");
  }
}

async function testTwoSpeakerTTS() {
  console.log("\n=================== 2. TWO-SPEAKER TTS TEST ===================");
  const ai = getServerAI();
  const transcript = "Kore: Have you seen the new discounts on Flipkart today?\nPuck: Absolutely, up to seventy percent off on top tech and fashion!";
  
  const voiceConfig = {
    speakerMode: "two-speaker" as const,
    speakers: [
      { name: "Kore", voice: "Kore" as const },
      { name: "Puck", voice: "Puck" as const }
    ] as any
  };

  const prompt = buildTTSInstructionPrompt(transcript, voiceConfig, {
    emotion: "Cheerful",
    pace: "normal"
  });

  console.log("Two-Speaker Prompt:\n", prompt);

  // Test multiSpeakerVoiceConfig
  const multiSpeakerConfig: any = {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: [
        {
          speaker: "Kore",
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" }
          }
        },
        {
          speaker: "Puck",
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Puck" }
          }
        }
      ]
    }
  };

  const ttsRes = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: prompt,
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: multiSpeakerConfig,
    },
  });

  const candidate = ttsRes.candidates?.[0];
  const audioPart = candidate?.content?.parts?.find(p => p.inlineData?.data);
  const base64Data = audioPart?.inlineData?.data;
  console.log("Two-speaker audio mimeType:", audioPart?.inlineData?.mimeType);
  console.log("Two-speaker audio base64 length:", base64Data?.length || 0);

  if (base64Data) {
    const wav = ttsPcmToWav(base64Data, { sampleRate: 24000, numChannels: 1, bitsPerSample: 16 });
    console.log("Two-Speaker WAV Success! WAV byte length:", wav.byteLength, "Duration:", wav.durationSeconds, "s");
  } else {
    console.error("No two-speaker audio returned!");
  }
}

async function run() {
  try {
    await testSingleSpeakerTTS();
    await testTwoSpeakerTTS();
  } catch (err: any) {
    console.error("Test error:", err?.message || err);
    if (err?.stack) console.error(err.stack);
  }
}

run();
