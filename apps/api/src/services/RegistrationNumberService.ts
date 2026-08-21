import prisma from '../lib/prisma';

type RegistrationKind = 'proposal' | 'grievance';

function prefix(kind: RegistrationKind): string {
  return kind === 'proposal' ? 'PROP' : 'GRV';
}

/**
 * Registration numbers are generated at the backend boundary. The lookup is
 * intentionally simple for this one-user system; the unique database index is
 * the final race-safety guard.
 */
export async function generateRegistrationNumber(
  kind: RegistrationKind,
  date: Date,
): Promise<string> {
  const year = date.getUTCFullYear();
  const marker = `${prefix(kind)}-${year}-`;
  const used = new Set<string>();
  if (kind === 'proposal') {
    const rows = await prisma.proposals.findMany({ select: { registration_no: true } });
    rows.forEach((row) => used.add(row.registration_no.toLowerCase()));
  } else {
    const rows = await prisma.grievance.findMany({ select: { register_no: true } });
    rows.forEach((row) => used.add(row.register_no.toLowerCase()));
  }

  let sequence = 1;
  while (sequence <= 9999) {
    const candidate = `${marker}${String(sequence).padStart(4, '0')}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
    sequence += 1;
  }
  throw new Error(`Registration number space exhausted for ${kind} ${year}`);
}
