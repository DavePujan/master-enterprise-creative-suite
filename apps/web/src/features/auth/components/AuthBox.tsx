import React, { useState } from 'react';
import { Loader2, Check, Copy, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validatePasswordSecurity } from '../../../infrastructure/supabase/auth';

export interface AuthBoxProps {
  user: any;
  login: () => void;
  loginWithEmail: (email: string, password: string) => Promise<any>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<any>;
  resetPassword?: (email: string) => Promise<{ error?: string }>;
  authError?: string | null;
  setAuthError: (err: string | null) => void;
  navigateTo?: (path: string, options?: { replace?: boolean }) => void;
  titleText?: string;
  subText?: string;
}

export const AuthBox: React.FC<AuthBoxProps> = ({ 
  user, 
  login, 
  loginWithEmail, 
  registerWithEmail, 
  resetPassword,
  authError,
  setAuthError,
  navigateTo,
  titleText,
  subText
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Field-level & Form-level errors
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const [copiedDomain, setCopiedDomain] = useState(false);
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDomainError =
    (formError && formError.includes('Domain Authorization Required')) ||
    (authError && authError.includes('Domain Authorization Required'));

  const handleCopyHostname = () => {
    if (navigator.clipboard && currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleSwitchMode = (newMode: 'signin' | 'signup' | 'forgot_password') => {
    setMode(newMode);
    setFormError(null);
    setFieldErrors({});
    setAuthError(null);
    setConfirmPassword('');
    setShowConfirmPassword(false);
    setShowPassword(false);
    setResetSent(false);
  };

  const getPasswordStrength = (pwd: string): { score: number; label: string } => {
    if (!pwd) return { score: 0, label: '' };
    const res = validatePasswordSecurity(pwd);
    if (!res.valid && res.score === 0) return { score: 1, label: 'Weak' };
    switch (res.score) {
      case 1: return { score: 1, label: 'Weak' };
      case 2: return { score: 2, label: 'Fair' };
      case 3: return { score: 3, label: 'Good' };
      case 4: return { score: 4, label: 'Strong' };
      default: return { score: 1, label: 'Weak' };
    }
  };

  const validateInputs = (): boolean => {
    const errors: { email?: string; password?: string; confirmPassword?: string } = {};
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Email validation
    if (!cleanEmail) {
      errors.email = "Email address is required.";
    } else if (!emailRegex.test(cleanEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    // 2. Password validation
    if (mode !== 'forgot_password') {
      if (!password) {
        errors.password = "Password is required.";
      } else if (mode === 'signup') {
        const check = validatePasswordSecurity(password);
        if (!check.valid) {
          errors.password = check.error || "Password must be at least 8 characters.";
        }
      }

      // 3. Confirm Password validation (Sign up only)
      if (mode === 'signup') {
        if (!confirmPassword) {
          errors.confirmPassword = "Please confirm your password.";
        } else if (password !== confirmPassword) {
          errors.confirmPassword = "Passwords do not match.";
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    const cleanEmail = email.trim().toLowerCase();
    setSubmitting(true);
    setFormError(null);
    setAuthError(null);

    try {
      if (mode === 'signin') {
        const res = await loginWithEmail(cleanEmail, password);
        if (res?.isEmailUnconfirmed) {
          if (navigateTo) {
            navigateTo('/verify-email');
          }
        }
      } else if (mode === 'signup') {
        const res = await registerWithEmail(cleanEmail, password, name.trim() || undefined);
        if (res?.isEmailUnconfirmed) {
          if (navigateTo) {
            navigateTo('/verify-email');
          }
        }
      } else if (mode === 'forgot_password') {
        if (resetPassword) {
          const res = await resetPassword(cleanEmail);
          if (res.error) throw new Error(res.error);
        }
        setResetSent(true);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Authentication failed. Please verify your details.";
      if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('verify your email')) {
        if (navigateTo) {
          navigateTo('/verify-email');
          return;
        }
      }
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Real-time password mismatch detection for confirm field
  const isConfirmDirty = confirmPassword.length > 0;
  const isPasswordMismatch = isConfirmDirty && password !== confirmPassword;
  const isPasswordMatched = isConfirmDirty && password === confirmPassword;

  return (
    <div className="space-y-4 w-full text-left mt-2">
      {/* Header section (cleanly formatted, omitting dimmed confusing titles) */}
      {mode === 'forgot_password' ? (
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white tracking-tight">
            Reset Password
          </h3>
          <p className="text-xs text-slate-400">
            Enter your email to receive a secure password recovery link.
          </p>
        </div>
      ) : titleText ? (
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-slate-200">
            {titleText}
          </h3>
          {subText && <p className="text-xs text-slate-400">{subText}</p>}
        </div>
      ) : null}

      {/* Tabs (Only in signin or signup mode) */}
      {mode !== 'forgot_password' ? (
        <div className="flex border-b border-slate-800">
          <button
            type="button"
            onClick={() => handleSwitchMode('signin')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
              mode === 'signin' 
                ? 'border-rose-500 text-rose-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('signup')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
              mode === 'signup' 
                ? 'border-rose-500 text-rose-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => handleSwitchMode('signin')}
          className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer py-1 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Sign In
        </button>
      )}

      {/* Password Reset Sent State */}
      {resetSent ? (
        <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-sm text-xs text-emerald-200 space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-emerald-300">
            <Check size={14} className="text-emerald-400" /> Password Reset Link Sent
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            If an account exists for <span className="font-mono text-white font-semibold">{email}</span>, we've sent password reset instructions to your inbox.
          </p>
          <button
            type="button"
            onClick={() => handleSwitchMode('signin')}
            className="mt-2 text-xs font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
          >
            Return to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          {/* Optional Full Name (Registration only) */}
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Full Name (Optional)
              </label>
              <input
                type="text"
                autoComplete="name"
                disabled={submitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-white placeholder-slate-500 disabled:opacity-50"
              />
            </div>
          )}

          {/* Email Address */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              disabled={submitting}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
              }}
              placeholder="name@example.com"
              className={`w-full text-xs px-3 py-2 bg-slate-900 border rounded-sm focus:outline-none focus:ring-1 text-white placeholder-slate-500 disabled:opacity-50 ${
                fieldErrors.email 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/50' 
                  : 'border-slate-800 focus:border-rose-500 focus:ring-rose-500/50'
              }`}
            />
            {fieldErrors.email && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium pt-0.5">
                <AlertCircle size={12} className="shrink-0" />
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          {mode !== 'forgot_password' && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('forgot_password')}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === 'signup' ? "new-password" : "current-password"}
                  disabled={submitting}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  placeholder={mode === 'signup' ? "At least 8 characters" : "•••••••••••••••"}
                  className={`w-full text-xs pl-3 pr-9 py-2 bg-slate-900 border rounded-sm focus:outline-none focus:ring-1 text-white placeholder-slate-500 disabled:opacity-50 ${
                    fieldErrors.password 
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/50' 
                      : 'border-slate-800 focus:border-rose-500 focus:ring-rose-500/50'
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Password Policy & Visual Strength Indicator */}
              {mode === 'signup' && (
                <div className="space-y-1.5 pt-0.5">
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Password must be at least 8 characters.
                  </p>

                  {/* 4-segment Strength Indicator */}
                  {password.length > 0 && (() => {
                    const strength = getPasswordStrength(password);
                    return (
                      <div className="pt-0.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Password strength:</span>
                          <span className={`font-semibold ${
                            strength.score <= 1 ? 'text-rose-400' :
                            strength.score === 2 ? 'text-amber-400' :
                            strength.score === 3 ? 'text-emerald-400' : 'text-teal-400'
                          }`}>
                            {strength.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 h-1">
                          {[1, 2, 3, 4].map((seg) => (
                            <div
                              key={seg}
                              className={`h-full rounded-full transition-all duration-300 ${
                                strength.score >= seg
                                  ? strength.score <= 1
                                    ? 'bg-rose-500'
                                    : strength.score === 2
                                    ? 'bg-amber-500'
                                    : strength.score === 3
                                    ? 'bg-emerald-500'
                                    : 'bg-teal-400'
                                  : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {fieldErrors.password && (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} className="shrink-0" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
              )}
              {mode === 'signin' && fieldErrors.password && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium pt-0.5">
                  <AlertCircle size={12} className="shrink-0" />
                  {fieldErrors.password}
                </p>
              )}
            </div>
          )}

          {/* Confirm Password (Registration Sign Up Only) */}
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  disabled={submitting}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="Re-enter your password"
                  className={`w-full text-xs pl-3 pr-9 py-2 bg-slate-900 border rounded-sm focus:outline-none focus:ring-1 text-white placeholder-slate-500 disabled:opacity-50 ${
                    isPasswordMismatch || fieldErrors.confirmPassword
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/50' 
                      : isPasswordMatched
                      ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-emerald-500/50'
                      : 'border-slate-800 focus:border-rose-500 focus:ring-rose-500/50'
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Dynamic matching feedback */}
              {isPasswordMismatch ? (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium pt-0.5">
                  <AlertCircle size={12} className="shrink-0" />
                  Passwords do not match
                </p>
              ) : isPasswordMatched ? (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium pt-0.5">
                  <CheckCircle2 size={12} className="shrink-0" />
                  Passwords match
                </p>
              ) : fieldErrors.confirmPassword ? (
                <p className="text-[11px] text-rose-400 flex items-center gap-1 font-medium pt-0.5">
                  <AlertCircle size={12} className="shrink-0" />
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>
          )}

          {/* Form-level Error Banner */}
          {(formError || authError) && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-sm text-[11px] text-rose-300 leading-normal space-y-2">
              <div className="flex items-start gap-1.5">
                <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                <span>{formError || authError}</span>
              </div>
              {isDomainError && currentHostname && (
                <div className="pt-1.5 border-t border-rose-900/60 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-rose-800 text-slate-200 truncate max-w-50">
                    {currentHostname}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHostname}
                    className="flex items-center gap-1 text-[10px] font-bold text-rose-300 hover:underline cursor-pointer shrink-0"
                  >
                    {copiedDomain ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copiedDomain ? 'Copied!' : 'Copy Domain'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={submitting || (mode === 'signup' && isPasswordMismatch)}
            className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-sm transition-all cursor-pointer tracking-wider flex items-center justify-center gap-1.5 shadow-sm shadow-rose-600/30"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>
                  {mode === 'signin' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending link...'}
                </span>
              </>
            ) : (
              <span>
                {mode === 'signin' 
                  ? 'Sign in to workspace' 
                  : mode === 'signup' 
                  ? 'Register Account' 
                  : 'Send Recovery Link'}
              </span>
            )}
          </button>
        </form>
      )}

      {/* Divider & Google SSO Button (Sign In & Sign Up) */}
      {mode !== 'forgot_password' && !resetSent && (
        <>
          <div className="relative flex items-center py-1">
            <div className="grow border-t border-slate-800"></div>
            <span className="shrink mx-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
              or continue with
            </span>
            <div className="grow border-t border-slate-800"></div>
          </div>

          <button 
            type="button"
            onClick={() => login()}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 border border-slate-800 hover:border-slate-700 text-slate-200 py-2.5 rounded-sm font-semibold bg-slate-900 hover:bg-slate-800 transition-colors text-xs cursor-pointer disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Continue with Google</span>
          </button>
        </>
      )}
    </div>
  );
};
