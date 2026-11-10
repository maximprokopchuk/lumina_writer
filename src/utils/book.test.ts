import { describe, expect, it } from 'vitest';
import { createNewBook, isBookEmpty } from './book';
import { duplicateCandidates } from './duplicates';

describe('project identity and duplicate review', () => {
  it('does not treat a default author or empty editor markup as manuscript text', () => {
    const book = createNewBook('', 'Автор');
    book.chapters[0].content = '<p><br></p><p>&nbsp; </p>';
    expect(isBookEmpty(book)).toBe(true);
    book.chapters[0].title = 'Пролог';
    expect(isBookEmpty(book)).toBe(false);
  });
  it('compares manuscripts across different chapter UUIDs but not by title alone', () => {
    const a = createNewBook('Роман'); a.chapters[0].content = '<p>Один текст</p>';
    const b = { ...a, id: crypto.randomUUID(), chapters: [{ ...a.chapters[0], id: 'other' }] };
    const c = { ...a, id: crypto.randomUUID(), chapters: [{ ...a.chapters[0], content: '<p>Другой текст</p>' }] };
    const candidates = duplicateCandidates([a, b, c]);
    expect([...candidates.keys()]).toEqual([a.id, b.id]);
    expect([a, b, c]).toHaveLength(3);
  });
  it('excludes the automatic placeholder from duplicate review', () => {
    expect(duplicateCandidates([{ ...createNewBook(), isPlaceholder: true }]).size).toBe(0);
  });
});
