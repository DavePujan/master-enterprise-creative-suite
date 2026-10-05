import React, { useState } from 'react';
import { Bookmark, Sliders, ChevronDown, ChevronUp, Plus, Trash2, X, ArrowRight, Loader2, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { useCampaignStrategy } from '../../context/CampaignStrategyContext.js';
import type {
  AmbitionLevel,
  RiskTolerance,
  BudgetReality,
  TimelineHorizon,
  BrandMaturity,
  GeographicScale,
  BusinessModelType,
  ProofItem,
  CompetitorKnowledgeSource
} from '../../../../../../packages/types/campaignStrategy.js';

interface BriefStageProps {
  onStartDiscovery: () => Promise<void>;
  brandName?: string;
  industry?: string;
}

export const BriefStage: React.FC<BriefStageProps> = ({ onStartDiscovery, brandName = 'Brand', industry = 'General' }) => {
  const [state, dispatch] = useCampaignStrategy();
  const { brief, discovery } = state;
  const { controls } = brief;

  const [newInclusionInput, setNewInclusionInput] = useState('');
  const [newForbiddenInput, setNewForbiddenInput] = useState('');

  return (
    <motion.div
      key="01_brief"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5 text-left"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-light tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>01 Campaign Strategic Brief & Scope Controls</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define ambition, risk tolerance, proof availability, and guardrails before discovery.
          </p>
        </div>

        {/* Preset Fast Draft Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mr-1 flex items-center gap-1">
            <Bookmark size={11} className="text-slate-400" /> Presets:
          </span>
          <button
            type="button"
            onClick={() => {
              dispatch({
                type: 'UPDATE_BRIEF',
                payload: {
                  campaignTitle: 'Flipkart Big Billion Days: Bharat Ka Tyohaar',
                  selectedGoal: 'Sales & E-commerce',
                  targetAudience: 'Tier 1 & Tier 2 Indian families and young consumers shopping for festive electronics and gifting',
                  briefDescription: 'Drive massive festive sales momentum across India with regional festive storytelling, lightning delivery, and deep discount transparency.',
                  campaignLanguage: 'Hindi',
                  countryRegion: 'India'
                }
              });
              dispatch({
                type: 'UPDATE_CONTROLS',
                payload: {
                  ambitionLevel: 'category_defining',
                  riskTolerance: 'moderate',
                  budgetReality: 'enterprise',
                  timelineHorizon: 'sprint_1_to_4_weeks',
                  brandMaturity: 'category_leader',
                  geographicScale: 'national',
                  businessModel: 'marketplace',
                  businessSector: 'E-commerce Retail',
                  proofAvailability: [
                    { type: 'performance_data', strength: 'strong' },
                    { type: 'product_demos', strength: 'strong' }
                  ],
                  mandatoryInclusions: ['Regional vernacular storytelling', 'Delivery speed transparency', 'Bank offer clarity'],
                  forbiddenTerritories: ['Elitist tone', 'Generic stock family visuals', 'Vague discounts'],
                  competitorKnowledgeSource: 'live_web',
                  competitorContext: {
                    competitors: 'Amazon Great Indian Festival, Meesho Maha Indian Shopping League',
                    overusedPatterns: 'Cliché Bollywood celebrity dances with fireworks and confetti',
                    whiteSpaceOpportunity: 'Hyper-relatable middle-class gifting dilemmas solved with micro-moments of joy'
                  }
                }
              });
            }}
            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] rounded font-semibold transition-all cursor-pointer"
          >
            Flipkart Festive
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch({
                type: 'UPDATE_BRIEF',
                payload: {
                  campaignTitle: 'LedgerFlow Enterprise Risk-Reversal',
                  selectedGoal: 'Lead Generation',
                  targetAudience: 'CFOs, VP of Finance, and enterprise procurement leaders managing complex ERP workflows',
                  briefDescription: 'Eliminate manual reconciliation bottlenecks with quantified 90-day ROI payback proof and guaranteed audit compliance.',
                  campaignLanguage: 'English',
                  countryRegion: 'North America'
                }
              });
              dispatch({
                type: 'UPDATE_CONTROLS',
                payload: {
                  ambitionLevel: 'balanced',
                  riskTolerance: 'low',
                  budgetReality: 'moderate',
                  timelineHorizon: 'quarterly_1_to_3_months',
                  brandMaturity: 'emerging_challenger',
                  geographicScale: 'national',
                  businessModel: 'saas',
                  businessSector: 'Financial Software / ERP',
                  proofAvailability: [
                    { type: 'case_studies', strength: 'strong' },
                    { type: 'performance_data', strength: 'strong' }
                  ],
                  mandatoryInclusions: ['90-day ROI guarantee', 'SOC-2 Type II audit proof'],
                  forbiddenTerritories: ['Overpromising effortless setup', 'Cartoonish tech startup graphics'],
                  competitorKnowledgeSource: 'provided_by_client',
                  competitorContext: {
                    competitors: 'BlackLine, FloQast, SAP Financial Closing Cockpit',
                    overusedPatterns: 'Generic spreadsheets transforming into abstract glowing neon charts',
                    whiteSpaceOpportunity: 'Unflinching focus on audit stress and personal reputational risk of finance heads'
                  }
                }
              });
            }}
            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] rounded font-semibold transition-all cursor-pointer"
          >
            B2B SaaS Risk
          </button>
        </div>
      </div>

      {/* Core Brief Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Campaign Working Title *
          </label>
          <input
            type="text"
            value={brief.campaignTitle}
            onChange={(e) => dispatch({ type: 'UPDATE_BRIEF', payload: { campaignTitle: e.target.value } })}
            placeholder="e.g. Q4 Flagship Product Launch"
            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Primary Commercial Objective *
          </label>
          <select
            value={brief.selectedGoal}
            onChange={(e) => dispatch({ type: 'UPDATE_BRIEF', payload: { selectedGoal: e.target.value } })}
            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-900 dark:text-slate-100"
          >
            {[
              'Sales & E-commerce',
              'Launch Hype & PR',
              'Brand Awareness',
              'Lead Generation',
              'Virality & Memes',
              'App Installs',
              'Customer Retention',
              'Community Building'
            ].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
          Target Audience (Demographic & Behavioral Mindset)
        </label>
        <input
          type="text"
          value={brief.targetAudience}
          onChange={(e) => dispatch({ type: 'UPDATE_BRIEF', payload: { targetAudience: e.target.value } })}
          placeholder="e.g. Busy urban parents seeking healthy 10-minute breakfast alternatives without guilt"
          className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
          Executive Brief & Strategic Mandate *
        </label>
        <textarea
          rows={3}
          value={brief.briefDescription}
          onChange={(e) => dispatch({ type: 'UPDATE_BRIEF', payload: { briefDescription: e.target.value } })}
          placeholder="Describe product advantages, consumer skepticism, category cliches to avoid, and the core message you need to land..."
          className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
        />
      </div>

      {/* Advanced Executive Operational Controls Toggle */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-800/30">
        <button
          type="button"
          onClick={() => dispatch({ type: 'UPDATE_CONTROLS', payload: { showAdvancedControls: !controls.showAdvancedControls } })}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Sliders size={13} className="text-rose-500" />
            Executive Operational Reality Controls (Ambition, Proof, Guardrails & Search Grounding)
          </span>
          {controls.showAdvancedControls ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {controls.showAdvancedControls && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Creative Ambition</label>
                <select
                  value={controls.ambitionLevel}
                  onChange={(e) => dispatch({ type: 'UPDATE_CONTROLS', payload: { ambitionLevel: e.target.value as AmbitionLevel } })}
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                >
                  <option value="safe_pragmatic">Safe & Pragmatic</option>
                  <option value="balanced">Balanced</option>
                  <option value="category_defining">Category Defining</option>
                  <option value="provocative_experimental">Provocative & Experimental</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Risk Tolerance</label>
                <select
                  value={controls.riskTolerance}
                  onChange={(e) => dispatch({ type: 'UPDATE_CONTROLS', payload: { riskTolerance: e.target.value as RiskTolerance } })}
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                >
                  <option value="low">Low Risk</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High Risk (Bold)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Budget Reality</label>
                <select
                  value={controls.budgetReality}
                  onChange={(e) => dispatch({ type: 'UPDATE_CONTROLS', payload: { budgetReality: e.target.value as BudgetReality } })}
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                >
                  <option value="no_paid_organic">Zero Paid (100% Organic)</option>
                  <option value="lean">Lean Test Budget</option>
                  <option value="moderate">Moderate Media Spend</option>
                  <option value="enterprise">Enterprise Scaled</option>
                </select>
              </div>
            </div>

            {/* Competitor Knowledge Source with live_web */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Competitor Knowledge Grounding & Live Research
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'live_web', label: 'Live Web Grounding (Google Search)', desc: 'Grounds competitive analysis in real-time Google Search with source citations' },
                  { id: 'provided_by_client', label: 'Client-Supplied Competitors', desc: 'Strategy explicitly grounded in competitor names and patterns you supply below' },
                  { id: 'imported_from_workspace', label: 'Workspace Brand Documents', desc: 'Grounds analysis in brand guidelines and stored workspace assets' },
                  { id: 'no_research_supplied', label: 'No Research Supplied', desc: 'Applies universal category defense invariants without claiming competitor intel' }
                ].map((src) => {
                  const isSelected = controls.competitorKnowledgeSource === src.id;
                  return (
                    <div
                      key={src.id}
                      onClick={() => dispatch({ type: 'UPDATE_CONTROLS', payload: { competitorKnowledgeSource: src.id as CompetitorKnowledgeSource } })}
                      className={`p-2 rounded border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-[11px] flex items-center justify-between">
                        <span>{src.label}</span>
                        {src.id === 'live_web' && <Globe size={11} className="text-emerald-500" />}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{src.desc}</p>
                    </div>
                  );
                })}
              </div>

              {controls.competitorKnowledgeSource !== 'no_research_supplied' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">Competitor Names</label>
                    <input
                      type="text"
                      value={controls.competitorContext.competitors}
                      onChange={(e) => dispatch({
                        type: 'UPDATE_CONTROLS',
                        payload: {
                          competitorContext: { ...controls.competitorContext, competitors: e.target.value }
                        }
                      })}
                      placeholder="e.g. Brand X, Competitor Y"
                      className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">Category Clichés to Avoid</label>
                    <input
                      type="text"
                      value={controls.competitorContext.overusedPatterns}
                      onChange={(e) => dispatch({
                        type: 'UPDATE_CONTROLS',
                        payload: {
                          competitorContext: { ...controls.competitorContext, overusedPatterns: e.target.value }
                        }
                      })}
                      placeholder="e.g. Cheesy stock handshakes, fake testimonials"
                      className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Guardrails */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mandatory Inclusions ({controls.mandatoryInclusions.length})
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {controls.mandatoryInclusions.map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px]">
                      {item}
                      <X size={10} className="cursor-pointer" onClick={() => {
                        dispatch({
                          type: 'UPDATE_CONTROLS',
                          payload: {
                            mandatoryInclusions: controls.mandatoryInclusions.filter((_, i) => i !== idx)
                          }
                        });
                      }} />
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newInclusionInput}
                    onChange={(e) => setNewInclusionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newInclusionInput.trim()) {
                        e.preventDefault();
                        dispatch({
                          type: 'UPDATE_CONTROLS',
                          payload: { mandatoryInclusions: [...controls.mandatoryInclusions, newInclusionInput.trim()] }
                        });
                        setNewInclusionInput('');
                      }
                    }}
                    placeholder="Add mandatory item..."
                    className="flex-1 text-xs px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newInclusionInput.trim()) {
                        dispatch({
                          type: 'UPDATE_CONTROLS',
                          payload: { mandatoryInclusions: [...controls.mandatoryInclusions, newInclusionInput.trim()] }
                        });
                        setNewInclusionInput('');
                      }
                    }}
                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-xs font-bold rounded"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Forbidden Territories ({controls.forbiddenTerritories.length})
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {controls.forbiddenTerritories.map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded text-[10px]">
                      {item}
                      <X size={10} className="cursor-pointer" onClick={() => {
                        dispatch({
                          type: 'UPDATE_CONTROLS',
                          payload: {
                            forbiddenTerritories: controls.forbiddenTerritories.filter((_, i) => i !== idx)
                          }
                        });
                      }} />
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newForbiddenInput}
                    onChange={(e) => setNewForbiddenInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newForbiddenInput.trim()) {
                        e.preventDefault();
                        dispatch({
                          type: 'UPDATE_CONTROLS',
                          payload: { forbiddenTerritories: [...controls.forbiddenTerritories, newForbiddenInput.trim()] }
                        });
                        setNewForbiddenInput('');
                      }
                    }}
                    placeholder="Add forbidden trope..."
                    className="flex-1 text-xs px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newForbiddenInput.trim()) {
                        dispatch({
                          type: 'UPDATE_CONTROLS',
                          payload: { forbiddenTerritories: [...controls.forbiddenTerritories, newForbiddenInput.trim()] }
                        });
                        setNewForbiddenInput('');
                      }
                    }}
                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-xs font-bold rounded"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Button to Start Discovery */}
      <div className="flex items-center justify-end pt-3">
        <button
          type="button"
          onClick={onStartDiscovery}
          disabled={discovery.isEvaluating || !brief.briefDescription.trim()}
          className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-98 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-md shadow-rose-500/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
        >
          {discovery.isEvaluating ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Evaluating Semantic Readiness...
            </>
          ) : (
            <>
              Enter Adaptive Discovery
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
