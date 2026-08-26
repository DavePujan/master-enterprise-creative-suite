import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL
} from 'firebase/storage';
import rawConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: rawConfig.apiKey || "AIzaSyD-4hYzHor3eIeLc6AlizXeUMya6BP01BU",
  authDomain: rawConfig.authDomain || "writopedia-v2.firebaseapp.com",
  projectId: rawConfig.projectId || "writopedia-v2",
  storageBucket: rawConfig.storageBucket || "writopedia-v2.firebasestorage.app",
  messagingSenderId: rawConfig.messagingSenderId || "951644217100",
  appId: rawConfig.appId || "1:951644217100:web:2d3537ca73c4c95e2c3329",
  measurementId: rawConfig.measurementId || "G-LSP7JFP3E7"
};

// Initialize Firebase App instance safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Services
export const auth = getAuth(app);
export const db = rawConfig.firestoreDatabaseId && rawConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, rawConfig.firestoreDatabaseId)
  : getFirestore(app);
export const storage = getStorage(app);

// Diagnostic connection test on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Structured Firestore error logger
export function handleFirestoreError(error: unknown, operationType?: string, path?: string) {
  const err = error as { code?: string; message?: string };
  const message = err?.message || String(error);
  console.error(`Firestore Error [${operationType || 'operation'}] at path "${path || 'unknown'}":`, message);
  return error;
}

// Upload asset to Firebase Storage with graceful fallback
export async function uploadAssetToStorage(
  userId: string,
  assetId: string,
  data: string,
  _type?: string
): Promise<string> {
  // If not a data URL or if it's already a hosted URL, return as-is
  if (!data || !data.startsWith('data:')) {
    return data;
  }

  try {
    const extMatch = data.match(/^data:([^;]+);/);
    const mime = extMatch ? extMatch[1] : 'image/png';
    const ext = mime.includes('svg') ? 'svg' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('mp4') ? 'mp4' : mime.includes('audio') || mime.includes('mp3') ? 'mp3' : 'png';
    const cleanAssetId = assetId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `users/${userId}/assets/${cleanAssetId}.${ext}`;
    const storageRef = ref(storage, storagePath);

    await uploadString(storageRef, data, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.warn("Storage upload fallback to data URL:", error);
    return data;
  }
}

// React Auth Hook for Firebase Authentication
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
      await signInWithEmailAndPassword(auth, email, password || "defaultPassword123!");
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password || "defaultPassword123!");
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
