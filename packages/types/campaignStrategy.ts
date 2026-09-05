/**
 * Campaign Strategist 2.0 Domain Types & Contracts.
 * Centralized intelligence model decoupling strategy generation,
 * multi-vector novelty checking, epistemic classification, and downstream gem orchestration.
 */

// ---------------------------------------------------------------------------
// 1. Epistemic Classification & Evidence Taxonomy
// ---------------------------------------------------------------------------

export type EpistemicStatus =
  | 'evidence'       // Direct fact provided by user or verified brand kit
  | 'inference'      // Logical deduction derived from market/audience dynamics
  | 'recommendation' // Strategic or creative choice proposed by the engine
  | 'assumption'     // Working hypothesis that requires validation
  | 'placeholder';   // Unverified metric or benchmark (e.g. "[Insert verified YoY %]")

export type EvidenceBasis =
  | 'user_provided'
  | 'brand_heritage'
  | 'market_evidence'
  | 'ai_inference'
  | 'assumption_validate_before_launch';

export interface MarketEvidenceCitation {
  sourceType: 'client_data' | 'workspace_doc' | 'industry_report' | 'public_benchmark';
  sourceTitle: string;
  sourceDate?: string;
  sourceUrlOrDocId?: string;
}

export interface EpistemicClaim {
  status: EpistemicStatus;
  basis?: EvidenceBasis;
  text: string;
  sourceOrRationale?: string;
  citation?: MarketEvidenceCitation;
}

// ---------------------------------------------------------------------------
// 2. Strategic Frameworks & Knowledge Base
// ---------------------------------------------------------------------------

export type FrameworkCategory =
  | 'growth'
  | 'brand'
  | 'product'
  | 'cultural'
  | 'community'
  | 'performance';

export interface DownstreamCreativeImplications {
  textDirection: string;
  imageVisualWorld: string;
  videoPacing: string;
  audioTone: string;
  deckNarrative: string;
}

export interface StrategicFrameworkDefinition {
  id: string;
  name: string;
  category: FrameworkCategory;
  tagline: string;
  whenToUse: string[];
  whenNotToUse: string[];
  suitableObjectives: string[];
  suitableIndustries: string[];
  audienceConditions: string[];
  strategicQuestions: string[];
  tensions: string[];
  mechanisms: string[];
  strengths: string[];
  risks: string[];
  commonCliches: string[];
  examplePatterns: string[];
  downstreamCreativeImplications: DownstreamCreativeImplications;
}

export interface StrategicMechanism {
  id: string;
  name: string;
  category: string;
  trigger: string;
  executionPattern: string;
  channelFitness: string[];
  psychologicalDriver: string;
}

// ---------------------------------------------------------------------------
// 3. Stage 1 Strategic Scope & Operational Controls
// ---------------------------------------------------------------------------

export type AmbitionLevel =
  | 'safe_proven'
  | 'balanced'
  | 'bold'
  | 'category_defining'
  | 'experimental';

export type RiskTolerance =
  | 'low'
  | 'moderate'
  | 'high'
  | 'very_high';

export type BudgetReality =
  | 'no_paid_organic'
  | 'lean'
  | 'moderate'
  | 'large_scale'
  | 'enterprise'
  | 'unknown';

export type TimelineHorizon =
  | 'urgent_under_1_week'
  | 'sprint_1_to_4_weeks'
  | 'quarterly_1_to_3_months'
  | 'sustained_3_to_6_months'
  | 'always_on';

export type BrandMaturity =
  | 'new_launch'
  | 'emerging_challenger'
  | 'established'
  | 'category_leader'
  | 'rebranding';

export type GeographicScale =
  | 'hyperlocal'
  | 'regional'
  | 'national'
  | 'multi_country'
  | 'global';

export type BusinessModelType =
  | 'b2c'
  | 'b2b'
  | 'd2c'
  | 'marketplace'
  | 'saas'
  | 'subscription'
  | 'fintech'
  | 'retail'
  | 'services'
  | 'healthcare'
  | 'non_profit'
  | 'creator_media'
  | 'other';

export type ProofItemType =
  | 'testimonials'
  | 'case_studies'
  | 'product_demos'
  | 'certifications'
  | 'performance_data'
  | 'user_reviews'
  | 'research'
  | 'founder_expertise'
  | 'none_yet';

export interface ProofItem {
  type: ProofItemType;
  description?: string;
  strength?: 'strong' | 'moderate' | 'emerging';
  usableFor?: string[];
}

export type CompetitorKnowledgeSource =
  | 'provided_by_client'
  | 'imported_from_workspace'
  | 'no_research_supplied';

export interface CampaignBriefControls {
  businessOutcome: {
    primaryOutcome: string;
    secondaryOutcome?: string;
    targetKPI?: string;
    timeHorizon?: string;
  };
  ambitionLevel: AmbitionLevel;
  riskTolerance: RiskTolerance;
  budgetReality: BudgetReality;
  approximateBudget?: string;
  timelineHorizon: TimelineHorizon;
  brandMaturity: BrandMaturity;
  geographicScale: GeographicScale;
  businessModel: BusinessModelType;
  businessSector?: string;
  proofAvailability: ProofItem[];
  mandatoryInclusions: string[]; // Must Include
  forbiddenTerritories: string[]; // Must Avoid
  competitorKnowledgeSource: CompetitorKnowledgeSource;
  competitorContext?: {
    competitors?: string;
    overusedPatterns?: string;
    whiteSpaceOpportunity?: string;
  };
}

// ---------------------------------------------------------------------------
// 4. Adaptive Discovery & Dimension-Based Strategic Readiness
// ---------------------------------------------------------------------------

export interface AdaptiveQuestion {
  id: string;
  question: string;
  strategicRationale: string; // Internal strategic reason for asking
  inputType: 'text' | 'choice' | 'multi-choice';
  options?: string[];
  suggestedPlaceholder?: string;
  dimension: 'audience' | 'tension' | 'differentiation' | 'metric' | 'constraint';
}

export type ReadinessDimensionId =
  | 'objective'
  | 'audience'
  | 'brand'
  | 'competitive'
  | 'barrier'
  | 'proof'
  | 'channel'
  | 'constraints';

export interface ReadinessDimension {
  id: ReadinessDimensionId;
  label: string;
  status: 'strong' | 'partial' | 'missing';
  detail: string;
  quickFixPrompt?: string;
}

export interface StrategicReadiness {
  overallReadiness: 'needs_context' | 'ready_for_routes' | 'comprehensive';
  dimensions: ReadinessDimension[];
  summaryGuidance: string;
}

export interface DiscoveryConfidence {
  isSufficient: boolean;
  confidenceScore: number; // 0 to 1 (internal model weight)
  missingCriticalDimensions: string[];
  reasoning: string;
  readiness?: StrategicReadiness;
}

export interface DiscoveryAnswer {
  questionId: string;
  questionText: string;
  answer: string;
}

// ---------------------------------------------------------------------------
// 5. Creative Tension & Strategic Territories
// ---------------------------------------------------------------------------

export interface CreativeTension {
  currentBelief: string;      // What the audience currently thinks/feels/does
  desiredBelief: string;      // What we need them to think/feel/do
  behavioralBarrier: string;  // The hidden friction preventing that shift
  breakthroughAngle: string;  // The counter-intuitive realization that dissolves the friction
}

export type DistinctivenessTier =
  | 'Standard'
  | 'Fresh'
  | 'Highly Differentiated';

export interface TerritoryNoveltyVector {
  narrative: string;
  mechanism: string;
  emotionalTerritory: string;
  visualConcept: string;
}

export interface TerritoryComparisonScores {
  brandFit: 'High' | 'Medium' | 'Low';
  audienceRelevance: 'High' | 'Medium' | 'Low';
  distinctiveness: 'Very High' | 'High' | 'Medium';
  executionComplexity: 'Low' | 'Medium' | 'High';
  prPotential: 'Very High' | 'High' | 'Medium' | 'Low';
  conversionPotential: 'High' | 'Medium' | 'Low';
  riskLevel: 'Low' | 'Moderate' | 'High';
}

export interface TerritoryCreativeCodes {
  visualCodes: string[];
  soundCodes: string[];
  motionCodes: string[];
  copyCodes: string[];
  vocabulary: string[];
}

export interface StrategicTerritory {
  id: string;
  title: string;
  oneLinePremise: string;
  whyItWorks: string;         // Audience + brand tension breakdown
  theMechanism: string;       // What actually happens in the campaign
  creativeWorld: string;       // Look, sound, and emotional feel
  creativeCodes?: TerritoryCreativeCodes;
  channelPotential: string[]; // Primary platforms and surfaces
  sacrificesAndTradeoffs: string; // What this route sacrifices
  targetFit: {
    bestFor: string[];
    lessSuitableFor: string[];
  };
  comparisonScores: TerritoryComparisonScores;
  internalScores?: {
    brandFitRaw: number;
    audienceResonanceRaw: number;
    noveltyRaw: number;
    overallWeighted: number;
  };
  distinctivenessTier: DistinctivenessTier;
  distinctivenessNote: string;
  risksAndMitigations: string;
  frameworkId: string;
  isRecommended?: boolean;
  recommendationRationale?: {
    whyThis: string;
    whyNotOthers: Record<string, string>;
  };
  scores: {
    brandFit: number;          // 0 to 100
    audienceResonance: number; // 0 to 100
    platformPotential: number; // 0 to 100
  };
  noveltyVector: TerritoryNoveltyVector;
}

// ---------------------------------------------------------------------------
// 6. 5-Stage Customer Decision Journey
// ---------------------------------------------------------------------------

export type CustomerJourneyStageName =
  | 'problem_recognition'
  | 'awareness'
  | 'consideration'
  | 'decision_conversion'
  | 'retention_advocacy';

export interface CustomerJourneyStage {
  stage: CustomerJourneyStageName;
  stageLabel: string;
  currentCustomerState: string;
  desiredCustomerState: string;
  barrier: string;
  trigger: string;
  evidence: string;
  keyDeliverable: string;
}

// ---------------------------------------------------------------------------
// 7. Dynamic 5-Tier Campaign Production Plan
// ---------------------------------------------------------------------------

export type ProductionTierName =
  | 'hero'
  | 'awareness'
  | 'consideration'
  | 'conversion'
  | 'retention_advocacy';

export interface ProductionPlanAsset {
  id: string;
  title: string;
  tier: ProductionTierName;
  assetType: 'text' | 'image' | 'video' | 'audio' | 'deck';
  strategicPurpose: string;
  coreHook: string;
  targetChannel: string;
  dependsOn?: string[]; // Dependency asset IDs (e.g. video depends on hero visual)
  status: 'planned' | 'staged' | 'generated';
}

export interface ProductionTierPlan {
  tier: ProductionTierName;
  tierLabel: string;
  isRecommended: boolean;
  omissionRationale?: string;
  assets: ProductionPlanAsset[];
}

export interface CampaignProductionPlan {
  strategyId?: string;
  campaignTitle: string;
  totalAssetsCount: number;
  estimatedProductionCreditRange: {
    min: number;
    max: number;
  };
  tiers: Record<ProductionTierName, ProductionTierPlan>;
}

// ---------------------------------------------------------------------------
// 8. Master Campaign Strategy & Structured Strategy Patching
// ---------------------------------------------------------------------------

export interface AudienceDiagnosis {
  demographics: string;
  psychographics: string;
  coreAnxieties: string[];
  buyingTriggers: string[];
  culturalContext: string;
}

export interface ContentPillar {
  name: string;
  shareOfVoicePercent: number; // Recommended content mix share (0-100)
  strategicPurpose: string;
  narrativeAngle: string;
  exampleHook: string;
}

export interface ChannelDecision {
  channel: string;
  status: 'primary' | 'secondary' | 'experimental' | 'monitor_only' | 'excluded';
  rationale: string;
  format?: string;
  creativeRule?: string;
  cta?: string;
}

export interface PlatformActivation {
  platform: 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'x' | 'ooh' | 'meta-ads' | 'newsletter';
  objective: string;
  format: string;
  hookType: string;
  cadence: string;
  keyAssetRequirement: string;
}

export interface CreativeExecutionScene {
  name: string;
  headlineHook: string;
  narrativeArc: string;
  visualDirection: string;
  channelFormat: string;
}

export interface RolloutPhase {
  phase: string;               // e.g., "Phase 1: Spark Curiosity"
  duration: string;            // e.g., "Days 1-7"
  strategicFocus: string;
  primaryChannels: string[];
  triggerToNextPhase: string;
}

export interface PerformanceKPIs {
  primarySuccessMetric: string;
  secondaryMetrics: string[];
  unverifiedBenchmarkPlaceholders: string[]; // explicit placeholders for client audit
}

export interface StrategyPatch {
  patchId: string;
  section: 'coreBigIdea' | 'positioningManifesto' | 'contentPillars' | 'platformMatrix' | 'creativeExecutions' | 'rolloutPhases' | 'channelDecisions';
  targetField: string;
  previousValue: any;
  proposedValue: any;
  rationale: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface MasterCampaignStrategy {
  strategyId?: string;
  versionNumber?: number;
  parentVersionId?: string;
  changeReason?: string;
  campaignTitle: string;
  brandName: string;
  strategicFramework: string;

  // Executive Overview ("In 30 Seconds")
  executiveSummary?: {
    theProblem: string;
    theOpportunity: string;
    theBigIdea: string;
    whyUs: string;
    whatWeWillDo: string;
    whatWeNeedToProve: string;
  };

  // Transformation Story ("What Changed From My Brief")
  whatChangedFromBrief?: {
    youToldUs: string[];
    weDiscovered: string[];
    weRecommend: string[];
  };

  // Unknowns Panel (Epistemic Humility)
  unknownsPanel?: Array<{
    variable: string;
    riskImpact: 'Moderate' | 'Critical';
    recommendedResearchAction: string;
  }>;

  // Potential Failure Modes & Mitigation Playbooks
  failureModes?: Array<{
    riskDescription: string;
    failureLikelihood: 'Low' | 'Medium' | 'High';
    mitigationPlaybook: string;
  }>;

  // Competitor White Space
  competitorWhiteSpace?: {
    categoryNorm: string;
    competitorPattern: string;
    brandOpportunity: string;
  };

  // 5-Stage Customer Decision Journey
  customerJourney?: CustomerJourneyStage[];

  // Channel Elimination & Fitness Decisions
  channelDecisions?: ChannelDecision[];

  // Dynamic 5-Tier Campaign Production Plan
  productionPlan?: CampaignProductionPlan;

  // Core Playbook Dimensions
  coreBigIdea: EpistemicClaim;
  positioningManifesto: EpistemicClaim[];
  creativeTension: CreativeTension;
  audienceDiagnosis: AudienceDiagnosis;
  contentPillars: ContentPillar[];
  platformMatrix: PlatformActivation[];
  creativeExecutions: CreativeExecutionScene[];
  rolloutPhases: RolloutPhase[];
  performanceKPIs: PerformanceKPIs;
  epistemicLedger: EpistemicClaim[];
}

// ---------------------------------------------------------------------------
// 9. Downstream Multimodal Production Briefs (Provider-Neutral)
// ---------------------------------------------------------------------------

export interface TextGemBrief {
  platform: string;
  targetAudience: string;
  coreHook: string;
  angle: string;
  tone: string;
  copyVariants: {
    shortFeedCopy: string;
    longFormPost: string;
    threadOrCarouselCaptions: string[];
  };
  callToAction: string;
  constraints: string[];
}

export type ImageReferenceRequirement =
  | 'none'
  | 'product'
  | 'face'
  | 'product+face';

export interface ImageGemBrief {
  assetRole: 'hero-shot' | 'social-feed' | 'story-vertical' | 'ad-banner' | 'lifestyle-context';
  visualConcept: string;
  composition: string;
  aspectRatios: Array<'1:1' | '16:9' | '9:16' | '4:3'>;
  referenceRequirements: ImageReferenceRequirement;
  lighting: string;
  cameraAngle: string;
  negativeSpaceDirection: string;
  textlessPrompt: string;
  capabilityRequirements?: {
    requiresConsistency?: boolean;
    negativePrompt?: string;
  };
}

export interface VideoGemBrief {
  shotPurpose: 'hook-3sec' | 'problem-tension' | 'product-reveal' | 'transformation' | 'cta-climax';
  narrativeArc: string;
  sceneDescription: string;
  cameraMovement: 'static' | 'slow-pan' | 'push-in' | 'tracking' | 'drone-orbit';
  subjectAction: string;
  durationSec: number;
  aspectRatio: '16:9' | '9:16';
  textlessPrompt: string;
  pacingNote: string;
}

export interface MusicBrief {
  role: 'subtle-bed' | 'driving-rhythm' | 'cinematic-swell' | 'ambient-chill';
  mood: string;
  genre?: string;
  instrumentation?: string;
  energy?: 'low' | 'moderate' | 'high' | 'explosive';
  durationSec?: number;
  lyricPolicy?: 'instrumental-only' | 'vocal-chops' | 'full-lyrics';
  usageContext?: string;
}

export interface AudioGemBrief {
  voPurpose: 'brand-manifesto' | 'storytelling' | 'product-demo' | 'high-energy-promo' | 'testimonial';
  scriptIntent: string;
  spokenScriptText: string;
  language: string;
  dialectOrAccent?: string;
  speakerCount: number;
  speakerRoles: string[];
  performanceStyle: 'authoritative' | 'conversational' | 'intimate' | 'energetic' | 'dramatic';
  pace: 'measured' | 'dynamic' | 'fast-paced';
  emotionalArc: string;
  musicRole: 'subtle-bed' | 'driving-rhythm' | 'cinematic-swell' | 'ambient-chill';
  musicMood: string;
  musicBrief?: MusicBrief;
}

export type PresentationSlidePurpose =
  | 'cover'
  | 'agenda'
  | 'problem'
  | 'opportunity'
  | 'strategy'
  | 'solution'
  | 'process'
  | 'timeline'
  | 'comparison'
  | 'metrics'
  | 'market'
  | 'team'
  | 'financials'
  | 'case-study'
  | 'closing';

export interface CampaignDeckSlideBrief {
  slideNumber: number;
  purpose: PresentationSlidePurpose;
  slideTitle: string;
  executiveTakeaway: string;
  bulletPoints: string[];
  visualDirection: string;
  metricPlaceholder?: string;
}

export interface CampaignDeckBrief {
  narrativeArc: string;
  slideCount: number;
  slides: CampaignDeckSlideBrief[];
  presentationThemeSuggestion: 'modern-dark' | 'corporate-light' | 'vibrant-creative';
}

export interface DownstreamBriefs {
  textBrief: TextGemBrief;
  imageBrief: ImageGemBrief;
  videoBrief: VideoGemBrief;
  audioBrief: AudioGemBrief;
  deckBrief: CampaignDeckBrief;
}

// ---------------------------------------------------------------------------
// 10. Multi-Dimensional Fingerprint & Novelty Memory
// ---------------------------------------------------------------------------

export interface CampaignFingerprint {
  narrativeHash: string;
  mechanismHash: string;
  emotionalHash: string;
  insightHash: string;
  visualHash: string;
  tokenBag: string[];
  createdAt: string;
}

export type NoveltyClassification =
  | 'exact_duplicate'
  | 'near_duplicate'
  | 'strategically_similar'
  | 'structurally_similar'
  | 'fresh'
  | 'contrarian';

export interface NoveltyComparisonResult {
  overallSimilarity: number;       // 0 to 1
  classification: NoveltyClassification;
  isAcceptable: boolean;
  nearestMatchTitle?: string;
  breakdown: {
    narrativeSim: number;
    mechanismSim: number;
    behavioralSim: number;
    emotionalSim: number;
    insightSim: number;
    visualSim: number;
    platformSim: number;
    linguisticSim: number;
  };
  recommendation: 'proceed' | 'pivot-mechanism' | 'rewrite-entirely';
  distinctivenessCritique?: string;
}

// ---------------------------------------------------------------------------
// 11. Strategy Versioning & Lifecycle Records
// ---------------------------------------------------------------------------

export interface CampaignStrategyVersionRecord {
  id: string;
  campaignStrategyId: string;
  versionNumber: number;
  parentVersionId?: string;
  changeReason?: string;
  selectedTerritory: StrategicTerritory;
  masterStrategy: MasterCampaignStrategy;
  downstreamBriefs: DownstreamBriefs;
  epistemicLedger: EpistemicClaim[];
  criticScore: {
    passed: boolean;
    boringnessScore: number; // 0 (original) to 100 (boring)
    brandFitScore: number;
    issuesDetected: string[];
  };
  createdAt: string;
}

export interface CampaignStrategyRecord {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  status: 'active' | 'archived';
  currentVersionId?: string;
  currentVersion?: CampaignStrategyVersionRecord;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 12. Strategic Commands (Ask Strategist & Stress Test)
// ---------------------------------------------------------------------------

export interface AskStrategistRequest {
  strategyId?: string;
  campaignTitle: string;
  currentStrategy: MasterCampaignStrategy;
  query: string;
  chatHistory?: Array<{ role: 'user' | 'strategist'; content: string }>;
}

export interface AskStrategistResponse {
  answer: string;
  actionableRecommendation: string;
  proposedPatch?: StrategyPatch;
}

export interface StressTestVectorResult {
  vector: string;
  riskScore: 'Low' | 'Moderate' | 'High' | 'Critical';
  vulnerabilitySummary: string;
  mitigationRecommendation: string;
}

export interface StressTestReport {
  overallHealthScore: number; // 0 to 100
  topFailureRisks: string[];
  vectorAudits: StressTestVectorResult[];
  csoVerdict: string;
}
