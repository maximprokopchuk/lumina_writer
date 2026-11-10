import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { Book, Chapter } from '../types';
import { isBookEmpty, createNewBook } from '../utils/book';
import { isSupabaseConfigured } from '../lib/supabase';

export { isBookEmpty, createNewBook };
export const createPlaceholder = (author = ''): Book => ({ ...createNewBook('', author), isPlaceholder: true });
const initialBook = createPlaceholder();

interface AppState {
  user: User | null;
  authReady: boolean;
  setUser: (user: User | null) => void;
  books: Book[];
  setBooks: (books: Book[] | ((prev: Book[]) => Book[])) => void;
  activeBookId: string;
  setActiveBookId: (id: string) => void;
  activeChapterId: string;
  chapterNavigation: Record<string, string>;
  lastDeletedBook: Book | null;
  lastDeletedChapter: { bookId: string; chapter: Chapter; index: number } | null;
  restoreBook: () => void;
  restoreChapter: () => void;
  setActiveChapterId: (id: string) => void;
  addBook: () => void;
  deleteBook: (id: string) => void;
  selectBook: (id: string) => void;
  addChapter: () => void;
  deleteChapter: (id: string) => void;
  updateChapterContent: (content: string, bookId?: string, chapterId?: string) => void;
  updateChapterTitle: (title: string) => void;
  updateBookMeta: (field: 'title' | 'author', value: string) => void;
  getActiveBook: () => Book;
  getActiveChapter: () => Chapter;
}

export const useAppStore = create<AppState>((set, get) => {
  const changeBook = (id: string, edit: (book: Book) => Book) => set(state => ({
    books: state.books.map(book => {
      if (book.id !== id) return book;
      const next = edit(book);
      if (next === book) return book;
      return { ...next, updatedAt: Math.max(Date.now(), book.updatedAt + 1),
        isPlaceholder: !!next.isPlaceholder && isBookEmpty(next) };
    }),
  }));
  return {
    user: null, authReady: !isSupabaseConfigured,
    setUser: user => set({ user, authReady: true }),
    books: [initialBook], activeBookId: initialBook.id, activeChapterId: initialBook.chapters[0].id,
    chapterNavigation: {},
    lastDeletedBook: null, lastDeletedChapter: null,
    setBooks: books => set(state => ({ books: typeof books === 'function' ? books(state.books) : books })),
    setActiveBookId: activeBookId => set({ activeBookId }),
    setActiveChapterId: id => set(state => ({ activeChapterId: id,
      chapterNavigation: { ...state.chapterNavigation, [state.activeBookId]: id } })),
    addBook: () => {
      const state = get();
      const book = createNewBook('', state.user?.user_metadata?.full_name || '');
      set({ books: [book, ...state.books.filter(b => !b.isPlaceholder)],
        activeBookId: book.id, activeChapterId: book.chapters[0].id });
    },
    deleteBook: id => {
      const state = get();
      if (!state.books.some(b => b.id === id)) return;
      const remaining = state.books.filter(b => b.id !== id);
      const books = remaining.length ? remaining : [createPlaceholder(state.user?.user_metadata?.full_name || '')];
      const active = books.find(b => b.id === state.activeBookId) || books[0];
      set({ books, activeBookId: active.id, lastDeletedBook: state.books.find(b => b.id === id)!,
        activeChapterId: active.chapters.some(c => c.id === state.activeChapterId)
          ? state.activeChapterId : active.chapters[0].id });
    },
    restoreBook: () => {
      const state = get(); const deleted = state.lastDeletedBook;
      if (!deleted) return;
      // Undo is an explicit new insertion, even if the cloud deletion already completed.
      const restored = { ...deleted, id: crypto.randomUUID(), cloudVersion: undefined, isPlaceholder: false, updatedAt: Date.now() };
      set({ books: [restored, ...state.books.filter(b => !b.isPlaceholder)], lastDeletedBook: null,
        activeBookId: restored.id, activeChapterId: restored.chapters[0].id });
    },
    restoreChapter: () => {
      const deleted = get().lastDeletedChapter;
      if (!deleted || !get().books.some(b => b.id === deleted.bookId)) return;
      changeBook(deleted.bookId, book => {
        const chapters = [...book.chapters]; chapters.splice(deleted.index, 0, deleted.chapter);
        return { ...book, chapters };
      });
      set({ lastDeletedChapter: null, activeBookId: deleted.bookId, activeChapterId: deleted.chapter.id });
    },
    selectBook: id => {
      const state = get(); const book = state.books.find(b => b.id === id);
      if (!book) return;
      const previous = state.chapterNavigation[id];
      set({ activeBookId: id, activeChapterId: book.chapters.find(c => c.id === previous)?.id || book.chapters[0].id });
    },
    addChapter: () => {
      const state = get(); const chapter = { id: crypto.randomUUID(),
        title: `Глава ${state.getActiveBook().chapters.length + 1}`, content: '' };
      changeBook(state.activeBookId, book => ({ ...book, isPlaceholder: false, chapters: [...book.chapters, chapter] }));
      get().setActiveChapterId(chapter.id);
    },
    deleteChapter: id => {
      const state = get(); const book = state.getActiveBook();
      if (book.chapters.length <= 1 || !book.chapters.some(c => c.id === id)) return;
      set({ lastDeletedChapter: { bookId: book.id, chapter: book.chapters.find(c => c.id === id)!,
        index: book.chapters.findIndex(c => c.id === id) } });
      changeBook(book.id, b => ({ ...b, chapters: b.chapters.filter(c => c.id !== id) }));
      if (state.activeChapterId === id) get().setActiveChapterId(get().getActiveBook().chapters[0].id);
    },
    updateChapterContent: (content, bookId = get().activeBookId, chapterId = get().activeChapterId) => {
      changeBook(bookId, book => book.chapters.find(c => c.id === chapterId)?.content === content ? book : ({
        ...book, chapters: book.chapters.map(c => c.id === chapterId ? { ...c, content } : c),
      }));
    },
    updateChapterTitle: title => {
      const { activeBookId, activeChapterId } = get();
      changeBook(activeBookId, book => ({ ...book, chapters: book.chapters.map(c => c.id === activeChapterId ? { ...c, title } : c) }));
    },
    updateBookMeta: (field, value) => changeBook(get().activeBookId, book => ({ ...book, [field]: value })),
    getActiveBook: () => get().books.find(b => b.id === get().activeBookId) || get().books[0] || initialBook,
    getActiveChapter: () => get().getActiveBook().chapters.find(c => c.id === get().activeChapterId) || get().getActiveBook().chapters[0],
  };
});
