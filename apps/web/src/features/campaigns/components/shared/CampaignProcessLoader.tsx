import React, { useEffect, useState } from 'react';
import { Sparkles, Layers, ShieldCheck, Compass, Loader2 } from 'lucide-react';

export interface CampaignProcessLoaderProps {
  stage: 'discovery' | 'territories' | 'synthesis';
  campaignTitle?: string;
  onCancel?: () => void;
}

interface StageConfig {
  stageNumber: number;
  stageBadge: string;
  taskHeading: string;
  subCategory: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  messages: string[];
}

const STAGES: Record<'discovery' | 'territories' | 'synthesis', StageConfig> = {
  discovery: {
    stageNumber: 2,
    stageBadge: 'Stage 02 of 05 • Semantic Grounding',
    taskHeading: 'Evaluating Strategic Discovery',
    subCategory: 'Building Your Campaign Strategy',
    icon: Compass,
    messages: [
      'Scanning attached competitor and brand references...',
      'Grounding knowledge across selected intelligence sources...',
      'Calibrating category readiness and strategic whitespace...',
      'Formulating adaptive, high-impact inquiry vectors...',
      'Assembling personalized discovery questionnaire...'
    ]
  },
  territories: {
    stageNumber: 3,
    stageBadge: 'Stage 03 of 05 • Route Formulation',
    taskHeading: 'Formulating Strategic Routes',
    subCategory: 'Building Your Campaign Strategy',
    icon: Layers,
    messages: [
      'Analyzing answered category tensions and audience insights...',
      'Exploring divergent creative worlds and distinctiveness angles...',
      'Scoring routes across Brand Fit, Impact, and Feasibility...',
      'Calibrating strategic trade-offs and market differentiation...',
      'Finalizing 3 authoritative strategic route options...'
    ]
  },
  synthesis: {
    stageNumber: 4,
    stageBadge: 'Stage 04 of 05 • Master Campaign Synthesis',
    taskHeading: 'Synthesizing Master Campaign Strategy',
    subCategory: 'Building Your Campaign Strategy',
    icon: ShieldCheck,
    messages: [
      'Locking authoritative strategic territory and premise...',
      'Synthesizing Master Big Idea, Creative Tension, and Persona...',
      'Generating Omnichannel Multimodal Matrix & deliverable prompts...',
      'Compiling broadcast-grade canonical AdSpec v1 specification...',
      'Persisting versioned strategy ledger and initializing assets...'
    ]
  }
};

const WORKFLOW_STEPS = [
  { step: 1, label: '01 Brief' },
  { step: 2, label: '02 Discovery' },
  { step: 3, label: '03 Routes' },
  { step: 4, label: '04 Strategy' },
  { step: 5, label: '05 Hub' }
];

/**
 * Plays an elegant two-tone audio completion chime using the Web Audio API.
 * E5 (659.25Hz) -> A5 (880.00Hz)
 */
export function playCompletionChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (freq: number, startDelay: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime + startDelay);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + startDelay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startDelay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startDelay);
      osc.stop(ctx.currentTime + startDelay + duration);
    };

    playTone(659.25, 0, 0.16);
    playTone(880.0, 0.14, 0.35);
  } catch {
    // Graceful fallback if audio is restricted by autoplay policies
  }
}

export const CampaignProcessLoader: React.FC<CampaignProcessLoaderProps> = ({
  stage,
  campaignTitle,
  onCancel
}) => {
  const config = STAGES[stage] || STAGES.synthesis;
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const IconComponent = config.icon;

  // Cycle live micro-activities every 2.8 seconds
  useEffect(() => {
    setMessageIndex(0);
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % config.messages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [stage, config.messages.length]);

  // Track elapsed processing runtime
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm transition-all p-4">
      {/* Soft ambient atmospheric glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 dark:bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Preloader Card */}
      <div className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-7 sm:p-8 overflow-hidden text-center backdrop-blur-md">
        {/* Animated accent gradient scanline */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-600 animate-pulse" />

        {/* 1. Category / Workflow Badge */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/70 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={13} className="animate-spin text-rose-500" />
            <span>{config.stageBadge}</span>
          </div>
        </div>

        {/* 2. Central Animated Graphic */}
        <div className="relative w-24 h-24 mx-auto my-4 flex items-center justify-center">
          {/* Subtle outer rotating beacon */}
          <div className="absolute inset-0 rounded-full border-2 border-slate-200/80 dark:border-slate-800 border-t-rose-500 dark:border-t-rose-400 animate-[spin_2.5s_linear_infinite]" />
          
          {/* Glowing central core with stage icon */}
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/30 text-white animate-pulse">
            <IconComponent size={24} />
          </div>
        </div>

        {/* 3. Overall Task & Stage Title */}
        <div className="space-y-1 mb-4">
          <p className="text-[11px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest">
            {config.subCategory}
          </p>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {config.taskHeading}
          </h3>
          {campaignTitle && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium truncate max-w-sm mx-auto pt-0.5">
              {campaignTitle}
            </p>
          )}
        </div>

        {/* 4. Live Micro-Activity Callout */}
        <div className="my-4 min-h-[50px] flex items-center justify-center px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80">
          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all duration-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span>{config.messages[messageIndex]}</span>
          </p>
        </div>

        {/* 5. Synchronized 5-Stage Stepper Track */}
        <div className="my-4 pt-1">
          <div className="flex items-center justify-between gap-1.5 px-2">
            {WORKFLOW_STEPS.map((s) => {
              const isCompleted = s.step < config.stageNumber;
              const isActive = s.step === config.stageNumber;
              const isPending = s.step > config.stageNumber;

              return (
                <div key={s.step} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`h-2 w-full rounded-full transition-all duration-500 ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : isActive
                        ? 'bg-rose-500 dark:bg-rose-400 ring-2 ring-rose-500/30'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold tracking-tight uppercase whitespace-nowrap ${
                      isActive
                        ? 'text-rose-600 dark:text-rose-400 font-bold'
                        : isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {isCompleted ? '✓ ' + s.label.split(' ')[1] : s.label.split(' ')[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Long-running reassurance message (appears when > 15 seconds) */}
        {elapsedSeconds > 15 && (
          <p className="text-xs text-amber-600 dark:text-amber-400/90 font-medium pb-2 animate-fade-in">
            {elapsedSeconds > 30
              ? 'Deep reasoning in progress. AI is validating strategic distinctiveness across brand guardrails...'
              : 'Synthesizing multi-vector insights. This authoritative strategic analysis takes 15–35 seconds...'}
          </p>
        )}

        {/* 6. Footer Status & Elapsed Timer */}
        <div className="pt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <span className="flex items-center gap-1.5 font-medium">
            <Loader2 size={13} className="text-rose-500 animate-spin shrink-0" />
            <span>AI Strategic Engine Running</span>
          </span>
          <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">
            {elapsedSeconds}s elapsed
          </span>
        </div>

        {/* Optional Safe Cancel recovery (shown if > 8s and onCancel is provided) */}
        {onCancel && elapsedSeconds >= 8 && (
          <div className="pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 font-medium underline underline-offset-2 transition-colors cursor-pointer"
            >
              Cancel and return to workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
