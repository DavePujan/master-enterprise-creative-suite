import React, { useState } from 'react';
import { Sparkles, Send, Loader2, Target, Globe, Check, X, AlertTriangle, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';
import { cn } from '@web/lib/utils.js';
import type { ProposeRevisionResponse, ImpactTier } from '@contracts/adSpecContracts.js';

export interface AiRevisionPanelProps {
  selectedShotId: string | null;
  selectedShotSequence: number | null;
  onClearSelectedShot: () => void;
  onSubmitRevision: (instruction: string, scope: 'shot' | 'spec', targetShotId?: string) => Promise<void>;
  isRevising: boolean;
  activeProposal?: ProposeRevisionResponse | null;
  onApplyProposal?: () => Promise<void>;
  onDiscardProposal?: () => void;
  onOpenDiffModal?: () => void;
  isApplying?: boolean;
}

export const AiRevisionPanel: React.FC<AiRevisionPanelProps> = ({
  selectedShotId,
  selectedShotSequence,
  onClearSelectedShot,
  onSubmitRevision,
  isRevising,
  activeProposal,
  onApplyProposal,
  onDiscardProposal,
  onOpenDiffModal,
  isApplying = false
}) => {
  const [instruction, setInstruction] = useState('');
  const [scope, setScope] = useState<'shot' | 'spec'>('shot');

  // If a shot is selected and scope is shot, target that shot
  const activeTargetScope = (selectedShotId && scope === 'shot') ? 'shot' : 'spec';
  const targetLabel = activeTargetScope === 'shot' && selectedShotSequence 
    ? `Target: Shot ${selectedShotSequence.toString().padStart(2, '0')}`
    : 'Target: Entire Advertisement';

  // Quick suggestion chips based on active scope
  const suggestionChips = activeTargetScope === 'shot'
    ? [
        'Make shot more energetic with fast tracking',
        'Make lighting warmer with golden hour amber glow',
        'Show the product earlier and focal in center',
        'Increase lighting contrast to dramatic high key'
      ]
    : [
        'Make the opening more dramatic',
        'Keep the same story but make it feel more premium',
        'Make the ad 15 seconds instead of 20',
        'Remove the character from the final shot'
      ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isRevising) return;
    const text = instruction.trim();
    setInstruction('');
    await onSubmitRevision(text, activeTargetScope, activeTargetScope === 'shot' ? selectedShotId || undefined : undefined);
  };

  const renderImpactBadge = (tier: ImpactTier) => {
    switch (tier) {
      case 'PRODUCT_IDENTITY':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <ShieldAlert size={11} />
            PRODUCT IDENTITY · EXPLICIT CONFIRMATION
          </span>
        );
      case 'STRUCTURAL_COST':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <Cpu size={11} />
            STRUCTURAL · GENERATION IMPACT
          </span>
        );
      case 'CREATIVE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle size={11} />
            CREATIVE · CONFIRMATION RECOMMENDED
          </span>
        );
      case 'DIRECT':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Check size={11} />
            DIRECT · SAFE ADJUSTMENT
          </span>
        );
    }
  };

  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return 'None';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (Array.isArray(val)) return val.map(item => typeof item === 'object' ? (item.name || item.entityId || item.id || JSON.stringify(item)) : String(item)).join(', ');
    if (typeof val === 'object') {
      return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(' | ');
    }
    return String(val);
  };

  return (
    <div id="ai-revision-panel" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-4 shadow-sm text-left transition-all">
      {/* Active Proposal View (Editor-like UX) */}
      {activeProposal ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-rose-600 dark:text-rose-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">
                Director Assist
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                · Proposed Revision
              </span>
            </div>
            {renderImpactBadge(activeProposal.highestImpactTier)}
          </div>

          {/* User instruction banner */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xs">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-0.5">
              Instruction:
            </span>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 italic">
              "{activeProposal.instruction}"
            </p>
          </div>

          {/* Cost impact warning if structural */}
          {activeProposal.costImpact && (
            <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold font-mono text-rose-800 dark:text-rose-300">
                <span className="flex items-center gap-1.5">
                  <Cpu size={13} />
                  ESTIMATED GENERATION IMPACT
                </span>
                <span>
                  {activeProposal.costImpact.shotsBefore} shots → {activeProposal.costImpact.shotsAfter} shots
                </span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                {activeProposal.costImpact.warning || activeProposal.summary}
              </p>
            </div>
          )}

          {/* Proposed Changes list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                AI Proposed Changes ({activeProposal.operations.length})
              </span>
              {onOpenDiffModal && (
                <button
                  type="button"
                  onClick={onOpenDiffModal}
                  className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-mono cursor-pointer"
                >
                  [ View Full Spec Diff ]
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {activeProposal.operations.map((op, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xs text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {op.target}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {op.operation}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-300 pt-0.5">
                    <div className="px-2 py-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xs line-through text-slate-400 dark:text-slate-500 truncate max-w-[45%]">
                      {formatValue(op.before)}
                    </div>
                    <ArrowRight size={12} className="text-slate-400 shrink-0" />
                    <div className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold rounded-xs truncate max-w-[45%]">
                      {formatValue(op.after)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {onDiscardProposal && (
              <button
                type="button"
                onClick={onDiscardProposal}
                disabled={isApplying}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
              >
                [ DISCARD ]
              </button>
            )}
            {onApplyProposal && (
              <button
                type="button"
                onClick={onApplyProposal}
                disabled={isApplying}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                {isApplying ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Applying Revision...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>[ APPLY REVISION ]</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Input Form View */
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-rose-600 dark:text-rose-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">
                Director Assist · Natural Language Revision
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900/60">
                {targetLabel}
              </span>
            </div>

            {/* Scope Switcher */}
            {selectedShotId && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setScope('shot')}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-xs transition-all flex items-center gap-1 cursor-pointer font-sans",
                    scope === 'shot'
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Target size={11} />
                  <span>Shot {selectedShotSequence?.toString().padStart(2, '0')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('spec')}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-xs transition-all flex items-center gap-1 cursor-pointer font-sans",
                    scope === 'spec'
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Globe size={11} />
                  <span>Entire Ad</span>
                </button>
              </div>
            )}
          </div>

          {/* Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold mr-1">
              Suggestions:
            </span>
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInstruction(chip)}
                className="text-[11px] font-medium px-2.5 py-1 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xs transition-colors cursor-pointer text-left"
              >
                + {chip}
              </button>
            ))}
          </div>

          {/* Natural Language Prompt Form */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3">
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={
                activeTargetScope === 'shot'
                  ? `e.g. "Make shot ${selectedShotSequence} more energetic with fast tracking"`
                  : 'e.g. "Make the opening more dramatic" or "Make the ad 15 seconds instead of 20"...'
              }
              disabled={isRevising}
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500 dark:focus:border-rose-400"
            />
            <button
              type="submit"
              disabled={!instruction.trim() || isRevising}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-sm flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0 font-sans"
            >
              {isRevising ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Analyzing Impact...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Propose Revision</span>
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
};
