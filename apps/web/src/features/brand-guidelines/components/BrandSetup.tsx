import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe,
  FileText,
  Upload,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  Building2,
  Palette,
  Compass,
  Layers,
  HelpCircle,
  Check,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Cloud,
  LogOut,
  Image as ImageIcon
} from 'lucide-react';
import { BrandLogo } from '@web/features/brand/components/BrandLogo.js';
import { AuthBox } from '../../auth/components/AuthBox.js';
import type {
  BrandGuidelines,
  BrandIntelligenceProfile,
  NormalizedBrandSource,
  UserBrandOverrides
} from '@shared-types/brand.js';
import type { Asset } from '@shared-types/creative.js';
import { generateFastPrompt } from '@web/infrastructure/ai/promptBuilders.js';
import { extractAndNormalizeSource } from '../lib/sourceNormalizer.js';
import {
  analyzeBrandIntelligence,
  synthesizeBrandGuidelines,
  generateFoundationalDocuments
} from '@web/infrastructure/ai/brandIntelligenceService.js';

export interface BrandSetupProps {
  onComplete: (guidelines: BrandGuidelines, assets: Asset[]) => void;
  user: any;
  loading: boolean;
  login: () => void;
  loginWithEmail: (email: string, password: string) => Promise<any>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<any>;
  resetPassword?: (email: string) => Promise<{ error?: string }>;
  logout: () => void;
  authError?: string | null;
  setAuthError: (err: string | null) => void;
  currentPath: string;
  navigateTo: (p: string) => void;
}

type SetupFlowStep = 'input' | 'extracting' | 'review' | 'synthesizing' | 'success';

export const BrandSetup: React.FC<BrandSetupProps> = ({
  onComplete,
  user,
  loading,
  login,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  logout,
  authError,
  setAuthError,
  currentPath,
  navigateTo
}) => {
  // Navigation & Flow state
  const [step, setStep] = useState<SetupFlowStep>('input');
  const [inputType, setInputType] = useState<'url' | 'description'>('url');

  // Primary Inputs
  const [urlInput, setUrlInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  // Optional Context Inputs
  const [userLogo, setUserLogo] = useState('');
  const [brandNameHint, setBrandNameHint] = useState('');
  const [industryHint, setIndustryHint] = useState('');
  const [colorsHint, setColorsHint] = useState('');
  const [locationHint, setLocationHint] = useState('');

  // Live Extraction & Analysis state
  const [extractionStageIndex, setExtractionStageIndex] = useState(0);
  const extractionStages = [
    'Connecting to brand domain and resolving DNS...',
    'Extracting public headings, text, and 5-tier logos...',
    'Separating verified brand facts from strategic inferences...',
    'Synthesizing brand intelligence profile...'
  ];

  // Pipeline Data state
  const [normalizedSource, setNormalizedSource] = useState<NormalizedBrandSource | null>(null);
  const [intelligence, setIntelligence] = useState<BrandIntelligenceProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // User Overrides for Review Screen
  const [overrideName, setOverrideName] = useState('');
  const [overrideIndustry, setOverrideIndustry] = useState('');
  const [overrideTone, setOverrideTone] = useState('');
  const [overrideAudience, setOverrideAudience] = useState('');
  const [overrideTagline, setOverrideTagline] = useState('');
  const [overrideLocation, setOverrideLocation] = useState('');
  const [overrideColors, setOverrideColors] = useState<string[]>([]);
  const [selectedLogo, setSelectedLogo] = useState<string>('');

  // Final Generated state
  const [generatedGuidelines, setGeneratedGuidelines] = useState<BrandGuidelines | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<Asset[]>([]);

  // Handle Logo Upload from File Input
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setUserLogo(result);
        setSelectedLogo(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 1 -> Step 2: Trigger Brand Intelligence Extraction
  const handleStartAnalysis = async () => {
    const activeUrl = inputType === 'url' ? urlInput.trim() : '';
    const activeDesc = inputType === 'description' ? descriptionInput.trim() : (descriptionInput.trim() || '');

    if (!activeUrl && !activeDesc) {
      setError('Please provide a brand website URL or enter a brand description.');
      return;
    }

    setError(null);
    setStep('extracting');
    setExtractionStageIndex(0);

    try {
      // 1. Source Extraction & Normalization
      setExtractionStageIndex(0);
      const parsedColors = colorsHint
        ? colorsHint.split(',').map(c => c.trim()).filter(c => /^#[0-9a-f]{3,6}$/i.test(c))
        : undefined;

      const normalized = await extractAndNormalizeSource({
        url: activeUrl || undefined,
        description: activeDesc || undefined,
        userLogo: userLogo || undefined
      });
      setNormalizedSource(normalized);

      // 2. Stage 1: Brand Intelligence Analysis
      setExtractionStageIndex(1);
      await new Promise(r => setTimeout(r, 400));
      setExtractionStageIndex(2);

      const intel = await analyzeBrandIntelligence(normalized, {
        userContext: {
          logo: userLogo || undefined,
          colors: parsedColors,
          brandName: brandNameHint.trim() || undefined,
          industry: industryHint.trim() || undefined,
          location: locationHint.trim() || undefined
        }
      });
      setIntelligence(intel);

      setExtractionStageIndex(3);
      await new Promise(r => setTimeout(r, 300));

      // Populate editable override fields with initial facts/inferences
      setOverrideName(brandNameHint.trim() || intel.facts.name || 'Brand');
      setOverrideIndustry(industryHint.trim() || intel.facts.industry || 'Modern Business');
      setOverrideTone(intel.messagingSignals.tone || 'Confident & Professional');
      setOverrideAudience(intel.inferences.targetAudience || 'Modern Consumers');
      setOverrideTagline(intel.inferences.positioning || '');
      setOverrideLocation(locationHint.trim() || intel.facts.locations?.[0] || 'India');

      const palette = (parsedColors && parsedColors.length > 0)
        ? parsedColors
        : (intel.visualSignals.colors && intel.visualSignals.colors.length > 0)
          ? intel.visualSignals.colors
          : ['#0F172A', '#E11D48'];
      setOverrideColors(palette.slice(0, 4));

      // Logo candidate selection (user uploaded wins, else crawler candidate)
      const initialLogo = userLogo || normalized.detectedLogoCandidates[0] || '';
      setSelectedLogo(initialLogo);

      // Move to Review Step
      setStep('review');
    } catch (err: any) {
      console.error('[BrandSetup] Extraction/Analysis failed:', err);
      setError(err?.message || 'Failed to extract brand intelligence. You can retry or switch to brand description.');
      setStep('input');
    }
  };

  // Step 3 -> Step 4: Synthesize Canonical Guidelines & Documents
  const handleSynthesizeGuidelines = async () => {
    if (!intelligence) return;
    setError(null);
    setStep('synthesizing');

    try {
      const overrides: UserBrandOverrides = {
        name: overrideName.trim(),
        industry: overrideIndustry.trim(),
        tone: overrideTone.trim(),
        targetAudience: overrideAudience.trim(),
        tagline: overrideTagline.trim() || undefined,
        location: overrideLocation.trim(),
        colors: overrideColors.length > 0 ? overrideColors : undefined,
        logo: selectedLogo || undefined
      };

      // Synthesize final canonical BrandGuidelines
      const guidelines = await synthesizeBrandGuidelines(intelligence, overrides, selectedLogo);
      setGeneratedGuidelines(guidelines);

      // Generate foundational documents from canonical guidelines
      const docs = await generateFoundationalDocuments(guidelines);
      setGeneratedAssets(docs);

      setStep('success');

      // If user is already authenticated, finalize and proceed
      if (user) {
        setTimeout(() => {
          onComplete(guidelines, docs);
        }, 2200);
      }
    } catch (err: any) {
      console.error('[BrandSetup] Synthesis failed:', err);
      setError(err?.message || 'Failed to synthesize brand guidelines. Please retry.');
      setStep('review');
    }
  };

  // When user signs in on victory screen, trigger onComplete
  useEffect(() => {
    if (step === 'success' && user && generatedGuidelines) {
      const timer = setTimeout(() => {
        onComplete(generatedGuidelines, generatedAssets);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [step, user, generatedGuidelines, generatedAssets, onComplete]);

  return (
    <div className="h-screen w-full flex bg-[#090d16] text-slate-100 overflow-hidden font-sans select-none">
      <AnimatePresence mode="wait">
        {/* ====================================================
            STAGE 2: LIVE EXTRACTION PROGRESS (Authentic Stages)
           ==================================================== */}
        {step === 'extracting' && (
          <motion.div
            key="step-extracting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090d16] p-6 text-center"
          >
            <div className="w-full max-w-md space-y-8">
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-rose-500/20 animate-ping"></div>
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg">
                  <Loader2 className="w-7 h-7 text-rose-500 animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold">
                  Brand Intelligence Engine
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Analyzing Brand Presence
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {extractionStages[extractionStageIndex]}
                </p>
              </div>

              {/* Genuine Stage-based Progress Checklist */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-sm p-4 text-left space-y-3">
                {extractionStages.map((stg, idx) => {
                  const isDone = idx < extractionStageIndex;
                  const isCurrent = idx === extractionStageIndex;
                  return (
                    <div key={idx} className="flex items-center gap-2.5 text-xs">
                      {isDone ? (
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 size={14} className="text-rose-400 animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                      )}
                      <span className={isDone ? 'text-slate-300' : isCurrent ? 'text-white font-medium' : 'text-slate-500'}>
                        {stg}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ====================================================
            STAGE 4: GUIDELINE SYNTHESIZING PROGRESS
           ==================================================== */}
        {step === 'synthesizing' && (
          <motion.div
            key="step-synthesizing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090d16] p-6 text-center"
          >
            <div className="w-full max-w-md space-y-6">
              <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold">
                  Guideline Synthesis
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Formulating Creative Rules
                </h3>
                <p className="text-xs text-slate-400">
                  Synthesizing action-oriented directives and compiling foundational Asset Library documents...
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ====================================================
            STAGE 3: USER REVIEW & OVERRIDE SCREEN (Audit Screen)
           ==================================================== */}
        {step === 'review' && intelligence && (
          <motion.div
            key="step-review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#090d16] flex flex-col overflow-y-auto"
          >
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-30 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="p-1.5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                  title="Return to input stage"
                >
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold block">
                    Intelligence Review
                  </span>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Verify Brand Strategic Profile
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-sm transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Edit Source</span>
                </button>
                <button
                  type="button"
                  onClick={handleSynthesizeGuidelines}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-sm shadow-md shadow-rose-600/20 transition-colors cursor-pointer"
                >
                  <span>Build Brand Guidelines</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Main Review Body */}
            <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8 pb-24">
              {/* Uncertainty / Confirmation Alert if present */}
              {intelligence.missingOrUncertain && intelligence.missingOrUncertain.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-sm flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Parameters Requiring Confirmation
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      The analyzer flagged ambiguous or unstated parameters from your source. Review the highlighted fields below before building your guidelines:
                    </p>
                    <ul className="text-[11px] text-amber-200/80 list-disc list-inside space-y-0.5 pt-1">
                      {intelligence.missingOrUncertain.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Grid: Verified Facts vs. Inferred Strategy */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: Verified Facts */}
                <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Verifiable Brand Facts
                      </h3>
                    </div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      From Source
                    </span>
                  </div>

                  {/* Brand Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={overrideName}
                      onChange={(e) => setOverrideName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 p-2.5 rounded-sm text-sm text-white font-medium focus:outline-none"
                    />
                  </div>

                  {/* Industry */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                        Industry
                      </label>
                      {intelligence.confidence?.industry && (
                        <span className="text-[9px] font-mono text-slate-400 uppercase">
                          Confidence: {intelligence.confidence.industry}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={overrideIndustry}
                      onChange={(e) => setOverrideIndustry(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 p-2.5 rounded-sm text-sm text-white font-medium focus:outline-none"
                    />
                  </div>

                  {/* Geographic Location */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                        Target Market / Location
                      </label>
                      {intelligence.confidence?.location && (
                        <span className="text-[9px] font-mono text-slate-400 uppercase">
                          Confidence: {intelligence.confidence.location}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={overrideLocation}
                      onChange={(e) => setOverrideLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 p-2.5 rounded-sm text-sm text-white font-medium focus:outline-none"
                      placeholder="e.g. India, United States, Global"
                    />
                  </div>

                  {/* Stated Products / Services (Read-only tags) */}
                  {(intelligence.facts.products || intelligence.facts.services) && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                        Discovered Products & Services
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {((intelligence.facts.products || []).concat(intelligence.facts.services || [])).slice(0, 8).map((p, idx) => (
                          <span key={idx} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Column 2: Inferred Strategy & Positioning */}
                <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Compass size={16} className="text-rose-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Strategic Inferences
                      </h3>
                    </div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      AI Inferred
                    </span>
                  </div>

                  {/* Positioning Statement */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                      Positioning Statement
                    </label>
                    <textarea
                      value={overrideTagline}
                      onChange={(e) => setOverrideTagline(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 p-2.5 rounded-sm text-xs text-white font-light focus:outline-none resize-none"
                    />
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                      Target Audience Segments
                    </label>
                    <input
                      type="text"
                      value={overrideAudience}
                      onChange={(e) => setOverrideAudience(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 p-2.5 rounded-sm text-sm text-white font-medium focus:outline-none"
                    />
                  </div>

                  {/* Operational Tone */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                      Tone & Voice
                    </label>
                    <input
                      type="text"
                      value={overrideTone}
                      onChange={(e) => setOverrideTone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 p-2.5 rounded-sm text-sm text-white font-medium focus:outline-none"
                    />
                  </div>

                  {/* Personality Traits */}
                  {intelligence.inferences.personality && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                        Character Archetype & Traits
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {intelligence.inferences.archetype && (
                          <span className="text-xs bg-rose-950/60 border border-rose-800/40 text-rose-300 font-semibold px-2 py-0.5 rounded">
                            {intelligence.inferences.archetype}
                          </span>
                        )}
                        {intelligence.inferences.personality.map((trait, idx) => (
                          <span key={idx} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Identity Audit & Logo Candidates */}
              <div className="bg-slate-900 border border-slate-800 rounded-sm p-6 space-y-6">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette size={16} className="text-rose-500" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Visual Identity & Logo Discovery
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Select or upload visual mark
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Selection UI */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                      Active Brand Logo
                    </label>

                    <div className="flex items-center gap-4 p-4 bg-slate-950 border border-slate-800 rounded-sm">
                      <div className="w-16 h-16 rounded bg-slate-900 border border-slate-800 flex items-center justify-center p-2 overflow-hidden shrink-0">
                        {selectedLogo ? (
                          <img src={selectedLogo} alt="Selected Logo" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <ImageIcon className="text-slate-600 w-8 h-8" />
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-white block">
                          {selectedLogo ? 'Selected Mark' : 'No Logo Selected'}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id="review-logo-upload"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="review-logo-upload"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded cursor-pointer transition-colors"
                          >
                            <Upload size={12} />
                            <span>Upload Custom</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Discovered Candidates Carousel if available */}
                    {normalizedSource?.detectedLogoCandidates && normalizedSource.detectedLogoCandidates.length > 1 && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                          Discovered Candidates ({normalizedSource.detectedLogoCandidates.length})
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {normalizedSource.detectedLogoCandidates.map((cand, idx) => {
                            const isSelected = selectedLogo === cand;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedLogo(cand)}
                                className={`w-12 h-12 rounded border p-1 shrink-0 flex items-center justify-center cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-rose-500 bg-rose-950/20 ring-1 ring-rose-500'
                                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                                }`}
                              >
                                <img src={cand} alt={`Candidate ${idx + 1}`} className="max-h-full max-w-full object-contain" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Palette Swatches & Hex Editors */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                      Brand Palette Colors
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      {overrideColors.map((color, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-sm">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                              const updated = [...overrideColors];
                              updated[idx] = e.target.value.toUpperCase();
                              setOverrideColors(updated);
                            }}
                            className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={color}
                            onChange={(e) => {
                              const updated = [...overrideColors];
                              updated[idx] = e.target.value.toUpperCase();
                              setOverrideColors(updated);
                            }}
                            className="w-full bg-transparent border-none text-xs font-mono text-white focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Primary and accent tones deployed across graphic exports and slideshow templates.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Action Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer w-full sm:w-auto"
                >
                  Back to Inputs
                </button>

                <button
                  type="button"
                  onClick={handleSynthesizeGuidelines}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-widest rounded-sm shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                >
                  <span>Build Brand Guidelines</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ====================================================
            STAGE 5: SUCCESS & CANONICAL GUIDELINES DISPLAY
           ==================================================== */}
        {step === 'success' && generatedGuidelines && (
          <motion.div
            key="step-success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090d16] p-6 text-center overflow-y-auto"
          >
            <div className="w-full max-w-lg space-y-6 my-auto">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 rounded-full bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center p-3 shadow-xl"
              >
                <BrandLogo customLogo={generatedGuidelines.logo} brandName={generatedGuidelines.name} className="w-full h-full object-contain" />
              </motion.div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={13} />
                  Brand Identity Established
                </span>
                <h2 className="text-3xl font-extrabold text-white tracking-tight">
                  Welcome to {generatedGuidelines.name}
                </h2>
                <p className="text-sm text-slate-400 font-light max-w-md mx-auto">
                  Strategic parameters, creative directives, and foundational documents have been generated and synchronized with your workspace.
                </p>
              </div>

              {/* Creative Directives Snapshot */}
              <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 text-left space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-white uppercase text-[10px] tracking-wider">Sector Focus</span>
                  <span className="font-mono text-slate-300">{generatedGuidelines.industry}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-white uppercase text-[10px] tracking-wider">Target Region</span>
                  <span className="font-mono text-slate-300">{generatedGuidelines.location || 'India'}</span>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-white uppercase text-[10px] tracking-wider block">Visual Directive</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {generatedGuidelines.creativeDirectives?.visual || 'Clean editorial compositions with strong product focus.'}
                  </p>
                </div>
              </div>

              {!user ? (
                <div className="p-6 bg-slate-900 rounded-sm border border-slate-800 text-left space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white tracking-tight">Save Your Brand Profile</h4>
                    <p className="text-xs text-slate-400 font-light">
                      Sign in or create your account below to securely persist your brand guidelines and open your workspace.
                    </p>
                  </div>
                  <AuthBox
                    user={user}
                    login={login}
                    loginWithEmail={loginWithEmail}
                    registerWithEmail={registerWithEmail}
                    resetPassword={resetPassword}
                    authError={authError}
                    setAuthError={setAuthError}
                    navigateTo={navigateTo}
                  />
                </div>
              ) : (
                <div className="py-3 flex flex-col items-center gap-3">
                  <div className="flex gap-1.5 justify-center">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                        className="w-2 h-2 bg-rose-500 rounded-full"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold animate-pulse">
                    Launching workspace for {user.email}...
                  </p>
                  <button
                    type="button"
                    onClick={() => onComplete(generatedGuidelines, generatedAssets)}
                    className="mt-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    Enter Workspace Now
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ====================================================
            STAGE 0: AUTH-FIRST GATE (Sign In / Sign Up)
            When user is NOT authenticated, show login screen
           ==================================================== */}
        {step === 'input' && !user && (
          <div className="w-full h-full flex">
            {/* Left Side - Brand Strategy Consultancy Banner */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 overflow-hidden items-end p-16 border-r border-slate-850">
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-slate-950/90 to-transparent" />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />
              </div>

              <div className="relative z-10 max-w-lg space-y-4">
                <h1 className="text-4xl font-light text-white tracking-tight leading-tight">
                  Enterprise <br />
                  <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-500 to-rose-300">
                    Creative Suite
                  </span>
                </h1>
                <p className="text-sm text-slate-400 font-light leading-relaxed">
                  Powered by advanced creative intelligence. Define your brand's strategic parameters to unlock tailored, high-impact campaigns and visual assets.
                </p>
              </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-16 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-6"
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="relative inline-block pb-1">
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      Access Your Workspace
                    </h2>
                    <div className="absolute bottom-0 left-0 w-12 h-0.5 bg-rose-600" />
                  </div>
                  <p className="text-slate-400 font-light text-sm">
                    Please sign in or create an account to begin customizing your brand experience.
                  </p>
                </div>

                {/* Auth Box */}
                <AuthBox
                  user={user}
                  login={login}
                  loginWithEmail={loginWithEmail}
                  registerWithEmail={registerWithEmail}
                  resetPassword={resetPassword}
                  authError={authError}
                  setAuthError={setAuthError}
                  navigateTo={navigateTo}
                />
              </motion.div>
            </div>
          </div>
        )}

        {/* ====================================================
            STAGE 1: PRIMARY INPUT SCREEN (Brand Consultancy Feel)
            Only shown when user IS authenticated
           ==================================================== */}
        {step === 'input' && user && (
          <div className="w-full h-full flex">
            {/* Left Side - Brand Strategy Consultancy Banner */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 overflow-hidden items-end p-16 border-r border-slate-850">
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-slate-950/90 to-transparent" />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />
              </div>

              <div className="relative z-10 max-w-lg space-y-4">
                <h1 className="text-4xl font-light text-white tracking-tight leading-tight">
                  Brand Intelligence <br />
                  <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-500 to-rose-300">
                    & Guideline Synthesis
                  </span>
                </h1>
                <p className="text-sm text-slate-400 font-light leading-relaxed">
                  Provide your brand's public presence or creative brief. Writopedia analyzes verifiable facts, infers market positioning, extracts visual assets, and establishes canonical creative directives for your entire workspace.
                </p>
              </div>
            </div>

            {/* Right Side - Input Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-16 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-8"
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="relative inline-block pb-1">
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      Build Your Brand Profile
                    </h2>
                    <div className="absolute bottom-0 left-0 w-12 h-0.5 bg-rose-600" />
                  </div>
                  <p className="text-slate-400 font-light text-sm">
                    Tell Writopedia where your brand lives. We will analyze your public presence to establish your creative parameters.
                  </p>

                  <div className="pt-2 flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <Cloud size={14} className="shrink-0" />
                      <span className="truncate">Active session: {user.email}</span>
                    </div>
                    <button
                      onClick={logout}
                      type="button"
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-750 px-2 py-1 rounded-sm uppercase tracking-wider font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                      title="Sign out of current profile"
                    >
                      <LogOut size={11} /> Sign Out
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-sm flex items-start gap-2.5 text-xs text-rose-300">
                    <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <span>{error}</span>
                      {inputType === 'url' && (
                        <button
                          type="button"
                          onClick={() => {
                            setInputType('description');
                            setError(null);
                          }}
                          className="block text-rose-400 underline hover:text-rose-300 font-semibold cursor-pointer"
                        >
                          Switch to brand description instead →
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Input Switcher (URL vs. Description) */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-sm">
                    <button
                      type="button"
                      onClick={() => setInputType('url')}
                      className={`flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                        inputType === 'url'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Globe size={13} />
                      <span>Website URL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputType('description')}
                      className={`flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                        inputType === 'description'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText size={13} />
                      <span>Description</span>
                    </button>
                  </div>

                  {/* Mode A: URL Input */}
                  {inputType === 'url' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-300 block">
                        Website or Brand Domain
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://example.com or brand.com"
                          className="w-full bg-slate-900 border border-slate-700 focus:border-rose-500 py-3 px-3.5 rounded-sm text-white placeholder:text-slate-500 text-sm font-light focus:outline-none transition-colors"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Our crawler extracts visible public copy, navigation products, metadata, and 5-tier logo emblems via internal proxy.
                      </p>
                    </div>
                  )}

                  {/* Mode B: Description Input */}
                  {inputType === 'description' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-300 block">
                          Brand Brief / Overview
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setIsGeneratingBrief(true);
                              const prm = await generateFastPrompt('brief');
                              setDescriptionInput(prm);
                            } catch (e) {
                              console.error(e);
                            } finally {
                              setIsGeneratingBrief(false);
                            }
                          }}
                          disabled={isGeneratingBrief}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer border border-dashed border-rose-800 px-2 py-0.5 rounded"
                        >
                          {isGeneratingBrief ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                          <span>Auto-Write</span>
                        </button>
                      </div>
                      <textarea
                        value={descriptionInput}
                        onChange={(e) => setDescriptionInput(e.target.value)}
                        placeholder="e.g. Indian consumer electronics brand focused on affordable wireless audio, active lifestyle gear, and high-energy music culture."
                        rows={4}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-rose-500 p-3 rounded-sm text-white placeholder:text-slate-500 text-sm font-light focus:outline-none transition-colors resize-none"
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Provide your brand's core mission, target audience, and product offerings to let AI structure your identity.
                      </p>
                    </div>
                  )}

                  {/* Optional Context Accordion / Card */}
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">
                      Optional Context
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Optional Brand Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Brand Name
                        </label>
                        <input
                          type="text"
                          value={brandNameHint}
                          onChange={(e) => setBrandNameHint(e.target.value)}
                          placeholder="e.g. BoAt"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-slate-600 p-2 rounded-sm text-xs text-white placeholder:text-slate-600 focus:outline-none"
                        />
                      </div>

                      {/* Optional Location */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Target Location
                        </label>
                        <input
                          type="text"
                          value={locationHint}
                          onChange={(e) => setLocationHint(e.target.value)}
                          placeholder="e.g. India, US"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-slate-600 p-2 rounded-sm text-xs text-white placeholder:text-slate-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Optional Logo Upload */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Upload Logo (Optional)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          id="init-logo-upload"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="init-logo-upload"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded cursor-pointer transition-colors"
                        >
                          <Upload size={12} className="text-rose-400" />
                          <span>{userLogo ? 'Replace Logo' : 'Select File'}</span>
                        </label>
                        {userLogo && (
                          <span className="text-xs text-emerald-400 font-medium">Logo selected</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary Trigger Button */}
                  <button
                    type="button"
                    onClick={handleStartAnalysis}
                    disabled={inputType === 'url' ? !urlInput.trim() : !descriptionInput.trim()}
                    className="w-full mt-4 bg-rose-600 hover:bg-rose-500 text-white py-3.5 rounded-sm font-bold tracking-widest uppercase text-xs shadow-md shadow-rose-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Analyze Brand Intelligence</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
