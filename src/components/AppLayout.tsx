import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2 } from 'lucide-react';

import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import Editor from './Editor';
import Library from './Library';
import ReadingView from './ReadingView';

import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { useExport } from '../hooks/useExport';

interface AppLayoutProps {
  manualSave: () => void;
}

export default function AppLayout({ manualSave }: AppLayoutProps) {
  const isCloudSyncing = useUiStore(s => s.isCloudSyncing);
  const isFocusMode = useUiStore(s => s.isFocusMode);
  const setIsFocusMode = useUiStore(s => s.setIsFocusMode);
  const isReadingMode = useUiStore(s => s.isReadingMode);
  const setIsReadingMode = useUiStore(s => s.setIsReadingMode);
  const isLibraryOpen = useUiStore(s => s.isLibraryOpen);
  const setIsLibraryOpen = useUiStore(s => s.setIsLibraryOpen);
  const isMobileSidebarOpen = useUiStore(s => s.isMobileSidebarOpen);
  const setIsMobileSidebarOpen = useUiStore(s => s.setIsMobileSidebarOpen);

  const getActiveBook = useAppStore(s => s.getActiveBook);
  const getActiveChapter = useAppStore(s => s.getActiveChapter);
  const updateBookMeta = useAppStore(s => s.updateBookMeta);
  const updateChapterTitle = useAppStore(s => s.updateChapterTitle);
  const updateChapterContent = useAppStore(s => s.updateChapterContent);
  const books = useAppStore(s => s.books);
  const activeBookId = useAppStore(s => s.activeBookId);
  const activeChapterId = useAppStore(s => s.activeChapterId);

  const activeBook = getActiveBook();
  const activeChapter = getActiveChapter();

  const { handleExportPDF, handleExportDOCX, handleExportFB2 } = useExport();

  if (books.length === 0 && !isCloudSyncing) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-stone-100 font-serif text-stone-400">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900 overflow-hidden relative">
      <AnimatePresence>
        {isReadingMode && (
          <ReadingView book={activeBook} onClose={() => setIsReadingMode(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLibraryOpen && <Library onClose={() => setIsLibraryOpen(false)} />}
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
              <Sidebar onClose={() => setIsMobileSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <AnimatePresence>
        {!isFocusMode && (
          <motion.div
            initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="z-20 hidden md:block"
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence>
          {!isFocusMode && (
            <motion.div
              initial={{ y: -60 }} animate={{ y: 0 }} exit={{ y: -60 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="z-10"
            >
              <Toolbar
                onSave={manualSave}
                onExportPDF={handleExportPDF}
                onExportDOCX={handleExportDOCX}
                onExportFB2={handleExportFB2}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isFocusMode && (
          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
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
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <input
                  type="text"
                  value={activeBook.title}
                  onChange={(e) => updateBookMeta('title', e.target.value)}
                  className="w-full text-3xl md:text-5xl font-serif font-bold bg-transparent border-none focus:outline-none placeholder:text-stone-300"
                  placeholder="Название произведения"
                />
                <input
                  type="text"
                  value={activeBook.author}
                  onChange={(e) => updateBookMeta('author', e.target.value)}
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
                    onChange={(e) => updateChapterTitle(e.target.value)}
                    className="text-center text-sm uppercase tracking-[0.2em] font-medium text-stone-400 bg-transparent border-none focus:outline-none w-auto min-w-[200px]"
                    placeholder="Название главы"
                  />
                  <div className="h-px flex-1 bg-stone-200" />
                </div>

                <Editor
                  content={activeChapter.content}
                  onChange={updateChapterContent}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
