import React from 'react';
import {
  SlideElement,
  PresentationTheme,
  ChartElement,
  MetricElement,
  TextElement
} from '@presentation-engine/index.js';
import { BrandLogo } from '@web/features/brand/components/BrandLogo.js';
import { TrendingUp, TrendingDown, Minus, Move } from 'lucide-react';

interface SlideElementRendererProps {
  element: SlideElement;
  theme: PresentationTheme;
  brandGuidelines: any;
  isEditing?: boolean;
  onUpdateElement?: (updated: SlideElement) => void;
  onLogoDragStart?: (e: React.MouseEvent | React.TouchEvent) => void;
}

export const SlideElementRenderer: React.FC<SlideElementRendererProps> = ({
  element,
  theme,
  brandGuidelines,
  isEditing = false,
  onUpdateElement,
  onLogoDragStart
}) => {
  const { bounds } = element;
  const styleObj: React.CSSProperties = {
    position: 'absolute',
    left: `${bounds.x}%`,
    top: `${bounds.y}%`,
    width: `${bounds.width}%`,
    height: `${bounds.height}%`,
    zIndex: bounds.zIndex || 1,
    transform: bounds.rotation ? `rotate(${bounds.rotation}deg)` : undefined
  };

  switch (element.type) {
    case 'shape': {
      const fill = element.fillColor || element.style?.backgroundColor || 'transparent';
      const border = element.borderColor || element.style?.borderColor;
      const borderRadius = element.shapeType === 'circle' ? '9999px' : (element.shapeType === 'pill' ? '9999px' : `${element.style?.borderRadius || 12}px`);

      return (
        <div
          style={{
            ...styleObj,
            backgroundColor: fill,
            borderColor: border,
            borderWidth: border ? `${element.borderWidth || element.style?.borderWidth || 1}px` : undefined,
            borderStyle: border ? 'solid' : undefined,
            borderRadius
          }}
        />
      );
    }

    case 'line': {
      const stroke = element.strokeColor || theme.colors.secondary || '#FB641B';
      return (
        <div
          style={{
            ...styleObj,
            height: `${element.strokeWidth || 2}px`,
            backgroundColor: stroke
          }}
        />
      );
    }

    case 'logo': {
      return (
        <div
          style={{
            ...styleObj,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            cursor: onLogoDragStart ? 'move' : 'default',
            userSelect: 'none'
          }}
          onMouseDown={onLogoDragStart}
          onTouchStart={onLogoDragStart}
          title="Click and drag to reposition logo"
        >
          <div className="flex items-center gap-1.5 group">
            {brandGuidelines?.logo ? (
              <BrandLogo
                customLogo={brandGuidelines.logo}
                brandName={element.brandName}
                className="h-8 max-w-[120px] object-contain drop-shadow-sm"
              />
            ) : (
              <span className="text-lg font-black tracking-wider text-white drop-shadow-md">
                {element.brandName.toUpperCase()}
              </span>
            )}
            {onLogoDragStart && (
              <Move className="w-3.5 h-3.5 text-white/40 group-hover:text-white/80 transition-colors" />
            )}
          </div>
        </div>
      );
    }

    case 'text': {
      const textEl = element as TextElement;
      const isTitle = textEl.role === 'title';
      const isSub = textEl.role === 'subtitle';

      const color = textEl.style?.color || (isSub ? theme.colors.mutedText : theme.colors.text) || '#FFFFFF';
      const fontSize = textEl.style?.fontSize ? `${textEl.style.fontSize * 0.08}vw` : (isTitle ? '2.2vw' : '1.1vw');
      const fontWeight = textEl.style?.fontWeight || (isTitle ? 'bold' : 'normal');

      return (
        <div
          style={{
            ...styleObj,
            color,
            fontSize,
            fontWeight,
            textAlign: textEl.style?.textAlign || 'left',
            lineHeight: textEl.style?.lineHeight || 1.4,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: textEl.textLayout?.verticalAlign === 'middle' ? 'center' : 'flex-start'
          }}
        >
          {textEl.bulletPoints && textEl.bulletPoints.length > 0 ? (
            <ul className="space-y-2 text-slate-200 list-disc pl-4 text-left">
              {textEl.bulletPoints.map((bp, idx) => (
                <li key={idx} className="leading-relaxed">
                  {bp}
                </li>
              ))}
            </ul>
          ) : (
            <div className={textEl.textLayout?.overflow === 'shrink' ? 'break-words' : 'truncate'}>
              {textEl.text}
            </div>
          )}
        </div>
      );
    }

    case 'metric': {
      const metricEl = element as MetricElement;
      const isPlaceholder = metricEl.provenance === 'placeholder';

      return (
        <div
          style={{
            ...styleObj,
            backgroundColor: metricEl.style?.backgroundColor || theme.colors.surface || 'rgba(30, 41, 59, 0.85)',
            borderColor: metricEl.style?.borderColor || theme.colors.border || 'rgba(255, 255, 255, 0.12)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: `${theme.cornerRadius || 16}px`,
            padding: '1vw',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[0.65vw] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                isPlaceholder ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {isPlaceholder ? 'Unverified / Placeholder' : 'Verified Metric'}
            </span>
            {metricEl.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
            {metricEl.trend === 'down' && <TrendingDown className="w-4 h-4 text-rose-400" />}
            {metricEl.trend === 'neutral' && <Minus className="w-4 h-4 text-slate-400" />}
          </div>

          <div
            className="text-[1.8vw] font-black tracking-tight my-1 truncate"
            style={{ color: theme.colors.primary || '#2874F0' }}
            title={metricEl.value}
          >
            {metricEl.value}
          </div>

          <div className="text-[0.9vw] font-medium text-slate-200 leading-snug line-clamp-2">
            {metricEl.label}
          </div>

          {metricEl.source && (
            <div className="text-[0.65vw] text-slate-400 mt-1 truncate" title={metricEl.source}>
              Source: {metricEl.source}
            </div>
          )}
        </div>
      );
    }

    case 'chart': {
      const chartEl = element as ChartElement;
      const palette = theme.colors.chartPalette || ['#2874F0', '#FB641B', '#FFE500', '#10B981'];

      // Simple SVG rendering for bar chart preview
      return (
        <div
          style={{
            ...styleObj,
            backgroundColor: theme.colors.surface || 'rgba(30, 41, 59, 0.75)',
            borderColor: theme.colors.border || 'rgba(255, 255, 255, 0.12)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: `${theme.cornerRadius || 16}px`,
            padding: '1vw',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {chartEl.title && (
            <div className="text-[1.1vw] font-bold text-white mb-2 truncate">
              {chartEl.title}
            </div>
          )}

          <div className="flex-1 flex items-end gap-3 pt-4 pb-2 border-b border-white/10">
            {chartEl.categories.map((cat, cIdx) => {
              const val = chartEl.series[0]?.values[cIdx] || 10;
              const maxVal = Math.max(...chartEl.series.flatMap(s => s.values), 1);
              const heightPct = Math.max(15, (val / maxVal) * 85);

              return (
                <div key={cIdx} className="flex-1 flex flex-col items-center h-full justify-end">
                  <div
                    className="w-full rounded-t-sm transition-all hover:brightness-110"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: palette[cIdx % palette.length]
                    }}
                    title={`${cat}: ${val}`}
                  />
                  <span className="text-[0.7vw] text-slate-300 mt-1 truncate w-full text-center">
                    {cat}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[0.65vw] text-slate-400 mt-2">
            <span>{chartEl.series.map(s => s.name).join(', ')}</span>
            <span className="text-emerald-400">Native Office Chart</span>
          </div>
        </div>
      );
    }

    case 'table': {
      return (
        <div
          style={{
            ...styleObj,
            backgroundColor: theme.colors.surface || 'rgba(30, 41, 59, 0.75)',
            borderRadius: `${theme.cornerRadius || 16}px`,
            overflow: 'hidden',
            padding: '0.8vw'
          }}
        >
          <table className="w-full text-left text-[0.8vw] text-slate-200">
            <thead className="text-white border-b border-white/20">
              <tr>
                {element.headers.map((h, i) => (
                  <th key={i} className="pb-2 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {element.rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-white/5">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-1.5">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    default:
      return null;
  }
};
