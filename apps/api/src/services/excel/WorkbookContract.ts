/**
 * The workbook is an operational hand-off artifact, not an arbitrary export.
 * Keep sheet names, header locations, and the LRP addition in one place so
 * import and export code cannot silently drift apart.
 */

export const WORKBOOK_MODULES = [
  'dailyActivities',
  'stakeholders',
  'topIssues',
  'proposals',
  'csr',
  'grievance',
  'lrp',
] as const;

export type WorkbookModule = (typeof WORKBOOK_MODULES)[number];

export const LRP_SHEET_HEADERS = ['No', 'Program', 'Year'] as const;

export interface WorkbookSheetContract {
  module: WorkbookModule;
  canonicalName: string;
  namePattern: RegExp;
  headerRows: readonly number[];
  dataStartRow: number;
  headers: readonly string[];
}

const CONTRACTS: readonly WorkbookSheetContract[] = [
  {
    module: 'dailyActivities',
    canonicalName: 'Daily Activities',
    namePattern: /^daily\s+activities(?:\s+\d{4})?$/i,
    headerRows: [1],
    dataStartRow: 2,
    headers: [
      'No',
      'Tanggal',
      'Kegiatan',
      'Instansi/kelompok',
      'Alamat',
      'Kategori',
      'Sub Category',
      'Fokus',
      'Lokasi',
      'Biaya',
      'Keterangan',
      'Hasil',
      'link',
      'PIC',
    ],
  },
  {
    module: 'stakeholders',
    canonicalName: 'Stakeholder Engagement',
    namePattern: /^stakeholder\s+engagement(?:\s+\d{4})?$/i,
    headerRows: [4],
    dataStartRow: 5,
    headers: ['No', 'Stakeholder', 'Date And Venue', 'Concern/Issue', 'Docs'],
  },
  {
    module: 'topIssues',
    canonicalName: 'Top Issue',
    namePattern: /^top\s+issues?$/i,
    headerRows: [3],
    dataStartRow: 4,
    headers: [
      'No',
      'Periode',
      'Issue',
      'Deskripsi',
      'Follow Up',
      'Docs',
      'Supporting Docs',
      'Next Plan',
      'Year',
    ],
  },
  {
    module: 'proposals',
    canonicalName: 'Proposal',
    namePattern: /^proposal(?:s)?(?:\s+\d{4})?$/i,
    headerRows: [1],
    dataStartRow: 3,
    headers: [
      'NO',
      'NO REGISTRASI',
      'TANGGAL PENERIMAAN PROPOSAL',
      'INSTANSI',
      'ALAMAT',
      'KETERANGAN PROPOSAL',
      'PROPOSAL',
      'ASSESSMENT',
      'STATUS',
    ],
  },
  {
    module: 'csr',
    canonicalName: 'CSR Project',
    namePattern: /^csr\s+projects?(?:\s+\d{4})?$/i,
    headerRows: [1],
    dataStartRow: 2,
    headers: [
      'NO.',
      'Tahun',
      'PROGRAM',
      'KEGIATAN',
      'BENTUK KEGIATAN ',
      'LOKASI',
      'TARGET/SASARAN',
      'TUJUAN',
      'STATUS',
      ' REALISASI',
      'WAKTU PELAKSANAAN',
      'DOKUMENTASI',
      'LINKS (DOCS)',
    ],
  },
  {
    module: 'grievance',
    canonicalName: 'Grievance',
    namePattern: /^grievance(?:\s+\d{4})?$/i,
    headerRows: [6, 5],
    dataStartRow: 7,
    headers: [
      'Register No.',
      'Log Date',
      'Name',
      'Address',
      'Phone',
      'Category',
      'Significance',
      'Description',
      'Location',
      'Investigation',
      'Resolution',
      'Complainant Feedback',
      'Status',
      'Remarks',
      'Related supporting docs (photo, settlement note etc)',
    ],
  },
  {
    module: 'lrp',
    canonicalName: 'LRP',
    namePattern: /^lrp(?:\s+\d{4})?$/i,
    headerRows: [1],
    dataStartRow: 2,
    headers: LRP_SHEET_HEADERS,
  },
];

const NON_OPERATIONAL_SHEET_NAMES = new Set([
  'raw',
  'master',
  'master (jangan dihapus)',
  'reference',
  'sheet1',
  'sheet2',
  'sheet3',
  'data',
]);

/**
 * Resolve a visible operational worksheet by name. Hidden helper sheets are
 * deliberately excluded so an embedded Raw/Grievance sheet is never imported
 * as a second set of records.
 */
export function getWorkbookSheetContract(
  sheetName: string,
  sheetState: 'visible' | 'hidden' | 'veryHidden' = 'visible',
): WorkbookSheetContract | null {
  if (sheetState !== 'visible') return null;

  const normalizedName = sheetName.trim().toLowerCase();
  if (
    NON_OPERATIONAL_SHEET_NAMES.has(normalizedName) ||
    normalizedName.includes('jangan dihapus') ||
    normalizedName.includes('template') ||
    normalizedName.includes('panduan')
  ) {
    return null;
  }

  return CONTRACTS.find((contract) => contract.namePattern.test(sheetName.trim())) ?? null;
}

export function getWorkbookSheetContracts(): readonly WorkbookSheetContract[] {
  return CONTRACTS;
}
