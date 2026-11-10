import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

/** Mounted once at the application root, never inside the toolbar. */
export function useAuth() {
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      useAppStore.getState().setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  // Account-scoped drafts survive logout and are never imported by another account.
  useAppStore.getState().setUser(null);
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google', options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}
