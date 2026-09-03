/**
 * Dual-Driver React Auth Hook.
 * Supports Supabase Auth as the primary enterprise identity driver with graceful fallback to Firebase.
 * Preserves exact error mapping, Google login, email login/registration, and profile updates.
 */

import { useState, useEffect } from 'react';
import {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User
} from '../../../infrastructure/firebase/auth.js';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  subscribeAuthState,
  getCurrentAccessToken,
} from '../../../infrastructure/supabase/auth.js';
import { getSupabaseClient } from '../../../infrastructure/supabase/supabaseClient.js';

export interface NormalizedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  getIdToken?: () => Promise<string>;
}

export function useAuth() {
  const isSupabase = Boolean(getSupabaseClient());
  const [user, setUser] = useState<NormalizedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabase) {
      const unsubscribe = subscribeAuthState((supaUser) => {
        if (supaUser) {
          setUser({
            uid: supaUser.id,
            email: supaUser.email || null,
            displayName: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'User',
            photoURL: supaUser.user_metadata?.avatar_url || null,
            getIdToken: async () => (await getCurrentAccessToken()) || "",
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    }

    // Firebase fallback
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          getIdToken: async () => await currentUser.getIdToken(),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [isSupabase]);

  const parseAuthError = (e: any, fallbackMessage: string) => {
    const code = e?.code || '';
    const msg = e?.message || '';
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

    if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
      return `Domain Authorization Required: Please add "${currentHost}" to Authorized Domains. In the meantime, you can create an account or sign in with Email & Password above!`;
    }
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
    if (code === 'auth/popup-closed-by-user') {
      return "Sign-in popup was closed before completing.";
    }
    if (code === 'auth/popup-blocked') {
      return "Popup was blocked by the browser. Please allow popups for this site.";
    }
    return msg || fallbackMessage;
  };

  const login = async () => {
    try {
      setAuthError(null);
      if (isSupabase) {
        const { error } = await signInWithGoogle();
        if (error) throw new Error(error);
        return;
      }
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
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

      if (isSupabase) {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) throw new Error(error);
        return;
      }

      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      console.error("Email login error:", e);
      const errMsg = parseAuthError(e, "Failed to sign in with Email");
      setAuthError(errMsg);
      throw new Error(errMsg);
    }
  };

  const registerWithEmail = async (email: string, password?: string, displayName?: string) => {
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

      if (isSupabase) {
        const { error } = await signUpWithEmail(email.trim(), password);
        if (error) throw new Error(error);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
    } catch (e: any) {
      console.error("Registration error:", e);
      const errMsg = parseAuthError(e, "Failed to create account");
      setAuthError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    try {
      if (isSupabase) {
        await signOutUser();
      } else {
        await signOut(auth);
      }
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
