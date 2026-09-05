/**
 * Client AI Model Registry & Tool ("Gem") Definitions.
 * Preserves exact model IDs, descriptions, costs, and prompt engine settings.
 */

import type { Gem, PromptEngineSettings } from '@shared-types/creative.js';
import {
  IMAGE_MODEL_DEFINITIONS,
  getImageModelCapabilities,
  resolveImageModel,
  type ImageModelDefinition
} from '@shared-types/imageGeneration.js';

export { getImageModelCapabilities, resolveImageModel };

export const MODELS = {
  TEXT_FAST: 'gemini-2.5-flash',
  TEXT_PRO: 'gemini-2.5-pro',
  TEXT_STRATEGY: 'gemini-2.5-flash',
  IMAGE_FAST: 'gemini-2.5-flash-image',
  IMAGE_STANDARD: 'gemini-3.1-flash-image',
  IMAGE_PRO: 'gemini-3-pro-image',
  VIDEO_LITE: 'veo-3.1-lite-generate-preview',
  VIDEO_FAST: 'veo-3.1-fast-generate-preview',
  VIDEO_PRO: 'veo-3.1-generate-preview',
  TTS: 'gemini-2.5-flash-preview-tts',
} as const;

export const IMAGE_MODELS = IMAGE_MODEL_DEFINITIONS.map(m => ({
  id: m.key,
  modelKey: m.key,
  name: m.label,
  modelName: m.label,
  description: m.description,
  credits: m.credits,
  humanTouch: m.humanTouch,
  capabilities: m.capabilities
}));

export const TEXT_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Campaign Strategy', modelName: 'Gemini Pro', description: 'Deep conversational discovery workshop and copywriting', credits: 5, humanTouch: 50 },
  { id: 'gemini-2.5-pro', name: 'Premium Strategy', modelName: 'Gemini Pro', description: 'Rich strategic planners and complex brand alignment models', credits: 5, humanTouch: 50 }
];

export const VIDEO_MODELS = [
  { id: 'google-omni', name: 'Omni Flash', modelName: 'Google Omni 1.1 Flash', tier: 'pro', description: 'Conversational real-time multimodal video generation & editing', credits: 20, humanTouch: 200 },
  { id: 'veo-3.1-generate-preview', name: 'Veo Pro', modelName: 'Google Veo 3.1 Pro', tier: 'pro', description: 'Cinema-grade video generation with end frames and reference subjects', credits: 40, humanTouch: 400 },
  { id: 'veo-3.1-fast-generate-preview', name: 'Veo Fast', modelName: 'Google Veo 3.1 Fast', tier: 'standard', description: 'Balanced fidelity and operational speed', credits: 20, humanTouch: 200 },
  { id: 'veo-3.1-lite-generate-preview', name: 'Veo Lite', modelName: 'Google Veo 3.1 Lite', tier: 'fast', description: 'Cost-efficient rapid draft generation for testing layouts', credits: 10, humanTouch: 100 },
  { id: 'kling-video', name: 'Kling 3.0', modelName: 'Kling V3 Standard', tier: 'plus', description: 'Multi-shot sequence video generation with motion continuity', credits: 40, humanTouch: 400 },
  { id: 'bytedance/seedance-2.0', name: 'Seedance 2.0', modelName: 'ByteDance Seedance 2.0', tier: 'cinematic', description: 'Multimodal reference-to-video with audio synchronization', credits: 80, humanTouch: 800 }
];

export interface VideoModelCapabilities {
  supportsFirstFrame: boolean;
  supportsLastFrame: boolean;
  supportsImageConditioning: boolean;
  supportsReferences: boolean;
  maxReferenceImages: number;
  supportsReferenceVideos?: boolean;
  maxReferenceVideos?: number;
  supportsReferenceAudios?: boolean;
  maxReferenceAudios?: number;
  supportsElements?: boolean;
  supportsAudio: boolean;
  supportsConversationalEditing: boolean;
  supportsMultiShot: boolean;
  supportsExtension?: boolean;
  supportedDurations: string[];
  supportedResolutions: ('720p' | '1080p' | '4k')[];
  supportedModes: string[];
  aspectRatios: string[];
  creditCost: number;
}

export function getVideoModelCapabilities(modelId: string): VideoModelCapabilities {
  const norm = modelId.toLowerCase();
  
  // Google Omni 1.1 Flash
  if (norm === 'google-omni' || norm.includes('omni')) {
    return {
      supportsFirstFrame: false, // Explicit start/end frame interpolation: NO
      supportsLastFrame: false,
      supportsImageConditioning: true, // Image conditioning: YES (via inline/reference parts)
      supportsReferences: true,
      maxReferenceImages: 3,
      supportsReferenceVideos: false,
      maxReferenceVideos: 0,
      supportsReferenceAudios: false,
      maxReferenceAudios: 0,
      supportsElements: false,
      supportsAudio: true,
      supportsConversationalEditing: true, // Conversational editing (previous_interaction_id): YES
      supportsMultiShot: false,
      supportsExtension: true,
      supportedDurations: ['4s', '6s', '8s', '10s'],
      supportedResolutions: ['720p', '1080p'],
      supportedModes: ['text_to_video', 'image_to_video', 'edit_video', 'extend_video'],
      aspectRatios: ['16:9', '9:16'],
      creditCost: 20
    };
  }

  // Google Veo 3.1 Pro
  if (norm === 'veo-pro' || norm === 'veo-3.1-generate-preview' || (norm.includes('veo') && norm.includes('pro'))) {
    return {
      supportsFirstFrame: true, // Start frame: YES
      supportsLastFrame: true,  // End frame: YES
      supportsImageConditioning: false,
      supportsReferences: true, // Up to 3 reference images
      maxReferenceImages: 3,
      supportsReferenceVideos: false,
      maxReferenceVideos: 0,
      supportsReferenceAudios: false,
      maxReferenceAudios: 0,
      supportsElements: false,
      supportsAudio: true,
      supportsConversationalEditing: false,
      supportsMultiShot: false,
      supportsExtension: true,
      supportedDurations: ['4s', '6s', '8s'], // 1080p/4k requires 8s
      supportedResolutions: ['720p', '1080p', '4k'],
      supportedModes: ['text_to_video', 'image_to_video', 'extend_video'],
      aspectRatios: ['16:9', '9:16'],
      creditCost: 40
    };
  }

  // Google Veo 3.1 Fast
  if (norm === 'veo-fast' || norm === 'veo-3.1-fast-generate-preview' || (norm.includes('veo') && norm.includes('fast'))) {
    return {
      supportsFirstFrame: true, // Start frame: YES
      supportsLastFrame: false, // End frame: NO
      supportsImageConditioning: false,
      supportsReferences: false,
      maxReferenceImages: 0,
      supportsReferenceVideos: false,
      maxReferenceVideos: 0,
      supportsReferenceAudios: false,
      maxReferenceAudios: 0,
      supportsElements: false,
      supportsAudio: true,
      supportsConversationalEditing: false,
      supportsMultiShot: false,
      supportsExtension: false,
      supportedDurations: ['5s', '7s'],
      supportedResolutions: ['720p', '1080p'],
      supportedModes: ['text_to_video', 'image_to_video'],
      aspectRatios: ['16:9', '9:16'],
      creditCost: 20
    };
  }

  // Google Veo 3.1 Lite
  if (norm === 'veo-lite' || norm === 'veo-3.1-lite-generate-preview' || (norm.includes('veo') && norm.includes('lite'))) {
    return {
      supportsFirstFrame: false,
      supportsLastFrame: false,
      supportsImageConditioning: false,
      supportsReferences: false,
      maxReferenceImages: 0,
      supportsReferenceVideos: false,
      maxReferenceVideos: 0,
      supportsReferenceAudios: false,
      maxReferenceAudios: 0,
      supportsElements: false,
      supportsAudio: false,
      supportsConversationalEditing: false,
      supportsMultiShot: false,
      supportsExtension: false,
      supportedDurations: ['5s'],
      supportedResolutions: ['720p'], // Resolution: 720p locked
      supportedModes: ['text_to_video'],
      aspectRatios: ['16:9', '9:16'],
      creditCost: 10
    };
  }

  // Kling V3 Standard / Pro
  if (norm === 'kling-v3' || norm === 'kling-video' || norm.includes('kling')) {
    return {
      supportsFirstFrame: true, // Start image: YES
      supportsLastFrame: true,  // End image: YES
      supportsImageConditioning: false,
      supportsReferences: true,
      maxReferenceImages: 4,
      supportsReferenceVideos: false,
      maxReferenceVideos: 0,
      supportsReferenceAudios: false,
      maxReferenceAudios: 0,
      supportsElements: true,   // Elements (@Element1): YES
      supportsAudio: true,      // Native audio: YES
      supportsConversationalEditing: false,
      supportsMultiShot: true,  // Modes: text_to_video, image_to_video, multi_shot
      supportsExtension: false,
      supportedDurations: ['3s', '5s', '10s', '15s'],
      supportedResolutions: ['720p', '1080p'],
      supportedModes: ['text_to_video', 'image_to_video', 'multi_shot'],
      aspectRatios: ['16:9', '9:16', '1:1'],
      creditCost: 40
    };
  }

  // ByteDance Seedance 2.0
  if (norm === 'seedance-2' || norm === 'bytedance/seedance-2.0' || norm.includes('seedance')) {
    return {
      supportsFirstFrame: true,
      supportsLastFrame: false,
      supportsImageConditioning: false,
      supportsReferences: true,
      maxReferenceImages: 9,      // Image refs: up to 9
      supportsReferenceVideos: true, // Video refs: up to 3
      maxReferenceVideos: 3,
      supportsReferenceAudios: true, // Audio refs: up to 3
      maxReferenceAudios: 3,
      supportsElements: false,
      supportsAudio: true,        // Native audio: YES
      supportsConversationalEditing: false,
      supportsMultiShot: true,
      supportsExtension: false,
      supportedDurations: ['4s', '6s', '8s', '10s', '12s', '15s', 'auto'],
      supportedResolutions: ['720p', '1080p'],
      supportedModes: ['text_to_video', 'image_to_video', 'reference_to_video', 'multi_shot'],
      aspectRatios: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
      creditCost: 80
    };
  }

  // Fallback defaults
  return {
    supportsFirstFrame: false,
    supportsLastFrame: false,
    supportsImageConditioning: true,
    supportsReferences: true,
    maxReferenceImages: 3,
    supportsReferenceVideos: true,
    maxReferenceVideos: 1,
    supportsReferenceAudios: false,
    maxReferenceAudios: 0,
    supportsElements: false,
    supportsAudio: true,
    supportsConversationalEditing: true,
    supportsMultiShot: false,
    supportsExtension: true,
    supportedDurations: ['4s', '6s', '8s', '10s'],
    supportedResolutions: ['720p', '1080p'],
    supportedModes: ['text_to_video', 'image_to_video', 'edit_video', 'extend_video'],
    aspectRatios: ['16:9', '9:16'],
    creditCost: 20
  };
}

export let promptEngineSettings: PromptEngineSettings = {
  enableAiRewrite: true,
  enableGuidelines: true,
  enablePhotoStyling: true,
  enableCinematicStoryboard: true,
  allowTextOnAssets: true,
};

// Auto-load from localStorage if available in browser context
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('writopedia_prompt_engine_settings');
    if (saved) {
      promptEngineSettings = { ...promptEngineSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load prompt engine settings from lstorage", e);
  }
}

export function updatePromptEngineSettings(newSettings: Partial<PromptEngineSettings>) {
  promptEngineSettings = { ...promptEngineSettings, ...newSettings };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('writopedia_prompt_engine_settings', JSON.stringify(promptEngineSettings));
    } catch (e) {
      console.error("Failed to save prompt engine settings to lstorage", e);
    }
  }
}

export const GENERIC_GEMS: Gem[] = [
  {
    id: 'campaign-strategist-y',
    name: 'Campaign Strategy',
    description: 'Deep conversational discovery workshop and high-octane multi-platform strategic campaign system.',
    type: 'campaign',
    icon: 'Compass',
    iconKey: 'campaign-strategy',
    cost: 5,
    systemInstruction: 'You are an elite Creative Director + Brand Strategist + Performance Marketer + Launch Consultant from a world-class creative agency. Keep your tone direct, strategically sharp, emotionally intelligent, and completely free of generic marketing clichés.'
  },
  {
    id: 'bundles-campaigns',
    name: 'Ecommerce Bundle',
    description: 'Cohesive 5-asset visual marketing and campaign bundle package rendered with premium GPT technology.',
    type: 'campaign-deck',
    icon: 'ShoppingBag',
    iconKey: 'ecommerce-bundle',
    cost: 25,
    systemInstruction: 'Cohesive 5-Asset Campaign Builder designed for Multi-Asset Visual Marketing.'
  },
  {
    id: 'strategy-captions',
    name: 'Captions',
    description: 'Create high-converting, platform-ready captions for all social networks based on your brand identity.',
    type: 'text',
    icon: 'MessageSquareQuote',
    iconKey: 'captions-copy',
    cost: 1,
    systemInstruction: `You are an elite integrated Social Media Director and Chief Copywriter. Your goal is to deliver beautiful, high-converting, platform-optimized social media captions with relevant hashtags and punchy hooks.

FORMATTING & STRUCTURE:
1. # Captions Campaign: [Brief Campaign Theme]

2. ## Platform Caption Pack
- Generate 3 distinct high-converting, platform-ready social captions (with engaging Hooks, CTA, and tags).
- For each caption, specify:
  - ### Caption: [Theme/Angle, e.g., Lifestyle, Promo, Educational]
  - Platform recommendation (e.g., Instagram, LinkedIn, or Threads)
  - Clear content and formatting to keep them highly engaging.`
  },
  {
    id: 'standard-image',
    name: 'Standard Brand Image',
    description: 'Generates high-quality social media imagery tailored to your brand identity.',
    type: 'image',
    icon: 'Aperture',
    iconKey: 'brand-image',
    cost: 3,
    systemInstruction: `You are a Lead Visual Designer. Your goal is to create vibrant, high-impact imagery that strictly adheres to the provided brand guidelines.
    Use Google Search to find real-world context if needed, but prioritize the brand's unique aesthetic.
    Guidelines:
    - Strictly follow the provided brand colors and pillars.
    - Use clean, professional lighting.
    - Style: Modern and professional unless specified otherwise.
    - Avoid cluttered backgrounds.`
  },
  {
    id: 'cinematic-video',
    name: 'Cinematic & Social Video',
    description: 'High-end custom and social video generation for premium brand moments.',
    type: 'video',
    icon: 'Clapperboard',
    iconKey: 'cinematic-video',
    cost: 20,
    systemInstruction: `You are a Cinematic Video Director and Producer. Create breathtaking, high-end promotional video clips with dramatic lighting, smooth camera movements, and social-media optimized pacing.`
  },
  {
    id: 'audio-studio',
    name: 'Voiceover & Audio Studio',
    description: 'Integrated workspace for professional AI voiceovers or custom-composed brand soundtracks & audio paths.',
    type: 'audio',
    icon: 'AudioWaveform',
    iconKey: 'audio-studio',
    cost: 2,
    systemInstruction: `You are an Integrated Audio Director and Soundtrack Composer. 
    1. If the user requests a voiceover or spoken audio script, write a compelling, speakable 1-minute script.
    2. If they ask for background music, production beds, or theme tracks, describe a highly detailed musical piece, outlining instruments, mood, tempo, and arrangement parameters suitable for their campaign.
    Format your output elegantly. Refine the style to match the brand identity and location parameters.`
  },
  {
    id: 'corporate-presentations',
    name: 'Corporate Presentations',
    description: 'Generates professional high-end slide decks under a structured corporate canvas framework powered by Gemini Pro.',
    type: 'slideshow',
    icon: 'Presentation',
    iconKey: 'presentations',
    cost: 5,
    systemInstruction: `You are an elite Management Consultant and Corporate Presentation Designer. Your goal is to build executive, data-driven, highly persuasive corporate slide decks based on the strategic brief and brand guidelines.`
  },
  {
    id: 'brand-narrative-storyline',
    name: 'Storyline Generator (6-8 Image Series)',
    description: 'A progressive multi-chapter narrative brand story generating visual prompt scenes and storytelling copy.',
    type: 'storyline',
    icon: 'Filmstrip',
    iconKey: 'storyline',
    cost: 15,
    systemInstruction: `You are an Award-Winning Creative Director and Brand Narrative Architect. Your goal is to build a rich, cinematic 6 to 8-scene brand journey that unfolds sequentially.`
  }
];
