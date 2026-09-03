/**
 * Client Firebase App Initialization & Diagnostics.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import rawConfig from '@/firebase-applet-config.json';

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
