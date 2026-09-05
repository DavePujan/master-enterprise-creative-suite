import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Coins, ShieldAlert } from 'lucide-react';

export interface PaymentStatusState {
  status: 'idle' | 'loading' | 'success' | 'failed';
  message?: string;
  paymentId?: string;
  orderId?: string;
  planName?: string;
  creditsAdded?: number;
  amountPaid?: number;
}

export interface PaymentStatusModalProps {
  status: PaymentStatusState;
  currency: 'INR' | 'USD';
  currentBalance: number;
  onDismiss: () => void;
  onAction?: () => void;
  actionLabel?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const PaymentStatusModal: React.FC<PaymentStatusModalProps> = ({
  status,
  currency,
  currentBalance,
  onDismiss,
  onAction,
  actionLabel = 'Access Workspace',
  onRetry,
  retryLabel = 'Retry with Another Method',
}) => {
  // Allow Esc key to close failed modals gracefully
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status.status === 'failed') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status.status, onDismiss]);

  if (status.status === 'idle') return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden"
        >
          {/* Loading State */}
          {status.status === 'loading' && (
            <div className="py-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-200 dark:border-indigo-950 border-t-indigo-500 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Processing Checkout Securely
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                {status.message || 'Connecting to Razorpay Secure Gateway...'}
              </p>
            </div>
          )}

          {/* Failed State */}
          {status.status === 'failed' && (
            <div className="space-y-4 py-1">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <ShieldAlert size={26} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Payment Could Not Be Completed
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {status.message || 'Payment was declined or cancelled at the gateway.'}
                </p>
              </div>

              {/* Zero-Deduction Reassurance Callout */}
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-left space-y-1">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <span className="text-sm">🛡️</span> No funds were deducted from your account
                </p>
                <p className="text-[11px] text-amber-600/90 dark:text-amber-400/80 leading-normal">
                  If your banking app shows a pending pre-authorization, your bank will automatically release it within 24–48 hours.
                </p>
              </div>

              {/* Actionable Fallback Suggestions */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-left space-y-1.5 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px] uppercase tracking-wider">
                  Recommended Alternatives:
                </span>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span><strong>UPI:</strong> Instant via Google Pay, PhonePe, or Paytm</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span><strong>Domestic Card:</strong> RuPay, Visa, or Mastercard issued in India</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span><strong>Netbanking:</strong> Directly authorize via your bank portal</span>
                  </li>
                </ul>
              </div>

              {/* Dual Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer shadow-sm text-center"
                  >
                    {retryLabel}
                  </button>
                )}
                <button
                  onClick={onDismiss}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs uppercase font-bold tracking-wider transition-all cursor-pointer text-center"
                >
                  Choose Different Plan
                </button>
              </div>
            </div>
          )}

          {/* Success / Receipt State */}
          {status.status === 'success' && (
            <div className="space-y-6">
              <div className="text-center space-y-2 py-1">
                <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 rounded-full mb-1">
                  <Sparkles className="animate-pulse" size={32} />
                </div>
                <h3 className="text-2xl font-light text-slate-900 dark:text-white tracking-tight">
                  Payment Successfully Received!
                </h3>
                {status.paymentId && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                    ID: {status.paymentId}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-2">
                  Purchase Receipt & Credits Applied
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Purchased Item</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {status.planName || 'Plan'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Cost Authorized</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {currency === 'INR' ? '₹' : '$'}{status.amountPaid?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Credits Added</span>
                    <p className="font-mono text-rose-500 font-bold text-sm mt-0.5">
                      +{status.creditsAdded?.toLocaleString()} Credits
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Workspace Status</span>
                    <p className="font-bold text-emerald-500 mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active & Synchronized
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center bg-rose-500/10 dark:bg-rose-950/30 p-3.5 rounded-xl border border-rose-500/20 text-xs">
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  Your current total balance has been updated live!
                </span>
                <strong className="font-mono text-rose-600 dark:text-rose-400 text-sm flex items-center gap-1">
                  <Coins size={15} className="text-rose-500" />
                  <span>{currentBalance} Credits</span>
                </strong>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    if (onAction) onAction();
                    else onDismiss();
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-extrabold uppercase tracking-widest rounded-lg transition-all cursor-pointer shadow-sm text-center"
                >
                  {actionLabel}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
