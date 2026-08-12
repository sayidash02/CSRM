import { generateDiff } from '../../src/utils/diffHelper';

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
});
