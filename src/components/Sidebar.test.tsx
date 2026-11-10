import { act, Profiler } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import { useAppStore } from '../store/useAppStore';

it('does not rerender chapter navigation for every character typed', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  useAppStore.setState(useAppStore.getInitialState(), true);
  useAppStore.getState().addBook();
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); const render = vi.fn();
  try {
    await act(async () => root.render(<Profiler id="sidebar" onRender={render}><Sidebar /></Profiler>));
    const before = render.mock.calls.length;
    act(() => useAppStore.getState().updateChapterContent('<p>Новая буква</p>'));
    expect(render.mock.calls.length).toBe(before);
    act(() => useAppStore.getState().updateChapterTitle('Пролог'));
    expect(container.textContent).toContain('Пролог');
  } finally { await act(async () => root.unmount()); container.remove(); }
});
