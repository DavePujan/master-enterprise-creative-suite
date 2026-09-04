import { PresentationTheme } from '../domain/types.js';
import { resolveTypographyToken } from '../typography/fontMapping.js';
import { buildChartPaletteFromColors } from './chartPaletteResolver.js';

export interface RawBrandContext {
  id?: string;
  name: string;
  colors?: string[];
  typography?: {
    primary?: string;
    secondary?: string;
  };
  style?: string;
  tone?: string;
}

/**
 * Resolves or builds a canonical PresentationTheme from workspace brand guidelines.
 */
export function resolveBrandTheme(brand?: RawBrandContext, customTheme?: Partial<PresentationTheme>): PresentationTheme {
  const brandName = brand?.name || 'Enterprise Suite';
  const primaryColor = brand?.colors?.[0] || '#2874F0';
  const secondaryColor = brand?.colors?.[1] || '#FB641B';
  const accentColor = brand?.colors?.[2] || '#FFE500';

  const headingFontDef = resolveTypographyToken(brand?.typography?.primary || 'Inter');
  const bodyFontDef = resolveTypographyToken(brand?.typography?.secondary || brand?.typography?.primary || 'Inter');

  const chartPalette = buildChartPaletteFromColors({
    primary: primaryColor,
    secondary: secondaryColor,
    accent: accentColor
  });

  const baseTheme: PresentationTheme = {
    id: `theme_${brand?.id || 'brand_default'}`,
    name: `Signature ${brandName}`,
    colors: {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
      background: '#0F172A',
      surface: 'rgba(30, 41, 59, 0.75)',
      text: '#FFFFFF',
      mutedText: '#94A3B8',
      border: 'rgba(255, 255, 255, 0.12)',
      chartPalette
    },
    typography: {
      headingFont: headingFontDef.webFont,
      bodyFont: bodyFontDef.webFont,
      pptxSafeHeadingFont: headingFontDef.pptxSafeFont,
      pptxSafeBodyFont: bodyFontDef.pptxSafeFont
    },
    overlay: 0.45,
    cornerRadius: 16,
    lineStyle: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`
  };

  if (!customTheme) {
    return baseTheme;
  }

  return {
    ...baseTheme,
    ...customTheme,
    colors: {
      ...baseTheme.colors,
      ...customTheme.colors
    },
    typography: {
      ...baseTheme.typography,
      ...customTheme.typography
    }
  };
}
