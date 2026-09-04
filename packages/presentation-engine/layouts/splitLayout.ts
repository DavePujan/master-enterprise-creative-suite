import { SemanticSlideInput, SlideElement, PresentationTheme } from '../domain/types.js';
import { sanitizeMetricProvenance } from '../domain/provenance.js';

export function computeSplitLayout(
  input: SemanticSlideInput,
  theme?: PresentationTheme,
  slideId = 'slide_split'
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

  // 2. Left Column Card Background
  elements.push({
    id: `${slideId}_el_card_left`,
    type: 'shape',
    shapeType: 'rect',
    bounds: { x: 6, y: 16, width: 54, height: 76 },
    style: {
      backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.75)',
      borderColor: theme?.colors.border || 'rgba(255, 255, 255, 0.12)',
      borderWidth: 1,
      borderRadius: theme?.cornerRadius || 16
    }
  });

  // 3. Left Column Title
  elements.push({
    id: `${slideId}_el_title`,
    type: 'text',
    role: 'title',
    text: input.title,
    bounds: { x: 10, y: 22, width: 46, height: 16 },
    style: {
      fontSize: 30,
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

  // 4. Left Column Bullets / Body
  const bullets = input.bulletPoints && input.bulletPoints.length > 0 ? input.bulletPoints : [];
  elements.push({
    id: `${slideId}_el_bullets`,
    type: 'text',
    role: 'body',
    text: input.subtitle || '',
    bulletPoints: bullets,
    bounds: { x: 10, y: 40, width: 46, height: 46 },
    style: {
      fontSize: 16,
      lineHeight: 1.6,
      textAlign: 'left',
      color: theme?.colors.text || '#E2E8F0'
    },
    textLayout: {
      maxLines: 5,
      overflow: 'shrink',
      autoFit: true
    }
  });

  // 5. Right Column (Metric or Visual Asset slot)
  const metric = input.metric || (input.metrics && input.metrics[0]);
  if (metric) {
    const sanitized = sanitizeMetricProvenance(metric);
    elements.push({
      id: `${slideId}_el_metric_right`,
      type: 'metric',
      bounds: { x: 64, y: 24, width: 30, height: 34 },
      value: sanitized.value,
      label: sanitized.label,
      trend: sanitized.trend,
      provenance: sanitized.provenance,
      source: sanitized.source,
      confidence: sanitized.confidence,
      style: {
        backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.85)',
        borderColor: theme?.colors.border || 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        borderRadius: theme?.cornerRadius || 16,
        padding: 16
      }
    });

    // Secondary right card / insight
    if (input.metrics && input.metrics[1]) {
      const metric2 = sanitizeMetricProvenance(input.metrics[1]);
      elements.push({
        id: `${slideId}_el_metric_right_2`,
        type: 'metric',
        bounds: { x: 64, y: 62, width: 30, height: 30 },
        value: metric2.value,
        label: metric2.label,
        trend: metric2.trend,
        provenance: metric2.provenance,
        source: metric2.source,
        confidence: metric2.confidence,
        style: {
          backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.85)',
          borderColor: theme?.colors.border || 'rgba(255, 255, 255, 0.12)',
          borderWidth: 1,
          borderRadius: theme?.cornerRadius || 16,
          padding: 14
        }
      });
    }
  } else {
    // Default right card highlight
    elements.push({
      id: `${slideId}_el_card_right`,
      type: 'shape',
      shapeType: 'rect',
      bounds: { x: 64, y: 16, width: 30, height: 76 },
      style: {
        backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.65)',
        borderColor: theme?.colors.secondary || 'rgba(251, 100, 27, 0.3)',
        borderWidth: 1,
        borderRadius: theme?.cornerRadius || 16
      }
    });

    elements.push({
      id: `${slideId}_el_right_title`,
      type: 'text',
      role: 'subtitle',
      text: 'Key Strategic Focus',
      bounds: { x: 68, y: 22, width: 22, height: 8 },
      style: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme?.colors.secondary || '#FB641B'
      }
    });
  }

  return elements;
}
