import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { createNewBook } from '../utils/book';
import { STORAGE_KEYS } from '../lib/storage-keys';

export function useAuth() {
  const setUser = useAppStore(s => s.setUser);
  const setBooks = useAppStore(s => s.setBooks);
  const setActiveBookId = useAppStore(s => s.setActiveBookId);
  const setActiveChapterId = useAppStore(s => s.setActiveChapterId);

  // Subscribe to Supabase auth state changes.
  // onAuthStateChange fires INITIAL_SESSION on mount, so no separate getSession() needed.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [setUser]);

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(STORAGE_KEYS.library);
    localStorage.removeItem(STORAGE_KEYS.activeBook);
    localStorage.removeItem(STORAGE_KEYS.legacyBook);
    const fresh = createNewBook('', '');
    setBooks([fresh]);
    setActiveBookId(fresh.id);
    setActiveChapterId(fresh.chapters[0].id);
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  return { signOut, signInWithGoogle };
}
