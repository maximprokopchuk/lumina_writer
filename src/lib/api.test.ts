import { beforeEach, expect, it, vi } from 'vitest';
import { fetchBooks, saveBook, deleteCloudBook, SyncConflict } from './api';
import { createNewBook } from '../utils/book';

const { query, from } = vi.hoisted(() => {
  const query = { eq: vi.fn(), order: vi.fn(), select: vi.fn() };
  const from = vi.fn(() => ({ select: vi.fn(() => query), update: vi.fn(() => query),
    insert: vi.fn(() => query), delete: vi.fn(() => query) }));
  return { query, from };
});
vi.mock('./supabase', () => ({ supabase: { from } }));
beforeEach(() => {
  vi.clearAllMocks(); query.eq.mockReturnValue(query);
  query.select.mockResolvedValue({ data: [{ updated_at: '2026-11-10T00:00:00.001Z' }], error: null });
});
it('updates only the authenticated owner and the exact original database revision', async () => {
  const book = createNewBook('Роман'); const version = '2026-11-10T00:00:00.000001+00:00';
  await saveBook(book, 'owner', version);
  expect(query.eq).toHaveBeenCalledWith('id', book.id);
  expect(query.eq).toHaveBeenCalledWith('user_id', 'owner');
  expect(query.eq).toHaveBeenCalledWith('updated_at', version);
});
it('treats a missed compare-and-swap or duplicate insert as a conflict', async () => {
  query.select.mockResolvedValueOnce({ data: [], error: null });
  await expect(saveBook(createNewBook(), 'owner', '2026-11-10T00:00:00.000Z')).rejects.toBeInstanceOf(SyncConflict);
  query.select.mockResolvedValueOnce({ data: null, error: { code: '23505' } });
  await expect(saveBook(createNewBook(), 'owner', null)).rejects.toBeInstanceOf(SyncConflict);
});
it('does not silently delete a book changed on another device', async () => {
  query.select.mockResolvedValueOnce({ data: [], error: null });
  await expect(deleteCloudBook('id', 'owner', 'v1')).rejects.toBeInstanceOf(SyncConflict);
});
it('rejects malformed cloud chapters before they enter the editor', async () => {
  query.order.mockResolvedValueOnce({ data: [{ id: 'id', title: 'Роман', author: '', chapters: [], updated_at: '2026-11-10' }], error: null });
  await expect(fetchBooks('owner')).rejects.toThrow('некорректный');
});
it('accepts nullable authors and preserves timestamp precision from the database', async () => {
  const book = createNewBook('Роман'); const version = '2026-11-10T00:00:00.000001+00:00';
  query.order.mockResolvedValueOnce({ data: [{ ...book, author: null, updated_at: version }], error: null });
  const [loaded] = await fetchBooks('owner');
  expect(loaded.author).toBe('');
  expect(loaded.cloudVersion).toBe(version);
});
