import { Book, LocalBook } from '../types';
import { LocalLibrary, newLocalBook } from './local-library';
import { reconcile, sameManuscript } from './reconcile';

export interface SyncTransport {
  fetch: () => Promise<Book[]>;
  save: (book: Book, baseVersion: string | null) => Promise<string>;
  delete: (id: string, baseVersion: string | null) => Promise<void>;
}
export interface SyncSnapshot {
  books: Book[];
  syncing: boolean;
  pending: boolean;
  localError: string | null;
  cloudError: string | null;
  notice: string | null;
}

/** One serialized queue per account. Local edits are durable before any network debounce. */
export class SyncEngine {
  private entries = new Map<string, LocalBook>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private flight: Promise<void> | undefined;
  private stopped = false;
  private localFailures = new Set<string>();
  private cloudError: string | null = null;
  private notice: string | null = null;
  private recoveredLocally: LocalBook[] = [];
  constructor(readonly library: LocalLibrary, private transport: SyncTransport | null,
    private onChange: (snapshot: SyncSnapshot) => void) {}

  start() {
    try {
      this.library.migrateLegacy();
    } catch (error) {
      this.localFailures.add('read');
      this.notice = error instanceof Error ? error.message : 'Ошибка чтения черновиков.';
    }
    try {
      this.entries = new Map(this.library.read().map(e => [e.book.id, e]));
      if (this.library.issues.length) { this.localFailures.add('read'); this.notice = this.library.issues[0]; }
    } catch { this.localFailures.add('read'); }
    this.emit();
    return this.sync();
  }

  getEntries() { return [...this.entries.values()]; }
  private persist(entry: LocalBook) {
    try {
      const recovered = this.library.write(entry);
      if (recovered) this.recoveredLocally.push(recovered);
      this.localFailures.delete(entry.book.id); return true;
    }
    catch { this.localFailures.add(entry.book.id); return false; }
  }
  private absorbRecoveries() {
    for (const entry of this.recoveredLocally) this.entries.set(entry.book.id, entry);
    if (this.recoveredLocally.length) this.notice = 'В другой вкладке найдена новая версия. Оба текста сохранены в библиотеке.';
    this.recoveredLocally = [];
  }
  private emit() {
    if (this.stopped) return;
    this.absorbRecoveries();
    this.onChange({
      books: this.getEntries().filter(e => !e.deleted).map(e => e.book),
      syncing: !!this.flight,
      pending: this.getEntries().some(e => (e.dirty || e.deleted) && !e.book.isPlaceholder),
      localError: this.localFailures.size ? 'Не удалось сохранить в браузере. Не закрывайте страницу до сохранения в облаке.' : null,
      cloudError: this.cloudError, notice: this.notice,
    });
  }
  edit(book: Book) {
    if (this.stopped) return;
    const old = this.entries.get(book.id);
    const entry = { ...newLocalBook(book), baseVersion: old?.baseVersion ?? book.cloudVersion ?? null };
    this.entries.set(book.id, entry);
    this.persist(entry);
    this.absorbRecoveries();
    this.emit();
    this.schedule();
  }
  remove(id: string) {
    const old = this.entries.get(id);
    if (!old || this.stopped) return;
    const entry = { ...old, deleted: true, dirty: true, changeId: crypto.randomUUID() };
    this.entries.set(id, entry);
    this.persist(entry);
    this.emit();
    this.schedule(0);
  }
  import(entries: LocalBook[]) {
    const imported: string[] = [];
    for (const entry of entries) {
      if (entry.book.isPlaceholder || entry.deleted) continue;
      const current = this.entries.get(entry.book.id);
      if (current && sameManuscript(current.book, entry.book)) { imported.push(entry.book.id); continue; }
      const target = current ? newLocalBook({ ...entry.book, id: crypto.randomUUID(), cloudVersion: undefined,
        recoveryOf: entry.book.id, title: `${entry.book.title || 'Без названия'} (локальная копия)` }) : entry;
      this.entries.set(target.book.id, target);
      if (this.persist(target)) imported.push(entry.book.id);
    }
    this.emit();
    return imported;
  }
  receiveExternal(entry: LocalBook) {
    if (this.stopped) return;
    const current = this.entries.get(entry.book.id);
    if (current?.changeId === entry.changeId) return;
    if (current?.dirty && !current.deleted && (entry.deleted || !sameManuscript(current.book, entry.book))) {
      const copy = newLocalBook({ ...current.book, id: crypto.randomUUID(), cloudVersion: undefined,
        recoveryOf: current.book.id, title: `${current.book.title || 'Без названия'} (локальная копия)` });
      // Keep the unsaved tab's text even when another tab changes the same local key.
      this.entries.set(copy.book.id, copy);
      this.persist(copy);
      this.notice = 'Проект изменён в другой вкладке. Ваши правки сохранены отдельной копией.';
    }
    this.entries.set(entry.book.id, entry);
    this.emit();
    this.schedule(0);
  }
  private schedule(delay = 1000) {
    clearTimeout(this.timer);
    if (this.transport && !this.stopped) this.timer = setTimeout(() => void this.sync(), delay);
  }
  sync(): Promise<void> {
    if (this.stopped || !this.transport) return Promise.resolve();
    if (this.flight) return this.flight;
    clearTimeout(this.timer);
    this.flight = this.run().finally(() => {
      this.flight = undefined;
      if (!this.stopped) {
        this.emit();
        if (this.getEntries().some(e => (e.dirty || e.deleted) && !e.book.isPlaceholder)) this.schedule(5000);
      }
    });
    this.emit();
    return this.flight;
  }
  private async run() {
    try {
      const remote = await this.transport!.fetch();
      if (this.stopped) return;
      const merged = reconcile(this.getEntries(), remote);
      const next = new Map(merged.entries.map(e => [e.book.id, e]));
      // Persist recovery copies before replacing/removing their source drafts.
      let copiesSafe = true;
      for (const entry of next.values()) {
        if (!this.entries.has(entry.book.id) && !this.persist(entry)) copiesSafe = false;
      }
      if (copiesSafe) {
        for (const entry of next.values()) {
          if (this.entries.has(entry.book.id)) this.persist(entry);
        }
        for (const id of this.entries.keys()) {
          if (!next.has(id)) {
            try { this.library.remove(id); this.localFailures.delete(id); }
            catch { this.localFailures.add(id); }
          }
        }
      }
      this.entries = next;
      this.absorbRecoveries();
      if (merged.recovered) this.notice = 'Найдены разные версии. Ваш текст сохранён отдельной локальной копией; проверьте библиотеку.';
      this.emit();
      for (const id of [...this.entries.keys()]) {
        if (this.stopped) return;
        const entry = this.entries.get(id)!;
        if (entry.book.isPlaceholder || (!entry.dirty && !entry.deleted)) continue;
        if (entry.deleted) {
          await this.transport!.delete(id, entry.baseVersion);
          if (this.stopped) return;
          this.entries.delete(id);
          try { this.library.remove(id); this.localFailures.delete(id); }
          catch { this.localFailures.add(id); }
        } else {
          const version = await this.transport!.save(entry.book, entry.baseVersion);
          if (this.stopped) return;
          const current = this.entries.get(id);
          if (!current) continue;
          const unchanged = current.changeId === entry.changeId;
          const saved = { ...current, baseVersion: version, dirty: !unchanged || current.deleted,
            book: { ...current.book, cloudVersion: version } };
          this.entries.set(id, saved);
          this.persist(saved);
        }
      }
      this.cloudError = null;
    } catch {
      this.cloudError = 'Не удалось синхронизировать. Черновики сохранены отдельно; повторим попытку автоматически.';
    }
  }
  retryLocal() {
    for (const entry of this.entries.values()) this.persist(entry);
    this.emit();
  }
  stop() { this.stopped = true; clearTimeout(this.timer); }
}
