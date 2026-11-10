import { Book, LocalBook } from '../types';
import { STORAGE_KEYS } from './storage-keys';

export const libraryPrefix = (scope: string) => `lumina:v2:${scope}:book:`;
export const navigationKey = (scope: string) => `lumina:v2:${scope}:navigation`;
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

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
  constructor(readonly scope: string, private storage: Storage = localStorage) {
    this.prefix = libraryPrefix(scope);
  }

  read(): LocalBook[] {
    const entries: LocalBook[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (!key?.startsWith(this.prefix)) continue;
      const entry = JSON.parse(this.storage.getItem(key) || 'null') as LocalBook;
      if (!entry || !validBook(entry.book) || !uuid.test(entry.book.id)
        || typeof entry.dirty !== 'boolean' || typeof entry.deleted !== 'boolean'
        || typeof entry.changeId !== 'string'
        || !(entry.baseVersion === null || typeof entry.baseVersion === 'string')) {
        throw new Error('Не удалось прочитать локальный черновик. Исходные данные сохранены в браузере.');
      }
      entries.push(entry);
    }
    return entries;
  }

  write(entry: LocalBook) { this.storage.setItem(this.prefix + entry.book.id, JSON.stringify(entry)); }
  remove(id: string) { this.storage.removeItem(this.prefix + id); }

  migrateLegacy() {
    if (this.scope !== 'guest' || this.storage.getItem('lumina:v2:legacy-migrated')) return;
    const saved = this.storage.getItem(STORAGE_KEYS.library);
    const legacy = this.storage.getItem(STORAGE_KEYS.legacyBook);
    const raw = saved ? JSON.parse(saved) : legacy ? [JSON.parse(legacy)] : [];
    if (!Array.isArray(raw)) throw new Error('Некорректный формат старой библиотеки.');
    const existing = new Set(this.read().map(e => e.book.id));
    for (const value of raw) {
      const book = { author: '', updatedAt: Date.now(), ...value };
      if (!validBook(book)) throw new Error('Старая библиотека содержит повреждённый проект.');
      if (!uuid.test(book.id)) book.id = crypto.randomUUID();
      if (!existing.has(book.id)) this.write(newLocalBook(book));
    }
    // Keep original keys as a backup. Mark migration only after every write succeeds.
    this.storage.setItem('lumina:v2:legacy-migrated', '1');
  }
}
