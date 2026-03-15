import { useEffect, useRef } from 'react';
import { Book } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore, createNewBook, isBookEmpty } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';

export function useBooks() {
  const user = useAppStore(s => s.user);
  const setBooks = useAppStore(s => s.setBooks);
  const setActiveBookId = useAppStore(s => s.setActiveBookId);
  const setActiveChapterId = useAppStore(s => s.setActiveChapterId);
  const setIsCloudSyncing = useUiStore(s => s.setIsCloudSyncing);

  // Timestamp of last cloud load — auto-save skips cloud write within 3s of a load
  // to avoid writing back what we just read.
  const lastCloudLoadRef = useRef(0);

  useEffect(() => {
    const loadData = async () => {
      if (user && isSupabaseConfigured) {
        setIsCloudSyncing(true);
        try {
          // Migration: read localStorage once and synchronously delete it so a
          // second effect invocation (onAuthStateChange can fire twice) doesn't duplicate.
          const localRaw = localStorage.getItem('lumina_library');
          localStorage.removeItem('lumina_library');
          localStorage.removeItem('lumina_active_book');
          localStorage.removeItem('lumina_book');

          if (localRaw) {
            try {
              const localBooks: Book[] = JSON.parse(localRaw);
              for (const book of localBooks.filter(b => !isBookEmpty(b))) {
                await supabase.from('books').upsert({
                  id: book.id,
                  user_id: user.id,
                  title: book.title,
                  author: book.author,
                  chapters: book.chapters,
                  updated_at: new Date(book.updatedAt).toISOString(),
                }, { onConflict: 'id' });
              }
            } catch (e) {
              console.error('Migration error:', e);
            }
          }

          const { data, error } = await supabase
            .from('books')
            .select('*')
            .order('updated_at', { ascending: false });

          if (error) throw error;

          if (data && data.length > 0) {
            const formatted: Book[] = data.map(b => ({
              id: b.id,
              title: b.title,
              author: b.author,
              updatedAt: new Date(b.updated_at).getTime(),
              chapters: b.chapters,
            }));
            lastCloudLoadRef.current = Date.now();
            setBooks(formatted);
            setActiveBookId(formatted[0].id);
            setActiveChapterId(formatted[0].chapters[0].id);
          } else {
            const defaultBook = createNewBook('', user.user_metadata?.full_name || '');
            lastCloudLoadRef.current = Date.now();
            setBooks([defaultBook]);
            setActiveBookId(defaultBook.id);
            setActiveChapterId(defaultBook.chapters[0].id);
          }
        } catch (error) {
          console.error('Error loading from cloud:', error);
          loadLocal();
        } finally {
          setIsCloudSyncing(false);
        }
      } else {
        loadLocal();
      }
    };

    const loadLocal = () => {
      const localBooks = getLocalBooks();
      setBooks(localBooks);
      const lastActive = localStorage.getItem('lumina_active_book');
      const initialBookId =
        lastActive && localBooks.some(b => b.id === lastActive)
          ? lastActive
          : localBooks[0].id;
      setActiveBookId(initialBookId);
      const initialBook = localBooks.find(b => b.id === initialBookId) || localBooks[0];
      setActiveChapterId(initialBook.chapters[0].id);
    };

    const getLocalBooks = (): Book[] => {
      const saved = localStorage.getItem('lumina_library');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
      const oldBook = localStorage.getItem('lumina_book');
      if (oldBook) {
        try {
          const parsed = JSON.parse(oldBook);
          return [{ ...parsed, id: 'legacy', updatedAt: Date.now() }];
        } catch (e) {}
      }
      return [createNewBook('', user?.user_metadata?.full_name || '')];
    };

    loadData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  // Zustand setters are stable references — safe to omit from deps array.

  return { lastCloudLoadRef };
}
