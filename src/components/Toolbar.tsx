import { FileText, File as FilePdf, Save, Maximize2, Cloud, CloudOff, Loader2, BookOpen, Menu } from 'lucide-react';
import { cn } from '../utils/lib';
import Auth from './Auth';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';

interface ToolbarProps {
  onSave: () => void;
  onExportPDF: () => void;
  onExportDOCX: () => void;
  onExportFB2: () => void;
}

export default function Toolbar({ onSave, onExportPDF, onExportDOCX, onExportFB2 }: ToolbarProps) {
  const user = useAppStore(s => s.user);
  const isSaving = useUiStore(s => s.isSaving);
  const isExporting = useUiStore(s => s.isExporting);
  const isCloudSyncing = useUiStore(s => s.isCloudSyncing);
  const setIsFocusMode = useUiStore(s => s.setIsFocusMode);
  const setIsReadingMode = useUiStore(s => s.setIsReadingMode);
  const setIsMobileSidebarOpen = useUiStore(s => s.setIsMobileSidebarOpen);

  return (
    <div className="h-14 border-b border-stone-200 bg-white flex items-center justify-between px-3 md:px-6 sticky top-0 z-10 gap-1">
      {/* Left */}
      <div className="flex items-center gap-1 md:gap-2">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden p-2 rounded-md text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
          title="Главы"
        >
          <Menu size={20} />
        </button>

        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Save size={16} />
          <span className="hidden md:inline">{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
        </button>

        <button
          onClick={() => setIsFocusMode(true)}
          className="hidden sm:flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors cursor-pointer"
          title="Режим фокусировки"
        >
          <Maximize2 size={16} />
          <span className="hidden md:inline">Фокус</span>
        </button>

        <button
          onClick={() => setIsReadingMode(true)}
          className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors cursor-pointer"
          title="Режим чтения"
        >
          <BookOpen size={16} />
          <span className="hidden md:inline">Читать</span>
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 md:gap-2">
        <div className="hidden sm:block h-6 w-px bg-stone-200 mx-1" />

        <button
          onClick={onExportPDF}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
          title="Экспорт PDF"
        >
          {isExporting
            ? <Loader2 size={16} className="animate-spin text-red-400" />
            : <FilePdf size={16} className="text-red-500" />}
          <span className="hidden md:inline">PDF</span>
        </button>

        <button
          onClick={onExportDOCX}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
          title="Экспорт DOCX"
        >
          {isExporting
            ? <Loader2 size={16} className="animate-spin text-blue-400" />
            : <FileText size={16} className="text-blue-500" />}
          <span className="hidden md:inline">DOCX</span>
        </button>

        <button
          onClick={onExportFB2}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
          title="Экспорт FB2"
        >
          {isExporting
            ? <Loader2 size={16} className="animate-spin text-orange-400" />
            : <FileText size={16} className="text-orange-500" />}
          <span className="hidden md:inline">FB2</span>
        </button>

        <div className="hidden sm:block h-6 w-px bg-stone-200 mx-1" />

        <div className={cn(
          'flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          user
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            : 'bg-stone-100 text-stone-500 border border-stone-200',
        )}>
          {isCloudSyncing ? (
            <>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              <span className="hidden sm:inline">Синхронизация...</span>
            </>
          ) : user ? (
            <>
              <Cloud size={14} className="shrink-0" />
              <span className="hidden sm:inline">Облако</span>
            </>
          ) : (
            <>
              <CloudOff size={14} className="shrink-0" />
              <span className="hidden sm:inline">Локально</span>
            </>
          )}
        </div>

        <Auth />
      </div>
    </div>
  );
}
