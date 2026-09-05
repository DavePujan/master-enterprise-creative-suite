import React from 'react';
import {
  Compass,
  ShoppingBag,
  MessageSquareQuote,
  Aperture,
  Clapperboard,
  AudioWaveform,
  Presentation,
  Zap,
  Feather,
  Move3d,
  Film,
  StepForward,
  Flag,
  Tag,
  RectangleHorizontal,
  RectangleVertical,
  Square,
  VolumeX,
  Wind,
  Music,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Download,
  Copy,
  Check,
  Wand2,
  RefreshCw,
  Globe2,
  ExternalLink,
  LayoutGrid,
  Palette,
  Type,
  Image as ImageIcon,
  Fingerprint,
  ShieldCheck,
  Crown,
  Flame,
  Coins,
  Cloud,
  CloudOff,
  History,
  Settings,
  Trash2,
  X,
  Plus,
  Sparkles,
  type LucideProps
} from 'lucide-react';
import type { AppIconKey } from '@shared-types/icons.js';
import { cn } from '@web/lib/utils.js';

/**
 * Pixel-perfect Lucide-spec Filmstrip icon for sequential storyline generation.
 */
export const FilmstripIcon: React.FC<LucideProps> = ({ size = 20, strokeWidth = 1.75, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M7 3v18" />
    <path d="M3 7.5h4" />
    <path d="M3 12h18" />
    <path d="M3 16.5h4" />
    <path d="M17 3v18" />
    <path d="M17 7.5h4" />
    <path d="M17 16.5h4" />
  </svg>
);

/**
 * Pixel-perfect Lucide-spec MessageSquareSparkles icon for conversational AI video direction.
 */
export const MessageSquareSparklesIcon: React.FC<LucideProps> = ({ size = 20, strokeWidth = 1.75, className, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="m14 8 1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
  </svg>
);

/**
 * Canonical semantic icon mapping. Every key maps deterministically
 * to its single outline representation.
 */
export const APP_ICON_REGISTRY: Record<AppIconKey, React.FC<LucideProps>> = {
  // Area 1: Primary Product Gems
  'campaign-strategy': Compass,
  'ecommerce-bundle': ShoppingBag,
  'captions-copy': MessageSquareQuote,
  'brand-image': Aperture,
  'cinematic-video': Clapperboard,
  'audio-studio': AudioWaveform,
  'presentations': Presentation,
  'storyline': FilmstripIcon,

  // Area 2: AI Video Engine Capabilities
  'model-omni': MessageSquareSparklesIcon,
  'model-veo-pro': Clapperboard,
  'model-veo-fast': Zap,
  'model-veo-lite': Feather,
  'model-kling': Move3d,
  'model-seedance': Film,

  // Area 3: Capabilities & Parameters
  'frame-start': StepForward,
  'frame-end': Flag,
  'element-tag': Tag,
  'video-guide': Film,
  'audio-guide': AudioWaveform,
  'aspect-16-9': RectangleHorizontal,
  'aspect-9-16': RectangleVertical,
  'aspect-1-1': Square,
  'audio-mute': VolumeX,
  'audio-ambient': Wind,
  'audio-score': Music,
  'audio-sfx': Zap,
  'audio-soundscape': AudioWaveform,

  // Area 4: Actions & Playback
  'media-play': Play,
  'media-pause': Pause,
  'media-replay': RotateCcw,
  'media-fullscreen': Maximize2,
  'action-download': Download,
  'action-copy': Copy,
  'action-check': Check,
  'action-remix': Wand2,
  'action-regenerate': RefreshCw,
  'action-delete': Trash2,
  'action-close': X,
  'action-add': Plus,
  'source-grounding': Globe2,

  // Area 5: System, Filters & Badges
  'filter-all': LayoutGrid,
  'filter-image': Aperture,
  'filter-video': Clapperboard,
  'filter-audio': AudioWaveform,
  'filter-copy': MessageSquareQuote,
  'brand-palette': Palette,
  'brand-typography': Type,
  'brand-logo': ImageIcon,
  'human-touch': Fingerprint,
  'trust-security': ShieldCheck,
  'tier-enterprise': Crown,
  'tier-growth': Flame,
  'tier-starter': Compass,
  'credit-token': Coins,
  'cloud-sync': Cloud,
  'cloud-offline': CloudOff,
  'history-archive': History,
  'settings-gear': Settings,
};

export interface AppIconProps {
  name: AppIconKey;
  size?: number;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Universal accessible Icon component.
 * Automatically enforces accessibility standards:
 * - When ariaLabel is provided: role="img" and aria-label={ariaLabel}
 * - When ariaLabel is omitted: aria-hidden="true" (purely decorative)
 */
export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  strokeWidth = 1.75,
  className,
  ariaLabel
}) => {
  const IconComponent = APP_ICON_REGISTRY[name] || Sparkles;

  if (ariaLabel) {
    return (
      <IconComponent
        size={size}
        strokeWidth={strokeWidth}
        className={className}
        role="img"
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    />
  );
};

export interface ProviderBadgeProps {
  provider: 'google' | 'fal';
  className?: string;
}

/**
 * Distinct provider mark to accurately identify model origin
 * without polluting the capability icon vocabulary.
 */
export const ProviderBadge: React.FC<ProviderBadgeProps> = ({ provider, className }) => {
  if (provider === 'google') {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[9px] font-bold font-mono tracking-wider uppercase border",
          "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          className
        )}
      >
        Google
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[9px] font-bold font-mono tracking-wider uppercase border",
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        className
      )}
    >
      Fal.ai
    </span>
  );
};
