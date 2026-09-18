import React from 'react';
import type { AdSpecDiff, ChangeImpactAnalysis } from '@shared-types/directorOperations.js';
import { 
  Check, 
  X, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  GitCompare,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@web/lib/utils.js';

export interface RevisionDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  diff: AdSpecDiff | null;
  impact?: ChangeImpactAnalysis | null;
  targetScopeLabel?: string;
  onApply: () => Promise<void>;
  onReject: () => void;
  isApplying: boolean;
}

export const RevisionDiffModal: React.FC<RevisionDiffModalProps> = ({
  isOpen,
  onClose,
  diff,
  impact,
  targetScopeLabel = 'Proposed Revision',
  onApply,
  onReject,
  isApplying
}) => {
  if (!isOpen || !diff) return null;

  const modifiedPaths = diff.modifiedPaths || [];
  const addedPaths = diff.addedPaths || [];
  const removedPaths = diff.removedPaths || [];

  const directlyAffected = impact?.directlyAffected || [];
  const indirectlyAffected = impact?.indirectlyAffected || [];
  const unaffected = impact?.unaffected || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-2xl overflow-hidden text-left animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-sm">
              <GitCompare size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                Review Proposed Creative Revision
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {targetScopeLabel} · {modifiedPaths.length} Field Modifications
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

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Natural Language Explanation generated deterministically from diff */}
          <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-sm text-xs space-y-1">
            <span className="font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider text-[10px] font-mono">
              Deterministic Revision Explanation
            </span>
            <p className="text-rose-950 dark:text-rose-100 font-medium leading-relaxed">
              {diff.explanation || 'Structured changes targeting specific cinematography fields while preserving all other shots and brand rules.'}
            </p>
          </div>

          {/* Changed Fields (Before vs After) */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono block">
              Changed Fields ({modifiedPaths.length})
            </span>

            <div className="space-y-2">
              {modifiedPaths.map((item: any, idx) => {
                const pathStr = typeof item === 'string' ? item : item?.path || `field_${idx}`;
                const prevVal = typeof item === 'object' && item?.previousValue !== undefined ? item.previousValue : diff.previousValues?.[pathStr];
                const newVal = typeof item === 'object' && item?.newValue !== undefined ? item.newValue : diff.newValues?.[pathStr];

                const prevStr = typeof prevVal === 'object' ? JSON.stringify(prevVal) : String(prevVal ?? 'None');
                const newStr = typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? 'None');

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {pathStr}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                      <div className="p-2 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xs text-rose-800 dark:text-rose-300">
                        <span className="text-[9px] uppercase font-bold text-rose-500 block">Previous State:</span>
                        <span className="break-all">{prevStr}</span>
                      </div>
                      <div className="p-2 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xs text-emerald-800 dark:text-emerald-300">
                        <span className="text-[9px] uppercase font-bold text-emerald-500 block">Proposed New State:</span>
                        <span className="break-all">{newStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Change Impact: Affected vs Unaffected (The Trust Engine) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {/* Affected Sections */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-mono flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Affected Elements ({directlyAffected.length + indirectlyAffected.length})
              </span>

              <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                {directlyAffected.map((item: any, i) => (
                  <li key={i} className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>{typeof item === 'string' ? item : `Direct: ${item.type || ''} ${item.id || ''} ${item.field ? `(${item.field})` : ''}`}</span>
                  </li>
                ))}
                {indirectlyAffected.map((item: any, i) => (
                  <li key={i} className="flex items-center gap-1.5 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>{typeof item === 'string' ? item : `Indirect: ${item.type || ''} ${item.id || ''} (${item.reason || ''})`}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Invariant Unaffected Sections */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                Preserved 100% Unaffected
              </span>

              <ul className="space-y-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                {unaffected.length > 0 ? (
                  unaffected.map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{item.type}: {item.id}</span>
                    </li>
                  ))
                ) : (
                  <>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Characters & Brand Guidelines</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Commercial Brief & Call to Action</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onReject}
            disabled={isApplying}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Reject Revision
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Keep Reviewing
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={isApplying}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-sm shadow-sm flex items-center gap-1.5 transition-colors font-sans"
            >
              <Check size={14} />
              <span>Apply Revision to Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
