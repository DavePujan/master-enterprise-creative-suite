import React, { useState, useEffect, useRef } from 'react';
import type {
  AssemblySpec,
  AssemblyValidationReport,
  RenderJobRecord,
  ExportVariantRecord,
  CreateAssemblyResponse,
  AssemblyRenderStatusResponse,
  ExportPreset
} from '@contracts/videoAssemblyContracts.js';
import { adDirectorClient } from '../../services/adDirectorClient.js';
import {
  X,
  Play,
  Film,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Download,
  Layers,
  Music,
  Mic,
  Image as ImageIcon,
  Tag,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { cn } from '@web/lib/utils.js';

export interface FinalAssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  executionId: string;
  projectId?: string;
}

export const FinalAssemblyModal: React.FC<FinalAssemblyModalProps> = ({
  isOpen,
  onClose,
  executionId,
  projectId
}) => {
  const [assemblyData, setAssemblyData] = useState<CreateAssemblyResponse | null>(null);
  const [renderJob, setRenderJob] = useState<RenderJobRecord | null>(null);
  const [exportVariants, setExportVariants] = useState<ExportVariantRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isRequestingVariant, setIsRequestingVariant] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadAssembly = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await adDirectorClient.createOrGetAssembly(executionId);
      setAssemblyData(resp);
      if (resp.activeRenderJob) {
        setRenderJob(resp.activeRenderJob);
      }
      if (resp.assembly) {
        await loadVariants(resp.assembly.id);
      }
    } catch (err: any) {
      console.error('[FinalAssemblyModal] Failed to load assembly:', err);
      setError(err.message || 'Failed to initialize assembly');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVariants = async (assemblyId: string) => {
    try {
      const resp = await adDirectorClient.getAssemblyExports(assemblyId);
      setExportVariants(resp.variants);
    } catch (err) {
      console.warn('[FinalAssemblyModal] Failed to load export variants:', err);
    }
  };

  const fetchStatus = async (assemblyId: string) => {
    try {
      const resp = await adDirectorClient.getAssemblyRenderStatus(assemblyId);
      setRenderJob(resp.job);
      setExportVariants(resp.variants);

      // Stop polling if completed or failed
      if (resp.job && ['completed', 'failed', 'cancelled'].includes(resp.job.status)) {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    } catch (err: any) {
      console.error('[FinalAssemblyModal] Status check failed:', err);
    }
  };

  // Initial load
  useEffect(() => {
    if (isOpen && executionId) {
      loadAssembly();
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isOpen, executionId]);

  // Start polling if a job is in progress
  useEffect(() => {
    if (renderJob && ['queued', 'claimed', 'rendering', 'validating'].includes(renderJob.status)) {
      if (!pollTimerRef.current && assemblyData?.assembly) {
        const aId = assemblyData.assembly.id;
        pollTimerRef.current = setInterval(() => {
          fetchStatus(aId);
        }, 2500);
      }
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [renderJob?.status, assemblyData?.assembly?.id]);

  if (!isOpen) return null;

  const spec = assemblyData?.assembly?.spec;
  const validation = assemblyData?.validation;

  const handleStartRender = async () => {
    if (!assemblyData?.assembly) return;
    setIsRendering(true);
    setError(null);
    try {
      const resp = await adDirectorClient.enqueueRender(assemblyData.assembly.id);
      setRenderJob(resp.job);
    } catch (err: any) {
      console.error('[FinalAssemblyModal] Enqueue render failed:', err);
      setError(err.message || 'Failed to start master render');
    } finally {
      setIsRendering(false);
    }
  };

  const handleCancelRender = async () => {
    if (!assemblyData?.assembly) return;
    if (!confirm('Cancel active assembly render?')) return;
    try {
      await adDirectorClient.cancelRender(assemblyData.assembly.id);
      await fetchStatus(assemblyData.assembly.id);
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    }
  };

  const handleRequestVariant = async (preset: ExportPreset) => {
    if (!assemblyData?.assembly) return;
    setIsRequestingVariant(preset);
    try {
      const variant = await adDirectorClient.requestExportVariant(assemblyData.assembly.id, {
        preset
      });
      setExportVariants((prev) => [...prev.filter((v) => v.preset !== preset), variant]);
    } catch (err: any) {
      alert(`Failed to request export variant: ${err.message}`);
    } finally {
      setIsRequestingVariant(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins > 0 ? `${mins}m ` : ''}${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm">
              10
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Final Assembly & Master Export
                </h2>
                {assemblyData?.assembly && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    v{assemblyData.assembly.version} · #{assemblyData.assembly.assemblyHash.slice(0, 8)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Composition, audio ducking, brand watermarks, master rendering & social delivery
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <RefreshCw size={24} className="animate-spin text-slate-500" />
              <p className="text-sm font-mono">Building Assembly Specification from Accepted Shots...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-sm text-red-700 dark:text-red-400 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Assembly Initialization Error</p>
                <p className="text-xs mt-1 font-mono">{error}</p>
                <button
                  onClick={loadAssembly}
                  className="mt-3 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-semibold rounded-sm hover:bg-red-200 transition-colors"
                >
                  Retry Initialization
                </button>
              </div>
            </div>
          ) : spec && validation ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Timeline & Audio & Brand (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Shots & Timing Timeline */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                      <Film size={13} />
                      Ordered Shot Timeline ({spec.shots.length} Approved Shots)
                    </h3>
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                      Total: {formatDuration(spec.timing.totalTargetDuration)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {spec.shots.map((shot, idx) => (
                      <div
                        key={shot.shotId}
                        className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono font-bold text-[10px]">
                            {shot.order}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{shot.shotName || shot.shotId}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({shot.playbackDuration.toFixed(1)}s)
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                              <span>Attempt: #{shot.acceptedAttemptId.slice(0, 8)}</span>
                              <span>·</span>
                              <span>Trim: {shot.trimStart.toFixed(1)}s - {shot.trimEnd.toFixed(1)}s</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          {idx < spec.shots.length - 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">
                              {spec.transitions[idx]?.type || 'CUT'}
                            </span>
                          )}
                          <CheckCircle2 size={13} className="text-emerald-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audio Architecture */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mb-3 font-mono">
                    <Music size={13} />
                    Audio Layers & Ducking Matrix
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Voiceover */}
                    <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <Mic size={12} className="text-indigo-500" /> Voiceover
                        </span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-mono font-medium",
                          spec.audio.voiceover?.enabled ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        )}>
                          {spec.audio.voiceover?.enabled ? 'ACTIVE' : 'NONE'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Vol: {spec.audio.voiceover?.volume ?? 1.0} · Ducking: Active
                      </p>
                    </div>

                    {/* Music */}
                    <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <Music size={12} className="text-pink-500" /> Background Music
                        </span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-mono font-medium",
                          spec.audio.music?.enabled ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        )}>
                          {spec.audio.music?.enabled ? 'ACTIVE' : 'NONE'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Vol: {spec.audio.music?.volume ?? 0.35} · Fade: {spec.audio.music?.fadeOutDuration ?? 2}s
                      </p>
                    </div>

                    {/* Original Shot Audio */}
                    <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                        Original Audio Mode
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                        {spec.audio.originalShotAudio.toUpperCase()}
                      </span>
                    </div>

                    {/* Sound Effects */}
                    <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                        Sound Effects (SFX)
                      </span>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {spec.audio.soundEffects.length} cues specified
                      </p>
                    </div>
                  </div>
                </div>

                {/* Brand & Overlays */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mb-3 font-mono">
                    <Tag size={13} />
                    Brand Finishing & Overlays
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold flex items-center gap-1 text-slate-800 dark:text-slate-200">
                          <ImageIcon size={12} /> Logo Watermark
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {spec.logo?.enabled ? `${spec.logo.position}` : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {spec.logo?.enabled ? `Opacity: ${spec.logo.opacity}` : 'No logo configured'}
                      </p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Call To Action (CTA)
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {spec.cta?.enabled ? `${spec.cta.duration}s End-Card` : 'None'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {spec.cta?.enabled ? spec.cta.headline : 'No end card'}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Pre-flight Verification & Render & Player (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                
                {/* Pre-flight Validation Checklist */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                      <ShieldCheck size={13} />
                      Pre-flight Validation
                    </h3>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded font-mono font-bold",
                      validation.isValid
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"
                    )}>
                      {validation.isValid ? 'PASSED (11/11)' : 'BLOCKED'}
                    </span>
                  </div>

                  {!validation.isValid && validation.errors.length > 0 && (
                    <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded text-xs text-red-700 dark:text-red-300 space-y-1">
                      {validation.errors.map((e, i) => (
                        <p key={i} className="flex items-start gap-1 font-mono text-[11px]">
                          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                          <span>{e.message}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Dimensions:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {spec.output.width} × {spec.output.height} ({spec.output.aspectRatio})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>FPS / Codec:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {spec.output.fps}fps · {spec.output.videoCodec.toUpperCase()} / {spec.output.audioCodec.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Target Duration:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {spec.timing.totalTargetDuration}s (Calculated: {spec.timing.calculatedDuration.toFixed(1)}s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Master Render Status & Controls */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4 bg-white dark:bg-slate-950">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mb-3 font-mono">
                    <Film size={13} />
                    Master Render Pipeline
                  </h3>

                  {!renderJob ? (
                    <div className="text-center py-4 space-y-3">
                      <p className="text-xs text-slate-500">
                        The assembly specification is frozen. Launch the background Railway media pipeline to render the master video.
                      </p>
                      <button
                        onClick={handleStartRender}
                        disabled={!validation.isValid || isRendering}
                        className={cn(
                          "w-full py-2.5 px-4 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2",
                          validation.isValid && !isRendering
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-sm"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                        )}
                      >
                        {isRendering ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            Dispatching Worker Job...
                          </>
                        ) : (
                          <>
                            <Play size={13} />
                            Render Final Master
                          </>
                        )}
                      </button>
                    </div>
                  ) : renderJob.status === 'completed' && renderJob.outputUrl ? (
                    <div className="space-y-3">
                      {/* Master Video Preview Player */}
                      <div className="aspect-[9/16] max-h-64 bg-black rounded overflow-hidden flex items-center justify-center mx-auto border border-slate-800">
                        <video
                          src={renderJob.outputUrl}
                          controls
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded text-xs text-emerald-800 dark:text-emerald-300 font-mono space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          Master Validated & Persisted
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          Duration: {renderJob.metadata?.durationSeconds?.toFixed(1) || spec.timing.totalTargetDuration}s · Size: {renderJob.metadata?.fileSizeBytes ? `${(renderJob.metadata.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB` : 'Validated'}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={renderJob.outputUrl}
                          download={`ad-master-${assemblyData.assembly.id.slice(0, 8)}.mp4`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2 px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded text-xs font-bold text-center hover:opacity-90 flex items-center justify-center gap-1.5"
                        >
                          <Download size={13} />
                          Download Master MP4
                        </a>
                      </div>
                    </div>
                  ) : renderJob.status === 'failed' ? (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-400 font-mono">
                        <AlertCircle size={14} />
                        Render Failed
                      </div>
                      <p className="text-[11px] font-mono text-red-600 dark:text-red-300">
                        {renderJob.errorMessage || 'An error occurred during FFmpeg media composition.'}
                      </p>
                      <button
                        onClick={handleStartRender}
                        disabled={isRendering}
                        className="px-3 py-1.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-bold rounded hover:bg-red-200 flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} className={cn(isRendering && 'animate-spin')} />
                        Retry Master Render
                      </button>
                    </div>
                  ) : (
                    /* Active Render in Progress */
                    <div className="space-y-3 py-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize flex items-center gap-2">
                          <RefreshCw size={13} className="animate-spin text-indigo-500" />
                          {renderJob.step || renderJob.status}...
                        </span>
                        <span className="text-slate-500">{renderJob.progressPercent}%</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full transition-all duration-300"
                          style={{ width: `${Math.max(renderJob.progressPercent, 5)}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-500 font-mono">
                        Durable Railway worker execution. Safe to navigate away or close window.
                      </p>

                      <button
                        onClick={handleCancelRender}
                        className="text-xs text-red-600 hover:text-red-700 font-mono underline"
                      >
                        Cancel Render Job
                      </button>
                    </div>
                  )}
                </div>

                {/* Social Export Variants Section */}
                {renderJob?.status === 'completed' && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-md p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                      <Layers size={13} />
                      Social Export Variants
                    </h3>

                    <div className="space-y-2">
                      {(['vertical_720p', 'square_1_1', 'landscape_16_9'] as ExportPreset[]).map((preset) => {
                        const existing = exportVariants.find((v) => v.preset === preset);
                        const isGenerating = isRequestingVariant === preset;

                        return (
                          <div
                            key={preset}
                            className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded flex items-center justify-between text-xs"
                          >
                            <div className="font-mono">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                {preset === 'vertical_720p' && 'Vertical 720p (720×1280)'}
                                {preset === 'square_1_1' && 'Square 1:1 (1080×1080)'}
                                {preset === 'landscape_16_9' && 'Landscape 16:9 (1920×1080)'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {existing ? `Status: ${existing.status}` : 'Derived from master'}
                              </span>
                            </div>

                            {existing?.status === 'completed' && existing.outputUrl ? (
                              <a
                                href={existing.outputUrl}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] rounded hover:bg-emerald-200 flex items-center gap-1"
                              >
                                <Download size={11} />
                                Download
                              </a>
                            ) : (
                              <button
                                onClick={() => handleRequestVariant(preset)}
                                disabled={isGenerating}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] rounded hover:bg-slate-200 flex items-center gap-1"
                              >
                                {isGenerating ? (
                                  <RefreshCw size={11} className="animate-spin" />
                                ) : (
                                  <Sparkles size={11} />
                                )}
                                Generate
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Strict Lineage: Execution #{executionId.slice(0, 8)} · Zero Client Render</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
