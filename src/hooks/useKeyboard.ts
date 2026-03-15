import { useEffect } from 'react';
import { useUiStore } from '../store/useUiStore';

export function useKeyboard() {
  const isFocusMode = useUiStore(s => s.isFocusMode);
  const setIsFocusMode = useUiStore(s => s.setIsFocusMode);
  const setIsReadingMode = useUiStore(s => s.setIsReadingMode);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFocusMode) setIsFocusMode(false);
        else setIsReadingMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, setIsFocusMode, setIsReadingMode]);
}
