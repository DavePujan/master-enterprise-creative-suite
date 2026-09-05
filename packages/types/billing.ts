/**
 * Canonical Server-Authoritative Pricing & Billing Catalog.
 * The server is the exclusive authority on pricing, currencies, amounts, and credits granted.
 */

export type PlanId =
  | 'booster-starter'
  | 'booster-power'
  | 'booster-super'
  | 'plan-pilot-monthly'
  | 'plan-pilot-yearly'
  | 'plan-plus-monthly'
  | 'plan-plus-yearly'
  | 'plan-pro-monthly'
  | 'plan-pro-yearly'
  | 'plan-studio-monthly'
  | 'plan-studio-yearly';

export interface PlanPricing {
  id: PlanId;
  name: string;
  type: 'topup' | 'subscription';
  billingInterval?: 'monthly' | 'yearly';
  credits: number;
  inrSubunits: number; // Exact payable amount in paise
  usdSubunits: number; // Exact payable amount in cents
  advertisedMonthlyEquivalentInr?: number; // Marketing display copy (e.g. ₹1,755, ₹9,000, ₹22,500)
  advertisedMonthlyEquivalentUsd?: number; // Marketing display copy (e.g. $19, $96, $239)
}

export const PLAN_PRICING_CATALOG: Record<PlanId, PlanPricing> = {
  'booster-starter': {
    id: 'booster-starter',
    name: 'Starter Booster',
    type: 'topup',
    credits: 100,
    inrSubunits: 150000, // ₹1,500
    usdSubunits: 1700    // $17
  },
  'booster-power': {
    id: 'booster-power',
    name: 'Power Booster',
    type: 'topup',
    credits: 500,
    inrSubunits: 625000, // ₹6,250
    usdSubunits: 6600    // $66
  },
  'booster-super': {
    id: 'booster-super',
    name: 'Super Booster',
    type: 'topup',
    credits: 1100,
    inrSubunits: 1100000, // ₹11,000
    usdSubunits: 11500    // $115
  },
  'plan-pilot-monthly': {
    id: 'plan-pilot-monthly',
    name: 'Pilot Tier (Monthly)',
    type: 'subscription',
    billingInterval: 'monthly',
    credits: 130,
    inrSubunits: 195000, // ₹1,950
    usdSubunits: 2200    // $22
  },
  'plan-pilot-yearly': {
    id: 'plan-pilot-yearly',
    name: 'Pilot Tier (Yearly)',
    type: 'subscription',
    billingInterval: 'yearly',
    credits: 1560,       // 130 * 12
    inrSubunits: 2106000, // ₹21,060 billed annually (12 * ₹1,755)
    usdSubunits: 23760,   // $237.60 billed annually (12 * $19.80)
    advertisedMonthlyEquivalentInr: 1755,
    advertisedMonthlyEquivalentUsd: 19
  },
  'plan-plus-monthly': {
    id: 'plan-plus-monthly',
    name: 'Plus Tier (Monthly)',
    type: 'subscription',
    billingInterval: 'monthly',
    credits: 800,
    inrSubunits: 1000000, // ₹10,000
    usdSubunits: 10600    // $106
  },
  'plan-plus-yearly': {
    id: 'plan-plus-yearly',
    name: 'Plus Tier (Yearly)',
    type: 'subscription',
    billingInterval: 'yearly',
    credits: 9600,        // 800 * 12
    inrSubunits: 10800000, // ₹108,000 billed annually (12 * ₹9,000)
    usdSubunits: 114480,   // $1,144.80 billed annually (12 * $95.40)
    advertisedMonthlyEquivalentInr: 9000,
    advertisedMonthlyEquivalentUsd: 96
  },
  'plan-pro-monthly': {
    id: 'plan-pro-monthly',
    name: 'Pro Tier (Monthly)',
    type: 'subscription',
    billingInterval: 'monthly',
    credits: 2500,
    inrSubunits: 2500000, // ₹25,000
    usdSubunits: 26500    // $265
  },
  'plan-pro-yearly': {
    id: 'plan-pro-yearly',
    name: 'Pro Tier (Yearly)',
    type: 'subscription',
    billingInterval: 'yearly',
    credits: 30000,       // 2500 * 12
    inrSubunits: 27000000, // ₹270,000 billed annually (12 * ₹22,500)
    usdSubunits: 286200,   // $2,862.00 billed annually (12 * $238.50)
    advertisedMonthlyEquivalentInr: 22500,
    advertisedMonthlyEquivalentUsd: 239
  },
  'plan-studio-monthly': {
    id: 'plan-studio-monthly',
    name: 'Studio Tier (Monthly)',
    type: 'subscription',
    billingInterval: 'monthly',
    credits: 1500,
    inrSubunits: 650000, // ₹6,500
    usdSubunits: 7900    // $79
  },
  'plan-studio-yearly': {
    id: 'plan-studio-yearly',
    name: 'Studio Tier (Yearly)',
    type: 'subscription',
    billingInterval: 'yearly',
    credits: 18000,
    inrSubunits: 6240000, // ₹62,400
    usdSubunits: 75600    // $756
  }
};

/**
 * Standardized Canonical Insufficient Credits Error Payload (HTTP 402).
 */
export interface InsufficientCreditsErrorPayload {
  error: string;
  code: 'INSUFFICIENT_CREDITS';
  requiredCredits: number;
  availableCredits: number;
  missingCredits: number;
  currency: 'credits';
  service: string;
  action?: string;
  model?: string;
  recommendedPack?: {
    id: PlanId;
    name: string;
    credits: number;
  };
  retryable: false;
}

/**
 * Canonical Service Display and Metadata Registry.
 * Purely for identity, categories, and human-friendly display copy.
 * Authoritative required credit amounts come strictly from the Gem/model resolvers.
 */
export interface CreditServiceMetadata {
  id: string;
  displayName: string;
  category: 'campaign' | 'video' | 'image' | 'audio' | 'presentation' | 'text';
  description: string;
}

export const CREDIT_SERVICE_REGISTRY: Record<string, CreditServiceMetadata> = {
  campaign_strategy: {
    id: 'campaign_strategy',
    displayName: 'Campaign Master Strategy',
    category: 'campaign',
    description: '16-dimension master campaign strategy synthesis with customer journey and production architecture'
  },
  video_generation: {
    id: 'video_generation',
    displayName: 'Video Studio',
    category: 'video',
    description: 'High-definition cinematic video render'
  },
  video_omni: {
    id: 'video_omni',
    displayName: 'Google Omni 1.1 Flash',
    category: 'video',
    description: 'Conversational real-time multimodal video generation & editing'
  },
  video_veo_pro: {
    id: 'video_veo_pro',
    displayName: 'Google Veo 3.1 Pro',
    category: 'video',
    description: 'Cinema-grade video generation with end frames and reference subjects'
  },
  video_veo_fast: {
    id: 'video_veo_fast',
    displayName: 'Google Veo 3.1 Fast',
    category: 'video',
    description: 'Rapid preview video generation'
  },
  video_veo_lite: {
    id: 'video_veo_lite',
    displayName: 'Google Veo 3.1 Lite',
    category: 'video',
    description: 'Low-latency lightweight video generation'
  },
  video_kling: {
    id: 'video_kling',
    displayName: 'Kling V3 Standard',
    category: 'video',
    description: 'Multi-shot sequence video generation with motion continuity'
  },
  video_seedance: {
    id: 'video_seedance',
    displayName: 'ByteDance Seedance 2.0',
    category: 'video',
    description: 'Multimodal reference-to-video with audio synchronization'
  },
  video_autowrite: {
    id: 'video_autowrite',
    displayName: 'Video Auto-Write Director',
    category: 'video',
    description: 'Cinematic storyboard planning and scene breakdown'
  },
  image_generation: {
    id: 'image_generation',
    displayName: 'Image Generation',
    category: 'image',
    description: 'Photorealistic commercial visual render'
  },
  image_flux_pro: {
    id: 'image_flux_pro',
    displayName: 'Flux Pro Image',
    category: 'image',
    description: 'Ultra-high-fidelity Flux Pro visual generation'
  },
  image_fast: {
    id: 'image_fast',
    displayName: 'Fast Image',
    category: 'image',
    description: 'Rapid ideation visual generation'
  },
  image_standard: {
    id: 'image_standard',
    displayName: 'Standard Image',
    category: 'image',
    description: 'Production visual asset generation'
  },
  image_refine: {
    id: 'image_refine',
    displayName: 'Creative AI Refinement',
    category: 'image',
    description: 'Production visual prompt and texture refinement'
  },
  audio_voiceover: {
    id: 'audio_voiceover',
    displayName: 'Voiceover (TTS)',
    category: 'audio',
    description: 'Naturalistic multilingual voiceover generation'
  },
  audio_music_clip: {
    id: 'audio_music_clip',
    displayName: 'Music Clip',
    category: 'audio',
    description: '30-second commercial soundtrack clip'
  },
  audio_music_pro: {
    id: 'audio_music_pro',
    displayName: 'Music Pro (Full Track)',
    category: 'audio',
    description: 'Full-length studio track composition'
  },
  audio_autowrite: {
    id: 'audio_autowrite',
    displayName: 'Audio Auto-Write',
    category: 'audio',
    description: 'Creative audio concept & lyrics director'
  },
  presentation_generation: {
    id: 'presentation_generation',
    displayName: 'Corporate Presentation',
    category: 'presentation',
    description: 'Multi-slide strategic corporate slide deck'
  },
  campaign_deck: {
    id: 'campaign_deck',
    displayName: 'Campaign Deck & Bundles',
    category: 'campaign',
    description: 'Multi-asset cohesive commercial campaign deck'
  },
  text_generation: {
    id: 'text_generation',
    displayName: 'Copywriting & Content',
    category: 'text',
    description: 'Brand-governed messaging and captions'
  }
};

/**
 * Recommends the smallest available booster pack that fully covers the credit gap.
 */
export function findRecommendedCreditPack(missingCredits: number): {
  id: PlanId;
  name: string;
  credits: number;
} {
  if (missingCredits <= 100) {
    return {
      id: 'booster-starter',
      name: 'Starter Booster',
      credits: 100
    };
  }
  if (missingCredits <= 500) {
    return {
      id: 'booster-power',
      name: 'Power Booster',
      credits: 500
    };
  }
  return {
    id: 'booster-super',
    name: 'Super Booster',
    credits: 1100
  };
}

