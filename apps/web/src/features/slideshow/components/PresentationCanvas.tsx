import React, { useRef, useState } from 'react';
import {
  PresentationSlide,
  PresentationTheme,
  SlideElement,
  LogoElement
} from '@presentation-engine/index.js';
import { SlideElementRenderer } from './SlideElementRenderer.js';

interface PresentationCanvasProps {
  slide: PresentationSlide;
  theme: PresentationTheme;
  brandGuidelines: any;
  onUpdateSlide?: (updatedSlide: PresentationSlide) => void;
  bgImageUrl?: string;
}

export const PresentationCanvas: React.FC<PresentationCanvasProps> = ({
  slide,
  theme,
  brandGuidelines,
  onUpdateSlide,
  bgImageUrl
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  // Logo dragging handler updating normalized percentage bounds (0-100)
  const handleLogoDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!onUpdateSlide) return;

    setIsDraggingLogo(true);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      let clientX = 0;
      let clientY = 0;
      if ('touches' in moveEvent) {
        if (moveEvent.touches.length === 0) return;
        clientX = moveEvent.touches[0].clientX;
        clientY = moveEvent.touches[0].clientY;
      } else {
        clientX = moveEvent.clientX;
        clientY = moveEvent.clientY;
      }

      // Compute normalized percentage coordinates (0 to 100)
      const relX = ((clientX - rect.left) / rect.width) * 100;
      const relY = ((clientY - rect.top) / rect.height) * 100;

      const clampedX = Math.max(2, Math.min(86, relX - 6));
      const clampedY = Math.max(2, Math.min(92, relY - 3));

      // Update logo element in slide
      const updatedElements = slide.elements.map((el) => {
        if (el.type === 'logo') {
          const logoEl = el as LogoElement;
          return {
            ...logoEl,
            bounds: {
              ...logoEl.bounds,
              x: Math.round(clampedX),
              y: Math.round(clampedY)
            }
          };
        }
        return el;
      });

      onUpdateSlide({
        ...slide,
        elements: updatedElements
      });
    };

    const handleEnd = () => {
      setIsDraggingLogo(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
  };

  const hasBgImage = !!bgImageUrl;

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border transition-all ${
        isDraggingLogo ? 'select-none cursor-grabbing' : ''
      }`}
      style={{
        backgroundColor: theme.colors.background || '#0F172A',
        borderColor: theme.colors.border || 'rgba(255, 255, 255, 0.12)'
      }}
    >
      {/* Slide Background Image & Overlay */}
      {hasBgImage && (
        <>
          <img
            src={bgImageUrl}
            alt={slide.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: '#000000',
              opacity: slide.background?.overlayOpacity || theme.overlay || 0.45
            }}
          />
        </>
      )}

      {/* Decorative Brand Accent Line */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 z-10"
        style={{
          background: theme.lineStyle || `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary})`
        }}
      />

      {/* Slide Elements Canvas */}
      <div className="absolute inset-0 p-8">
        {slide.elements.map((element: SlideElement) => (
          <SlideElementRenderer
            key={element.id}
            element={element}
            theme={theme}
            brandGuidelines={brandGuidelines}
            onLogoDragStart={element.type === 'logo' ? handleLogoDragStart : undefined}
          />
        ))}
      </div>

      {/* Slide Index Pill */}
      <div className="absolute bottom-3 right-4 z-20 text-[10px] uppercase font-bold tracking-widest text-white/50 bg-black/40 px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-sm">
        Slide {slide.index + 1}
      </div>
    </div>
  );
};
