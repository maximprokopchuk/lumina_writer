import { beforeEach, expect, it, vi } from 'vitest';
import { useExport } from './useExport';
import { useUiStore } from '../store/useUiStore';
import { useAppStore } from '../store/useAppStore';
import { exportToDOCX } from '../utils/export';

vi.mock('../utils/export', () => ({ exportToPDF: vi.fn(), exportToDOCX: vi.fn(), exportToFB2: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); useUiStore.setState(useUiStore.getInitialState(), true); });
it('releases the export control and shows an error when a deferred exporter fails', async () => {
  vi.mocked(exportToDOCX).mockRejectedValue(new Error('failed'));
  await useExport().handleExportDOCX();
  expect(useUiStore.getState().isExporting).toBe(false);
  expect(useUiStore.getState().exportError).toBeTruthy();
});
it('exports the original manuscript snapshot and prevents overlapping exports', async () => {
  let resolve!: () => void;
  vi.mocked(exportToDOCX).mockReturnValue(new Promise(r => { resolve = r; }));
  const selected = useAppStore.getState().getActiveBook();
  const exporter = useExport(); const pending = exporter.handleExportDOCX();
  useAppStore.getState().addBook();
  await exporter.handleExportDOCX();
  expect(exportToDOCX).toHaveBeenCalledOnce();
  expect(exportToDOCX).toHaveBeenCalledWith(selected);
  resolve(); await pending;
  expect(useUiStore.getState().isExporting).toBe(false);
});
