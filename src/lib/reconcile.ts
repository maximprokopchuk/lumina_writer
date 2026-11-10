import { Book, LocalBook } from '../types';
import { newLocalBook } from './local-library';

export const sameManuscript = (a: Book, b: Book) => a.title === b.title && a.author === b.author
  && JSON.stringify(a.chapters) === JSON.stringify(b.chapters);

export function reconcile(local: LocalBook[], remote: Book[]) {
  const result = new Map<string, LocalBook>();
  const cloud = new Map(remote.map(book => [book.id, book]));
  let recovered = false;
  for (const entry of local) {
    const server = cloud.get(entry.book.id);
    cloud.delete(entry.book.id);
    if (!entry.dirty && !entry.deleted && server?.cloudVersion === entry.baseVersion) {
      result.set(entry.book.id, entry);
      continue;
    }
    if (entry.deleted) {
      if (!server) continue;
      if (entry.baseVersion === server.cloudVersion || (!entry.baseVersion && sameManuscript(entry.book, server))) {
        result.set(entry.book.id, { ...entry, baseVersion: server.cloudVersion! });
        continue;
      }
      recovered = true;
    } else if (entry.dirty) {
      if ((!server && !entry.baseVersion) || (server && entry.baseVersion === server.cloudVersion)) {
        result.set(entry.book.id, entry);
        continue;
      }
      if (server && sameManuscript(entry.book, server)) {
        result.set(server.id, { ...entry, book: server, baseVersion: server.cloudVersion!, dirty: false });
        continue;
      }
      const copy = { ...entry.book, id: crypto.randomUUID(), cloudVersion: undefined,
        recoveryOf: entry.book.id, title: `${entry.book.title || 'Без названия'} (локальная копия)` };
      result.set(copy.id, newLocalBook(copy));
      recovered = true;
    }
    if (server) result.set(server.id, {
      book: server, baseVersion: server.cloudVersion!, dirty: false, deleted: false, changeId: crypto.randomUUID(),
    });
  }
  for (const book of cloud.values()) result.set(book.id, {
    book, baseVersion: book.cloudVersion!, dirty: false, deleted: false, changeId: crypto.randomUUID(),
  });
  return { entries: [...result.values()], recovered };
}
