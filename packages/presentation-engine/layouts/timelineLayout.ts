import { SemanticSlideInput, SlideElement, PresentationTheme } from '../domain/types.js';

export function computeTimelineLayout(
  input: SemanticSlideInput,
  theme?: PresentationTheme,
  slideId = 'slide_timeline'
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

  // 4. Horizontal Milestone Axis Line
  elements.push({
    id: `${slideId}_el_axis_line`,
    type: 'line',
    bounds: { x: 8, y: 36, width: 84, height: 0.5 },
    strokeColor: theme?.colors.secondary || '#FB641B',
    strokeWidth: 2,
    dashStyle: 'solid'
  });

  // 5. Milestone Cards
  const rawBullets = input.bulletPoints && input.bulletPoints.length > 0
    ? input.bulletPoints
    : ['Phase 1: Foundation & Readiness', 'Phase 2: Regional Rollout', 'Phase 3: Peak Volume Activation'];

  const count = Math.min(rawBullets.length, 4);
  const gap = 2;
  const startX = 8;
  const totalWidth = 84;
  const cardWidth = (totalWidth - (gap * (count - 1))) / count;

  for (let i = 0; i < count; i++) {
    const x = startX + i * (cardWidth + gap);
    const text = rawBullets[i];

    // Marker dot on the axis
    elements.push({
      id: `${slideId}_el_marker_${i}`,
      type: 'shape',
      shapeType: 'circle',
      bounds: { x: x + cardWidth / 2 - 1, y: 35, width: 2, height: 2 },
      fillColor: theme?.colors.accent || '#FFE500',
      borderColor: theme?.colors.primary || '#2874F0',
      borderWidth: 2
    });

    // Milestone card below axis
    elements.push({
      id: `${slideId}_el_milestone_card_${i}`,
      type: 'shape',
      shapeType: 'rect',
      bounds: { x, y: 44, width: cardWidth, height: 44 },
      style: {
        backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.75)',
        borderColor: theme?.colors.border || 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        borderRadius: theme?.cornerRadius || 16
      }
    });

    // Milestone Header
    elements.push({
      id: `${slideId}_el_milestone_tag_${i}`,
      type: 'text',
      role: 'tagline',
      text: `Stage 0${i + 1}`,
      bounds: { x: x + 2, y: 48, width: cardWidth - 4, height: 6 },
      style: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme?.colors.secondary || '#FB641B'
      }
    });

    // Milestone Content
    elements.push({
      id: `${slideId}_el_milestone_text_${i}`,
      type: 'text',
      role: 'body',
      text,
      bounds: { x: x + 2, y: 56, width: cardWidth - 4, height: 28 },
      style: {
        fontSize: 14,
        lineHeight: 1.5,
        color: theme?.colors.text || '#FFFFFF'
      },
      textLayout: {
        maxLines: 4,
        overflow: 'shrink'
      }
    });
  }

  return elements;
}
