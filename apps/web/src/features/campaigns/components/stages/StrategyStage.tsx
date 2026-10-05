import React, { useState } from 'react';
import {
  Compass,
  Workflow,
  ListFilter,
  HelpCircle,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  Loader2,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCampaignStrategy } from '../../context/CampaignStrategyContext.js';

interface StrategyStageProps {
  onRunStressTest: () => Promise<void>;
  onApplyPatch: (feedback: string) => Promise<void>;
  isStressTesting?: boolean;
  isPatching?: boolean;
}

export const StrategyStage: React.FC<StrategyStageProps> = ({
  onRunStressTest,
  onApplyPatch,
  isStressTesting = false,
  isPatching = false
}) => {
  const [state, dispatch] = useCampaignStrategy();
  const { strategy } = state;
  const { masterStrategy } = strategy;
  const [activeTab, setActiveTab] = useState<'overview' | 'playbook' | 'distribution' | 'evidence' | 'advisory'>('overview');
  const [patchFeedback, setPatchFeedback] = useState('');

  if (!masterStrategy) {
    return (
      <div className="p-8 text-center text-slate-500">
        No master strategy synthesized yet. Return to previous steps to formulate a route.
      </div>
    );
  }

  return (
    <motion.div
      key="04_build_strategy"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5 text-left"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-light tracking-tight text-slate-900 dark:text-white">
              {masterStrategy.campaignTitle}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold">
              {masterStrategy.strategicFramework}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold">
              v{masterStrategy.versionNumber || 1}.0 {masterStrategy.parentVersionId ? '(Patched)' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Master Campaign Operating & Decision System • Enterprise Strategic Intelligence
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRunStressTest}
            disabled={isStressTesting}
            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {isStressTesting ? <Loader2 size={13} className="animate-spin" /> : <ShieldAlert size={13} className="text-rose-500" />}
            Stress-Test Strategy
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_JOURNEY_STEP', payload: '05_activate' })}
            className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
          >
            Creative Activation
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* 5 Executive Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview & Transformation', icon: Compass },
          { id: 'playbook', label: 'Playbook & Journey', icon: Workflow },
          { id: 'distribution', label: 'Channel Matrix', icon: ListFilter },
          { id: 'evidence', label: 'Evidence & Citations', icon: HelpCircle },
          { id: 'advisory', label: 'Ask Strategist & Patch', icon: MessageSquare }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-400/40'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 text-xs text-left">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {masterStrategy.executiveSummary && (
              <div className="p-4 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded space-y-2">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-rose-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Executive Summary (In 30 Seconds)
                  </span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                  {masterStrategy.executiveSummary}
                </p>
              </div>
            )}

            {/* Core Big Idea */}
            <div className="p-4 bg-slate-900 text-white rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block font-mono">
                The Core Big Idea
              </span>
              <h3 className="text-base font-serif italic">
                "{masterStrategy.coreBigIdea?.text}"
              </h3>
              <p className="text-xs text-slate-300">
                {masterStrategy.coreBigIdea?.strategicMechanism}
              </p>
            </div>

            {/* Creative Tension */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Current Customer Belief / Friction
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200">
                  {masterStrategy.creativeTension?.currentBelief}
                </p>
              </div>
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded border border-emerald-200 dark:border-emerald-800/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  Desired Belief Post-Campaign
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200">
                  {masterStrategy.creativeTension?.desiredBelief}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'playbook' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Customer Journey Playbook Phases
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {masterStrategy.customerJourneyPhases?.map((phase, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {phase.stage.toUpperCase()}: {phase.objective}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Core Hook: </span>
                    {phase.keyHook}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                    Channels: {phase.primaryChannels?.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Omnichannel Strategy & Platform Matrix
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[9px] uppercase font-bold">
                  <tr>
                    <th className="p-2.5">Platform</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Formats</th>
                    <th className="p-2.5">Spend Allocation</th>
                    <th className="p-2.5">Key Metric</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {masterStrategy.platformMatrix?.map((pm, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold">{pm.platform}</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-400">{pm.role}</td>
                      <td className="p-2.5 font-mono text-[10px]">{pm.nativeFormatRecommendations?.join(', ')}</td>
                      <td className="p-2.5 font-bold text-rose-500">{pm.budgetSplitPercentage}%</td>
                      <td className="p-2.5">{pm.primaryKPI}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Audited Epistemic Claims & Research Citations
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                Factually Grounded
              </span>
            </div>

            <div className="space-y-2">
              {masterStrategy.epistemicClassificationAudit?.claims?.map((claim, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{claim.text}</span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                      {claim.status}
                    </span>
                  </div>
                  {claim.citation && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <Globe size={11} />
                      <a href={claim.citation.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline font-mono">
                        {claim.citation.sourceTitle || claim.citation.sourceUrl}
                      </a>
                    </div>
                  )}
                  {claim.sourceOrRationale && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {claim.sourceOrRationale}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'advisory' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Surgical Strategy Revision & Advisory
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide feedback or pivot requirements. The strategist will apply a precise semantic patch preserving approved sections.
            </p>
            <textarea
              rows={3}
              value={patchFeedback}
              onChange={(e) => setPatchFeedback(e.target.value)}
              placeholder="e.g. Tone is too aggressive for corporate B2B procurement; soften the opening hook..."
              className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isPatching || !patchFeedback.trim()}
                onClick={() => onApplyPatch(patchFeedback)}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isPatching ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Apply Strategy Patch
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_JOURNEY_STEP', payload: '03_strategic_routes' })}
          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ChevronLeft size={16} /> Back to Routes
        </button>

        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_JOURNEY_STEP', payload: '05_activate' })}
          className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-md font-sans"
        >
          Launch Creative Hub
          <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  );
};
