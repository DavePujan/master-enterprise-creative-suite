import React, { useState } from 'react';
import { Loader2, Check, Copy } from 'lucide-react';

export interface AuthBoxProps {
  user: any;
  login: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  authError?: string | null;
  setAuthError: (err: string | null) => void;
  titleText?: string;
  subText?: string;
}

export const AuthBox: React.FC<AuthBoxProps> = ({ 
  user, 
  login, 
  loginWithEmail, 
  registerWithEmail, 
  authError,
  setAuthError,
  titleText = "Sign In or Register",
  subText = "Access your established creative profile"
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
                <span className="font-mono text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800 text-slate-800 dark:text-slate-200 truncate max-w-50">
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
        <div className="grow border-t border-slate-200 dark:border-slate-800"></div>
        <span className="shrink mx-3 text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">or continue with</span>
        <div className="grow border-t border-slate-200 dark:border-slate-800"></div>
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
