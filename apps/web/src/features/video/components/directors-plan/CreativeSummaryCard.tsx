import React from 'react';
import type { AdSpecBrief, AdSpecCreative, AdSpecStory, DecisionProvenance } from '@shared-types/adSpec.js';
import { extractCleanValue } from './planFormatters.js';
import { Sparkles, Target, Zap, Heart, ShoppingBag, CheckCircle2, Lock } from 'lucide-react';

export interface CreativeSummaryCardProps {
  brief: AdSpecBrief;
  creative: AdSpecCreative;
  story: AdSpecStory;
  decisionMetadata?: Record<string, DecisionProvenance>;
  onAskAi: () => void;
}

export const CreativeSummaryCard: React.FC<CreativeSummaryCardProps> = ({
  brief,
  creative,
  story,
  decisionMetadata = {},
  onAskAi
}) => {
  // Extract clean brief values
  const objective = extractCleanValue(brief.objective, 'conversions');
  const targetAudience = extractCleanValue(brief.targetAudience, { primarySegment: 'Urban professionals' });
  const cta = extractCleanValue(brief.cta, { visualText: 'Shop Now', actionIntent: 'shop_now' });
  const keyMessage = extractCleanValue(brief.keyMessage, 'Premium performance for your everyday lifestyle.');

  // Find selected concept
  const selectedConcept = creative.alternativeConcepts?.find(c => c.conceptId === creative.selectedConceptId) 
    || creative.alternativeConcepts?.[0]
    || {
      conceptId: 'concept_01',
      title: 'Cinematic Commercial',
      creativeMechanism: 'kinetic_action',
      premise: 'High-impact visual journey showcasing the product in dynamic real-world motion.',
      hookDescription: 'Immediate sensory stimulation capturing viewer attention in first 2 seconds.',
      emotionalArc: 'Curiosity -> Intrigue -> Empowerment -> Action',
      whyItWorks: 'Stops social feed scrolling through dynamic visual pacing.'
    };

  // Check decision locks
  const ctaProvenance = decisionMetadata['brief.cta'];
  const conceptProvenance = decisionMetadata['creative.selectedConceptId'];

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-xs text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-rose-600 dark:text-rose-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">
            Commercial Creative Summary
          </h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900/60">
            {selectedConcept.title}
          </span>
          {conceptProvenance?.status === 'confirmed' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-xs border border-emerald-200 dark:border-emerald-900/60">
              <CheckCircle2 size={10} />
              Confirmed Concept
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onAskAi}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors self-start md:self-auto cursor-pointer"
        >
          <Sparkles size={13} />
          Ask AI about Concept
        </button>
      </div>

      {/* Grid of Commercial Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs">
        {/* Core Premise */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase font-mono">
            <Target size={12} />
            <span>Premise & Core Idea</span>
          </div>
          <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
            {selectedConcept.premise}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Mechanism: <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{selectedConcept.creativeMechanism?.replace(/_/g, ' ')}</span>
          </p>
        </div>

        {/* Curiosity Hook */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase font-mono">
            <Zap size={12} />
            <span>Opening Hook (First 2.5s)</span>
          </div>
          <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
            {selectedConcept.hookDescription || story.hookMechanism || 'Immediate visual escalation capturing attention.'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Objective: <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{String(objective).replace(/_/g, ' ')}</span>
          </p>
        </div>

        {/* Emotional Arc */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase font-mono">
            <Heart size={12} />
            <span>Emotional Progression</span>
          </div>
          <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
            {selectedConcept.emotionalArc || story.narrativeArc || 'Problem -> Discovery -> Relief -> Call to Action'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={keyMessage}>
            Key Message: <span className="font-semibold text-slate-700 dark:text-slate-300">{keyMessage}</span>
          </p>
        </div>

        {/* Call to Action */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase font-mono">
              <ShoppingBag size={12} />
              <span>Call to Action</span>
            </div>
            {ctaProvenance?.locked && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                <Lock size={9} />
                Locked
              </span>
            )}
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xs">
            <p className="font-bold text-slate-900 dark:text-white">
              "{cta.visualText || 'Claim Your Exclusive Access'}"
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 capitalize">
              Intent: {cta.actionIntent?.replace(/_/g, ' ') || 'Conversion'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
