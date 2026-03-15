import { Book } from '../types';

export const isBookEmpty = (book: Book): boolean =>
  !book.title.trim() &&
  !book.author.trim() &&
  book.chapters.every(c => !c.content.trim());

export const createNewBook = (title = '', author = ''): Book => ({
  id: crypto.randomUUID(),
  title,
  author,
  updatedAt: Date.now(),
  chapters: [{ id: '1', title: 'Глава 1', content: '' }],
});
