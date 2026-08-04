import assert from 'assert';
import { filterByDateRange } from './dateFilter.js';

const data = [
  { id: 1, date: '2026-08-01T10:00:00Z' },
  { id: 2, date: '2026-08-05T10:00:00Z' },
  { id: 3, date: '2026-08-10T10:00:00Z' },
];

try {
  // Test 1: Start date only
  const res1 = filterByDateRange(data, 'date', { start: '2026-08-05', end: '' });
  assert.strictEqual(res1.length, 2, 'Should find 2 items for start date >= 2026-08-05');
  
  // Test 2: End date only
  const res2 = filterByDateRange(data, 'date', { start: '', end: '2026-08-05' });
  assert.strictEqual(res2.length, 2, 'Should find 2 items for end date <= 2026-08-05');

  // Test 3: Date range
  const res3 = filterByDateRange(data, 'date', { start: '2026-08-02', end: '2026-08-08' });
  assert.strictEqual(res3.length, 1, 'Should find 1 item strictly between range');
  assert.strictEqual(res3[0].id, 2);

  console.log("PASS");
} catch (e) {
  console.error("FAIL", e);
  process.exit(1);
}
