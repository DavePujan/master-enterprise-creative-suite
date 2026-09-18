import React, { useState } from 'react';
import type { AdProjectExecutionPlan, CompiledShotExecutionPayload } from '@contracts/adSpecContracts.js';

interface CompiledPromptInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  executionPlan: AdProjectExecutionPlan | null;
  isLoading?: boolean;
}

export const CompiledPromptInspectorModal: React.FC<CompiledPromptInspectorModalProps> = ({
  isOpen,
  onClose,
  executionPlan,
  isLoading
}) => {
  const [activeShotIndex, setActiveShotIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'formatted' | 'adapter' | 'json'>('formatted');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentShot: CompiledShotExecutionPayload | undefined =
    executionPlan?.shots[activeShotIndex];

  const handleCopyPrompt = () => {
    if (currentShot) {
      navigator.clipboard.writeText(currentShot.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyPayloadJson = () => {
    if (executionPlan) {
      const payloadToCopy = viewMode === 'json' ? executionPlan : currentShot;
      navigator.clipboard.writeText(JSON.stringify(payloadToCopy, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">Compiled Model Execution Plan</h2>
                {executionPlan && (
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                    executionPlan.readiness === 'READY'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : executionPlan.readiness === 'WARNINGS'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {executionPlan.readiness}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Provider-specific machine payload synthesized from Canonical AdSpec v{executionPlan?.specVersion || 1}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('formatted')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'formatted'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Creative & Prompts
            </button>
            <button
              onClick={() => setViewMode('adapter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'adapter'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>Provider Adapter</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-200 font-mono">P7</span>
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                viewMode === 'json'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Raw JSON
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-sm">Compiling model-tuned prompts & resolving reference assets...</span>
          </div>
        ) : !executionPlan ? (
          <div className="p-12 text-center text-slate-400">No execution plan compiled.</div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Meta Bar */}
            <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center gap-4 text-slate-300">
                <span>Model: <strong className="text-slate-100">{executionPlan.targetModel}</strong></span>
                <span>Provider: <strong className="text-slate-100 uppercase">{executionPlan.targetProvider}</strong></span>
                <span>Duration: <strong className="text-slate-100">{executionPlan.totalDurationSeconds}s</strong></span>
                <span>Est. Credits: <strong className="text-indigo-400">{executionPlan.estimatedCreditCost}</strong></span>
              </div>
              <button
                onClick={handleCopyPayloadJson}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{copied ? 'Copied!' : 'Copy Machine JSON'}</span>
              </button>
            </div>

            {/* Incompatibility Alert Banner */}
            {executionPlan.blockers.length > 0 && (
              <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-200">
                  <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Pre-flight Generation Blockers ({executionPlan.blockers.length})</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  {executionPlan.blockers.map((b, idx) => (
                    <li key={idx}>
                      <span className="font-semibold text-rose-200">[{b.code}]</span> {b.message}
                      {b.actionSuggestion && <span className="text-rose-400/90 ml-1">Suggestion: {b.actionSuggestion}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Shot Tabs */}
            <div className="px-6 pt-4 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
              {executionPlan.shots.map((shot, idx) => {
                const isBlocked = executionPlan.blockers.some(b => b.shotId === shot.shotId);
                return (
                  <button
                    key={shot.shotId}
                    onClick={() => setActiveShotIndex(idx)}
                    className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
                      activeShotIndex === idx
                        ? 'border-indigo-500 bg-slate-800 text-slate-100'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <span>Shot {shot.sequence} ({shot.duration}s)</span>
                    {isBlocked && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                  </button>
                );
              })}
            </div>

            {/* Active Shot Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-5">
              {viewMode === 'json' ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                  <pre>{JSON.stringify(currentShot, null, 2)}</pre>
                </div>
              ) : viewMode === 'adapter' && currentShot ? (
                <div className="space-y-4">
                  {/* Provider Integration Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border font-mono font-bold text-xs uppercase ${
                        executionPlan.targetProvider === 'seedance'
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                          : executionPlan.targetProvider === 'fal'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      }`}>
                        {executionPlan.targetProvider}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-100">
                            {executionPlan.targetProvider === 'seedance'
                              ? 'ByteDance Seedance 2.0'
                              : executionPlan.targetProvider === 'fal'
                                ? 'Fal.ai Video Adapter'
                                : 'Google Veo GenAI Adapter'}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {executionPlan.targetModel}
                          </span>
                          {executionPlan.targetProvider === 'seedance' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/50 text-purple-200 border border-purple-700/50">
                              Via Fal.ai API: bytedance/seedance-2.0
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Provider boundary executes neutral <code className="text-indigo-300">ProviderExecutionRequest</code> with strict creative intent preservation.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Adapter Ready</span>
                      </span>
                    </div>
                  </div>

                  {/* Provider-Specific Reference Resolution Preview */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Canonical Reference Resolution
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {currentShot.references.length} reference(s) bound
                      </span>
                    </div>

                    {executionPlan.targetProvider === 'seedance' && (
                      <div className="space-y-2 text-xs font-mono">
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-purple-400 font-semibold block mb-1">Multimodal Reference Array (bytedance/seedance-2.0):</span>
                          {currentShot.references.length === 0 ? (
                            <span className="text-slate-500 italic">No reference images bound. Text-to-video mode.</span>
                          ) : (
                            <div className="space-y-1 text-slate-300">
                              {currentShot.references.map((ref, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-200">[{ref.role}] {ref.label}</span>
                                  <span className="text-slate-500 truncate max-w-[280px]">{ref.url}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {executionPlan.targetProvider === 'fal' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-amber-400 font-semibold block mb-1">image_url (First Frame):</span>
                          <span className="text-slate-300 truncate block text-[11px]">
                            {currentShot.references.find(r => r.role === 'first_frame')?.url || '(None - text-to-video)'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-amber-400 font-semibold block mb-1">tail_image_url (Last Frame):</span>
                          <span className="text-slate-300 truncate block text-[11px]">
                            {currentShot.references.find(r => r.role === 'last_frame')?.url || '(None - unconstrained exit)'}
                          </span>
                        </div>
                      </div>
                    )}

                    {executionPlan.targetProvider === 'google' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-blue-400 font-semibold block mb-1">Keyframe Image URI (Veo First-Frame):</span>
                          <span className="text-slate-300 truncate block text-[11px]">
                            {currentShot.references.find(r => r.role === 'first_frame')?.url || '(None - prompt conditioning only)'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-blue-400 font-semibold block mb-1">Subject Lookbook References:</span>
                          <span className="text-slate-300 block text-[11px]">
                            {currentShot.references.filter(r => r.role !== 'first_frame').length} entity reference(s)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Normalized Execution Request Machine Preview */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-slate-300 font-mono">
                        Normalized ProviderExecutionRequest Envelope
                      </span>
                      <button
                        onClick={() => {
                          const requestEnvelope = {
                            projectId: executionPlan.projectId,
                            shotId: currentShot.shotId,
                            sequence: currentShot.sequence,
                            provider: executionPlan.targetProvider,
                            model: executionPlan.targetModel,
                            prompt: currentShot.prompt,
                            negativePrompt: currentShot.negativePrompt,
                            duration: currentShot.duration,
                            aspectRatio: currentShot.aspectRatio,
                            resolution: currentShot.resolution,
                            references: currentShot.references,
                            settings: currentShot.settings,
                            workspaceId: 'workspace_active'
                          };
                          navigator.clipboard.writeText(JSON.stringify(requestEnvelope, null, 2));
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>{copied ? 'Copied' : 'Copy Adapter Request'}</span>
                      </button>
                    </div>

                    <pre className="p-3 rounded-lg bg-slate-900/90 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-56 leading-relaxed">
{JSON.stringify({
  shotId: currentShot.shotId,
  sequence: currentShot.sequence,
  provider: executionPlan.targetProvider,
  model: executionPlan.targetModel,
  duration: currentShot.duration,
  aspectRatio: currentShot.aspectRatio,
  resolution: currentShot.resolution,
  promptLength: currentShot.prompt.length,
  hasNegativePrompt: !!currentShot.negativePrompt,
  referenceCount: currentShot.references.length,
  settings: currentShot.settings
}, null, 2)}
                    </pre>
                  </div>

                  {/* Architecture & Intent Protection Invariants */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                      <span className="font-bold text-slate-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Intent Preservation
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Never silently alters creative decisions. Incompatible constraints return <code className="text-amber-300">UNSUPPORTED_CONFIGURATION</code> instead of degrading silently.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                      <span className="font-bold text-slate-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Error Normalization
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Vendor faults normalized into standard codes with retryability classification and exponential backoff windows.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                      <span className="font-bold text-slate-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        Zero Secret Leakage
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        API keys (Fal, Google, Bearer tokens) are scrubbed from all adapter logs and telemetry before persisting or reporting.
                      </p>
                    </div>
                  </div>
                </div>
              ) : currentShot ? (
                <>
                  {/* Human vs Machine Prompt Split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Human Director Prompt */}
                    <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Director's Creative Intent</span>
                        <p className="mt-2 text-sm text-slate-200 font-medium leading-relaxed">
                          {currentShot.directorPrompt.humanReadableExplanation}
                        </p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">Narrative Role:</span> {currentShot.directorPrompt.creativeIntent}
                      </div>
                    </div>

                    {/* Model Settings Pillbox */}
                    <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Model Execution Parameters</span>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Aspect Ratio</span>
                          <span className="text-slate-200 font-semibold">{currentShot.aspectRatio}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Resolution</span>
                          <span className="text-slate-200 font-semibold">{currentShot.resolution}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Duration</span>
                          <span className="text-slate-200 font-semibold">{currentShot.duration} seconds</span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Camera Motion</span>
                          <span className="text-slate-200 font-semibold truncate">{currentShot.settings.cameraMotion || 'automatic'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Machine Synthesized Prompt */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 relative group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                          Synthesized Model Prompt ({executionPlan.targetModel})
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {currentShot.prompt.length} chars
                        </span>
                      </div>
                      <button
                        onClick={handleCopyPrompt}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
                      </button>
                    </div>
                    <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {currentShot.prompt}
                    </pre>
                  </div>

                  {/* Negative Prompt */}
                  {currentShot.negativePrompt && (
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                        Negative Prompt (Artifact Rejection & Constraints)
                      </span>
                      <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                        {currentShot.negativePrompt}
                      </p>
                    </div>
                  )}

                  {/* Resolved Reference Assets */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                      Resolved Reference Bindings ({currentShot.references.length})
                    </span>
                    {currentShot.references.length === 0 ? (
                      <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-800 text-xs text-slate-400 italic">
                        No reference asset conditioning bound to this shot.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {currentShot.references.map((ref, rIdx) => (
                          <div key={rIdx} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/80 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
                              {ref.role.slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0 text-xs">
                              <span className="font-semibold text-slate-200 truncate block">{ref.label}</span>
                              <span className="text-[10px] text-indigo-400 font-mono uppercase block">{ref.role}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
