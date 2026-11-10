import { Book } from '../types';
import { isBookEmpty } from './book';

/** Candidates for human review. A shared title alone is never evidence of duplication. */
export function duplicateCandidates(books: Book[]): Map<string, string> {
  const reasons = new Map<string, string>();
  const groups = new Map<string, Book[]>();
  for (const book of books) {
    if (book.isPlaceholder) continue;
    if (isBookEmpty(book)) reasons.set(book.id, 'Пустой проект');
    const fingerprint = JSON.stringify([book.title.trim(), book.author.trim(),
      book.chapters.map(c => [c.title, c.content])]);
    const group = groups.get(fingerprint) || [];
    group.push(book); groups.set(fingerprint, group);
  }
  for (const group of groups.values()) {
    if (group.length > 1) for (const book of group) reasons.set(book.id, 'Совпадающий текст и название');
  }
  return reasons;
}
