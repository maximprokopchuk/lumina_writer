import { FileText, File as FilePdf, Save, Maximize2, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '../utils/lib';
import Auth from './Auth';

interface ToolbarProps {
  onExportPDF: () => void;
  onExportDOCX: () => void;
  onSave: () => void;
  isSaving?: boolean;
  isExporting?: boolean;
  onToggleFocus: () => void;
  user: any;
  isCloudSyncing: boolean;
  onSignOut: () => void;
}

export default function Toolbar({
  onExportPDF,
  onExportDOCX,
  onSave,
  isSaving,
  isExporting,
  onToggleFocus,
  user,
  isCloudSyncing,
  onSignOut
}: ToolbarProps) {
  return (
    <div className="h-14 border-b border-stone-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Save size={16} />
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>

        <button
          onClick={onToggleFocus}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors cursor-pointer"
          title="Режим фокусировки"
        >
          <Maximize2 size={16} />
          <span>Фокус</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-6 w-px bg-stone-200 mx-2" />

        <button
          onClick={onExportPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
        >
          {isExporting ? <Loader2 size={16} className="animate-spin text-red-400" /> : <FilePdf size={16} className="text-red-500" />}
          <span>PDF</span>
        </button>

        <button
          onClick={onExportDOCX}
          disabled={isExporting}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
        >
          {isExporting ? <Loader2 size={16} className="animate-spin text-blue-400" /> : <FileText size={16} className="text-blue-500" />}
          <span>DOCX</span>
        </button>
        
        <div className="flex items-center gap-3 ml-4">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            user ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-stone-100 text-stone-500 border border-stone-200"
          )}>
            {isCloudSyncing ? (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>Синхронизация...</span>
              </div>
            ) : user ? (
              <div className="flex items-center gap-2">
                <Cloud size={14} />
                <span>Облако</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CloudOff size={14} />
                <span>Локально</span>
              </div>
            )}
          </div>
          
          <Auth user={user} onSignOut={onSignOut} />
        </div>
      </div>
    </div>
  );
}
