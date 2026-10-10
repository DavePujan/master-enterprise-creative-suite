import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Compass, ShieldAlert, Layers, Globe, FileCode, CheckCircle2, History, X, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CampaignStrategyProvider, useCampaignStrategy } from '../context/CampaignStrategyContext.js';
import { StrategyJourneyHeader } from './header/StrategyJourneyHeader.js';
import { BriefStage } from './stages/BriefStage.js';
import { DiscoveryStage } from './stages/DiscoveryStage.js';
import { TerritoryStage } from './stages/TerritoryStage.js';
import { StrategyStage } from './stages/StrategyStage.js';
import { ActivationStage } from './stages/ActivationStage.js';
import { apiClient } from '@web/infrastructure/api/apiClient.js';
import { CampaignProcessLoader, playCompletionChime } from './shared/CampaignProcessLoader.js';
import { SavedStrategiesModal } from './modals/SavedStrategiesModal.js';
import type { StrategicTerritory, MasterCampaignStrategy, DownstreamBriefs } from '../../../../../../packages/types/campaignStrategy.js';
import type { AdSpec } from '../../../../../../packages/types/adSpec.js';

export interface CampaignStrategistWorkspaceProps {
  brandGuidelines: {
    name: string;
    industry: string;
    tone: string;
    pillars: string[];
    colors: string[];
    typography: { primary: string; secondary: string };
    logo?: string;
    location?: string;
  };
  onSaveCampaignAsset?: (name: string, dataUrl: string, type: 'image' | 'doc' | 'video' | 'audio') => void;
  onSaveHistory?: (res: any, gemId: string, prompt: string) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  productContext?: { id: string; name: string; data: string } | null;
  setProductContext?: (ctx: { id: string; name: string; data: string } | null) => void;
  faceContext?: { id: string; name: string; data: string } | null;
  setFaceContext?: (ctx: { id: string; name: string; data: string } | null) => void;
  setHumanTouchItem?: React.Dispatch<React.SetStateAction<any>>;
  onSelectGem?: (gem: any) => void;
  setPrompt?: (val: string) => void;
  setAspectRatio?: (val: string) => void;
  setSelectedLanguage?: (val: string) => void;
  setAudioGenerationType?: (val: 'voiceover' | 'music') => void;
  setMusicMood?: (val: string) => void;
  currentActiveResult?: any;
  onClearActiveResult?: () => void;
}

const CampaignStrategistWorkspaceInner: React.FC<CampaignStrategistWorkspaceProps> = ({
  brandGuidelines,
  onSaveCampaignAsset,
  onSaveHistory,
  credits,
  setCredits,
  productContext,
  setProductContext,
  faceContext,
  setFaceContext,
  setHumanTouchItem,
  onSelectGem,
  setPrompt,
  setAspectRatio,
  setSelectedLanguage,
  setAudioGenerationType,
  setMusicMood,
  currentActiveResult,
  onClearActiveResult
}) => {
  const [state, dispatch] = useCampaignStrategy();
  const { journeyStep, brief, discovery, territories, strategy, activation, loading, error } = state;
  const [isGeneratingAlternative, setIsGeneratingAlternative] = useState(false);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [isPatching, setIsPatching] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [savedStrategies, setSavedStrategies] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 0. Auto-rehydrate active campaign loaded from history or external trigger
  useEffect(() => {
    if (!currentActiveResult) return;

    if (
      currentActiveResult.type === 'campaign-strategy' ||
      currentActiveResult.masterStrategy ||
      currentActiveResult.strategyId ||
      currentActiveResult.data?.masterStrategy
    ) {
      const data = currentActiveResult.data || currentActiveResult;
      const masterStrategy = data.masterStrategy || data.strategy;
      const targetStep = data.journeyStep || (masterStrategy ? '04_build_strategy' : '01_brief');

      dispatch({
        type: 'REHYDRATE_STATE',
        payload: {
          journeyStep: targetStep,
          brief: data.brief || {
            ...state.brief,
            campaignTitle: data.campaignTitle || state.brief.campaignTitle,
            briefDescription: data.briefDescription || state.brief.briefDescription,
            targetAudience: data.targetAudience || state.brief.targetAudience,
            selectedGoal: data.objective || state.brief.selectedGoal,
            controls: data.controls || state.brief.controls
          },
          discovery: data.discovery || state.discovery,
          territories: data.territories ? {
            ...state.territories,
            ...data.territories,
            selectedTerritoryId: data.selectedTerritory?.id || data.territories?.selectedTerritoryId || state.territories.selectedTerritoryId
          } : (data.selectedTerritory ? {
            ...state.territories,
            items: [data.selectedTerritory],
            selectedTerritoryId: data.selectedTerritory.id
          } : state.territories),
          strategy: {
            ...state.strategy,
            masterStrategy: masterStrategy || null,
            activeTab: 'executive'
          },
          activation: {
            ...state.activation,
            downstreamBriefs: data.downstreamBriefs || null,
            activeBriefTab: 'adspec'
          }
        }
      });

      if (data.canonicalAdSpec) {
        localStorage.setItem('staged_canonical_adspec', JSON.stringify(data.canonicalAdSpec));
        sessionStorage.setItem('writopedia_active_adspec', JSON.stringify(data.canonicalAdSpec));
      }

      onClearActiveResult?.();
    }
  }, [currentActiveResult, onClearActiveResult]);

  // 1. Stage 1 -> Stage 2: Adaptive Discovery
  const handleStartDiscovery = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const response = await apiClient.post<{
        confidence: any;
        recommendedFrameworks: string[];
        adaptiveQuestions: any[];
      }>('/api/campaign/strategy/discovery', {
        campaignTitle: brief.campaignTitle,
        briefDescription: brief.briefDescription,
        brandName: brandGuidelines.name,
        industry: brandGuidelines.industry,
        objective: brief.selectedGoal,
        targetAudience: brief.targetAudience,
        controls: brief.controls
      });

      const resPayload: any = response;
      const confidence = resPayload.confidence || resPayload.data?.confidence;
      const frameworks = resPayload.recommendedFrameworks || resPayload.data?.recommendedFrameworks || [];
      const questions = resPayload.adaptiveQuestions || resPayload.data?.adaptiveQuestions || [];

      if (confidence || questions.length > 0) {
        dispatch({
          type: 'SET_DISCOVERY_DATA',
          payload: {
            confidence,
            frameworks,
            questions
          }
        });
        dispatch({ type: 'SET_JOURNEY_STEP', payload: '02_discovery' });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to initialize discovery' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getFormattedDiscoveryAnswers = () => {
    return Object.entries(discovery.discoveryAnswers || {}).map(([id, answer]) => {
      const q = discovery.adaptiveQuestions.find(aq => aq.id === id);
      return {
        questionId: id,
        questionText: q?.question || id,
        answer
      };
    });
  };

  // 2. Stage 2 -> Stage 3: Strategic Routes Generator
  const handleGenerateTerritories = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const response = await apiClient.post<{ territories: StrategicTerritory[] }>('/api/campaign/strategy/territories', {
        campaignTitle: brief.campaignTitle,
        briefDescription: brief.briefDescription,
        brandName: brandGuidelines.name,
        industry: brandGuidelines.industry,
        objective: brief.selectedGoal,
        targetAudience: brief.targetAudience,
        discoveryAnswers: getFormattedDiscoveryAnswers(),
        controls: brief.controls,
        directionVariant: territories.directionVariant
      });

      const resPayload: any = response;
      const territoriesList = resPayload.territories || resPayload.data?.territories;
      if (territoriesList) {
        dispatch({ type: 'SET_TERRITORIES', payload: territoriesList });
        dispatch({ type: 'SET_JOURNEY_STEP', payload: '03_strategic_routes' });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to generate strategic routes' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // 3. Stage 3 -> Stage 4: Synthesize Master Strategy & Compile AdSpec v1
  const handleLockTerritory = async (territory: StrategicTerritory) => {
    dispatch({ type: 'SELECT_TERRITORY', payload: territory.id });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const synthRes = await apiClient.post<{ strategy: MasterCampaignStrategy }>('/api/campaign/strategy/synthesize', {
        campaignTitle: brief.campaignTitle,
        briefDescription: brief.briefDescription,
        brandName: brandGuidelines.name,
        industry: brandGuidelines.industry,
        objective: brief.selectedGoal,
        targetAudience: brief.targetAudience,
        selectedTerritory: territory,
        discoveryAnswers: getFormattedDiscoveryAnswers(),
        language: brief.campaignLanguage,
        controls: brief.controls
      });

      const synthPayload: any = synthRes;
      const masterStrategy = synthPayload.strategy || synthPayload.data?.strategy || synthPayload.masterStrategy;

      if (masterStrategy) {
        dispatch({ type: 'SET_MASTER_STRATEGY', payload: masterStrategy });
        setCredits(prev => Math.max(0, prev - 5));

        // Consume canonical AdSpec v1 returned directly by the optimized single-pass synthesis
        let canonicalAdSpec = synthPayload.adSpec || synthPayload.data?.adSpec;
        let projectId = synthPayload.projectId || synthPayload.data?.projectId;

        // Graceful fallback to secondary compilation endpoint only if not present in primary payload
        if (!canonicalAdSpec) {
          try {
            const adSpecRes = await apiClient.post<{ adSpec: AdSpec; projectId?: string }>('/api/campaign/strategy/adspec', {
              strategy: masterStrategy,
              territory,
              persistToProject: true
            });
            const adSpecPayload: any = adSpecRes;
            canonicalAdSpec = adSpecPayload.adSpec || adSpecPayload.data?.adSpec;
            projectId = adSpecPayload?.projectId;
          } catch (persistErr) {
            console.warn('Fallback AdSpec compilation error:', persistErr);
          }
        }

        const returnedBriefs = synthPayload.downstreamBriefs || synthPayload.data?.downstreamBriefs;
        if (returnedBriefs) {
          const downstream: DownstreamBriefs = {
            ...returnedBriefs,
            canonicalAdSpec: canonicalAdSpec || returnedBriefs.canonicalAdSpec,
            canonicalAdSpecId: projectId || returnedBriefs.canonicalAdSpecId
          };
          dispatch({ type: 'SET_DOWNSTREAM_BRIEFS', payload: downstream });
        }

        if (canonicalAdSpec) {
          localStorage.setItem('staged_canonical_adspec', JSON.stringify(canonicalAdSpec));
          sessionStorage.setItem('writopedia_active_adspec', JSON.stringify(canonicalAdSpec));
        }

        // Save to Creative History (frontend state + cloud history sync)
        if (onSaveHistory) {
          onSaveHistory(
            {
              type: 'campaign-strategy',
              strategyId: synthPayload.strategyId,
              versionId: synthPayload.versionId,
              versionNumber: synthPayload.versionNumber || 1,
              campaignTitle: brief.campaignTitle,
              objective: brief.selectedGoal,
              targetAudience: brief.targetAudience,
              selectedTerritory: territory,
              masterStrategy,
              downstreamBriefs: returnedBriefs || synthPayload.downstreamBriefs,
              canonicalAdSpec,
              brief,
              discovery,
              territories: {
                items: territories.items,
                selectedTerritoryId: territory.id,
                directionVariant: territories.directionVariant
              }
            },
            'campaign-strategist-y',
            `Campaign Strategy: ${brief.campaignTitle}`
          );
        }

        // Trigger pleasant Web Audio API completion chime
        playCompletionChime();

        dispatch({ type: 'SET_JOURNEY_STEP', payload: '04_build_strategy' });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to synthesize master strategy' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleGenerateAlternative = async (directionPrompt: string) => {
    setIsGeneratingAlternative(true);
    try {
      const response = await apiClient.post<{ territories: StrategicTerritory[] }>('/api/campaign/strategy/territories', {
        campaignTitle: brief.campaignTitle,
        briefDescription: `${brief.briefDescription}\nDirectional requirement: ${directionPrompt}`,
        brandName: brandGuidelines.name,
        industry: brandGuidelines.industry,
        objective: brief.selectedGoal,
        targetAudience: brief.targetAudience,
        discoveryAnswers: getFormattedDiscoveryAnswers(),
        controls: brief.controls,
        directionVariant: 'unconventional'
      });
      const resPayload: any = response;
      const territoriesList = resPayload.territories || resPayload.data?.territories;
      if (territoriesList) {
        dispatch({ type: 'SET_TERRITORIES', payload: territoriesList });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to generate alternative route' });
    } finally {
      setIsGeneratingAlternative(false);
    }
  };

  const handleRunStressTest = async () => {
    if (!strategy.masterStrategy) return;
    setIsStressTesting(true);
    try {
      const res = await apiClient.post<{ stressTest: any }>('/api/campaign/strategy/stress-test', {
        strategy: strategy.masterStrategy,
        controls: brief.controls
      });
      const resPayload: any = res;
      const report = resPayload.stressTest || resPayload.data?.stressTest;
      if (report) {
        dispatch({ type: 'SET_STRESS_TEST_REPORT', payload: report });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Stress test failed' });
    } finally {
      setIsStressTesting(false);
    }
  };

  const handleApplyPatch = async (feedback: string) => {
    if (!strategy.masterStrategy) return;
    setIsPatching(true);
    try {
      const res = await apiClient.post<{ strategy: MasterCampaignStrategy }>('/api/campaign/strategy/patch', {
        strategy: strategy.masterStrategy,
        feedback
      });
      const resPayload: any = res;
      const patchedStrategy = resPayload.strategy || resPayload.data?.strategy;
      if (patchedStrategy) {
        dispatch({ type: 'SET_MASTER_STRATEGY', payload: patchedStrategy });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to apply patch' });
    } finally {
      setIsPatching(false);
    }
  };

  // 4. Stage 5: Launch Gem Handoff
  const handleLaunchGem = (gemId: string) => {
    const canonicalAdSpec = activation.downstreamBriefs?.canonicalAdSpec;
    if (canonicalAdSpec) {
      localStorage.setItem('staged_canonical_adspec', JSON.stringify(canonicalAdSpec));
      sessionStorage.setItem('writopedia_active_adspec', JSON.stringify(canonicalAdSpec));
    }
    if (onSelectGem) {
      onSelectGem({ id: gemId, initialAdSpec: canonicalAdSpec });
    }
  };

  const handleExportAll = () => {
    const data = JSON.stringify({ brief, strategy: strategy.masterStrategy, briefs: activation.downstreamBriefs }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign_strategy_${Date.now()}.json`;
    a.click();
  };

  const fetchWorkspaceStrategies = async () => {
    setIsLoadingHistory(true);
    try {
      const res: any = await apiClient.get('/api/campaign/strategy/workspace-history');
      const list = res.history || res.data?.history || [];
      setSavedStrategies(list);
    } catch (err) {
      console.warn('Failed to fetch workspace strategies:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenHistoryModal = () => {
    setShowHistoryModal(true);
    fetchWorkspaceStrategies();
  };

  const handleLoadSavedStrategy = async (stratId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      let stratData: any = null;
      try {
        const res: any = await apiClient.get(`/api/campaign/strategy/${stratId}`);
        stratData = res.strategy || res.data?.strategy;
      } catch (networkErr) {
        console.warn('API get strategy by id returned error, utilizing local fallback:', networkErr);
      }

      // Resilient fallback to item in savedStrategies if network returned null
      if (!stratData) {
        const local = savedStrategies.find(s => s.id === stratId);
        if (local) {
          stratData = {
            ...local,
            campaign_strategy_versions: local.versions && local.versions.length > 0 ? local.versions : [{
              version_number: local.version_number || 1,
              selected_territory: {
                id: `terr_${local.id}`,
                name: local.territory_name || local.title,
                premise: local.territory_premise || 'Strategic route synthesized.'
              },
              master_strategy: {
                bigIdea: `${local.title}: High-conviction campaign positioning.`,
                executiveSummary: { coreConcept: local.territory_name || local.title }
              }
            }]
          };
        }
      }

      if (stratData) {
        const versions = stratData.campaign_strategy_versions || stratData.versions || [];
        const latestVer = versions[versions.length - 1] || versions[0] || {};
        const territory = latestVer.selected_territory || latestVer.selectedTerritory || {
          id: `terr_${stratData.id}`,
          name: stratData.territory_name || stratData.title,
          premise: stratData.territory_premise || 'Strategic route synthesized.'
        };
        const masterStrategy = latestVer.master_strategy || latestVer.masterStrategy || {
          bigIdea: `${stratData.title}: High-conviction campaign positioning.`,
          executiveSummary: { coreConcept: territory.name }
        };
        const downstreamBriefs = latestVer.downstream_briefs || latestVer.downstreamBriefs || null;

        dispatch({
          type: 'REHYDRATE_STATE',
          payload: {
            journeyStep: downstreamBriefs?.canonicalAdSpec ? '05_activate' : '04_build_strategy',
            brief: {
              ...state.brief,
              campaignTitle: stratData.title || state.brief.campaignTitle
            },
            territories: {
              ...state.territories,
              selectedTerritoryId: territory.id,
              items: territory ? [territory] : state.territories.items
            },
            strategy: {
              ...state.strategy,
              masterStrategy,
              activeTab: 'executive'
            },
            activation: {
              ...state.activation,
              downstreamBriefs
            }
          }
        });
        setShowHistoryModal(false);
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Selected strategy details could not be found' });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err?.message || 'Failed to load strategy' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleResetCampaign = () => {
    if (window.confirm('Start a new campaign? Any unsaved edits in this session draft will be cleared.')) {
      dispatch({ type: 'RESET_CAMPAIGN' });
    }
  };

  const loaderStage: 'discovery' | 'territories' | 'synthesis' =
    journeyStep === '01_brief' ? 'discovery' :
    journeyStep === '02_discovery' ? 'territories' :
    'synthesis';

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 overflow-y-auto">
      {/* 5-Step Journey Navigation Bar */}
      <StrategyJourneyHeader
        onDismissError={() => dispatch({ type: 'SET_ERROR', payload: null })}
        onOpenHistory={handleOpenHistoryModal}
        onNewCampaign={handleResetCampaign}
      />

      {/* Animated Strategic Preloader with Progress Status Labels */}
      {loading && (
        <CampaignProcessLoader
          stage={loaderStage}
          campaignTitle={brief.campaignTitle}
          onCancel={() => dispatch({ type: 'SET_LOADING', payload: false })}
        />
      )}

      {/* Saved Workspace Strategies Manager */}
      <SavedStrategiesModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        savedStrategies={savedStrategies}
        isLoading={isLoadingHistory}
        onLoadStrategy={handleLoadSavedStrategy}
        onRefreshStrategies={fetchWorkspaceStrategies}
        hasUnsavedDraft={Boolean(state.strategy.masterStrategy || state.brief.briefDescription)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left 3 Columns: Active Stage Component */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {journeyStep === '01_brief' && (
              <BriefStage onStartDiscovery={handleStartDiscovery} brandName={brandGuidelines.name} industry={brandGuidelines.industry} />
            )}
            {journeyStep === '02_discovery' && (
              <DiscoveryStage onGenerateTerritories={handleGenerateTerritories} />
            )}
            {journeyStep === '03_strategic_routes' && (
              <TerritoryStage
                onLockTerritory={handleLockTerritory}
                onGenerateAlternative={handleGenerateAlternative}
                isGeneratingAlternative={isGeneratingAlternative}
                isLocking={loading}
              />
            )}
            {journeyStep === '04_build_strategy' && (
              <StrategyStage
                onRunStressTest={handleRunStressTest}
                onApplyPatch={handleApplyPatch}
                isStressTesting={isStressTesting}
                isPatching={isPatching}
              />
            )}
            {journeyStep === '05_activate' && (
              <ActivationStage onLaunchGem={handleLaunchGem} onExportAll={handleExportAll} />
            )}
          </AnimatePresence>
        </div>

        {/* Right 1 Column: Strategist's Whiteboard */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 text-left">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <Compass size={13} className="text-emerald-500" /> Strategist's Whiteboard
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Journey Stage</span>
                <p className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                  {journeyStep === '01_brief' && '01 BRIEF & SCOPE'}
                  {journeyStep === '02_discovery' && '02 ADAPTIVE DISCOVERY'}
                  {journeyStep === '03_strategic_routes' && '03 STRATEGIC ROUTES'}
                  {journeyStep === '04_build_strategy' && '04 MASTER STRATEGY'}
                  {journeyStep === '05_activate' && '05 CREATIVE HUB'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Readiness Audit</span>
                <p className="text-slate-700 dark:text-slate-300">
                  {discovery.discoveryConfidence ? `${Math.round(discovery.discoveryConfidence.confidenceScore * 100)}% (${discovery.discoveryConfidence.readiness?.overallStatus ? discovery.discoveryConfidence.readiness.overallStatus.replace(/_/g, ' ').toUpperCase() : (discovery.discoveryConfidence.confidenceScore >= 0.8 ? 'STRONG' : discovery.discoveryConfidence.confidenceScore >= 0.5 ? 'MODERATE' : 'EMERGING')})` : 'Pending submission'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Governance Guardrails</span>
                <p className="text-slate-700 dark:text-slate-300">
                  {brief.controls.ambitionLevel} • {brief.controls.riskTolerance} risk
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Target Region & Language</span>
                <p className="text-slate-700 dark:text-slate-300">
                  {brief.countryRegion} • {brief.campaignLanguage}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Selected Route</span>
                <p className="text-slate-700 dark:text-slate-300">
                  {territories.items.find(t => t.id === territories.selectedTerritoryId)?.title || territories.items.find(t => t.id === territories.selectedTerritoryId)?.name || 'Pending selection'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Canonical AdSpec v1</span>
                <p className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  {activation.downstreamBriefs?.canonicalAdSpec ? (
                    <span className="text-emerald-500 flex items-center gap-1 font-mono">
                      <CheckCircle2 size={11} /> Compiled v1.0.0
                    </span>
                  ) : (
                    'Awaiting compilation'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CampaignStrategistWorkspace: React.FC<CampaignStrategistWorkspaceProps> = (props) => {
  return (
    <CampaignStrategyProvider>
      <CampaignStrategistWorkspaceInner {...props} />
    </CampaignStrategyProvider>
  );
};
