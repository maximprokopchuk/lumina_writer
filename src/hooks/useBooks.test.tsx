import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { useBooks } from './useBooks';
import { useSync } from './useSync';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';
import { fetchBooks } from '../lib/api';
import { LocalLibrary } from '../lib/local-library';
import { Book } from '../types';

vi.mock('../lib/supabase', () => ({ isSupabaseConfigured: true }));
vi.mock('../lib/api', () => ({
  fetchBooks: vi.fn().mockResolvedValue([]),
  saveBook: vi.fn().mockResolvedValue('2026-11-10T00:00:00.000Z'),
  deleteCloudBook: vi.fn().mockResolvedValue(undefined),
}));

let save: () => Promise<void>;
let root: Root;
let container: HTMLDivElement;
const user = (id: string) => ({ id, user_metadata: {} } as User);
function Harness() {
  const { engineRef } = useBooks();
  save = useSync(engineRef).manualSave;
  return null;
}
async function mount(account: User | null = null) {
  useAppStore.setState({ user: account, authReady: true });
  await act(async () => root.render(<Harness />));
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear(); vi.mocked(fetchBooks).mockReset().mockResolvedValue([]);
  useAppStore.setState(useAppStore.getInitialState(), true);
  useUiStore.setState(useUiStore.getInitialState(), true);
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });

it('persists guest typing immediately and retains the last edit after unmount', async () => {
  await mount();
  act(() => { useAppStore.getState().addBook(); useAppStore.getState().updateChapterContent('<p>Последняя буква</p>'); });
  expect(new LocalLibrary('guest').read()[0].book.chapters[0].content).toBe('<p>Последняя буква</p>');
  expect(fetchBooks).not.toHaveBeenCalled();
});

it('a failed manual save always releases the saving button', async () => {
  vi.mocked(fetchBooks).mockRejectedValue(new Error('offline'));
  await mount(user('a'));
  act(() => useAppStore.getState().addBook());
  await act(async () => save());
  expect(useUiStore.getState().isSaving).toBe(false);
  expect(useUiStore.getState().cloudSaveError).toBeTruthy();
  expect(new LocalLibrary('a').read()).toHaveLength(1);
});

it('does not publish an old account response into the next account', async () => {
  let resolve!: (books: Book[]) => void;
  vi.mocked(fetchBooks).mockImplementation(id => id === 'a' ? new Promise(r => { resolve = r; }) : Promise.resolve([]));
  await mount(user('a'));
  act(() => { useAppStore.getState().addBook(); useAppStore.getState().updateBookMeta('title', 'Аккаунт А'); });
  const saved = useAppStore.getState().getActiveBook();
  await act(async () => useAppStore.getState().setUser(user('b')));
  await act(async () => resolve([{ ...saved, cloudVersion: '2026-11-10T00:00:00.000Z' }]));
  expect(useAppStore.getState().books.some(b => b.title === 'Аккаунт А')).toBe(false);
  expect(new LocalLibrary('a').read()[0].book.title).toBe('Аккаунт А');
  expect(new LocalLibrary('b').read()).toEqual([]);
});

it('does not reload or reset the chapter when the auth token refreshes for the same user', async () => {
  await mount(user('a'));
  act(() => { useAppStore.getState().addBook(); useAppStore.getState().addChapter(); });
  const chapter = useAppStore.getState().activeChapterId;
  const count = vi.mocked(fetchBooks).mock.calls.length;
  await act(async () => useAppStore.getState().setUser(user('a')));
  expect(fetchBooks).toHaveBeenCalledTimes(count);
  expect(useAppStore.getState().activeChapterId).toBe(chapter);
});

it('transfers guest drafts durably without deleting the old-format backup', async () => {
  const old = { id: crypto.randomUUID(), title: 'Черновик', author: '', updatedAt: 1,
    chapters: [{ id: '1', title: 'Глава 1', content: '<p>Текст</p>' }] };
  localStorage.setItem('lumina_library', JSON.stringify([old]));
  vi.mocked(fetchBooks).mockRejectedValue(new Error('offline'));
  await mount(user('a'));
  expect(new LocalLibrary('a').read()[0].book.title).toBe('Черновик');
  expect(new LocalLibrary('guest').read()).toEqual([]);
  expect(localStorage.getItem('lumina_library')).toBe(JSON.stringify([old]));
});
