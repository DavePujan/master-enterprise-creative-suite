/**
 * Audio Prompt Builder.
 * Constructs adaptive, decoupled prompts for:
 * 1. Creative Voiceover Scriptwriting (Gemini 3.8 Flash)
 * 2. Voice Performance Directing (Gemini 3.1 Flash TTS)
 * 3. Structured Music Production (Lyria 3.5)
 */

import type {
  VoiceoverRequest,
  MusicRequest,
  PerformanceConfig,
  VoiceConfig,
} from "../../../../../packages/types/audioGeneration.js";

/**
 * Calculates optimal spoken word budget based on target duration (130-150 words/min).
 */
export function calculateWordBudget(targetSeconds: number = 30): { minWords: number; maxWords: number; targetWords: number } {
  const wordsPerSecond = 2.3; // ~138 words per minute
  const targetWords = Math.round(targetSeconds * wordsPerSecond);
  return {
    targetWords,
    minWords: Math.max(10, Math.round(targetWords * 0.85)),
    maxWords: Math.round(targetWords * 1.15),
  };
}

/**
 * Builds the creative scriptwriting prompt for Gemini 3.8 Flash.
 */
export function buildScriptwriterPrompt(request: VoiceoverRequest): {
  systemInstruction: string;
  userMessage: string;
} {
  const duration = request.targetDurationSeconds || 30;
  const { minWords, maxWords } = calculateWordBudget(duration);
  const brand = request.brandContext;
  const isTwoSpeaker = request.voiceConfig?.speakerMode === "two-speaker";
  const speakers = request.voiceConfig?.speakers || [{ name: "Narrator", voice: "Kore" as const }];

  const systemInstruction = `You are a World-Class Advertising Copywriter and Audio Script Specialist.
Your task is to write an engaging, speakable voiceover script tailored for high-conversion branding.

STRICT OPERATIONAL RULES:
1. WORD BUDGET:
   - The script MUST be strictly between ${minWords} and ${maxWords} words (targeted for ~${duration} seconds of spoken delivery).
2. SPEAKABILITY:
   - Write conversational, rhythmic sentences with natural breathing cadence.
3. SPEAKER FORMAT:
   ${
     isTwoSpeaker
       ? `- This is a TWO-SPEAKER dialogue.
   - Alternate naturally between '${speakers[0].name}' and '${speakers[1]?.name || "Speaker 2"}'.
   - Format every line with the speaker prefix, e.g.:
     ${speakers[0].name}: First spoken thought...
     ${speakers[1]?.name || "Speaker 2"}: Conversational response...`
       : `- This is a SINGLE-SPEAKER monologue. DO NOT include speaker prefixes or character names.`
   }
4. NO STAGE DIRECTIONS:
   - Return ONLY the exact words to be spoken.
   - DO NOT include sound effect markers, background music cues, stage directions, or narration commentary.
   ${request.performanceConfig?.tagsEnabled ? "- You MAY use subtle expressive performance tags sparingly: [excitedly], [whispers], [laughs], [sighs]." : "- DO NOT use bracketed tags."}
5. LANGUAGE:
   - Script language: ${request.languageCode || "en-US"}.`.trim();

  let brandSnippet = "";
  if (brand) {
    brandSnippet = `
BRAND GUIDELINES:
- Brand Name: ${brand.name}
- Industry: ${brand.industry}
- Tone: ${brand.tone}
- Core Pillars: ${brand.pillars?.join(", ") || "Quality, Innovation"}
- Target Audience: ${brand.targetAudience || "General demographic"}
- Region/Accent Context: ${brand.location || "Global"}
`.trim();
  }

  const userMessage = `
${brandSnippet}

USER REQUEST / CREATIVE BRIEF:
<untrusted_user_intent>
${request.userIntent.trim()}
</untrusted_user_intent>

TARGET DURATION: ${duration} seconds (${minWords}-${maxWords} words).
Deliver the direct, speakable voiceover script now.
`.trim();

  return { systemInstruction, userMessage };
}

/**
 * Composite voiceover script prompt for scriptwriter.
 */
export function buildVoiceoverScriptPrompt(request: VoiceoverRequest): string {
  const { systemInstruction, userMessage } = buildScriptwriterPrompt(request);
  return `${systemInstruction}\n\n${userMessage}`;
}

/**
 * Builds the performance instruction prompt for Gemini TTS.
 * Enforces strictly <= 2 speakers constraint.
 */
export function buildTTSInstructionPrompt(
  transcript: string,
  voiceConfig?: VoiceConfig,
  performanceConfig?: PerformanceConfig
): string {
  if (voiceConfig?.speakers && voiceConfig.speakers.length > 2) {
    throw new Error("Invalid voice configuration: Maximum of 2 speakers allowed for Gemini TTS.");
  }

  const emotion = performanceConfig?.emotion || "Professional";
  const pace = performanceConfig?.pace || "normal";
  const accent = performanceConfig?.accent || "natural";
  const style = performanceConfig?.style || "polished commercial voiceover";
  const tags = performanceConfig?.tagsEnabled ? `[emotion=${emotion}] ` : "";

  let speakersContext = "";
  if (voiceConfig?.speakerMode === "two-speaker" && voiceConfig.speakers.length === 2) {
    speakersContext = `\nSPEAKERS:\n- Speaker 1: ${voiceConfig.speakers[0].name} (${voiceConfig.speakers[0].voice})\n- Speaker 2: ${voiceConfig.speakers[1].name} (${voiceConfig.speakers[1].voice})\n`;
  }

  return `Synthesize the following transcript as speech.${speakersContext}

PERFORMANCE DIRECTION:
- Overall Tone: ${emotion}
- Speaking Pace: ${pace}
- Accent Style: ${accent}
- Delivery Style: ${style}

<<< TRANSCRIPT >>>
${tags}${transcript.trim()}
<<< END TRANSCRIPT >>>`.trim();
}

/**
 * Builds the performance director prompt for Gemini 3.1 Flash TTS.
 * Explicitly separates director notes from spoken transcript to prevent
 * classifier failure or speaking instructions aloud.
 */
export function buildTtsPerformancePrompt(
  transcript: string,
  performanceConfig?: PerformanceConfig
): string {
  return buildTTSInstructionPrompt(transcript, undefined, performanceConfig);
}

/**
 * Builds the structured musical production prompt for Lyria 3.5.
 */
export function buildMusicPrompt(request: MusicRequest): string {
  const parts: string[] = [];

  parts.push(`STYLE & GENRE: ${request.genre || "Modern Commercial Soundtrack"}`);
  if (request.mood) {
    parts.push(`MOOD: ${request.mood}`);
  }
  if (request.tempoBpm) {
    parts.push(`TEMPO: ${request.tempoBpm} BPM`);
  }
  if (request.keyScale) {
    parts.push(`KEY / SCALE: ${request.keyScale}`);
  }
  if (request.instrumentation && request.instrumentation.length > 0) {
    parts.push(`INSTRUMENTATION: ${request.instrumentation.join(", ")}`);
  }
  parts.push(`VOCALS: ${request.vocalsMode === "with-vocals" ? "Vocal presence" : "Strictly instrumental"}`);

  if (request.lyrics) {
    parts.push(`LYRICS:\n${request.lyrics.trim()}`);
  }

  if (request.structureNotes) {
    parts.push(`STRUCTURE:\n${request.structureNotes.trim()}`);
  } else if (request.mode === "clip") {
    parts.push(
      `STRUCTURE:\n[0:00 - 0:08] Intro theme build\n[0:08 - 0:24] Peak energetic hook and rhythm\n[0:24 - 0:30] Clean stylized resolution`
    );
  } else {
    parts.push(
      `STRUCTURE: Dynamic multi-section composition with intro, developing thematic verse, energetic chorus, and lingering outro.`
    );
  }

  parts.push(`CREATIVE INTENT:\n${request.prompt.trim()}`);

  return parts.join("\n\n");
}
