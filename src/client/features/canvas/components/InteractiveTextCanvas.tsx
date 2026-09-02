import React from 'react';
import { cn } from '../../../../lib/utils.js';
import { type TextWordLayer } from '../hooks/useCanvasEditor.js';

export interface InteractiveTextCanvasProps {
  textLayers: TextWordLayer[];
  selectedTextWordId: string | null;
  draggingTextWordId: string | null;
  onTextMouseDown: (e: React.MouseEvent, id: string) => void;
  onTextTouchStart: (e: React.TouchEvent, id: string) => void;
}

export const InteractiveTextCanvas: React.FC<InteractiveTextCanvasProps> = ({
  textLayers,
  selectedTextWordId,
  draggingTextWordId,
  onTextMouseDown,
  onTextTouchStart
}) => {
  return (
    <>
      {textLayers.map((layer) => {
        const isSelected = selectedTextWordId === layer.id;
        const isDragging = draggingTextWordId === layer.id;
        return (
          <div
            key={layer.id}
            onMouseDown={(e) => onTextMouseDown(e, layer.id)}
            onTouchStart={(e) => onTextTouchStart(e, layer.id)}
            style={{
              position: 'absolute',
              left: `${layer.position.x}%`,
              top: `${layer.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontFamily: layer.fontFamily,
              fontSize: `${layer.scale * 0.25}rem`,
              color: layer.color,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            className={cn(
              "z-35 select-none group/text transition-all px-2 py-0.5 rounded-xs border inline-block whitespace-nowrap",
              isSelected 
                ? "border-rose-500 bg-rose-500/15 shadow-md scale-105" 
                : "border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-black/10 dark:hover:bg-white/10"
            )}
          >
            {layer.text}
            {/* Dash border helper on hover */}
            <div className="absolute -inset-0.5 border border-dashed border-rose-500/60 rounded-xs opacity-0 group-hover/text:opacity-100 pointer-events-none" />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-xs opacity-0 group-hover/text:opacity-100 pointer-events-none shadow-md whitespace-nowrap">
              Click & Drag to edit or move
            </div>
          </div>
        );
      })}
    </>
  );
};
