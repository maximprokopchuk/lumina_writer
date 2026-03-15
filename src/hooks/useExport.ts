import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { exportToPDF, exportToDOCX, exportToFB2 } from '../utils/export';

export function useExport() {
  const getActiveBook = useAppStore(s => s.getActiveBook);
  const setIsExporting = useUiStore(s => s.setIsExporting);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportToPDF(getActiveBook());
    setTimeout(() => setIsExporting(false), 1000);
  };

  const handleExportDOCX = async () => {
    setIsExporting(true);
    try { await exportToDOCX(getActiveBook()); }
    finally { setIsExporting(false); }
  };

  const handleExportFB2 = () => {
    setIsExporting(true);
    exportToFB2(getActiveBook());
    setTimeout(() => setIsExporting(false), 1000);
  };

  return { handleExportPDF, handleExportDOCX, handleExportFB2 };
}
