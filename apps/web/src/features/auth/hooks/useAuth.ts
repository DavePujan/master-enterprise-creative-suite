/**
 * React Auth Hook for Firebase Authentication.
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

export function useAuth() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const parseAuthError = (e: any, fallbackMessage: string) => {
    const code = e?.code || '';
    const msg = e?.message || '';
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

    if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
      return `Domain Authorization Required: Please add "${currentHost}" to Firebase Console -> Authentication -> Settings -> Authorized Domains. In the meantime, you can create an account or sign in with Email & Password above!`;
    }
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      return "Invalid email or password. Please check your credentials or switch to the Sign Up tab.";
    }
    if (code === 'auth/wrong-password') {
      return "Incorrect password. Please verify and try again.";
    }
    if (code === 'auth/email-already-in-use') {
      return "An account with this email already exists. Please switch to the Sign In tab.";
    }
    if (code === 'auth/weak-password') {
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
      await signOut(auth);
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
