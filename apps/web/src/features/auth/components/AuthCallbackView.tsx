import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, RotateCcw, KeyRound, Eye, EyeOff, Mail } from 'lucide-react';
import { exchangeAuthCode } from '../../../infrastructure/supabase/auth.js';

export interface AuthCallbackViewProps {
  checkVerification: () => Promise<boolean>;
  resendVerification: (email?: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  unconfirmedEmail?: string | null;
  onSuccess: () => void;
  navigateTo: (path: string, options?: { replace?: boolean }) => void;
}

export const AuthCallbackView: React.FC<AuthCallbackViewProps> = ({
  checkVerification,
  resendVerification,
  updatePassword,
  unconfirmedEmail,
  onSuccess,
  navigateTo
}) => {
  const [phase, setPhase] = useState<'processing' | 'verified_success' | 'expired_link' | 'recovery_password'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState(() => unconfirmedEmail || '');

  // Recovery Password State
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;
    let isMounted = true;

    async function processCallback() {
      if (typeof window === 'undefined') return;

      const fullUrl = window.location.href;
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : '';
      const hashParams = new URLSearchParams(hash);

      const error = searchParams.get('error') || hashParams.get('error');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
      const type = searchParams.get('type') || hashParams.get('type');
      const code = searchParams.get('code');

      const handleSuccessRedirect = () => {
        // If not an explicit signup confirmation link (e.g. OAuth login or existing session),
        // immediately forward straight to product without waiting for a click.
        if (type !== 'signup') {
          onSuccess();
          return;
        }
        setPhase('verified_success');
        setTimeout(() => {
          if (isMounted) {
            onSuccess();
          }
        }, 1200);
      };

      // Check for Supabase Auth Error / Expired Link
      if (error || errorCode) {
        if (!isMounted) return;
        try {
          const isVerified = await checkVerification();
          if (isVerified) {
            handleSuccessRedirect();
            return;
          }
        } catch {}

        setPhase('expired_link');
        const desc = errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : null;
        setErrorMessage(
          desc || "This verification link is invalid or has expired. Please request a new confirmation email."
        );
        return;
      }

      // Check for PKCE Code Exchange
      if (code) {
        try {
          const res = await exchangeAuthCode(code);
          if (res.error) {
            if (!isMounted) return;
            setPhase('expired_link');
            setErrorMessage(res.error);
            return;
          }
        } catch (e: any) {
          console.error("Code exchange failed:", e);
        }
      }

      // Check if this was a password recovery callback
      if (type === 'recovery') {
        if (!isMounted) return;
        setPhase('recovery_password');
        return;
      }

      // Authoritatively verify user status via Supabase GoTrue
      try {
        const isVerified = await checkVerification();
        if (!isMounted) return;

        if (isVerified) {
          handleSuccessRedirect();
        } else {
          // Retry verification once in case of network propagation delay
          setTimeout(async () => {
            if (!isMounted) return;
            const secondTry = await checkVerification();
            if (secondTry) {
              handleSuccessRedirect();
            } else {
              setPhase('expired_link');
              setErrorMessage("Could not verify session from confirmation link. It may have expired.");
            }
          }, 1000);
        }
      } catch (err: any) {
        console.error("Auth callback verification error:", err);
        if (!isMounted) return;
        setPhase('expired_link');
        setErrorMessage("Verification failed. Please request a new confirmation email.");
      }
    }

    processCallback();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleResend = async () => {
    const target = (emailInput || unconfirmedEmail || '').trim().toLowerCase();
    if (!target) {
      setErrorMessage("Please enter your email address to receive a new link.");
      return;
    }
    setResending(true);
    setResendSuccess(false);
    try {
      const res = await resendVerification(target);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setResendSuccess(true);
      }
    } catch {
      setErrorMessage("Failed to resend confirmation email.");
    } finally {
      setResending(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setSavingPassword(true);
    setErrorMessage(null);
    try {
      const res = await updatePassword(newPassword);
      if (res.error) throw new Error(res.error);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to update password. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="w-full h-full min-h-screen flex bg-[#090d16] text-white">
      {/* Left Side - Enterprise Creative Suite Banner */}
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

      {/* Right Side - State Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-16 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6"
        >
          {/* 1. PROCESSING LOADER */}
          {phase === 'processing' && (
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex p-3 bg-rose-600/10 text-rose-500 rounded-full border border-rose-600/20 animate-pulse">
                <Loader2 size={32} className="animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Verifying Your Credentials
                </h3>
                <p className="text-sm text-slate-400 font-light">
                  Connecting to Supabase GoTrue and confirming your email session...
                </p>
              </div>
            </div>
          )}

          {/* 2. VERIFIED SUCCESS */}
          {phase === 'verified_success' && (
            <div className="space-y-6 text-center">
              <div className="inline-flex p-3 bg-emerald-600/10 text-emerald-500 rounded-full border border-emerald-600/20">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest block">
                  Confirmation Completed
                </span>
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  Email Verified
                </h2>
                <p className="text-sm text-slate-400 font-light leading-relaxed">
                  Your email address has been confirmed successfully. Your Writopedia workspace is ready.
                </p>
              </div>

              <button
                type="button"
                onClick={onSuccess}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-sm transition-colors cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
              >
                Continue to Writopedia <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* 3. EXPIRED OR INVALID LINK */}
          {phase === 'expired_link' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex p-2 bg-rose-600/10 text-rose-500 rounded-sm border border-rose-600/20 mb-1">
                  <AlertCircle size={22} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Verification Link Expired
                </h2>
                <p className="text-sm text-slate-400 font-light leading-relaxed">
                  {errorMessage || "This verification link is invalid or has expired."}
                </p>
              </div>

              {resendSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded-sm text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>A new verification link has been sent to your inbox.</span>
                </div>
              )}

              {!unconfirmedEmail && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Your Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-rose-500 rounded-sm py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || resendSuccess}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-sm transition-colors cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Sending New Link...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={14} /> Send a New Verification Email
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('/login')}
                  className="w-full border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-200 font-semibold text-xs py-2.5 rounded-sm transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* 4. RECOVERY PASSWORD UPDATE */}
          {phase === 'recovery_password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="space-y-2">
                <div className="inline-flex p-2 bg-rose-600/10 text-rose-500 rounded-sm border border-rose-600/20 mb-1">
                  <KeyRound size={22} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Set New Password
                </h2>
                <p className="text-sm text-slate-400 font-light">
                  Please choose a new password for your Writopedia account (at least 6 characters).
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-sm text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full text-xs pl-3 pr-9 py-2.5 bg-slate-900 border border-slate-800 rounded-sm focus:border-rose-500 focus:outline-none text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-sm transition-colors cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingPassword ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Updating Password...
                  </>
                ) : (
                  'Update Password & Continue'
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};
