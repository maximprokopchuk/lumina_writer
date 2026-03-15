import { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import Library from './components/Library';
import Auth from './components/Auth';
import ReadingView from './components/ReadingView';
import { Book, Chapter } from './types';
import { exportToPDF, exportToDOCX } from './utils/export';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, Cloud, CloudOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { cn } from './utils/lib';

const isBookEmpty = (book: Book) =>
  !book.title.trim() &&
  !book.author.trim() &&
  book.chapters.every(c => !c.content.trim());

const createNewBook = (title: string = '', author: string = ''): Book => ({
  id: crypto.randomUUID(),
  title,
  author,
  updatedAt: Date.now(),
  chapters: [
    {
      id: '1',
      title: 'Глава 1',
      content: '',
    },
  ],
});

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBookId, setActiveBookId] = useState<string>('');
  const [activeChapterId, setActiveChapterId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  // Timestamp последней загрузки из облака — auto-save пропускает cloud sync
  // в течение 3с после загрузки, чтобы не записывать обратно то, что только что прочитали
  const lastCloudLoadRef = useRef(0);

  // Auth listener — только onAuthStateChange (он сам испускает INITIAL_SESSION,
  // поэтому getSession() не нужен и не вызывает двойной loadData)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      if (user && isSupabaseConfigured) {
        setIsCloudSyncing(true);
        try {
          // Миграция из localStorage → БД.
          // Читаем и сразу синхронно удаляем, чтобы повторный запуск эффекта
          // (onAuthStateChange может сработать дважды) не создавал дубликаты.
          const localRaw = localStorage.getItem('lumina_library');
          localStorage.removeItem('lumina_library');
          localStorage.removeItem('lumina_active_book');
          localStorage.removeItem('lumina_book');

          if (localRaw) {
            try {
              const localBooks: Book[] = JSON.parse(localRaw);
              const booksToMigrate = localBooks.filter(b => !isBookEmpty(b));
              for (const book of booksToMigrate) {
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

          // Загружаем из БД
          const { data, error } = await supabase
            .from('books')
            .select('*')
            .order('updated_at', { ascending: false });

          if (error) throw error;

          if (data && data.length > 0) {
            const formattedBooks: Book[] = data.map(b => ({
              id: b.id,
              title: b.title,
              author: b.author,
              updatedAt: new Date(b.updated_at).getTime(),
              chapters: b.chapters,
            }));
            // Помечаем время загрузки, чтобы auto-save не писал обратно то, что только получили
            lastCloudLoadRef.current = Date.now();
            setBooks(formattedBooks);
            setActiveBookId(formattedBooks[0].id);
            setActiveChapterId(formattedBooks[0].chapters[0].id);
          } else {
            const defaultBook = createNewBook('', user.user_metadata?.full_name || '');
            lastCloudLoadRef.current = Date.now();
            setBooks([defaultBook]);
            setActiveBookId(defaultBook.id);
            setActiveChapterId(defaultBook.chapters[0].id);
          }
        } catch (error) {
          console.error('Error loading from cloud:', error);
          const localBooks = getLocalBooks();
          setBooks(localBooks);
        } finally {
          setIsCloudSyncing(false);
        }
      } else {
        const localBooks = getLocalBooks();
        setBooks(localBooks);
        const lastActive = localStorage.getItem('lumina_active_book');
        const initialBookId = lastActive && localBooks.some(b => b.id === lastActive) ? lastActive : localBooks[0].id;
        setActiveBookId(initialBookId);
        const initialBook = localBooks.find(b => b.id === initialBookId) || localBooks[0];
        setActiveChapterId(initialBook.chapters[0].id);
      }
    };

    loadData();
  }, [user]);

  const getLocalBooks = () => {
    const saved = localStorage.getItem('lumina_library');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    const oldBook = localStorage.getItem('lumina_book');
    if (oldBook) {
      try {
        const parsed = JSON.parse(oldBook);
        return [{ ...parsed, id: 'legacy', updatedAt: Date.now() }];
      } catch (e) {}
    }
    const defaultAuthor = user?.user_metadata?.full_name || '';
    return [createNewBook('', defaultAuthor)];
  };

  // Auto-save
  useEffect(() => {
    if (books.length === 0) return;

    const timer = setTimeout(async () => {
      // Не сохраняем пустые книги (только плейсхолдеры) в localStorage
      const booksToSave = books.filter(b => !isBookEmpty(b));
      if (booksToSave.length > 0) {
        localStorage.setItem('lumina_library', JSON.stringify(booksToSave));
        localStorage.setItem('lumina_active_book', activeBookId);
      } else {
        localStorage.removeItem('lumina_library');
        localStorage.removeItem('lumina_active_book');
      }

      if (user && isSupabaseConfigured) {
        // Пропускаем cloud-запись, если данные только что пришли из облака
        if (Date.now() - lastCloudLoadRef.current < 3000) return;

        setIsCloudSyncing(true);
        try {
          for (const book of books) {
            const { error } = await supabase
              .from('books')
              .upsert({
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
  }, [books, activeBookId, user]);

  // Keyboard shortcut for focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  const activeBook = useMemo(() => {
    const defaultAuthor = user?.user_metadata?.full_name || '';
    return books.find(b => b.id === activeBookId) || books[0] || createNewBook('', defaultAuthor);
  }, [books, activeBookId, user]);

  const activeChapter = useMemo(() => 
    activeBook.chapters.find(c => c.id === activeChapterId) || activeBook.chapters[0],
    [activeBook, activeChapterId]
  );

  const handleAddBook = () => {
    const defaultAuthor = user?.user_metadata?.full_name || '';
    const newBook = createNewBook('', defaultAuthor);
    setBooks(prev => [newBook, ...prev]);
    setActiveBookId(newBook.id);
    setActiveChapterId(newBook.chapters[0].id);
    setIsLibraryOpen(false);
  };

  const handleDeleteBook = async (id: string) => {
    if (books.length <= 1) return;
    
    if (user && isSupabaseConfigured) {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) console.error('Delete error:', error);
    }

    const newBooks = books.filter(b => b.id !== id);
    setBooks(newBooks);
    if (activeBookId === id) {
      setActiveBookId(newBooks[0].id);
      setActiveChapterId(newBooks[0].chapters[0].id);
    }
  };

  const handleSelectBook = (id: string) => {
    setActiveBookId(id);
    const book = books.find(b => b.id === id);
    if (book) {
      setActiveChapterId(book.chapters[0].id);
    }
    setIsLibraryOpen(false);
  };

  const handleAddChapter = () => {
    const newId = crypto.randomUUID();
    const newChapter: Chapter = {
      id: newId,
      title: `Глава ${activeBook.chapters.length + 1}`,
      content: '',
    };
    
    setBooks(prev => prev.map(b => 
      b.id === activeBookId 
        ? { ...b, chapters: [...b.chapters, newChapter], updatedAt: Date.now() } 
        : b
    ));
    setActiveChapterId(newId);
  };

  const handleDeleteChapter = (id: string) => {
    if (activeBook.chapters.length <= 1) return;
    const newChapters = activeBook.chapters.filter(c => c.id !== id);
    
    setBooks(prev => prev.map(b => 
      b.id === activeBookId 
        ? { ...b, chapters: newChapters, updatedAt: Date.now() } 
        : b
    ));
    
    if (activeChapterId === id) {
      setActiveChapterId(newChapters[0].id);
    }
  };

  const handleUpdateChapterContent = (content: string) => {
    setBooks(prev => prev.map(b => 
      b.id === activeBookId 
        ? { 
            ...b, 
            updatedAt: Date.now(),
            chapters: b.chapters.map(c => c.id === activeChapterId ? { ...c, content } : c) 
          } 
        : b
    ));
  };

  const handleUpdateChapterTitle = (title: string) => {
    setBooks(prev => prev.map(b => 
      b.id === activeBookId 
        ? { 
            ...b, 
            updatedAt: Date.now(),
            chapters: b.chapters.map(c => c.id === activeChapterId ? { ...c, title } : c) 
          } 
        : b
    ));
  };

  const handleUpdateBookMeta = (field: 'title' | 'author', value: string) => {
    setBooks(prev => prev.map(b => 
      b.id === activeBookId ? { ...b, [field]: value, updatedAt: Date.now() } : b
    ));
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    localStorage.setItem('lumina_library', JSON.stringify(books));
    
    if (user && isSupabaseConfigured) {
      setIsCloudSyncing(true);
      try {
        for (const book of books) {
          await supabase.from('books').upsert({
            id: book.id,
            user_id: user.id,
            title: book.title,
            author: book.author,
            chapters: book.chapters,
            updated_at: new Date(book.updatedAt).toISOString(),
          }, { onConflict: 'id' });
        }
      } finally {
        setIsCloudSyncing(false);
      }
    }
    
    setTimeout(() => setIsSaving(false), 800);
  };

  if (books.length === 0 && !isCloudSyncing) {
    return <div className="h-screen w-screen flex items-center justify-center bg-stone-100 font-serif text-stone-400">Загрузка...</div>;
  }

  return (
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900 overflow-hidden relative">
      <AnimatePresence>
        {isReadingMode && (
          <ReadingView book={activeBook} onClose={() => setIsReadingMode(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLibraryOpen && (
          <Library
            books={books}
            activeBookId={activeBookId}
            onSelectBook={handleSelectBook}
            onAddBook={handleAddBook}
            onDeleteBook={handleDeleteBook}
            onClose={() => setIsLibraryOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar — drawer overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-30 md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 bottom-0 z-40 md:hidden"
              initial={{ x: -264 }} animate={{ x: 0 }} exit={{ x: -264 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <Sidebar
                chapters={activeBook.chapters}
                activeChapterId={activeChapterId}
                onSelectChapter={(id) => { setActiveChapterId(id); setIsMobileSidebarOpen(false); }}
                onAddChapter={handleAddChapter}
                onDeleteChapter={handleDeleteChapter}
                onOpenLibrary={() => { setIsLibraryOpen(true); setIsMobileSidebarOpen(false); }}
                onClose={() => setIsMobileSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <AnimatePresence>
        {!isFocusMode && (
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="z-20 hidden md:block"
          >
            <Sidebar
              chapters={activeBook.chapters}
              activeChapterId={activeChapterId}
              onSelectChapter={setActiveChapterId}
              onAddChapter={handleAddChapter}
              onDeleteChapter={handleDeleteChapter}
              onOpenLibrary={() => setIsLibraryOpen(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence>
          {!isFocusMode && (
            <motion.div
              initial={{ y: -60 }}
              animate={{ y: 0 }}
              exit={{ y: -60 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="z-10"
            >
              <Toolbar
                onExportPDF={() => {
                  setIsExporting(true);
                  exportToPDF(activeBook);
                  setTimeout(() => setIsExporting(false), 1000);
                }}
                onExportDOCX={async () => {
                  setIsExporting(true);
                  try { await exportToDOCX(activeBook); }
                  finally { setIsExporting(false); }
                }}
                onSave={handleManualSave}
                isSaving={isSaving}
                isExporting={isExporting}
                onToggleFocus={() => setIsFocusMode(true)}
                onToggleReading={() => setIsReadingMode(true)}
                onOpenSidebar={() => setIsMobileSidebarOpen(true)}
                user={user}
                isCloudSyncing={isCloudSyncing}
                onSignOut={() => {
                localStorage.removeItem('lumina_library');
                localStorage.removeItem('lumina_active_book');
                localStorage.removeItem('lumina_book');
                const fresh = createNewBook('', '');
                setBooks([fresh]);
                setActiveBookId(fresh.id);
                setActiveChapterId(fresh.chapters[0].id);
              }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Focus Mode Exit Button */}
        {isFocusMode && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setIsFocusMode(false)}
            className="fixed bottom-8 right-8 p-3 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-full shadow-lg hover:bg-white transition-all z-50 text-stone-600 group"
            title="Выйти из режима фокусировки (Esc)"
          >
            <Minimize2 size={20} className="group-hover:scale-110 transition-transform" />
          </motion.button>
        )}

        <main className="flex-1 overflow-y-auto px-4 py-6 md:p-12 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-32">
            {!isFocusMode && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <input
                  type="text"
                  value={activeBook.title}
                  onChange={(e) => handleUpdateBookMeta('title', e.target.value)}
                  className="w-full text-3xl md:text-5xl font-serif font-bold bg-transparent border-none focus:outline-none placeholder:text-stone-300"
                  placeholder="Название произведения"
                />
                <input
                  type="text"
                  value={activeBook.author}
                  onChange={(e) => handleUpdateBookMeta('author', e.target.value)}
                  className="w-full text-xl font-serif text-stone-500 bg-transparent border-none focus:outline-none placeholder:text-stone-300"
                  placeholder="Имя автора"
                />
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeBookId}-${activeChapterId}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4">
                   <div className="h-px flex-1 bg-stone-200" />
                   <input
                    type="text"
                    value={activeChapter.title}
                    onChange={(e) => handleUpdateChapterTitle(e.target.value)}
                    className="text-center text-sm uppercase tracking-[0.2em] font-medium text-stone-400 bg-transparent border-none focus:outline-none w-auto min-w-[200px]"
                    placeholder="Название главы"
                  />
                  <div className="h-px flex-1 bg-stone-200" />
                </div>

                <Editor
                  content={activeChapter.content}
                  onChange={handleUpdateChapterContent}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
