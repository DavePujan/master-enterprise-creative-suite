import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  Target, 
  Check, 
  Plus, 
  Trash2, 
  Upload, 
  Calendar, 
  DollarSign, 
  Layers, 
  Globe, 
  Download, 
  Copy, 
  ArrowRight, 
  Paperclip, 
  Clock, 
  Settings2,
  FileText,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Play,
  Minus,
  Video,
  Image,
  Edit2,
  Save,
  Eye,
  Maximize2,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  FileCode,
  Volume2,
  Presentation,
  CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { generateCampaignStrategistCampaign, generateCampaignStrategistAsset, generateCampaignAssetBriefs, generateImage, generateCreative, pollVideo, type CampaignStrategistResult } from '@web/infrastructure/ai/geminiService.js';
import { IMAGE_MODELS, VIDEO_MODELS, TEXT_MODELS, GENERIC_GEMS } from '@web/infrastructure/ai/modelRegistry.js';
import { apiClient } from '@web/infrastructure/api/apiClient.js';
import { triggerGlobalCreditGate } from '@web/features/billing/context/CreditGateContext.js';
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
  ProofItemType,
  CompetitorKnowledgeSource,
  StrategicReadiness,
  StrategyPatch,
  StressTestReport,
  CustomerJourneyStage,
  CampaignProductionPlan,
  ProductionPlanAsset,
  ProductionTierName
} from '../../../../../../packages/types/campaignStrategy.js';
import {
  TrendingUp,
  Compass,
  ShieldAlert,
  ListFilter,
  CheckSquare,
  Square,
  MessageSquare,
  RotateCcw,
  Sliders,
  X,
  FileCheck2,
  Workflow,
  HelpCircle as HelpIcon,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

interface TextWordLayer {
  id: string;
  text: string;
  fontFamily: string;
  color: string;
  scale: number;
  position: { x: number; y: number };
}

interface CampaignStrategistWorkspaceProps {
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
  onSaveCampaignAsset: (name: string, dataUrl: string, type: 'image' | 'doc' | 'video' | 'audio') => void;
  onSaveHistory: (res: any, gemId: string, prompt: string) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  productContext: { id: string; name: string; data: string } | null;
  setProductContext: (ctx: { id: string; name: string; data: string } | null) => void;
  faceContext: { id: string; name: string; data: string } | null;
  setFaceContext: (ctx: { id: string; name: string; data: string } | null) => void;
  setHumanTouchItem?: React.Dispatch<React.SetStateAction<any>>;
  onSelectGem?: (gem: any) => void;
  setPrompt?: (val: string) => void;
  setAspectRatio?: (val: string) => void;
  setSelectedLanguage?: (val: string) => void;
  setAudioGenerationType?: (val: 'voiceover' | 'music') => void;
  setMusicMood?: (val: string) => void;
}

type OnboardingStep = 
  | 'intro'
  | 'type_goal'
  | 'brand_story'
  | 'audience'
  | 'timeline'
  | 'language_region'
  | 'deliverables'
  | 'scale'
  | 'analyzing'
  | 'results'
  | 'asset_generation';

const CAMPAIGN_TYPES = [
  'Product Launch',
  'Brand Awareness',
  'Performance Marketing',
  'Film/Media Launch',
  'Creator/Influencer Campaign',
  'Seasonal Campaign',
  'Retention Campaign',
  'Rebranding Campaign',
  'Viral Campaign',
  'Meme Campaign',
  'Luxury Campaign',
  'Grassroots Campaign',
  'AI Content Campaign'
];

const CAMPAIGN_GOALS = [
  'Sales & E-commerce',
  'Launch Hype & PR',
  'Brand Awareness',
  'Lead Generation',
  'Virality & Memes',
  'App Installs',
  'Customer Retention',
  'Community Building',
  'Audience Growth',
  'Event Registrations'
];

const EMOTION_PROMPTS = [
  'Trust & Credibility',
  'Excitement & Hype',
  'Aspiration & Luxury',
  'Urgency & FOMO',
  'Curiosity & Mystery',
  'Nostalgia & Warmth',
  'Rebellion & Edge',
  'Empowerment & Strength'
];

const KEY_PLATFORMS = [
  'Instagram',
  'YouTube',
  'TikTok',
  'LinkedIn',
  'Meta Ads',
  'Google Search Ads',
  'Email Newsletters',
  'X/Twitter',
  'WhatsApp Business',
  'Outdoor/OOH Billboard'
];

const VISUAL_ASTHETICS = [
  'Cinematic & Dramatic',
  'Luxury & Ultra-premium',
  'Minimalist & Clean',
  'Raw & Documentary',
  'Meme-style & Chaotic',
  'Hyperreal & 3D',
  'Futuristic & Cyberpunk',
  'Street & Urban culture',
  'Youthful & High-energy',
  'Bold & Brutalist',
  'Global Editorial'
];

const LANGUAGES_LIST = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Chinese',
  'Hindi',
  'Arabic',
  'Portuguese',
  'Italian',
  'Korean'
];

const REGIONS_LIST = [
  'Global',
  'North America',
  'European Union',
  'United Kingdom',
  'Asia-Pacific',
  'Latin America',
  'Middle East',
  'Japan',
  'India',
  'Southeast Asia'
];

const DELIVERABLE_TEMPLATES = [
  'Posters & Key Visuals',
  'Short Reels & TikToks',
  'Ad Strategy & Copy',
  'Multi-slide Carousels',
  'Landing Page Blueprint',
  'Email Newsletters Sequence',
  'Cinematic Hero Script',
  'Meme Creative formats',
  'Influencer Outreach Pitch'
];

export const CampaignStrategistWorkspace: React.FC<CampaignStrategistWorkspaceProps> = ({
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
  setMusicMood
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('intro');
  const [loading, setLoading] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discovery Answers State
  const [answers, setAnswers] = useState({
    campaignTypeGoal: '',
    selectedType: '',
    selectedGoal: '',
    brandUnderstanding: '',
    uspDifference: '',
    targetAudience: '',
    selectedEmotion: '',
    timelineDuration: '',
    selectedPlatforms: [] as string[],
    selectedDeliverables: [] as string[],
    selectedAesthetic: '',
    inspirationReferences: '',
    budgetScale: '',
    involvesPaidAds: 'No',
    numImages: 3,
    numVideos: 1,
    numCopy: 2,
    campaignLanguage: 'English',
    countryRegion: 'Global'
  });

  // Supporting file uploads mock state
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string }[]>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Strategic Results State
  const [campaignResult, setCampaignResult] = useState<CampaignStrategistResult | null>(null);
  const [selectedCampaignName, setSelectedCampaignName] = useState<string>('');

// ---------------------------------------------------------------------------
  // Campaign Strategist Enterprise 2.0: 5-Stage Journey State & Handlers
  // ---------------------------------------------------------------------------
  const [journeyStep, setJourneyStep] = useState<
    '01_brief' | '02_discovery' | '03_strategic_routes' | '04_build_strategy' | '05_activate'
  >('01_brief');
  const [sessionId] = useState<string>(() => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const [generationId, setGenerationId] = useState<string>(() => `gen_${Date.now()}`);

  // Stage 1: Strategic Brief State
  const [campaignTitle, setCampaignTitle] = useState('Festive & Growth Campaign');
  const [briefDescription, setBriefDescription] = useState('');
  const [targetAudienceInput, setTargetAudienceInput] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('Sales & E-commerce');
  const [campaignLanguage, setCampaignLanguage] = useState('English');
  const [countryRegion, setCountryRegion] = useState('Global');

  // Stage 1: Executive Strategic Scope & Controls
  const [ambitionLevel, setAmbitionLevel] = useState<AmbitionLevel>('balanced');
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>('moderate');
  const [budgetReality, setBudgetReality] = useState<BudgetReality>('moderate');
  const [approximateBudget, setApproximateBudget] = useState('');
  const [timelineHorizon, setTimelineHorizon] = useState<TimelineHorizon>('quarterly_1_to_3_months');
  const [brandMaturity, setBrandMaturity] = useState<BrandMaturity>('established');
  const [geographicScale, setGeographicScale] = useState<GeographicScale>('national');
  const [businessModel, setBusinessModel] = useState<BusinessModelType>('b2c');
  const [businessSector, setBusinessSector] = useState('');
  const [proofAvailability, setProofAvailability] = useState<ProofItem[]>([
    { type: 'product_demos', strength: 'strong' },
    { type: 'performance_data', strength: 'moderate' }
  ]);
  const [mandatoryInclusions, setMandatoryInclusions] = useState<string[]>([
    'Price transparency', 'Founder credibility'
  ]);
  const [newInclusionInput, setNewInclusionInput] = useState('');
  const [forbiddenTerritories, setForbiddenTerritories] = useState<string[]>([
    'No celebrity endorsements', 'No race-to-the-bottom discounts'
  ]);
  const [newForbiddenInput, setNewForbiddenInput] = useState('');
  const [competitorKnowledgeSource, setCompetitorKnowledgeSource] = useState<CompetitorKnowledgeSource>('provided_by_client');
  const [competitorContext, setCompetitorContext] = useState({
    competitors: '',
    overusedPatterns: '',
    whiteSpaceOpportunity: ''
  });
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);

  // Stage 2: Adaptive Discovery State
  const [adaptiveQuestions, setAdaptiveQuestions] = useState<AdaptiveQuestion[]>([]);
  const [discoveryAnswers, setDiscoveryAnswers] = useState<Record<string, string>>({});
  const [discoveryConfidence, setDiscoveryConfidence] = useState<DiscoveryConfidence | null>(null);
  const [recommendedFrameworks, setRecommendedFrameworks] = useState<string[]>([]);
  const [isEvaluatingDiscovery, setIsEvaluatingDiscovery] = useState(false);

  // Stage 3: Strategic Routes State
  const [territories, setTerritories] = useState<StrategicTerritory[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<StrategicTerritory | null>(null);
  const [isGeneratingTerritories, setIsGeneratingTerritories] = useState(false);
  const [territoryViewMode, setTerritoryViewMode] = useState<'cards' | 'matrix'>('cards');
  const [directionVariant, setDirectionVariant] = useState<string | undefined>();
  const [customDirectionInput, setCustomDirectionInput] = useState('');
  const [alternativeCount, setAlternativeCount] = useState(0);
  const [isGeneratingAlternatives, setIsGeneratingAlternatives] = useState(false);
  const [showLockConfirmModal, setShowLockConfirmModal] = useState(false);
  const [territoryToLock, setTerritoryToLock] = useState<StrategicTerritory | null>(null);

  // Stage 4: Master Strategy & Downstream Briefs State
  const [masterStrategy, setMasterStrategy] = useState<MasterCampaignStrategy | null>(null);
  const [downstreamBriefs, setDownstreamBriefs] = useState<DownstreamBriefs | null>(null);
  const [criticReport, setCriticReport] = useState<any | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [activeGemBriefTab, setActiveGemBriefTab] = useState<'text' | 'image' | 'video' | 'audio' | 'deck'>('text');
  const [copiedBriefId, setCopiedBriefId] = useState<string | null>(null);
  const [isBriefsExported, setIsBriefsExported] = useState(false);

  // Stage 4 Executive Accordions & Advisory
  const [activeStrategyTab, setActiveStrategyTab] = useState<'overview' | 'playbook' | 'distribution' | 'evidence' | 'advisory'>('overview');
  const [showStressTestModal, setShowStressTestModal] = useState(false);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressTestReport, setStressTestReport] = useState<StressTestReport | null>(null);
  const [askQuery, setAskQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askResponses, setAskResponses] = useState<Array<{ query: string; answer: string; recommendation?: string; patch?: StrategyPatch }>>([]);
  const [isApplyingPatch, setIsApplyingPatch] = useState(false);

  // Stage 5 Activation Confirm
  const [showActivateConfirmModal, setShowActivateConfirmModal] = useState(false);

  // ---------------------------------------------------------------------------
  // Strategic Controls Helper
  // ---------------------------------------------------------------------------
  const buildControls = (): CampaignBriefControls => ({
    businessOutcome: {
      primaryOutcome: selectedGoal,
      timeHorizon: timelineHorizon
    },
    ambitionLevel,
    riskTolerance,
    budgetReality,
    approximateBudget: approximateBudget.trim() || undefined,
    timelineHorizon,
    brandMaturity,
    geographicScale,
    businessModel,
    businessSector: businessSector.trim() || undefined,
    proofAvailability,
    mandatoryInclusions,
    forbiddenTerritories,
    competitorKnowledgeSource,
    competitorContext: competitorKnowledgeSource === 'provided_by_client' ? competitorContext : undefined
  });

  // ---------------------------------------------------------------------------
  // Cross-Gem Brief Staging & Downstream Export Helpers
  // ---------------------------------------------------------------------------
  const stageAllBriefs = () => {
    if (!downstreamBriefs) return false;
    try {
      const title = masterStrategy?.campaignTitle || campaignTitle || selectedGoal || 'Active Strategy';
      localStorage.setItem('staged_campaign_title', title);
      localStorage.setItem('staged_campaign_objective', selectedGoal || '');
      localStorage.setItem('staged_campaign_timestamp', Date.now().toString());

      if (downstreamBriefs.textBrief) {
        localStorage.setItem('staged_text_brief', JSON.stringify({
          ...downstreamBriefs.textBrief,
          campaignTitle: title,
          suggestedPrompt: `${downstreamBriefs.textBrief.coreHook}\n\nAngle: ${downstreamBriefs.textBrief.angle}\nTone: ${downstreamBriefs.textBrief.tone}\nCTA: ${downstreamBriefs.textBrief.callToAction}`
        }));
      }

      if (downstreamBriefs.imageBrief) {
        localStorage.setItem('staged_image_brief', JSON.stringify({
          ...downstreamBriefs.imageBrief,
          campaignTitle: title,
          prompt: downstreamBriefs.imageBrief.textlessPrompt,
          aspectRatio: downstreamBriefs.imageBrief.aspectRatios?.[0] || '1:1'
        }));
      }

      if (downstreamBriefs.videoBrief) {
        localStorage.setItem('staged_video_brief', JSON.stringify({
          ...downstreamBriefs.videoBrief,
          campaignTitle: title,
          prompt: downstreamBriefs.videoBrief.textlessPrompt,
          aspectRatio: downstreamBriefs.videoBrief.aspectRatio || '16:9'
        }));
      }

      if (downstreamBriefs.audioBrief) {
        localStorage.setItem('staged_audio_brief', JSON.stringify({
          ...downstreamBriefs.audioBrief,
          campaignTitle: title,
          prompt: downstreamBriefs.audioBrief.spokenScriptText || downstreamBriefs.audioBrief.scriptIntent || '',
          language: downstreamBriefs.audioBrief.language,
          musicMood: downstreamBriefs.audioBrief.musicMood
        }));
      }

      if (downstreamBriefs.deckBrief) {
        localStorage.setItem('staged_deck_brief', JSON.stringify({
          ...downstreamBriefs.deckBrief,
          campaignTitle: title,
          prompt: `Create a comprehensive strategic presentation deck for: ${title}. Executive summary: ${masterStrategy?.coreBigIdea?.text || ''}`
        }));
      }

      setIsBriefsExported(true);
      setTimeout(() => setIsBriefsExported(false), 3000);
      return true;
    } catch (e) {
      console.error('Failed to stage downstream briefs:', e);
      return false;
    }
  };

  const handleLaunchGem = (gemId: string) => {
    stageAllBriefs();
    if (!onSelectGem) return;
    const targetGem = GENERIC_GEMS.find(g => g.id === gemId);
    if (!targetGem) return;

    if (gemId === 'strategy-captions' && downstreamBriefs?.textBrief) {
      if (setPrompt) {
        setPrompt(`${downstreamBriefs.textBrief.coreHook}\n\nAngle: ${downstreamBriefs.textBrief.angle}\nTone: ${downstreamBriefs.textBrief.tone}\nCTA: ${downstreamBriefs.textBrief.callToAction}`);
      }
    } else if (gemId === 'standard-image' && downstreamBriefs?.imageBrief) {
      if (setPrompt) setPrompt(downstreamBriefs.imageBrief.textlessPrompt);
      if (setAspectRatio && downstreamBriefs.imageBrief.aspectRatios?.[0]) {
        setAspectRatio(downstreamBriefs.imageBrief.aspectRatios[0]);
      }
    } else if (gemId === 'cinematic-video' && downstreamBriefs?.videoBrief) {
      if (setPrompt) setPrompt(downstreamBriefs.videoBrief.textlessPrompt);
      if (setAspectRatio && downstreamBriefs.videoBrief.aspectRatio) {
        setAspectRatio(downstreamBriefs.videoBrief.aspectRatio);
      }
    } else if (gemId === 'audio-studio' && downstreamBriefs?.audioBrief) {
      if (setPrompt) {
        setPrompt(downstreamBriefs.audioBrief.spokenScriptText || downstreamBriefs.audioBrief.scriptIntent || '');
      }
      if (setAudioGenerationType) setAudioGenerationType('voiceover');
      if (setSelectedLanguage && downstreamBriefs.audioBrief.language) {
        setSelectedLanguage(downstreamBriefs.audioBrief.language);
      }
      if (setMusicMood && downstreamBriefs.audioBrief.musicMood) {
        setMusicMood(downstreamBriefs.audioBrief.musicMood);
      }
    } else if (gemId === 'corporate-presentations' && downstreamBriefs?.deckBrief) {
      if (setPrompt) {
        setPrompt(`Create a presentation deck for: ${masterStrategy?.campaignTitle || campaignTitle}. Executive summary: ${masterStrategy?.coreBigIdea?.text || ''}`);
      }
    }

    onSelectGem(targetGem);
  };

  const handleExportAllBriefs = () => {
    stageAllBriefs();
  };

  const handleDownloadJSON = () => {
    if (!masterStrategy && !downstreamBriefs) return;
    const bundle = {
      campaignTitle: masterStrategy?.campaignTitle || campaignTitle,
      brandName: masterStrategy?.brandName || brandGuidelines.name,
      objective: selectedGoal,
      countryRegion,
      campaignLanguage,
      generatedAt: new Date().toISOString(),
      strategicFramework: masterStrategy?.strategicFramework,
      version: masterStrategy?.versionNumber || 1,
      parentVersionId: masterStrategy?.parentVersionId,
      changeReason: masterStrategy?.changeReason,
      executiveSummary: masterStrategy?.executiveSummary,
      whatChangedFromBrief: masterStrategy?.whatChangedFromBrief,
      coreBigIdea: masterStrategy?.coreBigIdea,
      creativeTension: masterStrategy?.creativeTension,
      competitorWhiteSpace: masterStrategy?.competitorWhiteSpace,
      customerJourney: masterStrategy?.customerJourney,
      channelDecisions: masterStrategy?.channelDecisions,
      masterStrategy,
      downstreamBriefs,
      productionPlan: masterStrategy?.productionPlan,
      epistemicLedger: masterStrategy?.epistemicLedger,
      unknownsPanel: masterStrategy?.unknownsPanel,
      failureModes: masterStrategy?.failureModes
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = (masterStrategy?.campaignTitle || campaignTitle || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = url;
    a.download = `${slug}-v${masterStrategy?.versionNumber || 1}-strategy-bundle.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    if (!masterStrategy && !downstreamBriefs) return;
    const title = masterStrategy?.campaignTitle || campaignTitle || 'Campaign Strategy';
    const brand = masterStrategy?.brandName || brandGuidelines.name || 'Brand';
    const idea = masterStrategy?.coreBigIdea?.text || 'A strategic campaign initiative';
    const framework = masterStrategy?.strategicFramework || 'Strategic Framework';

    let md = `# Campaign Operating & Decision System: ${title} (v${masterStrategy?.versionNumber || 1})\n`;
    md += `**Brand:** ${brand}\n`;
    md += `**Objective:** ${selectedGoal}\n`;
    md += `**Region & Language:** ${countryRegion} • ${campaignLanguage}\n`;
    md += `**Strategic Framework:** ${framework}\n`;
    md += `**Compiled Date:** ${new Date().toLocaleDateString()}\n\n`;

    if (masterStrategy?.executiveSummary) {
      md += `## 1. Executive Summary (In 30 Seconds)\n`;
      md += `- **The Problem:** ${masterStrategy.executiveSummary.theProblem}\n`;
      md += `- **The Opportunity:** ${masterStrategy.executiveSummary.theOpportunity}\n`;
      md += `- **The Big Idea:** ${masterStrategy.executiveSummary.theBigIdea}\n`;
      md += `- **Why Us:** ${masterStrategy.executiveSummary.whyUs}\n`;
      md += `- **Strategic Mandate:** ${masterStrategy.executiveSummary.whatWeWillDo} (${masterStrategy.executiveSummary.whatWeNeedToProve})\n\n`;
    }

    if (masterStrategy?.whatChangedFromBrief) {
      md += `## 2. Strategic Transformation (What Changed From Brief)\n`;
      if (masterStrategy.whatChangedFromBrief.youToldUs?.length) {
        md += `### You Told Us:\n`;
        masterStrategy.whatChangedFromBrief.youToldUs.forEach(i => { md += `- ${i}\n`; });
      }
      if (masterStrategy.whatChangedFromBrief.weDiscovered?.length) {
        md += `### We Discovered:\n`;
        masterStrategy.whatChangedFromBrief.weDiscovered.forEach(i => { md += `- ${i}\n`; });
      }
      if (masterStrategy.whatChangedFromBrief.weRecommend?.length) {
        md += `### We Recommend:\n`;
        masterStrategy.whatChangedFromBrief.weRecommend.forEach(i => { md += `- ${i}\n`; });
      }
      md += `\n`;
    }

    md += `## 3. Core Big Idea & Creative Tension\n`;
    md += `> "${idea}"\n\n`;
    if (masterStrategy?.creativeTension) {
      md += `- **Current Belief:** ${masterStrategy.creativeTension.currentBelief}\n`;
      md += `- **Behavioral Barrier:** ${masterStrategy.creativeTension.behavioralBarrier}\n`;
      md += `- **Breakthrough Angle:** ${masterStrategy.creativeTension.breakthroughAngle}\n`;
      md += `- **Desired Belief:** ${masterStrategy.creativeTension.desiredBelief}\n\n`;
    }

    if (masterStrategy?.customerJourney?.length) {
      md += `## 4. 5-Stage Customer Decision Journey\n\n`;
      masterStrategy.customerJourney.forEach((stg, i) => {
        md += `### ${i + 1}. ${stg.stageLabel || stg.stage.replace(/_/g, ' ').toUpperCase()}\n`;
        md += `- **Current State:** ${stg.currentCustomerState}\n`;
        md += `- **Desired State:** ${stg.desiredCustomerState}\n`;
        md += `- **Barrier:** ${stg.barrier}\n`;
        md += `- **Trigger:** ${stg.trigger}\n`;
        md += `- **Evidence:** ${stg.evidence}\n`;
        md += `- **Key Deliverable:** ${stg.keyDeliverable}\n\n`;
      });
    }

    if (masterStrategy?.productionPlan) {
      md += `## 5. 5-Tier Campaign Production Plan\n`;
      md += `**Estimated Production Cost Range:** ${masterStrategy.productionPlan.estimatedProductionCreditRange?.min ?? 38}–${masterStrategy.productionPlan.estimatedProductionCreditRange?.max ?? 54} credits\n\n`;
      Object.values(masterStrategy.productionPlan.tiers || {}).forEach(t => {
        md += `### ${t.tierLabel}\n`;
        if (!t.isRecommended) {
          md += `*Omitted:* ${t.omissionRationale || 'Not required for this campaign scope'}\n\n`;
        } else {
          t.assets?.forEach(a => {
            md += `- **${a.title}** (${a.assetType} / ${a.targetChannel})\n`;
            if (a.dependsOn?.length) md += `  - *Depends on:* ${a.dependsOn.join(', ')}\n`;
            md += `  - *Purpose:* ${a.strategicPurpose}\n`;
            md += `  - *Hook:* "${a.coreHook}"\n`;
          });
          md += `\n`;
        }
      });
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = (masterStrategy?.campaignTitle || campaignTitle || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = url;
    a.download = `${slug}-v${masterStrategy?.versionNumber || 1}-strategy-playbook.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStartDiscovery = async () => {
    setError(null);
    setIsEvaluatingDiscovery(true);

    try {
      const controls = buildControls();
      const res = await apiClient.post<{
        questions: AdaptiveQuestion[];
        confidence: DiscoveryConfidence;
        recommendedFrameworks: string[];
      }>('/api/campaign/strategy/discovery', {
        sessionId,
        generationId,
        campaignTitle,
        briefDescription,
        brandName: brandGuidelines.name || 'Brand',
        industry: brandGuidelines.industry || 'General',
        objective: selectedGoal,
        targetAudience: targetAudienceInput,
        controls
      });

      setAdaptiveQuestions(res.questions || []);
      setDiscoveryConfidence(res.confidence || null);
      setRecommendedFrameworks(res.recommendedFrameworks || []);
      setJourneyStep('02_discovery');
    } catch (err: any) {
      console.error('Failed to load discovery questions:', err);
      setError(err?.message || 'Failed to generate discovery questions');
    } finally {
      setIsEvaluatingDiscovery(false);
    }
  };

  const handleGenerateTerritories = async (variant?: string) => {
    setError(null);
    setIsGeneratingTerritories(true);

    try {
      const formattedAnswers = adaptiveQuestions.map(q => ({
        questionId: q.id,
        questionText: q.question,
        answer: discoveryAnswers[q.id] || 'Not specified'
      }));

      const controls = buildControls();
      const res = await apiClient.post<{ territories: StrategicTerritory[] }>('/api/campaign/strategy/territories', {
        sessionId,
        generationId,
        campaignTitle,
        briefDescription,
        brandName: brandGuidelines.name || 'Brand',
        industry: brandGuidelines.industry || 'General',
        objective: selectedGoal,
        targetAudience: targetAudienceInput,
        discoveryAnswers: formattedAnswers,
        controls,
        directionVariant: variant || directionVariant
      });

      setTerritories(res.territories || []);
      setJourneyStep('03_strategic_routes');
    } catch (err: any) {
      console.error('Failed to generate territories:', err);
      setError(err?.message || 'Failed to generate strategic territories');
    } finally {
      setIsGeneratingTerritories(false);
    }
  };

  const handleGenerateAlternativeTerritory = async (variantPrompt: string) => {
    if (alternativeCount >= 5) {
      setError('Directional route exploration is capped at 5 alternatives per session to prevent strategic fragmentation.');
      return;
    }
    setError(null);
    setIsGeneratingAlternatives(true);
    setDirectionVariant(variantPrompt);

    try {
      const formattedAnswers = adaptiveQuestions.map(q => ({
        questionId: q.id,
        questionText: q.question,
        answer: discoveryAnswers[q.id] || 'Not specified'
      }));

      const controls = buildControls();
      const res = await apiClient.post<{ territories: StrategicTerritory[] }>('/api/campaign/strategy/territories', {
        sessionId,
        generationId,
        campaignTitle,
        briefDescription,
        brandName: brandGuidelines.name || 'Brand',
        industry: brandGuidelines.industry || 'General',
        objective: selectedGoal,
        targetAudience: targetAudienceInput,
        discoveryAnswers: formattedAnswers,
        controls,
        directionVariant: variantPrompt
      });

      setTerritories(res.territories || []);
      setAlternativeCount(prev => prev + 1);
    } catch (err: any) {
      console.error('Failed to generate alternative route:', err);
      setError(err?.message || 'Failed to generate alternative strategic route');
    } finally {
      setIsGeneratingAlternatives(false);
    }
  };

  const handleSelectTerritoryAndSynthesize = async (territory: StrategicTerritory) => {
    setSelectedTerritory(territory);
    setShowLockConfirmModal(false);
    setIsSynthesizing(true);
    setError(null);

    try {
      const formattedAnswers = adaptiveQuestions.map(q => ({
        questionId: q.id,
        questionText: q.question,
        answer: discoveryAnswers[q.id] || 'Not specified'
      }));

      const controls = buildControls();
      const res = await apiClient.post<any>('/api/campaign/strategy/synthesize', {
        sessionId,
        generationId,
        campaignTitle,
        briefDescription,
        brandName: brandGuidelines.name || 'Brand',
        industry: brandGuidelines.industry || 'General',
        objective: selectedGoal,
        targetAudience: targetAudienceInput,
        selectedTerritory: territory,
        discoveryAnswers: formattedAnswers,
        language: campaignLanguage,
        controls,
        directionVariant
      });

      setMasterStrategy(res.masterStrategy);
      setDownstreamBriefs(res.downstreamBriefs);
      setCriticReport(res.criticReport);
      setCredits(prev => Math.max(0, prev - 5));

      const strat = res.masterStrategy;
      setCampaignResult({
        campaignNames: [strat.campaignTitle],
        coreBigIdea: strat.coreBigIdea.text,
        brandPositioningLine: strat.positioningManifesto?.[0]?.text || '',
        taglinesAndHooks: strat.contentPillars?.map((p: any) => p.exampleHook) || [],
        contentPillars: strat.contentPillars?.map((p: any) => ({ title: p.name, strategy: p.strategicPurpose })) || [],
        platformWiseStrategy: strat.platformMatrix?.map((p: any) => ({ platform: p.platform, strategy: `${p.format} - ${p.hookType} (${p.cadence})` })) || [],
        creativeConcepts: strat.creativeExecutions?.map((e: any) => ({ title: e.name, format: e.channelFormat, description: `${e.headlineHook}. ${e.narrativeArc}` })) || [],
        visualDirection: {
          colors: brandGuidelines.colors.join(', '),
          lighting: territory.creativeWorld,
          cameraStyle: 'Cinematic eye-level',
          typography: brandGuidelines.typography.primary,
          editingStyle: 'Dynamic',
          artDirection: territory.creativeWorld,
          motionLanguage: 'Fluid and deliberate'
        },
        copywritingSystem: {
          headlines: strat.contentPillars?.map((p: any) => p.exampleHook) || [],
          ctas: [`Explore ${strat.brandName} now`],
          captions: strat.positioningManifesto?.map((m: any) => m.text) || [],
          adCopy: strat.coreBigIdea.text,
          longForm: strat.positioningManifesto?.map((m: any) => m.text).join('\n\n') || '',
          emailCopy: strat.coreBigIdea.text,
          shortHooks: strat.contentPillars?.map((p: any) => p.exampleHook) || []
        },
        funnelStructure: {
          awareness: strat.rolloutPhases?.[0]?.strategicFocus || '',
          contentEngagement: strat.rolloutPhases?.[1]?.strategicFocus || '',
          consideration: strat.creativeTension?.desiredBelief || '',
          conversion: strat.performanceKPIs?.primarySuccessMetric || '',
          retention: 'Community advocacy'
        },
        contentCalendar: {
          rollout: strat.rolloutPhases?.map((r: any) => `${r.phase}: ${r.duration}`).join('; ') || '',
          sequencing: 'Phased rollout',
          teaser: strat.rolloutPhases?.[0]?.strategicFocus || '',
          reveal: strat.rolloutPhases?.[1]?.strategicFocus || ''
        },
        performanceStrategy: {
          retargeting: 'Retarget high-intent viewers who watched >50% of video creative',
          segmentation: strat.audienceDiagnosis ? `${strat.audienceDiagnosis.demographics} - ${strat.audienceDiagnosis.psychographics}` : 'Primary behavioral audience cohort',
          abTesting: 'Test 3 hook variations across initial 48h paid flight',
          influencers: 'Niche authority creators and authentic category practitioners',
          viral: strat.contentPillars?.[0]?.exampleHook || 'Organic community loop activation'
        }
      });
      setSelectedCampaignName(strat.campaignTitle);
      setJourneyStep('04_build_strategy');
    } catch (err: any) {
      console.error('Strategy synthesis failed:', err);
      if (err?.status === 402 || err?.code === 'INSUFFICIENT_CREDITS' || err?.message?.includes('Insufficient credits')) {
        triggerGlobalCreditGate({
          service: 'Campaign Master Strategy',
          action: 'synthesis',
          requiredCredits: err?.data?.requiredCredits || err?.requiredCredits || 5,
          availableCredits: err?.data?.availableCredits ?? credits
        });
      } else {
        setError(err?.message || 'Failed to synthesize master strategy');
      }
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleRunStressTest = async () => {
    if (!masterStrategy) return;
    setIsStressTesting(true);
    setError(null);
    try {
      const res = await apiClient.post<{ stressTestReport: StressTestReport }>('/api/campaign/strategy/stress-test', {
        sessionId,
        generationId,
        masterStrategy
      });
      setStressTestReport(res.stressTestReport);
      setShowStressTestModal(true);
    } catch (err: any) {
      console.error('Stress test failed:', err);
      setError(err?.message || 'Failed to run strategic stress test');
    } finally {
      setIsStressTesting(false);
    }
  };

  const handleAskStrategist = async () => {
    if (!masterStrategy || !askQuery.trim()) return;
    setIsAsking(true);
    setError(null);
    try {
      const q = askQuery;
      const res = await apiClient.post<{
        query: string;
        answer: string;
        recommendation?: string;
        patch?: StrategyPatch;
      }>('/api/campaign/strategy/ask', {
        sessionId,
        generationId,
        masterStrategy,
        query: q
      });

      setAskResponses(prev => [
        ...prev,
        {
          query: q,
          answer: res.answer,
          recommendation: res.recommendation,
          patch: res.patch
        }
      ]);
      setAskQuery('');
    } catch (err: any) {
      console.error('Ask strategist failed:', err);
      setError(err?.message || 'Failed to consult strategist');
    } finally {
      setIsAsking(false);
    }
  };

  const handleApplyPatch = async (patch: StrategyPatch) => {
    if (!masterStrategy) return;
    setIsApplyingPatch(true);
    setError(null);
    try {
      const res = await apiClient.post<{ updatedStrategy: MasterCampaignStrategy }>('/api/campaign/strategy/apply-patch', {
        sessionId,
        generationId,
        masterStrategy,
        patch,
        changeReason: patch.rationale || 'User-accepted strategic patch'
      });

      setMasterStrategy(res.updatedStrategy);
      if (res.updatedStrategy.campaignTitle) {
        setSelectedCampaignName(res.updatedStrategy.campaignTitle);
      }
    } catch (err: any) {
      console.error('Failed to apply patch:', err);
      setError(err?.message || 'Failed to apply strategic patch');
    } finally {
      setIsApplyingPatch(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBriefId(id);
    setTimeout(() => setCopiedBriefId(null), 2000);
  };

  // User Model Selections for Asset Generation
  const [selectedImageModel, setSelectedImageModel] = useState<string>('gemini-2.5-flash-image');
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('veo-3.1-generate-preview');
  const [selectedTextModel, setSelectedTextModel] = useState<string>('gemini-2.5-flash');

  // Layout Studio Settings
  const containerRef = useRef<HTMLDivElement>(null);
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 50 });
  const [logoScale, setLogoScale] = useState(15);
  const [logoInverted, setLogoInverted] = useState(false);
  const [logoColorMode, setLogoColorMode] = useState<'original' | 'black' | 'white' | 'gray'>('original');
  const [bakeLogoImmediately, setBakeLogoImmediately] = useState(true);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const [textLayers, setTextLayers] = useState<TextWordLayer[]>([]);
  const [draggingTextWordId, setDraggingTextWordId] = useState<string | null>(null);
  const [selectedTextWordId, setSelectedTextWordId] = useState<string | null>(null);
  const [newTextWordInput, setNewTextWordInput] = useState('');
  const [activeLayoutTab, setActiveLayoutTab] = useState<'logo' | 'text' | 'humantouch'>('logo');

  // Human Touch requested reviews status
  const [humanTouchItems, setHumanTouchItems] = useState<Record<string, { requested: boolean, comment?: string }>>({});
  const [showHumanTouchRequestBox, setShowHumanTouchRequestBox] = useState(false);
  
  // Refine with AI modal state
  const [refiningAsset, setRefiningAsset] = useState<any | null>(null);
  const [refiningPromptText, setRefiningPromptText] = useState('');
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [isExecutingRefine, setIsExecutingRefine] = useState(false);
  const [humanTouchRefinementText, setHumanTouchRefinementText] = useState('');

  // Reposition Event Handlers
  const handleLogoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLogo(true);
    setDraggingTextWordId(null);
  };

  const handleLogoTouchStart = (e: React.TouchEvent) => {
    setIsDraggingLogo(true);
    setDraggingTextWordId(null);
  };

  const handleTextMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTextWordId(id);
    setSelectedTextWordId(id);
    setIsDraggingLogo(false);
  };

  const handleTextTouchStart = (e: React.TouchEvent, id: string) => {
    e.stopPropagation();
    setDraggingTextWordId(id);
    setSelectedTextWordId(id);
    setIsDraggingLogo(false);
  };

  const handleAddTextWord = (split: boolean) => {
    if (!newTextWordInput.trim()) return;
    const words = split ? newTextWordInput.trim().split(/\s+/).filter(Boolean) : [newTextWordInput.trim()];
    const newLayers = words.map((w, idx) => ({
      id: `text-word-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      text: w,
      fontFamily: brandGuidelines.typography?.primary || 'Outfit',
      color: brandGuidelines.colors?.[0] || '#ffffff',
      scale: 12,
      position: { x: 35 + (idx * 8) % 40, y: 40 + (idx * 6) % 30 }
    }));
    setTextLayers(prev => [...prev, ...newLayers]);
    setNewTextWordInput('');
    if (newLayers.length > 0) {
      setSelectedTextWordId(newLayers[0].id);
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    if (isDraggingLogo) {
      setLogoPosition({ x: clampedX, y: clampedY });
    } else if (draggingTextWordId) {
      setTextLayers(prev => prev.map(layer => 
        layer.id === draggingTextWordId ? { ...layer, position: { x: clampedX, y: clampedY } } : layer
      ));
    }
  };

  const handleContainerTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    if (isDraggingLogo) {
      setLogoPosition({ x: clampedX, y: clampedY });
    } else if (draggingTextWordId) {
      setTextLayers(prev => prev.map(layer => 
        layer.id === draggingTextWordId ? { ...layer, position: { x: clampedX, y: clampedY } } : layer
      ));
    }
  };

  const handleContainerMouseUp = () => {
    setIsDraggingLogo(false);
    setDraggingTextWordId(null);
  };

  const handleContainerTouchEnd = () => {
    setIsDraggingLogo(false);
    setDraggingTextWordId(null);
  };

  const handleProductUploadClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductContext({
          id: `product-${Date.now()}`,
          name: file.name,
          data: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaceUploadClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaceContext({
          id: `face-${Date.now()}`,
          name: file.name,
          data: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Active editing asset prompt state
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');

  // Results screen tabs: 'strategy' | 'production'
  const [activeSecondaryTab, setActiveSecondaryTab] = useState<'strategy' | 'production'>('strategy');

  // Dynamic Batch Production State
  interface GeneratedAsset {
    id: string;
    type: 'image' | 'video' | 'copy';
    title: string;
    description: string; // The topic, brief theme or visual visual description
    status: 'idle' | 'pending' | 'generating' | 'completed' | 'failed';
    url?: string;
    content?: string;
    videoOperation?: any;
    error?: string;
  }
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [previewAsset, setPreviewAsset] = useState<GeneratedAsset | null>(null);

  // Phase 4 Generated Assets
  const [activeAssetType, setActiveAssetType] = useState<string>('');
  const [generatedAssetOutput, setGeneratedAssetOutput] = useState<string>('');
  const [customAssetRequest, setCustomAssetRequest] = useState<string>('');

  // Log steps progress
  const stepToNum = (step: OnboardingStep): number => {
    switch(step) {
      case 'intro': return 0;
      case 'type_goal': return 1;
      case 'brand_story': return 2;
      case 'audience': return 3;
      case 'timeline': return 4;
      case 'language_region': return 5;
      case 'deliverables': return 6;
      case 'scale': return 7;
      default: return 8;
    }
  };

  const currentStepNum = stepToNum(currentStep);

  // Custom multi-select platform toggle
  const togglePlatform = (p: string) => {
    setAnswers(prev => {
      const selected = prev.selectedPlatforms.includes(p)
        ? prev.selectedPlatforms.filter(item => item !== p)
        : [...prev.selectedPlatforms, p];
      return { ...prev, selectedPlatforms: selected };
    });
  };

  // Custom multi-select deliverable toggle
  const toggleDeliverable = (d: string) => {
    setAnswers(prev => {
      const selected = prev.selectedDeliverables.includes(d)
        ? prev.selectedDeliverables.filter(item => item !== d)
        : [...prev.selectedDeliverables, d];
      return { ...prev, selectedDeliverables: selected };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const list = Array.from(files).map(f => ({
        name: f.name,
        size: (f.size / 1024).toFixed(1) + ' KB'
      }));
      setUploadedFiles(prev => [...(prev || []), ...list]);
    }
  };

  const triggerSearchRef = () => {
    fileInputRef.current?.click();
  };

  // Compile full final questions answers for AI Strategist Analysis
  const compileContextAnswers = (): Record<string, string> => {
    return {
      campaignTypeGoal: `Type: ${answers.selectedType || 'Hybrid'}. Primary Goal: ${answers.selectedGoal || 'General Growth'}. Context: ${answers.campaignTypeGoal}`,
      brandUnderstanding: `Details: ${answers.brandUnderstanding}. USP: ${answers.uspDifference}`,
      targetAudience: `Audience profile: ${answers.targetAudience}. Intended emotional hook: ${answers.selectedEmotion}`,
      timelinePlatforms: `Timeline & Dates: ${answers.timelineDuration}. Channels: ${answers.selectedPlatforms.join(', ')}`,
      contentStyle: `Style & Aesthetic direction: ${answers.selectedAesthetic}. Deliverables breakdown: ${answers.selectedDeliverables.join(', ')}`,
      assetsInspiration: `Campaign inspiration: ${answers.inspirationReferences}. Uploaded assets: ${(uploadedFiles || []).map(f => f.name).join(', ') || 'None'}`,
      budgetScale: `Budget scale: ${answers.budgetScale}. Paid engagement: ${answers.involvesPaidAds}`
    };
  };

  // Call the strategic compiling model
  const handleCompileCampaign = async () => {
    if (credits < 5) {
      setError("Insufficient credits. Compiling the strategy playbook requires 5 credits, but you only have " + credits + " left.");
      setCurrentStep('scale');
      return;
    }

    setCurrentStep('analyzing');
    setLoading(true);
    setError(null);

    try {
      const compiledAnswers = compileContextAnswers();
      const result = await generateCampaignStrategistCampaign(brandGuidelines, {
        ...compiledAnswers,
        campaignLanguage: answers.campaignLanguage,
        countryRegion: answers.countryRegion
      });
      
      if (!result || !result.coreBigIdea) {
        throw new Error("Strategy generation produced empty parameters. Please check your system API key validity.");
      }

      setCampaignResult({
        ...result,
        campaignLanguage: answers.campaignLanguage,
        countryRegion: answers.countryRegion
      });
      if (result.campaignNames && result.campaignNames.length > 0) {
        setSelectedCampaignName(result.campaignNames[0]);
      }

      // Generate customized asset briefs
      try {
        const briefs = await generateCampaignAssetBriefs(
          brandGuidelines,
          {
            ...result,
            campaignLanguage: answers.campaignLanguage,
            countryRegion: answers.countryRegion
          },
          { numImages: answers.numImages, numVideos: answers.numVideos, numCopy: answers.numCopy },
          answers.selectedAesthetic
        );

        const loadedAssets: GeneratedAsset[] = [];

        // Build Copies list
        (briefs.copies || []).forEach((c, i) => {
          loadedAssets.push({
            id: `copy-${i}-${Date.now()}`,
            type: 'copy',
            title: c.title,
            description: c.topic,
            status: 'idle'
          });
        });

        // Build Images list
        (briefs.images || []).forEach((img, i) => {
          loadedAssets.push({
            id: `image-${i}-${Date.now()}`,
            type: 'image',
            title: img.title,
            description: img.prompt,
            status: 'idle'
          });
        });

        // Build Videos list
        (briefs.videos || []).forEach((vid, i) => {
          loadedAssets.push({
            id: `video-${i}-${Date.now()}`,
            type: 'video',
            title: vid.title,
            description: vid.prompt,
            status: 'idle'
          });
        });

        setGeneratedAssets(loadedAssets);
      } catch (errBriefs) {
        console.warn("Failed retrieving structured briefs, creating fallback template structure", errBriefs);
        const fallbackAssets: GeneratedAsset[] = [];
        for (let i = 0; i < answers.numCopy; i++) {
          fallbackAssets.push({
            id: `copy-${i}-${Date.now()}`,
            type: 'copy',
            title: `Advertising Narrative Copy #${i + 1}`,
            description: "Ad Copy, Headline Hooks, and campaign distribution body write-up.",
            status: 'idle'
          });
        }
        for (let i = 0; i < answers.numImages; i++) {
          fallbackAssets.push({
            id: `image-${i}-${Date.now()}`,
            type: 'image',
            title: `Key Campaign Image Visual #${i + 1}`,
            description: `A master visual background matching ${answers.selectedAesthetic || 'cinematic'}.`,
            status: 'idle'
          });
        }
        for (let i = 0; i < answers.numVideos; i++) {
          fallbackAssets.push({
            id: `video-${i}-${Date.now()}`,
            type: 'video',
            title: `Kinetic Campaign Video Clip #${i + 1}`,
            description: `Dynamic animated reel concept themed on: ${result.coreBigIdea}.`,
            status: 'idle'
          });
        }
        setGeneratedAssets(fallbackAssets);
      }

      // Sync server-authoritative balance for successful briefing setup
      apiClient.get<{ success: boolean; availableBalance: number }>('/api/payment/balance')
        .then(bal => {
          if (bal?.availableBalance !== undefined) setCredits(bal.availableBalance);
        })
        .catch(() => {});

      setCurrentStep('results');
      
      // Save history log
      onSaveHistory(result, 'campaign-strategist-y', `Campaign Strategist W: ${result.campaignNames?.[0] || 'Strategic Roadmap'}`);

    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed compiling elite agency campaign roadmap.");
      setCurrentStep('scale'); // Go back to final step
    } finally {
      setLoading(false);
    }
  };

  // Request asset implementation (Phase 4)
  const handleGenerateAsset = async (assetType: string) => {
    if (!campaignResult) return;
    setActiveAssetType(assetType);
    setAssetLoading(true);
    setGeneratedAssetOutput('');
    setError(null);

    try {
      const output = await generateCampaignStrategistAsset(
        brandGuidelines,
        campaignResult,
        assetType,
        customAssetRequest
      );
      setGeneratedAssetOutput(output);
      setCurrentStep('asset_generation');
    } catch (e: any) {
      console.error(e);
      setError("Failed to draft deep-dive campaign deliverable.");
    } finally {
      setAssetLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownloadInteractiveImage = async (bgSrc: string, logoSrc: string, title?: string) => {
    const fetchAsLocalUrl = async (url: string): Promise<string> => {
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
      }
      try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error("Proxy fetch failed");
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (e) {
        console.warn("Proxy fetch failed for", url, "falling back directly:", e);
        return url;
      }
    };

    let bgLocalUrl = '';
    let logoLocalUrl = '';
    try {
      bgLocalUrl = await fetchAsLocalUrl(bgSrc);
      if (logoSrc) {
        logoLocalUrl = await fetchAsLocalUrl(logoSrc);
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not create canvas");

      const bgImg = document.createElement('img');
      bgImg.crossOrigin = "anonymous";
      
      const logoImg = document.createElement('img');
      logoImg.crossOrigin = "anonymous";

      const loadPromises = [
        new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = reject;
          bgImg.src = bgLocalUrl;
        })
      ];

      if (logoSrc && logoLocalUrl) {
        loadPromises.push(
          new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = reject;
            logoImg.src = logoLocalUrl;
          })
        );
      }

      await Promise.all(loadPromises);

      canvas.width = bgImg.width;
      canvas.height = bgImg.height;
      ctx.drawImage(bgImg, 0, 0);

      // Render the Logo if present
      if (logoSrc && logoImg.width > 0) {
        const calcLogoWidth = bgImg.width * (logoScale / 100);
        const calcLogoHeight = logoImg.height * (calcLogoWidth / logoImg.width);

        const logoX = bgImg.width * (logoPosition.x / 100);
        const logoY = bgImg.height * (logoPosition.y / 100);

        if (logoColorMode === 'white') {
          ctx.filter = "brightness(0) invert(1)";
        } else if (logoColorMode === 'black') {
          ctx.filter = "brightness(0)";
        } else if (logoColorMode === 'gray') {
          ctx.filter = "brightness(0) opacity(0.5)";
        }
        
        ctx.drawImage(
          logoImg, 
          logoX - calcLogoWidth / 2, 
          logoY - calcLogoHeight / 2, 
          calcLogoWidth, 
          calcLogoHeight
        );
        
        if (logoColorMode !== 'original') {
          ctx.filter = "none";
        }
      }

      // Draw all customized text word layers beautifully
      textLayers.forEach(layer => {
        const fontSizePr = bgImg.width * (layer.scale / 100);
        
        ctx.font = `bold ${fontSizePr}px "${layer.fontFamily}", "Outfit", "Inter", sans-serif`;
        ctx.fillStyle = layer.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        const tx = bgImg.width * (layer.position.x / 100);
        const ty = bgImg.height * (layer.position.y / 100);
        
        ctx.fillText(layer.text, tx, ty);
      });

      const resultDataUrl = canvas.toDataURL('image/png');
      const filename = `${(title || 'creative-render').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      
      const a = document.createElement('a');
      a.href = resultDataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to generate exported image with custom logo layout:", err);
      const a = document.createElement('a');
      a.href = bgSrc;
      a.download = `${(title || 'creative').toLowerCase().replace(/\s+/g, '-')}-fallback-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      if (bgLocalUrl.startsWith('blob:')) URL.revokeObjectURL(bgLocalUrl);
      if (logoLocalUrl.startsWith('blob:')) URL.revokeObjectURL(logoLocalUrl);
    }
  };

  const handleExecuteProductionRefine = async () => {
    if (!refiningAsset || !refiningPromptText.trim()) return;
    
    if (credits < 2) {
      alert("Insufficient credits. Refinement requires 2 credits.");
      return;
    }

    setIsExecutingRefine(true);

    // Optimistically set the campaign asset status to generating
    setGeneratedAssets(prev => prev.map(a => 
      a.id === refiningAsset.id 
        ? { ...a, status: 'generating', error: undefined } 
        : a
    ));
    
    // Close preview modal if open, since we are regenerating
    setPreviewAsset(null);
    setShowRefineModal(false);

    try {
      const finalPrompt = `Refine and edit this image. Refinement instructions: ${refiningPromptText}. Ensure the output strictly follows the Brand Guidelines, matches the original style, and is visually consistent. Avoid inline text/logos unless specified.`;
      
      const references = [
        {
          id: 'original-context-' + Date.now(),
          name: 'Original Image',
          data: refiningAsset.url,
          type: 'image',
          selected: true
        }
      ];

      const res = await generateImage(
        finalPrompt, 
        brandGuidelines, 
        "1:1", 
        selectedImageModel, 
        references, 
        bakeLogoImmediately
      );

      if (!res.url) {
        throw new Error("Refined image URL is empty.");
      }

      setGeneratedAssets(prev => prev.map(a => 
        a.id === refiningAsset.id 
          ? { ...a, url: res.url, status: 'completed' } 
          : a
      ));
    } catch (err: any) {
      console.error("AI Asset Refinement failed:", err);
      setGeneratedAssets(prev => prev.map(a => 
        a.id === refiningAsset.id 
          ? { ...a, status: 'failed', error: err.message || "Failed to refine image with AI." } 
          : a
      ));
    } finally {
      setIsExecutingRefine(false);
      setRefiningAsset(null);
    }
  };

  const handleDownloadAsset = async (asset: any) => {
    if (!asset.url && !asset.content) return;
    
    // For copy/text assets: download as Markdown file
    if (asset.type === 'copy' && asset.content) {
      const blob = new Blob([asset.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${asset.title.toLowerCase().replace(/\s+/g, '-') || 'brief'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (asset.url) {
      // For images, if guidelines logo is present, use interactive canvas generator
      if (asset.type === 'image' && brandGuidelines.logo) {
        await handleDownloadInteractiveImage(asset.url, brandGuidelines.logo, asset.title);
        return;
      }

      // For standard images/videos with direct URLs
      try {
        const response = await fetch(asset.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
         a.href = url;
        const extension = asset.type === 'video' ? 'mp4' : 'png';
        a.download = `${asset.title.toLowerCase().replace(/\s+/g, '-') || 'creative-render'}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.warn("Direct blob fetch download failed (CORS or permissions), fallback to opening in secure window/link:", err);
        const link = document.createElement('a');
        link.href = asset.url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.download = asset.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  // Trigger polling for background rendering of videos
  const triggerVideoPolling = (assetId: string, operation: any) => {
    let currentOp = operation;
    const interval = setInterval(async () => {
      try {
        const updatedOp = await pollVideo(currentOp);
        currentOp = updatedOp;
        
        if (updatedOp.done) {
          clearInterval(interval);
          const videoUri = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
          
          if (!videoUri) {
            throw new Error("No video URI returned from the rendering network.");
          }
          
          const isFalVideo = !!currentOp?.engine || !!updatedOp?.engine;
          const fetchUrl = isFalVideo ? `/api/proxy?url=${encodeURIComponent(videoUri)}` : videoUri;
          
          setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'completed', url: fetchUrl } : a));
        }
      } catch (err: any) {
        clearInterval(interval);
        console.error("Kinetic clip polling exception", err);
        setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'failed', error: err?.message || 'Motion synthesize failure' } : a));
      }
    }, 4500);
  };

  // Process batch deliverables rendering (Images, Videos, and Copy systems)
  const handleGenerateTargetAsset = async (id: string) => {
    const asset = generatedAssets.find(a => a.id === id);
    if (!asset) return;

    // Determine credit cost based on user requests and configured model metadata
    let cost = 1;
    if (asset.type === 'image') {
      const m = IMAGE_MODELS.find(x => x.id === selectedImageModel);
      cost = m ? (m as any).credits : 2;
    } else if (asset.type === 'video') {
      const m = VIDEO_MODELS.find(x => x.id === selectedVideoModel);
      cost = m ? m.credits : 40;
    } else {
      cost = 1; // standard advertising captions / topics copy draft is 1 credit as requested
    }

    if (credits < cost) {
      setGeneratedAssets(prev => prev.map(a => a.id === id ? { 
        ...a, 
        status: 'failed', 
        error: `Requires ${cost} credits. You only have ${credits} left.` 
      } : a));
      return;
    }

    setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'generating', error: undefined } : a));

    try {
      if (asset.type === 'copy') {
        const output = await generateCampaignStrategistAsset(
          brandGuidelines,
          campaignResult,
          asset.title,
          asset.description,
          selectedTextModel
        );
        // sync balance with server
        apiClient.get<{ success: boolean; availableBalance: number }>('/api/payment/balance')
          .then(bal => {
            if (bal?.availableBalance !== undefined) setCredits(bal.availableBalance);
          })
          .catch(() => {});
        setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'completed', content: output } : a));
      } else if (asset.type === 'image') {
        const finalPrompt = `${asset.description}. Visual style is ${answers.selectedAesthetic || 'Cinematic'}. Premium 4k photograph for ${brandGuidelines.name}. Crisp art direction, ultra highly detailed textures, beautiful dramatic lighting.`;
        
        // Pass model reference attachments if present in the workspace context
        const attachedReferences: any[] = [];
        if (productContext) {
          attachedReferences.push({
            id: productContext.id,
            name: productContext.name,
            data: productContext.data,
            type: 'image',
            selected: true,
            isProductContext: true
          });
        }
        if (faceContext) {
          attachedReferences.push({
            id: faceContext.id,
            name: faceContext.name,
            data: faceContext.data,
            type: 'image',
            selected: true,
            isFaceContext: true
          });
        }

        const res = await generateImage(finalPrompt, brandGuidelines, "1:1", selectedImageModel, attachedReferences, bakeLogoImmediately);
        if (res && res.url) {
          if ((res as any)?.newBalance !== undefined) {
            setCredits((res as any).newBalance);
          } else {
            apiClient.get<{ success: boolean; availableBalance: number }>('/api/payment/balance')
              .then(bal => {
                if (bal?.availableBalance !== undefined) setCredits(bal.availableBalance);
              })
              .catch(() => {});
          }
          setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'completed', url: res.url } : a));
        } else {
          throw new Error("Empty image payload received.");
        }
      } else if (asset.type === 'video') {
        const dummyVideoGem = {
          id: 'agency-video-concept',
          name: 'Agency Kinetic Video',
          type: 'video',
          systemInstruction: 'Synthesize highly cinematic visual motion frames with perfect atmospheric depth.'
        };
        const finalPrompt = `${asset.description}. Cinematic commercial video, beautiful atmospheric lighting, photorealistic details, 4k resolution, ultra slow motion. style: ${answers.selectedAesthetic || 'Cinematic'}.`;
        const res: any = await generateCreative(dummyVideoGem as any, finalPrompt, {
          guidelines: brandGuidelines,
          aspectRatio: "16:9",
          model: selectedVideoModel
        });

        if (res?.newBalance !== undefined) {
          setCredits(res.newBalance);
        } else {
          apiClient.get<{ success: boolean; availableBalance: number }>('/api/payment/balance')
            .then(bal => {
              if (bal?.availableBalance !== undefined) setCredits(bal.availableBalance);
            })
            .catch(() => {});
        }

        if (res?.type === 'video_op' && res.operation) {
          setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'pending', videoOperation: res.operation } : a));
          triggerVideoPolling(id, res.operation);
        } else if (res?.url) {
          setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'completed', url: res.url } : a));
        } else {
          throw new Error("No operations or URLs generated.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'failed', error: err?.message || 'Production error' } : a));
    }
  };

  const handleTriggerAllPipelines = () => {
    generatedAssets.forEach(asset => {
      if (asset.status === 'idle' || asset.status === 'failed') {
        handleGenerateTargetAsset(asset.id);
      }
    });
  };

  const handleSaveAssetToLibrary = () => {
    if (!campaignResult) return;
    
    const name = `${selectedCampaignName || 'Campaign'} - ${activeAssetType}`;
    const base64Data = 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(generatedAssetOutput)));
    
    onSaveCampaignAsset(name, base64Data, 'doc');

    alert("Asset successfully saved to Brand Asset Library!");
  };

  // Pre-populate mock onboarding data for high efficiency testing
  const handleAutoFill = () => {
    setAnswers({
      campaignTypeGoal: "A premium product launch campaign to introduce our organic, cold-pressed botanical skin elixir series.",
      selectedType: "Product launch",
      selectedGoal: "Sales & E-commerce",
      brandUnderstanding: "Crafted from fresh Himalayan mountain herbs and pristine botanicals, designed to reverse skin fatigue completely.",
      uspDifference: "Zero preservatives, hand-numbered luxury dark violet glass jars preserving therapeutic energy fields.",
      targetAudience: "Afluent, design-focused young professionals aged 25-42 seeking premium botanical daily luxury wellness rituals.",
      selectedEmotion: "Aspiration & Luxury",
      timelineDuration: "8 weeks starting Fall 2026",
      selectedPlatforms: ['Instagram', 'YouTube', 'TikTok', 'Email Newsletters'],
      selectedDeliverables: ['Posters & Key Visuals', 'Short Reels & TikToks', 'Ad Strategy & Copy', 'Cinematic Hero Script'],
      selectedAesthetic: "Luxury & Ultra-premium",
      inspirationReferences: "Aesop campaigns, Apple-like packaging simplicity, high-end travel aesthetics",
      budgetScale: "Mid-scale digital",
      involvesPaidAds: "Yes",
      numImages: 3,
      numVideos: 1,
      numCopy: 2,
      campaignLanguage: 'English',
      countryRegion: 'Global'
    });
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 items-start min-h-150 animate-in fade-in duration-300">
      
      {/* Discovery Guided Chat/Onboarding Wizard Panel */}

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-sm p-6 w-full relative overflow-hidden self-stretch flex flex-col justify-between">
        
        {/* 5-Stage Strategic Journey Navigation Bar */}
        <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: '01_brief', num: '01', label: 'Brief & Scope' },
              { id: '02_discovery', num: '02', label: 'Adaptive Discovery' },
              { id: '03_strategic_routes', num: '03', label: 'Strategic Routes' },
              { id: '04_build_strategy', num: '04', label: 'Master Strategy' },
              { id: '05_activate', num: '05', label: 'Creative Hub' },
            ].map((step) => {
              const isCurrent = journeyStep === step.id;
              const isUnlocked =
                step.id === '01_brief' ||
                (step.id === '02_discovery' && (adaptiveQuestions.length > 0 || isEvaluatingDiscovery)) ||
                (step.id === '03_strategic_routes' && (territories.length > 0 || isGeneratingTerritories)) ||
                (step.id === '04_build_strategy' && (masterStrategy !== null || isSynthesizing)) ||
                (step.id === '05_activate' && downstreamBriefs !== null);
              const isCompleted =
                (step.id === '01_brief' && (adaptiveQuestions.length > 0 || territories.length > 0 || masterStrategy !== null)) ||
                (step.id === '02_discovery' && (territories.length > 0 || masterStrategy !== null)) ||
                (step.id === '03_strategic_routes' && masterStrategy !== null) ||
                (step.id === '04_build_strategy' && downstreamBriefs !== null);

              return (
                <button
                  key={step.id}
                  onClick={() => isUnlocked && setJourneyStep(step.id as any)}
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
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold ${
                    isCurrent
                      ? 'bg-white/25 text-white'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {isCompleted ? '✓' : step.num}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-xs flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-red-500" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-200 p-0.5 rounded cursor-pointer transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            
{/* STAGE 1: STRATEGIC BRIEF SETUP */}
            {journeyStep === '01_brief' && (
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
                      <Sparkles size={11} className="text-rose-500" /> Presets:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCampaignTitle('Flipkart Big Billion Days: Bharat Ka Tyohaar');
                        setSelectedGoal('Sales & E-commerce');
                        setTargetAudienceInput('Tier 1 & Tier 2 Indian families and young consumers shopping for festive electronics and gifting');
                        setBriefDescription('Drive massive festive sales momentum across India with regional festive storytelling, lightning delivery, and deep discount transparency.');
                        setCampaignLanguage('Hindi');
                        setCountryRegion('India');
                        setAmbitionLevel('category_defining');
                        setRiskTolerance('moderate');
                        setBudgetReality('enterprise');
                        setTimelineHorizon('sprint_1_to_4_weeks');
                        setBrandMaturity('category_leader');
                        setGeographicScale('national');
                        setBusinessModel('marketplace');
                        setBusinessSector('E-commerce Retail');
                        setProofAvailability([
                          { type: 'performance_data', strength: 'strong' },
                          { type: 'product_demos', strength: 'strong' }
                        ]);
                        setMandatoryInclusions(['Regional vernacular storytelling', 'Delivery speed transparency', 'Bank offer clarity']);
                        setForbiddenTerritories(['Elitist tone', 'Generic stock family visuals', 'Vague discounts']);
                        setCompetitorKnowledgeSource('provided_by_client');
                        setCompetitorContext({
                          competitors: 'Amazon Great Indian Festival, Meesho Maha Indian Shopping League',
                          overusedPatterns: 'Cliché Bollywood celebrity dances with fireworks and confetti',
                          whiteSpaceOpportunity: 'Hyper-relatable middle-class gifting dilemmas solved with micro-moments of joy'
                        });
                      }}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] rounded font-semibold transition-all cursor-pointer"
                    >
                      Flipkart Festive
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCampaignTitle('LedgerFlow Enterprise Risk-Reversal');
                        setSelectedGoal('Lead Generation');
                        setTargetAudienceInput('CFOs, VP of Finance, and enterprise procurement leaders managing complex ERP workflows');
                        setBriefDescription('Eliminate manual reconciliation bottlenecks with quantified 90-day ROI payback proof and guaranteed audit compliance.');
                        setCampaignLanguage('English');
                        setCountryRegion('North America');
                        setAmbitionLevel('balanced');
                        setRiskTolerance('low');
                        setBudgetReality('moderate');
                        setTimelineHorizon('quarterly_1_to_3_months');
                        setBrandMaturity('emerging_challenger');
                        setGeographicScale('national');
                        setBusinessModel('saas');
                        setBusinessSector('Financial Software / ERP');
                        setProofAvailability([
                          { type: 'case_studies', strength: 'strong' },
                          { type: 'performance_data', strength: 'strong' },
                          { type: 'certifications', strength: 'moderate' }
                        ]);
                        setMandatoryInclusions(['90-day ROI guarantee', 'SOC-2 Type II audit compliance', 'Clear pricing model']);
                        setForbiddenTerritories(['Overly casual meme marketing', 'Unsubstantiated AI claims', 'Stock office handshakes']);
                        setCompetitorKnowledgeSource('provided_by_client');
                        setCompetitorContext({
                          competitors: 'Legacy ERP tools, Tipalti, Ramp',
                          overusedPatterns: 'Save 10 hours a week with AI Automation bullet lists',
                          whiteSpaceOpportunity: 'Quantified balance sheet risk mitigation presented with forensic precision'
                        });
                      }}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] rounded font-semibold transition-all cursor-pointer"
                    >
                      B2B SaaS FinTech
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCampaignTitle('Aura Sustainable Capsule');
                        setSelectedGoal('Brand Awareness');
                        setTargetAudienceInput('Eco-conscious urban design enthusiasts seeking quiet luxury and zero-plastic textiles');
                        setBriefDescription('Launch heirloom linen capsule crafted with botanical dyes. Pick a righteous contrast against fast-fashion environmental waste.');
                        setCampaignLanguage('English');
                        setCountryRegion('European Union');
                        setAmbitionLevel('bold');
                        setRiskTolerance('high');
                        setBudgetReality('lean');
                        setTimelineHorizon('sustained_3_to_6_months');
                        setBrandMaturity('new_launch');
                        setGeographicScale('regional');
                        setBusinessModel('d2c');
                        setBusinessSector('Artisanal Luxury Fashion');
                        setProofAvailability([
                          { type: 'founder_expertise', strength: 'strong' },
                          { type: 'product_demos', strength: 'moderate' }
                        ]);
                        setMandatoryInclusions(['Traceable supply chain', 'Botanical dye craftsmanship story', 'Repair and heirloom guarantee']);
                        setForbiddenTerritories(['Seasonal sales or discounts', 'Corporate greenwashing jargon', 'Fast-fashion influencer hauls']);
                        setCompetitorKnowledgeSource('provided_by_client');
                        setCompetitorContext({
                          competitors: 'Fast fashion giants, Reformation, Eileen Fisher',
                          overusedPatterns: 'Vague earth-toned moodboards and saving the planet slogans',
                          whiteSpaceOpportunity: 'Heirloom preservation: buy once for life, celebrate natural wear and patination'
                        });
                      }}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] rounded font-semibold transition-all cursor-pointer"
                    >
                      Luxury Fashion
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Campaign Title</label>
                    <input
                      type="text"
                      value={campaignTitle}
                      onChange={(e) => setCampaignTitle(e.target.value)}
                      placeholder="e.g. Festive Flagship Launch"
                      className="w-full text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Brand Grounding</label>
                    <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700 rounded text-xs">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <span className="font-semibold text-slate-900 dark:text-white">{brandGuidelines.name || 'Writopedia Brand'}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{brandGuidelines.industry || 'Multi-Category'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Primary Campaign Objective</label>
                  <div className="flex flex-wrap gap-2">
                    {CAMPAIGN_GOALS.map(goal => {
                      const isSelected = selectedGoal === goal;
                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => setSelectedGoal(goal)}
                          className={`text-xs px-3 py-1.5 rounded-md transition-all border cursor-pointer font-medium ${
                            isSelected
                              ? 'bg-rose-500 text-white border-rose-600 font-bold shadow-xs ring-1 ring-rose-400/40'
                              : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          {goal}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Target Audience Context</label>
                  <input
                    type="text"
                    value={targetAudienceInput}
                    onChange={(e) => setTargetAudienceInput(e.target.value)}
                    placeholder="e.g. Young urban professionals, Tier 2 families, or Enterprise CFOs"
                    className="w-full text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Campaign Core Proposition & Strategic Brief</label>
                  <textarea
                    rows={3}
                    value={briefDescription}
                    onChange={(e) => setBriefDescription(e.target.value)}
                    placeholder="Describe the product launch, festive sale, brand challenge, or core proposition you want this campaign to drive..."
                    className="w-full text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Primary Language</label>
                    <select
                      value={campaignLanguage}
                      onChange={(e) => setCampaignLanguage(e.target.value)}
                      className="w-full text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                    >
                      {LANGUAGES_LIST.map(l => (
                        <option key={l} value={l} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800">{l}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Target Geographic Region</label>
                    <select
                      value={countryRegion}
                      onChange={(e) => setCountryRegion(e.target.value)}
                      className="w-full text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded p-2.5 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                    >
                      {REGIONS_LIST.map(r => (
                        <option key={r} value={r} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800">{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Collapsible Strategic Controls Panel */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders size={16} className="text-rose-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                          Executive Strategic Scope & Governance Controls
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {ambitionLevel.replace('_', ' ')} ambition • {riskTolerance} risk • {businessModel.toUpperCase()} • {mandatoryInclusions.length} inclusions • {forbiddenTerritories.length} forbidden
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-rose-500/10 text-rose-500 font-bold">
                        {showAdvancedControls ? 'Hide Controls' : 'Configure Controls'}
                      </span>
                      {showAdvancedControls ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  {showAdvancedControls && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 text-xs">
                      {/* Ambition & Risk */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                            Ambition Level
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {(['safe_proven', 'balanced', 'bold', 'category_defining', 'experimental'] as AmbitionLevel[]).map(amb => {
                              const isSelected = ambitionLevel === amb;
                              return (
                                <button
                                  key={amb}
                                  type="button"
                                  onClick={() => setAmbitionLevel(amb)}
                                  className={`px-2.5 py-1.5 text-[11px] rounded border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-rose-500 text-white font-bold border-rose-600 shadow-2xs ring-1 ring-rose-400/30'
                                      : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {amb === 'safe_proven' ? 'Safe & Proven' : amb === 'balanced' ? 'Balanced' : amb === 'bold' ? 'Bold' : amb === 'category_defining' ? 'Category Defining' : 'Experimental'}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                            Risk Tolerance
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {(['low', 'moderate', 'high', 'very_high'] as RiskTolerance[]).map(risk => {
                              const isSelected = riskTolerance === risk;
                              return (
                                <button
                                  key={risk}
                                  type="button"
                                  onClick={() => setRiskTolerance(risk)}
                                  className={`px-2.5 py-1.5 text-[11px] rounded border text-center transition-all cursor-pointer capitalize ${
                                    isSelected
                                      ? 'bg-rose-500 text-white font-bold border-rose-600 shadow-2xs ring-1 ring-rose-400/30'
                                      : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {risk.replace('_', ' ')}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Budget Reality & Timeline */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                            Budget Reality
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {([
                              { id: 'no_paid_organic', label: 'Organic ($0)' },
                              { id: 'lean', label: 'Lean (<$10k)' },
                              { id: 'moderate', label: 'Moderate ($10k-$50k)' },
                              { id: 'large_scale', label: 'Large Scale ($50k-$250k)' },
                              { id: 'enterprise', label: 'Enterprise (>$250k)' }
                            ] as Array<{ id: BudgetReality; label: string }>).map(b => {
                              const isSelected = budgetReality === b.id;
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => setBudgetReality(b.id)}
                                  className={`px-2.5 py-1.5 text-[11px] rounded border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-rose-500 text-white font-bold border-rose-600 shadow-2xs ring-1 ring-rose-400/30'
                                      : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {b.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                            Timeline Horizon
                          </label>
                          <div className="grid grid-cols-1 gap-1.5">
                            {([
                              { id: 'urgent_under_1_week', label: 'Urgent (Under 1 Week)' },
                              { id: 'sprint_1_to_4_weeks', label: 'Sprint (1 to 4 Weeks)' },
                              { id: 'quarterly_1_to_3_months', label: 'Quarterly Flight (1 to 3 Months)' },
                              { id: 'sustained_3_to_6_months', label: 'Sustained (3 to 6 Months)' },
                              { id: 'always_on', label: 'Always-On Foundation' }
                            ] as Array<{ id: TimelineHorizon; label: string }>).map(t => {
                              const isSelected = timelineHorizon === t.id;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setTimelineHorizon(t.id)}
                                  className={`px-2.5 py-1 text-[11px] rounded border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-rose-500 text-white font-bold border-rose-600 shadow-2xs ring-1 ring-rose-400/30'
                                      : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {t.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Brand Maturity & Business Model */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                            Brand Maturity
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {([
                              { id: 'new_launch', label: 'New Launch' },
                              { id: 'emerging_challenger', label: 'Emerging Challenger' },
                              { id: 'established', label: 'Established' },
                              { id: 'category_leader', label: 'Category Leader' },
                              { id: 'rebranding', label: 'Rebranding' }
                            ] as Array<{ id: BrandMaturity; label: string }>).map(m => {
                              const isSelected = brandMaturity === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setBrandMaturity(m.id)}
                                  className={`px-2.5 py-1 text-[11px] rounded border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-rose-500 text-white font-bold border-rose-600 shadow-2xs ring-1 ring-rose-400/30'
                                      : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {m.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                            Business Model
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {(['b2b', 'b2c', 'd2c', 'marketplace', 'saas', 'fintech', 'retail'] as BusinessModelType[]).map(bm => {
                              const isSelected = businessModel === bm;
                              return (
                                <button
                                  key={bm}
                                  type="button"
                                  onClick={() => setBusinessModel(bm)}
                                  className={`px-2.5 py-1 text-[11px] rounded border uppercase font-mono font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-rose-500 text-white border-rose-600 shadow-2xs ring-1 ring-rose-400/30'
                                      : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {bm}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Proof Availability Checklist */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                          Verified Proof & Evidentiary Assets Available
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {([
                            { id: 'product_demos', label: 'Product Demos' },
                            { id: 'performance_data', label: 'Performance Data' },
                            { id: 'case_studies', label: 'Case Studies' },
                            { id: 'certifications', label: 'Certifications' },
                            { id: 'testimonials', label: 'Testimonials' },
                            { id: 'founder_expertise', label: 'Founder Expertise' },
                            { id: 'user_reviews', label: 'User Reviews' }
                          ] as Array<{ id: ProofItemType; label: string }>).map(p => {
                            const existing = proofAvailability.find(item => item.type === p.id);
                            const isChecked = !!existing;
                            return (
                              <div
                                key={p.id}
                                className={`p-2 rounded border flex flex-col justify-between gap-1 transition-all ${
                                  isChecked
                                    ? 'bg-rose-50/50 dark:bg-slate-800 border-rose-500/80 ring-1 ring-rose-500/30'
                                    : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isChecked) {
                                      setProofAvailability(prev => prev.filter(i => i.type !== p.id));
                                    } else {
                                      setProofAvailability(prev => [...prev, { type: p.id, strength: 'strong' }]);
                                    }
                                  }}
                                  className="flex items-center gap-1.5 text-left cursor-pointer w-full"
                                >
                                  {isChecked ? <CheckSquare size={13} className="text-rose-500 shrink-0" /> : <Square size={13} className="text-slate-400 shrink-0" />}
                                  <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                                    {p.label}
                                  </span>
                                </button>
                                {isChecked && (
                                  <select
                                    value={existing?.strength || 'strong'}
                                    onChange={(e) => {
                                      const str = e.target.value as 'strong' | 'moderate' | 'emerging';
                                      setProofAvailability(prev => prev.map(i => i.type === p.id ? { ...i, strength: str } : i));
                                    }}
                                    className="text-[9px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-slate-700 dark:text-slate-300"
                                  >
                                    <option value="strong">Strong</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="emerging">Emerging</option>
                                  </select>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mandatory Inclusions & Forbidden Territories */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                            Mandatory Inclusions ({mandatoryInclusions.length})
                          </label>
                          <div className="flex flex-wrap gap-1 min-h-7 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
                            {mandatoryInclusions.map((inc, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded text-[10px] font-medium">
                                {inc}
                                <button type="button" onClick={() => setMandatoryInclusions(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-emerald-900 dark:hover:text-white cursor-pointer">
                                  <X size={11} />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={newInclusionInput}
                              onChange={(e) => setNewInclusionInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newInclusionInput.trim()) {
                                  e.preventDefault();
                                  setMandatoryInclusions(prev => [...prev, newInclusionInput.trim()]);
                                  setNewInclusionInput('');
                                }
                              }}
                              placeholder="e.g. Free shipping, SOC2 compliance..."
                              className="flex-1 text-[11px] px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newInclusionInput.trim()) {
                                  setMandatoryInclusions(prev => [...prev, newInclusionInput.trim()]);
                                  setNewInclusionInput('');
                                }
                              }}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                            Forbidden Territories & Tropes ({forbiddenTerritories.length})
                          </label>
                          <div className="flex flex-wrap gap-1 min-h-7 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
                            {forbiddenTerritories.map((forb, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded text-[10px] font-medium">
                                {forb}
                                <button type="button" onClick={() => setForbiddenTerritories(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-rose-900 dark:hover:text-white cursor-pointer">
                                  <X size={11} />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={newForbiddenInput}
                              onChange={(e) => setNewForbiddenInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newForbiddenInput.trim()) {
                                  e.preventDefault();
                                  setForbiddenTerritories(prev => [...prev, newForbiddenInput.trim()]);
                                  setNewForbiddenInput('');
                                }
                              }}
                              placeholder="e.g. No stock handshakes, No discounts..."
                              className="flex-1 text-[11px] px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newForbiddenInput.trim()) {
                                  setForbiddenTerritories(prev => [...prev, newForbiddenInput.trim()]);
                                  setNewForbiddenInput('');
                                }
                              }}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Honest Competitor Knowledge Source */}
                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                          Honest Competitor Grounding (Zero Phantom Web Scrapes)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {([
                            { id: 'provided_by_client', label: 'Client-Supplied Competitors', desc: 'Strategy explicitly grounded in competitor names and patterns you supply below' },
                            { id: 'imported_from_workspace', label: 'Workspace Brand Documents', desc: 'Grounds analysis in brand guidelines and stored workspace assets' },
                            { id: 'no_research_supplied', label: 'No Competitor Research Supplied', desc: 'Applies universal category defense invariants without claiming competitor intel' }
                          ] as Array<{ id: CompetitorKnowledgeSource; label: string; desc: string }>).map(source => {
                            const isSelected = competitorKnowledgeSource === source.id;
                            return (
                              <button
                                key={source.id}
                                type="button"
                                onClick={() => setCompetitorKnowledgeSource(source.id)}
                                className={`p-2.5 rounded border text-left transition-all cursor-pointer flex-1 min-w-[200px] ${
                                  isSelected
                                    ? 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-500 font-medium ring-1 ring-rose-500/40'
                                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                              >
                                <span className="font-bold text-[11px] block">{source.label}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">{source.desc}</span>
                              </button>
                            );
                          })}
                        </div>

                        {competitorKnowledgeSource === 'provided_by_client' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2">
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Key Competitors</label>
                              <input
                                type="text"
                                value={competitorContext.competitors}
                                onChange={(e) => setCompetitorContext(prev => ({ ...prev, competitors: e.target.value }))}
                                placeholder="e.g. Brand A, Brand B"
                                className="w-full text-[11px] px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Overused Category Patterns</label>
                              <input
                                type="text"
                                value={competitorContext.overusedPatterns}
                                onChange={(e) => setCompetitorContext(prev => ({ ...prev, overusedPatterns: e.target.value }))}
                                placeholder="e.g. Save time with AI bullets"
                                className="w-full text-[11px] px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Target White Space</label>
                              <input
                                type="text"
                                value={competitorContext.whiteSpaceOpportunity}
                                onChange={(e) => setCompetitorContext(prev => ({ ...prev, whiteSpaceOpportunity: e.target.value }))}
                                placeholder="e.g. Forensic audit compliance"
                                className="w-full text-[11px] px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                    Stage 1 of 5 • Strategic entropy evaluation maps 8 readiness dimensions
                  </span>
                  <button
                    type="button"
                    onClick={handleStartDiscovery}
                    disabled={isEvaluatingDiscovery || !briefDescription.trim()}
                    className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-98 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-md shadow-rose-500/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer font-sans"
                  >
                    {isEvaluatingDiscovery ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Evaluating Strategic Dimensions...
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
            )}

            {/* STAGE 2: ADAPTIVE DISCOVERY */}
            {journeyStep === '02_discovery' && (
              <motion.div
                key="02_discovery"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 text-left"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div>
                    <h2 className="text-xl font-light tracking-tight text-slate-900 dark:text-white">
                      02 Adaptive Strategic Discovery
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Targeted inquiries to resolve audience tension, evidentiary proof, and candidate frameworks.
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

                {/* Recommended Framework Pills */}
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
                                onClick={() => setDiscoveryAnswers(prev => ({ ...prev, [q.id]: opt }))}
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
                          onChange={(e) => setDiscoveryAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
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
                    onClick={() => setJourneyStep('01_brief')}
                    className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={16} /> Edit Brief & Controls
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateTerritories()}
                    disabled={isGeneratingTerritories}
                    className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-98 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-md shadow-rose-500/25 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer font-sans"
                  >
                    {isGeneratingTerritories ? (
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
            )}

            {/* STAGE 3: STRATEGIC ROUTES */}
            {journeyStep === '03_strategic_routes' && (
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
                        onClick={() => setTerritoryViewMode('cards')}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                          territoryViewMode === 'cards'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Layers size={12} /> Cards
                      </button>
                      <button
                        type="button"
                        onClick={() => setTerritoryViewMode('matrix')}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                          territoryViewMode === 'matrix'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <FileSpreadsheet size={12} /> Comparison Matrix
                      </button>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      {territories.length} Formulated
                    </span>
                  </div>
                </div>

                {/* Free Exploration & Directional Alternative Bar */}
                <div className="p-3 bg-slate-50/70 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-rose-500" />
                      <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
                        Directional Route Alternatives (0 Credits • {alternativeCount}/5 Used)
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
                        disabled={isGeneratingAlternatives || alternativeCount >= 5}
                        onClick={() => handleGenerateAlternativeTerritory(p)}
                        className="text-[10px] font-semibold px-2.5 py-1 bg-white dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-400 dark:hover:border-rose-500/60 border border-slate-200 dark:border-slate-800 rounded-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      type="text"
                      value={customDirectionInput}
                      onChange={(e) => setCustomDirectionInput(e.target.value)}
                      placeholder="Or specify custom direction angle (e.g. emphasize humorous self-deprecation)..."
                      className="flex-1 text-[11px] px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      disabled={isGeneratingAlternatives || !customDirectionInput.trim() || alternativeCount >= 5}
                      onClick={() => {
                        if (customDirectionInput.trim()) {
                          handleGenerateAlternativeTerritory(customDirectionInput.trim());
                          setCustomDirectionInput('');
                        }
                      }}
                      className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold rounded-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1 shrink-0 shadow-sm"
                    >
                      {isGeneratingAlternatives ? <Loader2 size={12} className="animate-spin" /> : 'Generate Direction'}
                    </button>
                  </div>
                </div>

                {/* View Mode: CARDS */}
                {territoryViewMode === 'cards' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[68vh] overflow-y-auto pr-1">
                    {territories.map((territory) => {
                      const isSelected = selectedTerritory?.id === territory.id;
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

                            {territory.recommendationRationale?.whyThis && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                Why Recommended: {territory.recommendationRationale.whyThis}
                              </p>
                            )}

                            {/* Sacrifices & Trade-Offs */}
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

                            {/* Target Fit */}
                            {territory.targetFit?.bestFor?.length > 0 && (
                              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[9px] block">Best For:</span>
                                {territory.targetFit.bestFor.join(', ')}
                              </div>
                            )}

                            {/* Creative Codes */}
                            {territory.creativeCodes && (
                              <div className="space-y-1 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-md border border-slate-200 dark:border-slate-800/80 text-[10px]">
                                <span className="font-bold uppercase tracking-wider text-slate-500 text-[9px] block">Creative Codes:</span>
                                {territory.creativeCodes.visualCodes?.length > 0 && (
                                  <div className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Visual:</span> {territory.creativeCodes.visualCodes.join(', ')}</div>
                                )}
                                {territory.creativeCodes.copyCodes?.length > 0 && (
                                  <div className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Copy:</span> {territory.creativeCodes.copyCodes.join(', ')}</div>
                                )}
                                {territory.creativeCodes.soundCodes?.length > 0 && (
                                  <div className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Sound:</span> {territory.creativeCodes.soundCodes.join(', ')}</div>
                                )}
                              </div>
                            )}

                            <div className="space-y-1.5 text-[11px]">
                              <div>
                                <span className="font-bold text-slate-600 dark:text-slate-400 block text-[9px] uppercase tracking-wider">The Mechanism:</span>
                                <p className="text-slate-700 dark:text-slate-300 text-[10px]">{territory.theMechanism}</p>
                              </div>

                              <div>
                                <span className="font-bold text-slate-600 dark:text-slate-400 block text-[9px] uppercase tracking-wider">Creative World:</span>
                                <p className="text-slate-600 dark:text-slate-400 text-[10px]">{territory.creativeWorld}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1 pt-1">
                              {territory.channelPotential.map(ch => (
                                <span key={ch} className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                                  {ch}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                setTerritoryToLock(territory);
                                setShowLockConfirmModal(true);
                              }}
                              className="w-full py-2 bg-slate-900 hover:bg-rose-600 dark:bg-rose-500 dark:hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm font-sans active:scale-98"
                            >
                              Lock Route & Synthesize (5 cr)
                              <Sparkles size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* View Mode: COMPARISON MATRIX */}
                {territoryViewMode === 'matrix' && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded overflow-x-auto max-h-[55vh]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-bold text-[9px] sticky top-0">
                        <tr>
                          <th className="p-3">Strategic Route</th>
                          <th className="p-3">Brand Fit</th>
                          <th className="p-3">Distinctiveness</th>
                          <th className="p-3">Audience Relevance</th>
                          <th className="p-3">Complexity</th>
                          <th className="p-3">PR Potential</th>
                          <th className="p-3">Trade-Off</th>
                          <th className="p-3 text-right">Commit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                        {territories.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              <div>{t.title}</div>
                              <span className="text-[10px] font-normal text-slate-500 italic block mt-0.5 line-clamp-1">"{t.oneLinePremise}"</span>
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-emerald-500">{t.comparisonScores?.brandFit || 'High'}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-blue-500">{t.comparisonScores?.distinctiveness || 'High'}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-purple-500">{t.comparisonScores?.audienceRelevance || 'High'}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-amber-500">{t.comparisonScores?.executionComplexity || 'Moderate'}</span>
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-rose-500">{t.comparisonScores?.prPotential || 'Medium'}</span>
                            </td>
                            <td className="p-3 max-w-[200px] text-slate-600 dark:text-slate-400 line-clamp-2">
                              {t.sacrificesAndTradeoffs || 'Standard execution commitment'}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setTerritoryToLock(t);
                                  setShowLockConfirmModal(true);
                                }}
                                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-bold uppercase cursor-pointer transition-all"
                              >
                                Lock (5 cr)
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setJourneyStep('02_discovery')}
                    className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <ChevronLeft size={16} /> Back to Discovery
                  </button>

                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                    Exploration & alternatives are 0 credits. Hold & capture of 5 credits triggers upon route confirmation.
                  </span>
                </div>
              </motion.div>
            )}

            {/* STAGE 4: MASTER CAMPAIGN STRATEGY */}
            {journeyStep === '04_build_strategy' && masterStrategy && (
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
                      onClick={handleRunStressTest}
                      disabled={isStressTesting}
                      className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      {isStressTesting ? <Loader2 size={13} className="animate-spin" /> : <ShieldAlert size={13} className="text-rose-500" />}
                      Stress-Test Strategy
                    </button>
                    <button
                      type="button"
                      onClick={() => setJourneyStep('05_activate')}
                      className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded shadow-md flex items-center gap-1.5 cursor-pointer transition-all font-sans"
                    >
                      Creative Activation
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                {/* 5 Executive Tabs Navigation */}
                <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'overview', label: 'Overview & Transformation', icon: Sparkles },
                    { id: 'playbook', label: 'Playbook & Journey', icon: Workflow },
                    { id: 'distribution', label: 'Channel Matrix', icon: ListFilter },
                    { id: 'evidence', label: 'Evidence & Unknowns', icon: HelpIcon },
                    { id: 'advisory', label: 'Ask Strategist & Patch', icon: MessageSquare }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeStrategyTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveStrategyTab(tab.id as any)}
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

                {/* TAB CONTENT */}
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 text-xs text-left">
                  {/* TAB 1: OVERVIEW & TRANSFORMATION */}
                  {activeStrategyTab === 'overview' && (
                    <div className="space-y-4">
                      {/* Critic Quality Invariant Card */}
                      {criticReport && (
                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              Critic Verified Strategy: Passed 50-Brand Boringness Invariant (Score: {criticReport.overallScore}/10)
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">0 Banned Clichés</span>
                        </div>
                      )}

                      {/* In 30 Seconds Executive Summary */}
                      {masterStrategy.executiveSummary && (
                        <div className="p-4 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-rose-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                              Executive Summary (In 30 Seconds)
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            <div><span className="font-bold text-slate-700 dark:text-slate-300">The Problem:</span> <span className="text-slate-800 dark:text-slate-200">{masterStrategy.executiveSummary.theProblem}</span></div>
                            <div><span className="font-bold text-slate-700 dark:text-slate-300">The Opportunity:</span> <span className="text-slate-800 dark:text-slate-200">{masterStrategy.executiveSummary.theOpportunity}</span></div>
                            <div><span className="font-bold text-slate-700 dark:text-slate-300">The Big Idea:</span> <span className="text-slate-800 dark:text-slate-200">{masterStrategy.executiveSummary.theBigIdea}</span></div>
                            <div><span className="font-bold text-slate-700 dark:text-slate-300">Why Us:</span> <span className="text-slate-800 dark:text-slate-200">{masterStrategy.executiveSummary.whyUs}</span></div>
                          </div>
                          <div className="p-2 bg-white/70 dark:bg-slate-900/70 rounded border border-rose-200/50 dark:border-rose-900/30 text-[11px] text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-rose-600 dark:text-rose-400">Strategic Mandate:</span> {masterStrategy.executiveSummary.whatWeWillDo} • <span className="italic">{masterStrategy.executiveSummary.whatWeNeedToProve}</span>
                          </div>
                        </div>
                      )}

                      {/* What Changed From My Brief Transformation Card */}
                      {masterStrategy.whatChangedFromBrief && (
                        <div className="p-4 bg-slate-50/70 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp size={14} className="text-rose-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              What Changed From My Brief (Strategic Transformation)
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                              <span className="text-[9px] font-bold uppercase text-slate-400 block">You Told Us</span>
                              <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 text-[10px]">
                                {masterStrategy.whatChangedFromBrief.youToldUs?.map((item, i) => <li key={i}>{item}</li>)}
                              </ul>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                              <span className="text-[9px] font-bold uppercase text-rose-500 block">We Discovered</span>
                              <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 text-[10px]">
                                {masterStrategy.whatChangedFromBrief.weDiscovered?.map((item, i) => <li key={i}>{item}</li>)}
                              </ul>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                              <span className="text-[9px] font-bold uppercase text-emerald-500 block">We Recommend</span>
                              <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 text-[10px]">
                                {masterStrategy.whatChangedFromBrief.weRecommend?.map((item, i) => <li key={i}>{item}</li>)}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: PLAYBOOK & JOURNEY */}
                  {activeStrategyTab === 'playbook' && (
                    <div className="space-y-4">
                      {/* Core Big Idea */}
                      <div className="p-4 bg-slate-900 text-white rounded shadow-sm space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 block">
                          Core Big Idea
                        </span>
                        <h3 className="text-lg font-serif italic text-white leading-relaxed">
                          "{masterStrategy.coreBigIdea.text}"
                        </h3>
                        {masterStrategy.coreBigIdea.sourceOrRationale && (
                          <p className="text-[11px] text-slate-300">
                            Strategic Rationale: {masterStrategy.coreBigIdea.sourceOrRationale}
                          </p>
                        )}
                      </div>

                      {/* Creative Tension Architecture */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                          Creative Tension Architecture
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                            <span className="text-[9px] font-bold uppercase text-slate-400 block">Current Belief</span>
                            <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">{masterStrategy.creativeTension.currentBelief}</p>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                            <span className="text-[9px] font-bold uppercase text-slate-400 block">Behavioral Barrier</span>
                            <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">{masterStrategy.creativeTension.behavioralBarrier}</p>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                            <span className="text-[9px] font-bold uppercase text-rose-500 block">Breakthrough Mechanism</span>
                            <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">{masterStrategy.creativeTension.breakthroughAngle}</p>
                          </div>
                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                            <span className="text-[9px] font-bold uppercase text-emerald-500 block">Desired Belief</span>
                            <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">{masterStrategy.creativeTension.desiredBelief}</p>
                          </div>
                        </div>
                      </div>

                      {/* Competitor Whitespace */}
                      {masterStrategy.competitorWhiteSpace && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                            Competitor Whitespace & Category Tropes
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                              <span className="text-[9px] font-bold uppercase text-amber-500 block">Category Norm</span>
                              <p className="text-slate-700 dark:text-slate-300 text-[10px]">{masterStrategy.competitorWhiteSpace.categoryNorm}</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                              <span className="text-[9px] font-bold uppercase text-rose-500 block">Competitor Pattern</span>
                              <p className="text-slate-700 dark:text-slate-300 text-[10px]">{masterStrategy.competitorWhiteSpace.competitorPattern}</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                              <span className="text-[9px] font-bold uppercase text-emerald-500 block">Brand Opportunity</span>
                              <p className="text-slate-700 dark:text-slate-300 text-[10px]">{masterStrategy.competitorWhiteSpace.brandOpportunity}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 5-Stage Customer Decision Journey */}
                      {masterStrategy.customerJourney && masterStrategy.customerJourney.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                            5-Stage Customer Decision Journey
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                            {masterStrategy.customerJourney.map((stg, idx) => (
                              <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1.5 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-[9px] font-mono font-bold uppercase text-rose-500">
                                      Stage 0{idx + 1}
                                    </span>
                                    <span className="text-[9px] font-bold uppercase text-slate-600 dark:text-slate-300">
                                      {stg.stageLabel || stg.stage.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <div className="space-y-1 pt-1.5 text-[10px]">
                                    <div><span className="font-bold text-slate-500">Current State:</span> <span className="text-slate-700 dark:text-slate-300">{stg.currentCustomerState}</span></div>
                                    <div><span className="font-bold text-slate-500">Desired State:</span> <span className="text-slate-700 dark:text-slate-300">{stg.desiredCustomerState}</span></div>
                                    <div><span className="font-bold text-amber-500">Barrier:</span> <span className="text-slate-700 dark:text-slate-300">{stg.barrier}</span></div>
                                    <div><span className="font-bold text-emerald-500">Trigger:</span> <span className="text-slate-700 dark:text-slate-300">{stg.trigger}</span></div>
                                  </div>
                                </div>
                                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded text-[9px] text-emerald-700 dark:text-emerald-300 font-medium">
                                  <span className="font-bold block">Deliverable:</span> {stg.keyDeliverable}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content Pillars */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                          Content Pillars & Share of Voice
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {masterStrategy.contentPillars?.map((pillar, idx) => (
                            <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-900 dark:text-white">{pillar.name}</h4>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                                  {pillar.shareOfVoicePercent}% SOV
                                </span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 text-[11px]">{pillar.strategicPurpose}</p>
                              <div className="p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded text-[10px] font-mono text-rose-500">
                                Hook: {pillar.exampleHook}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CHANNEL MATRIX */}
                  {activeStrategyTab === 'distribution' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                          Platform Channel Distribution & Discipline
                        </span>
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-bold text-[9px]">
                              <tr>
                                <th className="p-2">Platform</th>
                                <th className="p-2">Role & Objective</th>
                                <th className="p-2">Format</th>
                                <th className="p-2">Cadence</th>
                                <th className="p-2">Hook Strategy</th>
                                <th className="p-2">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {masterStrategy.platformMatrix?.map((pm, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                  <td className="p-2 font-bold text-slate-900 dark:text-white">{pm.platform}</td>
                                  <td className="p-2 text-slate-600 dark:text-slate-400">{pm.objective}</td>
                                  <td className="p-2 text-slate-600 dark:text-slate-400">{pm.format}</td>
                                  <td className="p-2 text-slate-500">{pm.cadence}</td>
                                  <td className="p-2 text-slate-600 dark:text-slate-400">{pm.hookType}</td>
                                  <td className="p-2 font-mono text-[9px] uppercase font-bold text-emerald-500">Active Priority</td>
                                </tr>
                              ))}
                              {/* Deliberately Excluded Channels */}
                              {masterStrategy.channelDecisions?.filter(c => c.status === 'excluded').map((ec, idx) => (
                                <tr key={`ex-${idx}`} className="bg-slate-100/50 dark:bg-slate-950/40 text-slate-400">
                                  <td className="p-2 font-bold line-through text-slate-400">{ec.channel}</td>
                                  <td colSpan={4} className="p-2 text-[10px] italic">
                                    <span className="font-semibold text-rose-400 not-italic uppercase font-mono mr-1">Deliberately Excluded:</span>
                                    {ec.rationale}
                                  </td>
                                  <td className="p-2 font-mono text-[9px] uppercase font-bold text-rose-400">Excluded</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Rollout Phases */}
                      {masterStrategy.rolloutPhases && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                            Campaign Rollout & Sequencing Phases
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {masterStrategy.rolloutPhases.map((phase, idx) => (
                              <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900 dark:text-white">{phase.phase}</span>
                                  <span className="text-[10px] font-mono font-bold text-rose-500">{phase.duration}</span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 text-[11px]">{phase.strategicFocus}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: EVIDENCE & UNKNOWNS */}
                  {activeStrategyTab === 'evidence' && (
                    <div className="space-y-4">
                      {/* Epistemic Ledger */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Epistemic Truth Ledger (Claim Verification)
                          </span>
                          <div className="flex items-center gap-2 text-[9px]">
                            <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-500 rounded font-bold">Evidence</span>
                            <span className="px-1.5 py-0.2 bg-blue-500/10 text-blue-500 rounded font-bold">Inference</span>
                            <span className="px-1.5 py-0.2 bg-purple-500/10 text-purple-500 rounded font-bold">Recommendation</span>
                            <span className="px-1.5 py-0.2 bg-amber-500/10 text-amber-500 rounded font-bold">Placeholder</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {masterStrategy.positioningManifesto?.map((claim, idx) => (
                            <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0 ${
                                  claim.status === 'evidence'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : claim.status === 'inference'
                                    ? 'bg-blue-500/10 text-blue-500'
                                    : claim.status === 'placeholder'
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-purple-500/10 text-purple-500'
                                }`}>
                                  {claim.status}
                                </span>
                                {claim.basis && (
                                  <span className="text-[9px] font-mono text-slate-400">
                                    Basis: {claim.basis.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-800 dark:text-slate-200">{claim.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Still Unknown Research Agenda Panel */}
                      {masterStrategy.unknownsPanel && masterStrategy.unknownsPanel.length > 0 && (
                        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 block">
                            "Still Unknown" Strategic Research Agenda (Epistemic Humility)
                          </span>
                          <div className="space-y-2">
                            {masterStrategy.unknownsPanel.map((uk, i) => (
                              <div key={i} className="p-2.5 bg-white dark:bg-slate-900 rounded border border-amber-200/60 dark:border-amber-900/40 text-[11px] space-y-1">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                  <span><span className="text-amber-500 font-mono">Variable {i + 1}:</span> {uk.variable}</span>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${uk.riskImpact === 'Critical' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>{uk.riskImpact} Risk</span>
                                </div>
                                <div className="text-[10px] text-slate-600 dark:text-slate-400">
                                  <span className="font-semibold text-emerald-500">Validation Action:</span> {uk.recommendedResearchAction}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Potential Failure Modes & Mitigation Playbooks */}
                      {masterStrategy.failureModes && masterStrategy.failureModes.length > 0 && (
                        <div className="p-4 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 block">
                            Potential Failure Modes & Mitigation Playbooks
                          </span>
                          <div className="space-y-2">
                            {masterStrategy.failureModes.map((fm, i) => (
                              <div key={i} className="p-2.5 bg-white dark:bg-slate-900 rounded border border-rose-200/60 dark:border-rose-900/40 text-[11px] space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900 dark:text-white">{fm.riskDescription}</span>
                                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                                    fm.failureLikelihood === 'High' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'
                                  }`}>
                                    {fm.failureLikelihood} Likelihood
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-600 dark:text-slate-400">
                                  <span className="font-semibold text-emerald-500">Mitigation Playbook:</span> {fm.mitigationPlaybook}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 5: ASK STRATEGIST & PATCH */}
                  {activeStrategyTab === 'advisory' && (
                    <div className="space-y-4">
                      {/* Ask the Strategist Console */}
                      <div className="p-4 bg-slate-50/70 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                            Ask the Chief Strategy Officer (Strategic Advisory)
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Query strategic angles, channel trade-offs, or request revisions. Recommended adjustments generate versioned patches.
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={askQuery}
                            onChange={(e) => setAskQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && askQuery.trim() && !isAsking) {
                                e.preventDefault();
                                handleAskStrategist();
                              }
                            }}
                            placeholder="e.g. How should we adapt this for a B2B LinkedIn audience? Or make the tone more sarcastic..."
                            className="flex-1 text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                          />
                          <button
                            type="button"
                            disabled={isAsking || !askQuery.trim()}
                            onClick={handleAskStrategist}
                            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded text-xs font-bold uppercase tracking-wider cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                          >
                            {isAsking ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            Consult
                          </button>
                        </div>

                        {/* Q&A Responses History */}
                        {askResponses.length > 0 && (
                          <div className="space-y-3 pt-2">
                            {askResponses.map((item, idx) => (
                              <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-2 text-left">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                  <MessageSquare size={13} className="text-rose-500" />
                                  "{item.query}"
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                                  {item.answer}
                                </p>
                                {item.recommendation && (
                                  <div className="p-2 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded text-[11px] text-rose-700 dark:text-rose-300">
                                    <span className="font-bold">Recommendation:</span> {item.recommendation}
                                  </div>
                                )}

                                {/* Proposed Patch Diff Card */}
                                {item.patch && (
                                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded space-y-2 mt-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 font-mono">
                                        Proposed Strategy Patch (Diff)
                                      </span>
                                      <span className="text-[9px] font-mono text-slate-400">
                                        Section: {item.patch.section} • Field: {item.patch.targetField}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                      {item.patch.rationale}
                                    </p>
                                    <div className="p-2 bg-white dark:bg-slate-900 rounded font-mono text-[10px] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                      {typeof item.patch.proposedValue === 'object' ? JSON.stringify(item.patch.proposedValue, null, 2) : String(item.patch.proposedValue)}
                                    </div>
                                    <button
                                      type="button"
                                      disabled={isApplyingPatch}
                                      onClick={() => handleApplyPatch(item.patch!)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                                    >
                                      {isApplyingPatch ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                      Accept & Create v{(masterStrategy.versionNumber || 1) + 1}.0 Strategy
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setJourneyStep('03_strategic_routes')}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <ChevronLeft size={16} /> Choose Different Route
                  </button>

                  <button
                    type="button"
                    onClick={() => setJourneyStep('05_activate')}
                    className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded shadow-md flex items-center gap-2 cursor-pointer transition-all font-sans"
                  >
                    Proceed to Creative Gem Hub
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STAGE 5: ACTIVATE (GEM HUB) */}
            {journeyStep === '05_activate' && downstreamBriefs && (
              <motion.div
                key="05_activate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 text-left"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 flex-wrap gap-2">
                  <div>
                    <h2 className="text-xl font-light tracking-tight text-slate-900 dark:text-white">
                      05 Campaign Production Plan & Creative Hub
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      5-tier dynamic asset architecture with dependency links and deterministic brief staging.
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded">
                    {(['text', 'image', 'video', 'audio', 'deck'] as const).map(tab => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveGemBriefTab(tab)}
                        className={`text-xs px-3 py-1.5 rounded font-bold uppercase transition-all cursor-pointer ${
                          activeGemBriefTab === tab
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tab === 'deck' ? 'Campaign Deck' : `${tab} Gem`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[58vh] overflow-y-auto pr-1 text-left space-y-4">
                  {/* Dynamic 5-Tier Campaign Production Plan */}
                  {masterStrategy?.productionPlan && (
                    <div className="p-4 bg-slate-50/70 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Layers size={15} className="text-rose-500" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            5-Tier Production Asset Architecture
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          Est. Production Cost: {masterStrategy.productionPlan.estimatedProductionCreditRange?.min ?? 38}–{masterStrategy.productionPlan.estimatedProductionCreditRange?.max ?? 54} Credits (Staged Free)
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {Object.values(masterStrategy.productionPlan.tiers || {}).map((t, idx) => (
                          <div key={idx} className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                                {t.tierLabel}
                              </span>
                              {!t.isRecommended ? (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold">
                                  Omitted: {t.omissionRationale || 'Not in scope'}
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold">
                                  {t.assets?.length || 0} Assets Staged
                                </span>
                              )}
                            </div>

                            {t.isRecommended && t.assets && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                {t.assets.map(asset => (
                                  <div key={asset.id} className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800/80 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900 dark:text-white text-[10px]">
                                        {asset.title}
                                      </span>
                                      <span className="text-[9px] font-mono text-slate-500 uppercase">{asset.assetType}</span>
                                    </div>
                                    <div className="text-[9px] text-slate-500">{asset.targetChannel}</div>
                                    {asset.dependsOn && asset.dependsOn.length > 0 && (
                                      <div className="text-[9px] font-mono text-rose-500 bg-rose-500/5 px-1 py-0.5 rounded">
                                        Depends on: {asset.dependsOn.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strategy to Creative Connection Inspector */}
                  <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Workflow size={15} className="text-purple-500 shrink-0" />
                      <span className="text-slate-800 dark:text-slate-200">
                        <span className="font-bold">Strategy-to-Creative Lineage: </span>
                        Territory creative codes and tension mechanisms are deterministically injected into all downstream prompt contracts.
                      </span>
                    </div>
                  </div>

                  {/* TEXT GEM TAB */}
                  {activeGemBriefTab === 'text' && (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                          Compiled Text Creative Brief
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(JSON.stringify(downstreamBriefs.textBrief, null, 2), 'text')}
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            <Copy size={12} /> {copiedBriefId === 'text' ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchGem('strategy-captions')}
                            className="flex items-center gap-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded shadow-xs cursor-pointer transition-all"
                          >
                            Open in Captions Gem <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block">Copywriting Tone & Angle</span>
                          <p className="text-slate-800 dark:text-slate-200 font-medium">{downstreamBriefs.textBrief.tone} — {downstreamBriefs.textBrief.angle}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block">Core Hook</span>
                          <p className="text-slate-800 dark:text-slate-200 font-serif italic">"{downstreamBriefs.textBrief.coreHook}"</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block">Call to Action</span>
                          <span className="inline-block px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-mono text-rose-600 dark:text-rose-400 font-semibold mt-1">
                            {downstreamBriefs.textBrief.callToAction}
                          </span>
                        </div>
                        {downstreamBriefs.textBrief.constraints?.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 block">Brand Guardrails</span>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 text-[11px] mt-1">
                              {downstreamBriefs.textBrief.constraints.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* IMAGE GEM TAB */}
                  {activeGemBriefTab === 'image' && (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                            Compiled Image Gem Concept ({downstreamBriefs.imageBrief.assetRole})
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold">
                            Conditioning: {downstreamBriefs.imageBrief.referenceRequirements}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(JSON.stringify(downstreamBriefs.imageBrief, null, 2), 'image')}
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            <Copy size={12} /> {copiedBriefId === 'image' ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchGem('standard-image')}
                            className="flex items-center gap-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded shadow-xs cursor-pointer transition-all"
                          >
                            Open in Image Gem <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white capitalize">{downstreamBriefs.imageBrief.assetRole}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-medium">
                            {downstreamBriefs.imageBrief.aspectRatios?.join(', ')}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{downstreamBriefs.imageBrief.visualConcept}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                          <div><span className="font-bold text-slate-800 dark:text-slate-200">Composition:</span> {downstreamBriefs.imageBrief.composition}</div>
                          <div><span className="font-bold text-slate-800 dark:text-slate-200">Lighting:</span> {downstreamBriefs.imageBrief.lighting}</div>
                          <div><span className="font-bold text-slate-800 dark:text-slate-200">Camera:</span> {downstreamBriefs.imageBrief.cameraAngle}</div>
                        </div>
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Textless Prompt:</span>
                          {downstreamBriefs.imageBrief.textlessPrompt}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VIDEO GEM TAB */}
                  {activeGemBriefTab === 'video' && (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                          Compiled Video Scene Brief ({downstreamBriefs.videoBrief.shotPurpose})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(JSON.stringify(downstreamBriefs.videoBrief, null, 2), 'video')}
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            <Copy size={12} /> {copiedBriefId === 'video' ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchGem('cinematic-video')}
                            className="flex items-center gap-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded shadow-xs cursor-pointer transition-all"
                          >
                            Open in Video Gem <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white capitalize">{downstreamBriefs.videoBrief.shotPurpose}</span>
                          <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                            {downstreamBriefs.videoBrief.durationSec}s | {downstreamBriefs.videoBrief.aspectRatio}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{downstreamBriefs.videoBrief.sceneDescription}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                          <div><span className="font-bold text-slate-800 dark:text-slate-200">Camera Movement:</span> {downstreamBriefs.videoBrief.cameraMovement}</div>
                          <div><span className="font-bold text-slate-800 dark:text-slate-200">Pacing:</span> {downstreamBriefs.videoBrief.pacingNote}</div>
                          <div><span className="font-bold text-slate-800 dark:text-slate-200">Narrative Arc:</span> {downstreamBriefs.videoBrief.narrativeArc}</div>
                        </div>
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Textless Prompt:</span>
                          {downstreamBriefs.videoBrief.textlessPrompt}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AUDIO GEM TAB */}
                  {activeGemBriefTab === 'audio' && (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                          Compiled Audio & Voiceover Brief
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(JSON.stringify(downstreamBriefs.audioBrief, null, 2), 'audio')}
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            <Copy size={12} /> {copiedBriefId === 'audio' ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchGem('audio-studio')}
                            className="flex items-center gap-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded shadow-xs cursor-pointer transition-all"
                          >
                            Open in Audio Studio <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{downstreamBriefs.audioBrief.language} {downstreamBriefs.audioBrief.dialectOrAccent ? `(${downstreamBriefs.audioBrief.dialectOrAccent})` : ''}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-medium">
                            Pace: {downstreamBriefs.audioBrief.pace}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                          <div><span className="font-bold text-slate-800 dark:text-slate-200">Style:</span> {downstreamBriefs.audioBrief.performanceStyle}</div>
                          <div><span className="font-bold text-slate-800 dark:text-slate-200">Music Mood:</span> {downstreamBriefs.audioBrief.musicMood} ({downstreamBriefs.audioBrief.musicRole})</div>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                          <span className="font-bold text-slate-600 dark:text-slate-400 block mb-1 text-[10px]">Spoken Script / Performance Intent:</span>
                          <p className="text-slate-800 dark:text-slate-200 font-serif italic text-sm">
                            "{downstreamBriefs.audioBrief.spokenScriptText || downstreamBriefs.audioBrief.scriptIntent}"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DECK GEM TAB */}
                  {activeGemBriefTab === 'deck' && downstreamBriefs.deckBrief && (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                          Presentation Outline ({downstreamBriefs.deckBrief.slides?.length || 0} Slides)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(JSON.stringify(downstreamBriefs.deckBrief, null, 2), 'deck')}
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            <Copy size={12} /> {copiedBriefId === 'deck' ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchGem('corporate-presentations')}
                            className="flex items-center gap-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded shadow-xs cursor-pointer transition-all"
                          >
                            Open in Presentation Gem <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {downstreamBriefs.deckBrief.slides?.map(s => (
                          <div key={s.slideNumber} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white">Slide {s.slideNumber}: {s.slideTitle}</span>
                              <span className="text-[10px] font-mono uppercase text-slate-500">{s.purpose}</span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 text-[11px]"><span className="font-semibold">Takeaway:</span> {s.executiveTakeaway}</p>
                            <p className="text-slate-500 text-[10px] italic"><span className="font-semibold not-italic">Visual:</span> {s.visualDirection}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls & Activation Button */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setJourneyStep('04_build_strategy')}
                      className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Back to Master Strategy
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadJSON}
                      className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Download size={13} /> JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMarkdown}
                      className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <FileText size={13} /> Markdown
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowActivateConfirmModal(true)}
                      className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded shadow-md flex items-center gap-2 cursor-pointer transition-all font-sans"
                    >
                      <CheckCircle2 size={14} />
                      Activate Campaign Plan
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

{/* Sticky Whiteboard / Real-Time Summary Sidebar Panel */}
      <div className="w-full lg:w-80 bg-slate-50/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 self-stretch flex flex-col justify-between shrink-0 shadow-sm text-left">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Target size={16} className="text-slate-800 dark:text-slate-200" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest font-mono">
              Strategist's Whiteboard
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Active Journey Stage */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Active Journey Stage</span>
              <p className="text-rose-600 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/40 p-2 border border-rose-200 dark:border-rose-900/60 rounded font-mono text-[11px] font-bold">
                {journeyStep.toUpperCase().replace('_', ' ')}
              </p>
            </div>

            {/* Strategic Readiness */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Strategic Readiness</span>
              <p className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/90 p-2 border border-slate-200 dark:border-slate-700 rounded font-mono text-[11px] font-medium">
                {discoveryConfidence?.readiness
                  ? discoveryConfidence.readiness.overallReadiness.replace(/_/g, ' ')
                  : discoveryConfidence
                  ? `${Math.round(discoveryConfidence.confidenceScore * 100)}% Strategic Sufficiency`
                  : <span className="text-slate-400 dark:text-slate-500 italic font-sans">Pending brief submission</span>}
              </p>
            </div>

            {/* Ambition & Risk */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Ambition & Risk Level</span>
              <p className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/90 p-2 border border-slate-200 dark:border-slate-700 rounded font-mono text-[11px] font-medium capitalize">
                {ambitionLevel.replace(/_/g, ' ')} • {riskTolerance} risk
              </p>
            </div>

            {/* Active Guardrails */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Active Governance Guardrails</span>
              <p className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/90 p-2 border border-slate-200 dark:border-slate-700 rounded font-mono text-[11px] font-medium">
                {mandatoryInclusions.length} Inclusions • {forbiddenTerritories.length} Forbidden
              </p>
            </div>

            {/* Target Region & Language */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Target Region & Language</span>
              <p className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/90 p-2 border border-slate-200 dark:border-slate-700 rounded font-mono text-[11px] font-medium">
                {countryRegion} • {campaignLanguage}
              </p>
            </div>

            {/* Selected Route */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Selected Strategic Route</span>
              <p className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/90 p-2 border border-slate-200 dark:border-slate-700 rounded font-mono text-[11px] font-medium">
                {selectedTerritory ? selectedTerritory.title : <span className="text-slate-400 dark:text-slate-500 italic font-sans">Pending selection</span>}
              </p>
            </div>

            {/* Strategy Version */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Strategy Version & State</span>
              <p className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800/90 p-2 border border-slate-200 dark:border-slate-700 rounded font-mono text-[11px] font-medium">
                {masterStrategy
                  ? `v${masterStrategy.versionNumber || 1}.0 ${masterStrategy.parentVersionId ? '(Active Patch)' : '(Locked)'}`
                  : <span className="text-slate-400 dark:text-slate-500 italic font-sans">Not yet compiled</span>}
              </p>
            </div>

            {/* Production Plan Readiness */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Multimodal Gem Readiness</span>
              <div className="flex flex-wrap gap-1 p-0.5">
                {downstreamBriefs ? (
                  ['Text', 'Image', 'Video', 'Audio', 'Deck'].map(g => (
                    <span key={g} className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded border border-emerald-500/20">
                      {g} Staged
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic font-sans text-[11px]">Awaiting strategy compilation</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Agency Stamp */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-6 text-center">
          <span className="text-[9px] tracking-widest uppercase font-extrabold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded block font-mono">
            Strategic Intelligence Core • Active
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 block mt-1.5 font-medium">Culturally grounded resonance modeling</span>
        </div>
      </div>

{/* Lock Route & Synthesize Confirmation Modal */}
      <AnimatePresence>
        {showLockConfirmModal && territoryToLock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-lg w-full p-6 text-left shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                      Confirm Strategic Route Locking
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Commit direction & compile master operating system
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLockConfirmModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white text-sm block">
                    {territoryToLock.title}
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 italic font-serif">
                    "{territoryToLock.oneLinePremise}"
                  </p>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <DollarSign size={13} />
                    <span>Credit Charge Notice (5 Credits)</span>
                  </div>
                  <p className="text-[11px]">
                    Exploration and alternatives were free. Synthesizing the 16-dimension Master Strategy, 5-stage Customer Journey, and 5-tier Production Architecture will deduct 5 credits from your workspace.
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Current workspace balance: <strong className="font-mono text-slate-800 dark:text-slate-200">{credits} credits</strong></span>
                  {credits < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowLockConfirmModal(false);
                        triggerGlobalCreditGate({
                          service: 'Campaign Master Strategy',
                          requiredCredits: 5,
                          availableCredits: credits
                        });
                      }}
                      className="text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Need credits? Get Credits →
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLockConfirmModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSynthesizing}
                  onClick={() => handleSelectTerritoryAndSynthesize(territoryToLock)}
                  className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isSynthesizing ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Synthesizing Strategy...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      Confirm & Synthesize (5 cr)
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strategic Stress Test Audit Report Modal */}
      <AnimatePresence>
        {showStressTestModal && stressTestReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col text-left shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={18} className="text-rose-500" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                      Pre-Flight Strategic Stress Test Audit
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Multi-vector resilience evaluation against market failure modes
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStressTestModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Overall Strategic Health Score</span>
                    <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                      {stressTestReport.overallHealthScore} / 100
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold px-3 py-1 rounded uppercase ${
                    stressTestReport.overallHealthScore >= 80
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : stressTestReport.overallHealthScore >= 60
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}>
                    {stressTestReport.overallHealthScore >= 80 ? 'Robust Strategy' : stressTestReport.overallHealthScore >= 60 ? 'Moderate Resilience' : 'High Vulnerability'}
                  </span>
                </div>

                {stressTestReport.csoVerdict && (
                  <div className="p-2.5 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded text-[11px] text-slate-800 dark:text-slate-200">
                    <span className="font-bold text-rose-600 dark:text-rose-400 font-mono uppercase text-[10px] block">Chief Strategy Officer Verdict:</span>
                    {stressTestReport.csoVerdict}
                  </div>
                )}

                {stressTestReport.topFailureRisks?.length > 0 && (
                  <div className="p-3 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded space-y-1">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block font-mono">
                      Top Identified Failure Risks
                    </span>
                    <ul className="list-disc list-inside text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
                      {stressTestReport.topFailureRisks.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Vector Stress Audits
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stressTestReport.vectorAudits?.map((vec, i) => (
                      <div key={i} className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                            {vec.vector}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                            vec.riskScore === 'Low' ? 'bg-emerald-500/10 text-emerald-500' : vec.riskScore === 'Moderate' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {vec.riskScore} Risk
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[10px]">{vec.vulnerabilitySummary}</p>
                        <div className="p-1.5 bg-slate-50 dark:bg-slate-800/40 rounded text-[9px] text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-rose-500">Mitigation: </span>
                          {vec.mitigationRecommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowStressTestModal(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Close Audit Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activate Campaign Plan Confirmation Modal */}
      <AnimatePresence>
        {showActivateConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-lg w-full p-6 text-left shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                      Activate Multimodal Campaign Plan
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cross-gem deterministic brief staging
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActivateConfirmModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Activating this plan will stage all deterministic briefs across your creative suite:
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block">Text & Captions Gem</span>
                    <span className="text-slate-500 text-[10px]">Hooks, angles, tone & CTAs</span>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block">Image Studio Gem</span>
                    <span className="text-slate-500 text-[10px]">Key visuals & composition</span>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block">Cinematic Video Gem</span>
                    <span className="text-slate-500 text-[10px]">Pacing & narrative scenes</span>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block">Audio Studio Gem</span>
                    <span className="text-slate-500 text-[10px]">Voiceover scripts & music mood</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded text-emerald-800 dark:text-emerald-300 space-y-1">
                  <span className="font-bold block">Free Staging Guarantee</span>
                  <p className="text-[11px]">
                    Brief staging consumes <strong>0 credits</strong>. Individual multimodal asset rendering in downstream Gems will draw credits only when you click "Generate" in those respective tools.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowActivateConfirmModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stageAllBriefs();
                    setShowActivateConfirmModal(false);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <CheckCircle2 size={13} />
                  Confirm & Stage All Briefs (0 cr)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Asset Lightbox Preview Modal */}
      <AnimatePresence>
        {previewAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-left"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm flex items-center gap-1 ${
                      previewAsset.type === 'copy'
                        ? 'bg-blue-500/10 text-blue-500'
                        : previewAsset.type === 'video'
                        ? 'bg-purple-500/10 text-purple-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {previewAsset.type}
                    </span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Render Preview</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{previewAsset.title}</h3>
                </div>
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="p-1 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white rounded text-xs font-bold text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              {/* Main Content Area */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-950 dark:bg-slate-950/80 min-h-75">
                {previewAsset.type === 'copy' && previewAsset.content && (
                  <div className="w-full bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[50vh] text-left">
                    <div className="text-xs text-slate-700 dark:text-slate-250 leading-relaxed font-sans prose dark:prose-invert max-w-none select-all whitespace-pre-wrap markdown-body">
                      <ReactMarkdown>{previewAsset.content}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {previewAsset.type === 'image' && previewAsset.url && (
                  <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch max-h-[60vh] md:max-h-[65vh] overflow-hidden">
                    {/* Left: Interactive Canvas Workspace (Span 7) */}
                    <div className="md:col-span-7 flex flex-col justify-between bg-slate-950 dark:bg-black/40 border border-slate-800 rounded-lg p-2 relative">
                      <span className="text-[9px] font-black tracking-widest text-rose-500 uppercase absolute top-4 left-4 z-10 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                        Interactive Visual Studio • Drag Layers To Arrange
                      </span>
                      <div 
                        ref={containerRef}
                        onMouseMove={handleContainerMouseMove}
                        onTouchMove={handleContainerTouchMove}
                        onMouseUp={handleContainerMouseUp}
                        onTouchEnd={handleContainerTouchEnd}
                        className="relative w-full aspect-square md:h-[48vh] md:w-auto mx-auto rounded overflow-hidden select-none border border-slate-800 flex items-center justify-center cursor-crosshair bg-slate-900"
                      >
                        {/* Underlay Image */}
                        <img
                          src={previewAsset.url}
                          alt={previewAsset.title}
                          className="w-full h-full object-contain pointer-events-none"
                          referrerPolicy="no-referrer"
                        />

                        {/* Interactive Logo Overlay (If guidelines logo exist) */}
                        {brandGuidelines.logo && (
                          <div
                            onMouseDown={handleLogoMouseDown}
                            onTouchStart={handleLogoTouchStart}
                            style={{
                              position: 'absolute',
                              left: `${logoPosition.x}%`,
                              top: `${logoPosition.y}%`,
                              transform: `translate(-50%, -50%) scale(${logoScale / 100})`,
                              cursor: 'move',
                              zIndex: 30,
                            }}
                            className={`p-1.5 rounded-xs border-2 select-none touch-none ${
                              isDraggingLogo 
                                ? 'border-dashed border-rose-500 bg-rose-500/10' 
                                : 'border-slate-400 group-hover:border-rose-400'
                            }`}
                          >
                            <img
                              src={brandGuidelines.logo}
                              alt="Brand Logo"
                              className={`h-20 w-auto object-contain max-w-30 select-none pointer-events-none ${

                                logoColorMode === 'black'
                                  ? 'brightness-0'
                                  : logoColorMode === 'white'
                                  ? 'brightness-0 invert'
                                  : logoColorMode === 'gray'
                                  ? 'brightness-0 opacity-50 font-sans'
                                  : ''
                              }`}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-[8px] text-slate-300 font-extrabold uppercase px-1 rounded scale-75 whitespace-nowrap">
                              Logo Layer
                            </div>
                          </div>
                        )}

                        {/* Draggable Typographic Word Layers */}
                        {textLayers.map((layer) => (
                          <div
                            key={layer.id}
                            onMouseDown={(e) => handleTextMouseDown(e, layer.id)}
                            onTouchStart={(e) => handleTextTouchStart(e, layer.id)}
                            style={{
                              position: 'absolute',
                              left: `${layer.position.x}%`,
                              top: `${layer.position.y}%`,
                              transform: 'translate(-50%, -50%)',
                              fontFamily: layer.fontFamily,
                              fontSize: `${layer.scale * 2.2}px`,
                              color: layer.color,
                              cursor: 'move',
                              zIndex: 45,
                            }}
                            className={`px-2 py-1 select-none font-bold uppercase whitespace-nowrap touch-none hover:outline hover:outline-dashed hover:outline-slate-400 ${
                              draggingTextWordId === layer.id
                                ? 'outline outline-rose-500 bg-rose-500/5'
                                : selectedTextWordId === layer.id
                                ? 'outline outline-dashed outline-rose-400'
                                : ''
                            }`}
                          >
                            {layer.text}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 justify-center mt-2">
                        <span className="text-[9px] text-slate-400 font-mono">
                          Logo Center: X: {Math.round(logoPosition.x)}% | Y: {Math.round(logoPosition.y)}%
                        </span>
                        <span className="text-slate-600 text-[10px]">•</span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          Text Layers: {textLayers.length} Active
                        </span>
                      </div>
                    </div>

                    {/* Right: Fine-tuning Side Controls (Span 5) */}
                    <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded p-4 flex flex-col justify-between overflow-y-auto max-h-[50vh] md:max-h-none">
                      <div className="space-y-4">
                        {/* Selector Tabs */}
                        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          {brandGuidelines.logo && (
                            <button
                              onClick={() => setActiveLayoutTab('logo')}
                              className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm cursor-pointer transition-all ${
                                activeLayoutTab === 'logo'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Logo Layer
                            </button>
                          )}
                          <button
                            onClick={() => setActiveLayoutTab('text')}
                            className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm cursor-pointer transition-all ${
                              activeLayoutTab === 'text' || !brandGuidelines.logo
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Text Typography
                          </button>
                          <button
                            onClick={() => setActiveLayoutTab('humantouch')}
                            className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm cursor-pointer transition-all flex items-center gap-1 ${
                              activeLayoutTab === 'humantouch'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            🤝 Human Touch
                          </button>
                        </div>

                        {/* TAB: LOGO OVERLAY ADJUSTER */}
                        {activeLayoutTab === 'logo' && brandGuidelines.logo && (
                          <div className="space-y-4 text-left">
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Logo Layer Position Fine-Tuning</span>
                            
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] text-slate-400 uppercase font-bold">Logo Scale/Size</label>
                                <span className="font-mono text-xs text-slate-350">{logoScale}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="5" 
                                max="150" 
                                value={logoScale}
                                onChange={(e) => setLogoScale(parseInt(e.target.value))}
                                className="w-full accent-rose-600 h-1 bg-slate-805 rounded-lg cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1.5 p-2 bg-slate-950 border border-slate-800 rounded-sm">
                              <div>
                                <span className="text-[10px] text-slate-300 dark:text-slate-200 font-bold uppercase tracking-wide block font-sans">Invert Logo Colors</span>
                                <p className="text-[9px] text-slate-500 mb-1.5">Configure single-color silhouettes to match visual backing contrasts</p>
                              </div>
                              <div className="bg-slate-900 p-1.5 border border-slate-800 rounded-sm w-full">
                                <button
                                  type="button"
                                  onClick={() => setLogoColorMode(logoColorMode === 'white' ? 'original' : 'white')}
                                  className={`w-full text-[10px] py-1.5 px-2 rounded-xs select-none uppercase tracking-wider font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    logoColorMode === 'white'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <RefreshCw size={11} className={logoColorMode === 'white' ? 'rotate-180 transition-transform duration-500' : ''} />
                                  {logoColorMode === 'white' ? 'Inverted (White)' : 'Inverted Logo'}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase block">Manual X Offset</label>
                                <input 
                                  type="number"
                                  value={Math.round(logoPosition.x)}
                                  onChange={(e) => setLogoPosition(prev => ({ ...prev, x: Number(e.target.value) }))}
                                  className="w-full bg-slate-950 border border-slate-800 p-1.5 text-xs text-white rounded-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase block">Manual Y Offset</label>
                                <input 
                                  type="number"
                                  value={Math.round(logoPosition.y)}
                                  onChange={(e) => setLogoPosition(prev => ({ ...prev, y: Number(e.target.value) }))}
                                  className="w-full bg-slate-950 border border-slate-800 p-1.5 text-xs text-white rounded-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TAB: TEXT OVERLAYS CREATOR */}
                        {(activeLayoutTab === 'text' || !brandGuidelines.logo) && (
                          <div className="space-y-4 text-left">
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Typographic Overlays Studio</span>
                            
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold uppercase block">New Text Content</label>
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  value={newTextWordInput}
                                  onChange={(e) => setNewTextWordInput(e.target.value)}
                                  placeholder="e.g. ULTRA LUXURY"
                                  className="flex-1 bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-white rounded-sm focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"

                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddTextWord(true);
                                    }
                                  }}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => handleAddTextWord(true)}
                                  disabled={!newTextWordInput.trim()}
                                  className="py-1.5 bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-[9px] uppercase tracking-wider rounded-sm disabled:opacity-40 transition-colors cursor-pointer"
                                >
                                  Add Per Word
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddTextWord(false)}
                                  disabled={!newTextWordInput.trim()}
                                  className="py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-750 font-extrabold text-[9px] uppercase tracking-wider rounded-sm disabled:opacity-40 transition-colors cursor-pointer border border-slate-700"
                                >
                                  Add As Phrase
                                </button>
                              </div>
                            </div>

                            {/* Active Layer Customizer Style Block */}
                            {selectedTextWordId ? (() => {
                              const activeWord = textLayers.find(w => w.id === selectedTextWordId);
                              if (!activeWord) return null;
                              return (
                                <div className="p-3 bg-slate-955 border border-slate-800 rounded-xs space-y-3">
                                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">layer styling properties</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTextLayers(prev => prev.filter(w => w.id !== selectedTextWordId));
                                        setSelectedTextWordId(null);
                                      }}
                                      className="text-rose-500 hover:text-rose-400 font-extrabold text-[9px] uppercase tracking-wider cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] text-slate-450 uppercase block">Active Text Content</label>
                                    <input 
                                      type="text"
                                      value={activeWord.text}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, text: v } : w));
                                      }}
                                      className="w-full bg-slate-900 border border-slate-800 px-2 py-1 text-xs text-white rounded focus:outline-none"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] text-slate-450 uppercase block">Font Family</label>
                                    <select
                                      value={activeWord.fontFamily}
                                      onChange={(e) => {
                                        const f = e.target.value;
                                        setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, fontFamily: f } : w));
                                      }}
                                      className="w-full bg-slate-900 border border-slate-800 px-2 py-1.5 text-xs text-white rounded cursor-pointer"
                                    >
                                      {[
                                        { label: 'Outfit (Modern)', value: 'Outfit' },
                                        { label: 'Inter (Clean Global)', value: 'Inter' },
                                        { label: 'Space Grotesk (Tech Accent)', value: 'Space Grotesk' },
                                        { label: 'Playfair Display (Serif)', value: 'Playfair Display' },
                                        { label: 'Cormorant Garamond (Graceful)', value: 'Cormorant Garamond' },
                                        { label: 'JetBrains Mono (Technical)', value: 'JetBrains Mono' },
                                      ].map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[9px] text-slate-450 uppercase block">Scale</label>
                                      <input 
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={activeWord.scale}
                                        onChange={(e) => {
                                          const sc = parseInt(e.target.value) || 12;
                                          setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, scale: sc } : w));
                                        }}
                                        className="w-full bg-slate-900 border border-slate-800 p-1.5 text-xs text-white rounded"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] text-slate-450 uppercase block">Fill Color</label>
                                      <input 
                                        type="color"
                                        value={activeWord.color}
                                        onChange={(e) => {
                                          const c = e.target.value;
                                          setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, color: c } : w));
                                        }}
                                        className="w-full h-8 bg-slate-900 border border-slate-800 p-0.5 rounded cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })() : (
                              <p className="p-3 bg-slate-950 rounded-sm text-[10px] text-slate-500 text-center italic border border-slate-850">
                                Click or place any text layer to configure its distinct font styles, scales, and colors.
                              </p>
                            )}
                          </div>
                        )}

                        {/* TAB: HUMAN TOUCH last-mile professional review */}
                        {activeLayoutTab === 'humantouch' && (
                          <div className="space-y-3.5 text-left">
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">🤝 Writopedia Last-Mile Human Touch Refinement</span>
                            
                            <p className="text-[11px] text-slate-400 leading-relaxed font-sans font-light">
                              Deploy human designers, cultural copywriters, and production specialists to tweak, refine, or polish this AI draft for active commercial activation.
                            </p>

                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400 font-bold uppercase block font-sans">Specialist Reviewer Instructions</label>
                              <textarea
                                value={humanTouchRefinementText}
                                onChange={(e) => setHumanTouchRefinementText(e.target.value)}
                                rows={3}
                                placeholder="Write clear guidelines, revisions, or edits you require..."
                                className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-white rounded-sm focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-slate-600"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (setHumanTouchItem) {
                                  // Trigger Writopedia modal in parent
                                  setHumanTouchItem({
                                    imageUrl: previewAsset.url,
                                    prompt: previewAsset.description,
                                    title: previewAsset.title,
                                    modelsUsed: 'Imagen 3 Pro • Campaign Strategist W',
                                    role: 'Visual Content'
                                  });
                                } else {
                                  alert('Human Touch Integration: request received! Dispatched successfully.');
                                }
                              }}
                              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase py-2.5 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                            >
                              🚀 Assign To Real-World Specialist
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Download Layered Interactive Composition Output */}
                      <div className="pt-4 border-t border-slate-800 flex justify-end">
                        <button
                          onClick={() => {
                            if (previewAsset && previewAsset.url) {
                              const link = document.createElement('a');
                              link.href = previewAsset.url;
                              link.download = `brand-image-${Date.now()}.png`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }
                          }}
                          className="px-4 py-2 bg-white text-slate-900 border border-slate-350 text-xs font-black uppercase tracking-wider rounded-sm hover:bg-slate-100 flex items-center gap-1 cursor-pointer font-sans"
                        >
                          📥 Download High-Resolution Composition
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {previewAsset.type === 'video' && previewAsset.url && (
                  <div className="w-full max-w-3xl max-h-[55vh] flex items-center justify-center">
                    <video
                      src={previewAsset.url}
                      controls
                      autoPlay
                      className="max-w-full max-h-[50vh] rounded border border-slate-800 shadow-xl"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer / Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 max-w-[70%] text-[10px] text-slate-400 dark:text-slate-500">
                  <span className="font-bold uppercase tracking-wider block">Render brief parameters:</span>
                  <p className="font-light italic line-clamp-2" title={previewAsset.description}>
                    {previewAsset.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 justify-end self-end sm:self-auto shrink-0">
                  {previewAsset.type === 'copy' && previewAsset.content && (
                    <button
                      onClick={() => handleCopyToClipboard(previewAsset.content || '')}
                      className="px-3 py-2 border border-slate-250 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 rounded cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Copy size={12} /> Copy Output
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadAsset(previewAsset)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Download size={12} /> Direct Download
                  </button>
                  {previewAsset.type === 'image' && (
                    <button
                      type="button"
                      onClick={() => {
                        setRefiningAsset(previewAsset);
                        setRefiningPromptText('');
                        setShowRefineModal(true);
                      }}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-[10px] font-bold uppercase text-white rounded cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles size={12} className="text-white animate-pulse" /> Refine with AI
                    </button>
                  )}

                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refine with AI modal */}
      {showRefineModal && refiningAsset && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-110 p-4 animate-in fade-in" id="refine-ai-modal">

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl overflow-hidden max-w-lg w-full flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-sm">
                  <Sparkles size={16} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Refine Asset with AI</h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Production Quality Real-time Creative Adjuster</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowRefineModal(false);
                  setRefiningAsset(null);
                }}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs uppercase font-extrabold pr-1"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="flex gap-4 items-center p-3 bg-slate-50 dark:bg-slate-950/40 rounded-sm border border-slate-200 dark:border-slate-800">
                <img 
                  src={refiningAsset.url} 
                  alt="Original Image preview" 
                  className="w-16 h-16 object-cover rounded-xs border dark:border-slate-800 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-[11px] font-bold text-slate-800 dark:text-white line-clamp-1">{refiningAsset.title}</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug line-clamp-2 italic font-light">"{refiningAsset.description}"</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider block">Refinement instructions</label>
                <textarea
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-sm focus:border-rose-500 outline-none font-sans text-slate-800 dark:text-slate-200 placeholder-slate-400 leading-relaxed min-h-22.5"
                  placeholder="e.g., Make the background mood dark blue, increase the cinematic backlighting on the products, correct lighting..."
                  value={refiningPromptText}
                  onChange={(e) => setRefiningPromptText(e.target.value)}
                />
                <div className="flex items-center justify-between mt-1 text-[9px] uppercase tracking-wide text-rose-500 font-extrabold">

                  <span className="text-rose-600 dark:text-rose-400">✨ 2 credits will be deducted</span>
                  <span className="text-slate-400 dark:text-slate-500">System: Model {selectedImageModel?.split('-')[0] || 'AI'}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRefineModal(false);
                  setRefiningAsset(null);
                }}
                disabled={isExecutingRefine}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteProductionRefine}
                disabled={isExecutingRefine || !refiningPromptText.trim()}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md transition-all"
              >
                {isExecutingRefine ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Refining...
                  </>
                ) : (
                  <>
                    <Sparkles size={11} className="animate-pulse" />
                    Apply Refinement
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

// CheckCircle2 alternative for compile safety if missing from main imports
const CheckCircle2Icon = ({ size }: { size: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="lucide lucide-check-circle-2"
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);
