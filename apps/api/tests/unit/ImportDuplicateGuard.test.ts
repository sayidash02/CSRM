import { mergeImportedRows } from '../../src/services/excel/ImportDuplicateGuard';

type Row = { id: bigint; value: string };

describe('mergeImportedRows', () => {
  it('reports a legitimate identical duplicate without creating a second row', async () => {
    const created: string[] = [];
    const result = await mergeImportedRows({
      incoming: [{ value: 'same' }],
      existing: [{ id: 1n, value: 'same' }],
      getIncomingIdentity: (row) => row.value,
      getExistingIdentities: (row) => [row.value],
      getConflictFields: (existing, incoming) => existing.value === incoming.value ? [] : ['value'],
      create: async (row) => {
        created.push(row.value);
        return { id: 2n, value: row.value };
      },
      mergeExisting: async () => undefined,
    });

    expect(created).toEqual([]);
    expect(result).toMatchObject({ created: 0, merged: 1, duplicate: 1, conflicts: [] });
  });

  it('reports a conflict when the identity matches but data differs', async () => {
    const result = await mergeImportedRows({
      incoming: [{ value: 'new value' }],
      existing: [{ id: 1n, value: 'old value' }],
      getIncomingIdentity: () => 'stable-id',
      getExistingIdentities: () => ['stable-id'],
      getConflictFields: () => ['value'],
      create: async (row) => ({ id: 2n, value: row.value }),
      mergeExisting: async () => undefined,
    });

    expect(result.conflicts).toEqual([
      expect.objectContaining({ identity: 'stable-id', fields: ['value'] }),
    ]);
  });
});

