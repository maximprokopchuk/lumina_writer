import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Book } from '../types';

interface ReadingViewProps {
  book: Book;
  onClose: () => void;
}

export default function ReadingView({ book, onClose }: ReadingViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-amber-50/95 backdrop-blur-sm overflow-y-auto"
      ref={scrollRef}
    >
      {/* Exit button */}
      <button
        onClick={onClose}
        title="Закрыть (Esc)"
        className="fixed top-5 right-6 z-10 p-2 rounded-full bg-white/80 border border-stone-200 text-stone-400 hover:text-stone-700 hover:bg-white transition-all shadow-sm cursor-pointer"
      >
        <X size={18} />
      </button>

      <div className="max-w-[680px] mx-auto px-6 py-20">
        {/* Title page block */}
        <div className="text-center mb-20">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-stone-900 mb-4 leading-tight">
            {book.title || 'Без названия'}
          </h1>
          {book.author && (
            <p className="font-serif text-xl text-stone-500 italic">{book.author}</p>
          )}
        </div>

        {/* Chapters */}
        {book.chapters.map((chapter, index) => (
          <div key={chapter.id} className={index > 0 ? 'mt-20' : ''}>
            {/* Chapter title */}
            <div className="flex items-center gap-4 mb-10">
              <div className="flex-1 h-px bg-stone-300" />
              <h2 className="font-serif text-sm uppercase tracking-[0.25em] text-stone-400 font-medium whitespace-nowrap">
                {chapter.title || `Глава ${index + 1}`}
              </h2>
              <div className="flex-1 h-px bg-stone-300" />
            </div>

            {/* Chapter content */}
            <div
              className="reading-content font-serif text-[17px] leading-[1.9] text-stone-800"
              dangerouslySetInnerHTML={{ __html: chapter.content || '' }}
            />
          </div>
        ))}

        {/* End mark */}
        <div className="mt-24 flex justify-center">
          <span className="text-stone-300 text-2xl select-none">✦</span>
        </div>
      </div>

      <style>{`
        .reading-content p {
          margin: 0;
          text-indent: 1.5em;
          text-align: justify;
        }
        .reading-content p + p {
          margin-top: 0;
        }
        .reading-content p[style*="text-align: center"],
        .reading-content p[style*="text-align:center"] {
          text-indent: 0;
          text-align: center;
        }
        .reading-content p[style*="text-align: right"],
        .reading-content p[style*="text-align:right"] {
          text-indent: 0;
          text-align: right;
        }
        .reading-content p[style*="text-align: left"],
        .reading-content p[style*="text-align:left"] {
          text-indent: 0;
          text-align: left;
        }
        .reading-content h1, .reading-content h2, .reading-content h3 {
          font-weight: bold;
          margin: 1.5em 0 0.5em;
          text-indent: 0;
        }
        .reading-content h1 { font-size: 1.4em; }
        .reading-content h2 { font-size: 1.2em; }
        .reading-content h3 { font-size: 1.05em; }
        .reading-content strong { font-weight: bold; }
        .reading-content em { font-style: italic; }
        .reading-content u { text-decoration: underline; }
        .reading-content ul, .reading-content ol {
          margin: 0.5em 0;
          padding-left: 2em;
          text-indent: 0;
        }
        .reading-content blockquote {
          margin: 1em 2em;
          font-style: italic;
          color: #78716c;
        }
      `}</style>
    </motion.div>
  );
}
