import React from 'react';
import { cn } from '@web/lib/utils.js';

export interface InteractiveLogoOverlayProps {
  logoUrl: string;
  logoPosition: { x: number; y: number };
  logoScale: number;
  logoInverted: boolean;
  isDraggingLogo: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

export const InteractiveLogoOverlay: React.FC<InteractiveLogoOverlayProps> = ({
  logoUrl,
  logoPosition,
  logoScale,
  logoInverted,
  isDraggingLogo,
  onMouseDown,
  onTouchStart
}) => {
  if (!logoUrl) return null;

  return (
    <div 
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        position: 'absolute',
        left: `${logoPosition.x}%`,
        top: `${logoPosition.y}%`,
        width: `${logoScale}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isDraggingLogo ? 'grabbing' : 'grab',
      }}
      className={cn(
        "z-30 select-none group/logo transition-shadow p-1 border",
        isDraggingLogo ? "border-rose-500 bg-rose-500/10 rounded-sm" : "border-transparent"
      )}
    >
      <img 
        src={logoUrl} 
        alt="Interactive Logo" 
        className={cn(
          "w-full h-auto object-contain pointer-events-none drop-shadow transition-all duration-300",
          logoInverted ? "invert" : ""
        )}
        referrerPolicy="no-referrer"
      />
      {/* Dash border helper on hover */}
      <div className="absolute -inset-1 border border-dashed border-rose-500/80 rounded-sm opacity-0 group-hover/logo:opacity-100 pointer-events-none" />
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm opacity-0 group-hover/logo:opacity-100 pointer-events-none shadow-md whitespace-nowrap">
        Drag directly to reposition
      </div>
    </div>
  );
};
