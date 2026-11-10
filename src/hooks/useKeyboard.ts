import { useEffect } from 'react';
import { useUiStore } from '../store/useUiStore';

export function useKeyboard() {
  const isFocusMode = useUiStore(s => s.isFocusMode);
  const setIsFocusMode = useUiStore(s => s.setIsFocusMode);
  const setIsReadingMode = useUiStore(s => s.setIsReadingMode);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const ui = useUiStore.getState();
        if (ui.isLibraryOpen) ui.setIsLibraryOpen(false);
        else if (ui.isMobileSidebarOpen) ui.setIsMobileSidebarOpen(false);
        else if (ui.isReadingMode) setIsReadingMode(false);
        else if (isFocusMode) setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, setIsFocusMode, setIsReadingMode]);
}
