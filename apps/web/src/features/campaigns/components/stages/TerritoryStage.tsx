import React, { useState } from 'react';
import { Layers, FileSpreadsheet, Compass, Sparkles, ChevronLeft, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useCampaignStrategy } from '../../context/CampaignStrategyContext.js';
import type { StrategicTerritory } from '../../../../../../packages/types/campaignStrategy.js';

interface TerritoryStageProps {
  onLockTerritory: (territory: StrategicTerritory) => void;
  onGenerateAlternative: (directionPrompt: string) => Promise<void>;
  isGeneratingAlternative?: boolean;
  isLocking?: boolean;
}

export const TerritoryStage: React.FC<TerritoryStageProps> = ({
  onLockTerritory,
  onGenerateAlternative,
  isGeneratingAlternative = false,
  isLocking = false
}) => {
  const [state, dispatch] = useCampaignStrategy();
  const { territories } = state;
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [customDirection, setCustomDirection] = useState('');

  return (
    <motion.div
      key="03_strategic_routes"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5 text-left"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-light tracking-tight text-slate-900 dark:text-white">
            03 Select Strategic Route & Territory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compare trade-offs, creative codes, and strategic fit before locking direction (5 credits).
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`text-[11px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers size={12} /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`text-[11px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet size={12} /> Comparison Matrix
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            {territories.items.length} Formulated
          </span>
        </div>
      </div>

      {/* Directional Alternative Bar */}
      <div className="p-3 bg-slate-50/70 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Compass size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
              Directional Route Alternatives (0 Credits)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            Pivot angle freely before committing credits
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            'Push More Contrarian & Provocative',
            'Optimize for Lean / Scrappy Production',
            'Maximize Cultural Resonance & Edge',
            'Focus on High-Intent Enterprise Conversion'
          ].map(p => (
            <button
              key={p}
              type="button"
              disabled={isGeneratingAlternative || isLocking}
              onClick={() => onGenerateAlternative(p)}
              className="text-[10px] font-semibold px-2.5 py-1 bg-white dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-400 dark:hover:border-rose-500/60 border border-slate-200 dark:border-slate-800 rounded-md transition-all cursor-pointer disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <input
            type="text"
            value={customDirection}
            onChange={(e) => setCustomDirection(e.target.value)}
            placeholder="Or specify custom direction angle (e.g. emphasize humorous self-deprecation)..."
            disabled={isLocking}
            className="flex-1 text-[11px] px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={isGeneratingAlternative || !customDirection.trim() || isLocking}
            onClick={() => {
              if (customDirection.trim()) {
                onGenerateAlternative(customDirection.trim());
                setCustomDirection('');
              }
            }}
            className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold rounded-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1 shrink-0 shadow-sm"
          >
            {isGeneratingAlternative ? <Loader2 size={12} className="animate-spin" /> : 'Generate Direction'}
          </button>
        </div>
      </div>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[68vh] overflow-y-auto pr-1">
          {territories.items.map((territory) => {
            const isSelected = territories.selectedTerritoryId === territory.id;
            return (
              <div
                key={territory.id}
                className={`p-4 rounded-lg border flex flex-col justify-between transition-all text-left relative ${
                  isSelected
                    ? 'bg-rose-50/20 dark:bg-slate-900 border-rose-500 shadow-md ring-2 ring-rose-500/50'
                    : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                }`}
              >
                {territory.isRecommended && (
                  <div className="mb-2 inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-500 text-white rounded text-[9px] font-bold uppercase tracking-wider shadow-xs">
                    <Sparkles size={10} /> Strategist Recommendation
                  </div>
                )}

                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {territory.title}
                    </h4>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                      territory.distinctivenessTier === 'Highly Differentiated'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : territory.distinctivenessTier === 'Fresh'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {territory.distinctivenessTier || 'Fresh Direction'}
                    </span>
                  </div>

                  <p className="text-xs font-serif text-slate-800 dark:text-slate-200 italic bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-md border border-slate-200 dark:border-slate-800/80">
                    "{territory.oneLinePremise}"
                  </p>

                  {territory.sacrificesAndTradeoffs && (
                    <div className="p-2 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 dark:border-amber-900/40 rounded-md space-y-0.5">
                      <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                        What We Give Up (Trade-Off):
                      </span>
                      <p className="text-[10px] text-slate-700 dark:text-slate-300">
                        {territory.sacrificesAndTradeoffs}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1 text-[11px]">
                    <span className="font-bold text-slate-600 dark:text-slate-400 block text-[9px] uppercase tracking-wider">The Mechanism:</span>
                    <p className="text-slate-700 dark:text-slate-300 text-[10px]">{territory.theMechanism}</p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isLocking}
                    onClick={() => {
                      dispatch({ type: 'SELECT_TERRITORY', payload: territory.id });
                      onLockTerritory(territory);
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-rose-600 dark:bg-rose-500 dark:hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLocking && isSelected ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Locking Route & Synthesizing...
                      </>
                    ) : (
                      <>
                        Lock Route & Synthesize (5 cr)
                        <Sparkles size={12} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison Matrix View */}
      {viewMode === 'matrix' && (
        <div className="border border-slate-200 dark:border-slate-800 rounded overflow-x-auto max-h-[55vh]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-bold text-[9px] sticky top-0">
              <tr>
                <th className="p-3">Strategic Route</th>
                <th className="p-3">Brand Fit</th>
                <th className="p-3">Distinctiveness</th>
                <th className="p-3">Audience Relevance</th>
                <th className="p-3">Complexity</th>
                <th className="p-3">Trade-Off</th>
                <th className="p-3 text-right">Commit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
              {territories.items.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    <div>{t.title}</div>
                    <span className="text-[10px] font-normal text-slate-500 italic block mt-0.5 line-clamp-1">"{t.oneLinePremise}"</span>
                  </td>
                  <td className="p-3"><span className="font-mono font-bold text-emerald-500">{t.comparisonScores?.brandFit || 'High'}</span></td>
                  <td className="p-3"><span className="font-mono font-bold text-blue-500">{t.comparisonScores?.distinctiveness || 'High'}</span></td>
                  <td className="p-3"><span className="font-mono font-bold text-purple-500">{t.comparisonScores?.audienceRelevance || 'High'}</span></td>
                  <td className="p-3"><span className="font-mono font-bold text-amber-500">{t.comparisonScores?.executionComplexity || 'Moderate'}</span></td>
                  <td className="p-3 max-w-[200px] text-slate-600 dark:text-slate-400 line-clamp-2">{t.sacrificesAndTradeoffs || 'Standard'}</td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      disabled={isLocking}
                      onClick={() => {
                        dispatch({ type: 'SELECT_TERRITORY', payload: t.id });
                        onLockTerritory(t);
                      }}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-bold uppercase cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isLocking && territories.selectedTerritoryId === t.id ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          Locking...
                        </>
                      ) : (
                        'Lock (5 cr)'
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_JOURNEY_STEP', payload: '02_discovery' })}
          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ChevronLeft size={16} /> Back to Discovery
        </button>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
          Exploration & alternatives are 0 credits. Hold & capture of 5 credits triggers upon route confirmation.
        </span>
      </div>
    </motion.div>
  );
};
