import { SemanticSlideInput, SlideElement, PresentationTheme } from '../domain/types.js';

export function computeCoverLayout(
  input: SemanticSlideInput,
  theme?: PresentationTheme,
  slideId = 'slide_cover'
): SlideElement[] {
  const elements: SlideElement[] = [];

  // 1. Brand Logo (Top Right corner by default)
  if (input.logoAssetId) {
    elements.push({
      id: `${slideId}_el_logo`,
      type: 'logo',
      assetId: input.logoAssetId,
      brandName: input.brandName || 'Brand',
      bounds: { x: 82, y: 8, width: 12, height: 6 }
    });
  }

  // 2. Decorative brand accent pill
  elements.push({
    id: `${slideId}_el_accent_pill`,
    type: 'shape',
    shapeType: 'pill',
    bounds: { x: 45, y: 28, width: 10, height: 0.8 },
    fillColor: theme?.colors.secondary || '#FB641B'
  });

  // 3. Hero Presentation Title
  elements.push({
    id: `${slideId}_el_title`,
    type: 'text',
    role: 'title',
    text: input.title,
    bounds: { x: 10, y: 34, width: 80, height: 24 },
    style: {
      fontSize: 44,
      fontWeight: 'black',
      textAlign: 'center',
      color: theme?.colors.text || '#FFFFFF'
    },
    textLayout: {
      maxLines: 2,
      overflow: 'shrink',
      autoFit: true,
      verticalAlign: 'middle'
    }
  });

  // 4. Subtitle / Tagline
  if (input.subtitle) {
    elements.push({
      id: `${slideId}_el_subtitle`,
      type: 'text',
      role: 'subtitle',
      text: input.subtitle,
      bounds: { x: 15, y: 62, width: 70, height: 12 },
      style: {
        fontSize: 20,
        fontWeight: 'medium',
        textAlign: 'center',
        color: theme?.colors.mutedText || '#94A3B8'
      },
      textLayout: {
        maxLines: 2,
        overflow: 'clip',
        verticalAlign: 'top'
      }
    });
  }

  return elements;
}
