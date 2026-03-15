import { describe, it, expect, vi } from 'vitest';
import { Fb2Exporter } from './fb2.exporter';
import type { Book } from '../../types';

// vi.mock is hoisted, so we use vi.hoisted to capture the mock reference
const { saveAsMock } = vi.hoisted(() => ({ saveAsMock: vi.fn() }));
vi.mock('file-saver', () => ({ saveAs: saveAsMock }));

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-1',
    title: 'Test Book',
    author: 'Ivan Petrov',
    updatedAt: 0,
    chapters: [
      { id: 'ch-1', title: 'Chapter One', content: '<p>Hello <strong>world</strong>!</p>' },
    ],
    ...overrides,
  };
}

async function exportAndGetXml(book: Book): Promise<string> {
  saveAsMock.mockClear();
  const exporter = new Fb2Exporter();
  exporter.export(book);

  const [blob] = saveAsMock.mock.calls[0] as [Blob, string];
  return blob.text();
}

describe('Fb2Exporter', () => {
  it('has extension "fb2"', () => {
    expect(new Fb2Exporter().extension).toBe('fb2');
  });

  it('calls saveAs with a filename derived from book title', () => {
    saveAsMock.mockClear();
    const exporter = new Fb2Exporter();
    exporter.export(makeBook());
    const filename = saveAsMock.mock.calls[0][1] as string;
    expect(filename).toBe('Test Book.fb2');
  });

  it('uses "book.fb2" when title is empty', () => {
    saveAsMock.mockClear();
    const exporter = new Fb2Exporter();
    exporter.export(makeBook({ title: '' }));
    const filename = saveAsMock.mock.calls[0][1] as string;
    expect(filename).toBe('book.fb2');
  });

  it('generates a valid XML declaration', async () => {
    const xml = await exportAndGetXml(makeBook());
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="utf-8"\?>/);
  });

  it('includes the book title in the XML', async () => {
    const xml = await exportAndGetXml(makeBook());
    expect(xml).toContain('<book-title>Test Book</book-title>');
  });

  it('splits author into first-name and last-name', async () => {
    const xml = await exportAndGetXml(makeBook({ author: 'Ivan Petrov' }));
    expect(xml).toContain('<first-name>Ivan</first-name>');
    expect(xml).toContain('<last-name>Petrov</last-name>');
  });

  it('uses fallback author name when author is empty', async () => {
    const xml = await exportAndGetXml(makeBook({ author: '' }));
    expect(xml).toContain('<first-name>Неизвестный</first-name>');
  });

  it('includes chapter title in a section', async () => {
    const xml = await exportAndGetXml(makeBook());
    expect(xml).toContain('<section>');
    expect(xml).toContain('Chapter One');
  });

  it('converts <strong> to FB2 <strong>', async () => {
    const xml = await exportAndGetXml(makeBook());
    expect(xml).toContain('<strong>world</strong>');
  });

  it('converts <em>/<i> to FB2 <emphasis>', async () => {
    const book = makeBook({
      chapters: [{ id: 'c', title: 'Ch', content: '<p><em>italic</em></p>' }],
    });
    const xml = await exportAndGetXml(book);
    expect(xml).toContain('<emphasis>italic</emphasis>');
  });

  it('converts <h1> to <subtitle>', async () => {
    const book = makeBook({
      chapters: [{ id: 'c', title: 'Ch', content: '<h1>Heading</h1>' }],
    });
    const xml = await exportAndGetXml(book);
    expect(xml).toContain('<subtitle>Heading</subtitle>');
  });

  it('converts <blockquote> to <cite>', async () => {
    const book = makeBook({
      chapters: [{ id: 'c', title: 'Ch', content: '<blockquote>A quote</blockquote>' }],
    });
    const xml = await exportAndGetXml(book);
    expect(xml).toContain('<cite>');
    expect(xml).toContain('A quote');
    expect(xml).toContain('</cite>');
  });

  it('converts <br> to <empty-line/>', async () => {
    const book = makeBook({
      chapters: [{ id: 'c', title: 'Ch', content: '<p>Line1<br>Line2</p>' }],
    });
    const xml = await exportAndGetXml(book);
    expect(xml).toContain('<empty-line/>');
  });

  it('converts <ul><li> to bullet <p> paragraphs', async () => {
    const book = makeBook({
      chapters: [{ id: 'c', title: 'Ch', content: '<ul><li>Item A</li><li>Item B</li></ul>' }],
    });
    const xml = await exportAndGetXml(book);
    expect(xml).toContain('• ');
    expect(xml).toContain('Item A');
    expect(xml).toContain('Item B');
  });

  it('escapes special XML characters in text content', async () => {
    const book = makeBook({
      chapters: [{ id: 'c', title: 'Ch', content: '<p>5 &lt; 10 &amp; 3 &gt; 1</p>' }],
    });
    const xml = await exportAndGetXml(book);
    // The text is round-tripped through the DOM so entities are decoded then re-escaped
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&gt;');
  });

  it('escapes special XML characters in book title', async () => {
    const book = makeBook({ title: 'Book & "Author"' });
    const xml = await exportAndGetXml(book);
    expect(xml).toContain('Book &amp; &quot;Author&quot;');
  });

  it('includes all chapters as separate sections', async () => {
    const book = makeBook({
      chapters: [
        { id: 'c1', title: 'Part I', content: '<p>First</p>' },
        { id: 'c2', title: 'Part II', content: '<p>Second</p>' },
      ],
    });
    const xml = await exportAndGetXml(book);
    const sectionCount = (xml.match(/<section>/g) || []).length;
    expect(sectionCount).toBe(2);
    expect(xml).toContain('Part I');
    expect(xml).toContain('Part II');
  });

  it('wraps the document in a FictionBook root element', async () => {
    const xml = await exportAndGetXml(makeBook());
    expect(xml).toContain('<FictionBook');
    expect(xml).toContain('</FictionBook>');
  });
});
