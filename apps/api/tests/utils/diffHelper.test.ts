import { generateDiff } from '../../src/utils/diffHelper';
import { Prisma } from '@prisma/client';

describe('diffHelper', () => {
  it('should return null if no changes', () => {
    const oldData = { cost: 100, status: 'Open' };
    const newData = { cost: 100, status: 'Open' };
    expect(generateDiff(oldData, newData)).toBeNull();
  });

  it('should detect changes and ignore technical fields', () => {
    const oldData = { id: 1n, cost: 100, status: 'Open', updated_at: new Date('2026-01-01') };
    const newData = { id: 1n, cost: 200, status: 'Open', updated_at: new Date('2026-01-02') };
    const diff = generateDiff(oldData, newData);
    expect(diff).toEqual({ cost: { old: 100, new: 200 } });
  });

  it('serializes BigInt and Date changes so audit JSON never breaks a mutation', () => {
    const diff = generateDiff(
      { category_id: 1n, activity_date: new Date('2026-01-01T00:00:00.000Z') },
      { category_id: 2n, activity_date: new Date('2026-01-02T00:00:00.000Z') },
    );
    expect(diff).toEqual({
      category_id: { old: '1', new: '2' },
      activity_date: { old: '2026-01-01T00:00:00.000Z', new: '2026-01-02T00:00:00.000Z' },
    });
  });

  it('serializes Prisma Decimal values as JSON-safe text', () => {
    expect(generateDiff({ cost: new Prisma.Decimal('1.20') }, { cost: new Prisma.Decimal('2.30') }))
      .toEqual({ cost: { old: '1.2', new: '2.3' } });
  });
});
