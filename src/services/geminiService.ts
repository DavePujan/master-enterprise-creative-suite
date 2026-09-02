/**
 * Legacy Compatibility Facade for Gemini & Creative AI Services.
 * Re-exports all domain types, models, utilities, and generation methods.
 */

export {
  MODELS,
  IMAGE_MODELS,
  TEXT_MODELS,
  VIDEO_MODELS,
  GENERIC_GEMS,
  promptEngineSettings,
  updatePromptEngineSettings
} from '../client/infrastructure/ai/modelRegistry.js';

export {
  getAI,
  parseJSON,
  withRetry,
  getQuotaErrorMessage,
  generateHistoryTitle
} from '../client/infrastructure/ai/geminiClient.js';

export {
  analyzeAsset,
  generateBrandIdentity,
  initializeBrandKit,
  generateBrandLogoAI,
  generateFastPrompt
} from '../client/infrastructure/ai/promptBuilders.js';

export {
  generateCreative,
  generateImage,
  generateTTS,
  pollVideo,
  generateCampaignStrategistCampaign,
  generateCampaignStrategistAsset,
  generateCampaignAssetBriefs
} from '../client/infrastructure/ai/geminiService.js';

export { resizeImageIfNeeded } from '../shared/utils/image.js';
export { pcmToWav } from '../shared/utils/audio.js';

export type {
  BrandGuidelines,
  BrandTypography
} from '../shared/types/brand.js';

export type {
  Gem,
  GemType,
  Asset,
  AssetAnalysis,
  SlideStructure,
  StorylineScene,
  StorylineStructure,
  PromptEngineSettings
} from '../shared/types/creative.js';

export type {
  CampaignStrategistResult,
  AssetBriefsResult
} from '../client/infrastructure/ai/geminiService.js';
