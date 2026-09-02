import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Image as ImageIcon, 
  Upload, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Cloud, 
  LogOut, 
  Loader2, 
  Sparkles 
} from 'lucide-react';
import { BrandLogo } from '../../../../components/BrandLogo.js';
import { AuthBox } from '../../auth/components/AuthBox.js';
import { type BrandGuidelines, initializeBrandKit, generateFastPrompt } from '../../../../services/geminiService.js';
import { type Asset } from '../../assets/components/AssetLibrary.js';

export interface BrandSetupProps {
  onComplete: (guidelines: BrandGuidelines, assets: Asset[]) => void;
  user: any;
  loading: boolean;
  login: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  authError?: string | null;
  setAuthError: (err: string | null) => void;
  currentPath: string;
  navigateTo: (p: string) => void;
}

export const BrandSetup: React.FC<BrandSetupProps> = ({ 
  onComplete, 
  user, 
  loading, 
  login, 
  loginWithEmail, 
  registerWithEmail, 
  logout, 
  authError, 
  setAuthError, 
  currentPath, 
  navigateTo 
}) => {
  const [description, setDescription] = useState('');
  const [initLogo, setInitLogo] = useState('');
  const [initColors, setInitColors] = useState('');
  const [initTone, setInitTone] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedGuidelines, setGeneratedGuidelines] = useState<BrandGuidelines | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Manual Onboarding flow states
  const [showManualPrompt, setShowManualPrompt] = useState(false);
  const [onboardingSuccess, setOnboardingSuccess] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  
  const [manualLogo, setManualLogo] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualIndustry, setManualIndustry] = useState('');
  const [manualTone, setManualTone] = useState('');
  const [manualPillars, setManualPillars] = useState('');
  const [manualColors, setManualColors] = useState('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInitLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Automatically trigger transition to next phase once user gets authenticated on the victory screen
  useEffect(() => {
    if (showSuccess && user && generatedGuidelines) {
      const timer = setTimeout(() => {
        onComplete(generatedGuidelines, generatedAssets);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, user, generatedGuidelines, generatedAssets, onComplete]);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setIsGenerating(true);
    setError(null);
    console.log(`[BrandInit Debug] Starting Brand Identity Generation for description:`, description);
    try {
      const { guidelines, assets } = await initializeBrandKit(description, {
        logo: initLogo || undefined,
        colors: initColors || undefined,
        tone: initTone || undefined
      });
      console.log(`[BrandInit Debug] Successfully generated guidelines:`, guidelines);
      setGeneratedGuidelines(guidelines);
      setGeneratedAssets(assets as Asset[]);
      
      if (!guidelines.logo) {
        // Logo was NOT found on the web/init. Prompt the user manually.
        setManualLogo(initLogo || '');
        setManualName(guidelines.name || '');
        setManualIndustry(guidelines.industry || '');
        setManualTone(guidelines.tone || '');
        setManualColors(guidelines.colors?.join(', ') || '');
        setManualPillars(guidelines.pillars?.join(', ') || '');
        setOnboardingStep(0);
        setShowManualPrompt(true);
      } else {
        setShowSuccess(true);
        // Only transition automatically if already logged in. Otherwise, the victory screen remains and prompts to log in.
        if (user) {
          setTimeout(() => {
            onComplete(guidelines, assets as Asset[]);
          }, 3000);
        }
      }
    } catch (err: any) {
      console.error("[BrandInit Debug] ❌ Error in handleGenerate:", err);
      setError(err.message || "Failed to generate brand identity. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveManualOnboarding = () => {
    if (!generatedGuidelines) return;

    const parsedColors = manualColors
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    const parsedPillars = manualPillars
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const updatedGuidelines: BrandGuidelines = {
      ...generatedGuidelines,
      name: manualName.trim() || generatedGuidelines.name,
      industry: manualIndustry.trim() || generatedGuidelines.industry,
      tone: manualTone.trim() || generatedGuidelines.tone,
      colors: parsedColors.length > 0 ? parsedColors : generatedGuidelines.colors,
      pillars: parsedPillars.length > 0 ? parsedPillars : generatedGuidelines.pillars,
      logo: manualLogo || undefined
    };

    setGeneratedGuidelines(updatedGuidelines);
    setShowManualPrompt(false);
    setOnboardingSuccess(true);

    setTimeout(() => {
      onComplete(updatedGuidelines, generatedAssets);
    }, 2800);
  };

  return (
    <div className="h-screen flex bg-white dark:bg-slate-950 overflow-hidden">
      <AnimatePresence mode="wait">
        {onboardingSuccess && generatedGuidelines ? (
          <motion.div 
            key="onboarding-success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-6 text-center overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mb-8"
            >
              <div className="relative group">
                <div className="absolute -inset-8 bg-linear-to-r from-emerald-200 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/10 rounded-full blur-2xl opacity-75 animate-pulse"></div>
                <div className="w-32 h-32 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center relative z-10 mx-auto">

                  <CheckCircle2 size={64} className="text-emerald-500 animate-bounce" />
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4 max-w-md"
            >
              <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Brand Onboarding Successful
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 font-light leading-relaxed">
                Welcome to the <span className="font-bold text-slate-900 dark:text-white">{generatedGuidelines.name}</span> Creative Suite! Setup is complete. Redirecting you to the studio...
              </p>
            </motion.div>
          </motion.div>
        ) : showManualPrompt && generatedGuidelines ? (
          <motion.div 
            key="manual-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-6 overflow-y-auto"
          >
            <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden flex flex-col my-8">
              {/* Minimal header with progress summary */}
              <div className="px-6 pt-6 pb-2 text-left bg-white dark:bg-slate-950">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold uppercase tracking-widest font-mono">
                    Brand Setup
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {Math.round(((onboardingStep + 1) / 6) * 100)}% Complete
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-900 h-1 rounded-full mt-2.5 overflow-hidden">
                  <div 
                    className="bg-rose-600 h-full rounded-full transition-all duration-350 ease-out"
                    style={{ width: `${Math.round(((onboardingStep + 1) / 6) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Active Step Slide Body */}
              <div className="p-6 text-left overflow-y-auto max-h-[45vh] bg-white dark:bg-slate-950">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={onboardingStep}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    {onboardingStep === 0 && (
                      <div className="space-y-4 text-center py-4">
                        <div className="relative group w-20 h-20 mx-auto mb-2">
                          <div className="absolute -inset-1 bg-rose-600/10 rounded-full blur-sm opacity-50"></div>
                          <div className="w-20 h-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
                            {manualLogo ? (
                              <img src={manualLogo} alt="Logo" className="object-contain w-full h-full p-2.5" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-rose-400 animate-pulse" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">Upload Logo</h4>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal max-w-xs mx-auto">
                            A real logo upload is required to safely initialize your workspace assets and visual identity.
                          </p>
                          <div className="pt-2">
                            <input
                              type="file"
                              id="manual-onboarding-logo"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setManualLogo(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor="manual-onboarding-logo"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                            >
                              <Upload size={13} className="text-rose-500" />
                              {manualLogo ? 'Change Image' : 'Select File'}
                            </label>
                            
                            {!manualLogo && (
                              <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-rose-500 font-medium">
                                <Lock size={10} className="shrink-0" />
                                <span>Logo required to unlock onboarding</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {onboardingStep === 1 && (
                      <div className="space-y-2 py-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                          Brand Name
                        </label>
                        <input
                          type="text"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          placeholder="e.g. Acme Inc"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2.5 text-slate-900 dark:text-white focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-all"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          The official registered or public name for template and creative copywriting.
                        </p>
                      </div>
                    )}

                    {onboardingStep === 2 && (
                      <div className="space-y-2 py-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                          Vertical or Sector
                        </label>
                        <input
                          type="text"
                          value={manualIndustry}
                          onChange={(e) => setManualIndustry(e.target.value)}
                          placeholder="e.g. Consumer Technology"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2.5 text-slate-900 dark:text-white focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-all"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          Assists the AI engine in tailoring specialized context to your industry vertical.
                        </p>
                      </div>
                    )}

                    {onboardingStep === 3 && (
                      <div className="space-y-2 py-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                          Brand Tone of Voice
                        </label>
                        <input
                          type="text"
                          value={manualTone}
                          onChange={(e) => setManualTone(e.target.value)}
                          placeholder="e.g. Visionary, minimalist, friendly"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2.5 text-slate-900 dark:text-white focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-all"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          Determines the voice style of copywriters, outlines, and advertising campaigns.
                        </p>
                      </div>
                    )}

                    {onboardingStep === 4 && (
                      <div className="space-y-2 py-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                            Palette Hex Colors
                          </label>
                          <span className="text-[9px] text-slate-400 font-mono">Comma-separated</span>
                        </div>
                        <input
                          type="text"
                          value={manualColors}
                          onChange={(e) => setManualColors(e.target.value)}
                          placeholder="#0F172A, #BE123C"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2.5 text-slate-900 dark:text-white focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 font-mono transition-all"
                        />
                        {manualColors.split(',').filter(c => c.trim().startsWith('#')).length > 0 && (
                          <div className="flex items-center gap-1 pt-2">
                            {manualColors.split(',').map((c, idx) => {
                              const trimmed = c.trim();
                              if (/^#[0-9A-F]{6}$/i.test(trimmed)) {
                                return (
                                  <span 
                                    key={idx} 
                                    className="w-4 h-4 rounded-md border border-slate-200 dark:border-slate-800 shrink-0" 
                                    style={{ backgroundColor: trimmed }} 
                                  />
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {onboardingStep === 5 && (
                      <div className="space-y-2 py-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                            Core Brand Pillars
                          </label>
                          <span className="text-[9px] text-slate-400 font-mono">Comma-separated</span>
                        </div>
                        <input
                          type="text"
                          value={manualPillars}
                          onChange={(e) => setManualPillars(e.target.value)}
                          placeholder="Reliability, Innovation, Elegance"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2.5 text-slate-900 dark:text-white focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 transition-all"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                          Key messages woven directly into target briefs and assets.
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Controls */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3 shrink-0">
                <div>
                  {onboardingStep > 0 && (
                    <button
                      type="button"
                      onClick={() => setOnboardingStep((prev) => prev - 1)}
                      className="px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold uppercase tracking-wider transition-all rounded-md flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      Back
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {onboardingStep === 0 && !manualLogo ? (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 rounded-md text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm opacity-60 cursor-not-allowed"
                    >
                      <Lock size={12} />
                      Upload Required
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (onboardingStep < 5) {
                          setOnboardingStep((prev) => prev + 1);
                        } else {
                          handleSaveManualOnboarding();
                        }
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      {onboardingStep < 5 ? (
                        <>
                          Next
                          <ChevronRight size={14} />
                        </>
                      ) : (
                        <>
                          Complete Setup
                          <ArrowRight size={12} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : showSuccess && generatedGuidelines ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-6 text-center overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mb-8 mt-4"
            >
              <div className="relative group">
                <div className="absolute -inset-8 bg-linear-to-r from-rose-200 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/10 rounded-full blur-2xl opacity-75 animate-pulse"></div>
                <BrandLogo 
                  customLogo={generatedGuidelines.logo} 
                  brandName={generatedGuidelines.name} 
                  className="h-36 w-36 relative z-10" 
                />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4 max-w-md"
            >
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                Identity Established
              </h2>
              <p className="text-xl text-slate-500 dark:text-slate-400 font-light">
                Welcome to the <span className="font-bold text-slate-900 dark:text-white">{generatedGuidelines.name}</span> Creative Suite.
              </p>
              {!user ? (
                <div className="mt-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 font-light">
                    Your brand's strategic guidelines and initial assets have been generated under the temporary identity of <strong>{generatedGuidelines.name}</strong>. Please log in or register below to save these parameters securely on your profile and proceed.
                  </p>
                  <AuthBox 
                    user={user}
                    login={login}
                    loginWithEmail={loginWithEmail}
                    registerWithEmail={registerWithEmail}
                    authError={authError}
                    setAuthError={setAuthError}
                    titleText="Verify Your Identity"
                    subText="Save your generated brand identity securely"
                  />
                </div>
              ) : (
                <div className="mt-8 py-4 flex flex-col items-center gap-3">
                  <div className="flex gap-1.5 justify-center">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                        className="w-2 h-2 bg-rose-600 dark:bg-rose-400 rounded-full"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tracking-wider uppercase font-bold animate-pulse">Syncing profile to {user.email || 'account'}...</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : (
          <div className="w-full h-full flex">
            {/* Left Side - Premium Visual */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-rose-950 overflow-hidden items-end p-16">
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-rose-950/80 to-transparent" />
                {/* Visual ambient crimson light */}
                <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl animate-pulse" />
              </div>
              
              <div className="relative z-10 max-w-lg">
                <h1 className="text-4xl font-light text-white tracking-tight mb-4 leading-tight">
                  Enterprise <br/><span className="font-extrabold text-transparent bg-clip-text bg-linear-to-r from-rose-400 via-rose-500 to-rose-300">Creative Suite</span>
                </h1>

                <p className="text-base text-slate-400 font-light leading-relaxed">
                  Powered by advanced creative intelligence. Define your brand's strategic parameters to unlock tailored, high-impact campaigns and visual assets.
                </p>
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-white dark:bg-slate-950 overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-8"
              >
                {(!user && currentPath !== '/brand-init') ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="relative inline-block pb-1">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Access Your Workspace</h2>
                        <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-rose-600 dark:bg-rose-500" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-light text-sm">Please sign in or create an account to begin customizing your brand experience.</p>
                    </div>

                    <AuthBox 
                      user={user}
                      login={login}
                      loginWithEmail={loginWithEmail}
                      registerWithEmail={registerWithEmail}
                      authError={authError}
                      setAuthError={setAuthError}
                      titleText="Verify Your Credentials"
                      subText=""
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="relative inline-block pb-1">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Brand Initialization</h2>
                        <div className="absolute bottom-0 left-0 w-16 h-0.5 bg-rose-600 dark:bg-rose-500" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-light text-sm text-balance">Provide your brand's core brief or URL to let AI customize and configure your workspace.</p>
                      
                      {user && (
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100/50 dark:border-rose-950/20 pb-3">
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <Cloud size={14} className="shrink-0" />
                            <span className="truncate">Active session: {user.email}</span>
                          </div>
                          <button 
                            onClick={logout}
                            type="button"
                            className="text-[10px] bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 px-2 py-1 rounded-sm uppercase tracking-wider font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-center shrink-0"
                            title="Sign out of current account and log in under a different user profile"
                          >
                            <LogOut size={12} /> Sign Out
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2 relative">
                        <div className="flex justify-between items-center bg-white dark:bg-transparent pb-1">
                          <label className="text-[10px] font-bold text-slate-900 dark:text-slate-300 uppercase tracking-widest">Website/Brand Description</label>
                          <button
                            onClick={async () => {
                              try {
                                setIsGeneratingBrief(true);
                                const prm = await generateFastPrompt('brief');
                                setDescription(prm);
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setIsGeneratingBrief(false);
                              }
                            }}
                            disabled={isGeneratingBrief}
                            className="text-[10px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1.5 transition-all font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer border border-dashed border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded-sm hover:border-rose-400 dark:hover:border-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20"
                            title="Generate short job brief with AI Assistant"
                            type="button"
                          >
                            {isGeneratingBrief ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                            Auto-Write
                          </button>
                        </div>
                        <textarea 
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Enter website URL, e.g., writopedia.com&#10;or&#10;Give a short brief about your brand/product."
                          className="w-full h-24 bg-transparent border-b-2 border-slate-200 dark:border-slate-800 focus:border-rose-600 dark:focus:border-rose-400 p-0 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors resize-none text-base font-light"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          AI will scan your URL or analyze your brief to dynamically populate the workspace design scheme.
                        </p>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Optional Context</p>
                        
                        <div className="grid grid-cols-1 gap-x-6 gap-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-900 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                              <ImageIcon size={12} className="text-rose-600 dark:text-rose-400" /> Logo
                            </label>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="w-full text-[10px] text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-sm file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300 dark:hover:file:bg-slate-700 transition-colors"
                            />
                            {initLogo && <p className="text-[10px] text-green-600 dark:text-green-400">Logo uploaded successfully.</p>}
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || !description.trim()}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-500 dark:hover:bg-rose-400 py-4 rounded-sm font-bold tracking-widest uppercase text-xs shadow-md shadow-rose-600/10 dark:shadow-rose-500/15 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="animate-spin" size={18} />
                            PROCESSING...
                          </>
                        ) : (
                          <>
                            GENERATE IDENTITY
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
