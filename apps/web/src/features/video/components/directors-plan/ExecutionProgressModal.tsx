import React, { useState, useEffect, useRef } from 'react';
import type { ExecutionStatusResponse, ShotJobDetail } from '@contracts/executionQueueContracts.js';
import { adDirectorClient } from '../../services/adDirectorClient.js';
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Ban,
  Film,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { cn } from '@web/lib/utils.js';
import { ShotQaReviewModal } from './ShotQaReviewModal.js';
import { FinalAssemblyModal } from './FinalAssemblyModal.js';

export interface ExecutionProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  executionId: string | null;
  projectId?: string;
  onExecutionCompleted?: (status: ExecutionStatusResponse) => void;
}

export const ExecutionProgressModal: React.FC<ExecutionProgressModalProps> = ({
  isOpen,
  onClose,
  executionId,
  projectId,
  onExecutionCompleted
}) => {
  const [statusData, setStatusData] = useState<ExecutionStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingShotId, setRetryingShotId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [activePreviewShot, setActivePreviewShot] = useState<ShotJobDetail | null>(null);
  const [reviewingShotQa, setReviewingShotQa] = useState<ShotJobDetail | null>(null);
  const [isAssemblyOpen, setIsAssemblyOpen] = useState<boolean>(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async (id: string) => {
    try {
      const data = await adDirectorClient.getExecutionStatus(id);
      setStatusData(data);
      setError(null);

      if (data.status === 'completed' && onExecutionCompleted) {
        onExecutionCompleted(data);
      }
    } catch (err: any) {
      console.error('[ExecutionProgressModal] Status fetch failed:', err);
      setError(err.message || 'Failed to fetch execution status');
    } finally {
      setIsLoading(false);
    }
  };

  // Setup polling while active
  useEffect(() => {
    if (!isOpen || !executionId) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    setIsLoading(true);
    fetchStatus(executionId);

    pollTimerRef.current = setInterval(() => {
      fetchStatus(executionId);
    }, 2500);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isOpen, executionId]);

  // Stop polling if execution terminal
  useEffect(() => {
    if (statusData && ['completed', 'failed', 'cancelled', 'partial_failure'].includes(statusData.status)) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [statusData?.status]);

  if (!isOpen || !executionId) return null;

  const handleRetryShot = async (shotId: string) => {
    if (!executionId) return;
    setRetryingShotId(shotId);
    try {
      await adDirectorClient.retryShotExecution(executionId, shotId);
      await fetchStatus(executionId);
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetryingShotId(null);
    }
  };

  const handleCancelExecution = async () => {
    if (!executionId) return;
    if (!confirm('Are you sure you want to cancel remaining generation jobs? Unspent reserved credits will be released.')) {
      return;
    }
    setIsCancelling(true);
    try {
      await adDirectorClient.cancelExecution(executionId);
      await fetchStatus(executionId);
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={12} />
            Completed
          </span>
        );
      case 'processing':
      case 'submitting':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 animate-pulse">
            <RefreshCw size={12} className="animate-spin" />
            Generating
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle size={12} />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Ban size={12} />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock size={12} />
            Queued
          </span>
        );
    }
  };

  const isTerminal = statusData && ['completed', 'failed', 'cancelled', 'partial_failure'].includes(statusData.status);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-sm">
              <Film size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                  Video Production Execution
                </h3>
                {statusData && (
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    v{statusData.specVersion}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Execution ID: {executionId.slice(0, 16)}... · Model: {statusData?.targetModel || 'Loading...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isTerminal && (
              <button
                onClick={handleCancelExecution}
                disabled={isCancelling}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-sm border border-rose-200 dark:border-rose-900 transition-colors flex items-center gap-1.5"
              >
                <Ban size={13} />
                {isCancelling ? 'Cancelling...' : 'Cancel Execution'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status Bar & Overall Progress */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-500 dark:text-slate-400">Status:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                {statusData?.status.replace('_', ' ') || 'INITIALIZING'}
              </span>
            </div>
            <div className="font-mono text-slate-600 dark:text-slate-300 font-medium">
              {statusData?.completedShots || 0} / {statusData?.totalShots || 0} Shots Completed ({statusData?.progress || 0}%)
            </div>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                statusData?.status === 'completed'
                  ? 'bg-emerald-500'
                  : statusData?.status === 'partial_failure' || statusData?.status === 'failed'
                  ? 'bg-rose-500'
                  : 'bg-indigo-500'
              )}
              style={{ width: `${statusData?.progress || 5}%` }}
            />
          </div>

          {error && (
            <div className="mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-sm text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Shot Jobs List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading && !statusData ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <RefreshCw size={24} className="animate-spin text-indigo-500 mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Loading durable shot jobs from database...</p>
            </div>
          ) : (
            statusData?.shots.map((shot) => {
              const isRetrying = retryingShotId === shot.shotId;

              return (
                <div
                  key={shot.shotId}
                  className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm flex items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      {shot.sequence}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {shot.name}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">({shot.shotId})</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        <span>Attempt {shot.attemptCount}</span>
                        {shot.providerRequestId && (
                          <span className="text-slate-400 truncate max-w-[140px]">
                            req: {shot.providerRequestId.slice(0, 10)}...
                          </span>
                        )}
                        {shot.error && (
                          <span className="text-rose-500 dark:text-rose-400 truncate max-w-[200px]" title={shot.error.message}>
                            Err: {shot.error.message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {getStatusBadge(shot.status)}

                    {shot.status === 'completed' && shot.outputUrl && (
                      <>
                        <button
                          onClick={() => setReviewingShotQa(shot)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-sm border border-emerald-300 dark:border-emerald-800 transition-colors flex items-center gap-1"
                          title="Review Plan-vs-Result QA Evaluation"
                        >
                          <ShieldCheck size={11} />
                          QA Review
                        </button>
                        <button
                          onClick={() => setActivePreviewShot(shot)}
                          className="px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-sm border border-indigo-200 dark:border-indigo-900 transition-colors flex items-center gap-1"
                        >
                          <Play size={11} />
                          Preview
                        </button>
                      </>
                    )}

                    {shot.status === 'failed' && (
                      <button
                        onClick={() => handleRetryShot(shot.shotId)}
                        disabled={isRetrying}
                        className="px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-sm border border-amber-200 dark:border-amber-900 transition-colors flex items-center gap-1"
                      >
                        <RefreshCw size={11} className={cn(isRetrying && 'animate-spin')} />
                        {isRetrying ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Video Preview Drawer / Inline Player if selected */}
        {activePreviewShot && activePreviewShot.outputUrl && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-950 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-emerald-400 font-bold">Preview:</span>
                <span>{activePreviewShot.name} ({activePreviewShot.shotId})</span>
              </div>
              <button
                onClick={() => setActivePreviewShot(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Close Preview
              </button>
            </div>
            <div className="aspect-video max-h-56 bg-black rounded overflow-hidden flex items-center justify-center">
              <video
                src={activePreviewShot.outputUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Database-backed durable execution · Safe to refresh page</span>
          </div>

          <div className="flex items-center gap-3">
            {statusData?.status === 'completed' && (
              <button
                onClick={() => setIsAssemblyOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-sm transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles size={13} />
                Final Assembly & Export
                <ChevronRight size={13} />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-sm hover:opacity-90 transition-opacity"
            >
              {isTerminal ? 'Done' : 'Keep Running in Background'}
            </button>
          </div>
        </div>
      </div>

      {/* Phase 9: Shot QA Review Modal */}
      {reviewingShotQa && (
        <ShotQaReviewModal
          isOpen={Boolean(reviewingShotQa)}
          onClose={() => setReviewingShotQa(null)}
          executionId={executionId}
          shotId={reviewingShotQa.shotId}
          shotSequence={reviewingShotQa.sequence}
          videoUrl={reviewingShotQa.outputUrl}
          onShotRepaired={() => {
            if (executionId) fetchStatus(executionId);
          }}
        />
      )}

      {/* Phase 10: Final Assembly Modal */}
      {isAssemblyOpen && (
        <FinalAssemblyModal
          isOpen={isAssemblyOpen}
          onClose={() => setIsAssemblyOpen(false)}
          executionId={executionId}
          projectId={projectId}
        />
      )}
    </div>
  );
};
