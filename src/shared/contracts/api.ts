/**
 * Pure API Request & Response Contracts (DTOs) for all existing endpoints.
 * Framework-free: MUST NOT import React, Firebase, Express, or vendor SDKs.
 */

import type { BrandGuidelines } from '../types/brand.js';

// ==========================================
// 1. Campaign Prompts: POST /api/campaign/prompts
// ==========================================
export interface CampaignPromptsRequest {
  concept: string;
  commerceMode?: 'e-commerce' | 'quick-commerce' | string;
  guidelines?: BrandGuidelines;
  referenceContexts?: {
    hasProduct?: boolean;
    hasFace?: boolean;
    hasLogo?: boolean;
  };
}

export interface PromptAssetItem {
  title: string;
  role: string;
  description: string;
  prompt: string;
}

export interface CampaignPromptsResponse {
  campaign_title: string;
  aesthetic: string;
  assets: {
    Hero: PromptAssetItem;
    Closeup: PromptAssetItem;
    Lifestyle: PromptAssetItem;
    Offer: PromptAssetItem;
    Alternate: PromptAssetItem;
  };
}

// ==========================================
// 2. Campaign Render: POST /api/campaign/render
// ==========================================
export interface CampaignRenderRequest {
  prompt: string;
  size?: string;
  engine?: string;
  falKey?: string;
  guidelines?: BrandGuidelines;
  referenceImages?: string[];
}

export interface CampaignRenderResponse {
  url: string;
  engine: string;
  isFallback: boolean;
  warning?: string;
}

// ==========================================
// 3. Campaign Video: POST /api/campaign/video
// ==========================================
export interface CampaignVideoRequest {
  prompt: string;
  size?: string;
  engine?: string;
  falKey?: string;
  guidelines?: BrandGuidelines;
}

export interface CampaignVideoResponse {
  status_url: string;
  response_url: string;
  request_id: string;
  done: boolean;
  url?: string;
}

// ==========================================
// 4. Campaign Video Poll: POST /api/campaign/video-poll
// ==========================================
export interface CampaignVideoPollRequest {
  operation: {
    status_url: string;
    response_url: string;
    request_id?: string;
    engine?: string;
  };
  falKey?: string;
}

export interface CampaignVideoPollResponse {
  done: boolean;
  response?: {
    generatedVideos: Array<{
      video: {
        uri: string;
      };
    }>;
  };
  operation?: any;
  status_url?: string;
  response_url?: string;
  request_id?: string;
  engine?: string;
}

// ==========================================
// 5. Human Touch: POST /api/human-touch
// ==========================================
export interface HumanTouchRequestPayload {
  originalPrompt: string;
  assetType?: string;
  assetUrl: string;
  modelsUsed?: string;
  userComment: string;
  emailReceipt?: string;
}

export interface HumanTouchResponse {
  success: boolean;
  message: string;
  details: {
    recipient: string;
    timestamp: number;
  };
}

// ==========================================
// 6. Contact Sales: POST /api/contact-sales
// ==========================================
export interface ContactSalesRequestPayload {
  companyName: string;
  contactName: string;
  email: string;
  teamSize: string;
  message: string;
}

export interface ContactSalesResponse {
  success: boolean;
  message: string;
  details: {
    recipient: string;
    timestamp: number;
  };
}

// ==========================================
// 7. Payment Razorpay Order: POST /api/payment/razorpay-order
// ==========================================
export interface RazorpayOrderRequestPayload {
  amount: number | string;
  currency?: string;
}

export interface RazorpayOrderResponse {
  id: string;
  amount: number | string;
  currency: string;
  receipt: string;
  isSimulated?: boolean;
}

// ==========================================
// 8. Payment Razorpay Verify: POST /api/payment/razorpay-verify
// ==========================================
export interface RazorpayVerifyRequestPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayVerifyResponse {
  verified: boolean;
  isSimulated?: boolean;
}
