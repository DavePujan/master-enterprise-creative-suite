import React, { useState, useEffect } from 'react';
import type { VideoQAResult, RepairPlan, ShotQaHistoryResponse } from '@contracts/videoQaContracts.js';
import { adDirectorClient } from '../../services/adDirectorClient.js';
import {
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Film,
  Camera,
  Layers,
  Wrench,
  Lock,
  Tag,
  Clock,
  Play
} from 'lucide-react';
import { cn } from '@web/lib/utils.js';

export interface ShotQaReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  executionId: string | null;
  shotId: string | null;
  shotSequence?: number;
  videoUrl?: string;
  onShotRepaired?: () => void;
}

export const ShotQaReviewModal: React.FC<ShotQaReviewModalProps> = ({
  isOpen,
  onClose,
  executionId,
  shotId,
  shotSequence,
  videoUrl,
  onShotRepaired
}) => {
  const [historyData, setHistoryData] = useState<ShotQaHistoryResponse | null>(null);
  const [selectedResult, setSelectedResult] = useState<VideoQAResult | null>(null);
  const [activeRepairPlan, setActiveRepairPlan] = useState<RepairPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApplyingRepair, setIsApplyingRepair] = useState<boolean>(false);
  const [isReevaluating, setIsReevaluating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQaData = async (execId: string, sId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await adDirectorClient.getShotQaHistory(execId, sId);
      setHistoryData(res);
      setSelectedResult(res.currentResult);
      setActiveRepairPlan(res.activeRepairPlan);
    } catch (err: any) {
      console.error('[ShotQaReviewModal] Failed to load QA history:', err);
      setError(err.message || 'Failed to load shot QA history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && executionId && shotId) {
      fetchQaData(executionId, shotId);
    }
  }, [isOpen, executionId, shotId]);

  if (!isOpen || !executionId || !shotId) return null;

  const handleApplyRepair = async () => {
    if (!activeRepairPlan) return;
    setIsApplyingRepair(true);
    try {
      await adDirectorClient.approveRepairPlan(activeRepairPlan.id);
      await fetchQaData(executionId, shotId);
      if (onShotRepaired) onShotRepaired();
      alert('Surgical repair applied! Shot re-enqueued for regeneration.');
    } catch (err: any) {
      alert(`Failed to apply repair: ${err.message}`);
    } finally {
      setIsApplyingRepair(false);
    }
  };

  const handleReevaluate = async () => {
    setIsReevaluating(true);
    try {
      await adDirectorClient.evaluateShotQa(executionId, shotId, { forceReevaluate: true });
      await fetchQaData(executionId, shotId);
    } catch (err: any) {
      alert(`Re-evaluation failed: ${err.message}`);
    } finally {
      setIsReevaluating(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> QA PASSED
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> QA FAILED
          </span>
        );
      case 'review_required':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> REVIEW REQUIRED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-700/50 text-zinc-300 border border-zinc-600">
            <Clock className="w-3.5 h-3.5" /> PENDING QA
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Shot {shotSequence ?? shotId.replace('shot_', '')} QA Review
                </h2>
                {getStatusBadge(selectedResult?.overallResult || selectedResult?.status)}
              </div>
              <p className="text-xs text-zinc-400">
                Plan-vs-Result evaluation against frozen Execution Snapshot
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReevaluate}
              disabled={isReevaluating || isLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition flex items-center gap-1.5"
            >
              <RotateCcw className={cn("w-3.5 h-3.5", isReevaluating && "animate-spin")} />
              <span>Re-evaluate</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-400 space-y-3">
              <RotateCcw className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-sm">Evaluating Plan vs Result dimensions...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          ) : (
            <>
              {/* Media & Attempt Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Video Preview */}
                <div className="md:col-span-1 rounded-xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center min-h-[160px] relative group">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full object-contain max-h-[180px]"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-500 gap-2">
                      <Film className="w-8 h-8 text-zinc-600" />
                      <span className="text-xs">No video stream available</span>
                    </div>
                  )}
                </div>

                {/* Attempt & High-Level Metrics */}
                <div className="md:col-span-2 flex flex-col justify-between p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Generation Attempt
                      </span>
                      <span className="text-xs font-bold text-indigo-400">
                        Attempt {selectedResult?.attemptNumber || 1} of 3
                      </span>
                    </div>
                    <div className="text-sm font-medium text-zinc-200">
                      Evaluator Version: <span className="text-zinc-400 font-mono text-xs">{selectedResult?.evaluatorVersion || 'v1.0'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800/80 text-center">
                    <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800/60">
                      <div className="text-xs text-zinc-400">Technical</div>
                      <div className="text-sm font-semibold text-emerald-400">
                        {selectedResult?.technicalChecks.filter(c => c.result === 'PASS').length || 0} / {selectedResult?.technicalChecks.length || 0}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800/60">
                      <div className="text-xs text-zinc-400">Creative</div>
                      <div className="text-sm font-semibold text-indigo-400">
                        {selectedResult?.creativeChecks.filter(c => c.result === 'PASS').length || 0} / {selectedResult?.creativeChecks.length || 0}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800/60">
                      <div className="text-xs text-zinc-400">Failures</div>
                      <div className={cn("text-sm font-semibold", (selectedResult?.failures?.length || 0) > 0 ? "text-rose-400" : "text-zinc-400")}>
                        {selectedResult?.failures?.length || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Failures & Diagnosis */}
              {selectedResult?.failures && selectedResult.failures.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Detected Plan vs Result Deviations
                  </h3>
                  <div className="space-y-2">
                    {selectedResult.failures.map(fail => (
                      <div
                        key={fail.checkId}
                        className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300">
                            {fail.category}
                          </span>
                          <span className="text-xs text-rose-400/80 font-medium">
                            Severity: {fail.severity}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                              Approved Requirement
                            </span>
                            <p className="text-zinc-200 text-xs">{fail.requirement}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                              Observed in Output
                            </span>
                            <p className="text-rose-300 text-xs font-medium">{fail.observed}</p>
                          </div>
                        </div>
                        {fail.suggestedRepair && (
                          <div className="text-xs text-indigo-300/90 pt-1 flex items-center gap-1">
                            <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Suggested fix: {fail.suggestedRepair}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Surgical Repair Plan Card */}
              {activeRepairPlan && (
                <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-950 border border-indigo-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-sm font-bold text-white tracking-wide">
                        Surgical Repair Plan
                      </h3>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                      activeRepairPlan.approvalLevel === 'AUTO_SAFE'
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}>
                      {activeRepairPlan.approvalLevel === 'AUTO_SAFE' ? 'AUTO-SAFE REPAIR' : 'REQUIRES USER APPROVAL'}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {activeRepairPlan.reason}
                  </p>

                  {/* Explicit Preserved State */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-zinc-300">Preserved Attributes (Zero Drift):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeRepairPlan.preservedState.map(attr => (
                        <span
                          key={attr}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60"
                        >
                          ✓ {attr}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80">
                    <span className="text-xs text-zinc-400">
                      {activeRepairPlan.status === 'applied' ? 'Repair has already been applied.' : 'Applies targeted patch and re-enqueues shot.'}
                    </span>
                    <button
                      onClick={handleApplyRepair}
                      disabled={isApplyingRepair || activeRepairPlan.status === 'applied'}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg",
                        activeRepairPlan.status === 'applied'
                          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
                      )}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{activeRepairPlan.status === 'applied' ? 'Repair Applied' : 'Apply Repair & Regenerate Shot'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Full Checks Accordion/List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Full Dimension Breakdown ({selectedResult?.creativeChecks.length || 0} Checks)
                </h3>
                <div className="space-y-1.5">
                  {selectedResult?.creativeChecks.map(check => (
                    <div
                      key={check.checkId}
                      className="px-3.5 py-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {check.result === 'PASS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : check.result === 'FAIL' ? (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="font-semibold text-zinc-300 capitalize">{check.category}:</span>
                        <span className="text-zinc-400 truncate max-w-md">{check.requirement}</span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        check.result === 'PASS' && "bg-emerald-500/10 text-emerald-400",
                        check.result === 'FAIL' && "bg-rose-500/10 text-rose-400",
                        check.result === 'INCONCLUSIVE' && "bg-amber-500/10 text-amber-400"
                      )}>
                        {check.result}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/90 text-xs text-zinc-400">
          <span>Targeted Shot QA Review — Writopedia Video Gem</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
};
