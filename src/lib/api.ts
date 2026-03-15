import { supabase } from './supabase';
import { Book } from '../types';

export async function fetchBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(b => ({
    id: b.id,
    title: b.title,
    author: b.author,
    updatedAt: new Date(b.updated_at).getTime(),
    chapters: b.chapters,
  }));
}

export async function upsertBook(book: Book, userId: string): Promise<void> {
  const { error } = await supabase.from('books').upsert({
    id: book.id,
    user_id: userId,
    title: book.title,
    author: book.author,
    chapters: book.chapters,
    updated_at: new Date(book.updatedAt).toISOString(),
  }, { onConflict: 'id' });

  if (error) throw error;
}

export async function upsertBooks(books: Book[], userId: string): Promise<void> {
  for (const book of books) {
    await upsertBook(book, userId);
  }
}
