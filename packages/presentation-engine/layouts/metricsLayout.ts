import { SemanticSlideInput, SlideElement, PresentationTheme } from '../domain/types.js';
import { sanitizeMetricProvenance } from '../domain/provenance.js';

export function computeMetricsLayout(
  input: SemanticSlideInput,
  theme?: PresentationTheme,
  slideId = 'slide_metrics'
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
      fontSize: 32,
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

  // 4. Metric Cards
  const list = input.metrics && input.metrics.length > 0
    ? input.metrics
    : (input.metric ? [input.metric] : []);

  // Ensure at least 2 metrics
  while (list.length < 2) {
    list.push({
      value: `[Insert verified KPI ${list.length + 1}]`,
      label: `Key Performance Metric ${list.length + 1}`,
      provenance: 'placeholder'
    });
  }

  const count = Math.min(list.length, 3);
  const gap = 3;
  const startX = 6;
  const availableWidth = 100 - (startX * 2);
  const cardWidth = (availableWidth - (gap * (count - 1))) / count;

  for (let i = 0; i < count; i++) {
    const sanitized = sanitizeMetricProvenance(list[i]);
    const x = startX + i * (cardWidth + gap);

    elements.push({
      id: `${slideId}_el_metric_focus_${i}`,
      type: 'metric',
      bounds: { x, y: 30, width: cardWidth, height: 56 },
      value: sanitized.value,
      label: sanitized.label,
      trend: sanitized.trend,
      provenance: sanitized.provenance,
      source: sanitized.source,
      confidence: sanitized.confidence,
      style: {
        backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.85)',
        borderColor: i === 0 ? (theme?.colors.primary || '#2874F0') : (theme?.colors.border || 'rgba(255, 255, 255, 0.12)'),
        borderWidth: i === 0 ? 2 : 1,
        borderRadius: theme?.cornerRadius || 16,
        padding: 20
      }
    });
  }

  return elements;
}
