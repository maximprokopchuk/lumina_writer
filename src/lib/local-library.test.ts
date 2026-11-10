import { beforeEach, expect, it, vi } from 'vitest';
import { LocalLibrary, newLocalBook } from './local-library';
import { createNewBook } from '../utils/book';

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

it('writes only the edited chapter and a small header for a large book', () => {
  const library = new LocalLibrary('guest');
  const book = { ...createNewBook('Роман'), chapters: Array.from({ length: 60 }, (_, i) => ({
    id: String(i), title: `Глава ${i + 1}`, content: `<p>${'Текст '.repeat(2000)}</p>`,
  })) };
  library.write(newLocalBook(book));
  const write = vi.spyOn(Storage.prototype, 'setItem');
  const edited = { ...book, chapters: book.chapters.map((c, i) => i === 30 ? { ...c, content: '<p>Новая глава</p>' } : c) };
  library.write(newLocalBook(edited));
  expect(write).toHaveBeenCalledTimes(2);
  expect(Math.max(...write.mock.calls.map(([, value]) => value.length))).toBeLessThan(15_000);
  expect(new LocalLibrary('guest').read()[0].book).toEqual(edited);
});

it('keeps the old complete draft if the final header write fails', () => {
  const library = new LocalLibrary('guest'); const book = createNewBook('Черновик');
  book.chapters[0].content = '<p>Исходный текст</p>'; library.write(newLocalBook(book));
  const original = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key.startsWith(library.prefix)) throw new Error('quota');
    original.call(this, key, value);
  });
  const edited = { ...book, chapters: [{ ...book.chapters[0], content: '<p>Правка</p>' }] };
  expect(() => library.write(newLocalBook(edited))).toThrow('quota');
  expect(new LocalLibrary('guest').read()[0].book.chapters[0].content).toBe('<p>Исходный текст</p>');
});

it('opens valid projects even if a different project is damaged', () => {
  const library = new LocalLibrary('guest'); library.write(newLocalBook(createNewBook('Целый проект')));
  localStorage.setItem(library.prefix + crypto.randomUUID(), '{broken');
  expect(library.read()[0].book.title).toBe('Целый проект');
  expect(library.issues).toHaveLength(1);
});

it('preserves the other tab revision even if its storage event has not arrived yet', () => {
  const a = new LocalLibrary('guest'); const b = new LocalLibrary('guest');
  const book = createNewBook('Роман'); a.write(newLocalBook(book)); b.read();
  a.write(newLocalBook({ ...book, chapters: [{ ...book.chapters[0], content: '<p>Из вкладки А</p>' }] }));
  const recovered = b.write(newLocalBook({ ...book, chapters: [{ ...book.chapters[0], content: '<p>Из вкладки Б</p>' }] }));
  expect(recovered?.book.recoveryOf).toBe(book.id);
  const contents = new LocalLibrary('guest').read().map(e => e.book.chapters[0].content);
  expect(contents).toContain('<p>Из вкладки А</p>');
  expect(contents).toContain('<p>Из вкладки Б</p>');
});
