/**
 * Text Measurement & Fitting Heuristics.
 * Platform-independent mathematical model for estimating text wrapping,
 * line overflow, and auto-fit font sizing across Web, PPTX, and PDF.
 */

export interface TextFitOptions {
  baseFontSize: number;
  minFontSize?: number;
  maxLines?: number;
  containerWidthPercent: number;  // normalized % (0-100)
  containerHeightPercent: number; // normalized % (0-100)
  aspectRatio?: '16:9' | '4:3';
}

export interface TextFitResult {
  fittedFontSize: number;
  estimatedLines: number;
  isOverflowing: boolean;
  overflowBehavior: 'clip' | 'shrink' | 'error';
}

/**
 * Average character width ratio relative to font size for standard sans-serif fonts (e.g. Inter/Arial).
 * Typical average glyph width in Latin typography is ~0.52 to 0.58 of em height.
 */
const AVERAGE_CHAR_ASPECT = 0.54;

/**
 * Estimates line count given text length, font size, and normalized container width.
 * Assumes a 1920x1080 logical reference canvas.
 */
export function estimateLineCount(
  text: string,
  fontSize: number,
  containerWidthPercent: number,
  canvasWidth = 1920
): number {
  if (!text || text.trim().length === 0) return 0;

  const containerPixelWidth = (containerWidthPercent / 100) * canvasWidth;
  const approxCharWidth = fontSize * AVERAGE_CHAR_ASPECT;
  const maxCharsPerLine = Math.max(1, Math.floor(containerPixelWidth / approxCharWidth));

  // Count explicit newlines
  const paragraphs = text.split('\n');
  let totalLines = 0;

  for (const para of paragraphs) {
    if (para.length === 0) {
      totalLines += 1;
    } else {
      totalLines += Math.ceil(para.length / maxCharsPerLine);
    }
  }

  return totalLines;
}

/**
 * Computes deterministic auto-fit font size to prevent text box overflow.
 */
export function computeAutoFitFontSize(
  text: string,
  options: TextFitOptions
): TextFitResult {
  const minSize = options.minFontSize || 12;
  const maxLines = options.maxLines || 4;
  let currentSize = options.baseFontSize;

  let lines = estimateLineCount(text, currentSize, options.containerWidthPercent);

  // Shrink font size incrementally until it fits inside maxLines or hits minFontSize
  while (lines > maxLines && currentSize > minSize) {
    currentSize = Math.max(minSize, currentSize - 2);
    lines = estimateLineCount(text, currentSize, options.containerWidthPercent);
  }

  const isOverflowing = lines > maxLines;

  return {
    fittedFontSize: currentSize,
    estimatedLines: lines,
    isOverflowing,
    overflowBehavior: isOverflowing ? 'shrink' : 'clip'
  };
}
