/**
 * Resilient LocalStorage Manager with Quota Protection, Automatic Sanitization, and Eviction.
 * Prevents QuotaExceededError crashes across all browsers and environments.
 */

import { z } from 'zod';
import type { HistoryItem } from '@shared-types/user.js';

export interface ValidatedStorageOptions {
  removeOnFailure?: boolean;
}

export const HistoryItemSchema = z.object({
  id: z.string().max(100),
  timestamp: z.union([z.number(), z.string()]),
  type: z.string().max(50),
  prompt: z.string().max(10000),
  model: z.string().max(100).optional(),
  aspectRatio: z.string().max(20).optional(),
  result: z.record(z.unknown()).optional(),
}).passthrough();

export const BrandGuidelinesSchema = z.object({
  brandName: z.string().max(200).optional(),
  industry: z.string().max(200).optional(),
  tagline: z.string().max(500).optional(),
  targetAudience: z.string().max(1000).optional(),
  keyOfferings: z.union([z.string(), z.array(z.string())]).optional(),
  brandValues: z.union([z.string(), z.array(z.string())]).optional(),
  toneOfVoice: z.union([z.string(), z.array(z.string())]).optional(),
  visualStyle: z.string().max(500).optional(),
  colorPalette: z.array(z.string().max(50)).optional(),
  typography: z.record(z.string()).optional(),
  logoUrl: z.string().max(2000).optional(),
  missionStatement: z.string().max(2000).optional(),
}).passthrough();

const TRANSIENT_KEYS = [
  'staged_text_brief',
  'staged_image_brief',
  'staged_video_brief',
  'staged_audio_brief',
  'staged_deck_brief',
  'staged_full_strategy',
  'staged_campaign_title',
  'staged_campaign_objective',
  'staged_campaign_timestamp'
];

/**
 * Strips large data: URLs or oversized payload strings from a single HistoryItem result.
 * Preserves remote HTTP/HTTPS asset URLs, text prompts, IDs, and metadata.
 */
export function sanitizeHistoryItem(item: HistoryItem): HistoryItem {
  if (!item || !item.result || typeof item.result !== 'object') {
    return item;
  }

  const res = { ...item.result };

  // Strip massive base64 data URLs that exhaust localStorage quota
  if (typeof res.imageUrl === 'string' && res.imageUrl.startsWith('data:')) {
    res.imageUrl = '';
  }
  if (typeof res.videoUrl === 'string' && res.videoUrl.startsWith('data:')) {
    res.videoUrl = '';
  }
  if (typeof res.dataUrl === 'string' && res.dataUrl.startsWith('data:')) {
    res.dataUrl = '';
  }
  if (typeof res.audioData === 'string' && res.audioData.startsWith('data:')) {
    res.audioData = '';
  }
  if (typeof res.audioUrl === 'string' && res.audioUrl.startsWith('data:')) {
    res.audioUrl = '';
  }

  // Also sanitize nested arrays if any (e.g., slides or multi-images)
  if (Array.isArray(res.slides)) {
    res.slides = res.slides.map((s: any) => {
      if (s && typeof s === 'object' && typeof s.imageUrl === 'string' && s.imageUrl.startsWith('data:')) {
        return { ...s, imageUrl: '' };
      }
      return s;
    });
  }

  return {
    ...item,
    result: res
  };
}

/**
 * Sanitizes an array of HistoryItems, limiting to maxItems and stripping base64 bloat.
 */
export function sanitizeHistory(items: HistoryItem[], maxItems = 20): HistoryItem[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, maxItems).map(sanitizeHistoryItem);
}

/**
 * Safely retrieves, parses, and validates untrusted client-side LocalStorage data
 * against a strict Zod runtime schema before it can enter application state.
 * 
 * If JSON parsing fails, schema validation fails, or type mismatch occurs:
 * - Safely logs a warning
 * - Falls back to safe default value
 * - Never throws an exception or crashes the UI
 * - Optionally removes the corrupted key from browser storage
 */
export function safeGetValidatedItem<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
  options: ValidatedStorageOptions = { removeOnFailure: true }
): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // If schema accepts a primitive string, evaluate raw string
      parsed = raw;
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      console.warn(`[SafeStorage] Runtime validation failed for localStorage key "${key}":`, result.error.issues);
      if (options.removeOnFailure) {
        window.localStorage.removeItem(key);
      }
      return fallback;
    }

    return result.data;
  } catch (err) {
    console.warn(`[SafeStorage] Unexpected error validating key "${key}":`, err);
    if (options.removeOnFailure) {
      try { window.localStorage.removeItem(key); } catch {}
    }
    return fallback;
  }
}

/**
 * Safely retrieve and parse an item from LocalStorage with optional Zod runtime validation.
 */
export function safeGetItem<T>(key: string, fallback: T, schema?: z.ZodType<T>): T {
  if (schema) {
    return safeGetValidatedItem(key, schema, fallback);
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback;
    }
    // If fallback is string, return raw if not JSON
    if (typeof fallback === 'string') {
      return raw as unknown as T;
    }
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[SafeStorage] Failed to read or parse key "${key}":`, err);
    return fallback;
  }
}

/**
 * Performs emergency eviction of transient and bloated keys when quota is exceeded.
 */
function evictQuotaPressure(excludeKey?: string) {
  try {
    // 1. Evict temporary staged briefs first
    for (const k of TRANSIENT_KEYS) {
      if (k !== excludeKey) {
        window.localStorage.removeItem(k);
      }
    }

    // 2. If creative_history exists and wasn't the target key, aggressively prune or remove it
    if (excludeKey !== 'creative_history') {
      const raw = window.localStorage.getItem('creative_history');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 5) {
            const pruned = sanitizeHistory(parsed, 5);
            window.localStorage.setItem('creative_history', JSON.stringify(pruned));
          } else {
            window.localStorage.removeItem('creative_history');
          }
        } catch {
          window.localStorage.removeItem('creative_history');
        }
      }
    }
  } catch (err) {
    console.warn('[SafeStorage] Quota eviction encountered error:', err);
  }
}

/**
 * Safely writes to LocalStorage with automatic sanitization and quota eviction.
 * NEVER throws an exception. Returns true if write succeeded, false otherwise.
 */
export function safeSetItem(key: string, value: any): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    let serialized: string;

    if (key === 'creative_history' && Array.isArray(value)) {
      // Proactively sanitize history before serializing to stay under quota
      const cleanHistory = sanitizeHistory(value, 20);
      serialized = JSON.stringify(cleanHistory);
    } else if (typeof value === 'string') {
      serialized = value;
    } else {
      serialized = JSON.stringify(value);
    }

    try {
      window.localStorage.setItem(key, serialized);
      return true;
    } catch (writeErr: any) {
      // QuotaExceededError handling
      const isQuotaError =
        writeErr?.name === 'QuotaExceededError' ||
        writeErr?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        writeErr?.code === 22 ||
        writeErr?.code === 1014 ||
        (typeof writeErr?.message === 'string' && writeErr.message.toLowerCase().includes('quota'));

      if (!isQuotaError) {
        console.warn(`[SafeStorage] Non-quota error writing "${key}":`, writeErr);
        return false;
      }

      console.warn(`[SafeStorage] Quota exceeded writing "${key}". Initiating emergency eviction...`);
      evictQuotaPressure(key);

      // Retry writing after eviction
      if (key === 'creative_history' && Array.isArray(value)) {
        // Ultra-aggressive prune on retry: top 5 items only
        const ultraClean = sanitizeHistory(value, 5);
        window.localStorage.setItem(key, JSON.stringify(ultraClean));
      } else {
        window.localStorage.setItem(key, serialized);
      }
      return true;
    }
  } catch (finalErr) {
    console.warn(`[SafeStorage] Final write failed for "${key}". Storage write skipped safely:`, finalErr);
    // If saving history fails even after eviction, remove history key so storage doesn't remain corrupted
    if (key === 'creative_history') {
      try {
        window.localStorage.removeItem('creative_history');
      } catch {}
    }
    return false;
  }
}

/**
 * Safely remove an item from LocalStorage without throwing.
 */
export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Failed to remove "${key}":`, err);
  }
}

/**
 * Proactive startup check: runs once on boot to detect and heal bloated or corrupted LocalStorage.
 */
export function initStorageHealthCheck(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const rawHistory = window.localStorage.getItem('creative_history');
    if (rawHistory) {
      // If history is suspiciously large (>200KB) or contains data URLs, sanitize immediately
      if (rawHistory.length > 200_000 || rawHistory.includes('data:image/') || rawHistory.includes('data:video/')) {
        console.info('[SafeStorage] Proactively healing oversized creative_history in LocalStorage...');
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) {
          const sanitized = sanitizeHistory(parsed, 20);
          window.localStorage.setItem('creative_history', JSON.stringify(sanitized));
        }
      }
    }
  } catch (err) {
    console.warn('[SafeStorage] Storage health check caught corrupted data. Clearing creative_history:', err);
    try {
      window.localStorage.removeItem('creative_history');
    } catch {}
  }
}

// Automatically run the health check when module is evaluated in the browser
if (typeof window !== 'undefined' && window.localStorage) {
  initStorageHealthCheck();
}
