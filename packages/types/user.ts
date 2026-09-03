/**
 * Pure domain definitions for User Profiles, Preferences, and Submissions.
 * Framework-free: MUST NOT import React, Firebase, Express, or vendor SDKs.
 */

import type { BrandGuidelines } from './brand.js';

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  sidebarOpen: boolean;
  aspectRatio: string;
  audioVolume: number;
  audioVoice: string;
  bakeLogoOnGeneration: boolean;
  logoPosition: { x: number; y: number };
  logoScale: number;
  logoInverted: boolean;
  activeProfileId?: string;
  brandSetupComplete?: boolean;
  brandGuidelines?: BrandGuidelines | null;
}

export interface HistoryItem {
  id: string;
  gemId: string;
  prompt: string;
  title?: string;
  result: any;
  timestamp: number;
}

export interface UserAccountData {
  balance: number;
  createdAt: number;
  updatedAt: number;
}

export interface SalesSubmission {
  companyName: string;
  contactName: string;
  email: string;
  teamSize: string;
  message: string;
  status: string;
  timestamp: number;
}

export interface HumanTouchRequest {
  assetType: string;
  assetUrl: string;
  originalPrompt: string;
  modelsUsed: string;
  userComment: string;
  emailReceipt: string;
  status: string;
  timestamp: number;
  userId?: string;
  userEmail?: string;
  completedAssetUrl?: string;
  completedComment?: string;
  completedTimestamp?: number;
}
