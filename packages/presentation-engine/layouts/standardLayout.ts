import { SemanticSlideInput, SlideElement, PresentationTheme } from '../domain/types.js';

export function computeStandardLayout(
  input: SemanticSlideInput,
  theme?: PresentationTheme,
  slideId = 'slide_standard'
): SlideElement[] {
  const elements: SlideElement[] = [];

  // 1. Logo (Top Right)
  if (input.logoAssetId) {
    elements.push({
      id: `${slideId}_el_logo`,
      type: 'logo',
      assetId: input.logoAssetId,
      brandName: input.brandName || 'Brand',
      bounds: { x: 84, y: 8, width: 12, height: 6 }
    });
  }

  // 2. Slide Title
  elements.push({
    id: `${slideId}_el_title`,
    type: 'text',
    role: 'title',
    text: input.title,
    bounds: { x: 8, y: 8, width: 72, height: 12 },
    style: {
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'left',
      color: theme?.colors.text || '#FFFFFF'
    },
    textLayout: {
      maxLines: 2,
      overflow: 'shrink',
      autoFit: true
    }
  });

  // 3. Subtitle (if present)
  let contentTop = 28;
  if (input.subtitle) {
    elements.push({
      id: `${slideId}_el_subtitle`,
      type: 'text',
      role: 'subtitle',
      text: input.subtitle,
      bounds: { x: 8, y: 20, width: 72, height: 6 },
      style: {
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: 'left',
        color: theme?.colors.mutedText || '#94A3B8'
      }
    });
    contentTop = 30;
  }

  // 4. Content Card Shape
  elements.push({
    id: `${slideId}_el_card_bg`,
    type: 'shape',
    shapeType: 'rect',
    bounds: { x: 8, y: contentTop, width: 84, height: 88 - contentTop },
    style: {
      backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.75)',
      borderColor: theme?.colors.border || 'rgba(255, 255, 255, 0.12)',
      borderWidth: 1,
      borderRadius: theme?.cornerRadius || 16
    }
  });

  // 5. Body Text & Bullet Points
  const bullets = input.bulletPoints && input.bulletPoints.length > 0 ? input.bulletPoints : [];
  elements.push({
    id: `${slideId}_el_body`,
    type: 'text',
    role: 'body',
    text: bullets.length === 0 ? 'Core strategic insight' : '',
    bulletPoints: bullets,
    bounds: { x: 12, y: contentTop + 4, width: 76, height: 80 - contentTop },
    style: {
      fontSize: 18,
      lineHeight: 1.8,
      textAlign: 'left',
      color: theme?.colors.text || '#FFFFFF'
    },
    textLayout: {
      maxLines: 6,
      overflow: 'shrink',
      autoFit: true
    }
  });

  return elements;
}
