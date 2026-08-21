export interface ImportMergeOptions<Incoming, Existing extends { id: bigint }> {
  incoming: readonly Incoming[];
  existing: readonly Existing[];
  getIncomingIdentity: (row: Incoming) => string;
  getExistingIdentities: (row: Existing) => readonly string[];
  getConflictFields?: (existing: Existing, incoming: Incoming) => readonly string[];
  create: (row: Incoming) => Promise<Existing>;
  mergeExisting: (existing: Existing, incoming: Incoming) => Promise<void>;
}

export interface ImportMergeConflict {
  identity: string;
  existingId: bigint;
  fields: readonly string[];
}

export interface ImportMergeResult {
  created: number;
  merged: number;
  duplicate: number;
  conflicts: ImportMergeConflict[];
}

export async function mergeImportedRows<Incoming, Existing extends { id: bigint }>(
  options: ImportMergeOptions<Incoming, Existing>
): Promise<ImportMergeResult> {
  const byIdentity = new Map<string, Existing>();
  const result: ImportMergeResult = { created: 0, merged: 0, duplicate: 0, conflicts: [] };

  for (const existing of options.existing) {
    for (const identity of options.getExistingIdentities(existing)) {
      if (!byIdentity.has(identity)) byIdentity.set(identity, existing);
    }
  }

  for (const incoming of options.incoming) {
    const identity = options.getIncomingIdentity(incoming);
    const existing = byIdentity.get(identity);

    if (existing) {
      result.duplicate += 1;
      const fields = options.getConflictFields?.(existing, incoming) ?? [];
      if (fields.length > 0) {
        result.conflicts.push({ identity, existingId: existing.id, fields });
      }
      await options.mergeExisting(existing, incoming);
      result.merged += 1;
      continue;
    }

    const created = await options.create(incoming);
    result.created += 1;
    for (const createdIdentity of options.getExistingIdentities(created)) {
      if (!byIdentity.has(createdIdentity)) byIdentity.set(createdIdentity, created);
    }
    if (!byIdentity.has(identity)) byIdentity.set(identity, created);
  }

  return result;
}
