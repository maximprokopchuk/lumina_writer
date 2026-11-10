import { Book } from '../types';

export const isBookEmpty = (book: Book): boolean =>
  !book.title.trim() &&
  book.chapters.every((c, index) => (!c.title.trim() || c.title === `Глава ${index + 1}`)
    && !c.content.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;|&#x0*a0;/gi, ' ').trim());

export const createNewBook = (title = '', author = ''): Book => ({
  id: crypto.randomUUID(),
  title,
  author,
  updatedAt: Date.now(),
  chapters: [{ id: '1', title: 'Глава 1', content: '' }],
});
