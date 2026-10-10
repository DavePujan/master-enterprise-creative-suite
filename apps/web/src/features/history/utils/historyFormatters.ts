import React from 'react';
import {
  Aperture,
  Clapperboard,
  Presentation,
  AudioWaveform,
  Compass,
  ShoppingBag,
  MessageSquareQuote,
  Film,
  Sparkles,
  History,
  FileText
} from 'lucide-react';
import { GENERIC_GEMS } from '@web/infrastructure/ai/modelRegistry.js';
import type { HistoryItem } from '../../layout/components/AppSidebar.js';

/**
 * Maps gem ID to an appropriate Lucide icon.
 */
export function getGemIcon(gemId?: string): React.ComponentType<{ size?: number; className?: string }> {
  if (!gemId) return Sparkles;

  const norm = gemId.toLowerCase();
  if (norm.includes('video') || norm.includes('kling') || norm.includes('omni') || norm.includes('veo')) {
    return Clapperboard;
  }
  if (norm.includes('image') || norm.includes('render') || norm.includes('photo')) {
    return Aperture;
  }
  if (norm.includes('presentation') || norm.includes('deck') || norm.includes('slide')) {
    return Presentation;
  }
  if (norm.includes('audio') || norm.includes('voice') || norm.includes('sound') || norm.includes('music')) {
    return AudioWaveform;
  }
  if (norm.includes('storyline') || norm.includes('narrative')) {
    return Film;
  }
  if (norm.includes('bundle') || norm.includes('ecommerce')) {
    return ShoppingBag;
  }
  if (norm.includes('caption') || norm.includes('copy')) {
    return MessageSquareQuote;
  }
  if (norm.includes('campaign') || norm.includes('strategy')) {
    return Compass;
  }
  if (norm.includes('doc') || norm.includes('text')) {
    return FileText;
  }

  return History;
}

/**
 * Returns the human-friendly name of the tool/gem from its ID.
 */
export function getGemName(gemId?: string): string {
  if (!gemId) return 'Creative Tool';
  if (gemId === 'campaign-strategist-y') return 'Campaign Strategy';
  const found = GENERIC_GEMS.find(g => g.id === gemId);
  if (found) return found.name;

  const norm = gemId.toLowerCase();
  if (norm.includes('video')) return 'Video Generation';
  if (norm.includes('image')) return 'Image Generation';
  if (norm.includes('presentation') || norm.includes('deck')) return 'Corporate Deck';
  if (norm.includes('audio')) return 'Audio Studio';
  if (norm.includes('storyline')) return 'Storyline';
  if (norm.includes('caption')) return 'Captions';
  if (norm.includes('campaign')) return 'Campaign Strategy';
  return 'Creative Generation';
}

/**
 * Computes a smart, deterministic display title for a creative history item.
 * Eliminates repetitive "Creative Generation" rows by prioritizing substantive prompts.
 */
export function getCreativeDisplayTitle(item: HistoryItem): string {
  if (item.title && item.title.trim() && item.title.trim() !== 'Creative Generation' && item.title.trim() !== 'Creative Output') {
    return item.title.trim();
  }

  if (item.result?.campaignTitle) {
    return `Campaign: ${item.result.campaignTitle}`;
  }
  if (item.result?.masterStrategy?.coreBigIdea) {
    return `Strategy: ${item.result.masterStrategy.coreBigIdea}`;
  }

  if (item.prompt && item.prompt.trim()) {
    let clean = item.prompt.trim().replace(/^["']|["']$/g, '');
    clean = clean.replace(/^(concept:\s*|create|generate|design|write)\s*(an?|the)?\s*/i, '');
    const firstPeriod = clean.indexOf('.');
    if (firstPeriod > 10 && firstPeriod < 65) {
      clean = clean.slice(0, firstPeriod);
    } else if (clean.length > 60) {
      clean = clean.slice(0, 57) + '...';
    }
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    return clean;
  }

  return getGemName(item.gemId);
}

export interface ExtractedHistoryMedia {
  type: 'image' | 'video' | 'audio' | 'doc' | 'text';
  url?: string;
  previewUrl?: string;
  aspectRatio?: string;
  model?: string;
  credits?: number;
}

/**
 * Robustly extracts preview media (image, video, audio) from a HistoryItem result payload.
 */
export function extractHistoryMedia(item: HistoryItem): ExtractedHistoryMedia | null {
  if (!item || !item.result) return null;
  const res = item.result;

  // Direct image URL or signed Supabase URL
  const imgUrl = res.imageUrl || res.dataUrl || (res.type === 'image' && typeof res.data === 'string' ? res.data : undefined) || (Array.isArray(res.images) && res.images[0]?.url) || (res.image && typeof res.image === 'string' ? res.image : undefined);
  if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
    return {
      type: 'image',
      url: imgUrl,
      previewUrl: imgUrl,
      aspectRatio: res.aspectRatio || '1:1',
      model: res.model,
      credits: res.credits
    };
  }

  // Video URL
  const vidUrl = res.videoUrl || (res.type === 'video' && typeof res.data === 'string' ? res.data : undefined) || (res.outputUrl && typeof res.outputUrl === 'string' ? res.outputUrl : undefined);
  if (vidUrl && typeof vidUrl === 'string' && vidUrl.trim()) {
    return {
      type: 'video',
      url: vidUrl,
      previewUrl: res.thumbnailUrl || res.coverUrl,
      model: res.model,
      credits: res.credits
    };
  }

  // Audio URL
  const audUrl = res.audioUrl || res.audioData || (res.type === 'audio' && typeof res.data === 'string' ? res.data : undefined);
  if (audUrl && typeof audUrl === 'string' && audUrl.trim()) {
    return {
      type: 'audio',
      url: audUrl,
      model: res.model,
      credits: res.credits
    };
  }

  if (res.type === 'doc' || res.document) {
    return {
      type: 'doc',
      url: typeof res.data === 'string' ? res.data : undefined,
      model: res.model,
      credits: res.credits
    };
  }

  if (res.type === 'campaign-strategy' || item.gemId === 'campaign-strategist-y') {
    return {
      type: 'doc',
      model: 'Campaign Strategist 2.0',
      credits: 5
    };
  }

  return null;
}

export type CreativeHistoryCategory = 'all' | 'image' | 'video' | 'audio' | 'deck_copy';

/**
 * Categorizes a gem for high-level creative suite filtering tabs.
 */
export function getGemCategory(gemId?: string): CreativeHistoryCategory {
  if (!gemId) return 'image';
  const norm = gemId.toLowerCase();
  if (norm.includes('video') || norm.includes('kling') || norm.includes('omni') || norm.includes('veo')) return 'video';
  if (norm.includes('audio') || norm.includes('voice') || norm.includes('sound') || norm.includes('music')) return 'audio';
  if (norm.includes('presentation') || norm.includes('deck') || norm.includes('caption') || norm.includes('copy') || norm.includes('campaign') || norm.includes('doc')) return 'deck_copy';
  return 'image';
}

/**
 * Formats a timestamp into a compact relative time string (e.g., "Just now", "15m ago", "2d ago").
 */
export function formatRelativeTime(timestamp: number | string): string {
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (!time || isNaN(time)) return '';

  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - time) / 1000));

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  const date = new Date(time);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Formats a timestamp into date and time for ledger rows (e.g., "Sep 10, 2026 · 04:15").
 */
export function formatLedgerTime(timestamp: string | number): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';

  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dateStr} · ${timeStr}`;
}

