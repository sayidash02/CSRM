import { expect, test } from 'vitest';
import { useGlobalSearch } from './useGlobalSearch';

test('useGlobalSearch is a function', () => {
  expect(typeof useGlobalSearch).toBe('function');
});
