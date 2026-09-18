import React, { useState } from 'react';
import type { AdSpecShot } from '@shared-types/adSpec.js';
import { ChevronDown, ChevronRight, Terminal, Copy, Check, Info } from 'lucide-react';

export interface AdvancedPromptSectionProps {
  shots: AdSpecShot[];
  selectedShotId: string | null;
}

export const AdvancedPromptSection: React.FC<AdvancedPromptSectionProps> = ({
  shots,
  selectedShotId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Find targeted shot or first shot
  const activeShot = (selectedShotId ? shots.find(s => s.shotId === selectedShotId) : shots[0]) || shots[0];

  // Synthesize compiled prompt for transparency
  const compiledPrompt = activeShot
    ? `[Cinematic Commercial Shot ${activeShot.sequence || 1}]\n` +
      `Action: ${activeShot.action?.visualDescription || 'Dynamic visual sequence'}.\n` +
      `Cinematography: ${activeShot.camera?.cameraMovement || 'slow_push_in'}, ${activeShot.camera?.framing || 'medium_shot'}, ${activeShot.camera?.angle || 'eye_level'}.\n` +
      `Lighting: ${activeShot.lighting?.mood || 'high contrast studio'}, ${activeShot.lighting?.quality || 'volumetric'}.\n` +
      `Atmosphere: Photorealistic 4K commercial cinematography, sharp focus on product features.`
    : 'No active shot selected.';

  const handleCopy = () => {
    navigator.clipboard.writeText(compiledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm overflow-hidden text-left shadow-xs">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
          <Terminal size={14} className="text-slate-400" />
          <span>Advanced Technical Prompt View (Compiled Model Instructions)</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-slate-200 dark:bg-slate-800 text-slate-500 font-normal">
            Derived Artifact · Non-Authoritative
          </span>
        </div>

        {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900 text-xs">
          {/* Critical Boundary Notice */}
          <div className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 rounded-xs text-[11px] text-sky-900 dark:text-sky-200 flex items-start gap-2">
            <Info size={14} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <p>
              <span className="font-bold">Architectural Distinction:</span> The <span className="underline">Director's Plan</span> above is the canonical commercial source of truth. This prompt is a derived, technical downstream artifact compiled on-demand for video engine execution.
            </p>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-[11px] rounded-sm leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {compiledPrompt}
            </pre>

            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-3 right-3 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xs text-[10px] font-mono flex items-center gap-1 transition-colors"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
