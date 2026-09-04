/**
 * Deterministic Typography Token & Font Mapping System.
 * Ensures consistent rendering across Web (Google Fonts/CSS), PPTX (Office-safe fonts), and PDF (Standard fonts).
 */

export interface FontDefinition {
  name: string;
  webFont: string;
  pptxSafeFont: string;
  pdfStandardFont: 'Helvetica' | 'Times' | 'Courier';
  category: 'sans-serif' | 'serif' | 'monospace' | 'display';
}

export const FONT_MAPPING_TABLE: Record<string, FontDefinition> = {
  inter: {
    name: 'Inter',
    webFont: 'Inter, sans-serif',
    pptxSafeFont: 'Arial',
    pdfStandardFont: 'Helvetica',
    category: 'sans-serif'
  },
  roboto: {
    name: 'Roboto',
    webFont: 'Roboto, sans-serif',
    pptxSafeFont: 'Arial',
    pdfStandardFont: 'Helvetica',
    category: 'sans-serif'
  },
  outfit: {
    name: 'Outfit',
    webFont: 'Outfit, sans-serif',
    pptxSafeFont: 'Calibri',
    pdfStandardFont: 'Helvetica',
    category: 'sans-serif'
  },
  playfair: {
    name: 'Playfair Display',
    webFont: '"Playfair Display", Georgia, serif',
    pptxSafeFont: 'Georgia',
    pdfStandardFont: 'Times',
    category: 'serif'
  },
  merriweather: {
    name: 'Merriweather',
    webFont: 'Merriweather, Georgia, serif',
    pptxSafeFont: 'Georgia',
    pdfStandardFont: 'Times',
    category: 'serif'
  },
  fira: {
    name: 'Fira Code',
    webFont: '"Fira Code", monospace',
    pptxSafeFont: 'Consolas',
    pdfStandardFont: 'Courier',
    category: 'monospace'
  },
  sans: {
    name: 'Standard Sans',
    webFont: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    pptxSafeFont: 'Calibri',
    pdfStandardFont: 'Helvetica',
    category: 'sans-serif'
  },
  serif: {
    name: 'Standard Serif',
    webFont: 'Georgia, Cambria, "Times New Roman", Times, serif',
    pptxSafeFont: 'Georgia',
    pdfStandardFont: 'Times',
    category: 'serif'
  }
};

/**
 * Resolves safe PPTX and PDF font definitions from an arbitrary font family or keyword.
 */
export function resolveTypographyToken(fontKeyOrName?: string): FontDefinition {
  if (!fontKeyOrName) {
    return FONT_MAPPING_TABLE.inter;
  }

  const normalized = fontKeyOrName.toLowerCase().replace(/['"]/g, '').trim();

  for (const [key, def] of Object.entries(FONT_MAPPING_TABLE)) {
    if (normalized.includes(key) || normalized.includes(def.name.toLowerCase())) {
      return def;
    }
  }

  if (normalized.includes('serif')) {
    return FONT_MAPPING_TABLE.serif;
  }
  if (normalized.includes('mono')) {
    return FONT_MAPPING_TABLE.fira;
  }

  return FONT_MAPPING_TABLE.inter;
}
