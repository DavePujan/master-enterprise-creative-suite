/**
 * Human Language Production Formatters for the Director's Plan.
 * Translates machine-readable AdSpec types into clean, professional cinematography & creative language.
 */

import type { VideoAspectRatio } from '@shared-types/videoGeneration.js';
import type { CleanOrProvenance } from '@shared-types/adSpec.js';

/**
 * Extracts a clean primitive or structured value, handling optional wrapped provenance objects.
 */
export function extractCleanValue<T>(field: CleanOrProvenance<T> | undefined, fallback: T): T {
  if (field === undefined || field === null) return fallback;
  if (typeof field === 'object' && field !== null && 'value' in field && 'source' in field) {
    return (field as any).value as T;
  }
  return field as T;
}

export function formatTimecode(seconds: number): string {
  const rounded = Math.round(seconds * 10) / 10;
  return `${rounded.toFixed(1)}s`;
}

export function formatTimeRange(startSeconds: number, durationSeconds: number): string {
  const end = startSeconds + durationSeconds;
  return `${formatTimecode(startSeconds)} – ${formatTimecode(end)}`;
}

export function formatShotFraming(framing?: string): string {
  if (!framing) return 'Medium Shot';
  const map: Record<string, string> = {
    extreme_close_up: 'Extreme Close-Up',
    close_up: 'Close-Up',
    medium_shot: 'Medium Shot',
    full_shot: 'Full Wide Shot',
    wide_shot: 'Cinematic Wide',
    macro: 'Macro Detail'
  };
  return map[framing] || framing.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function formatCameraAngle(angle?: string): string {
  if (!angle) return 'Eye Level';
  const map: Record<string, string> = {
    eye_level: 'Eye Level',
    low_angle: 'Low Hero Angle',
    high_angle: 'High Angle Perspective',
    dutch_angle: 'Dynamic Dutch Tilt',
    overhead: 'Overhead Bird’s Eye'
  };
  return map[angle] || angle.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function formatCameraMovement(movement?: string): string {
  if (!movement) return 'Static Lock';
  const map: Record<string, string> = {
    static: 'Locked Static Camera',
    slow_pan: 'Slow Horizontal Pan',
    whip_pan: 'Dynamic Whip Pan',
    push_in: 'Slow Forward Push-In',
    pull_out: 'Gradual Pull-Out Reveal',
    tracking: 'Smooth Tracking Movement',
    orbital_arc: 'Orbital Cinematic Arc',
    crane: 'Vertical Crane Sweep'
  };
  return map[movement] || movement.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function formatDepthOfField(depth?: string): string {
  if (!depth) return 'Standard Focus';
  const map: Record<string, string> = {
    shallow: 'Shallow Cinematic Depth of Field',
    deep: 'Deep Focus Edge-to-Edge',
    rack_focus: 'Dynamic Rack Focus Shift'
  };
  return map[depth] || depth.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function formatShotPurpose(purpose?: string, sequence?: number, totalShots?: number): string {
  if (purpose) {
    const map: Record<string, string> = {
      hook: 'Curiosity Hook',
      problem: 'Problem Agitation',
      discovery: 'Discovery & Solution',
      product_reveal: 'Product Hero Reveal',
      transformation: 'Transformation / Benefit',
      climax: 'Emotional Climax',
      cta: 'Call to Action'
    };
    if (map[purpose]) return map[purpose];
    return purpose.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Fallbacks based on sequence
  if (sequence === 1) return 'Opening Hook';
  if (totalShots && sequence === totalShots) return 'Call to Action & Brand Payoff';
  if (sequence === 2) return 'Problem Agitation';
  if (sequence === 3) return 'Product Hero Reveal';
  return 'Narrative Escalation';
}

export function formatAspectRatioLabel(aspectRatio?: VideoAspectRatio | string): string {
  if (!aspectRatio) return '9:16 (Vertical)';
  if (aspectRatio === '9:16') return '9:16 · Reels / TikTok / Shorts';
  if (aspectRatio === '16:9') return '16:9 · Landscape / YouTube';
  if (aspectRatio === '1:1') return '1:1 · Square / Feed';
  if (aspectRatio === '4:5') return '4:5 · Portrait / Instagram Feed';
  return String(aspectRatio);
}

export function formatSubjectProminence(prominence?: string): string {
  if (!prominence) return 'Featured';
  const map: Record<string, string> = {
    hero_focus: 'Hero Focus (Foreground Center)',
    featured: 'Prominently Featured',
    background: 'Subtle Background Context'
  };
  return map[prominence] || prominence;
}

export function formatSemanticRole(role: string): string {
  const map: Record<string, string> = {
    product_hero: 'Product Packshot Reference',
    product_packaging: 'Packaging & Label Reference',
    character_face: 'Actor Facial Reference',
    character_full_body: 'Actor Wardrobe Reference',
    location_background: 'Environment Location Reference',
    style_reference: 'Cinematographic Lighting Reference',
    first_frame: 'First Frame Keyframe',
    last_frame: 'End Frame Brand Card',
    audio_track: 'Audio Reference Track'
  };
  return map[role] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
