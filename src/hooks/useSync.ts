import { useEffect, RefObject } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { upsertBooks } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { isBookEmpty } from '../utils/book';
import { STORAGE_KEYS } from '../lib/storage-keys';

export function useSync(lastCloudLoadRef: RefObject<number>) {
  const user = useAppStore(s => s.user);
  const books = useAppStore(s => s.books);
  const activeBookId = useAppStore(s => s.activeBookId);
  const setIsSaving = useUiStore(s => s.setIsSaving);
  const setIsCloudSyncing = useUiStore(s => s.setIsCloudSyncing);

  // Auto-save: debounced 2s after any books/activeBookId change
  useEffect(() => {
    if (books.length === 0) return;

    const timer = setTimeout(async () => {
      const booksToSave = books.filter(b => !isBookEmpty(b));
      if (booksToSave.length > 0) {
        localStorage.setItem(STORAGE_KEYS.library, JSON.stringify(booksToSave));
        localStorage.setItem(STORAGE_KEYS.activeBook, activeBookId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.library);
        localStorage.removeItem(STORAGE_KEYS.activeBook);
      }

      if (user && isSupabaseConfigured) {
        // Skip cloud write if data was just loaded from cloud (prevents write-after-read loop)
        if (Date.now() - (lastCloudLoadRef.current ?? 0) < 3000) return;

        setIsCloudSyncing(true);
        try {
          await upsertBooks(books, user.id);
        } catch (e) {
          console.error('Cloud sync failed', e);
        } finally {
          setIsCloudSyncing(false);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [books, activeBookId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const manualSave = async () => {
    setIsSaving(true);
    const { books: currentBooks, user: currentUser } = useAppStore.getState();
    const { setIsCloudSyncing: setSyncing, setIsSaving: setSaving } = useUiStore.getState();
    localStorage.setItem(STORAGE_KEYS.library, JSON.stringify(currentBooks));

    if (currentUser && isSupabaseConfigured) {
      setSyncing(true);
      try {
        await upsertBooks(currentBooks, currentUser.id);
      } finally {
        setSyncing(false);
      }
    }

    setTimeout(() => setSaving(false), 800);
  };

  return { manualSave };
}
