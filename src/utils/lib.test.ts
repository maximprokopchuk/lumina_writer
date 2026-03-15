import { describe, it, expect } from 'vitest';
import { cn } from './lib';

describe('cn', () => {
  it('returns a single class name', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('joins multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', false, undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles conditional classes via an object', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo');
  });

  it('merges conflicting Tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('merges conflicting text colors', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns empty string for all falsy arguments', () => {
    expect(cn(false, undefined, null)).toBe('');
  });

  it('handles array input', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('handles mixed arrays and strings', () => {
    expect(cn('base', ['extra', 'more'])).toBe('base extra more');
  });

  it('deduplicates via twMerge', () => {
    // Both specify background; tailwind-merge keeps the last one
    expect(cn('bg-red-500', 'bg-green-500')).toBe('bg-green-500');
  });
});
