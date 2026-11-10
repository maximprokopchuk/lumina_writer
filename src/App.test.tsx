import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import App from './App';
import { LocalLibrary } from './lib/local-library';
import { useAppStore } from './store/useAppStore';

it('opens under StrictMode and retains the last typed text across an immediate restart', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); sessionStorage.clear();
  useAppStore.setState(useAppStore.getInitialState(), true);
  const container = document.createElement('div'); document.body.appendChild(container);
  let root = createRoot(container);
  try {
    await act(async () => root.render(<StrictMode><App /></StrictMode>));
    expect(new LocalLibrary('guest').read()).toEqual([]);
    const editor = (container.querySelector('.ProseMirror') as HTMLElement & { editor: Editor }).editor;
    act(() => editor.commands.insertContent('Последние слова перед закрытием'));
    expect(new LocalLibrary('guest').read()[0].book.chapters[0].content).toContain('Последние слова');
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<StrictMode><App /></StrictMode>));
    expect(container.querySelector('.ProseMirror')?.textContent).toContain('Последние слова');
    expect(useAppStore.getState().books.filter(b => !b.isPlaceholder)).toHaveLength(1);
  } finally { await act(async () => root.unmount()); container.remove(); }
});
