import { Book, LocalBook } from '../types';
import { STORAGE_KEYS } from './storage-keys';

export const libraryPrefix = (scope: string) => `lumina:v2:${scope}:book:`;
export const navigationKey = (scope: string) => `lumina:v2:${scope}:navigation`;
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
interface StoredBook extends LocalBook { contentKeys?: Record<string, string> }

export function validBook(value: unknown): value is Book {
  if (!value || typeof value !== 'object') return false;
  const b = value as Book;
  return typeof b.id === 'string' && typeof b.title === 'string' && typeof b.author === 'string'
    && Number.isFinite(b.updatedAt) && Array.isArray(b.chapters) && b.chapters.length > 0
    && b.chapters.every(c => c && typeof c.id === 'string' && typeof c.title === 'string' && typeof c.content === 'string');
}

export function newLocalBook(book: Book): LocalBook {
  return { book, baseVersion: book.cloudVersion || null, dirty: true, deleted: false, changeId: crypto.randomUUID() };
}

export class LocalLibrary {
  readonly prefix: string;
  private contentPrefix: string;
  private cache = new Map<string, { entry: LocalBook; keys: Record<string, string>; raw: string }>();
  issues: string[] = [];
  constructor(readonly scope: string, private storage: Storage = localStorage) {
    this.prefix = libraryPrefix(scope);
    this.contentPrefix = `lumina:v2:${scope}:content:`;
  }

  decode(raw: string): LocalBook {
    const stored = JSON.parse(raw) as StoredBook;
    if (!stored || !validBook(stored.book) || !uuid.test(stored.book.id)
      || typeof stored.dirty !== 'boolean' || typeof stored.deleted !== 'boolean'
      || typeof stored.changeId !== 'string'
      || !(stored.baseVersion === null || typeof stored.baseVersion === 'string')) throw new Error('Некорректный черновик.');
    const { contentKeys, ...entry } = stored;
    if (contentKeys) entry.book = { ...stored.book, chapters: stored.book.chapters.map(chapter => {
      const key = contentKeys[chapter.id];
      if (!key?.startsWith(this.contentPrefix)) throw new Error('Некорректная ссылка на главу.');
      const content = this.storage.getItem(key);
      if (content === null) throw new Error('Не удалось прочитать текст главы.');
      return { ...chapter, content };
    }) };
    this.cache.set(entry.book.id, { entry, keys: contentKeys || {}, raw });
    return entry;
  }

  read(): LocalBook[] {
    const entries: LocalBook[] = [];
    this.issues = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (!key?.startsWith(this.prefix)) continue;
      try { entries.push(this.decode(this.storage.getItem(key) || 'null')); }
      catch { this.issues.push('Не удалось прочитать один из проектов. Исходные данные сохранены в браузере.'); }
    }
    return entries;
  }

  write(entry: LocalBook) {
    let previous = this.cache.get(entry.book.id);
    let recovered: LocalBook | undefined;
    const currentRaw = this.storage.getItem(this.prefix + entry.book.id);
    if (currentRaw && currentRaw !== previous?.raw) {
      const external = this.decode(currentRaw);
      if (!external.deleted && JSON.stringify([external.book.title, external.book.author, external.book.chapters])
        !== JSON.stringify([entry.book.title, entry.book.author, entry.book.chapters])) {
        recovered = newLocalBook({ ...external.book, id: crypto.randomUUID(), cloudVersion: undefined,
          recoveryOf: external.book.id, title: `${external.book.title || 'Без названия'} (локальная копия)` });
        // A stale tab must preserve the committed draft before it replaces the local header.
        this.write(recovered);
      }
      previous = this.cache.get(entry.book.id);
    }
    const keys: Record<string, string> = {};
    const created: string[] = [];
    try {
      for (const chapter of entry.book.chapters) {
        const old = previous?.entry.book.chapters.find(c => c.id === chapter.id);
        if (old?.content === chapter.content && previous?.keys[chapter.id]) keys[chapter.id] = previous.keys[chapter.id];
        else {
          const key = this.contentPrefix + crypto.randomUUID();
          this.storage.setItem(key, chapter.content); created.push(key); keys[chapter.id] = key;
        }
      }
      const raw = JSON.stringify({ ...entry, book: { ...entry.book,
        chapters: entry.book.chapters.map(c => ({ ...c, content: '' })) }, contentKeys: keys });
      // Commit the header last: a failed write leaves the previous complete draft readable.
      if (raw !== previous?.raw) this.storage.setItem(this.prefix + entry.book.id, raw);
      this.cache.set(entry.book.id, { entry, keys, raw });
    } catch (error) {
      for (const key of created) { try { this.storage.removeItem(key); } catch { /* Preserve the original failure. */ } }
      throw error;
    }
    const retained = new Set(Object.values(keys));
    for (const key of Object.values(previous?.keys || {})) {
      if (!retained.has(key)) { try { this.storage.removeItem(key); } catch { /* An orphan is safe; the header is committed. */ } }
    }
    return recovered;
  }
  remove(id: string) {
    this.storage.removeItem(this.prefix + id);
    for (const key of Object.values(this.cache.get(id)?.keys || {})) {
      try { this.storage.removeItem(key); } catch { /* Orphaned content can be cleaned later. */ }
    }
    this.cache.delete(id);
  }

  migrateLegacy() {
    if (this.scope !== 'guest' || this.storage.getItem('lumina:v2:legacy-migrated')) return;
    const saved = this.storage.getItem(STORAGE_KEYS.library);
    const legacy = this.storage.getItem(STORAGE_KEYS.legacyBook);
    const raw = saved ? JSON.parse(saved) : legacy ? [JSON.parse(legacy)] : [];
    if (!Array.isArray(raw)) throw new Error('Некорректный формат старой библиотеки.');
    const existing = new Set(this.read().map(e => e.book.id));
    for (const [index, value] of raw.entries()) {
      const book = { author: '', updatedAt: Date.now(), ...value };
      if (!validBook(book)) throw new Error('Старая библиотека содержит повреждённый проект.');
      if (!uuid.test(book.id)) {
        const mappingKey = `lumina:v2:legacy-id:${index}`;
        const mapped = this.storage.getItem(mappingKey);
        book.id = mapped && uuid.test(mapped) ? mapped : crypto.randomUUID();
        this.storage.setItem(mappingKey, book.id);
      }
      if (!existing.has(book.id)) this.write(newLocalBook(book));
    }
    // Keep original keys as a backup. Mark migration only after every write succeeds.
    this.storage.setItem('lumina:v2:legacy-migrated', '1');
  }
}
