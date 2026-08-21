import { extractCellString } from './ExcelCellUtils';

function normalizeImportIdentityValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }

  const text = extractCellString(value).trim().replace(/\s+/g, ' ').toLowerCase();
  if (!text) return '';

  const numeric = Number(text);
  if (Number.isFinite(numeric) && /^[-+]?\d+(?:[.,]\d+)?$/.test(text)) {
    return numeric.toString();
  }

  return text;
}

export function makeImportIdentity(...values: unknown[]): string {
  return values.map(normalizeImportIdentityValue).join('\u001f');
}

export function makeDailyActivityIdentity(
  item: {
    activity_date: Date;
    activity: string;
    institution_group: string | null;
    address: string | null;
    focus: string | null;
    location: string | null;
    keterangan: string | null;
    hasil: string | null;
    cost: unknown;
  },
  categoryId: bigint,
  subCategoryId: bigint,
  picIds: bigint[]
): string {
  return makeImportIdentity(
    'daily',
    item.activity_date,
    item.activity,
    item.institution_group,
    item.address,
    item.focus,
    item.location,
    item.keterangan,
    item.hasil,
    item.cost,
    categoryId,
    subCategoryId,
    Array.from(new Set(picIds.map(String))).sort().join(',')
  );
}

export function makeStakeholderIdentity(item: {
  stakeholder: string | null;
  date: Date | null;
  venue: string | null;
  concern_issue: string | null;
}): string {
  return makeImportIdentity('stakeholder', item.stakeholder, item.date, item.venue, item.concern_issue);
}

export function makeTopIssueIdentity(period: string, issue: string, year?: number): string {
  return makeImportIdentity('top-issue', period, issue, year);
}

export function makeLrpIdentity(program: string, year: number): string {
  return makeImportIdentity('lrp', program, year);
}

export function makeProposalFallbackIdentity(item: {
  date_received: Date;
  institution: string;
  address: string | null;
  proposal_description: string | null;
}): string {
  return makeImportIdentity('proposal-fallback', item.date_received, item.institution, item.address, item.proposal_description);
}

export function makeProposalIdentity(item: {
  source_registration_no: string | null;
  date_received: Date;
  institution: string;
  address: string | null;
  proposal_description: string | null;
}): string {
  if (item.source_registration_no) {
    return makeImportIdentity('proposal-registration', item.source_registration_no);
  }
  return makeProposalFallbackIdentity(item);
}

export function makeCsrProjectIdentity(item: {
  project_year: number;
  program: string;
  activity: string | null;
  type_of_activity: string | null;
  location: string | null;
  target_beneficiaries: string | null;
  objective: string | null;
  implementation_period: string | null;
}): string {
  return makeImportIdentity(
    'csr',
    item.project_year,
    item.program,
    item.activity,
    item.type_of_activity,
    item.location,
    item.target_beneficiaries,
    item.objective,
    item.implementation_period
  );
}

export function makeGrievanceFallbackIdentity(item: {
  log_date: Date;
  complainant_name: string;
  address: string | null;
  phone: string | null;
  category: string | null;
  description: string | null;
  location: string | null;
}): string {
  return makeImportIdentity(
    'grievance-fallback',
    item.log_date,
    item.complainant_name,
    item.address,
    item.phone,
    item.category,
    item.description,
    item.location
  );
}

export function makeGrievanceIdentity(item: {
  source_register_no: string | null;
  log_date: Date;
  complainant_name: string;
  address: string | null;
  phone: string | null;
  category: string | null;
  description: string | null;
  location: string | null;
}): string {
  if (item.source_register_no) {
    return makeImportIdentity('grievance-register', item.source_register_no);
  }
  return makeGrievanceFallbackIdentity(item);
}
