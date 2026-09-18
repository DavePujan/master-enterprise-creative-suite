import React from 'react';
import type { AdSpecIdentity, AdSpecBrief, AdSpecValidationStatus } from '@shared-types/adSpec.js';
import { formatTimecode, formatAspectRatioLabel, extractCleanValue } from './planFormatters.js';
import { 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  Layers, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  GitCompare, 
  BookOpen, 
  History
} from 'lucide-react';
import { cn } from '@web/lib/utils.js';

export interface DirectorsPlanHeaderProps {
  title: string;
  identity: AdSpecIdentity;
  brief: AdSpecBrief;
  shotCount: number;
  totalDuration: number;
  validationStatus?: AdSpecValidationStatus;
  onApprove: () => void;
  onOpenBibles: () => void;
  onOpenVersionHistory: () => void;
  onToggleCompare: () => void;
  isCompareActive: boolean;
  isApproving: boolean;
}

export const DirectorsPlanHeader: React.FC<DirectorsPlanHeaderProps> = ({
  title,
  identity,
  brief,
  shotCount,
  totalDuration,
  validationStatus,
  onApprove,
  onOpenBibles,
  onOpenVersionHistory,
  onToggleCompare,
  isCompareActive,
  isApproving
}) => {
  const aspectRatio = extractCleanValue(brief.aspectRatio, '9:16');
  const targetPlatform = extractCleanValue(brief.targetPlatform, 'instagram_reels');
  const creativeState = identity.creativeState || 'director_plan_draft';
  const isApproved = creativeState === 'approved';

  // Format platform label
  const platformLabel = String(targetPlatform).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // Validation readiness
  const isValid = validationStatus ? validationStatus.isValid : true;
  const blockingIssues = validationStatus?.issues?.filter(i => i.severity === 'error') || [];

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-5 shrink-0 text-left">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Metadata */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              AI ADVERTISING DIRECTOR · CANONICAL CREATIVE SPEC
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              v{identity.specVersion}
            </span>
            {isApproved ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 font-sans">
                <CheckCircle2 size={11} />
                Plan Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-xs bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 font-sans">
                Director Review Mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50 tracking-tight font-sans">
              {title || 'Commercial Campaign'}
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <span>{formatTimecode(totalDuration)}</span>
              <span>·</span>
              <span>{formatAspectRatioLabel(aspectRatio)}</span>
              <span>·</span>
              <span>{platformLabel}</span>
              <span>·</span>
              <span>{shotCount} {shotCount === 1 ? 'Shot' : 'Shots'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          {/* Bibles Drawer Button */}
          <button
            type="button"
            onClick={onOpenBibles}
            className="px-3 py-2 text-xs font-bold rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Inspect Characters, Products, Locations, and Brand Rules"
          >
            <BookOpen size={13} className="text-slate-400" />
            <span>Production Bibles</span>
          </button>

          {/* Version History Button */}
          <button
            type="button"
            onClick={onOpenVersionHistory}
            className="px-3 py-2 text-xs font-bold rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer font-mono"
            title="View Version History Lineage"
          >
            <History size={13} className="text-slate-400" />
            <span>v{identity.specVersion} History</span>
          </button>

          {/* Compare Changes Toggle */}
          {identity.specVersion > 1 && (
            <button
              type="button"
              onClick={onToggleCompare}
              className={cn(
                "px-3 py-2 text-xs font-bold rounded-sm border transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer",
                isCompareActive
                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
              title="Compare Changes vs Previous Version"
            >
              <GitCompare size={13} />
              <span>Compare v{identity.specVersion - 1}</span>
            </button>
          )}

          {/* Primary Approval Gate Button */}
          <button
            type="button"
            onClick={onApprove}
            disabled={!isValid || isApproving}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer select-none",
              isApproved
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : isValid
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700"
            )}
            title={
              !isValid 
                ? `Plan has ${blockingIssues.length} blocking issues that must be resolved prior to approval.`
                : isApproved
                ? 'Plan approved. Click to choose video model and configure execution parameters.'
                : 'Approve the creative plan and progress to model capability selection.'
            }
          >
            {isApproving ? (
              <>
                <ShieldCheck size={14} className="animate-spin" />
                <span>Approving Plan...</span>
              </>
            ) : isApproved ? (
              <>
                <CheckCircle2 size={14} />
                <span>Approved · Choose Model</span>
                <ArrowRight size={13} />
              </>
            ) : (
              <>
                <ShieldCheck size={14} />
                <span>Approve & Choose Model</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Blocking Issues Alert (if validation failed) */}
      {!isValid && blockingIssues.length > 0 && (
        <div className="mt-3.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-sm text-xs flex items-start gap-2.5 text-rose-900 dark:text-rose-200 animate-in fade-in">
          <AlertCircle size={15} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Approval Blocked ({blockingIssues.length} issues):</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700 dark:text-rose-300">
              {blockingIssues.map((issue, idx) => (
                <li key={idx}>
                  <span className="font-mono">[{issue.code}]</span> {issue.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
