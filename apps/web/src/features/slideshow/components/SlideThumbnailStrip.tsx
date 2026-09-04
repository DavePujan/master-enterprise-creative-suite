import React from 'react';
import { PresentationSlide, PresentationTheme } from '@presentation-engine/index.js';
import { Plus, Trash2, Layout } from 'lucide-react';

interface SlideThumbnailStripProps {
  slides: PresentationSlide[];
  currentSlideIndex: number;
  theme: PresentationTheme;
  onSelectSlide: (index: number) => void;
  onAddSlide?: () => void;
  onDeleteSlide?: (index: number) => void;
}

export const SlideThumbnailStrip: React.FC<SlideThumbnailStripProps> = ({
  slides,
  currentSlideIndex,
  theme,
  onSelectSlide,
  onAddSlide,
  onDeleteSlide
}) => {
  return (
    <div className="flex items-center gap-3 overflow-x-auto py-3 px-2 scrollbar-thin scrollbar-thumb-white/10">
      {slides.map((slide, idx) => {
        const isActive = idx === currentSlideIndex;

        return (
          <div
            key={slide.id || idx}
            onClick={() => onSelectSlide(idx)}
            className={`group relative flex-shrink-0 w-36 aspect-video rounded-xl p-2.5 cursor-pointer border transition-all duration-200 flex flex-col justify-between select-none ${
              isActive
                ? 'ring-2 ring-blue-500 border-blue-400 bg-slate-800/90 shadow-lg scale-105'
                : 'border-white/10 bg-slate-900/60 hover:bg-slate-800/60 hover:border-white/20'
            }`}
            style={{
              borderColor: isActive ? theme.colors.primary : undefined
            }}
          >
            {/* Top Bar: Purpose Tag + Index */}
            <div className="flex items-center justify-between">
              <span
                className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: isActive ? `${theme.colors.primary}33` : 'rgba(255,255,255,0.1)',
                  color: isActive ? theme.colors.primary : '#94A3B8'
                }}
              >
                {slide.purpose}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                0{idx + 1}
              </span>
            </div>

            {/* Slide Title Preview */}
            <div className="text-[11px] font-semibold text-white truncate leading-tight mt-1">
              {slide.title}
            </div>

            {/* Bottom Bar: Layout Icon + Delete action */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1">
              <div className="flex items-center gap-1">
                <Layout className="w-2.5 h-2.5" />
                <span className="capitalize">{slide.layout}</span>
              </div>

              {onDeleteSlide && slides.length > 1 && idx > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSlide(idx);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 transition-opacity"
                  title="Delete slide"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Add Slide Button */}
      {onAddSlide && (
        <button
          onClick={onAddSlide}
          className="flex-shrink-0 w-24 aspect-video rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-white transition-all text-xs font-medium"
          title="Add new slide"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      )}
    </div>
  );
};
