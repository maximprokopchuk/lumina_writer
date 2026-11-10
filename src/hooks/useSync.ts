import { RefObject, useCallback, useEffect } from 'react';
import { SyncEngine } from '../lib/sync-engine';
import { useUiStore } from '../store/useUiStore';

export function useSync(engineRef: RefObject<SyncEngine | null>) {
  const manualSave = useCallback(async () => {
    useUiStore.setState({ isSaving: true });
    try {
      engineRef.current?.retryLocal();
      await engineRef.current?.sync();
    } finally { useUiStore.setState({ isSaving: false }); }
  }, [engineRef]);
  useEffect(() => {
    const save = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault(); void manualSave();
      }
    };
    const warn = (event: BeforeUnloadEvent) => {
      if (useUiStore.getState().localSaveError) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('keydown', save);
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('keydown', save); window.removeEventListener('beforeunload', warn); };
  }, [manualSave]);
  return { manualSave };
}
