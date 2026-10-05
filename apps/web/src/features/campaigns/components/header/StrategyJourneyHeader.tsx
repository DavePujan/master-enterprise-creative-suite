import React from 'react';
import { Check, AlertTriangle, X } from 'lucide-react';
import { useCampaignStrategy, JourneyStep } from '../../context/CampaignStrategyContext.js';

export const StrategyJourneyHeader: React.FC = () => {
  const [state, dispatch] = useCampaignStrategy();
  const { journeyStep, error, discovery, territories, strategy, activation } = state;

  const steps: Array<{ id: JourneyStep; num: string; label: string }> = [
    { id: '01_brief', num: '01', label: 'Brief & Scope' },
    { id: '02_discovery', num: '02', label: 'Adaptive Discovery' },
    { id: '03_strategic_routes', num: '03', label: 'Strategic Routes' },
    { id: '04_build_strategy', num: '04', label: 'Master Strategy' },
    { id: '05_activate', num: '05', label: 'Creative Hub' },
  ];

  return (
    <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-3.5">
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {steps.map((step) => {
          const isCurrent = journeyStep === step.id;
          const isUnlocked =
            step.id === '01_brief' ||
            (step.id === '02_discovery' && (discovery.adaptiveQuestions.length > 0 || discovery.isEvaluating)) ||
            (step.id === '03_strategic_routes' && (territories.items.length > 0 || territories.isGenerating)) ||
            (step.id === '04_build_strategy' && (strategy.masterStrategy !== null || state.loading)) ||
            (step.id === '05_activate' && activation.downstreamBriefs !== null);

          const isCompleted =
            (step.id === '01_brief' && (discovery.adaptiveQuestions.length > 0 || territories.items.length > 0 || strategy.masterStrategy !== null)) ||
            (step.id === '02_discovery' && (territories.items.length > 0 || strategy.masterStrategy !== null)) ||
            (step.id === '03_strategic_routes' && strategy.masterStrategy !== null) ||
            (step.id === '04_build_strategy' && activation.downstreamBriefs !== null);

          return (
            <button
              key={step.id}
              onClick={() => isUnlocked && dispatch({ type: 'SET_JOURNEY_STEP', payload: step.id })}
              disabled={!isUnlocked}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                isCurrent
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 ring-1 ring-rose-400'
                  : isCompleted
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                  : isUnlocked
                  ? 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  : 'bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-slate-200/40 dark:border-slate-800/60 cursor-not-allowed opacity-60'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold ${
                  isCurrent
                    ? 'bg-white/25 text-white'
                    : isCompleted
                    ? 'bg-emerald-500/20 text-emerald-500'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                {isCompleted ? <Check size={12} strokeWidth={2.5} /> : step.num}
              </span>
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-red-500" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
            className="text-red-400 hover:text-red-200 p-0.5 rounded cursor-pointer transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
