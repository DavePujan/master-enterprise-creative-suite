import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type {
  AdaptiveQuestion,
  DiscoveryConfidence,
  StrategicTerritory,
  MasterCampaignStrategy,
  DownstreamBriefs,
  CampaignBriefControls,
  AmbitionLevel,
  RiskTolerance,
  BudgetReality,
  TimelineHorizon,
  BrandMaturity,
  GeographicScale,
  BusinessModelType,
  ProofItem,
  CompetitorKnowledgeSource,
  CampaignProductionPlan,
  StrategyPatch,
  StressTestReport
} from '../../../../../../packages/types/campaignStrategy.js';

export type JourneyStep =
  | '01_brief'
  | '02_discovery'
  | '03_strategic_routes'
  | '04_build_strategy'
  | '05_activate';

export interface CampaignStrategyState {
  journeyStep: JourneyStep;
  sessionId: string;
  generationId: string;
  loading: boolean;
  error: string | null;

  // Brief Stage State
  brief: {
    campaignTitle: string;
    briefDescription: string;
    targetAudience: string;
    selectedGoal: string;
    campaignLanguage: string;
    countryRegion: string;
    controls: {
      ambitionLevel: AmbitionLevel;
      riskTolerance: RiskTolerance;
      budgetReality: BudgetReality;
      approximateBudget: string;
      timelineHorizon: TimelineHorizon;
      brandMaturity: BrandMaturity;
      geographicScale: GeographicScale;
      businessModel: BusinessModelType;
      businessSector: string;
      proofAvailability: ProofItem[];
      mandatoryInclusions: string[];
      forbiddenTerritories: string[];
      competitorKnowledgeSource: CompetitorKnowledgeSource;
      competitorKnowledgeSources?: CompetitorKnowledgeSource[];
      competitorContext: {
        competitors: string;
        overusedPatterns: string;
        whiteSpaceOpportunity: string;
      };
      showAdvancedControls: boolean;
    };
  };

  // Discovery Stage State
  discovery: {
    adaptiveQuestions: AdaptiveQuestion[];
    discoveryAnswers: Record<string, string>;
    discoveryConfidence: DiscoveryConfidence | null;
    recommendedFrameworks: string[];
    isEvaluating: boolean;
    activeQuestionIndex: number;
  };

  // Territory Stage State
  territories: {
    items: StrategicTerritory[];
    selectedTerritoryId: string | null;
    directionVariant: 'divergent' | 'safe' | 'unconventional';
    isGenerating: boolean;
  };

  // Strategy Stage State
  strategy: {
    masterStrategy: MasterCampaignStrategy | null;
    selectedExecutionIndex: number;
    activeTab: 'executive' | 'audience' | 'creative' | 'matrix' | 'rollout' | 'audit';
    stressTestReport: StressTestReport | null;
    isStressTesting: boolean;
    isPatching: boolean;
    showPatchModal: boolean;
    patchFeedback: string;
    strategyHistory: Array<{ strategyId: string; versionNumber: number; title: string; createdAt: string }>;
  };

  // Activation Stage State
  activation: {
    downstreamBriefs: DownstreamBriefs | null;
    productionPlan: CampaignProductionPlan | null;
    activeBriefTab: 'text' | 'image' | 'video' | 'audio' | 'deck' | 'adspec' | 'production_plan';
    isStaging: boolean;
    stagedSuccess: boolean;
  };
}

export type CampaignStrategyAction =
  | { type: 'SET_JOURNEY_STEP'; payload: JourneyStep }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_BRIEF'; payload: Partial<CampaignStrategyState['brief']> }
  | { type: 'UPDATE_CONTROLS'; payload: Partial<CampaignStrategyState['brief']['controls']> }
  | {
      type: 'SET_DISCOVERY_DATA';
      payload: {
        questions: AdaptiveQuestion[];
        confidence: DiscoveryConfidence | null;
        frameworks: string[];
      };
    }
  | { type: 'SET_DISCOVERY_ANSWER'; payload: { questionId: string; answer: string } }
  | { type: 'SET_ACTIVE_QUESTION_INDEX'; payload: number }
  | { type: 'SET_DISCOVERY_EVALUATING'; payload: boolean }
  | { type: 'SET_TERRITORIES'; payload: StrategicTerritory[] }
  | { type: 'SELECT_TERRITORY'; payload: string }
  | { type: 'SET_TERRITORY_VARIANT'; payload: 'divergent' | 'safe' | 'unconventional' }
  | { type: 'SET_TERRITORIES_GENERATING'; payload: boolean }
  | { type: 'SET_MASTER_STRATEGY'; payload: MasterCampaignStrategy }
  | { type: 'SET_STRATEGY_TAB'; payload: CampaignStrategyState['strategy']['activeTab'] }
  | { type: 'SET_STRESS_TEST_REPORT'; payload: StressTestReport | null }
  | { type: 'SET_STRESS_TESTING'; payload: boolean }
  | { type: 'SET_PATCH_MODAL'; payload: boolean }
  | { type: 'SET_PATCH_FEEDBACK'; payload: string }
  | { type: 'SET_PATCHING'; payload: boolean }
  | { type: 'SET_STRATEGY_HISTORY'; payload: CampaignStrategyState['strategy']['strategyHistory'] }
  | { type: 'SET_DOWNSTREAM_BRIEFS'; payload: DownstreamBriefs }
  | { type: 'SET_PRODUCTION_PLAN'; payload: CampaignProductionPlan }
  | { type: 'SET_ACTIVE_BRIEF_TAB'; payload: CampaignStrategyState['activation']['activeBriefTab'] }
  | { type: 'SET_STAGING_STATUS'; payload: { isStaging: boolean; stagedSuccess?: boolean } }
  | { type: 'REHYDRATE_STATE'; payload: Partial<CampaignStrategyState> }
  | { type: 'RESET_CAMPAIGN' };

export const CAMPAIGN_DRAFT_STORAGE_KEY = 'writopedia_campaign_strategy_draft_v1';

export function loadDraftFromStorage(): CampaignStrategyState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CAMPAIGN_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.brief || !parsed.journeyStep) return null;
    return {
      ...initialCampaignStrategyState,
      ...parsed,
      loading: false,
      error: null,
      strategy: {
        ...initialCampaignStrategyState.strategy,
        ...(parsed.strategy || {}),
        isStressTesting: false,
        isPatching: false,
        showPatchModal: false
      },
      discovery: {
        ...initialCampaignStrategyState.discovery,
        ...(parsed.discovery || {}),
        isEvaluating: false
      },
      territories: {
        ...initialCampaignStrategyState.territories,
        ...(parsed.territories || {}),
        isGenerating: false
      },
      activation: {
        ...initialCampaignStrategyState.activation,
        ...(parsed.activation || {}),
        isStaging: false
      }
    };
  } catch (e) {
    console.warn('[CampaignStrategyContext] Failed to load draft from localStorage:', e);
    return null;
  }
}

export function saveDraftToStorage(state: CampaignStrategyState): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      journeyStep: state.journeyStep,
      brief: state.brief,
      discovery: state.discovery,
      territories: state.territories,
      strategy: state.strategy,
      activation: state.activation,
      sessionId: state.sessionId,
      generationId: state.generationId,
      savedAt: Date.now()
    };
    localStorage.setItem(CAMPAIGN_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('[CampaignStrategyContext] Failed to save draft to localStorage:', e);
  }
}

export function clearDraftFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CAMPAIGN_DRAFT_STORAGE_KEY);
  } catch {}
}

export const initialCampaignStrategyState: CampaignStrategyState = {
  journeyStep: '01_brief',
  sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  generationId: `gen_${Date.now()}`,
  loading: false,
  error: null,
  brief: {
    campaignTitle: 'Festive & Growth Campaign',
    briefDescription: '',
    targetAudience: '',
    selectedGoal: 'Sales & E-commerce',
    campaignLanguage: 'English',
    countryRegion: 'Global',
    controls: {
      ambitionLevel: 'balanced',
      riskTolerance: 'moderate',
      budgetReality: 'moderate',
      approximateBudget: '',
      timelineHorizon: 'quarterly_1_to_3_months',
      brandMaturity: 'established',
      geographicScale: 'national',
      businessModel: 'b2c',
      businessSector: '',
      proofAvailability: [
        { type: 'product_demos', strength: 'strong' },
        { type: 'performance_data', strength: 'moderate' }
      ],
      mandatoryInclusions: ['Price transparency', 'Founder credibility'],
      forbiddenTerritories: ['No celebrity endorsements', 'No race-to-the-bottom discounts'],
      competitorKnowledgeSource: 'provided_by_client',
      competitorKnowledgeSources: ['provided_by_client'],
      competitorContext: {
        competitors: '',
        overusedPatterns: '',
        whiteSpaceOpportunity: ''
      },
      showAdvancedControls: false
    }
  },
  discovery: {
    adaptiveQuestions: [],
    discoveryAnswers: {},
    discoveryConfidence: null,
    recommendedFrameworks: [],
    isEvaluating: false,
    activeQuestionIndex: 0
  },
  territories: {
    items: [],
    selectedTerritoryId: null,
    directionVariant: 'divergent',
    isGenerating: false
  },
  strategy: {
    masterStrategy: null,
    selectedExecutionIndex: 0,
    activeTab: 'executive',
    stressTestReport: null,
    isStressTesting: false,
    isPatching: false,
    showPatchModal: false,
    patchFeedback: '',
    strategyHistory: []
  },
  activation: {
    downstreamBriefs: null,
    productionPlan: null,
    activeBriefTab: 'adspec',
    isStaging: false,
    stagedSuccess: false
  }
};

function campaignStrategyReducer(
  state: CampaignStrategyState,
  action: CampaignStrategyAction
): CampaignStrategyState {
  switch (action.type) {
    case 'SET_JOURNEY_STEP':
      return { ...state, journeyStep: action.payload, error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'UPDATE_BRIEF':
      return { ...state, brief: { ...state.brief, ...action.payload } };
    case 'UPDATE_CONTROLS':
      return {
        ...state,
        brief: {
          ...state.brief,
          controls: { ...state.brief.controls, ...action.payload }
        }
      };
    case 'SET_DISCOVERY_DATA':
      return {
        ...state,
        discovery: {
          ...state.discovery,
          adaptiveQuestions: action.payload.questions,
          discoveryConfidence: action.payload.confidence,
          recommendedFrameworks: action.payload.frameworks
        }
      };
    case 'SET_DISCOVERY_ANSWER':
      return {
        ...state,
        discovery: {
          ...state.discovery,
          discoveryAnswers: {
            ...state.discovery.discoveryAnswers,
            [action.payload.questionId]: action.payload.answer
          }
        }
      };
    case 'SET_ACTIVE_QUESTION_INDEX':
      return {
        ...state,
        discovery: { ...state.discovery, activeQuestionIndex: action.payload }
      };
    case 'SET_DISCOVERY_EVALUATING':
      return {
        ...state,
        discovery: { ...state.discovery, isEvaluating: action.payload }
      };
    case 'SET_TERRITORIES':
      return {
        ...state,
        territories: {
          ...state.territories,
          items: action.payload,
          selectedTerritoryId: action.payload[0]?.id || null
        }
      };
    case 'SELECT_TERRITORY':
      return {
        ...state,
        territories: { ...state.territories, selectedTerritoryId: action.payload }
      };
    case 'SET_TERRITORY_VARIANT':
      return {
        ...state,
        territories: { ...state.territories, directionVariant: action.payload }
      };
    case 'SET_TERRITORIES_GENERATING':
      return {
        ...state,
        territories: { ...state.territories, isGenerating: action.payload }
      };
    case 'SET_MASTER_STRATEGY':
      return {
        ...state,
        strategy: { ...state.strategy, masterStrategy: action.payload }
      };
    case 'SET_STRATEGY_TAB':
      return {
        ...state,
        strategy: { ...state.strategy, activeTab: action.payload }
      };
    case 'SET_STRESS_TEST_REPORT':
      return {
        ...state,
        strategy: { ...state.strategy, stressTestReport: action.payload }
      };
    case 'SET_STRESS_TESTING':
      return {
        ...state,
        strategy: { ...state.strategy, isStressTesting: action.payload }
      };
    case 'SET_PATCH_MODAL':
      return {
        ...state,
        strategy: { ...state.strategy, showPatchModal: action.payload }
      };
    case 'SET_PATCH_FEEDBACK':
      return {
        ...state,
        strategy: { ...state.strategy, patchFeedback: action.payload }
      };
    case 'SET_PATCHING':
      return {
        ...state,
        strategy: { ...state.strategy, isPatching: action.payload }
      };
    case 'SET_STRATEGY_HISTORY':
      return {
        ...state,
        strategy: { ...state.strategy, strategyHistory: action.payload }
      };
    case 'SET_DOWNSTREAM_BRIEFS':
      return {
        ...state,
        activation: { ...state.activation, downstreamBriefs: action.payload }
      };
    case 'SET_PRODUCTION_PLAN':
      return {
        ...state,
        activation: { ...state.activation, productionPlan: action.payload }
      };
    case 'SET_ACTIVE_BRIEF_TAB':
      return {
        ...state,
        activation: { ...state.activation, activeBriefTab: action.payload }
      };
    case 'SET_STAGING_STATUS':
      return {
        ...state,
        activation: {
          ...state.activation,
          isStaging: action.payload.isStaging,
          stagedSuccess: action.payload.stagedSuccess ?? state.activation.stagedSuccess
        }
      };
    case 'REHYDRATE_STATE':
      return {
        ...state,
        ...action.payload,
        brief: { ...state.brief, ...(action.payload.brief || {}) },
        discovery: { ...state.discovery, ...(action.payload.discovery || {}) },
        territories: { ...state.territories, ...(action.payload.territories || {}) },
        strategy: { ...state.strategy, ...(action.payload.strategy || {}) },
        activation: { ...state.activation, ...(action.payload.activation || {}) },
        loading: false,
        error: null
      };
    case 'RESET_CAMPAIGN':
      clearDraftFromStorage();
      return {
        ...initialCampaignStrategyState,
        sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        generationId: `gen_${Date.now()}`
      };
    default:
      return state;
  }
}

const CampaignStrategyStateContext = createContext<CampaignStrategyState | undefined>(undefined);
const CampaignStrategyDispatchContext = createContext<React.Dispatch<CampaignStrategyAction> | undefined>(undefined);

export const CampaignStrategyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(campaignStrategyReducer, initialCampaignStrategyState, (init) => {
    const draft = loadDraftFromStorage();
    return draft ? draft : init;
  });

  // Auto-save draft on meaningful changes with 500ms debounce
  useEffect(() => {
    const hasMeaningfulContent = Boolean(
      state.brief.briefDescription ||
      state.brief.campaignTitle !== 'Festive & Growth Campaign' ||
      state.discovery.adaptiveQuestions.length > 0 ||
      state.territories.items.length > 0 ||
      state.strategy.masterStrategy ||
      state.journeyStep !== '01_brief'
    );

    if (!hasMeaningfulContent) return;

    const timer = setTimeout(() => {
      saveDraftToStorage(state);
    }, 500);

    return () => clearTimeout(timer);
  }, [state.brief, state.discovery, state.territories, state.strategy, state.activation, state.journeyStep]);

  return (
    <CampaignStrategyStateContext.Provider value={state}>
      <CampaignStrategyDispatchContext.Provider value={dispatch}>
        {children}
      </CampaignStrategyDispatchContext.Provider>
    </CampaignStrategyStateContext.Provider>
  );
};

export function useCampaignStrategy(): [CampaignStrategyState, React.Dispatch<CampaignStrategyAction>] {
  const state = useContext(CampaignStrategyStateContext);
  const dispatch = useContext(CampaignStrategyDispatchContext);
  if (state === undefined || dispatch === undefined) {
    throw new Error('useCampaignStrategy must be used within a CampaignStrategyProvider');
  }
  return [state, dispatch];
}
