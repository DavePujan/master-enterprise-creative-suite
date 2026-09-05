/**
 * Pure domain definitions for semantic application icons.
 * Framework-free: MUST NOT import React, Express, or vendor SDKs.
 */

export type AppProductIconKey =
  | 'campaign-strategy'
  | 'ecommerce-bundle'
  | 'captions-copy'
  | 'brand-image'
  | 'cinematic-video'
  | 'audio-studio'
  | 'presentations'
  | 'storyline';

export type AppModelIconKey =
  | 'model-omni'
  | 'model-veo-pro'
  | 'model-veo-fast'
  | 'model-veo-lite'
  | 'model-kling'
  | 'model-seedance';

export type AppCapabilityIconKey =
  | 'frame-start'
  | 'frame-end'
  | 'element-tag'
  | 'video-guide'
  | 'audio-guide'
  | 'aspect-16-9'
  | 'aspect-9-16'
  | 'aspect-1-1'
  | 'audio-mute'
  | 'audio-ambient'
  | 'audio-score'
  | 'audio-sfx'
  | 'audio-soundscape';

export type AppActionIconKey =
  | 'media-play'
  | 'media-pause'
  | 'media-replay'
  | 'media-fullscreen'
  | 'action-download'
  | 'action-copy'
  | 'action-check'
  | 'action-remix'
  | 'action-regenerate'
  | 'action-delete'
  | 'action-close'
  | 'action-add'
  | 'source-grounding';

export type AppSystemIconKey =
  | 'filter-all'
  | 'filter-image'
  | 'filter-video'
  | 'filter-audio'
  | 'filter-copy'
  | 'brand-palette'
  | 'brand-typography'
  | 'brand-logo'
  | 'human-touch'
  | 'trust-security'
  | 'tier-enterprise'
  | 'tier-growth'
  | 'tier-starter'
  | 'credit-token'
  | 'cloud-sync'
  | 'cloud-offline'
  | 'history-archive'
  | 'settings-gear';

export type AppIconKey =
  | AppProductIconKey
  | AppModelIconKey
  | AppCapabilityIconKey
  | AppActionIconKey
  | AppSystemIconKey;
