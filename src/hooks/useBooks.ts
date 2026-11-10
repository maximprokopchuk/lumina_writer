import { useEffect, useRef } from 'react';
import { fetchBooks, saveBook, deleteCloudBook } from '../lib/api';
import { isSupabaseConfigured } from '../lib/supabase';
import { LocalLibrary, navigationKey } from '../lib/local-library';
import { SyncEngine } from '../lib/sync-engine';
import { createPlaceholder, useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';

export function useBooks() {
  const userId = useAppStore(s => s.user?.id);
  const authReady = useAppStore(s => s.authReady);
  const engineRef = useRef<SyncEngine | null>(null);

  useEffect(() => {
    if (!authReady) return;
    useAppStore.setState({ lastDeletedBook: null, lastDeletedChapter: null });
    const scope = userId || 'guest';
    const library = new LocalLibrary(scope);
    const placeholder = createPlaceholder(useAppStore.getState().user?.user_metadata?.full_name || '');
    let publishing = false;
    let navigation: { bookId?: string; chapterId?: string; chapters?: Record<string, string> } = {};
    try { navigation = JSON.parse(localStorage.getItem(navigationKey(scope)) || '{}'); } catch { /* Navigation is optional. */ }
    let first = true;
    const engine = new SyncEngine(library, userId && isSupabaseConfigured ? {
      fetch: () => fetchBooks(userId), save: (book, version) => saveBook(book, userId, version),
      delete: (id, version) => deleteCloudBook(id, userId, version),
    } : null, snapshot => {
      publishing = true;
      try {
        const current = useAppStore.getState();
        const books = snapshot.books.length ? snapshot.books : [placeholder];
        const desiredId = first ? navigation.bookId : current.activeBookId;
        const active = books.find(b => b.id === desiredId) || books[0];
        const desiredChapter = first ? navigation.chapterId : current.activeChapterId;
        useAppStore.setState({ books, activeBookId: active.id,
          activeChapterId: active.chapters.find(c => c.id === desiredChapter)?.id || active.chapters[0].id,
          ...(first ? { chapterNavigation: navigation.chapters || {} } : {}) });
        first = snapshot.books.length === 0 && !!navigation.bookId;
        useUiStore.setState({ isCloudSyncing: snapshot.syncing, hasPendingChanges: snapshot.pending,
          localSaveError: snapshot.localError, cloudSaveError: snapshot.cloudError, syncNotice: snapshot.notice });
      } finally { publishing = false; }
    });
    engineRef.current = engine;
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (publishing) return;
      for (const book of previous.books) {
        if (!state.books.some(b => b.id === book.id)) engine.remove(book.id);
      }
      for (const book of state.books) {
        if (previous.books.find(b => b.id === book.id) !== book) engine.edit(book);
      }
      if (state.activeBookId !== previous.activeBookId || state.activeChapterId !== previous.activeChapterId) {
        try { localStorage.setItem(navigationKey(scope), JSON.stringify({ bookId: state.activeBookId,
          chapterId: state.activeChapterId, chapters: state.chapterNavigation })); } catch { /* Manuscripts have their own error status. */ }
      }
    });
    void engine.start();
    if (userId) {
      // Copy guest drafts durably before removing guest entries. Preserve legacy backups.
      try {
        const guest = new LocalLibrary('guest'); guest.migrateLegacy();
        const imported = engine.import(guest.read());
        for (const id of imported) guest.remove(id);
      } catch {
        useUiStore.setState({ syncNotice: 'Не удалось перенести часть локальных проектов. Исходные черновики сохранены.' });
      }
    }
    const refresh = () => { if (document.visibilityState === 'visible') void engine.sync(); };
    const receive = (event: StorageEvent) => {
      if (!event.key?.startsWith(library.prefix)) return;
      if (!event.newValue) { void engine.sync(); return; }
      try {
        // Read the current committed header: an older event may refer to retired content chunks.
        const raw = localStorage.getItem(event.key);
        if (raw) engine.receiveExternal(library.decode(raw));
      } catch { /* Do not replace a draft with malformed data from another tab. */ }
    };
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', receive);
    document.addEventListener('visibilitychange', refresh);
    const poll = setInterval(refresh, 30_000);
    return () => {
      unsubscribe(); engine.stop(); engineRef.current = null; clearInterval(poll);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', receive);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [userId, authReady]);
  return { engineRef };
}
