import { create } from 'zustand';
import type { SpeechShortcut } from './direct-speech';

const key = 'lumina:editor-preferences';
function initialShortcut(): SpeechShortcut {
  try { return localStorage.getItem(key) === 'alt-shift-d' ? 'alt-shift-d' : 'mod-shift-enter'; }
  catch { return 'mod-shift-enter'; }
}
export const useEditorPreferences = create<{ shortcut: SpeechShortcut; setShortcut: (value: SpeechShortcut) => void }>(set => ({
  shortcut: initialShortcut(),
  setShortcut: shortcut => {
    set({ shortcut });
    try { localStorage.setItem(key, shortcut); } catch { /* Preferences must not block writing. */ }
  },
}));
