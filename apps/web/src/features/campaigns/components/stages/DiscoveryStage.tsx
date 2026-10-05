import React from 'react';
import { Compass, TrendingUp, ChevronLeft, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useCampaignStrategy } from '../../context/CampaignStrategyContext.js';

interface DiscoveryStageProps {
  onGenerateTerritories: () => Promise<void>;
}

export const DiscoveryStage: React.FC<DiscoveryStageProps> = ({ onGenerateTerritories }) => {
  const [state, dispatch] = useCampaignStrategy();
  const { discovery, territories } = state;
  const { adaptiveQuestions, discoveryAnswers, discoveryConfidence, recommendedFrameworks } = discovery;

  return (
    <motion.div
      key="02_discovery"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5 text-left"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-light tracking-tight text-slate-900 dark:text-white">
            02 Adaptive Strategic Discovery
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Semantic evaluation resolving audience tension, evidentiary proof, and candidate frameworks.
          </p>
        </div>

        {discoveryConfidence && (
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Readiness:</span>
              <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.round(discoveryConfidence.confidenceScore * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-emerald-500 font-mono">
                {Math.round(discoveryConfidence.confidenceScore * 100)}%
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {discoveryConfidence.isSufficient ? 'Sufficient context gathered' : 'Probing key dimensions'}
            </span>
          </div>
        )}
      </div>

      {/* 8-Dimension Strategic Readiness Cards Grid */}
      {discoveryConfidence?.readiness && (
        <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass size={15} className="text-rose-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Strategic Readiness Audit (8 Core Dimensions)
              </span>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
              discoveryConfidence.readiness.overallReadiness === 'comprehensive'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : discoveryConfidence.readiness.overallReadiness === 'ready_for_routes'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              {discoveryConfidence.readiness.overallReadiness.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {discoveryConfidence.readiness.dimensions?.map((dim) => (
              <div key={dim.id} className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold capitalize text-slate-700 dark:text-slate-300 font-mono">
                    {dim.label}
                  </span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                    dim.status === 'strong'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : dim.status === 'partial'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {dim.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                  {dim.detail}
                </p>
              </div>
            ))}
          </div>

          {/* CSO Guidance Banner */}
          {discoveryConfidence.readiness.summaryGuidance && (
            <div className="p-2.5 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded flex items-start gap-2">
              <TrendingUp size={14} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-800 dark:text-slate-200 font-medium">
                <span className="font-bold text-rose-600 dark:text-rose-400">Chief Strategy Officer Guidance: </span>
                {discoveryConfidence.readiness.summaryGuidance}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Candidate Framework Pills */}
      {recommendedFrameworks.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Candidate Frameworks:</span>
          {recommendedFrameworks.map(fw => (
            <span key={fw} className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 font-semibold">
              {fw}
            </span>
          ))}
        </div>
      )}

      {/* Dynamic Questions List */}
      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
        {adaptiveQuestions.map((q, idx) => (
          <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded space-y-2 text-left">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {idx + 1}
                </span>
                {q.question}
              </span>
            </div>

            {q.strategicRationale && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                Strategic Rationale: {q.strategicRationale}
              </p>
            )}

            {q.inputType === 'choice' && q.options && q.options.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {q.options.map(opt => {
                  const isSelected = discoveryAnswers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_DISCOVERY_ANSWER', payload: { questionId: q.id, answer: opt } })}
                      className={`text-xs px-3 py-1.5 rounded-md border transition-all cursor-pointer font-medium ${
                        isSelected
                          ? 'bg-rose-500 text-white border-rose-600 font-bold shadow-xs ring-1 ring-rose-400/40'
                          : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                rows={2}
                value={discoveryAnswers[q.id] || ''}
                onChange={(e) => dispatch({ type: 'SET_DISCOVERY_ANSWER', payload: { questionId: q.id, answer: e.target.value } })}
                placeholder={q.suggestedPlaceholder || "Enter strategic perspective..."}
                className="w-full text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
              />
            )}
          </div>
        ))}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_JOURNEY_STEP', payload: '01_brief' })}
          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
        >
          <ChevronLeft size={16} /> Edit Brief & Controls
        </button>

        <button
          type="button"
          onClick={onGenerateTerritories}
          disabled={territories.isGenerating}
          className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-98 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-md shadow-rose-500/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer font-sans"
        >
          {territories.isGenerating ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Formulating Strategic Routes...
            </>
          ) : (
            <>
              Generate Strategic Routes (0 cr)
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
