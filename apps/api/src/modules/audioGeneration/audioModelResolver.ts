/**
 * Centralized Model Resolver and Credit Policies for Generative Audio Studio.
 * Enforces exact verified Gemini 3.1 TTS and Lyria 3.5 model IDs.
 */

export const AUDIO_MODELS = {
  script: "gemini-3.8-flash",
  tts: {
    primary: "gemini-3.1-flash-tts-preview",
    fallback: "gemini-2.5-flash-preview-tts",
  },
  music: {
    clip: "lyria-3.5-clip-preview",
    pro: "lyria-3.5-pro-preview",
  },
} as const;

export const AUDIO_CREDIT_POLICY = {
  voiceover: 2,
  musicClip: 5,
  musicPro: 10,
  autoWrite: 1,
} as const;

export const AUDIO_CREDITS = AUDIO_CREDIT_POLICY;

/**
 * Resolves the appropriate model and credit charge for an audio request.
 */
export function resolveAudioModel(options: {
  generationType: "voiceover" | "music";
  mode?: "clip" | "full-track";
}): { modelId: string; credits: number } {
  if (options.generationType === "voiceover") {
    return {
      modelId: AUDIO_MODELS.tts.primary,
      credits: AUDIO_CREDIT_POLICY.voiceover,
    };
  }
  const isPro = options.mode === "full-track";
  return {
    modelId: isPro ? AUDIO_MODELS.music.pro : AUDIO_MODELS.music.clip,
    credits: isPro ? AUDIO_CREDIT_POLICY.musicPro : AUDIO_CREDIT_POLICY.musicClip,
  };
}

/**
 * Resolves the appropriate credit charge for an audio request.
 */
export function resolveAudioCredits(
  generationType: "voiceover" | "music",
  musicMode?: "clip" | "full-track"
): number {
  if (generationType === "voiceover") {
    return AUDIO_CREDIT_POLICY.voiceover;
  }
  if (musicMode === "full-track") {
    return AUDIO_CREDIT_POLICY.musicPro;
  }
  return AUDIO_CREDIT_POLICY.musicClip;
}
