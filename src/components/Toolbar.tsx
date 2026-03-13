import { Download, FileText, File as FilePdf, Save, Maximize2 } from 'lucide-react';
import { cn } from '../utils/lib';

interface ToolbarProps {
  onExportPDF: () => void;
  onExportDOCX: () => void;
  onSave: () => void;
  isSaving?: boolean;
  onToggleFocus: () => void;
}

export default function Toolbar({ onExportPDF, onExportDOCX, onSave, isSaving, onToggleFocus }: ToolbarProps) {
  return (
    <div className="h-14 border-b border-stone-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
        
        <button
          onClick={onToggleFocus}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors"
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
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors"
        >
          <FilePdf size={16} className="text-red-500" />
          <span>PDF</span>
        </button>
        
        <button
          onClick={onExportDOCX}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-md transition-colors"
        >
          <FileText size={16} className="text-blue-500" />
          <span>DOCX</span>
        </button>
        
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 rounded-md transition-colors">
            <Download size={16} />
            <span>Экспорт</span>
          </button>
          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-stone-200 rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all transform origin-top-right scale-95 group-hover:scale-100">
             <button onClick={onExportPDF} className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 flex items-center gap-2">
               <FilePdf size={14} /> PDF Document
             </button>
             <button onClick={onExportDOCX} className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 flex items-center gap-2">
               <FileText size={14} /> Word Document
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
