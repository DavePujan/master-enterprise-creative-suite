import React from 'react';
import type { AdSpec } from '@shared-types/adSpec.js';
import { X, GitCompare, ArrowRight, Check } from 'lucide-react';
import { formatTimecode, formatShotFraming, formatCameraMovement } from './planFormatters.js';

export interface VersionCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSpec: AdSpec;
  previousSpec: AdSpec | null;
}

export const VersionCompareModal: React.FC<VersionCompareModalProps> = ({
  isOpen,
  onClose,
  currentSpec,
  previousSpec
}) => {
  if (!isOpen || !previousSpec) return null;

  const curShots = currentSpec.shots || [];
  const prevShots = previousSpec.shots || [];

  // Identify shots with modifications
  const shotComparisons = curShots.map((curShot, idx) => {
    const prevShot = prevShots.find(s => s.shotId === curShot.shotId) || prevShots[idx];
    const isNew = !prevShot;
    const isDurationChanged = prevShot && prevShot.durationSeconds !== curShot.durationSeconds;
    const isActionChanged = prevShot && prevShot.action?.visualDescription !== curShot.action?.visualDescription;
    const isCameraChanged = prevShot && (
      (prevShot.camera?.cameraMovement !== curShot.camera?.cameraMovement) ||
      (prevShot.camera?.framing !== curShot.camera?.framing) ||
      (prevShot.camera?.angle !== curShot.camera?.angle)
    );
    const isLightingChanged = prevShot && prevShot.lighting?.mood !== curShot.lighting?.mood;

    const hasChanges = isNew || isDurationChanged || isActionChanged || isCameraChanged || isLightingChanged;

    return {
      shotId: curShot.shotId,
      sequence: curShot.sequence || idx + 1,
      curShot,
      prevShot,
      isNew,
      hasChanges,
      isDurationChanged,
      isActionChanged,
      isCameraChanged,
      isLightingChanged
    };
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-2xl overflow-hidden text-left animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-sm">
              <GitCompare size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                Compare Plan Versions: v{previousSpec.identity.specVersion} vs v{currentSpec.identity.specVersion} (Current)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Highlighting surgical modifications across shots and creative intent
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-sm"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {shotComparisons.map(comp => (
            <div
              key={comp.shotId}
              className={`p-4 rounded-sm border text-xs space-y-3 ${
                comp.hasChanges
                  ? 'bg-rose-50/20 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  : 'bg-slate-50/40 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    SHOT {comp.sequence.toString().padStart(2, '0')}
                  </span>
                  {comp.hasChanges ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-xs bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-mono">
                      Modified
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-xs bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                      100% Unchanged
                    </span>
                  )}
                </div>

                <div className="font-mono text-[11px] text-slate-500">
                  {comp.prevShot?.durationSeconds}s → {comp.curShot.durationSeconds}s
                </div>
              </div>

              {comp.hasChanges ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  {/* Previous Version Column */}
                  <div className="space-y-1.5 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xs">
                    <span className="text-[10px] font-bold uppercase font-mono text-slate-400">
                      v{previousSpec.identity.specVersion} Previous
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">Action:</span> {comp.prevShot?.action?.visualDescription || 'None'}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">Camera:</span> {formatCameraMovement(comp.prevShot?.camera?.cameraMovement)} ({formatShotFraming(comp.prevShot?.camera?.framing)})
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      <span className="font-semibold">Lighting:</span> {comp.prevShot?.lighting?.mood || 'Standard'}
                    </p>
                  </div>

                  {/* Current Version Column */}
                  <div className="space-y-1.5 p-3 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xs">
                    <span className="text-[10px] font-bold uppercase font-mono text-rose-600 dark:text-rose-400">
                      v{currentSpec.identity.specVersion} Current
                    </span>
                    <p className="text-slate-900 dark:text-white font-medium">
                      <span className="font-semibold">Action:</span> {comp.curShot.action?.visualDescription}
                    </p>
                    <p className="text-slate-900 dark:text-white font-medium">
                      <span className="font-semibold">Camera:</span> {formatCameraMovement(comp.curShot.camera?.cameraMovement)} ({formatShotFraming(comp.curShot.camera?.framing)})
                    </p>
                    <p className="text-slate-900 dark:text-white font-medium">
                      <span className="font-semibold">Lighting:</span> {comp.curShot.lighting?.mood || 'Standard'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic text-[11px]">
                  All cinematographic, audio, and choreography parameters remained identical across versions.
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-sm shadow-xs"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
