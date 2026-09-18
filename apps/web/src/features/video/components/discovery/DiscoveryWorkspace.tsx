import React, { useState, useEffect } from 'react';
import { adDirectorClient } from '../../services/adDirectorClient.js';
import type {
  DiscoveryState,
  DiscoveryQuestion,
  AdBrief,
  DiscoveryContradiction
} from '@contracts/adSpecContracts.js';

interface DiscoveryWorkspaceProps {
  projectId: string;
  workspaceId: string;
  onBriefConfirmed?: (confirmedBrief: AdBrief, versionNumber: number) => void;
}

export const DiscoveryWorkspace: React.FC<DiscoveryWorkspaceProps> = ({
  projectId,
  workspaceId,
  onBriefConfirmed
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [submittingAnswers, setSubmittingAnswers] = useState<boolean>(false);
  const [confirmingBrief, setConfirmingBrief] = useState<boolean>(false);
  const [editingBrief, setEditingBrief] = useState<boolean>(false);
  const [briefOverrides, setBriefOverrides] = useState<Partial<AdBrief>>({});

  // 1. Recover discovery state on mount / refresh from backend persistence
  useEffect(() => {
    async function loadState() {
      setLoading(true);
      setError(null);
      try {
        const res = await adDirectorClient.getDiscoveryState(projectId);
        setDiscoveryState(res.discovery);
        if (res.discovery.brief) {
          setBriefOverrides(res.discovery.brief);
        }
      } catch (err: any) {
        // Not found is normal before initial prompt is submitted
        if (!err.message?.includes('not found') && err.status !== 404) {
          console.error('[DiscoveryWorkspace] Error recovering discovery session:', err);
        }
      } finally {
        setLoading(false);
      }
    }
    loadState();
  }, [projectId]);

  // 2. Submit initial prompt
  const handleStartDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialPrompt.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await adDirectorClient.initDiscovery(projectId, initialPrompt.trim());
      setDiscoveryState(res.discovery);
      setBriefOverrides(res.discovery.brief);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze initial request');
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit answers to active questions
  const handleSubmitAnswers = async () => {
    if (!discoveryState) return;

    const pendingQuestions = discoveryState.questions.filter(q => q.status === 'PENDING').slice(0, 3);
    const answersToSubmit: Array<{ questionId: string; answer: string }> = [];

    for (const q of pendingQuestions) {
      const selected = selectedAnswers[q.id];
      const custom = customAnswers[q.id];
      const finalAnswer = selected === 'OTHER' ? custom : selected || custom;

      if (finalAnswer && finalAnswer.trim()) {
        answersToSubmit.push({
          questionId: q.id,
          answer: finalAnswer.trim()
        });
      }
    }

    if (answersToSubmit.length === 0) {
      setError('Please provide an answer to at least one question to continue.');
      return;
    }

    setSubmittingAnswers(true);
    setError(null);
    try {
      const res = await adDirectorClient.answerDiscovery(projectId, answersToSubmit);
      setDiscoveryState(res.discovery);
      setBriefOverrides(res.discovery.brief);
      setSelectedAnswers({});
      setCustomAnswers({});
    } catch (err: any) {
      setError(err.message || 'Failed to submit answers');
    } finally {
      setSubmittingAnswers(false);
    }
  };

  // 4. Confirm Brief and Advance Project
  const handleConfirmBrief = async () => {
    setConfirmingBrief(true);
    setError(null);
    try {
      const res = await adDirectorClient.confirmBrief(projectId, briefOverrides);
      if (res.success && onBriefConfirmed) {
        onBriefConfirmed(res.brief, res.versionNumber);
      }
      // Reload state
      const updated = await adDirectorClient.getDiscoveryState(projectId);
      setDiscoveryState(updated.discovery);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm brief');
    } finally {
      setConfirmingBrief(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3"></div>
        <span>Recovering advertising discovery state...</span>
      </div>
    );
  }

  // View A: Initial Prompt Input Screen
  if (!discoveryState || (!discoveryState.brief?.product && discoveryState.questions.length === 0 && !discoveryState.isBriefConfirmed)) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl">
          <div className="mb-6">
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">
              Phase 2: Advertising Discovery
            </span>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">
              AI Advertising Director
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Describe the advertisement you are trying to create in your own words. We will analyze what is already clear and ask only what is genuinely needed to build the commercial brief.
            </p>
          </div>

          <form onSubmit={handleStartDiscovery} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                What are you trying to create?
              </label>
              <textarea
                value={initialPrompt}
                onChange={(e) => setInitialPrompt(e.target.value)}
                placeholder="Example: Create a 15-second Instagram Reel ad for my organic cold-brew coffee brand. We want young professionals to try their first bottle with free shipping."
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-base"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
              >
                Analyze & Start Discovery
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const brief = discoveryState.brief;
  const isReadyForCreative = discoveryState.status === 'READY_FOR_CREATIVE' || discoveryState.isBriefConfirmed;
  const pendingQuestions = discoveryState.questions.filter(q => q.status === 'PENDING').slice(0, 3);

  // Foundations Checklist Data
  const foundations = [
    { label: 'Product / Offering', ready: Boolean(brief.product && brief.product !== 'Default Product' && brief.product !== 'Commercial Product') },
    { label: 'Target Audience', ready: Boolean(brief.targetAudience) },
    { label: 'Primary Objective', ready: Boolean(brief.objective) },
    { label: 'Platform & Format', ready: Boolean(brief.platform && brief.desiredDurationSeconds) },
    { label: 'Call to Action', ready: Boolean(brief.cta) },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Top Header & Meaningful Foundations Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">
              Commercial Discovery
            </span>
            <h2 className="text-xl font-bold text-slate-100">
              {brief.product || 'New Advertising Project'}
            </h2>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              discoveryState.isBriefConfirmed
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : isReadyForCreative
                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                : discoveryState.status === 'BLOCKED'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {discoveryState.isBriefConfirmed
              ? 'Brief Confirmed (Locked)'
              : isReadyForCreative
              ? 'Ready for Creative Direction'
              : discoveryState.status === 'BLOCKED'
              ? 'Contradiction Detected'
              : 'Discovery In Progress'}
          </span>
        </div>

        {/* Foundations progress indicators */}
        <div>
          <span className="text-xs font-medium text-slate-400 block mb-2">
            Brief Foundations:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {foundations.map((f, idx) => (
              <div
                key={idx}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-xs font-medium ${
                  f.ready
                    ? 'bg-slate-950 border-emerald-900/60 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                <span>{f.ready ? '✓' : '○'}</span>
                <span className="truncate">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contradiction Banner if any */}
      {discoveryState.contradictions.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-5 text-amber-200">
          <div className="flex items-center space-x-2 mb-2 font-semibold">
            <span>⚠️ Conflicting Requirements Detected</span>
          </div>
          {discoveryState.contradictions.map((c, i) => (
            <div key={i} className="text-sm space-y-1 mt-2">
              <p className="text-amber-300">{c.explanation}</p>
              <p className="text-xs text-amber-400/80 font-mono">
                Clarification question: {c.resolutionQuestion}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* View B: Active Strategic Questions (1-3 questions) */}
      {!discoveryState.isBriefConfirmed && pendingQuestions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-200">
              Strategic Clarifications Needed ({pendingQuestions.length})
            </h3>
            <span className="text-xs text-slate-400">
              Questions focus only on material creative impact
            </span>
          </div>

          {pendingQuestions.map((q) => {
            const selectedVal = selectedAnswers[q.id];
            const customVal = customAnswers[q.id] || '';

            return (
              <div
                key={q.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                      {q.field} • {q.priority}
                    </span>
                    <h4 className="text-lg font-medium text-slate-100 mt-1">
                      {q.question}
                    </h4>
                  </div>
                  {q.required && (
                    <span className="text-xs text-amber-400/80 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                      Essential
                    </span>
                  )}
                </div>

                {/* Multiple choice options */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {q.options.map((opt) => {
                      const isSelected = selectedVal === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt.value }));
                          }}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'bg-indigo-950/60 border-indigo-500 text-slate-100'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="font-medium text-sm">{opt.label}</div>
                          {opt.description && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {opt.description}
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {q.allowCustom && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAnswers((prev) => ({ ...prev, [q.id]: 'OTHER' }));
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedVal === 'OTHER'
                            ? 'bg-indigo-950/60 border-indigo-500 text-slate-100'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-medium text-sm">Something else...</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Specify a custom requirement
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {/* Free-text input fallback */}
                {(q.inputType === 'text' || q.inputType === 'textarea' || selectedVal === 'OTHER' || !q.options) && (
                  <div className="pt-2">
                    <input
                      type="text"
                      value={customVal}
                      onChange={(e) => {
                        setCustomAnswers((prev) => ({ ...prev, [q.id]: e.target.value }));
                      }}
                      placeholder="Type your answer naturally..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Why We're Asking Callout */}
                <div className="bg-slate-950/70 border border-slate-800/60 rounded-lg p-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 mr-1.5">
                    Why we're asking:
                  </span>
                  {q.reason}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={submittingAnswers}
              onClick={handleSubmitAnswers}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
            >
              {submittingAnswers ? 'Evaluating Answers...' : 'Submit Answers & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* View C: Structured Ad Brief Review Card (When ready or confirmed) */}
      {(isReadyForCreative || discoveryState.isBriefConfirmed) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">
                Validated Commercial Brief
              </span>
              <h3 className="text-xl font-bold text-slate-100 mt-0.5">
                Review Structured Ad Brief
              </h3>
            </div>
            {!discoveryState.isBriefConfirmed && (
              <button
                type="button"
                onClick={() => setEditingBrief(!editingBrief)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                {editingBrief ? 'Cancel Edit' : 'Edit Brief'}
              </button>
            )}
          </div>

          {/* Structured Brief Display / Edit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-500 block uppercase font-mono">Product / Offering</span>
              {editingBrief ? (
                <input
                  type="text"
                  value={briefOverrides.product || ''}
                  onChange={(e) => setBriefOverrides({ ...briefOverrides, product: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 text-sm mt-1"
                />
              ) : (
                <span className="font-semibold text-slate-200 mt-1 block">{brief.product}</span>
              )}
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-500 block uppercase font-mono">Brand Reference</span>
              {editingBrief ? (
                <input
                  type="text"
                  value={briefOverrides.brandRef || ''}
                  onChange={(e) => setBriefOverrides({ ...briefOverrides, brandRef: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 text-sm mt-1"
                />
              ) : (
                <span className="font-semibold text-slate-200 mt-1 block">{brief.brandRef || 'Brand Default'}</span>
              )}
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-500 block uppercase font-mono">Primary Objective</span>
              {editingBrief ? (
                <input
                  type="text"
                  value={String(briefOverrides.objective || '')}
                  onChange={(e) => setBriefOverrides({ ...briefOverrides, objective: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 text-sm mt-1"
                />
              ) : (
                <span className="font-semibold text-slate-200 mt-1 block">{String(brief.objective || 'Not specified')}</span>
              )}
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-500 block uppercase font-mono">Platform & Duration</span>
              <span className="font-semibold text-slate-200 mt-1 block">
                {brief.platform} • {String(brief.desiredDurationSeconds)}s ({brief.aspectRatio})
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 sm:col-span-2">
              <span className="text-xs text-slate-500 block uppercase font-mono">Target Audience</span>
              <span className="font-semibold text-slate-200 mt-1 block">
                {typeof brief.targetAudience === 'object'
                  ? (brief.targetAudience as any)?.persona || JSON.stringify(brief.targetAudience)
                  : String(brief.targetAudience || 'General Audience')}
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 sm:col-span-2">
              <span className="text-xs text-slate-500 block uppercase font-mono">Call to Action (CTA)</span>
              {editingBrief ? (
                <input
                  type="text"
                  value={typeof briefOverrides.cta === 'object' ? (briefOverrides.cta as any)?.visualText || '' : String(briefOverrides.cta || '')}
                  onChange={(e) => setBriefOverrides({ ...briefOverrides, cta: { visualText: e.target.value, actionIntent: 'click_link' } })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 text-sm mt-1"
                />
              ) : (
                <span className="font-semibold text-slate-200 mt-1 block">
                  {typeof brief.cta === 'object' ? (brief.cta as any)?.visualText : String(brief.cta || 'Learn More')}
                </span>
              )}
            </div>

            {brief.tone && (
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 sm:col-span-2">
                <span className="text-xs text-slate-500 block uppercase font-mono">Tone & Style</span>
                <span className="font-semibold text-slate-200 mt-1 block">{String(brief.tone)}</span>
              </div>
            )}
          </div>

          {/* Action Button: Confirm Brief */}
          {!discoveryState.isBriefConfirmed ? (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-400">
                Confirming locks these decisions and prepares the AdSpec for creative direction.
              </p>
              <button
                type="button"
                disabled={confirmingBrief}
                onClick={handleConfirmBrief}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
              >
                {confirmingBrief ? 'Confirming Brief...' : 'Confirm Brief & Proceed'}
              </button>
            </div>
          ) : (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-lg text-emerald-300 text-sm flex items-center justify-between">
              <span>✓ Brief confirmed by user and locked into AdSpec version foundation.</span>
              <span className="text-xs text-emerald-400 font-mono">
                Confirmed: {new Date(discoveryState.confirmedAt || Date.now()).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
