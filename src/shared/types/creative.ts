/**
 * Pure domain definitions for Creative Tools, Gems, Assets, and Slides.
 * Framework-free: MUST NOT import React, Firebase, Express, or vendor SDKs.
 */

export type GemType =
  | 'image'
  | 'video'
  | 'text'
  | 'slideshow'
  | 'campaign'
  | 'storyline'
  | 'audio'
  | 'campaign-deck';

export interface Gem {
  id: string;
  name: string;
  description: string;
  type: GemType;
  systemInstruction: string;
  icon: string;
  cost: number;
}

export interface AssetAnalysis {
  theme: string;
  tone: string;
  colors: string[];
  style: string;
  composition: string;
  mood: string;
}

export interface Asset {
  id: string;
  name: string;
  data: string;
  type: 'image' | 'doc' | 'video' | 'audio';
  selected: boolean;
  analysis?: AssetAnalysis;
  isProductContext?: boolean;
  isFaceContext?: boolean;
  isFirstFrameContext?: boolean;
  isLastFrameContext?: boolean;
  isIngredientsContext?: boolean;
}

export interface SlideStructure {
  title: string;
  subtitle?: string;
  bullets?: string[];
  imagePrompt: string;
  image?: string;
  groundingMetadata?: any;
}

export interface StorylineScene {
  chapterTitle: string;
  narrative: string;
  imagePrompt: string;
  image?: string;
}

export interface StorylineStructure {
  storyTitle: string;
  scenes: StorylineScene[];
}

export interface PromptEngineSettings {
  enableAiRewrite: boolean;
  enableGuidelines: boolean;
  enablePhotoStyling: boolean;
  enableCinematicStoryboard: boolean;
  allowTextOnAssets: boolean;
}
