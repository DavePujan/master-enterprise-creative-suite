/**
 * Client-Side Supabase Authentication Service.
 * Provides OAuth Google sign-in, email/password authentication, and session token resolution.
 */

import { getSupabaseClient } from "./supabaseClient.js";

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY." };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/workspace`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function signInWithEmail(email: string, password: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase client is not configured." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function signUpWithEmail(email: string, password: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase client is not configured." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return {};
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
