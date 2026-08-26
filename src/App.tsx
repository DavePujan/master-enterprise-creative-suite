import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  FileText, 
  Send, 
  Download, 
  Loader2, 
  ChevronRight,
  Sparkles,
  History,
  Settings,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Presentation,
  Clock,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Globe,
  Plus,
  Trash2,
  Edit2,
  FileDown,
  Eye,
  EyeOff,
  Key,
  Music,
  Camera,
  Target,
  Settings2,
  SlidersHorizontal,
  Moon,
  Sun,
  BookOpen,
  CreditCard,
  Cloud,
  CloudOff,
  Database,
  Upload,
  Layers,
  LogOut,
  Fingerprint,
  Check,
  Zap,
  ShieldAlert,
  ArrowRight,
  Sliders,
  Lock,
  Coins,
  Palette,
  Copy
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from './components/BrandLogo';
import { CampaignDeckWorkspace } from './components/CampaignDeckWorkspace';
import { CampaignStrategistWorkspace } from './components/CampaignStrategistWorkspace';
import { GroundingSources } from './components/GroundingSources';
import { SlideshowDisplay } from './components/SlideshowDisplay';
import { AssetLibrary, type Asset } from './components/AssetLibrary';
import { EnterprisePlan } from './components/EnterprisePlan';
import { CreditTopUp } from './components/CreditTopUp';
import AdminPanel from './components/AdminPanel';
import CurationQueuePanel from './components/CurationQueuePanel';
import LandingPage from './components/LandingPage';
import LegalPage from './components/LegalPage';
import PricingPage from './components/PricingPage';
import { GENERIC_GEMS, Gem, generateCreative, pollVideo, BrandGuidelines, generateImage, generateTTS, IMAGE_MODELS, VIDEO_MODELS, TEXT_MODELS, getQuotaErrorMessage, generateBrandIdentity, generateHistoryTitle, initializeBrandKit, type Asset as ServiceAsset, generateFastPrompt, resizeImageIfNeeded, generateBrandLogoAI } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db, useAuth, uploadAssetToStorage } from './lib/firebase';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { cn, downloadFile, compressBase64Image } from './lib/utils';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("skeleton", className)} />
);

const GenerationLoader = ({ title, subtitle, icon: Icon = Sparkles }: { title: string, subtitle?: string, icon?: any }) => (
  <div className="flex flex-col items-center gap-8 py-12">
    <div className="relative">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="w-32 h-32 rounded-full border border-slate-200 dark:border-slate-800 border-t-slate-900 dark:border-t-white"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-slate-900 dark:text-white"
        >
          <Icon size={32} />
        </motion.div>
      </div>
      
      {/* Scanning effect */}
      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-slate-900/20 dark:via-white/20 to-transparent absolute top-0 left-0 animate-scan" />
      </div>
    </div>
    
    <div className="space-y-3 text-center max-w-sm">
      <motion.h3 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-light text-slate-900 dark:text-white tracking-tight"
      >
        {title}
      </motion.h3>
      {subtitle && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 dark:text-slate-400 text-sm font-light leading-relaxed"
        >
          {subtitle}
        </motion.p>
      )}
      
      <div className="flex justify-center gap-1.5 pt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
            className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full"
          />
        ))}
      </div>
    </div>
  </div>
);

interface HistoryItem {
  id: string;
  gemId: string;
  prompt: string;
  title?: string;
  result: any;
  timestamp: number;
}

interface BrandSetupProps {
  onComplete: (guidelines: BrandGuidelines, assets: Asset[]) => void;
  user: any;
  login: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  authError?: string | null;
  setAuthError: (err: string | null) => void;
}

const AuthBox = ({ 
  user, 
  login, 
  loginWithEmail, 
  registerWithEmail, 
  authError,
  setAuthError,
  titleText = "Sign In or Register",
  subText = "Access your established creative profile"
}: { 
  user: any; 
  login: () => void; 
  loginWithEmail: (email: string, password: string) => Promise<void>; 
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>; 
  authError?: string | null;
  setAuthError: (err: string | null) => void;
  titleText?: string;
  subText?: string;
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [copiedDomain, setCopiedDomain] = useState(false);
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDomainError = (formError && formError.includes('Domain Authorization Required')) || (authError && authError.includes('Domain Authorization Required'));

  const handleCopyHostname = () => {
    if (navigator.clipboard && currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setFormError("Please enter email and password");
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setFormError("Password must be at least 6 characters long");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setAuthError(null);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name || undefined);
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Authentication failed. Please verify your details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 w-full text-left mt-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{titleText}</h3>
        {subText && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subText}</p>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => { setMode('signin'); setFormError(null); }}
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
            mode === 'signin' 
              ? 'border-rose-600 text-rose-600 dark:border-rose-500 dark:text-rose-400 font-bold' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode('signup'); setFormError(null); }}
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
            mode === 'signup' 
              ? 'border-rose-600 text-rose-600 dark:border-rose-500 dark:text-rose-400 font-bold' 
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Name (Optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm focus:border-rose-500 focus:outline-none focus:ring-0 text-slate-900 dark:text-white"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm focus:border-rose-500 focus:outline-none focus:ring-0 text-slate-900 dark:text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? "At least 6 characters" : "••••••••"}
            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm focus:border-rose-500 focus:outline-none focus:ring-0 text-slate-900 dark:text-white"
          />
        </div>

        {(formError || authError) && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-sm text-[11px] text-rose-700 dark:text-rose-300 leading-normal space-y-2">
            <div>{formError || authError}</div>
            {isDomainError && currentHostname && (
              <div className="pt-1.5 border-t border-rose-200/60 dark:border-rose-900/60 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800 text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {currentHostname}
                </span>
                <button
                  type="button"
                  onClick={handleCopyHostname}
                  className="flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer shrink-0"
                >
                  {copiedDomain ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copiedDomain ? 'Copied!' : 'Copy Domain'}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 text-white font-bold text-xs py-2.5 rounded-sm transition-colors cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5"
        >
          {submitting ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Processing...
            </>
          ) : (
            mode === 'signin' ? 'Sign In & Connect' : 'Register Account'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        <span className="flex-shrink mx-3 text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">or continue with</span>
        <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
      </div>

      {/* Google Button */}
      <button 
        type="button"
        onClick={login}
        className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 py-2.5 rounded-sm font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Sign in with Google
      </button>
    </div>
  );
};

interface BrandSetupProps {
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

const BrandSetup = ({ onComplete, user, loading, login, loginWithEmail, registerWithEmail, logout, authError, setAuthError, currentPath, navigateTo }: BrandSetupProps) => {
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

  // Routing sync inside BrandSetup
  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (currentPath === '/brand-init') {
        navigateTo('/');
      }
    } else {
      if (currentPath === '/') {
        navigateTo('/brand-init');
      }
    }
  }, [user, loading, currentPath, navigateTo]);

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
      setGeneratedAssets(assets);
      
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
            onComplete(guidelines, assets);
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
                <div className="absolute -inset-8 bg-gradient-to-r from-emerald-200 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/10 rounded-full blur-2xl opacity-75 animate-pulse"></div>
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
                <div className="absolute -inset-8 bg-gradient-to-r from-rose-200 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/10 rounded-full blur-2xl opacity-75 animate-pulse"></div>
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
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-rose-950/80 to-transparent" />
                {/* Visual ambient crimson light */}
                <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl animate-pulse" />
              </div>
              
              <div className="relative z-10 max-w-lg">

                <h1 className="text-4xl font-light text-white tracking-tight mb-4 leading-tight">
                  Enterprise <br/><span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-500 to-rose-300">Creative Suite</span>
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
                {currentPath !== '/brand-init' ? (
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

interface TextWordLayer {
  id: string;
  text: string;
  fontFamily: string;
  color: string;
  scale: number;
  position: { x: number; y: number };
}

export default function App() {
  const [brandSetupComplete, setBrandSetupComplete] = useState(false);
  const [selectedGem, setSelectedGem] = useState<Gem>(GENERIC_GEMS[0]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCreativePrompt, setIsGeneratingCreativePrompt] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [view, setView] = useState<'tools' | 'assets' | 'plan' | 'admin' | 'curation' | 'topup'>('tools');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Real-time user curation requests and notifications state
  const [userCurationRequests, setUserCurationRequests] = useState<any[]>([]);
  const [userNotifications, setUserNotifications] = useState<Array<{
    id: string;
    status: string;
    assetType: string;
    completedComment?: string;
    timestamp: number;
    read: boolean;
  }>>([]);
  const [selectedCurationRequestId, setSelectedCurationRequestId] = useState<string | null>(null);
  const lastStatesRef = React.useRef<Record<string, string>>({});
  
  // Real-time administrative notifications state
  const [adminNotifications, setAdminNotifications] = useState<Array<{
    id: string;
    userEmail: string;
    assetType: string;
    timestamp: number;
    read: boolean;
  }>>([]);
  const [selectedAdminRequestId, setSelectedAdminRequestId] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [credits, setCredits] = useState(50);
  const [productContext, setProductContext] = useState<{ id: string; name: string; data: string } | null>(null);
  const [faceContext, setFaceContext] = useState<{ id: string; name: string; data: string } | null>(null);
  const [firstFrameContext, setFirstFrameContext] = useState<{ id: string; name: string; data: string } | null>(null);
  const [lastFrameContext, setLastFrameContext] = useState<{ id: string; name: string; data: string } | null>(null);
  const [ingredientsContexts, setIngredientsContexts] = useState<{ id: string; name: string; data: string }[]>([]);
  const [showSoftWarningModal, setShowSoftWarningModal] = useState<boolean>(false);
  const [pendingGenerateFn, setPendingGenerateFn] = useState<(() => void) | null>(null);
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);

  const [brandProfiles, setBrandProfiles] = useState<any[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  const [brandGuidelines, setBrandGuidelines] = useState<BrandGuidelines>({
    name: 'Studio AI',
    industry: 'Creative Technology',
    tone: 'Professional & Innovative',
    pillars: ['Innovation', 'Creativity', 'Efficiency'],
    colors: ['#0f172a', '#334155'],
    typography: { primary: 'Outfit', secondary: 'Inter' },
    logo: '',
    location: 'India',
    voiceAccentStyle: 'Indian English',
    visualEthnicityStyle: 'Indian'
  });
  const [editingGuidelines, setEditingGuidelines] = useState<BrandGuidelines | null>(null);
  const [newProfileNameOrURL, setNewProfileNameOrURL] = useState('');
  const [isCreatingNewProfile, setIsCreatingNewProfile] = useState(false);
  const [eraseConfirmState, setEraseConfirmState] = useState<'idle' | 'confirming'>('idle');

  const handleAddNewProfile = async () => {
    if (!newProfileNameOrURL.trim()) return;
    setIsCreatingNewProfile(true);
    try {
      const { guidelines, assets } = await initializeBrandKit(newProfileNameOrURL);
      
      const newProfileDoc = {
          name: guidelines.name,
          mission: guidelines.industry || 'No mission provided',
          tone: guidelines.tone ? (typeof guidelines.tone === 'string' ? [guidelines.tone] : guidelines.tone) : [],
          colors: guidelines.colors || [],
          typography: guidelines.typography || { primary: 'Outfit', secondary: 'Inter' },
          logoUrl: guidelines.logo || '',
          location: guidelines.location || 'India',
          voiceAccentStyle: guidelines.voiceAccentStyle || 'Indian English',
          visualEthnicityStyle: guidelines.visualEthnicityStyle || 'Indian',
          updatedAt: Date.now()
      };

      const finalId = 'default';
      if (user && !user.uid.startsWith('offline-guest')) {
        // Replace/overwrite the single default brand guidelines document in Firestore
        await setDoc(doc(db, 'users', user.uid, 'brand_guidelines', 'default'), newProfileDoc);
        setActiveProfileId('default');
        
        // Also add the generated assets to their asset library!
        await Promise.all(assets.map(async (asset) => {
          const cloudData = await uploadAssetToStorage(user.uid, asset.id, asset.data, asset.type);
          await setDoc(doc(db, 'users', user.uid, 'assets', asset.id), {
            type: asset.type,
            content: cloudData,
            prompt: asset.name,
            timestamp: Date.now()
          });
          // Add to local assets state
          setAssets(prev => [{
            id: asset.id,
            name: asset.name,
            data: cloudData,
            type: asset.type,
            selected: false
          }, ...prev]);
        }));
      }

      const freshProfile = {
        id: finalId,
        name: guidelines.name,
        industry: guidelines.industry,
        tone: guidelines.tone,
        pillars: guidelines.pillars,
        colors: guidelines.colors,
        typography: guidelines.typography,
        logo: guidelines.logo || '',
        location: guidelines.location || 'India',
        voiceAccentStyle: guidelines.voiceAccentStyle || 'Indian English',
        visualEthnicityStyle: guidelines.visualEthnicityStyle || 'Indian'
      };

      // Since only one profile can exist now, overwrite the profiles list rather than appending
      setBrandProfiles([freshProfile]);
      setActiveProfileId(finalId);
      setBrandGuidelines(guidelines);
      setNewProfileNameOrURL('');
    } catch (e) {
      console.error("Failed to alter brand profile:", e);
      alert("Failed to alter brand guidelines. Please try again.");
    } finally {
      setIsCreatingNewProfile(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (brandProfiles.length <= 1) {
      alert("You must keep at least one active brand profile.");
      return;
    }
    if (!confirm("Are you sure you want to delete this brand profile?")) return;
    
    try {
      if (user && !user.uid.startsWith('offline-guest')) {
        await deleteDoc(doc(db, 'users', user.uid, 'brand_guidelines', profileId));
      }
      
      const remainingProfiles = brandProfiles.filter(p => p.id !== profileId);
      setBrandProfiles(remainingProfiles);
      
      if (activeProfileId === profileId) {
        const nextActive = remainingProfiles[0];
        setActiveProfileId(nextActive.id);
        setBrandGuidelines({
          name: nextActive.name,
          industry: nextActive.industry,
          tone: nextActive.tone,
          pillars: nextActive.pillars,
          colors: nextActive.colors,
          typography: nextActive.typography,
          logo: nextActive.logo,
          location: nextActive.location,
          voiceAccentStyle: nextActive.voiceAccentStyle,
          visualEthnicityStyle: nextActive.visualEthnicityStyle
        });
      }
    } catch (e) {
      console.error("Failed to delete brand profile:", e);
    }
  };

  const handleEraseBrandIdentity = async () => {
    setIsSyncing(true);
    try {
      if (user && !user.uid.startsWith('offline-guest')) {
        // Delete firestore document
        await deleteDoc(doc(db, 'users', user.uid, 'brand_guidelines', 'default'));
        
        // Delete associated media asset documents from Firestore
        const assetsSnapshot = await getDocs(collection(db, 'users', user.uid, 'assets'));
        const deleteAssetsPromises = assetsSnapshot.docs.map(d => deleteDoc(doc(db, 'users', user.uid, 'assets', d.id)));
        
        // Delete associated history log documents from Firestore
        const historySnapshot = await getDocs(collection(db, 'users', user.uid, 'historyLogs'));
        const deleteHistoryPromises = historySnapshot.docs.map(d => deleteDoc(doc(db, 'users', user.uid, 'historyLogs', d.id)));

        await Promise.all([...deleteAssetsPromises, ...deleteHistoryPromises]);
      }
      
      // Force setup screen & reset guidelines
      setBrandSetupComplete(false);
      setBrandProfiles([]);
      setActiveProfileId(null);
      setResult(null);
      setHistory([]);
      setAssets([]);
      setEraseConfirmState('idle');
      setTextLayers([]);
      setSelectedTextWordId(null);
      setDraggingTextWordId(null);
      setBrandGuidelines({
        name: '',
        industry: '',
        tone: 'Professional & Innovative',
        pillars: ['Innovation', 'Creativity', 'Efficiency'],
        colors: ['#0f172a', '#334155'],
        typography: { primary: 'Outfit', secondary: 'Inter' },
        logo: '',
        location: 'India',
        voiceAccentStyle: 'Indian English',
        visualEthnicityStyle: 'Indian'
      });
      setShowGuidelines(false);
      setShowAssetLibrary(false);
    } catch (e) {
      console.error("Failed to erase brand identity:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const { user, loading, login, loginWithEmail, registerWithEmail, logout, authError, setAuthError } = useAuth();

  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newPath: string) => {
    window.history.pushState(null, '', newPath);
    setCurrentPath(newPath);
  };

  // Onboarding routing sync
  useEffect(() => {
    if (loading) return;

    if (currentPath === '/' || currentPath === '/pricing' || currentPath.startsWith('/legal')) {
      // Landing page, Pricing page and Legal page are public. No automatic redirect from here.
      return;
    }

    if (currentPath === '/login') {
      if (user) {
        const pending = localStorage.getItem('pending_pricing_plan');
        if (pending) {
          navigateTo('/pricing');
        } else if (!brandSetupComplete) {
          navigateTo('/brand-init');
        } else {
          navigateTo('/workspace');
        }
      }
      return;
    }

    if (currentPath === '/brand-init') {
      if (!user) {
        navigateTo('/login');
      } else if (brandSetupComplete) {
        navigateTo('/workspace');
      }
      return;
    }

    if (currentPath === '/workspace') {
      if (!user) {
        navigateTo('/login');
      } else if (!brandSetupComplete) {
        navigateTo('/brand-init');
      }
      return;
    }

    // Fallback for any other path:
    navigateTo('/');
  }, [user, loading, brandSetupComplete, currentPath]);

  // Administrative realtime sync and active notification deck
  useEffect(() => {
    const isAdminUser = user && (user.email === 'hardeep.pathak@gmail.com' || user.email === 'avdhesh.babaria@gmail.com');
    if (!user || !isAdminUser) return;

    let isInitialLoad = true;
    const q = query(collection(db, 'humanTouchRequests'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const newNotify = {
            id: change.doc.id,
            userEmail: data.userEmail || 'A user',
            assetType: data.assetType || 'asset',
            timestamp: data.timestamp || Date.now(),
            read: false
          };
          setAdminNotifications((prev) => [newNotify, ...prev]);
        }
      });
    }, (error) => {
      console.error("Real-time admin listen error:", error);
    });

    return unsubscribe;
  }, [user]);

  // Real-time user curation notifications and status transition tracker
  useEffect(() => {
    if (!user) {
      setUserCurationRequests([]);
      setUserNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'humanTouchRequests'),
      orderBy('timestamp', 'desc')
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      if (isInitialLoad) {
        fetched.forEach((item) => {
          lastStatesRef.current[item.id] = item.status;
        });
        isInitialLoad = false;
        setUserCurationRequests(fetched);
        return;
      }
      
      fetched.forEach((item) => {
        const previousStatus = lastStatesRef.current[item.id];
        if (previousStatus && previousStatus !== item.status) {
          const newNotify = {
            id: item.id,
            status: item.status,
            assetType: item.assetType || 'asset',
            completedComment: item.completedComment || '',
            timestamp: Date.now(),
            read: false
          };
          setUserNotifications((prev) => [newNotify, ...prev]);
        }
        lastStatesRef.current[item.id] = item.status;
      });

      // Update assets list if a completed request was fetched and we want to auto-refresh assets list
      // We can trigger standard assets refresh by querying user's asset subcollection
      setUserCurationRequests(fetched);
    }, (error) => {
      console.error("Real-time user curation listen error:", error);
    });

    return unsubscribe;
  }, [user]);

  // Human Touch state variables for professional Writopedia assignments from App.tsx
  const [humanTouchItem, setHumanTouchItem] = useState<{
    title: string;
    prompt: string;
    imageUrl: string;
    role: string;
    modelsUsed: string;
  } | null>(null);
  const [humanTouchComment, setHumanTouchComment] = useState('');
  const [isHumanTouchSubmitting, setIsHumanTouchSubmitting] = useState(false);
  const [humanTouchSuccessMsg, setHumanTouchSuccessMsg] = useState<string | null>(null);

  const handleSubmitHumanTouch = async () => {
    if (!humanTouchItem || !humanTouchComment.trim()) return;
    setIsHumanTouchSubmitting(true);
    setHumanTouchSuccessMsg(null);
    try {
      // Compress base64 image URL client-side to ensure it is guaranteed to fit within Firestore's 1MB limit.
      const compressedImageUrl = await compressBase64Image(humanTouchItem.imageUrl);

      const res = await fetch('/api/human-touch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originalPrompt: humanTouchItem.prompt,
          assetType: 'image',
          assetUrl: compressedImageUrl,
          modelsUsed: humanTouchItem.modelsUsed,
          userComment: humanTouchComment,
          emailReceipt: 'business@writopedia.com'
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned error: ${res.statusText}`);
      }

      const resJson = await res.json();

      if (user && user.uid !== "offline-guest-99") {
        const requestId = Math.random().toString(36).substring(7);
        // User-specific collection
        await setDoc(doc(db, 'users', user.uid, 'humanTouchRequests', requestId), {
          assetType: 'image',
          assetUrl: compressedImageUrl,
          originalPrompt: humanTouchItem.prompt,
          modelsUsed: humanTouchItem.modelsUsed,
          userComment: humanTouchComment,
          emailReceipt: 'business@writopedia.com',
          status: 'pending',
          timestamp: Date.now()
        });

        // Global collection for administrative overview
        await setDoc(doc(db, 'humanTouchRequests', requestId), {
          assetType: 'image',
          assetUrl: compressedImageUrl,
          originalPrompt: humanTouchItem.prompt,
          modelsUsed: humanTouchItem.modelsUsed,
          userComment: humanTouchComment,
          emailReceipt: 'business@writopedia.com',
          status: 'pending',
          timestamp: Date.now(),
          userId: user.uid,
          userEmail: user.email || 'guest@creativesuite.local'
        });
      }

      setHumanTouchSuccessMsg(resJson.message || "Submitted successfully!");
    } catch (err: any) {
      console.error(err);
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsHumanTouchSubmitting(false);
    }
  };
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fetchedResultData, setFetchedResultData] = useState<string | null>(null);
  const [isFetchingResult, setIsFetchingResult] = useState(false);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [bakeLogoOnGeneration, setBakeLogoOnGeneration] = useState(true);
  const [logoPosition, setLogoPosition] = useState({ x: 15, y: 15 });
  const [logoScale, setLogoScale] = useState(15);
  const [logoInverted, setLogoInverted] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const [textLayers, setTextLayers] = useState<TextWordLayer[]>([]);
  const [selectedTextWordId, setSelectedTextWordId] = useState<string | null>(null);
  const [draggingTextWordId, setDraggingTextWordId] = useState<string | null>(null);
  const [newTextWordInput, setNewTextWordInput] = useState('');
  const [layoutStudioTab, setLayoutStudioTab] = useState<'logo' | 'text'>('logo');

  useEffect(() => {
    if (result && (result.type === 'text' || result.type === 'campaign')) {
      const isCampaign = result.type === 'campaign';
      const dataStr = isCampaign ? result?.data?.copy : result?.data;
      
      if (typeof dataStr === 'string' && dataStr.startsWith('http')) {
        setIsFetchingResult(true);
        fetch(`/api/proxy?url=${encodeURIComponent(dataStr)}`)
          .then(res => {
            if (!res.ok) throw new Error("Failed to fetch content via proxy");
            return res.text();
          })
          .then(text => {
            if (isCampaign) {
               setResult(prev => ({ ...prev, data: { ...prev.data, copy: text } }));
            } else {
               setResult(prev => ({ ...prev, data: text }));
            }
          })
          .catch(err => {
            console.error("Failed to fetch result content:", err);
          })
          .finally(() => {
            setIsFetchingResult(false);
          });
      }
    }
  }, [result]);

  // Function to dynamically load Google Fonts based on Brand Guidelines
  useEffect(() => {
    if (brandGuidelines?.typography) {
      const fonts = [brandGuidelines.typography.primary, brandGuidelines.typography.secondary].filter(Boolean);
      if (fonts.length > 0) {
        const linkId = 'brand-fonts-link';
        let link = document.getElementById(linkId) as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
        const fontQuery = fonts.map(f => f.replace(/\s+/g, '+')).join('&family=');
        link.href = `https://fonts.googleapis.com/css2?family=${fontQuery}:wght@300;400;500;600;700&display=swap`;
      }
    }
  }, [brandGuidelines?.typography]);

  const getBrandStyles = () => {
    if (!brandGuidelines) return {};
    const styles: any = {
      '--brand-font-primary': brandGuidelines.typography?.primary ? `"${brandGuidelines.typography.primary}", ui-sans-serif, system-ui, sans-serif` : undefined,
      '--brand-font-secondary': brandGuidelines.typography?.secondary ? `"${brandGuidelines.typography.secondary}", ui-sans-serif, system-ui, sans-serif` : undefined,
    };

    if (brandGuidelines.colors && brandGuidelines.colors.length > 0) {
      brandGuidelines.colors.forEach((color, idx) => {
        styles[`--brand-color-${idx}`] = color;
      });
      // Use color 1 or 0 for body text if available, but keep it readable
      // Usually brand colors are for headings/accents.
      // We'll let the theme handle body color unless specifically requested.
    }

    return styles as React.CSSProperties;
  };

  // Helper to accurately fingerprint base64 strings to deduplicate storage
  const generateDataHash = async (data: string) => {
    try {
      const msgUint8 = new TextEncoder().encode(data.length > 200000 ? data.slice(-200000) : data);
      const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    } catch {
      return Math.random().toString(36).substring(2);
    }
  };

  // Helper to ensure all base64 assets in an object are uploaded to storage and replaced with URLs
  const sanitizeResultForFirebase = async (obj: any, userId: string): Promise<any> => {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return Promise.all(obj.map(item => sanitizeResultForFirebase(item, userId)));
    }
    
    const newObj: any = { ...obj };
    
    for (const key in newObj) {
      const val = newObj[key];
      
      if (typeof val === 'string' && val.startsWith('data:') && val.length > 500000) {
        try {
          const id = await generateDataHash(val);
          let type: 'image' | 'video' | 'audio' | 'doc' = 'image';
          if (val.includes('video')) type = 'video';
          else if (val.includes('audio')) type = 'audio';
          
          const cloudUrl = await uploadAssetToStorage(userId, id, val, type);
          newObj[key] = cloudUrl;
        } catch (e) {
          console.error("Auto-upload of base64 failed:", e);
        }
      } else if (typeof val === 'object' && val !== null) {
        newObj[key] = await sanitizeResultForFirebase(val, userId);
      }
      
      // Strip undefined
      if (newObj[key] === undefined) {
        delete newObj[key];
      }
    }
    
    return newObj;
  };

  const handleExecuteRefine = async () => {
    if (!refinePrompt.trim() || !result || result.type !== 'image') return;
    
    if (credits < 2) {
      alert("Insufficient credits. Refinement requires 2 credits.");
      return;
    }
    
    setIsRefining(true);
    setCredits(prev => Math.max(0, prev - 2));
    try {
      const selectedAssets: any[] = [
        {
          id: 'original-context-' + Date.now(),
          name: 'Original Image',
          data: result.data,
          type: 'image',
          selected: true
        }
      ];

      // Add productContext or faceContext if available
      if (productContext) {
        selectedAssets.push({
          id: productContext.id,
          name: productContext.name,
          data: productContext.data,
          type: 'image',
          selected: true,
          isProductContext: true
        });
      }
      if (faceContext) {
        selectedAssets.push({
          id: faceContext.id,
          name: faceContext.name,
          data: faceContext.data,
          type: 'image',
          selected: true,
          isFaceContext: true
        });
      }

      const refinedPromptText = `Refine and edit this image. Change instructions: ${refinePrompt}. Ensure the output strictly follows the Brand Guidelines and is visually consistent with the original image attached. Avoid text/logos unless specified.`;

      const refinedRes = await generateImage(
        refinedPromptText,
        brandGuidelines,
        aspectRatio,
        selectedModel,
        selectedAssets,
        bakeLogoOnGeneration
      );

      const newResult = {
        type: 'image',
        data: refinedRes.url,
        groundingMetadata: refinedRes.groundingMetadata
      };

      setResult(newResult);
      setIsRefineModalOpen(false);

      // Save refined asset to library
      saveAsset(`Refined: ${refinePrompt.slice(0, 20)}`, refinedRes.url, 'image');

      // Add to history
      addToHistory(newResult, selectedGem.id, `${prompt || 'Image'} (Refined: ${refinePrompt})`);
    } catch (err: any) {
      console.error("Image refinement failed:", err);
      alert(err.message || "Failed to refine image with AI.");
    } finally {
      setIsRefining(false);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);

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
    
    const words = split 
      ? newTextWordInput.trim().split(/\s+/).filter(Boolean)
      : [newTextWordInput.trim()];
      
    const newLayers = words.map((w, idx) => ({
      id: `text-word-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      text: w,
      fontFamily: brandGuidelines.typography?.primary || 'Outfit',
      color: brandGuidelines.colors?.[0] || '#ffffff',
      scale: 12, // default scale, matches ~3rem font-size standard in layout
      position: { 
        x: 35 + (idx * 8) % 40, 
        y: 40 + (idx * 6) % 30 
      } // staggered starting placement around center
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
        layer.id === draggingTextWordId 
          ? { ...layer, position: { x: clampedX, y: clampedY } } 
          : layer
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
        layer.id === draggingTextWordId 
          ? { ...layer, position: { x: clampedX, y: clampedY } } 
          : layer
      ));
    }
  };

  const handleContainerTouchEnd = () => {
    setIsDraggingLogo(false);
    setDraggingTextWordId(null);
  };

  const handleDownloadInteractiveImage = async (bgSrc: string, logoSrc: string) => {
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
      // Pre-fetch background map behind proxy to avoid CORS/tainted canvas issues entirely!
      bgLocalUrl = await fetchAsLocalUrl(bgSrc);
      if (logoSrc) {
        logoLocalUrl = await fetchAsLocalUrl(logoSrc);
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not create canvas");

      const bgImg = new Image();
      bgImg.crossOrigin = "anonymous";
      
      const logoImg = new Image();
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

        if (logoInverted) {
          ctx.filter = "invert(1)";
        }
        ctx.drawImage(
          logoImg, 
          logoX - calcLogoWidth / 2, 
          logoY - calcLogoHeight / 2, 
          calcLogoWidth, 
          calcLogoHeight
        );
        if (logoInverted) {
          ctx.filter = "none";
        }
      }

      // Draw all customized text word layers beautifully
      textLayers.forEach(layer => {
        // Compute proportional font size - scale represents % of background width
        const fontSizePr = bgImg.width * (layer.scale / 100);
        
        ctx.font = `bold ${fontSizePr}px "${layer.fontFamily}", "Outfit", "Inter", sans-serif`;
        ctx.fillStyle = layer.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        const tx = bgImg.width * (layer.position.x / 100);
        const ty = bgImg.height * (layer.position.y / 100);
        
        // Draw text word onto the composite canvas
        ctx.fillText(layer.text, tx, ty);
      });

      const resultDataUrl = canvas.toDataURL('image/png');
      const filename = `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-creative-${Date.now()}.png`;
      downloadFile(resultDataUrl, filename);

      saveAsset(`Layout: ${prompt.slice(0, 15) || 'Creative Custom'}`, resultDataUrl, 'image');
    } catch (err) {
      console.error("Failed to generate exported image with custom logo layout:", err);
      // Fallback
      downloadFile(bgSrc, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-creative-fallback-${Date.now()}.png`);
    } finally {
      // Cleanup blob URLs to release memory
      if (bgLocalUrl.startsWith('blob:')) URL.revokeObjectURL(bgLocalUrl);
      if (logoLocalUrl.startsWith('blob:')) URL.revokeObjectURL(logoLocalUrl);
    }
  };

  const saveAsset = async (name: string, data: string, type: 'image' | 'doc' | 'video' | 'audio') => {
    const id = await generateDataHash(data);
    
    // Optimistically update UI (and prevent duplicate keys)
    const newAsset: Asset = {
      id,
      name,
      data,
      type,
      selected: false
    };
    setAssets(prev => [newAsset, ...prev.filter(a => a.id !== id)]);

    if (user) {
      setIsSyncing(true);
      try {
        let finalData = data;
        
        // Skip upload if it's already a Firebase storage URL (just to be safe)
        if (!data.includes('firebasestorage.googleapis.com')) {
           finalData = await uploadAssetToStorage(user.uid, id, data, type);
           
           // Update UI with the final storage URL if it changed
           if (finalData !== data) {
             setAssets(prev => prev.map(a => a.id === id ? { ...a, data: finalData } : a));
           }
        }
        
        await setDoc(doc(db, 'users', user.uid, 'assets', id), {
          type,
          content: finalData,
          prompt: name,
          timestamp: Date.now()
        });
      } catch (e) {
        console.error("Failed to sync asset to Firebase:", e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Dynamic CSS variables for brand colors.
  useEffect(() => {
    const root = document.documentElement;
    if (brandGuidelines.colors && brandGuidelines.colors.length > 0) {
      root.style.setProperty('--brand-primary', brandGuidelines.colors[0]);
      if (brandGuidelines.colors.length > 1) {
        root.style.setProperty('--brand-secondary', brandGuidelines.colors[1]);
      } else {
        root.style.setProperty('--brand-secondary', brandGuidelines.colors[0]);
      }
    }
  }, [brandGuidelines.colors]);

  // Load data from Firebase on start
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // 1. Credits & Brand Guidelines from user doc
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.balance !== undefined) {
             setCredits(userData.balance);
          }
        }

        const defaultDocRef = doc(db, 'users', user.uid, 'brand_guidelines', 'default');
        const defaultDoc = await getDoc(defaultDocRef);
        let activeData: any = null;

        if (defaultDoc.exists()) {
          activeData = defaultDoc.data();
          // Clean up any extra docs (no parallel brand profiles)
          const guidelinesSnapshot = await getDocs(collection(db, 'users', user.uid, 'brand_guidelines'));
          guidelinesSnapshot.docs.forEach(async (d) => {
            if (d.id !== 'default') {
              try {
                await deleteDoc(doc(db, 'users', user.uid, 'brand_guidelines', d.id));
              } catch (e) {
                console.error("Cleanup error:", e);
              }
            }
          });
        } else {
          // Fallback/migration: if 'default' doesn't exist, check if any random doc ID exists, copy the latest to 'default' and delete non-defaults
          const guidelinesSnapshot = await getDocs(collection(db, 'users', user.uid, 'brand_guidelines'));
          if (!guidelinesSnapshot.empty) {
            const sortedDocs = guidelinesSnapshot.docs.map(d => ({ id: d.id, data: d.data() }));
            sortedDocs.sort((a, b) => (b.data.updatedAt || 0) - (a.data.updatedAt || 0));
            const bestDoc = sortedDocs[0];
            activeData = bestDoc.data;
            await setDoc(defaultDocRef, activeData);
            
            // Delete old non-default documents
            guidelinesSnapshot.docs.forEach(async (d) => {
              try {
                await deleteDoc(doc(db, 'users', user.uid, 'brand_guidelines', d.id));
              } catch (e) {
                console.error("Clean up database error:", e);
              }
            });
          }
        }

        if (activeData) {
          let mappedTone = 'Professional';
          if (activeData.tone) {
            if (Array.isArray(activeData.tone)) {
              mappedTone = activeData.tone[0] || 'Professional';
            } else {
              mappedTone = activeData.tone;
            }
          }
          const profile = {
            id: 'default',
            name: activeData.name || '',
            industry: activeData.mission || '',
            tone: mappedTone,
            pillars: activeData.pillars || [],
            colors: activeData.colors || [],
            typography: activeData.typography || { primary: 'Outfit', secondary: 'Inter' },
            logo: activeData.logoUrl || '',
            location: activeData.location || 'India',
            voiceAccentStyle: activeData.voiceAccentStyle || 'Indian English',
            visualEthnicityStyle: activeData.visualEthnicityStyle || 'Indian'
          };
          setBrandProfiles([profile]);
          setActiveProfileId('default');
          setBrandGuidelines({
            name: profile.name,
            industry: profile.industry,
            tone: profile.tone,
            pillars: profile.pillars,
            colors: profile.colors,
            typography: profile.typography,
            logo: profile.logo,
            location: profile.location,
            voiceAccentStyle: profile.voiceAccentStyle,
            visualEthnicityStyle: profile.visualEthnicityStyle
          });
          setBrandSetupComplete(true);
        }

        // 3. Assets
        const assetsQuery = query(collection(db, 'users', user.uid, 'assets'), orderBy('timestamp', 'desc'));
        const assetSnapshot = await getDocs(assetsQuery);
        setAssets(assetSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.prompt,
              data: data.content,
              type: data.type as any,
              selected: false
            };
        }));

        // 4. History
        const historyQuery = query(collection(db, 'users', user.uid, 'historyLogs'), orderBy('timestamp', 'desc'), limit(10));
        const historySnapshot = await getDocs(historyQuery);
        setHistory(historySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              gemId: data.gemId,
              prompt: data.prompt,
              title: data.title,
              result: data.result,
              timestamp: data.timestamp
            };
        }));
      } catch (e) {
        console.error("Firebase load error:", e);
      }
    };

    fetchData();
  }, [user]);

  // Sync credits to Firebase when it changes
  useEffect(() => {
    if (!user || !brandSetupComplete) return;
    const sync = async () => {
      setIsSyncing(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const existing = await getDoc(userDocRef);
        if (existing.exists()) {
          // Update only the changed fields — satisfies the update rule
          await updateDoc(userDocRef, { balance: credits, updatedAt: Date.now() });
        } else {
          // Create the full user doc — satisfies isValidUser (requires balance, createdAt, updatedAt)
          await setDoc(userDocRef, { balance: credits, createdAt: Date.now(), updatedAt: Date.now() });
        }
      } catch (e) {
        console.error("Credit sync failed:", e);
      } finally {
        setIsSyncing(false);
      }
    };
    sync();
  }, [credits, brandSetupComplete, user]);

  // Sync Brand Guidelines
  useEffect(() => {
    if (!user || !brandSetupComplete) return;
    
    const sync = async () => {
      setIsSyncing(true);
      try {
        let logoUrl = brandGuidelines.logo || '';
        
        // Auto-upload logo if it's base64 and larger than 500kb
        if (logoUrl.startsWith('data:') && logoUrl.length > 500000) {
          const id = 'brand-logo-' + await generateDataHash(logoUrl);
          const cloudUrl = await uploadAssetToStorage(user.uid, id, logoUrl, 'image');
          if (cloudUrl !== logoUrl) {
            logoUrl = cloudUrl;
            // Update local state without triggering another sync if possible
            // but since brandGuidelines depends on logo, we should update it
            setBrandGuidelines(prev => ({ ...prev, logo: cloudUrl }));
            // This will re-trigger the effect but the next time it will skip the upload
            return;
          }
        }

        if (user.uid.startsWith('offline-guest')) return;

        const dataToSave = {
            name: brandGuidelines.name,
            mission: brandGuidelines.industry || 'No mission provided',
            tone: brandGuidelines.tone ? (typeof brandGuidelines.tone === 'string' ? [brandGuidelines.tone] : brandGuidelines.tone) : [],
            colors: brandGuidelines.colors || [],
            typography: brandGuidelines.typography || {},
            logoUrl: logoUrl,
            location: brandGuidelines.location || 'India',
            voiceAccentStyle: brandGuidelines.voiceAccentStyle || 'Indian English',
            visualEthnicityStyle: brandGuidelines.visualEthnicityStyle || 'Indian',
            updatedAt: Date.now()
        };

        const defaultDocRef = doc(db, 'users', user.uid, 'brand_guidelines', 'default');
        await setDoc(defaultDocRef, dataToSave);
        setActiveProfileId('default');
        
        let mappedTone = 'Professional';
        if (brandGuidelines.tone) {
          if (Array.isArray(brandGuidelines.tone)) {
            mappedTone = brandGuidelines.tone[0] || 'Professional';
          } else {
            mappedTone = brandGuidelines.tone;
          }
        }

        setBrandProfiles([{
          id: 'default',
          name: brandGuidelines.name,
          industry: brandGuidelines.industry,
          tone: mappedTone,
          pillars: brandGuidelines.pillars || [],
          colors: brandGuidelines.colors || [],
          typography: brandGuidelines.typography || { primary: 'Outfit', secondary: 'Inter' },
          logo: logoUrl,
          location: brandGuidelines.location || 'India',
          voiceAccentStyle: brandGuidelines.voiceAccentStyle || 'Indian English',
          visualEthnicityStyle: brandGuidelines.visualEthnicityStyle || 'Indian'
        }]);
      } catch (e) {
        console.error("Brand Guidelines sync failed:", e);
      } finally {
        setIsSyncing(false);
      }
    };
    sync();
  }, [brandGuidelines, brandSetupComplete, user]);

  useEffect(() => {
    if (selectedGem.type === 'image') {
      setSelectedModel(IMAGE_MODELS[0].id);
    } else if (selectedGem.type === 'video') {
      setSelectedModel(VIDEO_MODELS[0].id);
    } else {
      setSelectedModel(TEXT_MODELS[0].id);
    }
  }, [selectedGem]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(1);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedGemIdRef = useRef(selectedGem.id);

  useEffect(() => {
    selectedGemIdRef.current = selectedGem.id;
  }, [selectedGem.id]);

  // Slideshow Controls
  const [slideshowOverlay, setSlideshowOverlay] = useState(0.6);
  const [slideshowTheme, setSlideshowTheme] = useState<'light' | 'dark' | 'brand'>('dark');
  const [slideshowFont, setSlideshowFont] = useState<'sans' | 'serif'>('sans');
  const [selectedPresentationTheme, setSelectedPresentationTheme] = useState<any>(null);

  const generateCustomThemes = (guidelines: any) => {
    const brandColors = guidelines?.colors && guidelines.colors.length > 0 ? guidelines.colors : ['#0f172a', '#334155'];
    const pColor = brandColors[0] || '#0f172a';
    const sColor = brandColors[1] || brandColors[0] || '#334155';
    const brandName = guidelines?.name || 'Brand';
    const primaryFont = guidelines?.typography?.primary || 'sans';
    const secondaryFont = guidelines?.typography?.secondary || 'sans';
    
    return [
      {
        id: 'signature-brand',
        name: `Signature ${brandName}`,
        description: 'A deep corporate immersive look centering your brand colors.',
        bg: pColor,
        text: '#ffffff',
        accent: sColor,
        secondary: '#94a3b8',
        font: primaryFont,
        overlay: 0.2,
        cardBg: 'rgba(15, 23, 42, 0.45)',
        border: 'rgba(255, 255, 255, 0.1)',
        lineStyle: `linear-gradient(90deg, ${pColor}, ${sColor})`
      },
      {
        id: 'executive-crisp',
        name: 'Executive Crisp',
        description: 'A light, high-contrast and data-oriented elite minimalist theme.',
        bg: '#fafafa',
        text: '#0f172a',
        accent: pColor,
        secondary: '#475569',
        font: secondaryFont,
        overlay: 0.95,
        cardBg: '#ffffff',
        border: 'rgba(15, 23, 42, 0.08)',
        lineStyle: `linear-gradient(90deg, ${pColor}, #cbd5e1)`
      },
      {
        id: 'midnight-tech',
        name: 'Midnight Tech',
        description: 'A premium, ultra-modern slate-black technical dashboard theme.',
        bg: '#020617',
        text: '#f8fafc',
        accent: sColor,
        secondary: '#64748b',
        font: 'mono',
        overlay: 0.15,
        cardBg: '#0f172a',
        border: 'rgba(255, 255, 255, 0.08)',
        lineStyle: `linear-gradient(90deg, ${sColor}, #38bdf8)`
      }
    ];
  };

  useEffect(() => {
    if (brandGuidelines) {
      const themes = generateCustomThemes(brandGuidelines);
      setSelectedPresentationTheme(themes[0]);
    }
  }, [brandGuidelines]);

  // New Generation Controls
  const [videoDuration, setVideoDuration] = useState<'5s' | '7s'>('7s');
  const [videoShotType, setVideoShotType] = useState<'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling'>('Single Shot');
  const [imageStyle, setImageStyle] = useState<string>('Photorealistic');
  const [voiceEmotion, setVoiceEmotion] = useState<'Neutral' | 'Cheerful' | 'Energetic' | 'Professional' | 'Calming'>('Professional');

  const getActiveCost = () => {
    if (selectedGem.type === 'image') {
      const model = IMAGE_MODELS.find(m => m.id === selectedModel);
      return model?.credits ?? selectedGem.cost;
    }
    if (selectedGem.type === 'video') {
      const model = VIDEO_MODELS.find(m => m.id === selectedModel);
      return model?.credits ?? selectedGem.cost;
    }
    return selectedGem.cost;
  };

  useEffect(() => {
    const loadDefaultLogo = async () => {
      try {
        const response = await fetch('/logo.svg');
        if (response.ok) {
          const svgText = await response.text();
          
          // Use SVG directly as data URL
          const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            setBrandGuidelines(prev => ({ ...prev, logo: result }));
          };
          reader.readAsDataURL(svgBlob);
        }
      } catch (error) {
        console.error("Failed to load default logo:", error);
      }
    };
    
    loadDefaultLogo();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  const pollInterval = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioDuration(0);
  }, [result]);

  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Refresh suggestions when gem changes
  useEffect(() => {
    if (selectedGem.type === 'image') {
      setSelectedModel(IMAGE_MODELS[0].id);
    } else if (selectedGem.type === 'video') {
      setSelectedModel(VIDEO_MODELS[0].id);
      setAspectRatio('9:16');
      setVideoDuration('7s');
      setVideoShotType('Single Shot');
    } else if (selectedGem.type === 'text' || selectedGem.type === 'campaign' || selectedGem.type === 'slideshow') {
      setSelectedModel(TEXT_MODELS[0].id);
    } else {
      setSelectedModel('');
    }
  }, [selectedGem.id]);

  const checkCompatibilityAndConfirm = (onConfirm: () => void) => {
    let unsupportedImages: string[] = [];

    if (selectedGem.type === 'image') {
      if (selectedModel === 'openai/gpt-image-2') {
        // Fully supported!
      } else if (selectedModel === 'gemini-2.5-flash-image') {
        if (faceContext) unsupportedImages.push('Face / Model Context Image');
      }
    } else if (selectedGem.type === 'video') {
      if (selectedModel === 'veo-3.1-lite-generate-preview') {
        if (firstFrameContext) unsupportedImages.push('First Frame Image');
        if (lastFrameContext) unsupportedImages.push('Last Frame Image');
        if (productContext) unsupportedImages.push('Product Context Image');
        if (faceContext) unsupportedImages.push('Face / Model Context Image');
        if (ingredientsContexts.length > 0) unsupportedImages.push('Ingredients Reference Images');
      } else if (selectedModel === 'veo-3.1-fast-generate-preview') {
        if (lastFrameContext) unsupportedImages.push('Last Frame Image');
        if (productContext) unsupportedImages.push('Product Context Image');
        if (faceContext) unsupportedImages.push('Face / Model Context Image');
        if (ingredientsContexts.length > 0) unsupportedImages.push('Ingredients Reference Images');
      } else if (selectedModel === 'veo-3.1-generate-preview') {
        if (productContext) unsupportedImages.push('Product Context Image');
        if (faceContext) unsupportedImages.push('Face / Model Context Image');
        if (ingredientsContexts.length > 0 && aspectRatio !== '16:9') {
          unsupportedImages.push('Ingredients Reference Images (requires 16:9 aspect ratio)');
        }
      }
    }

    if (unsupportedImages.length > 0) {
      setWarningMessage(`The image uploaded will not be taken into reference by the selected model (${selectedModel || 'Active model'}).\n\nDo you still want to continue?`);
      setPendingGenerateFn(() => onConfirm);
      setShowSoftWarningModal(true);
    } else {
      onConfirm();
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    const activeCost = getActiveCost();
    if (credits < activeCost) {
      alert(`Not enough credits. This action requires ${activeCost} credits, but you only have ${credits}.`);
      return;
    }

    checkCompatibilityAndConfirm(() => {
      executeGenerate();
    });
  };

  const executeGenerate = async () => {
    setIsGenerating(true);
    
    // For slideshows, we might want to keep existing slides if we're building it up
    const isSlideshow = selectedGem.id === 'slideshow-maker';
    const existingSlideshow = result?.type === 'slideshow' ? result : null;
    
    if (!isSlideshow) {
      setResult(null);
    }
    
    setVideoStatus('');
    // If it's a new slideshow (no existing slides), reset currentSlide
    if (!existingSlideshow) {
      setCurrentSlide(0);
    }

    const fullPrompt = selectedGem.id === 'brand-copy' 
      ? `Language: ${selectedLanguage}\n\n${prompt}`
      : prompt;

    try {
      const selectedAssets = [...assets.filter(a => a.selected)];
      if (productContext) {
        selectedAssets.push({
          id: productContext.id,
          name: productContext.name,
          data: productContext.data,
          type: 'image',
          selected: true,
          isProductContext: true
        });
      }
      if (faceContext) {
        selectedAssets.push({
          id: faceContext.id,
          name: faceContext.name,
          data: faceContext.data,
          type: 'image',
          selected: true,
          isFaceContext: true
        });
      }
      if (firstFrameContext) {
        selectedAssets.push({
          id: firstFrameContext.id,
          name: firstFrameContext.name,
          data: firstFrameContext.data,
          type: 'image',
          selected: true,
          isFirstFrameContext: true
        } as any);
      }
      if (lastFrameContext) {
        selectedAssets.push({
          id: lastFrameContext.id,
          name: lastFrameContext.name,
          data: lastFrameContext.data,
          type: 'image',
          selected: true,
          isLastFrameContext: true
        } as any);
      }
      if (ingredientsContexts && ingredientsContexts.length > 0) {
        ingredientsContexts.forEach(ing => {
          selectedAssets.push({
            id: ing.id,
            name: ing.name,
            data: ing.data,
            type: 'image',
            selected: true,
            isIngredientsContext: true
          } as any);
        });
      }

      const res = await generateCreative(selectedGem, fullPrompt, { 
        aspectRatio,
        guidelines: brandGuidelines,
        model: selectedModel,
        videoDuration,
        videoShotType,
        imageStyle,
        assets: selectedAssets,
        bakeLogo: bakeLogoOnGeneration
      });

      setCredits(prev => prev - getActiveCost());
      
      if (res?.type === 'video_op') {
        setResult(null);
        setVideoStatus('Generating video... This may take a few minutes.');
        startPolling(res.operation, res.concept, selectedGem.id, fullPrompt);
      } else if (res?.type === 'slideshow') {
        const isCorporate = selectedGem.id === 'corporate-presentations';
        const newSlides = res.data;
        
        let updatedSlides;
        if (isCorporate) {
          updatedSlides = [...newSlides];
        } else {
          const newSlide = newSlides[0];
          updatedSlides = existingSlideshow 
            ? [...existingSlideshow.data, newSlide]
            : [newSlide];
        }
        
        const updatedRes = {
          ...res,
          data: updatedSlides
        };
        
        setResult(updatedRes);
        setIsGenerating(false);
        
        if (isCorporate) {
          setCurrentSlide(0);
        } else if (existingSlideshow) {
          setCurrentSlide(updatedSlides.length - 1);
        }
        
        const originalGemId = selectedGem.id;
        const originalPrompt = fullPrompt;
        const finalSlides = [...updatedSlides];
        const startIndex = isCorporate ? 0 : updatedSlides.length - 1;
        
        const generateAllImages = async () => {
          for (let i = startIndex; i < finalSlides.length; i++) {
            const slideToGen = finalSlides[i];
            try {
              const imageResult = await generateImage(slideToGen.imagePrompt, brandGuidelines, aspectRatio);
              finalSlides[i].image = imageResult.url;
              finalSlides[i].groundingMetadata = imageResult.groundingMetadata;
              
              const currentRes = { ...res, data: [...finalSlides] };
              if (selectedGemIdRef.current === originalGemId) {
                setResult(currentRes);
              }
              
              saveAsset(`Slide ${i + 1} Image`, imageResult.url, 'image');
            } catch (e) {
              console.error(`Failed to generate image for slide ${i}:`, e);
            }
          }
          
          if (selectedGemIdRef.current === originalGemId) {
            addToHistory({ ...res, data: finalSlides }, originalGemId, originalPrompt);
          }
        };
        
        generateAllImages();
      } else {
        setResult(res);
        setIsGenerating(false);

        if (res?.type === 'image') {
          saveAsset(`${selectedGem.name} - ${prompt.slice(0, 20)}`, res.data, 'image');
        } else if (res?.type === 'audio') {
          saveAsset(`${selectedGem.name} - ${prompt.slice(0, 20)}`, res.data, 'audio');
        } else if (res?.type === 'text') {
          saveAsset(`${selectedGem.name} - ${prompt.slice(0, 20)}`, res.data, 'doc');
          if ((res as any).imageUrl) {
            saveAsset(`${selectedGem.name} Image`, (res as any).imageUrl, 'image');
          }
        } else if (res?.type === 'campaign') {
          saveAsset(`${selectedGem.name} Strategy`, res.data.copy, 'doc');
        }

        if (res?.type === 'storyline') {
          const originalGemId = selectedGem.id;
          const originalPrompt = fullPrompt;
          const storyline = res.data;
          
          // Save storyline doc
          const storylineMarkdown = `# ${storyline.storyTitle}\n\n` + 
            storyline.scenes.map((s: any, i: number) => `## Chapter ${i+1}: ${s.chapterTitle}\n${s.narrative}`).join('\n\n');
          saveAsset(`${storyline.storyTitle} Storyline`, storylineMarkdown, 'doc');
          
          // Generate images for each scene sequentially
          const updatedScenes = [...storyline.scenes];
          
          for (let i = 0; i < updatedScenes.length; i++) {
            try {
              const imageResult = await generateImage(updatedScenes[i].imagePrompt, brandGuidelines, aspectRatio);
              updatedScenes[i].image = imageResult.url;
              
              const currentRes = { ...res, data: { ...storyline, scenes: [...updatedScenes] } };
              if (selectedGemIdRef.current === originalGemId) {
                setResult(currentRes);
              }
              
              // Save scene image
              saveAsset(`Scene ${i + 1}: ${updatedScenes[i].chapterTitle}`, imageResult.url, 'image');
            } catch (e) {
              console.error(`Failed to generate image for scene ${i}:`, e);
            }
          }
          
          addToHistory({ ...res, data: { ...storyline, scenes: updatedScenes } }, originalGemId, originalPrompt);
        } else if (res?.type === 'campaign') {
          const originalGemId = selectedGem.id;
          const originalPrompt = fullPrompt;
          
          if ((res as any).imagePrompts) {
            const updatedImages: string[] = [];
            for (let i = 0; i < (res as any).imagePrompts.length; i++) {
              try {
                const imgRes = await generateImage((res as any).imagePrompts[i], brandGuidelines, aspectRatio);
                updatedImages.push(imgRes.url);
                saveAsset(`Campaign Visual ${i + 1}`, imgRes.url, 'image');
              } catch (e) {
                console.error("Failed to generate campaign image:", e);
              }
            }
            const updatedRes = { ...res, data: { ...res.data, images: updatedImages } };
            if (selectedGemIdRef.current === originalGemId) {
              setResult(updatedRes);
            }
            addToHistory(updatedRes, originalGemId, originalPrompt);
          } else {
            addToHistory(res, originalGemId, originalPrompt);
          }
        } else {
          addToHistory(res, selectedGem.id, fullPrompt);
        }
      }
    } catch (error: any) {
      console.error(error);
      const quotaMsg = getQuotaErrorMessage(error);
      const message = quotaMsg || "Failed to generate creative. Please try again.";
      setResult({ type: 'error', message });
      setIsGenerating(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTTS = async (text: string) => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    // If audio exists and is paused, just play it
    if (audioRef.current && !audioRef.current.ended && audioRef.current.readyState >= 2) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    if (isTTSLoading) return;
    setIsTTSLoading(true);
    try {
      const url = await generateTTS(text, selectedVoice, voiceEmotion);
      setAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
      } else {
        audioRef.current = new Audio(url);
      }
      
      audioRef.current.onloadedmetadata = () => {
        setAudioDuration(audioRef.current?.duration || 0);
      };

      audioRef.current.ontimeupdate = () => {
        setAudioProgress(audioRef.current?.currentTime || 0);
      };

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setAudioProgress(0);
      };

      audioRef.current.volume = audioVolume;
      audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("TTS Error:", error);
    } finally {
      setIsTTSLoading(false);
    }
  };

  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const handleDownloadAudio = () => {
    if (audioUrl) {
      downloadFile(audioUrl, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-narrative-${Date.now()}.wav`);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result || result.type !== 'slideshow') return;
    setIsDownloadingPDF(true);
    
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvasModule = await import('html2canvas');
      const html2canvas = (html2canvasModule.default || html2canvasModule) as any;
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1280, 720]
      });

      // We'll capture the slides from the hidden container
      const slidesContainer = document.getElementById('slides-to-pdf');
      if (!slidesContainer) throw new Error("Slides container not found");

      const slideElements = slidesContainer.querySelectorAll('.slide-capture-container');
      
      for (let i = 0; i < slideElements.length; i++) {
        const canvas = await html2canvas(slideElements[i] as HTMLElement, {
          scale: 3, // Higher resolution for PDF
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 1280,
          height: 720,
          windowWidth: 1280,
          windowHeight: 720
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage([1280, 720], 'landscape');
        pdf.addImage(imgData, 'JPEG', 0, 0, 1280, 720);
      }

      pdf.save(`${brandGuidelines.name.replace(/\s+/g, '_')}_Slideshow_${Date.now()}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (showGuidelines) {
          setEditingGuidelines(prev => prev ? ({ ...prev, logo: result }) : ({ ...brandGuidelines, logo: result }));
        } else {
          setBrandGuidelines(prev => ({ ...prev, logo: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadAsset = (asset: any) => {
    if (asset.isLogo) {
      downloadFile(brandGuidelines.logo || "/logo.svg", `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-logo.png`);
      return;
    }

    if (asset.url) {
      downloadFile(asset.url, asset.name.toLowerCase().replace(/\s+/g, '-'));
    }
  };

  const handleDownloadStorylineZip = async () => {
    if (!result || result.type !== 'storyline') return;
    setIsDownloadingZip(true);
    
    try {
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');
      const zip = new JSZip();
      
      const scenes = result.data.scenes;
      const brandName = brandGuidelines.name.toLowerCase().replace(/\s+/g, '-');
      
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (scene.image) {
          // Extract base64 data from data URL
          const base64Data = scene.image.split(',')[1];
          const fileName = `${brandName}-scene-${i + 1}.png`;
          zip.file(fileName, base64Data, { base64: true });
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${brandName}-storyline-${Date.now()}.zip`);
    } catch (error) {
      console.error("Failed to generate ZIP:", error);
      alert("Failed to generate ZIP archive. Please try again.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const startPolling = (operation: any, concept?: any, originalGemId?: string, originalPrompt?: string) => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    
    let currentOp = operation;
    pollInterval.current = setInterval(async () => {
      try {
        const updatedOp = await pollVideo(currentOp);
        currentOp = updatedOp;
        
        if (updatedOp.done) {
          if (pollInterval.current) clearInterval(pollInterval.current);
          const videoUri = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
          
          if (!videoUri) {
            throw new Error("Video generation completed but no URI was returned.");
          }
          
          // Fetch video with API key (or bypass headers for Fal.ai endpoints using proxy)
          const isFalVideo = !!currentOp?.engine || !!updatedOp?.engine;
          const fetchUrl = isFalVideo ? `/api/proxy?url=${encodeURIComponent(videoUri)}` : videoUri;
          const fetchHeaders: HeadersInit = isFalVideo ? {} : { 'x-goog-api-key': process.env.GEMINI_API_KEY || '' };

          const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: fetchHeaders,
          });
          const blob = await response.blob();
          const videoUrl = URL.createObjectURL(blob);
          
          const res = { type: 'video', data: videoUrl, concept };
          addToHistory(res, originalGemId, originalPrompt);
          
          // Save generated video to library
          saveAsset(`Video: ${concept?.visualPrompt?.slice(0, 20) || 'Creative Render'}`, videoUrl, 'video');

          if (selectedGemIdRef.current === originalGemId) {
            setResult(res);
            setVideoStatus('');
          }
          setIsGenerating(false);
        }
      } catch (error) {
        console.error("Polling error:", error);
        if (pollInterval.current) clearInterval(pollInterval.current);
        setIsGenerating(false);
        if (selectedGemIdRef.current === originalGemId) {
          setResult({ type: 'error', message: 'Video generation failed.' });
        }
      }
    }, 10000);
  };

  const addToHistory = async (res: any, specificGemId?: string, specificPrompt?: string) => {
    const gemId = specificGemId || selectedGem.id;
    let promptText = "";
    if (typeof specificPrompt === 'string') {
      promptText = specificPrompt;
    } else if (specificPrompt && typeof specificPrompt === 'object') {
      promptText = (specificPrompt as any).campaign_title || (specificPrompt as any).title || JSON.stringify(specificPrompt);
    } else {
      promptText = typeof prompt === 'string' ? prompt : String(prompt || '');
    }
    const gem = GENERIC_GEMS.find(g => g.id === gemId);
    
    const id = Math.random().toString(36).substr(2, 9);
    const newItem: HistoryItem = {
      id,
      gemId,
      prompt: promptText,
      title: promptText.substring(0, 30) + '...',
      result: res,
      timestamp: Date.now()
    };
    
    setHistory(prev => [newItem, ...prev].slice(0, 10));

    if (user) {
      setIsSyncing(true);
      try {
        // Automatically upload large base64 data to storage first
        let sanitizedResult = await sanitizeResultForFirebase(res, user.uid);
        // Ensure absolutely no undefined fields before saving to Firestore
        sanitizedResult = JSON.parse(JSON.stringify(sanitizedResult));
        
        await setDoc(doc(db, 'users', user.uid, 'historyLogs', id), {
          gemId: gemId,
          prompt: promptText,
          title: newItem.title || 'Generated Content',
          result: sanitizedResult,
          timestamp: Date.now()
        });
        
        // Update local state if any assets were uploaded
        if (JSON.stringify(sanitizedResult) !== JSON.stringify(res)) {
           setHistory(prev => prev.map(item => item.id === id ? { ...item, result: sanitizedResult } : item));
           if (selectedGemIdRef.current === gemId) {
             setResult(sanitizedResult);
           }
        }
      } catch (e) {
        console.error("Failed to sync history to Firebase:", e);
      } finally {
        setIsSyncing(false);
      }
    }

    // Generate a better title asynchronously
    try {
      const betterTitle = await generateHistoryTitle(promptText, gem?.name || 'Creative Tool');
      setHistory(prev => prev.map(item => item.id === id ? { ...item, title: betterTitle } : item));
      
      if (user) {
        setIsSyncing(true);
        try {
          await updateDoc(doc(db, 'users', user.uid, 'historyLogs', id), { title: betterTitle });
        } catch (e) {
          console.error("Failed to update history title in Firebase:", e);
        } finally {
          setIsSyncing(false);
        }
      }
    } catch (e) {
      console.error("Failed to generate better title:", e);
    }
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent selecting the item when clicking delete
    
    setHistory(prev => prev.filter(item => item.id !== id));
    
    if (user) {
      setIsSyncing(true);
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'historyLogs', id));
      } catch (e) {
        console.error("Failed to delete history item:", e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleClearHistory = async () => {
    const confirmClear = window.confirm("Are you sure you want to clear your entire history? This cannot be undone.");
    if (!confirmClear) return;

    setHistory([]);
    
    if (user) {
      setIsSyncing(true);
      try {
        const historyRef = collection(db, 'users', user.uid, 'historyLogs');
        const snapshot = await getDocs(historyRef);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      } catch (e) {
        console.error("Failed to clear history:", e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleSelectGem = (gem: Gem) => {
    setSelectedGem(gem);
    setVideoStatus('');
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentSlide(0);
    
    const lastHistoryItem = history.find(item => item.gemId === gem.id);
    if (lastHistoryItem) {
      setResult(lastHistoryItem.result);
      setPrompt(lastHistoryItem.prompt);
    } else {
      setResult(null);
      setPrompt('');
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    const gem = GENERIC_GEMS.find(g => g.id === item.gemId);
    if (gem) setSelectedGem(gem);
    setResult(item.result);
    setPrompt(item.prompt);
    setVideoStatus('');
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentSlide(0);
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Reset state and kick user back to landing/login
      setBrandSetupComplete(false);
      setResult(null);
      setHistory([]);
      setAssets([]);
      setTextLayers([]);
      setSelectedTextWordId(null);
      setDraggingTextWordId(null);
      setCredits(50);
      setBrandGuidelines({
        name: 'Studio AI',
        industry: 'Creative Technology',
        tone: 'Professional & Innovative',
        pillars: ['Innovation', 'Creativity', 'Efficiency'],
        colors: ['#0f172a', '#334155'],
        typography: { primary: 'Outfit', secondary: 'Inter' },
        logo: '',
        location: 'India',
        voiceAccentStyle: 'Indian English',
        visualEthnicityStyle: 'Indian'
      });
      setShowGuidelines(false);
      setShowAssetLibrary(false);
      navigateTo('/');
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Image': return <ImageIcon size={20} />;
      case 'Video': return <VideoIcon size={20} />;
      case 'FileText': return <FileText size={20} />;
      case 'LayoutDashboard': return <LayoutDashboard size={20} />;
      case 'Presentation': return <Presentation size={20} />;
      case 'Target': return <Target size={20} />;
      case 'BookOpen': return <BookOpen size={20} />;
      case 'Layers': return <Layers size={20} />;
      case 'Volume2': return <Volume2 size={20} />;
      case 'Music': return <Music size={20} />;
      default: return <Sparkles size={20} />;
    }
  };


  if (currentPath.startsWith('/legal')) {
    return (
      <LegalPage 
        onOpenWorkspace={() => {
          if (!user) {
            navigateTo('/login');
          } else if (!brandSetupComplete) {
            navigateTo('/brand-init');
          } else {
            navigateTo('/workspace');
          }
        }}
        onLogin={() => {
          if (!user) {
            navigateTo('/login');
          } else if (!brandSetupComplete) {
            navigateTo('/brand-init');
          } else {
            navigateTo('/workspace');
          }
        }}
        navigateTo={navigateTo}
        user={user}
        brandSetupComplete={brandSetupComplete}
      />
    );
  }

  if (currentPath === '/pricing') {
    return (
      <PricingPage 
        onOpenWorkspace={() => {
          if (!user) {
            navigateTo('/login');
          } else if (!brandSetupComplete) {
            navigateTo('/brand-init');
          } else {
            navigateTo('/workspace');
          }
        }}
        onLogin={() => {
          if (!user) {
            navigateTo('/login');
          } else if (!brandSetupComplete) {
            navigateTo('/brand-init');
          } else {
            navigateTo('/workspace');
          }
        }}
        navigateTo={navigateTo}
        user={user}
        brandSetupComplete={brandSetupComplete}
        credits={credits}
        setCredits={setCredits}
      />
    );
  }

  if (currentPath === '/') {
    return (
      <LandingPage 
        navigateTo={navigateTo}
        onOpenWorkspace={() => {
          if (!user) {
            navigateTo('/login');
          } else if (!brandSetupComplete) {
            navigateTo('/brand-init');
          } else {
            navigateTo('/workspace');
          }
        }}
        onLogin={() => {
          if (!user) {
            navigateTo('/login');
          } else if (!brandSetupComplete) {
            navigateTo('/brand-init');
          } else {
            navigateTo('/workspace');
          }
        }}
      />
    );
  }

  if (currentPath === '/login' || currentPath === '/brand-init' || !brandSetupComplete) {
    return (
      <BrandSetup 
        user={user}
        loading={loading}
        login={login}
        loginWithEmail={loginWithEmail}
        registerWithEmail={registerWithEmail}
        logout={handleLogout}
        authError={authError}
        setAuthError={setAuthError}
        currentPath={currentPath}
        navigateTo={navigateTo}
        onComplete={async (guidelines, assets) => {
          setIsSyncing(true);
          try {
            const sanitizedGuidelines = user 
              ? await sanitizeResultForFirebase(guidelines, user.uid)
              : guidelines;
            
            const sanitizedAssets = user
              ? await Promise.all(assets.map(a => sanitizeResultForFirebase(a, user.uid)))
              : assets;

            setBrandGuidelines(sanitizedGuidelines);
            setAssets(sanitizedAssets);
            setBrandSetupComplete(true);
            navigateTo('/workspace');
          } catch (e) {
            console.error("Failed to sanitize initial brand kit:", e);
            setBrandGuidelines(guidelines);
            setAssets(assets);
            setBrandSetupComplete(true);
            navigateTo('/workspace');
          } finally {
            setIsSyncing(false);
          }
        }} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-72" : "w-0 -translate-x-full lg:w-20 lg:translate-x-0"
        )}
      >
        <div className={cn(
          "flex flex-col items-center border-b border-slate-100 dark:border-slate-800 shrink-0 transition-all duration-300",
          sidebarOpen ? "p-8" : "p-4"
        )}>
          <BrandLogo 
            collapsed={!sidebarOpen} 
            customLogo={brandGuidelines.logo} 
            brandName={brandGuidelines.name} 
            className={cn(
              "transition-all duration-500",
              sidebarOpen ? "h-24 w-24 mb-4" : "h-10 w-10"
            )} 
          />
          {sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center"
            >
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                {brandGuidelines.name}
              </span>
              <p className="text-[9px] text-slate-500 font-medium tracking-widest uppercase mt-1">Creative Suite</p>
              <div className="mt-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <Sparkles size={12} />
                {credits} Credits
              </div>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className={cn("text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2", !sidebarOpen && "hidden")}>
            Creative Gems
          </div>
          {GENERIC_GEMS.map((gem) => {
            const isSelected = selectedGem.id === gem.id;
            const isAudio = gem.type === 'audio';
            return (
              <button
                key={gem.id}
                onClick={() => handleSelectGem(gem)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-sm transition-all group border",
                  isSelected
                    ? isAudio
                      ? "bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/60 shadow-sm"
                      : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                    : isAudio
                      ? "border-transparent text-slate-600 dark:text-slate-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/10 hover:text-violet-500 dark:hover:text-violet-400"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                <div className={cn(
                  "shrink-0", 
                  isSelected 
                    ? isAudio 
                      ? "text-violet-600 dark:text-violet-400" 
                      : "text-rose-600 dark:text-rose-400" 
                    : isAudio
                      ? "text-slate-400 group-hover:text-violet-500 dark:group-hover:text-violet-400"
                      : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                )}>
                  {getIcon(gem.icon)}
                </div>
                {sidebarOpen && (
                  <div className="text-left overflow-hidden flex-1">
                    <p className="font-medium text-sm whitespace-nowrap">{gem.name}</p>
                    <p className={cn(
                      "text-[10px] truncate uppercase tracking-wider font-semibold", 
                      isSelected 
                        ? isAudio 
                          ? "text-violet-400 dark:text-violet-500" 
                          : "text-rose-400 dark:text-rose-500" 
                        : "text-slate-400"
                    )}>
                      {gem.id === 'corporate-presentations' ? 'PPT' : gem.type}
                    </p>
                  </div>
                )}
                {sidebarOpen && (
                  <div className={cn(
                    "shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors",
                    isSelected
                      ? isAudio
                        ? "text-violet-600 bg-violet-100 dark:text-violet-300 dark:bg-violet-950/50"
                        : "text-rose-600 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/50"
                      : "text-amber-500 bg-amber-500/10"
                  )}>
                    {gem.cost}
                  </div>
                )}
              </button>
            );
          })}

          <div className="pt-8">
            <div className={cn("text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2", !sidebarOpen && "hidden")}>
              Library & Plans
            </div>
            <button
              onClick={() => setView('assets')}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-sm transition-all group border mb-2",
                view === 'assets'
                  ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div className={cn("shrink-0", view === 'assets' ? "text-rose-600 dark:text-rose-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")}>
                <ImageIcon size={20} />
              </div>
              {sidebarOpen && (
                <div className="text-left overflow-hidden">
                  <p className="font-medium text-sm whitespace-nowrap">Asset Library</p>
                  <p className={cn("text-[10px] truncate uppercase tracking-wider", view === 'assets' ? "text-rose-400 dark:text-rose-500" : "text-slate-400")}>
                    Manage Assets
                  </p>
                </div>
              )}
            </button>

            <button
              onClick={() => {
                setView('curation');
                setUserNotifications(prev => prev.map(n => ({ ...n, read: true })));
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-sm transition-all group border mb-2",
                view === 'curation'
                  ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div className={cn("shrink-0 relative", view === 'curation' ? "text-rose-600 dark:text-rose-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")}>
                <Sparkles size={20} className={cn(view !== 'curation' && userNotifications.filter(n => !n.read).length > 0 ? "animate-bounce text-rose-500" : "")} />
                {view !== 'curation' && userNotifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border border-white dark:border-slate-900 rounded-full animate-ping" />
                )}
              </div>
              {sidebarOpen && (
                <div className="text-left overflow-hidden flex-1 flex items-center justify-between gap-1">
                  <div>
                    <span className="font-medium text-sm whitespace-nowrap block leading-tight">Curation Inbox</span>
                    <span className={cn("text-[10px] truncate uppercase tracking-wider block font-mono", view === 'curation' ? "text-rose-400 dark:text-rose-550" : "text-slate-400")}>
                      Curations released
                    </span>
                  </div>
                  {userNotifications.filter(n => !n.read).length > 0 && (
                    <span className="bg-rose-600 text-white font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none shrink-0 animate-bounce">
                      {userNotifications.filter(n => !n.read).length}
                    </span>
                  )}
                </div>
              )}
            </button>
            <button
              onClick={() => setView('plan')}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-sm transition-all group border",
                view === 'plan'
                  ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div className={cn("shrink-0", view === 'plan' ? "text-rose-600 dark:text-rose-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")}>
                <CreditCard size={20} />
              </div>
              {sidebarOpen && (
                <div className="text-left overflow-hidden">
                  <p className="font-medium text-sm whitespace-nowrap">Enterprise Plan</p>
                  <p className={cn("text-[10px] truncate uppercase tracking-wider", view === 'plan' ? "text-rose-400 dark:text-rose-500" : "text-slate-400")}>
                    View Pricing
                  </p>
                </div>
              )}
            </button>

            <button
              onClick={() => setView('topup')}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-sm transition-all group border",
                view === 'topup'
                  ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/60 shadow-sm" 
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div className={cn("shrink-0", view === 'topup' ? "text-indigo-650 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")}>
                <Coins size={20} />
              </div>
              {sidebarOpen && (
                <div className="text-left overflow-hidden">
                  <p className="font-medium text-sm whitespace-nowrap">Credit Top-Up</p>
                  <p className={cn("text-[10px] truncate uppercase tracking-wider", view === 'topup' ? "text-indigo-400 dark:text-indigo-500" : "text-slate-400")}>
                    Add Balance
                  </p>
                </div>
              )}
            </button>

            {user && (user.email === 'hardeep.pathak@gmail.com' || user.email === 'avdhesh.babaria@gmail.com') && (
              <button
                onClick={() => setView('admin')}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-sm transition-all group border mt-2",
                  view === 'admin'
                    ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                <div className={cn("shrink-0", view === 'admin' ? "text-rose-600 dark:text-rose-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")}>
                  <Fingerprint size={20} className={cn(view !== 'admin' && adminNotifications.filter(n => !n.read).length > 0 ? "animate-bounce text-amber-500" : "")} />
                </div>
                {sidebarOpen && (
                  <div className="text-left overflow-hidden flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-medium text-xs whitespace-nowrap">Admin Operations</p>
                      {adminNotifications.filter(n => !n.read).length > 0 && (
                        <span className="bg-rose-600 text-white font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none animate-pulse">
                          {adminNotifications.filter(n => !n.read).length}
                        </span>
                      )}
                    </div>
                    <p className={cn("text-[10px] truncate uppercase tracking-wider font-mono font-bold", view === 'admin' ? "text-rose-400 dark:text-rose-500" : "text-amber-500")}>
                      Writopedia Queue
                    </p>
                  </div>
                )}
              </button>
            )}
          </div>

          <div className="pt-8">
            <div className={cn("flex items-center justify-between mb-4 px-2", !sidebarOpen && "hidden")}>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Recent History
              </div>
              {sidebarOpen && history.length > 0 && (
                <button 
                  onClick={handleClearHistory}
                  className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1"
                  title="Clear All History"
                >
                  Clear
                </button>
              )}
            </div>
            
            {history.length === 0 && sidebarOpen && (
              <div className="px-2 py-4 text-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-600 italic">No recent history</p>
              </div>
            )}

            {history.map((item) => (
              <div
                key={item.id}
                className="group relative"
              >
                <button
                  onClick={() => handleSelectHistoryItem(item)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left",
                    !sidebarOpen && "justify-center"
                  )}
                >
                  <History size={16} className="shrink-0" />
                  {sidebarOpen && <span className="text-xs truncate pr-6">{item.title || item.prompt}</span>}
                </button>
                
                {sidebarOpen && (
                  <button
                    onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Delete entry"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-sm text-[10px] uppercase tracking-widest font-bold",
            user ? "text-emerald-500 bg-emerald-500/5 cursor-pointer" : "text-amber-500 bg-amber-500/5 px-3 cursor-pointer",
            "hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          )} onClick={() => user ? logout() : login()}>
            {user ? (
              <>
                <Cloud size={16} className={cn(isSyncing && "animate-pulse")} />
                {sidebarOpen && (
                  <div className="flex flex-col">
                    <span>Cloud Synced</span>
                    <span className="text-[8px] opacity-70 truncate max-w-[120px] normal-case tracking-normal">{user.email}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <CloudOff size={16} />
                {sidebarOpen && <span>Sign in to sync</span>}
              </>
            )}
          </div>

          <button 
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 p-3 rounded-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings size={20} />
            {sidebarOpen && <span className="text-sm font-medium">Settings</span>}
          </button>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
            title="Log out session and return to brand configuration"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="text-sm font-medium">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 relative">
          <div className="flex items-center z-10">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-slate-500 dark:text-slate-400"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div 
              key={selectedGem.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-lg">{selectedGem.name}</h2>
            </motion.div>
          </div>
          
          <div className="flex items-center gap-4 z-10">
            {view !== 'plan' && view !== 'topup' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setView('topup')}
                  className="inline-flex items-center gap-1.5 px-4.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md transition-all cursor-pointer"
                  id="topup-button"
                  title="Booster / Top-Up Credits"
                >
                  <Coins size={13} className="animate-pulse" />
                  <span>Credit Top-Up</span>
                </button>
                <button
                  onClick={() => setView('plan')}
                  className="inline-flex items-center gap-1.5 px-4.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md transition-all cursor-pointer"
                  id="upgrade-button"
                  title="Upgrade Pricing Plans"
                >
                  <Sparkles size={13} className="animate-pulse" />
                  <span>Upgrade</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setView('tools')}
                className="inline-flex items-center gap-1.5 px-4.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                id="workspace-back-button"
                title="Return to Workspace content"
              >
                <span>Back to Workspace</span>
              </button>
            )}

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-slate-500 dark:text-slate-400 transition-colors"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Content Area */}
        {view === 'assets' ? (
          <AssetLibrary 
            assets={assets} 
            setAssets={setAssets} 
            onClose={() => setView('tools')} 
            brandGuidelines={brandGuidelines}
            isSyncing={isSyncing}
            setIsSyncing={setIsSyncing}
          />
        ) : view === 'curation' ? (
          <CurationQueuePanel 
            requests={userCurationRequests}
            onClose={() => setView('tools')}
            selectedRequestId={selectedCurationRequestId}
            onSelectRequest={() => setSelectedCurationRequestId(null)}
          />
        ) : view === 'plan' ? (
          <EnterprisePlan 
            credits={credits} 
            setCredits={setCredits} 
            user={user} 
            onLogin={() => {
              if (!user) {
                navigateTo('/login');
              }
            }}
          />
        ) : view === 'topup' ? (
          <CreditTopUp 
            credits={credits} 
            setCredits={setCredits} 
            user={user} 
            onLogin={() => {
              if (!user) {
                navigateTo('/login');
              }
            }}
          />
        ) : view === 'admin' ? (
          <AdminPanel 
            onClose={() => setView('tools')}
            selectedRequestId={selectedAdminRequestId}
            onClearSelectedRequest={() => setSelectedAdminRequestId(null)}
          />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="max-w-5xl mx-auto space-y-6">
                {selectedGem.id === 'bundles-campaigns' ? (
                <CampaignDeckWorkspace 
                  brandGuidelines={brandGuidelines}
                  productContext={productContext}
                  setProductContext={setProductContext}
                  faceContext={faceContext}
                  setFaceContext={setFaceContext}
                  onSaveCampaignAsset={saveAsset}
                  onSaveHistory={addToHistory}
                  currentActiveResult={result}
                  onClearActiveResult={() => setResult(null)}
                />
              ) : selectedGem.id === 'campaign-strategist-y' ? (
                <CampaignStrategistWorkspace 
                  brandGuidelines={brandGuidelines}
                  onSaveCampaignAsset={saveAsset}
                  onSaveHistory={addToHistory}
                  credits={credits}
                  setCredits={setCredits}
                  productContext={productContext}
                  setProductContext={setProductContext}
                  faceContext={faceContext}
                  setFaceContext={setFaceContext}
                  setHumanTouchItem={setHumanTouchItem}
                />
              ) : (
                <>
                  {/* Gem Info */}
            {/* Gem Header */}
            <div className="space-y-2 pb-1">
              <div className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                {getIcon(selectedGem.icon)}
                {selectedGem.id === 'corporate-presentations' ? 'PPT' : selectedGem.type} Engine
              </div>
              <h1 className="text-3xl md:text-4xl font-light text-slate-950 dark:text-slate-50 tracking-tight">
                {selectedGem.name}. <span className="text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">Simplified.</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400 max-w-4xl text-sm font-light leading-relaxed">
                {selectedGem.description}
              </p>
            </div>
            
            {/* Parameter Controls Toolbar Block */}
            <div className="flex flex-wrap items-stretch gap-4">
              {selectedGem.type !== 'text' && selectedGem.type !== 'audio' && selectedGem.id !== 'corporate-presentations' && (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Aspect Ratio</span>
                  {(selectedGem.type === 'video' ? ['16:9', '9:16'] : (selectedGem.type === 'storyline' ? ['1:1', '16:9', '9:16'] : ['1:1', '16:9', '9:16', '4:3'])).map(ratio => (
                     <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={cn(
                        "px-3 py-1.5 rounded-sm text-xs font-bold transition-all border",
                        aspectRatio === ratio 
                          ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                          : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              )}

              {(selectedGem.type === 'image' || selectedGem.type === 'video' || selectedGem.type === 'text' || selectedGem.type === 'campaign' || selectedGem.type === 'slideshow' || selectedGem.type === 'storyline') && (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Model Quality</span>
                  {(selectedGem.type === 'image' ? IMAGE_MODELS : (selectedGem.type === 'video' ? VIDEO_MODELS : TEXT_MODELS)).map(model => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-sm text-xs font-bold transition-all flex items-center gap-2 border",
                        selectedModel === model.id 
                          ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm"
                          : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                      title={`${'modelName' in model ? (model as any).modelName : ''} — ${model.description} (${('credits' in model ? (model as any).credits : selectedGem.cost)} credits)`}
                    >
                      {(model.id.includes('3.1') || model.id === 'veo-3.1-generate-preview') && <Sparkles size={12} />}
                      <span className="flex items-center gap-1">
                        <span>{model.name}</span>
                        <span className="text-[10px] opacity-75 font-normal">
                          ({'credits' in model ? (model as any).credits : selectedGem.cost}c)
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedGem.type === 'video' && (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Shot Type</span>
                  {(['Single Shot', 'Multi-Shot Sequence', 'Cinematic Storytelling'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setVideoShotType(type)}
                      className={cn(
                        "px-3 py-1.5 rounded-sm text-xs font-bold transition-all border",
                        videoShotType === type 
                          ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm"
                          : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}

              {selectedGem.type === 'image' && (
                <>
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm flex-1 min-w-[200px] max-w-sm">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider shrink-0">Style</span>
                    <input 
                      type="text"
                      value={imageStyle}
                      onChange={(e) => setImageStyle(e.target.value)}
                      placeholder="e.g., Photorealistic, 3D Render, Minimalist"
                      className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setBakeLogoOnGeneration(prev => !prev)}
                    className={cn(
                      "px-3 py-2 rounded-sm text-xs font-bold transition-all border flex items-center gap-2 shadow-sm cursor-pointer",
                      !bakeLogoOnGeneration
                        ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                    title="Toggle between embedding Logo directly inside image pixels or displaying a interactive overlay."
                  >
                    <Layers size={13} className={!bakeLogoOnGeneration ? "text-rose-500" : "text-slate-400"} />
                    {!bakeLogoOnGeneration ? "Interactive Logo Layer" : "Bake Logo Immediately"}
                  </button>
                </>
              )}

              {selectedGem.type === 'text' && (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Voice Emotion</span>
                  {(['Neutral', 'Cheerful', 'Energetic', 'Professional', 'Calming'] as const).map(emotion => (
                    <button
                      key={emotion}
                      onClick={() => setVoiceEmotion(emotion)}
                      className={cn(
                        "px-3 py-1.5 rounded-sm text-xs font-bold transition-all border",
                        voiceEmotion === emotion 
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white" 
                          : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {emotion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Model capabilities / possibilities display - clean, horizontal, minimal */}
            {(selectedGem.type === 'image' || selectedGem.type === 'video') && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 bg-slate-50/70 dark:bg-slate-900/30 rounded-sm border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 w-full select-none animate-in fade-in slide-in-from-top-1">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
                  Model Support
                </span>
                <span className="hidden sm:inline h-3.5 w-px bg-slate-200 dark:bg-slate-800" />
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  Active Model: <span className="text-slate-900 dark:text-slate-100 font-bold">
                    {selectedGem.type === 'image' ? (
                      (() => {
                        const m = IMAGE_MODELS.find(x => x.id === selectedModel);
                        return m ? m.name : selectedModel;
                      })()
                    ) : (
                      (() => {
                        const m = VIDEO_MODELS.find(x => x.id === selectedModel);
                        return m ? m.name : selectedModel;
                      })()
                    )}
                  </span>
                </span>
                
                {selectedGem.type === 'image' ? (
                  <>
                    <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                    <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                      Logo Overlay: 
                      <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", selectedModel === 'openai/gpt-image-2' ? "text-slate-450 dark:text-slate-500" : "text-emerald-600 dark:text-emerald-400")}>
                        {selectedModel === 'openai/gpt-image-2' ? 'Unsupported' : 'Supported'}
                      </span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                    <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                      Face Reference: 
                      <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", (selectedModel.includes('gemini-3') || selectedModel === 'openai/gpt-image-2') ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500")}>
                        {(selectedModel.includes('gemini-3') || selectedModel === 'openai/gpt-image-2') ? 'Supported' : 'Unsupported'}
                      </span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                    <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                      Product Placement: 
                      <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", selectedModel === 'openai/gpt-image-2' ? "text-emerald-600 dark:text-emerald-400" : (selectedModel === 'gemini-2.5-flash-image' ? "text-amber-600 dark:text-amber-500 font-bold" : "text-emerald-600 dark:text-emerald-400"))}>
                        {selectedModel === 'openai/gpt-image-2' ? 'Supported' : (selectedModel === 'gemini-2.5-flash-image' ? 'Inspirational Only' : 'Supported')}
                      </span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                    <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                      Ingredients Input: 
                      <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", selectedModel === 'openai/gpt-image-2' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500")}>
                        {selectedModel === 'openai/gpt-image-2' ? 'Supported' : 'Unsupported'}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                    <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                      First Frame Input: 
                      <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", selectedModel !== 'veo-3.1-lite-generate-preview' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500")}>
                        {selectedModel !== 'veo-3.1-lite-generate-preview' ? 'Supported' : 'Unsupported'}
                      </span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                    <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                      Last Frame Input: 
                      <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", selectedModel === 'veo-3.1-generate-preview' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500")}>
                        {selectedModel === 'veo-3.1-generate-preview' ? 'Supported' : 'Unsupported'}
                      </span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                    <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                      Ingredients Input: 
                      <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", selectedModel === 'veo-3.1-generate-preview' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500")}>
                        {selectedModel === 'veo-3.1-generate-preview' ? 'Supported' : 'Unsupported'}
                      </span>
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Result Display */}
            <div className="min-h-[400px] bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              {result ? (
                <div className="flex-1 flex flex-col">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      <CheckCircle2 size={14} className="text-green-500" />
                      Generation Complete
                    </div>
                    <div className="flex items-center gap-4">
                      {(result.type === 'image' || result.type === 'video') && (
                        <button 
                          onClick={() => {
                            setHumanTouchItem({
                              title: `${selectedGem?.name || 'Asset'} Render`,
                              prompt: prompt || 'Image rendering asset',
                              imageUrl: result.data,
                              role: result.type.toUpperCase(),
                              modelsUsed: selectedModel || 'openai/gpt-image-2'
                            });
                            setHumanTouchComment('');
                            setHumanTouchSuccessMsg(null);
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-355 hover:text-rose-600 dark:hover:text-rose-455 transition-colors cursor-pointer"
                        >
                          <Fingerprint size={14} />
                          HUMAN TOUCH
                        </button>
                      )}
                      
                      <button 
                        onClick={() => {
                          if (result.type === 'image') {
                            if (!bakeLogoOnGeneration && (brandGuidelines.logo || textLayers.length > 0)) {
                              handleDownloadInteractiveImage(result.data, brandGuidelines.logo || '');
                            } else {
                              downloadFile(result.data, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-creative-${Date.now()}`);
                            }
                          } else if (result.type === 'video' || result.type === 'audio') {
                            downloadFile(result.data, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-creative-${Date.now()}`);
                          } else if (result.type === 'text' || result.type === 'campaign') {
                            const content = result.type === 'campaign' ? result.data.copy : result.data;
                            const blob = new Blob([content], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            downloadFile(url, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-narrative-${Date.now()}.md`);
                            URL.revokeObjectURL(url);
                          } else if (result.type === 'slideshow') {
                            handleDownloadPDF();
                          } else if (result.type === 'storyline') {
                            handleDownloadStorylineZip();
                          }
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white hover:opacity-80 transition-all font-sans"
                      >
                        <Download size={14} />
                        EXPORT ASSET
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-8 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/30">
                    <div className="min-h-full flex flex-col items-center justify-center">
                    {result.type === 'image' && (
                      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full max-w-5xl">
                        {/* Interactive Image Canvas wrapper */}
                        <div className="flex-1 flex flex-col items-center">
                          <div 
                            ref={containerRef}
                            onMouseMove={handleContainerMouseMove}
                            onMouseUp={handleContainerTouchEnd}
                            onMouseLeave={handleContainerTouchEnd}
                            onTouchMove={handleContainerTouchMove}
                            onTouchEnd={handleContainerTouchEnd}
                            className="relative select-none overflow-hidden rounded-sm shadow-xl border border-slate-250 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 inline-block max-w-full"
                          >
                            <img 
                              src={result.data} 
                              alt="Generated Creative" 
                              className="max-w-full max-h-[500px] pointer-events-none block rounded-sm"
                              referrerPolicy="no-referrer"
                            />

                            {/* Render the manual Logo Overlay if not baked */}
                            {!bakeLogoOnGeneration && brandGuidelines.logo && (
                              <div 
                                onMouseDown={handleLogoMouseDown}
                                onTouchStart={handleLogoTouchStart}
                                style={{
                                  position: 'absolute',
                                  left: `${logoPosition.x}%`,
                                  top: `${logoPosition.y}%`,
                                  width: `${logoScale}%`,
                                  transform: 'translate(-50%, -50%)',
                                  cursor: isDraggingLogo ? 'grabbing' : 'grab',
                                }}
                                className={cn(
                                  "z-30 select-none group/logo transition-shadow p-1 border",
                                  isDraggingLogo ? "border-rose-500 bg-rose-500/10 rounded-sm" : "border-transparent"
                                )}
                              >
                                <img 
                                  src={brandGuidelines.logo} 
                                  alt="Interactive Logo" 
                                  className={cn(
                                    "w-full h-auto object-contain pointer-events-none drop-shadow transition-all duration-300",
                                    logoInverted ? "invert" : ""
                                  )}
                                  referrerPolicy="no-referrer"
                                />
                                {/* Dash border helper on hover */}
                                <div className="absolute -inset-1 border border-dashed border-rose-500/80 rounded-sm opacity-0 group-hover/logo:opacity-100 pointer-events-none" />
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm opacity-0 group-hover/logo:opacity-100 pointer-events-none shadow-md whitespace-nowrap">
                                  Drag directly to reposition
                                </div>
                              </div>
                            )}

                            {/* Render manual customizable text layers if not baked */}
                            {!bakeLogoOnGeneration && textLayers.map((layer) => {
                              const isSelected = selectedTextWordId === layer.id;
                              const isDragging = draggingTextWordId === layer.id;
                              return (
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
                                    fontSize: `${layer.scale * 0.25}rem`,
                                    color: layer.color,
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                  }}
                                  className={cn(
                                    "z-35 select-none group/text transition-all px-2 py-0.5 rounded-xs border inline-block whitespace-nowrap",
                                    isSelected 
                                      ? "border-rose-500 bg-rose-500/15 shadow-md scale-105" 
                                      : "border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-black/10 dark:hover:bg-white/10"
                                  )}
                                >
                                  {layer.text}
                                  {/* Dash border helper on hover */}
                                  <div className="absolute -inset-0.5 border border-dashed border-rose-500/60 rounded-xs opacity-0 group-hover/text:opacity-100 pointer-events-none" />
                                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-xs opacity-0 group-hover/text:opacity-100 pointer-events-none shadow-md whitespace-nowrap">
                                    Click & Drag to edit or move
                                  </div>
                                </div>
                              );
                            })}

                            {/* Default hover overlay ONLY if logo is baked */}
                            {bakeLogoOnGeneration && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-sm">
                                 <button 
                                   onClick={() => {
                                     setRefinePrompt('');
                                     setIsRefineModalOpen(true);
                                   }}
                                   className="bg-white text-slate-900 px-6 py-3 rounded-sm font-bold shadow-xl flex items-center gap-2 transform translate-y-4 hover:translate-y-0 transition-transform cursor-pointer hover:bg-slate-50 transition-colors"
                                 >
                                   <Sparkles size={18} />
                                   Refine with AI
                                 </button>
                              </div>
                            )}
                          </div>
                          
                          {/* AI refinement action under the image layout */}
                          {!bakeLogoOnGeneration && (
                            <button 
                              onClick={() => {
                                setRefinePrompt('');
                                setIsRefineModalOpen(true);
                              }}
                              className="mt-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold px-4 py-2.5 rounded-sm shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                            >
                              <Sparkles size={14} />
                              Refine Asset with AI
                            </button>
                          )}

                          <div className="mt-4 w-full">
                            <GroundingSources metadata={result.groundingMetadata} />
                          </div>
                        </div>

                        {/* Interactive layout controls sidebar panel */}
                        {!bakeLogoOnGeneration && (
                          <div className="w-full lg:w-72 shrink-0 bg-slate-50/80 dark:bg-slate-900 p-5 rounded-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-5 shadow-sm text-left">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="p-1 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-sm">
                                  <SlidersHorizontal size={12} />
                                </div>
                                <h4 className="text-[11px] font-extrabold text-slate-850 dark:text-slate-200 uppercase tracking-widest block font-sans">
                                  Layout Studio
                                </h4>
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                Drag layers across the background stage, or use the fine-tuning slider controls below.
                              </p>
                            </div>

                            {/* Dual Studio Tabs */}
                            <div className="flex bg-slate-150 dark:bg-slate-800/80 p-0.5 rounded-sm gap-0.5">
                              <button
                                type="button"
                                onClick={() => setLayoutStudioTab('logo')}
                                disabled={!brandGuidelines.logo}
                                className={cn(
                                  "flex-1 py-1 text-[9.5px] font-extrabold uppercase tracking-wider text-center rounded-sm transition-all cursor-pointer",
                                  !brandGuidelines.logo ? "opacity-30 cursor-not-allowed" : "",
                                  layoutStudioTab === 'logo' && brandGuidelines.logo
                                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                                    : "text-slate-500 hover:text-slate-755 dark:hover:text-slate-350"
                                )}
                              >
                                Logo Layer
                              </button>
                              <button
                                type="button"
                                onClick={() => setLayoutStudioTab('text')}
                                className={cn(
                                  "flex-1 py-1 text-[9.5px] font-extrabold uppercase tracking-wider text-center rounded-sm transition-all cursor-pointer",
                                  layoutStudioTab === 'text' || !brandGuidelines.logo
                                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                                    : "text-slate-500 hover:text-slate-755 dark:hover:text-slate-350"
                                )}
                              >
                                Text Layers
                              </button>
                            </div>

                            {/* Logo Layer Tab Options */}
                            {layoutStudioTab === 'logo' && brandGuidelines.logo && (
                              <div className="space-y-4">
                                {/* Position Presets */}
                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Corner Presets</span>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                      { label: 'Top Left', pos: { x: 15, y: 15 } },
                                      { label: 'Top Right', pos: { x: 85, y: 15 } },
                                      { label: 'Center', pos: { x: 50, y: 50 } },
                                      { label: 'Bottom Left', pos: { x: 15, y: 85 } },
                                      { label: 'Bottom Right', pos: { x: 85, y: 85 } },
                                    ].map((preset) => (
                                      <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => setLogoPosition(preset.pos)}
                                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors text-center cursor-pointer rounded-sm"
                                      >
                                        {preset.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Scale slider */}
                                <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                                    <span>Logo Scale</span>
                                    <span className="font-mono text-slate-500 font-normal">{logoScale}%</span>
                                  </div>
                                  <input 
                                    type="range"
                                    min="5"
                                    max="50"
                                    value={logoScale}
                                    onChange={(e) => setLogoScale(parseInt(e.target.value))}
                                    className="w-full accent-rose-600 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                  />
                                </div>

                                {/* Logo Inversion Toggle */}
                                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Invert Colors</span>
                                    <button
                                      type="button"
                                      onClick={() => setLogoInverted(prev => !prev)}
                                      className={cn(
                                        "px-3 py-1.5 rounded-sm text-[10px] font-extrabold transition-all border flex items-center gap-1.5 shadow-xs cursor-pointer select-none",
                                        logoInverted
                                          ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-250 dark:border-rose-900/60"
                                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
                                      )}
                                    >
                                      <RefreshCw size={11} className={cn("transition-transform duration-500", logoInverted ? "text-rose-500 rotate-180" : "text-slate-400")} />
                                      {logoInverted ? "Inverted" : "Normal"}
                                    </button>
                                  </div>
                                </div>

                                {/* Fine Coordinates sliders */}
                                <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Fine Tuning</span>
                                  
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                      <span>Offset X</span>
                                      <span>{logoPosition.x}%</span>
                                    </div>
                                    <input 
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={Math.round(logoPosition.x)}
                                      onChange={(e) => setLogoPosition(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                                      className="w-full accent-rose-600 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                      <span>Offset Y</span>
                                      <span>{logoPosition.y}%</span>
                                    </div>
                                    <input 
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={Math.round(logoPosition.y)}
                                      onChange={(e) => setLogoPosition(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                                      className="w-full accent-rose-600 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Custom Text Layer Engine Tab */}
                            {(layoutStudioTab === 'text' || !brandGuidelines.logo) && (
                              <div className="space-y-4">
                                {/* Create text section */}
                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest block font-sans">
                                    Create Text Layer
                                  </span>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      value={newTextWordInput}
                                      onChange={(e) => setNewTextWordInput(e.target.value)}
                                      placeholder="e.g. Premium Organics"
                                      className="flex-1 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-705 px-2.5 py-1.5 text-xs text-slate-850 dark:text-slate-100 rounded-sm focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddTextWord(true);
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleAddTextWord(true)}
                                      disabled={!newTextWordInput.trim()}
                                      className="py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[9px] font-extrabold uppercase tracking-wider rounded-sm cursor-pointer disabled:opacity-40 transition-colors"
                                      title="Creates separate draggable layer for each individual word, to allow per-word typographic style selection."
                                    >
                                      Add Per Word
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddTextWord(false)}
                                      disabled={!newTextWordInput.trim()}
                                      className="py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[9px] font-extrabold uppercase tracking-wider rounded-sm cursor-pointer disabled:opacity-40 transition-colors"
                                      title="Positions the full text layer as one single block."
                                    >
                                      Add As Phrase
                                    </button>
                                  </div>
                                </div>

                                {/* Styles editor for selected text layer */}
                                {selectedTextWordId ? (() => {
                                  const activeWord = textLayers.find(w => w.id === selectedTextWordId);
                                  if (!activeWord) return null;
                                  return (
                                    <div className="bg-white/50 dark:bg-slate-800/40 p-3 rounded-sm border border-slate-200/60 dark:border-slate-800 space-y-3.5">
                                      {/* Word Text Edit */}
                                      <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                                            Text Content
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setTextLayers(prev => prev.filter(w => w.id !== selectedTextWordId));
                                              setSelectedTextWordId(null);
                                            }}
                                            className="text-rose-500 hover:text-rose-600 font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                                          >
                                            <Trash2 size={10} />
                                            Delete
                                          </button>
                                        </div>
                                        <input
                                          type="text"
                                          value={activeWord.text}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, text: val } : w));
                                          }}
                                          className="w-full bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-700 px-2 py-1 text-xs text-slate-850 dark:text-slate-100 rounded-sm focus:outline-none"
                                        />
                                      </div>

                                      {/* Per-word Font Dropdown */}
                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest block font-sans">
                                          Font Selection
                                        </span>
                                        <select
                                          value={activeWord.fontFamily}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, fontFamily: val } : w));
                                          }}
                                          className="w-full bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 px-2 py-1.5 text-xs text-slate-850 dark:text-slate-100 rounded-sm focus:outline-none cursor-pointer"
                                        >
                                          {[
                                            { label: 'Outfit (Modern)', value: 'Outfit' },
                                            { label: 'Inter (Clean Global)', value: 'Inter' },
                                            { label: 'Space Grotesk (Tech Accent)', value: 'Space Grotesk' },
                                            { label: 'Playfair Display (Serif)', value: 'Playfair Display' },
                                            { label: 'Cormorant Garamond (Graceful)', value: 'Cormorant Garamond' },
                                            { label: 'JetBrains Mono (Technical)', value: 'JetBrains Mono' },
                                          ].map(f => (
                                            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                                              {f.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* Font Size/Scale */}
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest font-sans">
                                          <span>Text Scale</span>
                                          <span className="font-mono text-slate-500 font-normal">{activeWord.scale}%</span>
                                        </div>
                                        <input 
                                          type="range"
                                          min="3"
                                          max="35"
                                          value={activeWord.scale}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, scale: val } : w));
                                          }}
                                          className="w-full accent-rose-600 h-1 bg-slate-205 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                        />
                                      </div>

                                      {/* Per-word customized color selectors */}
                                      <div className="space-y-1.5">
                                        <span className="text-[9px] font-bold text-slate-450 dark:text-slate-405 uppercase tracking-widest block font-sans">
                                          Font Color Selection
                                        </span>
                                        
                                        <div className="flex flex-wrap gap-1.5">
                                          {/* Brand colors list */}
                                          {brandGuidelines.colors?.map((c, i) => (
                                            <button
                                              key={`word-brand-color-${i}`}
                                              type="button"
                                              onClick={() => setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, color: c } : w))}
                                              style={{ backgroundColor: c }}
                                              className={cn(
                                                "w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer relative",
                                                activeWord.color.toLowerCase() === c.toLowerCase() ? "ring-2 ring-rose-500 ring-offset-1" : ""
                                              )}
                                              title={`Brand Palette Color ${i + 1}`}
                                            />
                                          ))}

                                          {/* High contrast classic choices */}
                                          {['#ffffff', '#000000', '#f43f5e', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'].map((c) => (
                                            <button
                                              key={`word-std-color-${c}`}
                                              type="button"
                                              onClick={() => setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, color: c } : w))}
                                              style={{ backgroundColor: c }}
                                              className={cn(
                                                "w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer relative",
                                                activeWord.color.toLowerCase() === c.toLowerCase() ? "ring-2 ring-rose-500 ring-offset-1" : ""
                                              )}
                                              title={c}
                                            />
                                          ))}

                                          {/* Custom system HTML5 color dropper */}
                                          <div className="relative w-5 h-5 overflow-hidden rounded-full border border-slate-250 dark:border-slate-700 shadow-xs cursor-pointer">
                                            <input
                                              type="color"
                                              value={activeWord.color.startsWith('#') && activeWord.color.length === 7 ? activeWord.color : '#ffffff'}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, color: val } : w));
                                              }}
                                              className="absolute inset-0 w-8 h-8 -translate-x-1.5 -translate-y-1.5 opacity-100 cursor-pointer"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Coordinates Position Slider Controls */}
                                      <div className="space-y-2 border-t border-slate-100 dark:border-slate-750 pt-2.5">
                                        <span className="text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest block font-sans">Coordinates Offset</span>
                                        
                                        <div className="space-y-1">
                                          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                            <span>Offset X</span>
                                            <span>{Math.round(activeWord.position.x)}%</span>
                                          </div>
                                          <input 
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={Math.round(activeWord.position.x)}
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value);
                                              setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, position: { ...w.position, x: val } } : w));
                                            }}
                                            className="w-full accent-rose-600 h-1 bg-slate-205 dark:bg-slate-750 rounded-lg appearance-none cursor-pointer"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                            <span>Offset Y</span>
                                            <span>{Math.round(activeWord.position.y)}%</span>
                                          </div>
                                          <input 
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={Math.round(activeWord.position.y)}
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value);
                                              setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, position: { ...w.position, y: val } } : w));
                                            }}
                                            className="w-full accent-rose-600 h-1 bg-slate-205 dark:bg-slate-750 rounded-lg appearance-none cursor-pointer"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })() : (
                                  <div className="p-4 bg-slate-100/50 dark:bg-slate-800/30 rounded-sm text-[10px] text-slate-400 text-center border border-dashed border-slate-200 dark:border-slate-800">
                                    No active text layer selected. Typographically select any word block directly inside the viewport stage to edit font attributes!
                                  </div>
                                )}

                                {/* Registered summary list */}
                                {textLayers.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest font-sans">Active Layers ({textLayers.length})</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTextLayers([]);
                                          setSelectedTextWordId(null);
                                        }}
                                        className="text-[9px] text-rose-500 font-bold hover:underline cursor-pointer"
                                      >
                                        Clear All
                                      </button>
                                    </div>

                                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                                      {textLayers.map((layer) => (
                                        <div
                                          key={layer.id}
                                          onClick={() => setSelectedTextWordId(layer.id)}
                                          className={cn(
                                            "p-1.5 px-2 bg-white dark:bg-slate-850 border rounded-sm flex items-center justify-between text-[11px] cursor-pointer transition-colors",
                                            selectedTextWordId === layer.id
                                              ? "border-rose-300 dark:border-rose-900 bg-rose-500/5"
                                              : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                                          )}
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                                            <span className="font-semibold truncate text-slate-850 dark:text-slate-200" style={{ fontFamily: layer.fontFamily }}>
                                              {layer.text}
                                            </span>
                                          </div>
                                          <span className="font-mono text-[8px] text-slate-400 shrink-0 select-none">
                                            {layer.fontFamily} / {layer.scale}%
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {result.type === 'video' && (
                      <div className="flex flex-col xl:flex-row gap-8 w-full max-w-6xl">
                        <div className="flex-1 flex flex-col items-center">
                          <div className="relative inline-block w-full max-w-fit">
                            <video 
                              src={result.data} 
                              controls 
                              autoPlay 
                              loop 
                              className="w-full max-h-[500px] rounded-sm shadow-xl border border-slate-200 dark:border-slate-800 bg-black"
                            />
                          </div>
                        </div>
                        {result.concept && (
                          <div className="w-full xl:w-96 shrink-0 bg-white dark:bg-slate-900 p-6 rounded-sm shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                                <Volume2 size={16} className="text-slate-500" />
                                Voice Over
                              </h4>
                              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-sm text-sm text-slate-600 dark:text-slate-300 italic border border-slate-100 dark:border-slate-700 relative group flex items-center justify-between gap-4">
                                <span>"{result.concept.voiceOver}"</span>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => handleTTS(result.concept.voiceOver)}
                                    className="p-2 bg-white dark:bg-slate-900 rounded-sm shadow-sm text-slate-900 dark:text-white hover:scale-105 transition-transform"
                                    title="Listen to Voice Over"
                                  >
                                    {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                                  </button>
                                  {audioUrl && (
                                    <button 
                                      onClick={handleDownloadAudio}
                                      className="p-2 bg-white dark:bg-slate-900 rounded-sm shadow-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-transform"
                                      title="Download Audio"
                                    >
                                      <Download size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                                <Music size={16} className="text-slate-500" />
                                Music Style
                              </h4>
                              <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-sm border border-slate-100 dark:border-slate-700">
                                {result.concept.musicStyle}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                                <Camera size={16} className="text-slate-500" />
                                Cinematography & VFX
                              </h4>
                              <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-sm border border-slate-100 dark:border-slate-700">
                                {result.concept.cinematographyNotes}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {result.type === 'audio' && (
                      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 p-8 rounded-sm shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-900 dark:text-white">
                          <Volume2 size={40} />
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Audio Track Generated</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Your custom audio track is ready to play.</p>
                        </div>
                        <audio controls src={result.data} className="w-full max-w-md" />
                        <div className="w-full bg-slate-50 dark:bg-slate-800 p-6 rounded-sm border border-slate-100 dark:border-slate-700">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Script / Lyrics</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap italic">
                            "{result.script}"
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            downloadFile(result.data, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-audio-${Date.now()}.wav`);
                          }}
                          className="btn-primary flex items-center gap-2"
                        >
                          <Download size={16} />
                          Download Audio
                        </button>
                      </div>
                    )}

                    {result.type === 'text' && (
                      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 p-6 md:p-10 rounded-sm shadow-sm border border-slate-100 dark:border-slate-800 relative">
                        <div className="space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-50 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white">
                              <Volume2 size={20} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Creative Narrative</h4>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">AI Voiceover Preview</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isPlaying && (
                              <div className="hidden sm:flex items-center gap-1 mr-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-sm animate-pulse">
                                <div className="w-1 h-3 bg-slate-400 dark:bg-slate-500 rounded-full animate-[bounce_1s_infinite_0ms]" />
                                <div className="w-1 h-4 bg-slate-400 dark:bg-slate-500 rounded-full animate-[bounce_1s_infinite_200ms]" />
                                <div className="w-1 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-[bounce_1s_infinite_400ms]" />
                                <span className="text-[10px] font-bold uppercase ml-1">Playing</span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-sm border border-slate-100 dark:border-slate-700">
                              <button 
                                onClick={() => handleTTS(result.data)}
                                disabled={isTTSLoading}
                                className={cn(
                                  "h-10 px-4 rounded-sm transition-all disabled:opacity-50 flex items-center gap-2 font-bold text-xs",
                                  isPlaying 
                                    ? "bg-slate-800 text-white shadow-sm" 
                                    : "bg-slate-900 text-white shadow-sm hover:bg-slate-800"
                                )}
                                title={isPlaying ? "Pause Narrative" : "Listen to Narrative"}
                              >
                                {isTTSLoading ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : isPlaying ? (
                                  <>
                                    <Pause size={16} />
                                    <span>Pause</span>
                                  </>
                                ) : (
                                  <>
                                    <Play size={16} />
                                    <span>{audioDuration > 0 ? "Resume" : "Listen"}</span>
                                  </>
                                )}
                              </button>

                              {audioUrl && (
                                <button 
                                  onClick={handleDownloadAudio}
                                  className="h-10 px-4 flex items-center gap-2 rounded-sm bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-sm transition-all font-bold text-xs"
                                  title="Download Audio"
                                >
                                  <Download size={16} />
                                  <span>Download Audio</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="markdown-body" style={getBrandStyles()}>
                          {isFetchingResult ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                              <Loader2 className="animate-spin" size={32} />
                              <span className="text-xs font-bold uppercase tracking-widest italic">Fetching Brand Narrative...</span>
                            </div>
                          ) : (
                            <ReactMarkdown>{result.data}</ReactMarkdown>
                          )}
                        </div>

                        {audioDuration > 0 && (
                          <div className="mt-8 p-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => handleTTS(result.data)}
                                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 rounded-sm shadow-sm hover:shadow-md transition-all text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800"
                              >
                                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                              </button>
                              
                              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full relative group cursor-pointer overflow-hidden">
                                <div 
                                  className="absolute inset-y-0 left-0 bg-slate-900 dark:bg-white transition-all"
                                  style={{ width: `${(audioProgress / audioDuration) * 100}%` }}
                                />
                                <input 
                                  type="range"
                                  min={0}
                                  max={audioDuration}
                                  value={audioProgress}
                                  onChange={(e) => {
                                    const time = parseFloat(e.target.value);
                                    if (audioRef.current) {
                                      audioRef.current.currentTime = time;
                                      setAudioProgress(time);
                                    }
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                />
                              </div>
                              
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                                {formatTime(audioProgress)} / {formatTime(audioDuration)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3 px-1">
                              <button 
                                onClick={() => setAudioVolume(audioVolume === 0 ? 1 : 0)}
                                className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                {audioVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                              </button>
                              <input 
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={audioVolume}
                                onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                                className="w-32 h-1 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-slate-900 dark:accent-white"
                              />
                            </div>
                          </div>
                        )}

                        <GroundingSources metadata={result.groundingMetadata} />
                        </div>
                      </div>
                    )}

                    {result.type === 'campaign' && (
                      <div className="w-full max-w-6xl bg-white dark:bg-slate-900 p-6 md:p-10 rounded-sm shadow-sm border border-slate-100 dark:border-slate-800 relative grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-8">
                          <div className="markdown-body" style={getBrandStyles()}>
                            {isFetchingResult ? (
                              <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                                <Loader2 className="animate-spin" size={32} />
                                <span className="text-xs font-bold uppercase tracking-widest italic">Fetching Campaign Copy...</span>
                              </div>
                            ) : (
                              <ReactMarkdown>{result.data.copy}</ReactMarkdown>
                            )}
                          </div>
                          <GroundingSources metadata={result.groundingMetadata} />
                        </div>
                        
                        <div className="space-y-6 flex flex-col h-full">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white">
                                <ImageIcon size={20} />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Campaign Imagery</h4>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Key Visual Moments</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 gap-4">
                            {result.data.images.map((imgUrl: string, idx: number) => (
                              <div key={idx} className="relative group overflow-hidden rounded-sm border border-slate-200 dark:border-slate-700 shadow-sm">
                                <img 
                                  src={imgUrl} 
                                  alt={`Campaign Image ${idx + 1}`} 
                                  className="w-full h-auto object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-2 flex-wrap">
                                  <button 
                                    onClick={() => {
                                      setHumanTouchItem({
                                        title: `Campaign Image ${idx + 1}`,
                                        prompt: `Campaign conceptual visuals: idx ${idx + 1} for ${prompt}`,
                                        imageUrl: imgUrl,
                                        role: `CAMPAIGN IMAGE`,
                                        modelsUsed: 'openai/gpt-image-2'
                                      });
                                      setHumanTouchComment('');
                                      setHumanTouchSuccessMsg(null);
                                    }}
                                    className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-sm font-bold shadow-xl flex items-center gap-1.5 transform translate-y-4 group-hover:translate-y-0 transition-all text-xs border border-white/10"
                                  >
                                    <Fingerprint size={13} />
                                    Human Touch
                                  </button>

                                  <button 
                                    onClick={() => {
                                      downloadFile(imgUrl, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-campaign-img-${idx + 1}-${Date.now()}.png`);
                                    }}
                                    className="bg-white hover:bg-slate-50 text-slate-900 px-3 py-2 rounded-sm font-bold shadow-xl flex items-center gap-1.5 transform translate-y-4 group-hover:translate-y-0 transition-all text-xs"
                                  >
                                    <Download size={13} />
                                    Download
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {result.type === 'storyline' && (
                      <div className="w-full max-w-6xl space-y-12">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="space-y-4 text-center md:text-left">
                            <h2 className="text-4xl font-light tracking-tight text-slate-900 dark:text-slate-100">
                              {result.data.storyTitle}
                            </h2>
                            <div className="w-24 h-1 bg-slate-900 dark:bg-white rounded-full mx-auto md:mx-0" />
                          </div>
                          <button 
                            onClick={handleDownloadStorylineZip}
                            disabled={isDownloadingZip}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-sm font-bold tracking-widest uppercase text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-3 shadow-xl disabled:opacity-50"
                          >
                            {isDownloadingZip ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                PREPARING ZIP...
                              </>
                            ) : (
                              <>
                                <Download size={16} />
                                Download All Scenes (ZIP)
                              </>
                            )}
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                          {result.data.scenes.map((scene: any, index: number) => (
                            <motion.div 
                              key={index}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="space-y-6 group"
                            >
                              <div className={cn(
                                "relative overflow-hidden rounded-sm shadow-lg border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800",
                                aspectRatio === '1:1' ? 'aspect-square' : (aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video')
                              )}>
                                {scene.image ? (
                                  <>
                                    <img 
                                      src={scene.image} 
                                      alt={scene.chapterTitle}
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-2 flex-wrap">
                                      <button 
                                        onClick={() => {
                                          setHumanTouchItem({
                                            title: scene.chapterTitle || `Scene ${index + 1}`,
                                            prompt: scene.prompt || scene.narrative || 'Scene narrative artwork',
                                            imageUrl: scene.image,
                                            role: `SCENE ${index + 1}`,
                                            modelsUsed: 'openai/gpt-image-2'
                                          });
                                          setHumanTouchComment('');
                                          setHumanTouchSuccessMsg(null);
                                        }}
                                        className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-sm font-bold shadow-xl flex items-center gap-1.5 transform translate-y-4 group-hover:translate-y-0 transition-all text-xs border border-white/10"
                                      >
                                        <Fingerprint size={14} />
                                        Human Touch
                                      </button>

                                      <button 
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = scene.image;
                                          link.download = `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-storyline-scene-${index + 1}-${Date.now()}`;
                                          link.click();
                                        }}
                                        className="bg-white text-slate-900 hover:bg-slate-50 px-4 py-2 rounded-sm font-bold shadow-xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all text-xs"
                                      >
                                        <Download size={14} />
                                        Download
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="absolute inset-0">
                                    <Skeleton className="w-full h-full" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                                      <div className="relative">
                                        <Loader2 className="animate-spin text-slate-400 dark:text-slate-500" size={32} />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="w-1 h-1 bg-slate-400 rounded-full animate-ping" />
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                          Generating Scene {index + 1}
                                        </p>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 italic max-w-[150px] mx-auto line-clamp-2">
                                          {scene.narrative}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {/* Scanning line for individual scene */}
                                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                      <div className="w-full h-0.5 bg-slate-900/10 dark:bg-white/10 absolute top-0 left-0 animate-scan" />
                                    </div>
                                  </div>
                                )}
                                <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest">
                                  Scene {index + 1}
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{scene.chapterTitle}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed italic">
                                  "{scene.narrative}"
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.type === 'slideshow' && (
                      <SlideshowDisplay 
                        result={result}
                        setResult={setResult}
                        currentSlide={currentSlide}
                        setCurrentSlide={setCurrentSlide}
                        slideshowTheme={slideshowTheme}
                        setSlideshowTheme={setSlideshowTheme}
                        slideshowFont={slideshowFont}
                        setSlideshowFont={setSlideshowFont}
                        slideshowOverlay={slideshowOverlay}
                        setSlideshowOverlay={setSlideshowOverlay}
                        handleDownloadPDF={handleDownloadPDF}
                        isDownloadingPDF={isDownloadingPDF}
                        brandGuidelines={brandGuidelines}
                        generateImage={generateImage}
                        assets={assets}
                        cn={cn}
                        aspectRatio={aspectRatio}
                        selectedPresentationTheme={selectedPresentationTheme}
                      />
                    )}

                    {result.type === 'error' && (
                      <div className="flex flex-col items-center gap-4 text-center max-w-md">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-sm flex items-center justify-center">
                          <AlertCircle size={32} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100">Generation Failed</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{result.message}</p>
                        </div>
                        <button onClick={handleGenerate} className="btn-primary">Try Again</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12">
                  {isGenerating ? (
                    <GenerationLoader 
                      title={videoStatus ? 'Processing Video Render...' : 'Synthesizing Output...'}
                      subtitle={videoStatus || `Executing request against ${brandGuidelines.name} parameters. This may take a few moments as we optimize for your brand identity.`}
                      icon={videoStatus ? VideoIcon : Sparkles}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-6 opacity-30">
                      <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-sm flex items-center justify-center text-slate-400 dark:text-slate-500">
                        {getIcon(selectedGem.icon)}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-light text-slate-900 dark:text-slate-100 tracking-tight">System Ready</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-light">Awaiting input parameters</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4">
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-widest">Command Input</label>
                  {selectedGem.id === 'brand-copy' && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-sm border border-slate-200 dark:border-slate-700">
                        <Globe size={12} className="text-slate-500" />
                        <select 
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
                        >
                          <option value="English">English</option>
                          <option value="Hindi">Hindi</option>
                          <option value="Marathi">Marathi</option>
                          <option value="Gujarati">Gujarati</option>
                          <option value="Bengali">Bengali</option>
                          <option value="Tamil">Tamil</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-sm border border-slate-200 dark:border-slate-700">
                        <Volume2 size={12} className="text-slate-500" />
                        <select 
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
                        >
                          <option value="Kore">Kore (Female)</option>
                          <option value="Puck">Puck (Male)</option>
                          <option value="Charon">Charon (Male)</option>
                          <option value="Fenrir">Fenrir (Male)</option>
                          <option value="Zephyr">Zephyr (Female)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      try {
                        setIsGeneratingCreativePrompt(true);
                        const prm = await generateFastPrompt(
                          'creative', 
                          brandGuidelines.name, 
                          selectedGem.name, 
                          selectedGem.id, 
                          !!productContext, 
                          !!faceContext,
                          brandGuidelines
                        );
                        setPrompt(prm);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsGeneratingCreativePrompt(false);
                      }
                    }}
                    disabled={isGeneratingCreativePrompt}
                    className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-amber-400 flex items-center gap-1.5 transition-all font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-sm hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 animate-pulse-once"
                    title="Generate short creative prompt with AI Assistant"
                    type="button"
                  >
                    {isGeneratingCreativePrompt ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    Auto-Write
                  </button>
                  <span className="text-[10px] text-slate-400">Powered by Enterprise Creative Intelligence</span>
                </div>
              </div>

              {selectedGem.id === 'corporate-presentations' && (
                <div className="space-y-3 pb-3 pt-1 border-b border-slate-100 dark:border-slate-800/80 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Palette size={12} className="text-rose-500" />
                      Custom Brand Presentation Themes
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                      Generated from Active Brand Guidelines
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {generateCustomThemes(brandGuidelines).map((theme) => {
                      const isSelected = selectedPresentationTheme?.id === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setSelectedPresentationTheme(theme)}
                          className={cn(
                            "flex flex-col text-left p-3.5 rounded-sm border transition-all cursor-pointer relative overflow-hidden group",
                            isSelected
                              ? "border-rose-500 dark:border-rose-400 bg-white dark:bg-slate-900 shadow-md ring-2 ring-rose-500/20"
                              : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                          )}
                        >
                          {/* Colored Accent Line */}
                          <div 
                            className="absolute top-0 left-0 right-0 h-[3px]" 
                            style={{ background: theme.lineStyle }}
                          />
                          
                          <div className="flex items-center justify-between w-full mt-1.5">
                            <span className={cn(
                              "text-xs font-bold",
                              isSelected ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"
                            )}>
                              {theme.name}
                            </span>
                            <div 
                              className="w-3.5 h-3.5 rounded-full border flex items-center justify-center border-slate-300 dark:border-slate-600"
                              style={{ backgroundColor: theme.bg }}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed flex-1">
                            {theme.description}
                          </p>
                          
                          {/* Mini style badge */}
                          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-mono">
                              Font: {theme.font}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                              Overlay: {theme.overlay * 100}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedGem.type === 'video' && (
                <div className="space-y-4 pb-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* First Frame Image Upload Box */}
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon size={12} className="text-blue-500" />
                        First Frame Image (Start Point)
                      </span>
                      {firstFrameContext ? (
                        <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                          <img 
                            src={firstFrameContext.data} 
                            alt="First Frame Context" 
                            className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{firstFrameContext.name}</p>
                            {selectedModel === 'veo-3.1-lite-generate-preview' ? (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
                                Reference Ignored by Active Model
                              </span>
                            ) : (
                              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                                Video Start Reference (Active)
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setFirstFrameContext(null)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                            title="Remove First Frame"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                            <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                            <span>Attach First Frame photo</span>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && file.type.startsWith('image/')) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const resized = await resizeImageIfNeeded(reader.result as string);
                                  setFirstFrameContext({
                                    id: 'first-frame-context-' + Date.now(),
                                    name: file.name,
                                    data: resized
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {/* Last Frame Image Upload Box */}
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon size={12} className="text-violet-500" />
                        Last Frame Image (End Point)
                      </span>
                      {lastFrameContext ? (
                        <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                          <img 
                            src={lastFrameContext.data} 
                            alt="Last Frame Context" 
                            className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{lastFrameContext.name}</p>
                            {selectedModel !== 'veo-3.1-generate-preview' ? (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
                                Reference Ignored by Active Model
                              </span>
                            ) : (
                              <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider">
                                Video End Reference (Active)
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setLastFrameContext(null)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                            title="Remove Last Frame"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-205 transition-colors">
                            <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                            <span>Attach Last Frame photo</span>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && file.type.startsWith('image/')) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const resized = await resizeImageIfNeeded(reader.result as string);
                                  setLastFrameContext({
                                    id: 'last-frame-context-' + Date.now(),
                                    name: file.name,
                                    data: resized
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(selectedGem.type === 'video' || (selectedGem.type === 'image' && selectedModel === 'openai/gpt-image-2')) && (
                <div className="space-y-4 pb-2 pt-1">
                  {/* Ingredients Reference Images Upload Box */}
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-500 animate-pulse" />
                        Ingredients Reference Images ({ingredientsContexts.length}/3)
                      </span>
                      {selectedModel === 'veo-3.1-generate-preview' || (selectedGem.type === 'image' && selectedModel === 'openai/gpt-image-2') ? (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded-xs">
                          Active ({selectedGem.type === 'image' ? 'Commercial Plus' : 'Cinematic High'})
                        </span>
                      ) : (
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded-xs">
                          {selectedGem.type === 'image' 
                            ? 'Switch to "Commercial Plus" to Activate References' 
                            : 'Switch to "Cinematic High" to Activate References'}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {ingredientsContexts.map((ing, idx) => (
                        <div key={ing.id} className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                          <img 
                            src={ing.data} 
                            alt={`Ingredient Context ${idx + 1}`} 
                            className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{ing.name}</p>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider">
                              Ingredient ref {idx + 1}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIngredientsContexts(prev => prev.filter(item => item.id !== ing.id))}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                            title="Remove Ingredient"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      
                      {ingredientsContexts.length < 3 && (
                        <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                            <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                            <span>Add ingredient image</span>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && file.type.startsWith('image/')) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const resized = await resizeImageIfNeeded(reader.result as string);
                                  setIngredientsContexts(prev => [
                                    ...prev,
                                    {
                                      id: 'ing-context-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                                      name: file.name,
                                      data: resized
                                    }
                                  ].slice(0, 3));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedGem.type === 'image' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 pt-1">
                  {/* Product Context Image Box */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={12} className="text-emerald-500" />
                      Product Context Image
                    </span>
                    {productContext ? (
                      <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                        <img 
                          src={productContext.data} 
                          alt="Product Context" 
                          className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{productContext.name}</p>
                          {selectedModel === 'openai/gpt-image-2' ? (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                              Active Product Reference (Plus Model)
                            </span>
                          ) : selectedModel === 'gemini-2.5-flash-image' ? (
                            <span className="text-[9px] text-amber-500 dark:text-amber-400 font-bold uppercase tracking-wider">
                              Product Reference (Inspirational Only)
                            </span>
                          ) : (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                              Active Product Reference
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setProductContext(null)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                          title="Remove Product"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                          <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                          <span>Attach Product Photo</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const resized = await resizeImageIfNeeded(reader.result as string);
                                setProductContext({
                                  id: 'product-context-' + Date.now(),
                                  name: file.name,
                                  data: resized
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Face / Model Context Image Box */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={12} className="text-amber-500" />
                      Face / Model Context Image
                    </span>
                    {faceContext ? (
                      <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                        <img 
                          src={faceContext.data} 
                          alt="Face Context" 
                          className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{faceContext.name}</p>
                          {selectedModel === 'openai/gpt-image-2' ? (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                              Active Face Reference (Plus Model)
                            </span>
                          ) : !selectedModel.includes('gemini-3') ? (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
                              Reference Ignored by Active Model
                            </span>
                          ) : (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                              Active Character Reference (Consistent)
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setFaceContext(null)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                          title="Remove Face/Model"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                          <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                          <span>Attach Face/Model Photo</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const resized = await resizeImageIfNeeded(reader.result as string);
                                setFaceContext({
                                  id: 'face-context-' + Date.now(),
                                  name: file.name,
                                  data: resized
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              <div className="relative group">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Describe the ${selectedGem.type} you want to create for ${brandGuidelines.name}...`}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm p-5 pr-16 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white transition-all resize-none h-32 font-light"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="absolute bottom-4 right-4 w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-sm flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </>)}
          </div>
        </div>

          {/* Footer */}
          <footer className="h-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
            <div>© 2026 {brandGuidelines.name} Studio AI</div>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => {
                  setEditingGuidelines(JSON.parse(JSON.stringify(brandGuidelines)));
                  setShowGuidelines(true);
                }} 
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Brand Guidelines
              </button>
              <button onClick={() => setShowAssetLibrary(true)} className="hover:text-slate-900 dark:hover:text-white transition-colors">Asset Library</button>
              <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Support</a>
            </div>
          </footer>
        </>
      )}
    </main>

      {/* Hidden Slides for PDF Generation */}
      {result?.type === 'slideshow' && (
        <div id="slides-to-pdf" className="fixed top-0 left-0 -z-50 pointer-events-none">
          {result.data.map((slide: any, idx: number) => (
            <div 
              key={idx} 
              className="slide-capture-container relative bg-white overflow-hidden border border-slate-200"
              style={{ width: '1280px', height: '720px' }}
            >
              {/* Slide Background Image */}
              {slide.image && (
                <div className="absolute inset-0 z-0">
                  <img 
                    src={slide.image} 
                    alt="Slide Background" 
                    className="w-full h-full object-cover"
                  />
                  <div 
                    className={cn(
                      "absolute inset-0",
                      slideshowTheme === 'dark' ? 'bg-slate-900' : 
                      slideshowTheme === 'brand' ? 'bg-slate-900 dark:bg-white' : 'bg-white'
                    )} 
                    style={{ opacity: slideshowOverlay }}
                  />
                </div>
              )}

              {/* Slide Content */}
              <div className={cn(
                "absolute inset-0 p-16 flex flex-col justify-center space-y-8 z-10",
                slideshowFont === 'serif' ? 'font-serif' : 'font-sans',
                slideshowTheme === 'light' ? 'text-slate-900' : 'text-white'
              )}>
                <div className="space-y-4">
                  <div className={cn(
                    "h-1 w-24",
                    slideshowTheme === 'brand' ? 'bg-white' : 'bg-slate-900 dark:bg-white'
                  )} />
                  <h1 className="text-6xl font-bold leading-tight">{slide.title}</h1>
                </div>
                <div className="space-y-6">
                  {slide.content.map((point: string, pIdx: number) => (
                    <div key={pIdx} className="flex items-start gap-6">
                      <div className={cn(
                        "mt-3 w-3 h-3 rounded-full shrink-0",
                        slideshowTheme === 'brand' ? 'bg-white' : 'bg-slate-500'
                      )} />
                      <p className={cn(
                        "text-3xl leading-relaxed",
                        slideshowTheme === 'light' ? 'text-slate-700' : 'text-white/90'
                      )}>{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brand Elements */}
              <div className="absolute top-8 right-8 z-20 opacity-80 origin-top-right">
                <BrandLogo customLogo={brandGuidelines.logo} brandName={brandGuidelines.name} noReferrer={false} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-slate-900 via-slate-500 to-slate-400 z-20" />
              
              {/* Background Accents */}
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-slate-900/5 dark:bg-white/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-slate-500/5 rounded-full blur-3xl" />
            </div>
          ))}
        </div>
      )}

      {/* Brand Guidelines Modal */}
      {showGuidelines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-sm shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Brand Guidelines</h2>
              <div className="flex items-center gap-4">
                <label className="btn-secondary text-xs cursor-pointer">
                  UPLOAD CUSTOM LOGO
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
                <button 
                  onClick={() => {
                    setShowGuidelines(false);
                    setEditingGuidelines(null);
                  }} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm transition-colors text-slate-500 dark:text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {/* Brand Profile Section */}
              <section className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Brand Identity Profile</h3>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 font-bold uppercase tracking-wider">
                    Single Managed Identity
                  </span>
                </div>
                
                {/* Active Profile Info */}
                <div className="grid grid-cols-1 gap-3">
                  {brandProfiles.slice(0, 1).map((profile) => (
                    <div 
                      key={profile.id}
                      className="group relative p-4 rounded-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-md text-slate-900 dark:text-slate-100">
                            {profile.name}
                          </h4>
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          {profile.industry || 'No industry description'}
                        </p>
                      </div>
                      
                      {profile.logo && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-sm border border-slate-100 dark:border-slate-800">
                          <img 
                            src={profile.logo} 
                            alt={`${profile.name} logo`} 
                            className="h-10 w-10 object-contain rounded-sm" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {brandProfiles.length === 0 && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 text-center rounded-sm text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800">
                      No active identity profile established yet. Use the tool below to generate one.
                    </div>
                  )}
                </div>

                {/* Alter Profile Sub-Form */}
                <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-sm border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-950 dark:text-slate-100 tracking-wide uppercase">Alter Active Brand Identity</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                      One user is allowed only one primary profile which can be altered to different brands. Generating a new brand identity will replace your current profile parameters, files, and asset guides instantly.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 items-center pt-2">
                    <div className="flex-1 w-full space-y-1">
                      <input 
                        type="text"
                        value={newProfileNameOrURL}
                        onChange={(e) => setNewProfileNameOrURL(e.target.value)}
                        placeholder="Enter brand name, website URL, or write a summary (e.g. Airbnb)..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white font-medium"
                        disabled={isCreatingNewProfile}
                      />
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic pl-1">
                        Our lightning-fast compiler will immediately update and sync your Workspace Guidelines in &lt; 2 seconds.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNewProfile}
                      disabled={isCreatingNewProfile || !newProfileNameOrURL.trim()}
                      className="w-full sm:w-auto px-5 py-2.5 hover:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-900 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-sm font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 self-stretch sm:self-center"
                    >
                      {isCreatingNewProfile ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Rebranding...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={12} />
                          Alter Profile
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Erase Identity Box */}
                <div className="p-5 bg-red-50/20 dark:bg-red-950/5 rounded-sm border border-red-100 dark:border-red-950/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
                  {eraseConfirmState === 'idle' ? (
                    <>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-red-600 dark:text-red-400 tracking-wide uppercase flex items-center gap-1.5 font-sans">
                          <Trash2 size={13} /> Danger Zone: Erase Brand Identity
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                          Permanently erase this brand profile, local assets, and logs to launch a fresh brand initialization run.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEraseConfirmState('confirming')}
                        className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-200 dark:border-red-950 text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        Erase Brand Identity
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 tracking-wide uppercase flex items-center gap-1.5 font-sans">
                          ⚠️ Confirm Brand Wiping
                        </h4>
                        <p className="text-xs text-rose-600 dark:text-rose-300 leading-relaxed font-medium">
                          Are you absolutely sure? This will delete all guidelines, media assets, and historical logs permanently from your workspace.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setEraseConfirmState('idle')}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSyncing}
                          onClick={handleEraseBrandIdentity}
                          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          {isSyncing ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Wiping...
                            </>
                          ) : (
                            "Yes, Erase Everything"
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Brand Identity Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-sm border border-slate-200 dark:border-slate-800">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Brand Name</label>
                    <input 
                      type="text" 
                      value={editingGuidelines?.name ?? brandGuidelines.name}
                      onChange={(e) => setEditingGuidelines(prev => ({ ...(prev ?? brandGuidelines), name: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Industry</label>
                    <input 
                      type="text" 
                      value={editingGuidelines?.industry ?? brandGuidelines.industry}
                      onChange={(e) => setEditingGuidelines(prev => ({ ...(prev ?? brandGuidelines), industry: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tone of Voice</label>
                    <input 
                      type="text" 
                      value={editingGuidelines?.tone ?? brandGuidelines.tone}
                      onChange={(e) => setEditingGuidelines(prev => ({ ...(prev ?? brandGuidelines), tone: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Target Location / Country Base</label>
                    <input 
                      type="text" 
                      value={editingGuidelines?.location ?? brandGuidelines.location ?? ''}
                      onChange={(e) => setEditingGuidelines(prev => ({ ...(prev ?? brandGuidelines), location: e.target.value }))}
                      placeholder="e.g. India"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Voiceover Accent Style</label>
                    <input 
                      type="text" 
                      value={editingGuidelines?.voiceAccentStyle ?? brandGuidelines.voiceAccentStyle ?? ''}
                      onChange={(e) => setEditingGuidelines(prev => ({ ...(prev ?? brandGuidelines), voiceAccentStyle: e.target.value }))}
                      placeholder="e.g. Indian English, Hinglish, US English"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Model Ethnicity / Face Style</label>
                    <input 
                      type="text" 
                      value={editingGuidelines?.visualEthnicityStyle ?? brandGuidelines.visualEthnicityStyle ?? ''}
                      onChange={(e) => setEditingGuidelines(prev => ({ ...(prev ?? brandGuidelines), visualEthnicityStyle: e.target.value }))}
                      placeholder="e.g. Indian, Caucasian, East Asian"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Core Pillars</h3>
                  <button 
                    onClick={() => {
                      setEditingGuidelines(prev => {
                        const current = prev ?? brandGuidelines;
                        return { ...current, pillars: [...current.pillars, "New Pillar"] };
                      });
                    }}
                    className="text-[10px] font-bold text-slate-900 dark:text-white hover:underline"
                  >
                    + ADD PILLAR
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(editingGuidelines?.pillars ?? brandGuidelines.pillars).map((pillar, idx) => (
                    <div key={idx} className="group relative p-6 bg-slate-50 dark:bg-slate-800/50 rounded-sm border border-slate-200 dark:border-slate-800 text-center">
                      <input 
                        type="text"
                        value={pillar}
                        onChange={(e) => {
                          const current = editingGuidelines ?? brandGuidelines;
                          const newPillars = [...current.pillars];
                          newPillars[idx] = e.target.value;
                          setEditingGuidelines({ ...current, pillars: newPillars });
                        }}
                        className="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-slate-900 dark:focus:border-white focus:outline-none text-xl font-light text-slate-800 dark:text-slate-200 transition-colors"
                      />
                      <button 
                        onClick={() => {
                          const current = editingGuidelines ?? brandGuidelines;
                          setEditingGuidelines({ ...current, pillars: current.pillars.filter((_, i) => i !== idx) });
                        }}
                        className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Color Palette</h3>
                  <button 
                    onClick={() => {
                      setEditingGuidelines(prev => {
                        const current = prev ?? brandGuidelines;
                        return { ...current, colors: [...current.colors, "#000000"] };
                      });
                    }}
                    className="text-[10px] font-bold text-slate-900 dark:text-white hover:underline"
                  >
                    + ADD COLOR
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(editingGuidelines?.colors ?? brandGuidelines.colors).map((hex, idx) => (
                    <div key={idx} className="group relative space-y-2">
                      <div className="h-20 rounded-sm shadow-inner relative overflow-hidden" style={{ backgroundColor: hex }}>
                        <input 
                          type="color" 
                          value={hex}
                          onChange={(e) => {
                            const current = editingGuidelines ?? brandGuidelines;
                            const newColors = [...current.colors];
                            newColors[idx] = e.target.value;
                            setEditingGuidelines({ ...current, colors: newColors });
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="text-xs space-y-1">
                        <input 
                          type="text"
                          value={hex}
                          onChange={(e) => {
                            const current = editingGuidelines ?? brandGuidelines;
                            const newColors = [...current.colors];
                            newColors[idx] = e.target.value;
                            setEditingGuidelines({ ...current, colors: newColors });
                          }}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-slate-900 dark:focus:border-white focus:outline-none font-mono text-slate-800 dark:text-slate-200 transition-colors uppercase"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const current = editingGuidelines ?? brandGuidelines;
                          setEditingGuidelines({ ...current, colors: current.colors.filter((_, i) => i !== idx) });
                        }}
                        className="absolute -top-1 -right-1 p-1 bg-white dark:bg-slate-800 rounded-sm shadow-sm text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Typography</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-sm border border-slate-200 dark:border-slate-800">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Primary Font (Headings)</label>
                    <input 
                      type="text" 
                      value={editingGuidelines?.typography?.primary ?? brandGuidelines.typography.primary}
                      onChange={(e) => {
                        const current = editingGuidelines ?? brandGuidelines;
                        setEditingGuidelines({ 
                          ...current, 
                          typography: { ...current.typography, primary: e.target.value } 
                        });
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white"
                    />
                    <p className="text-2xl font-light text-slate-900 dark:text-slate-100 mt-4" style={{ fontFamily: editingGuidelines?.typography?.primary ?? brandGuidelines.typography.primary }}>Sample Heading</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Secondary Font (Body)</label>
                    <input 
                      type="text" 
                      value={editingGuidelines?.typography?.secondary ?? brandGuidelines.typography.secondary}
                      onChange={(e) => {
                        const current = editingGuidelines ?? brandGuidelines;
                        setEditingGuidelines({ 
                          ...current, 
                          typography: { ...current.typography, secondary: e.target.value } 
                        });
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-sm p-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white"
                    />
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-4" style={{ fontFamily: editingGuidelines?.typography?.secondary ?? brandGuidelines.typography.secondary }}>Sample body text for the {editingGuidelines?.name ?? brandGuidelines.name} brand guidelines.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans">Logo Overlay</h3>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                  {editingGuidelines?.logo || brandGuidelines.logo ? (
                    <>
                      <div className="flex items-center gap-6">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-sm shadow-sm border border-slate-200 dark:border-slate-800 shrink-0">
                          <BrandLogo customLogo={editingGuidelines?.logo ?? brandGuidelines.logo} brandName={editingGuidelines?.name ?? brandGuidelines.name} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <p className="font-bold text-slate-800 dark:text-slate-200 font-sans">Custom Logo Active</p>
                          <p>This logo will be used as an overlay for all generated creatives.</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEditingGuidelines(prev => ({
                                    ...(prev || brandGuidelines),
                                    logo: reader.result as string
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            };
                            input.click();
                          }}
                          className="px-3 py-1.5 rounded-sm border border-slate-200 dark:border-slate-700 font-bold text-[10px] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors uppercase tracking-wider cursor-pointer"
                        >
                          Change Logo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGuidelines(prev => ({
                              ...(prev || brandGuidelines),
                              logo: ''
                            }));
                          }}
                          className="px-3 py-1.5 rounded-sm border border-transparent font-bold text-[10px] hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors uppercase tracking-wider cursor-pointer"
                        >
                          Remove Logo
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-sm border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 font-mono text-xs font-bold shrink-0">
                          N/A
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <p className="font-bold text-slate-800 dark:text-slate-200 font-sans">No Logo Active</p>
                          <p>Creatives will be generated without a logo overlay. Add or generate one below.</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEditingGuidelines(prev => ({
                                    ...(prev || brandGuidelines),
                                    logo: reader.result as string
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            };
                            input.click();
                          }}
                          className="px-3 py-1.5 rounded-sm border border-slate-200 dark:border-slate-700 font-bold text-[10px] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors uppercase tracking-wider cursor-pointer"
                        >
                          Upload Logo
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setIsGeneratingLogo(true);
                              const logoUrl = await generateBrandLogoAI(
                                editingGuidelines?.name ?? brandGuidelines.name,
                                editingGuidelines?.industry ?? brandGuidelines.industry,
                                editingGuidelines?.colors ?? brandGuidelines.colors,
                                editingGuidelines?.tone ?? brandGuidelines.tone
                              );
                              setEditingGuidelines(prev => ({
                                ...(prev || brandGuidelines),
                                logo: logoUrl
                              }));
                            } catch (e: any) {
                              console.error(e);
                              alert("Failed to generate logo: " + (e.message || e));
                            } finally {
                              setIsGeneratingLogo(false);
                            }
                          }}
                          disabled={isGeneratingLogo}
                          className="px-3 py-1.5 rounded-sm bg-rose-600 text-white dark:bg-rose-500 hover:bg-rose-700 dark:hover:bg-rose-400 font-bold text-[10px] shadow-sm hover:shadow transition-all uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isGeneratingLogo ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                          Generate Logo with AI
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
            
            {/* Modal Footer with Actions */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-4 justify-end bg-slate-50 dark:bg-slate-800/30">
              <button 
                onClick={() => {
                  setShowGuidelines(false);
                  setEditingGuidelines(null);
                }}
                className="px-6 py-2.5 rounded-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors uppercase tracking-wider"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (editingGuidelines) {
                    setBrandGuidelines(editingGuidelines);
                  }
                  setShowGuidelines(false);
                  setEditingGuidelines(null);
                }}
                className="px-6 py-2.5 rounded-sm bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 text-white font-bold text-xs shadow-sm transition-all uppercase tracking-wider flex items-center gap-2"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Library Modal */}
      {showAssetLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-sm shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <AssetLibrary 
              assets={assets} 
              setAssets={setAssets} 
              onClose={() => setShowAssetLibrary(false)} 
              brandGuidelines={brandGuidelines}
              isSyncing={isSyncing}
              setIsSyncing={setIsSyncing}
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-sm shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-sm text-slate-900 dark:text-white">
                  <Settings size={20} />
                </div>
                <h2 className="text-xl font-light text-slate-900 dark:text-slate-100 tracking-tight">Settings</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm transition-colors text-slate-500 dark:text-slate-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Key size={14} />
                  System AI Infrastructure
                </label>
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-sm space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <Check size={14} />
                    <span>Server-Side Engines Connected</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    AI generation models (Gemini 2.5 Flash, Gemini 3.1 Pro, Fal.ai FLUX & Video engines) are powered directly via server environment configuration.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-3 rounded-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-sm hover:opacity-90 transition-all cursor-pointer"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Refine with AI Modal */}
      {isRefineModalOpen && result && result.type === 'image' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-sm shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row max-h-[90vh]"
          >
            {/* Image Preview Panel */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 relative min-h-[250px] md:min-h-0">
              <img 
                src={result.data} 
                alt="Original to Edit" 
                className="max-w-full max-h-[350px] object-contain rounded-sm shadow-md border dark:border-slate-800"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 bg-slate-900/80 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-sm shadow">
                Source Image to Refine
              </div>
            </div>

            {/* Edit Controls Panel */}
            <div className="w-full md:w-96 flex flex-col p-6 overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-sm">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Refining Canvas</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Edit elements using native reference models</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsRefineModalOpen(false)}
                  disabled={isRefining}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 py-5 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">
                    Edit/Refinement Instructions
                  </label>
                  <textarea
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder="e.g., 'Change the background to a starry night sky' or 'add some lush tropical plants on the left side'..."
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-sm p-3 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-shadow resize-none"
                    disabled={isRefining}
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">
                    Refinement Ideas
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Modify lighting to twilight glow",
                      "Change background to modern cozy library",
                      "Incorporate glowing sparks & particle trails",
                      "Sleek professional studio photography style",
                      "Transition style to neon cyber cyberpunk"
                    ].map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        disabled={isRefining}
                        onClick={() => setRefinePrompt(idea)}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-full text-[10px] text-slate-600 dark:text-slate-300 transition-all text-left cursor-pointer truncate max-w-full disabled:opacity-50"
                      >
                        + {idea}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsRefineModalOpen(false)}
                  disabled={isRefining}
                  className="flex-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 text-xs font-bold py-2.5 rounded-sm transition-colors cursor-pointer disabled:opacity-55"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRefine}
                  disabled={isRefining || !refinePrompt.trim()}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                >
                  {isRefining ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Refining...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={13} />
                      Apply Refinement
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal / Dialog for Writopedia Human Touch last-mile professional review */}
      {humanTouchItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-xl w-full border border-slate-200 dark:border-slate-800 rounded-sm shadow-2xl relative overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-sm">
                  <Fingerprint size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Request Last-Mile Human Touch</h3>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">Assigned to Professional Writopedia Agent</span>
                </div>
              </div>
              <button 
                onClick={() => setHumanTouchItem(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
              {humanTouchSuccessMsg ? (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-sm text-center space-y-3 animate-in zoom-in-95">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <Check size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Request Dispatched!</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed font-light">
                    {humanTouchSuccessMsg}
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-sm border dark:border-slate-800 flex gap-4">
                    {humanTouchItem.imageUrl && (
                      <div className="w-20 h-20 shrink-0 rounded-xs overflow-hidden border dark:border-slate-800">
                        <img src={humanTouchItem.imageUrl} alt="Thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <span className="text-[8px] font-bold text-rose-500 uppercase tracking-wider">{humanTouchItem.role} DELIVERABLE</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{humanTouchItem.title}</h4>
                      <div className="text-[9px] flex flex-wrap gap-2 text-slate-400 pt-1">
                        <span>Engine: <span className="font-mono text-slate-500">{humanTouchItem.modelsUsed}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-sm border border-slate-100 dark:border-slate-850">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans focus:outline-none">Original Visual Prompt</label>
                    <p className="text-xs text-slate-650 dark:text-slate-350 font-mono line-clamp-3 leading-relaxed bg-white dark:bg-slate-950 px-2 py-1.5 border dark:border-slate-850 rounded-xs select-all">
                      {humanTouchItem.prompt}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reviewer Notes & Instructions</label>
                      <span className="text-[9px] text-slate-400 font-mono">* required</span>
                    </div>
                    <textarea
                      placeholder="Write descriptive directions or changes you want (e.g., 'Please correct the lighting on the product edges, make the brand logo color match our primary gold tone perfectly, and refine the model expression')...."
                      value={humanTouchComment}
                      onChange={(e) => setHumanTouchComment(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800/80 p-3 rounded-sm text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-slate-400 dark:placeholder-slate-600"
                    />
                  </div>

                  <div className="p-3 bg-amber-500/10 rounded-sm border border-amber-500/20 flex gap-2 w-full">
                    <div className="text-amber-500 shrink-0"><Zap size={14} className="mt-0.5" /></div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-normal font-light">
                      This request transmits the prompt, brand guidelines contexts, layout styles, live draft imagery, and your reviewer comments immediately to <span className="font-mono font-bold">business@writopedia.com</span>. Let Writopedia perfect your artwork!
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-slate-50/50 dark:bg-slate-950/20">
              <button
                type="button"
                onClick={() => setHumanTouchItem(null)}
                disabled={isHumanTouchSubmitting}
                className="flex-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-xs font-bold py-2.5 rounded-sm transition-colors cursor-pointer disabled:opacity-55"
              >
                {humanTouchSuccessMsg ? 'CLOSE' : 'CANCEL'}
              </button>
              {!humanTouchSuccessMsg && (
                <button
                  type="button"
                  onClick={handleSubmitHumanTouch}
                  disabled={isHumanTouchSubmitting || !humanTouchComment.trim()}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs py-2.5 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                >
                  {isHumanTouchSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Fingerprint size={13} />}
                  ASSIGN PROFESSIONAL AGENT
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Soft Warning Modal for Unsupported Uploaded Images */}
      {showSoftWarningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-sm shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-sm shrink-0">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Active Reference Alert</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Image Capability Warning</p>
              </div>
            </div>

            <div className="text-xs text-slate-750 dark:text-slate-305 leading-relaxed font-light whitespace-pre-line py-2">
              {warningMessage}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowSoftWarningModal(false);
                  setPendingGenerateFn(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-sm transition-colors cursor-pointer"
              >
                No, Go Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSoftWarningModal(false);
                  if (pendingGenerateFn) {
                    pendingGenerateFn();
                  }
                  setPendingGenerateFn(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-sm shadow-sm transition-colors cursor-pointer"
              >
                Yes, Continue
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Real-time Admin Notification Toasters (Exclusively for Admins) */}
      {user && (user.email === 'hardeep.pathak@gmail.com' || user.email === 'avdhesh.babaria@gmail.com') && (
        <div id="admin-toaster-root" className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          <AnimatePresence>
            {adminNotifications
              .filter((n) => !n.read)
              .map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-950 p-4 rounded-sm border border-slate-800 dark:border-slate-100 shadow-xl pointer-events-auto flex items-start gap-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
                  <div className="p-1 px-1.5 bg-amber-500/10 text-amber-500 rounded-sm shrink-0">
                    <ShieldAlert size={16} />
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-[9px] uppercase font-mono font-bold tracking-widest text-amber-500">NEW HUMAN TOUCH REQUEST</p>
                    <p className="text-xs font-bold truncate mt-1 leading-snug">
                      {notif.userEmail}
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                      Type: {notif.assetType} | {new Date(notif.timestamp).toLocaleTimeString()}
                    </p>
                    <button
                      onClick={() => {
                        // Mark as read and jump to admin panel
                        setAdminNotifications((prev) =>
                          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                        );
                        setSelectedAdminRequestId(notif.id);
                        setView('admin');
                      }}
                      className="text-[10px] font-bold tracking-widest text-white dark:text-slate-950 underline mt-2 uppercase hover:text-amber-400 dark:hover:text-amber-655 cursor-pointer block"
                    >
                      Inspect Request Now
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setAdminNotifications((prev) =>
                        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                      );
                    }}
                    className="absolute top-2 right-2 text-slate-400 hover:text-white dark:hover:text-slate-900 font-bold p-1 cursor-pointer"
                    title="Dismiss notification"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      )}

      {/* Real-time Client/User Curation Notification Toasters */}
      {user && !(user.email === 'hardeep.pathak@gmail.com' || user.email === 'avdhesh.babaria@gmail.com') && (
        <div id="user-toaster-root" className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none font-mono">
          <AnimatePresence>
            {userNotifications
              .filter((n) => !n.read)
              .map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-950 p-4 rounded-sm border border-slate-800 dark:border-slate-100 shadow-xl pointer-events-auto flex items-start gap-4 relative overflow-hidden"
                >
                  <div className={cn(
                    "absolute top-0 left-0 bottom-0 w-1",
                    notif.status === 'completed' ? 'bg-emerald-500' : notif.status === 'under-review' ? 'bg-amber-500' : 'bg-rose-500'
                  )} />
                  <div className={cn(
                    "p-1 px-1.5 rounded-sm shrink-0 font-bold",
                    notif.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : notif.status === 'under-review' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                  )}>
                    {notif.status === 'completed' ? <Check size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-[9px] uppercase font-mono font-bold tracking-widest text-slate-400">
                      Curation Update: {notif.status.toUpperCase()}
                    </p>
                    <p className="text-xs font-bold truncate mt-1 leading-snug">
                      Assignment {notif.id.toUpperCase()}
                    </p>
                    <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1 font-sans font-light leading-relaxed">
                      {notif.status === 'completed' 
                        ? '✨ Custom elite branding adjustments have been released for this asset!' 
                        : 'Review progress update has been logged by the expert panel.'}
                    </p>
                    <button
                      onClick={() => {
                        setUserNotifications((prev) =>
                          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                        );
                        setSelectedCurationRequestId(notif.id);
                        setView('curation');
                      }}
                      className="text-[10px] font-bold tracking-widest text-white dark:text-slate-950 underline mt-2.5 uppercase hover:text-emerald-400 dark:hover:text-emerald-600 cursor-pointer block font-mono"
                    >
                      View Curated Asset
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setUserNotifications((prev) =>
                        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                      );
                    }}
                    className="absolute top-2 right-2 text-slate-400 hover:text-white dark:hover:text-slate-900 font-bold p-1 cursor-pointer"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
