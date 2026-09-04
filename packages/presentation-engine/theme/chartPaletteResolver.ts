import { PresentationTheme, PresentationThemeColors } from '../domain/types.js';

export const DEFAULT_CHART_PALETTE = [
  '#2874F0', // Brand Primary (Blue)
  '#FB641B', // Vibrant Secondary (Orange)
  '#FFE500', // Highlight Accent (Gold/Yellow)
  '#10B981', // Positive/Growth (Emerald)
  '#6366F1', // Indigo
  '#EC4899', // Rose/Pink
  '#06B6D4'  // Cyan
];

/**
 * Resolves a palette color for a semantic series index, ensuring theme consistency.
 */
export function getSeriesColor(theme: PresentationTheme | undefined, seriesIndex: number): string {
  const palette = theme?.colors.chartPalette && theme.colors.chartPalette.length > 0
    ? theme.colors.chartPalette
    : DEFAULT_CHART_PALETTE;

  return palette[seriesIndex % palette.length];
}

/**
 * Derives a full coordinated chart palette from base theme colors.
 */
export function buildChartPaletteFromColors(colors: Partial<PresentationThemeColors>): string[] {
  const primary = colors.primary || '#2874F0';
  const secondary = colors.secondary || '#FB641B';
  const accent = colors.accent || '#FFE500';

  return [
    primary,
    secondary,
    accent,
    '#10B981',
    '#6366F1',
    '#EC4899',
    '#06B6D4'
  ];
}
