import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Book } from '../types';
import { LocalLibrary, newLocalBook } from './local-library';
import { SyncEngine, SyncSnapshot, SyncTransport } from './sync-engine';
import { reconcile } from './reconcile';

const book = (title = 'Роман'): Book => ({ id: crypto.randomUUID(), title, author: '', updatedAt: 100,
  chapters: [{ id: '1', title: 'Глава 1', content: '<p>Текст</p>' }] });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
};

describe('durable drafts and reconciliation', () => {
  beforeEach(() => localStorage.clear());
  it('migrates legacy UUIDs without deleting the source or duplicating projects', () => {
    const old = { ...book(), id: 'legacy' };
    localStorage.setItem('lumina_library', JSON.stringify([old]));
    const local = new LocalLibrary('guest');
    local.migrateLegacy(); local.migrateLegacy();
    expect(local.read()).toHaveLength(1);
    expect(local.read()[0].book.id).not.toBe('legacy');
    expect(localStorage.getItem('lumina_library')).toContain('legacy');
    expect(new LocalLibrary('other-user').read()).toEqual([]);
  });
  it('accepts an empty old library and retains corrupt source data', () => {
    localStorage.setItem('lumina_library', '[]');
    new LocalLibrary('guest').migrateLegacy();
    expect(new LocalLibrary('guest').read()).toEqual([]);
    localStorage.removeItem('lumina:v2:legacy-migrated');
    localStorage.setItem('lumina_library', '{broken');
    expect(() => new LocalLibrary('guest').migrateLegacy()).toThrow();
    expect(localStorage.getItem('lumina_library')).toBe('{broken');
  });
  it('keeps both manuscripts instead of uploading a stale local copy over the cloud', () => {
    const old = book('Старая');
    const remote = { ...old, title: 'Новая', cloudVersion: 'v2' };
    const result = reconcile([newLocalBook(old)], [remote]);
    expect(result.recovered).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.entries.find(e => e.book.id === old.id)?.book.title).toBe('Новая');
    expect(result.entries.find(e => e.book.recoveryOf === old.id)?.book.title).toContain('Старая');
  });
  it('does not turn a deleted cloud row back into the same project', () => {
    const original = { ...book(), cloudVersion: 'v1' };
    const result = reconcile([newLocalBook(original)], []);
    expect(result.entries[0].book.id).not.toBe(original.id);
    expect(result.entries[0].book.recoveryOf).toBe(original.id);
  });
});

describe('serialized cloud queue', () => {
  let engine: SyncEngine;
  let transport: SyncTransport;
  let snapshots: SyncSnapshot[];
  beforeEach(() => {
    localStorage.clear(); vi.useFakeTimers(); snapshots = [];
    transport = { fetch: vi.fn().mockResolvedValue([]), save: vi.fn().mockResolvedValue('v1'), delete: vi.fn().mockResolvedValue(undefined) };
    engine = new SyncEngine(new LocalLibrary('account'), transport, snapshot => snapshots.push(snapshot));
  });
  afterEach(() => { engine.stop(); vi.useRealTimers(); vi.restoreAllMocks(); });
  it('persists the last keystroke synchronously, before timers or network requests', () => {
    const draft = book(); engine.edit(draft); engine.stop();
    expect(new LocalLibrary('account').read()[0].book).toEqual(draft);
    expect(transport.save).not.toHaveBeenCalled();
  });
  it('preserves offline drafts and retries after connectivity returns', async () => {
    const draft = book(); engine.edit(draft);
    vi.mocked(transport.fetch).mockRejectedValueOnce(new Error('offline'));
    await engine.sync();
    expect(new LocalLibrary('account').read()[0].dirty).toBe(true);
    expect(snapshots.at(-1)?.cloudError).toBeTruthy();
    await vi.advanceTimersByTimeAsync(5000);
    expect(transport.save).toHaveBeenCalledWith(draft, null);
    expect(snapshots.at(-1)?.pending).toBe(false);
  });
  it('keeps edits made while a cloud read is pending', async () => {
    const draft = { ...book(), cloudVersion: 'v1' };
    const request = deferred<Book[]>();
    vi.mocked(transport.fetch).mockReturnValue(request.promise);
    const pending = engine.start();
    const edit = { ...draft, title: 'Только что написано' };
    engine.edit(edit);
    request.resolve([draft]); await pending;
    expect(transport.save).toHaveBeenCalledWith(edit, 'v1');
    expect(snapshots.at(-1)?.books[0].title).toBe(edit.title);
  });
  it('does not acknowledge an edit made during an in-flight save', async () => {
    const draft = book(); const write = deferred<string>();
    vi.mocked(transport.save).mockReturnValueOnce(write.promise);
    engine.edit(draft);
    const pending = engine.sync();
    await Promise.resolve(); await Promise.resolve();
    engine.edit({ ...draft, title: 'Следующая правка' });
    write.resolve('v1'); await pending;
    expect(new LocalLibrary('account').read()[0].dirty).toBe(true);
    vi.mocked(transport.fetch).mockResolvedValue([{ ...draft, cloudVersion: 'v1' }]);
    await engine.sync();
    expect(transport.save).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Следующая правка' }), 'v1');
  });
  it('deletes after an in-flight insert instead of resurrecting the project', async () => {
    const draft = book(); const write = deferred<string>();
    vi.mocked(transport.save).mockReturnValueOnce(write.promise);
    engine.edit(draft); const pending = engine.sync();
    await Promise.resolve(); await Promise.resolve();
    engine.remove(draft.id); write.resolve('v1'); await pending;
    vi.mocked(transport.fetch).mockResolvedValue([{ ...draft, cloudVersion: 'v1' }]);
    await engine.sync();
    expect(transport.delete).toHaveBeenCalledWith(draft.id, 'v1');
    expect(snapshots.at(-1)?.books).toEqual([]);
    expect(new LocalLibrary('account').read()).toEqual([]);
  });
  it('still tries the cloud when localStorage is full', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    engine.edit(book()); await engine.sync();
    expect(transport.save).toHaveBeenCalledOnce();
    expect(snapshots.at(-1)?.localError).toBeTruthy();
    expect(snapshots.at(-1)?.syncing).toBe(false);
  });
  it('ignores responses after the account session stops', async () => {
    const request = deferred<Book[]>(); vi.mocked(transport.fetch).mockReturnValue(request.promise);
    const pending = engine.start(); engine.stop(); const before = snapshots.length;
    request.resolve([book()]); await pending;
    expect(snapshots).toHaveLength(before);
    expect(transport.save).not.toHaveBeenCalled();
  });
  it('never uploads the automatic placeholder', async () => {
    engine.edit({ ...book(), isPlaceholder: true }); await engine.sync();
    expect(transport.save).not.toHaveBeenCalled();
    expect(snapshots.at(-1)?.pending).toBe(false);
  });
  it('preserves divergent edits from two tabs as separate books', () => {
    const original = book(); engine.edit(original);
    const other = newLocalBook({ ...original, title: 'Другая вкладка' });
    engine.receiveExternal(other);
    const books = snapshots.at(-1)!.books;
    expect(books).toHaveLength(2);
    expect(books.some(b => b.title === 'Другая вкладка')).toBe(true);
    expect(books.some(b => b.recoveryOf === original.id)).toBe(true);
  });
});
