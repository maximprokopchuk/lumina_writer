import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PdfExporter } from './pdf.exporter';
import type { Book } from '../../types';

// DOMPurify needs a real-ish DOM: jsdom provides it, but DOMPurify detects
// the window object, so we mock it minimally where needed.
vi.mock('../sanitize', () => ({
  sanitizeHtml: (html: string) => html,
}));

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-1',
    title: 'My Novel',
    author: 'Jane Doe',
    updatedAt: 0,
    chapters: [
      { id: 'ch-1', title: 'Chapter 1', content: '<p>Once upon a time.</p>' },
    ],
    ...overrides,
  };
}

describe('PdfExporter', () => {
  let appendedIframe: HTMLIFrameElement | null = null;
  let originalAppendChild: typeof document.body.appendChild;

  beforeEach(() => {
    // Intercept appendChild so we can inspect the iframe without triggering print
    originalAppendChild = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLIFrameElement) {
        appendedIframe = node;
        // Don't actually append — return the node so the exporter's reference is valid
        return node;
      }
      return originalAppendChild(node);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    appendedIframe = null;
  });

  it('has extension "pdf"', () => {
    expect(new PdfExporter().extension).toBe('pdf');
  });

  it('appends an iframe to the document body', () => {
    const exporter = new PdfExporter();
    exporter.export(makeBook());
    expect(appendedIframe).toBeInstanceOf(HTMLIFrameElement);
  });

  it('the iframe is positioned off-screen (zero width/height)', () => {
    const exporter = new PdfExporter();
    exporter.export(makeBook());
    expect(appendedIframe?.style.width).toBe('0px');
    expect(appendedIframe?.style.height).toBe('0px');
  });

  it('includes book title in generated HTML', () => {
    // Capture the HTML written to the iframe via contentDocument mock
    let capturedHtml = '';
    const mockDoc = {
      open: vi.fn(),
      write: vi.fn((html: string) => { capturedHtml = html; }),
      close: vi.fn(),
    };
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLIFrameElement) {
        appendedIframe = node;
        Object.defineProperty(node, 'contentWindow', {
          get: () => ({ document: mockDoc, focus: vi.fn(), print: vi.fn() }),
        });
        return node;
      }
      return originalAppendChild(node);
    });

    new PdfExporter().export(makeBook({ title: 'Great Expectations' }));
    expect(capturedHtml).toContain('Great Expectations');
  });

  it('includes author in generated HTML', () => {
    let capturedHtml = '';
    const mockDoc = {
      open: vi.fn(),
      write: vi.fn((html: string) => { capturedHtml = html; }),
      close: vi.fn(),
    };
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLIFrameElement) {
        appendedIframe = node;
        Object.defineProperty(node, 'contentWindow', {
          get: () => ({ document: mockDoc, focus: vi.fn(), print: vi.fn() }),
        });
        return node;
      }
      return originalAppendChild(node);
    });

    new PdfExporter().export(makeBook({ author: 'Charles Dickens' }));
    expect(capturedHtml).toContain('Charles Dickens');
  });

  it('includes chapter title in generated HTML', () => {
    let capturedHtml = '';
    const mockDoc = {
      open: vi.fn(),
      write: vi.fn((html: string) => { capturedHtml = html; }),
      close: vi.fn(),
    };
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLIFrameElement) {
        appendedIframe = node;
        Object.defineProperty(node, 'contentWindow', {
          get: () => ({ document: mockDoc, focus: vi.fn(), print: vi.fn() }),
        });
        return node;
      }
      return originalAppendChild(node);
    });

    new PdfExporter().export(makeBook({
      chapters: [{ id: 'c', title: 'The Beginning', content: '<p>Start.</p>' }],
    }));
    expect(capturedHtml).toContain('The Beginning');
  });

  it('includes chapter content in generated HTML', () => {
    let capturedHtml = '';
    const mockDoc = {
      open: vi.fn(),
      write: vi.fn((html: string) => { capturedHtml = html; }),
      close: vi.fn(),
    };
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLIFrameElement) {
        appendedIframe = node;
        Object.defineProperty(node, 'contentWindow', {
          get: () => ({ document: mockDoc, focus: vi.fn(), print: vi.fn() }),
        });
        return node;
      }
      return originalAppendChild(node);
    });

    new PdfExporter().export(makeBook({
      chapters: [{ id: 'c', title: 'Ch', content: '<p>Hello PDF world</p>' }],
    }));
    expect(capturedHtml).toContain('Hello PDF world');
  });

  it('escapes HTML special chars in title to prevent XSS', () => {
    let capturedHtml = '';
    const mockDoc = {
      open: vi.fn(),
      write: vi.fn((html: string) => { capturedHtml = html; }),
      close: vi.fn(),
    };
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLIFrameElement) {
        appendedIframe = node;
        Object.defineProperty(node, 'contentWindow', {
          get: () => ({ document: mockDoc, focus: vi.fn(), print: vi.fn() }),
        });
        return node;
      }
      return originalAppendChild(node);
    });

    new PdfExporter().export(makeBook({ title: '<script>alert(1)</script>' }));
    expect(capturedHtml).not.toContain('<script>alert(1)</script>');
    expect(capturedHtml).toContain('&lt;script&gt;');
  });

  it('uses fallback title when book title is empty', () => {
    let capturedHtml = '';
    const mockDoc = {
      open: vi.fn(),
      write: vi.fn((html: string) => { capturedHtml = html; }),
      close: vi.fn(),
    };
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLIFrameElement) {
        appendedIframe = node;
        Object.defineProperty(node, 'contentWindow', {
          get: () => ({ document: mockDoc, focus: vi.fn(), print: vi.fn() }),
        });
        return node;
      }
      return originalAppendChild(node);
    });

    new PdfExporter().export(makeBook({ title: '' }));
    expect(capturedHtml).toContain('Без названия');
  });

  it('renders multiple chapters', () => {
    let capturedHtml = '';
    const mockDoc = {
      open: vi.fn(),
      write: vi.fn((html: string) => { capturedHtml = html; }),
      close: vi.fn(),
    };
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLIFrameElement) {
        appendedIframe = node;
        Object.defineProperty(node, 'contentWindow', {
          get: () => ({ document: mockDoc, focus: vi.fn(), print: vi.fn() }),
        });
        return node;
      }
      return originalAppendChild(node);
    });

    new PdfExporter().export(makeBook({
      chapters: [
        { id: 'c1', title: 'Alpha', content: '<p>First</p>' },
        { id: 'c2', title: 'Beta',  content: '<p>Second</p>' },
      ],
    }));
    expect(capturedHtml).toContain('Alpha');
    expect(capturedHtml).toContain('Beta');
  });
});
