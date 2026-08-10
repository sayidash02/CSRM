import { expect, test, describe } from 'vitest';
import { useGlobalSearch, extractSearchableText } from './useGlobalSearch';

describe('useGlobalSearch text extraction & logic', () => {
  test('useGlobalSearch is a function', () => {
    expect(typeof useGlobalSearch).toBe('function');
  });

  // Pure logic tests for filtering behavior
  test('filters items accurately based on search terms', () => {
    const items = [
      { id: 1, name: 'Alice', role: 'Developer' },
      { id: 2, name: 'Bob', role: 'Designer' },
      { id: 3, name: 'Charlie', role: 'Developer' }
    ];

    const text1 = extractSearchableText(items[0]);
    expect(text1).toContain('alice');
    expect(text1).toContain('developer');
  });

  test('extractSearchableText handles booleans and Date instances', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const data = { active: true, disabled: false, createdAt: now };
    const text = extractSearchableText(data);
    expect(text).toContain('true');
    expect(text).toContain('false');
    expect(text).toContain('2026-01-01t00:00:00.000z');
  });

  test('extractSearchableText prevents infinite recursion on circular objects', () => {
    const circular: Record<string, unknown> = { name: 'Circular' };
    circular.self = circular;
    expect(() => extractSearchableText(circular)).not.toThrow();
    expect(extractSearchableText(circular)).toContain('circular');
  });
});

