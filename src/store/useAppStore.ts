import { create } from 'zustand';
import { Book, Chapter } from '../types';

// ---------------------------------------------------------------------------
// Helpers (moved from App.tsx)
// ---------------------------------------------------------------------------

export const isBookEmpty = (book: Book): boolean =>
  !book.title.trim() &&
  !book.author.trim() &&
  book.chapters.every(c => !c.content.trim());

export const createNewBook = (title = '', author = ''): Book => ({
  id: crypto.randomUUID(),
  title,
  author,
  updatedAt: Date.now(),
  chapters: [{ id: '1', title: 'Глава 1', content: '' }],
});

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface AppState {
  // Auth
  user: any | null;
  setUser: (user: any | null) => void;

  // Books
  books: Book[];
  setBooks: (books: Book[] | ((prev: Book[]) => Book[])) => void;
  activeBookId: string;
  setActiveBookId: (id: string) => void;
  activeChapterId: string;
  setActiveChapterId: (id: string) => void;

  // Book actions (pure state mutations — no async side effects)
  addBook: () => void;
  deleteBook: (id: string) => void;
  selectBook: (id: string) => void;
  addChapter: () => void;
  deleteChapter: (id: string) => void;
  updateChapterContent: (content: string) => void;
  updateChapterTitle: (title: string) => void;
  updateBookMeta: (field: 'title' | 'author', value: string) => void;

  // Derived state helpers
  getActiveBook: () => Book;
  getActiveChapter: () => Chapter;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),

  books: [],
  setBooks: (books) =>
    set(state => ({ books: typeof books === 'function' ? books(state.books) : books })),
  activeBookId: '',
  setActiveBookId: (activeBookId) => set({ activeBookId }),
  activeChapterId: '',
  setActiveChapterId: (activeChapterId) => set({ activeChapterId }),

  // ---- Book actions -------------------------------------------------------

  addBook: () => {
    const { user, books, setActiveBookId, setActiveChapterId } = get();
    const defaultAuthor = user?.user_metadata?.full_name || '';
    const newBook = createNewBook('', defaultAuthor);
    set({ books: [newBook, ...books] });
    setActiveBookId(newBook.id);
    setActiveChapterId(newBook.chapters[0].id);
    // UI state should be handled by the component using useUiStore
  },

  deleteBook: (id: string) => {
    const { books, activeBookId, setActiveBookId, setActiveChapterId } = get();
    if (books.length <= 1) return;
    const newBooks = books.filter(b => b.id !== id);
    set({ books: newBooks });
    if (activeBookId === id) {
      setActiveBookId(newBooks[0].id);
      setActiveChapterId(newBooks[0].chapters[0].id);
    }
  },

  selectBook: (id: string) => {
    const { books, setActiveBookId, setActiveChapterId } = get();
    setActiveBookId(id);
    const book = books.find(b => b.id === id);
    if (book) setActiveChapterId(book.chapters[0].id);
    // UI state should be handled by the component using useUiStore
  },

  addChapter: () => {
    const { activeBookId, activeChapterId: _ac, setActiveChapterId } = get();
    const activeBook = get().getActiveBook();
    const newId = crypto.randomUUID();
    const newChapter: Chapter = {
      id: newId,
      title: `Глава ${activeBook.chapters.length + 1}`,
      content: '',
    };
    set(state => ({
      books: state.books.map(b =>
        b.id === activeBookId
          ? { ...b, chapters: [...b.chapters, newChapter], updatedAt: Date.now() }
          : b
      ),
    }));
    setActiveChapterId(newId);
  },

  deleteChapter: (id: string) => {
    const { activeBookId, activeChapterId, setActiveChapterId } = get();
    const activeBook = get().getActiveBook();
    if (activeBook.chapters.length <= 1) return;
    const newChapters = activeBook.chapters.filter(c => c.id !== id);
    set(state => ({
      books: state.books.map(b =>
        b.id === activeBookId
          ? { ...b, chapters: newChapters, updatedAt: Date.now() }
          : b
      ),
    }));
    if (activeChapterId === id) setActiveChapterId(newChapters[0].id);
  },

  updateChapterContent: (content: string) => {
    const { activeBookId, activeChapterId } = get();
    set(state => ({
      books: state.books.map(b =>
        b.id === activeBookId
          ? {
              ...b,
              updatedAt: Date.now(),
              chapters: b.chapters.map(c =>
                c.id === activeChapterId ? { ...c, content } : c
              ),
            }
          : b
      ),
    }));
  },

  updateChapterTitle: (title: string) => {
    const { activeBookId, activeChapterId } = get();
    set(state => ({
      books: state.books.map(b =>
        b.id === activeBookId
          ? {
              ...b,
              updatedAt: Date.now(),
              chapters: b.chapters.map(c =>
                c.id === activeChapterId ? { ...c, title } : c
              ),
            }
          : b
      ),
    }));
  },

  updateBookMeta: (field: 'title' | 'author', value: string) => {
    const { activeBookId } = get();
    set(state => ({
      books: state.books.map(b =>
        b.id === activeBookId ? { ...b, [field]: value, updatedAt: Date.now() } : b
      ),
    }));
  },

  // ---- Derived helpers ----------------------------------------------------

  getActiveBook: () => {
    const { books, activeBookId, user } = get();
    return (
      books.find(b => b.id === activeBookId) ||
      books[0] ||
      createNewBook('', user?.user_metadata?.full_name || '')
    );
  },

  getActiveChapter: () => {
    const { activeChapterId } = get();
    const book = get().getActiveBook();
    return book.chapters.find(c => c.id === activeChapterId) || book.chapters[0];
  },
}));
