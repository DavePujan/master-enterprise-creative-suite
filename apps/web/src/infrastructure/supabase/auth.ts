/**
 * Client-Side Supabase Authentication Service.
 * Authoritative GoTrue client driver providing OAuth, credential auth,
 * email verification lifecycles, and session state resolution.
 */

import { getSupabaseClient } from "./supabaseClient.js";

export interface AuthResult {
  error?: string;
  isEmailUnconfirmed?: boolean;
  user?: any;
  session?: any;
}

/**
 * Returns canonical redirect URL for auth callbacks
 */
export function getAuthCallbackUrl(type?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/auth/callback`;
  return type ? `${url}?type=${encodeURIComponent(type)}` : url;
}

/**
 * Checks whether a Supabase user object has confirmed their email address
 */
export function isUserEmailConfirmed(user: any): boolean {
  if (!user) return false;
  // Google and other verified OAuth providers
  if (user.app_metadata?.provider === 'google' || user.app_metadata?.providers?.includes('google')) {
    return true;
  }
  if (user.identities && user.identities.some((id: any) => id.provider === 'google')) {
    return true;
  }
  // Standard Supabase email confirmation timestamp
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

export async function signInWithGoogle(redirectTo?: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY." };
  }

  const destination = redirectTo || getAuthCallbackUrl();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: destination,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase client is not configured." };
  }

  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    const isUnconfirmed = msg.includes("email not confirmed") || (error as any).code === "email_not_confirmed";
    if (isUnconfirmed) {
      return {
        error: "Please verify your email address before signing in.",
        isEmailUnconfirmed: true,
      };
    }
    return { error: error.message };
  }

  if (data?.user && !isUserEmailConfirmed(data.user)) {
    return {
      error: "Please verify your email address before signing in.",
      isEmailUnconfirmed: true,
      user: data.user,
      session: data.session,
    };
  }

  return { user: data.user, session: data.session };
}

/**
 * Screening blocklist of common or compromised passwords
 */
export const COMMON_PASSWORDS_BLACKLIST = new Set([
  'password', 'password123', 'password1234', '12345678', '123456789', '1234567890',
  'qwerty123', 'qwertyuiop', 'admin123', 'admin1234', 'letmein123', 'welcome123',
  'iloveyou', 'sunshine1', 'passphrase', 'changeme', 'writopedia', '11111111', '00000000'
]);

export function validatePasswordSecurity(password: string): { valid: boolean; error?: string; score: number } {
  if (!password || password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters.", score: 0 };
  }
  if (password.length > 128) {
    return { valid: false, error: "Password exceeds maximum allowed length of 128 characters.", score: 1 };
  }

  const normalized = password.trim().toLowerCase();
  if (COMMON_PASSWORDS_BLACKLIST.has(normalized) || /^([a-zA-Z0-9])\1{7,}$/.test(normalized)) {
    return {
      valid: false,
      error: "This password is too common or easily guessed. Please choose a more secure password or passphrase.",
      score: 1
    };
  }

  // Calculate intuitive strength score (1..4) without rigid composition rules
  let score = 1; // Basic (8+ chars)
  if (password.length >= 10) score++;
  if (password.length >= 14 || (/[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password))) score++;
  if (password.length >= 16 || (password.includes(' ') && password.length >= 12)) score = 4;

  return { valid: true, score };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { error: "Please enter a valid email address." };
  }

  // 8-character minimum policy with common password screening & long passphrase support
  const passwordCheck = validatePasswordSecurity(password);
  if (!passwordCheck.valid) {
    return { error: passwordCheck.error };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase client is not configured." };
  }

  const emailRedirectTo = getAuthCallbackUrl('signup');

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: fullName ? { full_name: fullName.trim(), name: fullName.trim() } : undefined,
      emailRedirectTo,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Detect duplicate signup obfuscation (Supabase returns empty identities array when user already exists)
  if (data?.user && data.user.identities && data.user.identities.length === 0) {
    return {
      error: "An account with this email already exists. Please sign in or check if email verification is pending.",
      isEmailUnconfirmed: true,
      user: data.user,
    };
  }

  const isConfirmed = isUserEmailConfirmed(data?.user);
  return {
    user: data?.user,
    session: data?.session,
    isEmailUnconfirmed: !isConfirmed,
  };
}

export async function resendVerificationEmail(email: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase client is not configured." };
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRedirectTo = getAuthCallbackUrl('signup');

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: cleanEmail,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}

/**
 * Authoritatively fetches the current authenticated user directly from Supabase GoTrue server.
 * Unlike getSession(), this validates tokens against the auth server and returns the latest confirmation state.
 */
export async function getCurrentUser(): Promise<any | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function resetPasswordForEmail(email: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase client is not configured." };
  }

  const cleanEmail = email.trim().toLowerCase();
  const redirectTo = getAuthCallbackUrl('recovery');

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo,
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function updateUserPassword(newPassword: string): Promise<{ error?: string }> {
  const passwordCheck = validatePasswordSecurity(newPassword);
  if (!passwordCheck.valid) {
    return { error: passwordCheck.error };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase client is not configured." };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function exchangeAuthCode(code: string): Promise<{ session?: any; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase client is not configured." };
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return { error: error.message };
  }

  return { session: data?.session };
}

export async function signOutUser(): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return {};

  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function getCurrentAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export function subscribeAuthState(callback: (user: any) => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return () => {};
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });

  return () => {
    subscription.unsubscribe();
  };
}

