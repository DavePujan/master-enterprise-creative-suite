import { SemanticSlideInput, SlideElement, PresentationTheme } from '../domain/types.js';
import { sanitizeMetricProvenance } from '../domain/provenance.js';

export function computeBentoLayout(
  input: SemanticSlideInput,
  theme?: PresentationTheme,
  slideId = 'slide_bento'
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
    bounds: { x: 6, y: 8, width: 74, height: 10 },
    style: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme?.colors.text || '#FFFFFF'
    },
    textLayout: {
      maxLines: 1,
      overflow: 'shrink'
    }
  });

  // 3. Primary Main Bento Cell (Left, 56% width)
  if (input.chart) {
    elements.push({
      id: `${slideId}_el_chart`,
      type: 'chart',
      chartType: input.chart.chartType,
      title: input.chart.title || input.subtitle || 'Performance Analysis',
      categories: input.chart.categories,
      series: input.chart.series,
      provenance: input.chart.provenance,
      source: input.chart.source,
      bounds: { x: 6, y: 22, width: 56, height: 68 },
      style: {
        backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.75)',
        borderColor: theme?.colors.border || 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        borderRadius: theme?.cornerRadius || 16,
        padding: 16
      }
    });
  } else if (input.table) {
    elements.push({
      id: `${slideId}_el_table`,
      type: 'table',
      headers: input.table.headers,
      rows: input.table.rows,
      provenance: input.table.provenance,
      source: input.table.source,
      bounds: { x: 6, y: 22, width: 56, height: 68 },
      style: {
        backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.75)',
        borderColor: theme?.colors.border || 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        borderRadius: theme?.cornerRadius || 16,
        padding: 16
      }
    });
  } else {
    // Standard structured pillars / bullet card
    elements.push({
      id: `${slideId}_el_main_card`,
      type: 'shape',
      shapeType: 'rect',
      bounds: { x: 6, y: 22, width: 56, height: 68 },
      style: {
        backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.75)',
        borderColor: theme?.colors.border || 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        borderRadius: theme?.cornerRadius || 16
      }
    });

    if (input.subtitle) {
      elements.push({
        id: `${slideId}_el_main_sub`,
        type: 'text',
        role: 'subtitle',
        text: input.subtitle,
        bounds: { x: 10, y: 26, width: 48, height: 8 },
        style: {
          fontSize: 18,
          fontWeight: 'bold',
          color: theme?.colors.primary || '#2874F0'
        }
      });
    }

    const bullets = input.bulletPoints && input.bulletPoints.length > 0 ? input.bulletPoints : [];
    elements.push({
      id: `${slideId}_el_main_bullets`,
      type: 'text',
      role: 'body',
      text: '',
      bulletPoints: bullets,
      bounds: { x: 10, y: 36, width: 48, height: 50 },
      style: {
        fontSize: 15,
        lineHeight: 1.6,
        color: theme?.colors.text || '#FFFFFF'
      },
      textLayout: {
        maxLines: 5,
        overflow: 'shrink'
      }
    });
  }

  // 4. Two Stacked KPI Metric Cards (Right column, 28% width each)
  const metricsList = input.metrics && input.metrics.length > 0
    ? input.metrics
    : (input.metric ? [input.metric] : []);

  const metric1 = metricsList[0] || {
    value: '[Insert verified KPI 1]',
    label: 'Primary Performance Indicator',
    provenance: 'placeholder' as const
  };
  const m1Sanitized = sanitizeMetricProvenance(metric1);

  elements.push({
    id: `${slideId}_el_kpi_1`,
    type: 'metric',
    bounds: { x: 66, y: 22, width: 28, height: 32 },
    value: m1Sanitized.value,
    label: m1Sanitized.label,
    trend: m1Sanitized.trend,
    provenance: m1Sanitized.provenance,
    source: m1Sanitized.source,
    confidence: m1Sanitized.confidence,
    style: {
      backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.85)',
      borderColor: theme?.colors.border || 'rgba(255, 255, 255, 0.12)',
      borderWidth: 1,
      borderRadius: theme?.cornerRadius || 16,
      padding: 14
    }
  });

  const metric2 = metricsList[1] || {
    value: '[Insert verified KPI 2]',
    label: 'Secondary Operational Velocity',
    provenance: 'placeholder' as const
  };
  const m2Sanitized = sanitizeMetricProvenance(metric2);

  elements.push({
    id: `${slideId}_el_kpi_2`,
    type: 'metric',
    bounds: { x: 66, y: 58, width: 28, height: 32 },
    value: m2Sanitized.value,
    label: m2Sanitized.label,
    trend: m2Sanitized.trend,
    provenance: m2Sanitized.provenance,
    source: m2Sanitized.source,
    confidence: m2Sanitized.confidence,
    style: {
      backgroundColor: theme?.colors.surface || 'rgba(30, 41, 59, 0.85)',
      borderColor: theme?.colors.border || 'rgba(255, 255, 255, 0.12)',
      borderWidth: 1,
      borderRadius: theme?.cornerRadius || 16,
      padding: 14
    }
  });

  return elements;
}
