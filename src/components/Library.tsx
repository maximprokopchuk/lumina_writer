import { Plus, Trash2, Book as BookIcon, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../utils/lib';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';

interface LibraryProps {
  onClose: () => void;
}

export default function Library({ onClose }: LibraryProps) {
  const books = useAppStore(s => s.books);
  const activeBookId = useAppStore(s => s.activeBookId);
  const addBook = useAppStore(s => s.addBook);
  const deleteBook = useAppStore(s => s.deleteBook);
  const selectBook = useAppStore(s => s.selectBook);
  const setIsLibraryOpen = useUiStore(s => s.setIsLibraryOpen);

  const handleAddBook = () => {
    addBook();
    setIsLibraryOpen(false);
  };

  const handleSelectBook = (id: string) => {
    selectBook(id);
    setIsLibraryOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-stone-100/95 backdrop-blur-md flex flex-col p-8 md:p-16 overflow-y-auto"
    >
      <div className="max-w-5xl mx-auto w-full space-y-12">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-serif font-bold text-stone-800">Ваша библиотека</h1>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
          >
            Закрыть
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={handleAddBook}
            className="h-64 border-2 border-dashed border-stone-300 rounded-2xl flex flex-col items-center justify-center gap-4 text-stone-400 hover:text-stone-600 hover:border-stone-400 hover:bg-white/50 transition-all group"
          >
            <div className="p-4 bg-stone-200 rounded-full group-hover:scale-110 transition-transform">
              <Plus size={32} />
            </div>
            <span className="font-medium">Новое произведение</span>
          </button>

          {[...books].sort((a, b) => b.updatedAt - a.updatedAt).map((book) => (
            <div
              key={book.id}
              onClick={() => handleSelectBook(book.id)}
              className={cn(
                'h-64 bg-white rounded-2xl p-6 shadow-sm border transition-all cursor-pointer flex flex-col justify-between group relative',
                activeBookId === book.id
                  ? 'border-stone-800 ring-1 ring-stone-800'
                  : 'border-stone-200 hover:shadow-md hover:border-stone-300'
              )}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <BookIcon size={24} className="text-stone-400" />
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteBook(book.id); }}
                    className="p-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <h3 className="text-xl font-serif font-bold text-stone-800 line-clamp-2">
                  {book.title || 'Без названия'}
                </h3>
                <p className="text-stone-500 text-sm italic">
                  {book.author || 'Автор не указан'}
                </p>
              </div>

              <div className="flex items-center justify-between text-stone-400 text-xs mt-4">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{new Date(book.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{book.chapters.length} глав</span>
                  <ChevronRight size={14} />
                </div>
              </div>

              {activeBookId === book.id && (
                <div className="absolute top-4 right-4 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
