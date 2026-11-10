import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { exportToPDF, exportToDOCX, exportToFB2 } from '../utils/export';
import type { Book } from '../types';

export function useExport() {
  const run = async (exporter: (book: Book) => Promise<void>) => {
    if (useUiStore.getState().isExporting) return;
    useUiStore.setState({ isExporting: true, exportError: null });
    const book = useAppStore.getState().getActiveBook();
    try { await exporter(book); }
    catch { useUiStore.setState({ exportError: 'Не удалось экспортировать произведение. Повторите попытку.' }); }
    finally { useUiStore.setState({ isExporting: false }); }
  };
  return { handleExportPDF: () => run(exportToPDF), handleExportDOCX: () => run(exportToDOCX), handleExportFB2: () => run(exportToFB2) };
}
