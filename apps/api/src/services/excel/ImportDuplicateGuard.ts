export interface ImportMergeOptions<Incoming, Existing extends { id: bigint }> {
  incoming: readonly Incoming[];
  existing: readonly Existing[];
  getIncomingIdentity: (row: Incoming) => string;
  getExistingIdentities: (row: Existing) => readonly string[];
  create: (row: Incoming) => Promise<Existing>;
  mergeExisting: (existing: Existing, incoming: Incoming) => Promise<void>;
}

export async function mergeImportedRows<Incoming, Existing extends { id: bigint }>(
  options: ImportMergeOptions<Incoming, Existing>
): Promise<void> {
  const byIdentity = new Map<string, Existing>();

  for (const existing of options.existing) {
    for (const identity of options.getExistingIdentities(existing)) {
      if (!byIdentity.has(identity)) byIdentity.set(identity, existing);
    }
  }

  for (const incoming of options.incoming) {
    const identity = options.getIncomingIdentity(incoming);
    const existing = byIdentity.get(identity);

    if (existing) {
      await options.mergeExisting(existing, incoming);
      continue;
    }

    const created = await options.create(incoming);
    for (const createdIdentity of options.getExistingIdentities(created)) {
      if (!byIdentity.has(createdIdentity)) byIdentity.set(createdIdentity, created);
    }
    if (!byIdentity.has(identity)) byIdentity.set(identity, created);
  }
}
