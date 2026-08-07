import { describe, it, expect } from 'vitest';
import { filterByDateRange } from './dateFilter';

describe('filterByDateRange', () => {
  const data = [
    { id: 1, date: '2026-08-01T10:00:00Z' },
    { id: 2, date: '2026-08-05T10:00:00Z' },
    { id: 3, date: '2026-08-10T10:00:00Z' },
  ];

  it('filters by start date only', () => {
    const res = filterByDateRange(data, 'date', { start: '2026-08-05', end: '' });
    expect(res.length).toBe(2);
  });

  it('filters by end date only', () => {
    const res = filterByDateRange(data, 'date', { start: '', end: '2026-08-05' });
    expect(res.length).toBe(2);
  });

  it('filters by date range', () => {
    const res = filterByDateRange(data, 'date', { start: '2026-08-02', end: '2026-08-08' });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe(2);
  });

  it('handles Date object instances & boundary matching', () => {
    const dateObjects = [
      { id: 10, date: new Date('2026-08-01T00:00:00Z') },
      { id: 20, date: new Date('2026-08-05T12:30:00Z') },
      { id: 30, date: new Date('2026-08-10T23:59:59Z') },
    ];

    const res = filterByDateRange(dateObjects, 'date', { start: '2026-08-05', end: '2026-08-10' });
    expect(res.length).toBe(2);
    expect(res[0].id).toBe(20);
    expect(res[1].id).toBe(30);
  });

  it('handles optional range and trimmed strings', () => {
    const res5 = filterByDateRange(data, 'date', undefined);
    expect(res5.length).toBe(3);

    const res6 = filterByDateRange(data, 'date', { start: ' 2026-08-05 ', end: ' 2026-08-10 ' });
    expect(res6.length).toBe(2);
  });
});


