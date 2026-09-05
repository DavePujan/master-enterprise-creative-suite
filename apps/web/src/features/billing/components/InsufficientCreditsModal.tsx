import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Sparkles, ArrowRight, X, ShieldAlert, Zap } from 'lucide-react';
import { useCreditGate } from '../context/CreditGateContext.js';
import { findRecommendedCreditPack } from '@shared-types/billing.js';

export const InsufficientCreditsModal: React.FC = () => {
  const { isOpen, payload, closeCreditGate, navigateToTopUp, navigateToUpgrade } = useCreditGate();

  // Handle Escape key to dismiss gracefully
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCreditGate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCreditGate]);

  if (!isOpen || !payload || payload.missingCredits <= 0) return null;

  const {
    service = 'Generation Action',
    requiredCredits = 0,
    availableCredits = 0,
    missingCredits = Math.max(0, requiredCredits - availableCredits),
    model
  } = payload;

  const recommendedPack = findRecommendedCreditPack(missingCredits);

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-120 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insufficient-credits-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden max-w-md w-full flex flex-col"
        >
          {/* Header Banner */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Coins size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  {service}
                </span>
                <h3 id="insufficient-credits-title" className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Not enough credits
                </h3>
              </div>
            </div>

            <button
              onClick={closeCreditGate}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This generation requires <strong className="text-slate-900 dark:text-white font-semibold">{requiredCredits} credits</strong>
              {model ? ` for the selected model (${model})` : ''}.
            </p>

            {/* Gap Metrics Cards */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-150 dark:border-slate-800/80">
                <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">
                  Required
                </div>
                <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {requiredCredits}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-150 dark:border-slate-800/80">
                <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">
                  Balance
                </div>
                <div className="text-base font-extrabold text-slate-700 dark:text-slate-300 font-mono">
                  {availableCredits}
                </div>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200/60 dark:border-rose-900/40 ring-1 ring-rose-500/20">
                <div className="text-[9px] uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold mb-1">
                  Short by
                </div>
                <div className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  {missingCredits}
                </div>
              </div>
            </div>

            {/* Recommended Pack Card */}
            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900 dark:text-slate-100">
                  <Sparkles size={13} className="text-rose-500" />
                  Recommended Booster
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  {recommendedPack.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Covers your remaining {missingCredits} credits with {recommendedPack.credits - missingCredits} buffer credits for subsequent iterations.
              </p>
            </div>

            {/* Action Buttons Hierarchy */}
            <div className="space-y-2 pt-1">
              {/* Primary Action: Get Credits */}
              <button
                type="button"
                onClick={navigateToTopUp}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Get Credits</span>
                <ArrowRight size={14} />
              </button>

              {/* Secondary Action: View Subscription Plans */}
              <button
                type="button"
                onClick={navigateToUpgrade}
                className="w-full py-2 px-3 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap size={12} className="text-amber-500" />
                Need credits regularly? View Plans →
              </button>

              {/* Tertiary Action: Keep Editing / Cancel */}
              <button
                type="button"
                onClick={closeCreditGate}
                className="w-full py-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
