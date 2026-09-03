/**
 * Pure Supabase React Auth Hook.
 * Enterprise identity driver powered exclusively by Supabase Auth and PostgreSQL profiles.
 */

import { useState, useEffect } from 'react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  subscribeAuthState,
  getCurrentAccessToken,
} from '../../../infrastructure/supabase/auth.js';

export interface NormalizedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  getIdToken?: () => Promise<string>;
}

export function useAuth() {
  const [user, setUser] = useState<NormalizedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((supaUser) => {
      if (supaUser) {
        setUser((prev) => {
          if (
            prev &&
            prev.uid === supaUser.id &&
            prev.email === (supaUser.email || null)
          ) {
            // Retain identical object reference so components don't re-render or re-subscribe on tab focus
            return prev;
          }
          return {
            uid: supaUser.id,
            email: supaUser.email || null,
            displayName: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'User',
            photoURL: supaUser.user_metadata?.avatar_url || null,
            getIdToken: async () => (await getCurrentAccessToken()) || "",
          };
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const parseAuthError = (e: any, fallbackMessage: string) => {
    const code = e?.code || '';
    const msg = e?.message || '';

    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || msg.includes('Invalid login credentials')) {
      return "Invalid email or password. Please check your credentials or switch to the Sign Up tab.";
    }
    if (code === 'auth/wrong-password') {
      return "Incorrect password. Please verify and try again.";
    }
    if (code === 'auth/email-already-in-use' || msg.includes('already registered')) {
      return "An account with this email already exists. Please switch to the Sign In tab.";
    }
    if (code === 'auth/weak-password' || msg.includes('weak')) {
      return "Password is too weak. Please use at least 6 characters.";
    }
    if (code === 'auth/invalid-email') {
      return "Please enter a valid email address.";
    }
    return msg || fallbackMessage;
  };

  const login = async () => {
    try {
      setAuthError(null);
      const { error } = await signInWithGoogle();
      if (error) throw new Error(error);
    } catch (e: any) {
      console.error("Login error:", e);
      setAuthError(parseAuthError(e, "Failed to sign in with Google"));
    }
  };

  const loginWithEmail = async (email: string, password?: string) => {
    try {
      setAuthError(null);
      if (!email || !password) {
        const err = "Email and password are required.";
        setAuthError(err);
        throw new Error(err);
      }

      const { error } = await signInWithEmail(email.trim(), password);
      if (error) throw new Error(error);
    } catch (e: any) {
      console.error("Email login error:", e);
      const errMsg = parseAuthError(e, "Failed to sign in with Email");
      setAuthError(errMsg);
      throw new Error(errMsg);
    }
  };

  const registerWithEmail = async (email: string, password?: string, _displayName?: string) => {
    try {
      setAuthError(null);
      if (!email || !password) {
        const err = "Email and password are required.";
        setAuthError(err);
        throw new Error(err);
      }
      if (password.length < 6) {
        const err = "Password must be at least 6 characters.";
        setAuthError(err);
        throw new Error(err);
      }

      const { error } = await signUpWithEmail(email.trim(), password);
      if (error) throw new Error(error);
    } catch (e: any) {
      console.error("Registration error:", e);
      const errMsg = parseAuthError(e, "Failed to create account");
      setAuthError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      setUser(null);
    } catch (e: any) {
      console.error("Sign out error:", e);
    }
  };

  return {
    user,
    loading,
    login,
    loginWithEmail,
    registerWithEmail,
    logout,
    authError,
    setAuthError
  };
}
