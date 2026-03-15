import { describe, it, expect } from 'vitest';
import { escapeHtml, MM } from './shared';

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than sign', () => {
    expect(escapeHtml('<tag>')).toBe('&lt;tag&gt;');
  });

  it('escapes greater-than sign', () => {
    expect(escapeHtml('1 > 0')).toBe('1 &gt; 0');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes all special characters together', () => {
    expect(escapeHtml('<a href="x&y">test</a>')).toBe(
      '&lt;a href=&quot;x&amp;y&quot;&gt;test&lt;/a&gt;'
    );
  });

  it('returns an empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(escapeHtml('Hello, world!')).toBe('Hello, world!');
  });

  it('escapes multiple ampersands', () => {
    expect(escapeHtml('a & b & c')).toBe('a &amp; b &amp; c');
  });

  it('handles a string with only special characters', () => {
    expect(escapeHtml('<>&"')).toBe('&lt;&gt;&amp;&quot;');
  });
});

describe('MM page margins', () => {
  it('has correct left margin (30 mm)', () => {
    expect(MM.left).toBe(30);
  });

  it('has correct right margin (15 mm)', () => {
    expect(MM.right).toBe(15);
  });

  it('has correct top margin (20 mm)', () => {
    expect(MM.top).toBe(20);
  });

  it('has correct bottom margin (20 mm)', () => {
    expect(MM.bottom).toBe(20);
  });

  it('all margin values are positive numbers', () => {
    for (const value of Object.values(MM)) {
      expect(value).toBeGreaterThan(0);
    }
  });
});
