import { filterByDateRange } from './dateFilter';

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, but got ${actual}`);
  }
}

const data = [
  { id: 1, date: '2026-08-01T10:00:00Z' },
  { id: 2, date: '2026-08-05T10:00:00Z' },
  { id: 3, date: '2026-08-10T10:00:00Z' },
];

// Test 1: Start date only
const res1 = filterByDateRange(data, 'date', { start: '2026-08-05', end: '' });
assertEqual(res1.length, 2, 'Should find 2 items for start date >= 2026-08-05');

// Test 2: End date only
const res2 = filterByDateRange(data, 'date', { start: '', end: '2026-08-05' });
assertEqual(res2.length, 2, 'Should find 2 items for end date <= 2026-08-05');

// Test 3: Date range
const res3 = filterByDateRange(data, 'date', { start: '2026-08-02', end: '2026-08-08' });
assertEqual(res3.length, 1, 'Should find 1 item strictly between range');
assertEqual(res3[0].id, 2);

// Test 4: Date object instances & boundary matching
const dateObjects = [
  { id: 10, date: new Date('2026-08-01T00:00:00Z') },
  { id: 20, date: new Date('2026-08-05T12:30:00Z') },
  { id: 30, date: new Date('2026-08-10T23:59:59Z') },
];

const res4 = filterByDateRange(dateObjects, 'date', { start: '2026-08-05', end: '2026-08-10' });
assertEqual(res4.length, 2, 'Should include boundary matches for Date objects');
assertEqual(res4[0].id, 20);
assertEqual(res4[1].id, 30);

// Test 5: Optional range and trimmed strings
const res5 = filterByDateRange(data, 'date', undefined);
assertEqual(res5.length, 3, 'Undefined range should return all items');

const res6 = filterByDateRange(data, 'date', { start: ' 2026-08-05 ', end: ' 2026-08-10 ' });
assertEqual(res6.length, 2, 'Should trim whitespace from range parameters');

console.log("PASS");


