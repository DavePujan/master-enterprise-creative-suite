/**
 * Pure Supabase React Auth Hook.
 * Enterprise identity driver powered exclusively by Supabase Auth and PostgreSQL profiles.
 * Authoritatively manages user confirmation states, verification checks, and session lifecycles.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  subscribeAuthState,
  getCurrentAccessToken,
  getCurrentUser,
  resendVerificationEmail,
  resetPasswordForEmail,
  updateUserPassword,
  isUserEmailConfirmed,
  type AuthResult
} from '../../../infrastructure/supabase/auth.js';
import { getSupabaseClient } from '../../../infrastructure/supabase/supabaseClient.js';

export interface NormalizedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailConfirmed: boolean;
  emailConfirmedAt?: string | null;
  provider?: string;
  admin?: boolean;
  getIdToken?: () => Promise<string>;
}

export function normalizeSupabaseUser(supaUser: any): NormalizedUser {
  const emailConfirmed = isUserEmailConfirmed(supaUser);
  const provider =
    supaUser.app_metadata?.provider ||
    (supaUser.identities && supaUser.identities[0]?.provider) ||
    'email';

  return {
    uid: supaUser.id,
    email: supaUser.email || null,
    displayName:
      supaUser.user_metadata?.full_name ||
      supaUser.user_metadata?.name ||
      supaUser.email?.split('@')[0] ||
      'User',
    photoURL: supaUser.user_metadata?.avatar_url || null,
    emailConfirmed,
    emailConfirmedAt: supaUser.email_confirmed_at || supaUser.confirmed_at || null,
    provider,
    getIdToken: async () => (await getCurrentAccessToken()) || '',
  };
}

async function fetchUserAdminRole(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { data: roleRow, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    return Boolean(!error && (roleRow?.role === 'admin' || roleRow?.role === 'superadmin'));
  } catch {
    return false;
  }
}

export function useAuth() {
  const [user, setUser] = useState<NormalizedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Track pending unconfirmed email for check/resend experiences across page reloads
  const [unconfirmedEmail, setUnconfirmedEmailState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('writopedia_unconfirmed_email') || null;
    }
    return null;
  });

  const setUnconfirmedEmail = useCallback((email: string | null) => {
    setUnconfirmedEmailState(email);
    if (typeof window !== 'undefined') {
      if (email) {
        sessionStorage.setItem('writopedia_unconfirmed_email', email);
      } else {
        sessionStorage.removeItem('writopedia_unconfirmed_email');
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((supaUser) => {
      if (supaUser) {
        const normalized = normalizeSupabaseUser(supaUser);
        setUser((prev) => {
          if (
            prev &&
            prev.uid === normalized.uid &&
            prev.email === normalized.email &&
            prev.emailConfirmed === normalized.emailConfirmed &&
            prev.displayName === normalized.displayName
          ) {
            return prev;
          }
          return normalized;
        });

        // Query authoritative database role (RBAC)
        fetchUserAdminRole(supaUser.id).then((isAdmin) => {
          setUser((curr) => {
            if (!curr || curr.uid !== supaUser.id) return curr;
            if (curr.admin === isAdmin) return curr;
            return { ...curr, admin: isAdmin };
          });
        });

        if (normalized.emailConfirmed) {
          setUnconfirmedEmail(null);
        } else if (normalized.email) {
          setUnconfirmedEmail(normalized.email);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setUnconfirmedEmail]);

  const parseAuthError = (e: any, fallbackMessage: string): string => {
    const code = e?.code || '';
    const msg = e?.message || '';

    if (
      code === 'auth/user-not-found' ||
      code === 'auth/invalid-credential' ||
      msg.includes('Invalid login credentials')
    ) {
      return "Email or password is incorrect. Please verify your credentials.";
    }
    if (code === 'auth/wrong-password') {
      return "Email or password is incorrect.";
    }
    if (code === 'auth/email-already-in-use' || msg.includes('already registered') || msg.includes('already exists')) {
      return "An account with this email already exists. Please switch to the Sign In tab.";
    }
    if (code === 'auth/weak-password' || msg.includes('weak') || msg.includes('at least 6 characters')) {
      return "Your password does not meet the security requirement (minimum 6 characters).";
    }
    if (code === 'auth/invalid-email' || msg.includes('valid email')) {
      return "Please enter a valid email address.";
    }
    if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many requests')) {
      return "Too many attempts. Please wait a moment and try again.";
    }
    if (msg.includes('verify your email') || msg.includes('Email not confirmed')) {
      return "Please confirm your email address to continue.";
    }
    return msg || fallbackMessage;
  };

  const login = async (redirectTo?: string) => {
    try {
      setAuthError(null);
      const { error } = await signInWithGoogle(redirectTo);
      if (error) throw new Error(error);
    } catch (e: any) {
      console.error("Google sign in error:", e);
      setAuthError(parseAuthError(e, "Failed to sign in with Google"));
    }
  };

  const loginWithEmail = async (email: string, password?: string): Promise<AuthResult> => {
    try {
      setAuthError(null);
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !password) {
        const err = "Email and password are required.";
        setAuthError(err);
        throw new Error(err);
      }

      const res = await signInWithEmail(cleanEmail, password);
      if (res.error) {
        if (res.isEmailUnconfirmed) {
          setUnconfirmedEmail(cleanEmail);
        }
        throw new Error(res.error);
      }

      return res;
    } catch (e: any) {
      console.error("Email login error:", e);
      const errMsg = parseAuthError(e, "Failed to sign in with email");
      setAuthError(errMsg);
      throw new Error(errMsg);
    }
  };

  const registerWithEmail = async (
    email: string,
    password?: string,
    displayName?: string
  ): Promise<AuthResult> => {
    try {
      setAuthError(null);
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !password) {
        const err = "Email and password are required.";
        setAuthError(err);
        throw new Error(err);
      }
      if (password.length < 6) {
        const err = "Password must be at least 6 characters.";
        setAuthError(err);
        throw new Error(err);
      }

      const res = await signUpWithEmail(cleanEmail, password, displayName);
      if (res.error) {
        if (res.isEmailUnconfirmed) {
          setUnconfirmedEmail(cleanEmail);
        }
        throw new Error(res.error);
      }

      if (res.isEmailUnconfirmed) {
        setUnconfirmedEmail(cleanEmail);
      }

      return res;
    } catch (e: any) {
      console.error("Registration error:", e);
      const errMsg = parseAuthError(e, "Failed to create account");
      setAuthError(errMsg);
      throw new Error(errMsg);
    }
  };

  /**
   * Authoritatively queries Supabase server to check if user has confirmed their email.
   * Updates state and returns boolean indicating whether email is confirmed.
   */
  const checkVerification = useCallback(async (): Promise<boolean> => {
    try {
      const freshUser = await getCurrentUser();
      if (freshUser) {
        const isConfirmed = isUserEmailConfirmed(freshUser);
        const normalized = normalizeSupabaseUser(freshUser);
        setUser((prev) => {
          if (
            prev &&
            prev.uid === normalized.uid &&
            prev.email === normalized.email &&
            prev.emailConfirmed === normalized.emailConfirmed
          ) {
            return prev;
          }
          return normalized;
        });

        // Query authoritative database role (RBAC)
        fetchUserAdminRole(freshUser.id).then((isAdmin) => {
          setUser((curr) => {
            if (!curr || curr.uid !== freshUser.id) return curr;
            if (curr.admin === isAdmin) return curr;
            return { ...curr, admin: isAdmin };
          });
        });

        if (isConfirmed) {
          setUnconfirmedEmail(null);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Check verification error:", err);
      return false;
    }
  }, [setUnconfirmedEmail]);

  const resendVerification = useCallback(async (emailOverride?: string): Promise<{ error?: string }> => {
    const targetEmail = (emailOverride || unconfirmedEmail || user?.email || '').trim().toLowerCase();
    if (!targetEmail) {
      return { error: "No email address found to resend confirmation to." };
    }
    return resendVerificationEmail(targetEmail);
  }, [unconfirmedEmail, user?.email]);

  const resetPassword = useCallback(async (email: string): Promise<{ error?: string }> => {
    return resetPasswordForEmail(email);
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<{ error?: string }> => {
    return updateUserPassword(password);
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOutUser();
      setUser(null);
      setUnconfirmedEmail(null);
    } catch (e: any) {
      console.error("Sign out error:", e);
    }
  }, [setUnconfirmedEmail]);

  return {
    user,
    loading,
    unconfirmedEmail,
    setUnconfirmedEmail,
    login,
    loginWithEmail,
    registerWithEmail,
    checkVerification,
    resendVerification,
    resetPassword,
    updatePassword,
    logout,
    authError,
    setAuthError,
  };
}

