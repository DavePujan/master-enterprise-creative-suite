/**
 * Pure domain definitions for Brand Identity and Guidelines.
 * Framework-free: MUST NOT import React, Firebase, Express, or vendor SDKs.
 */

export interface BrandTypography {
  primary: string;
  secondary: string;
}

export interface BrandGuidelines {
  name: string;
  industry: string;
  tone: string;
  pillars: string[];
  colors: string[];
  typography: BrandTypography;
  logo?: string;
  logoDescription?: string;
  location?: string;
  voiceAccentStyle?: string;
  visualEthnicityStyle?: string;
  mission?: string;
  updatedAt?: number;
}
