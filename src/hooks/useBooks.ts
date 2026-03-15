import { useEffect, useRef } from 'react';
import { Book } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchBooks, upsertBooks } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { isBookEmpty, createNewBook } from '../utils/book';
import { STORAGE_KEYS } from '../lib/storage-keys';

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
          const localRaw = localStorage.getItem(STORAGE_KEYS.library);
          localStorage.removeItem(STORAGE_KEYS.library);
          localStorage.removeItem(STORAGE_KEYS.activeBook);
          localStorage.removeItem(STORAGE_KEYS.legacyBook);

          if (localRaw) {
            try {
              const localBooks: Book[] = JSON.parse(localRaw);
              await upsertBooks(localBooks.filter(b => !isBookEmpty(b)), user.id);
            } catch (e) {
              console.error('Migration error:', e);
            }
          }

          const data = await fetchBooks();

          if (data.length > 0) {
            lastCloudLoadRef.current = Date.now();
            setBooks(data);
            setActiveBookId(data[0].id);
            setActiveChapterId(data[0].chapters[0].id);
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
      const lastActive = localStorage.getItem(STORAGE_KEYS.activeBook);
      const initialBookId =
        lastActive && localBooks.some(b => b.id === lastActive)
          ? lastActive
          : localBooks[0].id;
      setActiveBookId(initialBookId);
      const initialBook = localBooks.find(b => b.id === initialBookId) || localBooks[0];
      setActiveChapterId(initialBook.chapters[0].id);
    };

    const getLocalBooks = (): Book[] => {
      const saved = localStorage.getItem(STORAGE_KEYS.library);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
      const oldBook = localStorage.getItem(STORAGE_KEYS.legacyBook);
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
