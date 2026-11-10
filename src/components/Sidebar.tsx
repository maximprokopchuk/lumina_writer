import { Plus, Trash2, Book as BookIcon, ChevronRight, Library as LibraryIcon, X } from 'lucide-react';
import { cn } from '../utils/lib';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const activeChapterId = useAppStore(s => s.activeChapterId);
  const setActiveChapterId = useAppStore(s => s.setActiveChapterId);
  const setIsLibraryOpen = useUiStore(s => s.setIsLibraryOpen);
  const addChapter = useAppStore(s => s.addChapter);
  const deleteChapter = useAppStore(s => s.deleteChapter);
  const lastDeletedChapter = useAppStore(s => s.lastDeletedChapter);
  const getActiveBook = useAppStore(s => s.getActiveBook);

  const activeBook = getActiveBook();
  const chapters = activeBook.chapters;

  const handleSelectChapter = (id: string) => {
    setActiveChapterId(id);
    onClose?.();
  };

  const handleOpenLibrary = () => {
    setIsLibraryOpen(true);
    onClose?.();
  };

  return (
    <div className="w-64 h-full bg-stone-50 border-r border-stone-200 flex flex-col">
      <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-white">
        <button
          onClick={handleOpenLibrary}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors font-medium text-sm cursor-pointer"
        >
          <LibraryIcon size={18} />
          <span>Библиотека</span>
        </button>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 text-stone-400 hover:text-stone-700 cursor-pointer">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
        <div className="flex items-center gap-2 text-stone-500 font-semibold text-xs uppercase tracking-wider">
          <BookIcon size={14} />
          <span>Главы</span>
        </div>
        <button
          onClick={addChapter}
          className="p-1 hover:bg-stone-200 rounded-md transition-colors text-stone-600"
          title="Добавить главу"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            className={cn(
              'group flex items-center justify-between p-2 rounded-md cursor-pointer transition-all',
              activeChapterId === chapter.id
                ? 'bg-stone-200 text-stone-900 shadow-sm'
                : 'hover:bg-stone-100 text-stone-600'
            )}
          >
            <button onClick={() => handleSelectChapter(chapter.id)} aria-current={activeChapterId === chapter.id ? 'page' : undefined}
              className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left">
              <ChevronRight
                size={14}
                className={cn('transition-transform', activeChapterId === chapter.id ? 'rotate-90' : '')}
              />
              <span className="truncate text-sm font-medium">
                {chapter.title || 'Без названия'}
              </span>
            </button>
            {chapters.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteChapter(chapter.id); }}
                aria-label={`Удалить главу ${chapter.title}`}
                className="p-1 text-stone-400 hover:text-red-500 focus-visible:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {lastDeletedChapter && (
        <button onClick={() => useAppStore.getState().restoreChapter()} className="mx-3 mb-3 rounded-md border border-stone-200 px-2 py-2 text-xs text-stone-600 hover:bg-stone-100">
          Отменить удаление главы
        </button>
      )}

      <div className="p-4 border-t border-stone-200 flex items-center justify-center">
        <img src="/logo.svg" alt="Lumina Writer" className="h-7 select-none opacity-80" draggable={false} />
      </div>
    </div>
  );
}
