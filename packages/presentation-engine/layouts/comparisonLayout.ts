import { SemanticSlideInput, SlideElement, PresentationTheme } from '../domain/types.js';

export function computeComparisonLayout(
  input: SemanticSlideInput,
  theme?: PresentationTheme,
  slideId = 'slide_comparison'
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

  // 2. Title
  elements.push({
    id: `${slideId}_el_title`,
    type: 'text',
    role: 'title',
    text: input.title,
    bounds: { x: 8, y: 8, width: 74, height: 12 },
    style: {
      fontSize: 30,
      fontWeight: 'bold',
      color: theme?.colors.text || '#FFFFFF'
    }
  });

  // 3. Subtitle
  if (input.subtitle) {
    elements.push({
      id: `${slideId}_el_subtitle`,
      type: 'text',
      role: 'subtitle',
      text: input.subtitle,
      bounds: { x: 8, y: 20, width: 74, height: 6 },
      style: {
        fontSize: 16,
        color: theme?.colors.mutedText || '#94A3B8'
      }
    });
  }

  const bullets = input.bulletPoints && input.bulletPoints.length >= 2
    ? input.bulletPoints
    : ['Current State / Market Baseline: Legacy operational bottlenecks', 'Strategic Target State: Accelerated direct fulfillment network'];

  const mid = Math.ceil(bullets.length / 2);
  const leftBullets = bullets.slice(0, mid);
  const rightBullets = bullets.slice(mid);

  // 4. Left Card (Baseline / Option A)
  elements.push({
    id: `${slideId}_el_card_a`,
    type: 'shape',
    shapeType: 'rect',
    bounds: { x: 8, y: 28, width: 40, height: 60 },
    style: {
      backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.75)',
      borderColor: theme?.colors.border || 'rgba(255, 255, 255, 0.12)',
      borderWidth: 1,
      borderRadius: theme?.cornerRadius || 16
    }
  });

  elements.push({
    id: `${slideId}_el_tag_a`,
    type: 'text',
    role: 'tagline',
    text: 'Baseline / Current Reality',
    bounds: { x: 12, y: 32, width: 32, height: 8 },
    style: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme?.colors.mutedText || '#94A3B8'
    }
  });

  elements.push({
    id: `${slideId}_el_bullets_a`,
    type: 'text',
    role: 'body',
    text: '',
    bulletPoints: leftBullets,
    bounds: { x: 12, y: 42, width: 32, height: 42 },
    style: {
      fontSize: 15,
      lineHeight: 1.7,
      color: theme?.colors.text || '#FFFFFF'
    },
    textLayout: {
      maxLines: 5,
      overflow: 'shrink'
    }
  });

  // 5. Right Card (Target / Strategy)
  elements.push({
    id: `${slideId}_el_card_b`,
    type: 'shape',
    shapeType: 'rect',
    bounds: { x: 52, y: 28, width: 40, height: 60 },
    style: {
      backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.85)',
      borderColor: theme?.colors.primary || '#2874F0',
      borderWidth: 2,
      borderRadius: theme?.cornerRadius || 16
    }
  });

  elements.push({
    id: `${slideId}_el_tag_b`,
    type: 'text',
    role: 'tagline',
    text: 'Strategic Target State',
    bounds: { x: 56, y: 32, width: 32, height: 8 },
    style: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme?.colors.primary || '#2874F0'
    }
  });

  elements.push({
    id: `${slideId}_el_bullets_b`,
    type: 'text',
    role: 'body',
    text: '',
    bulletPoints: rightBullets.length > 0 ? rightBullets : leftBullets,
    bounds: { x: 56, y: 42, width: 32, height: 42 },
    style: {
      fontSize: 15,
      lineHeight: 1.7,
      color: theme?.colors.text || '#FFFFFF'
    },
    textLayout: {
      maxLines: 5,
      overflow: 'shrink'
    }
  });

  return elements;
}
