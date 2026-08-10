import { expect, test } from 'vitest';
import { useDebounce } from './useDebounce';

test('useDebounce is a function', () => {
  expect(typeof useDebounce).toBe('function');
});
