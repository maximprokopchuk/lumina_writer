import { beforeEach, expect, it } from 'vitest';
import { useAppStore } from './useAppStore';

beforeEach(() => useAppStore.setState(useAppStore.getInitialState(), true));

it('reuses the placeholder while typing empty markup, and materializes actual text', () => {
  const store = useAppStore.getState(); const id = store.activeBookId;
  store.updateChapterContent('<p></p>');
  expect(useAppStore.getState().getActiveBook().isPlaceholder).toBe(true);
  store.updateChapterContent('<p>История</p>');
  expect(useAppStore.getState().getActiveBook().id).toBe(id);
  expect(useAppStore.getState().getActiveBook().isPlaceholder).toBe(false);
});

it('keeps an explicitly created empty project and restores deleted text under a new UUID', () => {
  useAppStore.getState().addBook();
  const book = useAppStore.getState().getActiveBook();
  expect(book.isPlaceholder).not.toBe(true);
  useAppStore.getState().deleteBook(book.id);
  expect(useAppStore.getState().getActiveBook().isPlaceholder).toBe(true);
  useAppStore.getState().restoreBook();
  const restored = useAppStore.getState().getActiveBook();
  expect(restored.id).not.toBe(book.id);
  expect(restored.chapters).toEqual(book.chapters);
  expect(restored.cloudVersion).toBeUndefined();
});

it('remembers the chapter when returning to another project and can undo a chapter deletion', () => {
  useAppStore.getState().addBook(); useAppStore.getState().addChapter();
  const first = useAppStore.getState().activeBookId;
  const chapter = useAppStore.getState().activeChapterId;
  useAppStore.getState().addBook(); useAppStore.getState().selectBook(first);
  expect(useAppStore.getState().activeChapterId).toBe(chapter);
  useAppStore.getState().deleteChapter(chapter);
  useAppStore.getState().restoreChapter();
  expect(useAppStore.getState().activeChapterId).toBe(chapter);
  expect(useAppStore.getState().getActiveBook().chapters).toHaveLength(2);
});

it('binds late editor updates to their source chapter instead of the current selection', () => {
  useAppStore.getState().addBook();
  const book = useAppStore.getState().getActiveBook();
  useAppStore.getState().addChapter();
  const active = useAppStore.getState().activeChapterId;
  useAppStore.getState().updateChapterContent('<p>Правка старой главы</p>', book.id, book.chapters[0].id);
  expect(useAppStore.getState().getActiveBook().chapters.find(c => c.id === active)?.content).toBe('');
});
