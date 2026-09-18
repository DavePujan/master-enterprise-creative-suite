import React, { useState, useEffect } from 'react';
import { adDirectorClient } from '../../services/adDirectorClient.js';
import type {
  CreativeConcept,
  ConceptDiversityReport,
  AdSpec
} from '@contracts/adSpecContracts.js';

interface ConceptReviewWorkspaceProps {
  projectId: string;
  workspaceId: string;
  onConceptSelected?: (selectedConcept: CreativeConcept, updatedAdSpec: AdSpec) => void;
}

export const ConceptReviewWorkspace: React.FC<ConceptReviewWorkspaceProps> = ({
  projectId,
  workspaceId,
  onConceptSelected
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<CreativeConcept[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState<string | undefined>(undefined);
  const [briefVersion, setBriefVersion] = useState<number>(1);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [diversityReport, setDiversityReport] = useState<ConceptDiversityReport | null>(null);
  const [customRationale, setCustomRationale] = useState<Record<string, string>>({});

  // 1. Fetch concepts on mount
  const fetchConcepts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adDirectorClient.getConcepts(projectId);
      setConcepts(res.concepts);
      setSelectedConceptId(res.selectedConceptId);
      setBriefVersion(res.briefVersion);
      setIsStale(res.isStale);
    } catch (err: any) {
      // If none generated yet, keep concepts empty
      if (!err.message?.includes('not found') && err.status !== 404) {
        console.error('[ConceptReviewWorkspace] Error fetching concepts:', err);
        setError(err.message || 'Failed to load creative concepts');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConcepts();
  }, [projectId]);

  // 2. Generate concepts initial trigger
  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await adDirectorClient.generateConcepts(projectId, 3);
      setConcepts(res.concepts);
      setDiversityReport(res.diversity);
      setBriefVersion(res.briefVersion);
      setIsStale(false);
      const sel = res.concepts.find(c => c.conceptStatus === 'SELECTED');
      setSelectedConceptId(sel?.id);
    } catch (err: any) {
      console.error('[ConceptReviewWorkspace] Error generating concepts:', err);
      setError(err.message || 'Failed to generate creative concepts');
    } finally {
      setGenerating(false);
    }
  };

  // 3. Regenerate different directions
  const handleRegenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await adDirectorClient.regenerateConcepts(projectId, 3, undefined, true);
      setConcepts(res.concepts);
      setDiversityReport(res.diversity);
      setBriefVersion(res.briefVersion);
      setIsStale(false);
      setSelectedConceptId(undefined);
    } catch (err: any) {
      console.error('[ConceptReviewWorkspace] Error regenerating concepts:', err);
      setError(err.message || 'Failed to regenerate creative directions');
    } finally {
      setGenerating(false);
    }
  };

  // 4. User selects a direction
  const handleSelect = async (conceptId: string) => {
    setSelectingId(conceptId);
    setError(null);
    try {
      const rationale = customRationale[conceptId];
      const res = await adDirectorClient.selectConcept(projectId, conceptId, rationale);
      setSelectedConceptId(res.selectedConcept.id);

      // Update local concept list statuses
      setConcepts(prev =>
        prev.map(c => ({
          ...c,
          conceptStatus: c.id === conceptId ? 'SELECTED' : 'REJECTED'
        }))
      );

      if (onConceptSelected) {
        onConceptSelected(res.selectedConcept, res.adSpec);
      }
    } catch (err: any) {
      console.error('[ConceptReviewWorkspace] Error selecting concept:', err);
      setError(err.message || 'Failed to select creative concept');
    } finally {
      setSelectingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-slate-400">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-slate-200 rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading Creative Director directions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-6 text-slate-100 font-sans">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              Phase 3 • Creative Direction
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
              Creative Concepts Review
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Based on your confirmed advertising brief, the Creative Director developed 3 distinct strategic directions.
              Compare their mechanisms, hooks, and arcs, then choose one to build your production plan.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {concepts.length > 0 && (
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={generating}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {generating ? 'Generating Directions...' : 'Explore Different Directions'}
              </button>
            )}
            {concepts.length === 0 && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="px-5 py-2.5 bg-slate-100 hover:bg-white text-slate-950 font-semibold text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {generating ? 'Developing Concepts...' : 'Generate 3 Directions'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Stale Warning Banner */}
      {isStale && (
        <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-xl text-amber-200 text-sm space-y-1">
          <div className="font-semibold flex items-center space-x-2">
            <span>⚠️ Outdated Creative Concepts</span>
          </div>
          <p className="text-xs text-amber-300">
            These concepts were generated from brief version {concepts[0]?.briefVersion}, but the active brief is version {briefVersion}.
            Generate new directions to reflect your latest brief decisions.
          </p>
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-3 py-1 bg-amber-800/60 hover:bg-amber-800 border border-amber-700 text-amber-100 text-xs font-medium rounded transition-colors"
            >
              Update Concepts for Brief v{briefVersion}
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {concepts.length === 0 && !generating && (
        <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-8 space-y-4">
          <h3 className="text-lg font-semibold text-slate-200">No Creative Directions Generated Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Ready to transform your confirmed brief into 3 distinct advertising concepts with unique hooks and creative mechanisms.
          </p>
          <button
            onClick={handleGenerate}
            className="px-5 py-2.5 bg-slate-100 hover:bg-white text-slate-950 font-semibold text-sm rounded-lg transition-colors shadow-sm"
          >
            Generate Directions
          </button>
        </div>
      )}

      {/* Concepts Grid */}
      {concepts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {concepts.map((c) => {
            const isSelected = c.conceptStatus === 'SELECTED' || selectedConceptId === c.id;
            const isSelecting = selectingId === c.id;

            return (
              <div
                key={c.id}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 ${
                  isSelected
                    ? 'bg-slate-900 border-2 border-emerald-600 shadow-lg shadow-emerald-950/20'
                    : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Selection Badge */}
                {isSelected && (
                  <div className="absolute -top-3 right-6 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                    Active Selection
                  </div>
                )}

                <div className="space-y-5">
                  {/* Category & Mechanism Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs font-mono rounded border border-slate-700">
                      {c.creativeMechanism.toUpperCase()}
                    </span>
                    <span className="px-2.5 py-1 bg-slate-950 text-slate-400 text-xs rounded border border-slate-800">
                      {c.productRole.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {c.estimatedComplexity} complexity
                    </span>
                  </div>

                  {/* Concept Name & Core Premise */}
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {c.name}
                    </h3>
                    <p className="text-sm font-medium text-slate-300 mt-2 leading-relaxed">
                      "{c.oneLineIdea}"
                    </p>
                  </div>

                  {/* Hook Strategy */}
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Hook Strategy
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {c.hook.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-normal">
                      {c.hook.description}
                    </p>
                  </div>

                  {/* Why This Works (Strategic Foundation) */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Why It Works
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {c.strategicFoundation}
                    </p>
                  </div>

                  {/* Emotional Progression */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Emotional Arc
                    </span>
                    <p className="text-xs text-slate-400 font-mono bg-slate-950/60 p-2 rounded border border-slate-850">
                      {c.emotionalArc}
                    </p>
                  </div>

                  {/* Narrative Architecture */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Narrative Architecture
                    </span>
                    <p className="text-xs text-slate-400 font-mono bg-slate-950/60 p-2 rounded border border-slate-850">
                      {c.narrativeStructure}
                    </p>
                  </div>

                  {/* Strengths & Practical Considerations */}
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <div className="text-xs space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                        Strengths
                      </span>
                      {c.strengths.slice(0, 2).map((s, idx) => (
                        <p key={idx} className="text-xs text-slate-300 flex items-start space-x-1.5">
                          <span className="text-emerald-500">✓</span>
                          <span>{s}</span>
                        </p>
                      ))}
                    </div>

                    {c.risks.length > 0 && (
                      <div className="text-xs space-y-1 pt-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">
                          Considerations
                        </span>
                        {c.risks.slice(0, 1).map((r, idx) => (
                          <p key={idx} className="text-xs text-slate-400 flex items-start space-x-1.5">
                            <span className="text-amber-500">!</span>
                            <span>{r}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Required Assets */}
                  {c.requiredAssets.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Asset Dependencies
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {c.requiredAssets.map((a, idx) => (
                          <span
                            key={idx}
                            className={`text-[11px] px-2 py-0.5 rounded font-mono ${
                              a.exists
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                                : 'bg-slate-950 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {a.role}: {a.exists ? 'Available' : 'Needed'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selection Action Button */}
                <div className="pt-6 mt-6 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleSelect(c.id)}
                    disabled={isSelected || isSelecting || isStale}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                      isSelected
                        ? 'bg-emerald-700/80 text-white cursor-default'
                        : isStale
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-100 hover:bg-white text-slate-950 shadow hover:shadow-md'
                    }`}
                  >
                    {isSelected
                      ? '✓ Direction Selected'
                      : isSelecting
                      ? 'Confirming Selection...'
                      : 'Choose This Direction'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Direction Banner Footer */}
      {selectedConceptId && (
        <div className="bg-slate-900 border border-emerald-800/60 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Direction Locked in AdSpec
            </span>
            <h4 className="text-base font-semibold text-white">
              {concepts.find(c => c.id === selectedConceptId)?.name}
            </h4>
            <p className="text-xs text-slate-400">
              This concept is now locked as your canonical creative direction. Ready for Phase 4 (Story Architect & Director's Plan).
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-emerald-950 text-emerald-300 text-xs font-mono font-medium rounded-lg border border-emerald-800">
            AdSpec v{briefVersion + 1}
          </span>
        </div>
      )}
    </div>
  );
};
