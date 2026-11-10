import { supabase } from './supabase';
import { Book } from '../types';

export async function fetchBooks(userId: string): Promise<Book[]> {
  const query = supabase
    .from('books')
    .select('*').eq('user_id', userId);
  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(b => ({
    id: b.id,
    title: b.title,
    author: b.author,
    updatedAt: new Date(b.updated_at).getTime(),
    chapters: b.chapters,
    cloudVersion: b.updated_at,
  }));
}
export class SyncConflict extends Error {
  constructor() { super('Проект изменён на другом устройстве.'); }
}

export async function saveBook(book: Book, userId: string, baseVersion: string | null): Promise<string> {
  const version = new Date(Math.max(Date.now(), book.updatedAt,
    baseVersion ? new Date(baseVersion).getTime() + 1 : 0)).toISOString();
  const row = {
    id: book.id, user_id: userId, title: book.title, author: book.author,
    chapters: book.chapters, updated_at: version,
  };
  const query = baseVersion
    ? supabase.from('books').update(row).eq('id', book.id).eq('user_id', userId).eq('updated_at', baseVersion)
    : supabase.from('books').insert(row);
  const { data, error } = await query.select('updated_at');
  if (error?.code === '23505') throw new SyncConflict();
  if (error) throw error;
  if (!data?.length) throw new SyncConflict();
  return data[0].updated_at;
}

export async function deleteCloudBook(id: string, userId: string, baseVersion: string | null): Promise<void> {
  if (!baseVersion) return;
  const { data, error } = await supabase.from('books').delete()
    .eq('id', id).eq('user_id', userId).eq('updated_at', baseVersion).select('id');
  if (error) throw error;
  if (!data?.length) throw new SyncConflict();
}
