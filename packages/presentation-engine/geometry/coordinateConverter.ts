import { NormalizedBounds } from '../domain/types.js';

export interface PixelBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface InchBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PointBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Clamps normalized percentage coordinates to valid boundaries (0 to 100).
 */
export function clampBounds(bounds: NormalizedBounds): NormalizedBounds {
  const x = Math.max(0, Math.min(100, bounds.x));
  const y = Math.max(0, Math.min(100, bounds.y));
  const width = Math.max(1, Math.min(100 - x, bounds.width));
  const height = Math.max(1, Math.min(100 - y, bounds.height));

  return {
    ...bounds,
    x,
    y,
    width,
    height
  };
}

/**
 * Converts normalized percentage bounds (0-100) to Web CSS pixel values given parent container dimensions.
 */
export function toWebPixels(
  bounds: NormalizedBounds,
  containerWidth: number,
  containerHeight: number
): PixelBounds {
  const clamped = clampBounds(bounds);
  return {
    left: (clamped.x / 100) * containerWidth,
    top: (clamped.y / 100) * containerHeight,
    width: (clamped.width / 100) * containerWidth,
    height: (clamped.height / 100) * containerHeight
  };
}

/**
 * Converts normalized percentage bounds (0-100) to PowerPoint inches (default 16:9 widescreen: 13.333 x 7.5 inches).
 */
export function toPptxInches(
  bounds: NormalizedBounds,
  slideWidthInches = 13.333,
  slideHeightInches = 7.5
): InchBounds {
  const clamped = clampBounds(bounds);
  return {
    x: (clamped.x / 100) * slideWidthInches,
    y: (clamped.y / 100) * slideHeightInches,
    w: (clamped.width / 100) * slideWidthInches,
    h: (clamped.height / 100) * slideHeightInches
  };
}

/**
 * Converts normalized percentage bounds (0-100) to vector PDF coordinate points (default 1920 x 1080 points).
 */
export function toPdfPoints(
  bounds: NormalizedBounds,
  pageWidthPoints = 1920,
  pageHeightPoints = 1080
): PointBounds {
  const clamped = clampBounds(bounds);
  return {
    x: (clamped.x / 100) * pageWidthPoints,
    y: (clamped.y / 100) * pageHeightPoints,
    width: (clamped.width / 100) * pageWidthPoints,
    height: (clamped.height / 100) * pageHeightPoints
  };
}
