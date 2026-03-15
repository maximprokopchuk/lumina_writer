import { useEffect, RefObject } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore, isBookEmpty } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';

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
        localStorage.setItem('lumina_library', JSON.stringify(booksToSave));
        localStorage.setItem('lumina_active_book', activeBookId);
      } else {
        localStorage.removeItem('lumina_library');
        localStorage.removeItem('lumina_active_book');
      }

      if (user && isSupabaseConfigured) {
        // Skip cloud write if data was just loaded from cloud (prevents write-after-read loop)
        if (Date.now() - (lastCloudLoadRef.current ?? 0) < 3000) return;

        setIsCloudSyncing(true);
        try {
          for (const book of books) {
            const { error } = await supabase.from('books').upsert({
              id: book.id,
              user_id: user.id,
              title: book.title,
              author: book.author,
              chapters: book.chapters,
              updated_at: new Date(book.updatedAt).toISOString(),
            }, { onConflict: 'id' });
            if (error) console.error('Sync error:', error);
          }
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
    localStorage.setItem('lumina_library', JSON.stringify(currentBooks));

    if (currentUser && isSupabaseConfigured) {
      setSyncing(true);
      try {
        for (const book of currentBooks) {
          await supabase.from('books').upsert({
            id: book.id,
            user_id: currentUser.id,
            title: book.title,
            author: book.author,
            chapters: book.chapters,
            updated_at: new Date(book.updatedAt).toISOString(),
          }, { onConflict: 'id' });
        }
      } finally {
        setSyncing(false);
      }
    }

    setTimeout(() => setSaving(false), 800);
  };

  return { manualSave };
}
