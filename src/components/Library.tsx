import { useMemo, useRef, useState } from 'react';
import { Plus, Trash2, BookOpen, X, RotateCcw, CopyCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { duplicateCandidates } from '../utils/duplicates';
import { useDialog } from '../hooks/useDialog';

export default function Library({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  useDialog(dialog);
  const allBooks = useAppStore(s => s.books);
  const activeBookId = useAppStore(s => s.activeBookId);
  const lastDeleted = useAppStore(s => s.lastDeletedBook);
  const [review, setReview] = useState(false);
  const books = useMemo(() => allBooks.filter(b => !b.isPlaceholder).sort((a, b) => b.updatedAt - a.updatedAt), [allBooks]);
  const candidates = useMemo(() => duplicateCandidates(books), [books]);
  const visible = review ? books.filter(b => candidates.has(b.id)) : books;
  const open = (id: string) => { useAppStore.getState().selectBook(id); onClose(); };
  const add = () => { useAppStore.getState().addBook(); onClose(); };
  return (
    <motion.div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="library-title" tabIndex={-1}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-100 p-5 md:p-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[.2em] text-stone-500">Lumina Writer</p>
            <h1 id="library-title" className="text-3xl font-serif font-bold text-stone-800 md:text-4xl">Ваша библиотека</h1>
            <p className="mt-2 text-sm text-stone-500">Продолжайте историю с того места, где остановились.</p>
          </div>
          <button onClick={onClose} aria-label="Закрыть библиотеку" className="rounded-full p-2 hover:bg-stone-200"><X size={22} /></button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={add} className="inline-flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700"><Plus size={18} />Новое произведение</button>
          <button onClick={() => setReview(!review)} aria-pressed={review}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${review ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-stone-300 text-stone-600'}`}>
            <CopyCheck size={16} />{review ? 'Все проекты' : `Проверить дубли · ${candidates.size}`}
          </button>
        </div>
        {lastDeleted && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm">
            <span>«{lastDeleted.title || 'Без названия'}» удалено.</span>
            <button onClick={() => useAppStore.getState().restoreBook()} className="inline-flex items-center gap-2 text-stone-700 underline"><RotateCcw size={15} />Отменить удаление</button>
          </div>
        )}
        {review && <p className="max-w-2xl text-sm text-stone-600">Здесь пустые проекты и произведения с одинаковым названием и текстом. Откройте проект перед удалением. Автоматически ничего не удаляется.</p>}
        {!visible.length && <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
          {review ? 'Подозрительных дублей нет.' : 'Ваша первая история начинается здесь.'}
        </div>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map(book => (
            <article key={book.id} className={`group relative flex min-h-56 flex-col rounded-xl border bg-white shadow-sm ${activeBookId === book.id ? 'border-stone-700' : 'border-stone-200'}`}>
              <button onClick={() => open(book.id)} className="flex flex-1 flex-col items-start p-5 text-left" aria-label={`Открыть ${book.title || 'Без названия'}`}>
                <BookOpen size={22} className="mb-5 text-stone-400" />
                <h2 className="line-clamp-2 pr-5 font-serif text-xl font-bold">{book.title || 'Без названия'}</h2>
                <p className="mt-1 text-sm italic text-stone-500">{book.author || 'Автор не указан'}</p>
                {review && <span className="mt-3 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{candidates.get(book.id)}</span>}
                {book.recoveryOf && <span className="mt-3 text-xs text-amber-800">Сохранённая версия при конфликте</span>}
                <span className="mt-auto flex w-full justify-between gap-2 pt-5 text-xs text-stone-400">
                  <span>{new Date(book.updatedAt).toLocaleDateString('ru-RU')}</span><span>Глав: {book.chapters.length}</span>
                </span>
              </button>
              <button onClick={() => useAppStore.getState().deleteBook(book.id)} aria-label={`Удалить ${book.title || 'Без названия'}`}
                title="Удалить проект" className="absolute right-3 top-3 rounded-md p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 focus-visible:text-red-600"><Trash2 size={17} /></button>
            </article>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
