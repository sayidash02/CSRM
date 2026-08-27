import ExcelJS from 'exceljs';
import prisma from '../../lib/prisma';
import { extractCellString } from './ExcelCellUtils';
import { parseCellDate, parseCellNumber } from './ExcelValueParser';
import {
  makeCsrProjectIdentity,
  makeDailyActivityIdentity,
  makeGrievanceFallbackIdentity,
  makeGrievanceIdentity,
  makeImportIdentity,
  makeLrpIdentity,
  makeProposalFallbackIdentity,
  makeProposalIdentity,
  makeStakeholderIdentity,
  makeTopIssueIdentity
} from './ImportIdentity';
import { getWorkbookSheetContract } from './WorkbookContract';
import type { ImportConflict, ImportPreviewSummary } from '../ExcelImportService';

export function trunc(val: string | null | undefined, max: number): string | null {
  if (!val) return null;
  const s = String(val).trim();
  return s.length > max ? s.slice(0, max) : s;
}

export function truncStr(val: string | null | undefined, max: number, defaultVal: string = ''): string {
  if (!val) return defaultVal;
  const s = String(val).trim();
  if (!s) return defaultVal;
  return s.length > max ? s.slice(0, max) : s;
}


export function findColIndex(colMap: Map<string, number>, keywords: string[]): number {
  for (const kw of keywords) {
    for (const [headerText, colNum] of colMap.entries()) {
      if (headerText === kw) {
        return colNum;
      }
    }
  }
  for (const kw of keywords) {
    for (const [headerText, colNum] of colMap.entries()) {
      if (headerText.includes(kw)) {
        return colNum;
      }
    }
  }
  return -1;
}

export function extractAttachmentValue(value: unknown): string | null {
  // Legacy document cells are compatibility columns only. CRMS does not
  // persist or resolve their URL values; photos use the authenticated binary
  // upload endpoint instead.
  return extractCellString(value) || null;
}

export function isRowNonEmpty(row: ExcelJS.Row): boolean {
  if (!row || !row.values) return false;
  const values = Array.isArray(row.values) ? row.values : Object.values(row.values);
  return values.some((val) => {
    if (val === null || val === undefined) return false;
    const str = extractCellString(val).trim();
    return str.length > 0;
  });
}

export function isRowIdentical(row1: ExcelJS.Row, row2: ExcelJS.Row): boolean {
  if (!row1 || !row2 || !row1.values || !row2.values) return false;
  const v1 = Array.isArray(row1.values) ? row1.values : Object.values(row1.values);
  const v2 = Array.isArray(row2.values) ? row2.values : Object.values(row2.values);

  const maxLen = Math.max(v1.length, v2.length);
  for (let i = 1; i < maxLen; i++) {
    const s1 = extractCellString(v1[i]).toLowerCase();
    const s2 = extractCellString(v2[i]).toLowerCase();
    if (s1 !== s2) return false;
  }
  return true;
}

export function detectSheetHeader(worksheet: ExcelJS.Worksheet): { sheetType: keyof ImportPreviewSummary; headerRowIndex: number } | null {
  const sheetNameLower = worksheet.name.toLowerCase().trim();

  // Prefer the canonical contract only when the expected header is actually
  // present at its declared row. Older workbooks often use the same sheet name
  // with a compact header on row 1, which remains supported by the heuristic.
  const contract = getWorkbookSheetContract(worksheet.name, worksheet.state);
  if (contract) {
    for (const headerRowIndex of contract.headerRows) {
      const values = worksheet.getRow(headerRowIndex).values;
      const headerText = (Array.isArray(values) ? values : Object.values(values ?? {}))
        .map((value) => extractCellString(value).trim().toLowerCase());
      const matches = contract.headers.filter((header) => headerText.includes(header.trim().toLowerCase())).length;
      if (matches >= Math.min(2, contract.headers.length)) {
        return { sheetType: contract.module, headerRowIndex };
      }
    }
  }

  // Ignore sheets that are typically raw dumps, pivot tables, templates, master data, or references
  if (
    ['raw', 'master', 'reference', 'sheet1', 'sheet2', 'sheet3', 'data'].includes(sheetNameLower) ||
    sheetNameLower.startsWith('raw') ||
    sheetNameLower.includes('master') ||
    sheetNameLower.includes('jangan dihapus') ||
    sheetNameLower.includes('reference') ||
    sheetNameLower.includes('template') ||
    sheetNameLower.includes('panduan')
  ) {
    return null;
  }

  let bestMatch: { sheetType: keyof ImportPreviewSummary; headerRowIndex: number, colCount: number } | null = null;

  const maxCheckRow = Math.min(10, worksheet.rowCount);
  for (let r = 1; r <= maxCheckRow; r++) {
    const row = worksheet.getRow(r);
    if (!row || !row.values) continue;

    const cellTexts: string[] = [];
    row.eachCell({ includeEmpty: false }, (cell) => {
      const str = extractCellString(cell.value).toLowerCase();
      // Ignore long texts which are likely data paragraphs, not headers
      if (str && str.length <= 100) cellTexts.push(str);
    });

    if (cellTexts.length === 0) continue;

    const hasTanggal = cellTexts.some(t => t.includes('tanggal') || t.includes('date'));
    const hasKegiatan = cellTexts.some(t => t.includes('kegiatan'));
    const hasStakeholder = cellTexts.some(t => t === 'stakeholder' || t === 'nama stakeholder' || t.includes('pihak'));
    const hasIssue = cellTexts.some(t => t === 'issue' || t === 'isu' || t.includes('concern') || t.includes('masalah'));
    const hasTop = cellTexts.some(t => t.includes('top'));
    const hasNoReg = cellTexts.some(t => t.includes('no registrasi') || t.includes('registrasi'));
    const hasInstansi = cellTexts.some(t => t.includes('instansi'));
    const hasProgram = cellTexts.some(t => t.includes('program'));
    const hasGrievance = cellTexts.some(t => t.includes('grievance') || t.includes('keluhan') || t.includes('investigation') || t.includes('resolution') || t.includes('significance'));
    const hasNo = cellTexts.some(t => t === 'no' || t === 'no.' || t === 'no ' || t === 'nomor');
    const hasDocs = cellTexts.some(t => t.includes('dokumen') || t.includes('docs') || t.includes('document'));

    let matchedType: keyof ImportPreviewSummary | null = null;

    if (hasTanggal && hasKegiatan) {
      matchedType = 'dailyActivities';
    } else if (hasStakeholder && (hasTanggal || hasIssue || hasDocs || hasNo || cellTexts.some(t => t.includes('venue')))) {
      matchedType = 'stakeholders';
    } else if (hasIssue && (hasTop || hasNo || hasDocs || cellTexts.some(t => t.includes('tindak') || t.includes('follow')))) {
      matchedType = 'topIssues';
    } else if (hasNoReg || hasInstansi) {
      matchedType = 'proposals';
    } else if ((hasProgram && hasNo) || (sheetNameLower.includes('csr') && (hasProgram || hasKegiatan || hasNo))) {
      matchedType = 'csr';
    } else if (hasGrievance && (hasNo || hasTanggal || hasIssue)) {
      matchedType = 'grievance';
    }

    if (matchedType) {
      if (!bestMatch || cellTexts.length >= bestMatch.colCount) {
        bestMatch = { sheetType: matchedType, headerRowIndex: r, colCount: cellTexts.length };
      }
    }
  }

  if (bestMatch) {
    return { sheetType: bestMatch.sheetType, headerRowIndex: bestMatch.headerRowIndex };
  }

  // Fallback sheet name matching if keywords weren't explicitly found in rows 1..10
  if (sheetNameLower.includes('daily')) return { sheetType: 'dailyActivities', headerRowIndex: 1 };
  if (sheetNameLower.includes('stakeholder')) return { sheetType: 'stakeholders', headerRowIndex: 1 };
  if (sheetNameLower.includes('issue') || sheetNameLower.includes('top')) return { sheetType: 'topIssues', headerRowIndex: 1 };
  if (sheetNameLower.includes('proposal')) return { sheetType: 'proposals', headerRowIndex: 1 };
  if (sheetNameLower.includes('csr')) return { sheetType: 'csr', headerRowIndex: 1 };
  if (sheetNameLower.includes('grievance')) return { sheetType: 'grievance', headerRowIndex: 1 };
  if (sheetNameLower === 'lrp' || sheetNameLower.startsWith('lrp ')) return { sheetType: 'lrp', headerRowIndex: 1 };

  return null;
}

export function normalized(value: unknown): string {
  return extractCellString(value).trim().replace(/\s+/g, ' ').toLowerCase();
}

export function rowColumnMap(worksheet: ExcelJS.Worksheet, headerRowIndex: number): Map<string, number> {
  const result = new Map<string, number>();
  worksheet.getRow(headerRowIndex).eachCell({ includeEmpty: false }, (cell, column) => {
    const key = normalized(cell.value);
    if (key) result.set(key, column);
  });
  return result;
}

export function rowValue(row: ExcelJS.Row, columns: Map<string, number>, names: string[]): string {
  const index = findColIndex(columns, names);
  return index === -1 ? '' : extractCellString(row.getCell(index).value).trim();
}

export function shouldReadDataRow(
  worksheet: ExcelJS.Worksheet,
  detection: { sheetType: keyof ImportPreviewSummary; headerRowIndex: number },
  rowNumber: number,
): boolean {
  const contract = getWorkbookSheetContract(worksheet.name, worksheet.state);
  // Canonical multi-row templates use a grouping row between the header and
  // data. Compact legacy sheets (header row 1) remain backward compatible.
  return !(contract && detection.headerRowIndex > 1 && rowNumber < contract.dataStartRow);
}

export function validationSignature(...values: unknown[]): string {
  return values.map((value) => normalized(value)).join('|');
}

export function validationDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string' && value.includes('\n')) return parseCellDate(value.split('\n')[0]);
  return parseCellDate(value);
}

export function validationYear(value: unknown): number | null {
  const parsed = parseCellNumber(value);
  if (parsed !== null && Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2100) return parsed;
  if (typeof value === 'string') {
    const match = value.match(/\b(19\d\d|20\d\d|2100)\b/);
    if (match && match[1]) return parseInt(match[1], 10);
  }
  return null;
}

export function normalizeCategoryName(val: string | null | undefined, activityName?: string): string {
  if (!val) {
    if (activityName) {
      const act = activityName.toLowerCase();
      if (act.includes('security') || act.includes('patroli') || act.includes('laporan') || act.includes('data entry') || act.includes('paper')) {
        return 'Paper Work';
      }
      if (act.includes('engagement') || act.includes('rapat') || act.includes('koordinasi') || act.includes('sosialisasi') || act.includes('donasi') || act.includes('kunjungan')) {
        return 'Stakeholder Engagement';
      }
    }
    return '';
  }
  const s = val.trim();
  const lower = s.toLowerCase();
  if (lower === 'papper work' || lower === 'paper work' || lower === 'paperwork') return 'Paper Work';
  if (lower === 'stakeholder engagement' || lower === 'engagement') return 'Stakeholder Engagement';
  return s;
}

export function normalizeSubCategoryName(val: string | null | undefined, categoryName?: string, activityName?: string): string {
  if (!val) {
    if (activityName) {
      const act = activityName.toLowerCase();
      if (act.includes('security')) return 'Security';
      if (act.includes('meeting') || act.includes('rapat') || act.includes('internal')) return 'Internal Meeting';
      if (act.includes('olah data') || act.includes('entry') || act.includes('database')) return 'Data Processing (Olah Data)';
      if (act.includes('donasi') || act.includes('snack') || act.includes('bantuan')) return 'Donasi';
    }
    return '';
  }
  const s = val.trim();
  const lower = s.toLowerCase();
  if (lower === 'olah data' || lower === 'data processing (olah data)' || lower === 'data processing') {
    return 'Data Processing (Olah Data)';
  }
  if (lower === 'issue dan grievance' || lower === 'issue & grievance' || lower === 'issue-grievance') {
    return 'Issue & Grievance';
  }
  return s;
}

export function normalizeCsrStatus(val: string | null | undefined): string {
  if (!val) return 'Planning';
  const lower = val.trim().toLowerCase();
  if (['completed', 'sudah terlaksana', 'terlaksana', 'selesai', 'done', 'closed'].some(s => lower.includes(s))) return 'Completed';
  if (['on going', 'on-going', 'ongoing', 'sedang berjalan', 'dalam proses', 'proses', 'pelaksanaan', 'masuk', 'tahap', 'belum'].some(s => lower.includes(s))) return 'On Going';
  if (['planning', 'perencanaan', 'rencana'].some(s => lower.includes(s))) return 'Planning';
  if (['cancelled', 'canceled', 'dibatalkan', 'batal'].some(s => lower.includes(s))) return 'Cancelled';
  return 'On Going';
}

export function normalizeProposalStatus(val: string | null | undefined): string {
  if (!val) return 'Accept';
  const lower = val.trim().toLowerCase();
  if (['accept', 'accepted', 'diterima', 'setuju', 'disetujui', ''].includes(lower)) return 'Accept';
  if (['decline', 'declined', 'ditolak', 'tidak disetujui'].includes(lower)) return 'Decline';
  return val.trim() || 'Accept';
}

export function normalizeGrievanceSignificance(val: string | null | undefined): string {
  if (!val) return 'Low';
  const lower = val.trim().toLowerCase().replace(/[,]/g, '');
  if (lower.includes('critical') || lower.includes('kritis')) return 'Critical';
  if (lower.includes('high') || lower.includes('tinggi')) return 'High';
  if (lower.includes('medium') || lower.includes('sedang')) return 'Medium';
  if (lower.includes('low') || lower.includes('rendah') || lower.includes('not genuine')) return 'Low';
  return 'Low';
}

export function normalizeGrievanceStatus(val: string | null | undefined): string {
  if (!val) return 'Open';
  const lower = val.trim().toLowerCase();
  if (lower.includes('resolved') || lower.includes('selesai')) return 'Resolved';
  if (lower.includes('closed') || lower.includes('tutup')) return 'Closed';
  if (lower.includes('progress') || lower.includes('on going') || lower.includes('proses')) return 'On Progress';
  if (lower.includes('open') || lower.includes('buka')) return 'Open';
  return 'Open';
}

export function normalizePicName(val: string): string {
  return val.trim();
}

export function allocateImportRegistration(prefix: 'PROP' | 'GRV', year: number, used: Set<string>): string {
  let sequence = 1;
  while (sequence <= 9999) {
    const candidate = `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
    if (!used.has(candidate.toLowerCase())) {
      used.add(candidate.toLowerCase());
      return candidate;
    }
    sequence += 1;
  }
  throw new Error(`Registration number space exhausted for ${prefix} ${year}`);
}

interface WorkbookValidationReport {
  summary: ImportPreviewSummary;
  conflicts: ImportConflict[];
}

/** Validate before any write. Invalid rows are reported, never defaulted. */
export async function validateWorkbook(workbook: ExcelJS.Workbook): Promise<WorkbookValidationReport> {
  const summary: ImportPreviewSummary = {
    dailyActivities: 0,
    stakeholders: 0,
    topIssues: 0,
    proposals: 0,
    csr: 0,
    grievance: 0,
    lrp: 0,
  };
  const conflicts: ImportConflict[] = [];
  const add = (module: keyof ImportPreviewSummary, row: number, code: string, message: string, blocking = true, extra: Partial<ImportConflict> = {}) =>
    conflicts.push({ module, row, code, message, blocking, ...extra });

  const [pics, categories, subCategories, proposals, grievances, topIssues, lrps] = await Promise.all([
    prisma.pics.findMany({ select: { id: true, name: true } }),
    prisma.categories.findMany({ select: { id: true, name: true } }),
    prisma.sub_categories.findMany({ select: { id: true, category_id: true, name: true } }),
    prisma.proposals.findMany(),
    prisma.grievance.findMany(),
    prisma.top_issues.findMany(),
    prisma.lrp.findMany(),
  ]);
  const picNames = new Set(pics.map((item) => item.name.trim().toLowerCase()));
  const categoryNames = new Set(categories.map((item) => item.name.trim().toLowerCase()));
  const subCategoryNames = new Set(subCategories.map((item) => `${item.category_id}:${item.name.trim().toLowerCase()}`));
  const seen = new Map<string, { signature: string; row: number }>();
  const recordDuplicate = (module: keyof ImportPreviewSummary, row: number, identity: string, signature: string) => {
    const key = `${module}|${identity}`;
    const previous = seen.get(key);
    if (previous) {
      if (previous.signature === signature) {
        add(module, row, 'DUPLICATE_IDENTICAL', `Baris identik dengan baris ${previous.row}; akan dilewati`, false, { identity });
      } else {
        add(module, row, 'IDENTITY_CONFLICT', `Identitas sama dengan baris ${previous.row} tetapi nilai berbeda`, true, { identity });
      }
    } else {
      seen.set(key, { signature, row });
    }
  };
  for (const worksheet of workbook.worksheets) {
    const detection = detectSheetHeader(worksheet);
    if (!detection) continue;
    const module = detection.sheetType;
    const columns = rowColumnMap(worksheet, detection.headerRowIndex);
    for (let rowNumber = detection.headerRowIndex + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      if (!shouldReadDataRow(worksheet, detection, rowNumber) || !isRowNonEmpty(row) || isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;
      summary[module] += 1;

      if (module === 'dailyActivities') {
        const date = rowValue(row, columns, ['tanggal', 'date', 'activity_date']);
        const activity = rowValue(row, columns, ['kegiatan', 'activity', 'nama kegiatan']);
        const rawCat = rowValue(row, columns, ['category', 'kategori']);
        const rawSubCat = rowValue(row, columns, ['sub_category', 'sub category', 'subkategori', 'sub kategori']);
        const pic = rowValue(row, columns, ['pic', 'pic name', 'nama pic']);

        const category = normalizeCategoryName(rawCat, activity) || 'Umum';
        const subCategory = normalizeSubCategoryName(rawSubCat, category, activity) || 'Lainnya';

        if (!validationDate(date)) add(module, rowNumber, 'INVALID_DATE', 'Tanggal wajib diisi dan harus valid');
        if (!activity) add(module, rowNumber, 'REQUIRED_ACTIVITY', 'Kegiatan wajib diisi');
        if (!rawCat) {
          add(module, rowNumber, 'EMPTY_CATEGORY', `Kategori tidak diisi; diimpor dengan kategori '${category}'`, false);
        } else if (!categoryNames.has(category.toLowerCase())) {
          add(module, rowNumber, 'NEW_CATEGORY', `Kategori baru '${category}' akan dibuat otomatis`, false);
        }

        const categoryId = categories.find((item) => item.name.trim().toLowerCase() === category.toLowerCase())?.id;
        if (!rawSubCat) {
          add(module, rowNumber, 'EMPTY_SUBCATEGORY', `Sub Category tidak diisi; diimpor dengan sub kategori '${subCategory}'`, false);
        } else if (!categoryId || !subCategoryNames.has(`${categoryId}:${subCategory.toLowerCase()}`)) {
          add(module, rowNumber, 'NEW_SUBCATEGORY', `Sub Category baru '${subCategory}' akan dibuat otomatis`, false);
        }

        if (!pic) {
          add(module, rowNumber, 'EMPTY_PIC', 'PIC tidak diisi; baris akan diimpor tanpa PIC', false);
        } else {
          for (const rawName of pic.split(/[,&]|\bdan\b/i).map((item) => item.trim()).filter(Boolean)) {
            const name = normalizePicName(rawName);
            if (!picNames.has(name.toLowerCase())) {
              add(module, rowNumber, 'NEW_PIC', `PIC baru '${name}' akan dibuat otomatis`, false);
            }
          }
        }
        const cost = rowValue(row, columns, ['biaya', 'cost', 'anggaran']);
        const isCostEmpty = ['-', '—', 'n/a', 'na', 'nil', 'none', ''].includes(cost.trim().toLowerCase());
        if (cost && !isCostEmpty && parseCellNumber(cost) === null) add(module, rowNumber, 'INVALID_NUMBER', `Biaya '${cost}' bukan berupa angka`);
        continue;
      }

      if (module === 'stakeholders') {
        const stakeholder = rowValue(row, columns, ['stakeholder', 'nama stakeholder', 'pihak']);
        if (!stakeholder) add(module, rowNumber, 'REQUIRED_STAKEHOLDER', 'Stakeholder wajib diisi');
        const date = rowValue(row, columns, ['tanggal', 'date', 'waktu']);
        if (date && !validationDate(date)) add(module, rowNumber, 'INVALID_DATE', 'Tanggal stakeholder tidak valid');
        continue;
      }

      if (module === 'topIssues') {
        const period = rowValue(row, columns, ['periode', 'period']) || '2024';
        const issue = rowValue(row, columns, ['top issue', 'issue', 'isu', 'masalah']);
        const rawYear = rowValue(row, columns, ['year', 'tahun']);
        const year = validationYear(rawYear) ?? validationYear(period) ?? 2024;
        if (!period) add(module, rowNumber, 'REQUIRED_PERIOD', 'Periode wajib diisi');
        if (!issue) add(module, rowNumber, 'REQUIRED_ISSUE', 'Issue wajib diisi');
        const identity = validationSignature(period, issue, year);
        if (period && issue) {
          const existing = topIssues.find((item) => validationSignature(item.period, item.issue, item.year) === identity);
          if (existing) add(module, rowNumber, existing.is_deleted ? 'SOFT_DELETED_MATCH' : 'DUPLICATE_IDENTICAL', existing.is_deleted ? 'Issue cocok dengan record soft-deleted; import diblokir' : 'Issue identik sudah ada; akan dilewati', existing.is_deleted, { identity, existingId: String(existing.id) });
          recordDuplicate(module, rowNumber, identity, validationSignature(period, issue, rowValue(row, columns, ['deskripsi', 'description', 'keterangan']), rowValue(row, columns, ['follow up', 'tindak lanjut', 'follow_up'])));
        }
        continue;
      }

      if (module === 'proposals') {
        const registration = rowValue(row, columns, ['no registrasi', 'no reg', 'registration_no', 'nomor registrasi', 'no. reg', 'no.']);
        const date = rowValue(row, columns, ['tanggal diterima', 'date_received', 'tanggal', 'date']);
        const institution = rowValue(row, columns, ['instansi', 'institution', 'lembaga']);
        const rawStatus = rowValue(row, columns, ['status']);
        const status = normalizeProposalStatus(rawStatus);
        if (!validationDate(date)) add(module, rowNumber, 'INVALID_DATE', 'Tanggal penerimaan wajib diisi dan harus valid');
        if (!institution) add(module, rowNumber, 'REQUIRED_INSTITUTION', 'Instansi wajib diisi');
        if (!['Accept', 'Decline'].includes(status)) add(module, rowNumber, 'INVALID_STATUS', `Status proposal '${rawStatus}' tidak valid`);
        const identity = registration ? validationSignature('proposal-registration', registration) : validationSignature('proposal-fallback', date, institution, rowValue(row, columns, ['alamat', 'address']), rowValue(row, columns, ['deskripsi proposal', 'proposal_description', 'deskripsi', 'perihal', 'keterangan']));
        // Attachment columns are deliberately excluded: a second import may
        // legitimately backfill a link while preserving the same record.
        const signature = validationSignature(validationDate(date), institution, rowValue(row, columns, ['alamat', 'address']), rowValue(row, columns, ['deskripsi proposal', 'proposal_description', 'deskripsi', 'perihal', 'keterangan']), status);
        if (registration) {
          const existing = proposals.find((item) => item.registration_no.trim().toLowerCase() === registration.toLowerCase());
          if (existing) {
            const existingSignature = validationSignature(validationDate(existing.date_received), existing.institution, existing.address, existing.proposal_description, existing.status);
            add(module, rowNumber, existing.is_deleted ? 'SOFT_DELETED_MATCH' : existingSignature === signature ? 'DUPLICATE_IDENTICAL' : 'IDENTITY_CONFLICT', existing.is_deleted ? 'Nomor registrasi cocok dengan record soft-deleted; import diblokir' : existingSignature === signature ? 'Proposal identik sudah ada; akan dilewati' : 'Nomor registrasi sudah dipakai dengan data berbeda', existing.is_deleted || existingSignature !== signature, { identity, existingId: String(existing.id) });
          }
        }
        recordDuplicate(module, rowNumber, identity, signature);
        continue;
      }

      if (module === 'csr') {
        const rawYear = rowValue(row, columns, ['tahun', 'project_year', 'year']);
        const rawPeriod = rowValue(row, columns, ['periode pelaksanaan', 'waktu pelaksanaan', 'implementation_period', 'durasi', 'periode']);
        const year = validationYear(rawYear) ?? validationYear(rawPeriod) ?? 2026;
        const program = rowValue(row, columns, ['nama program', 'program']);
        const rawStatus = rowValue(row, columns, ['status']);
        const status = normalizeCsrStatus(rawStatus);
        if (year === null) add(module, rowNumber, 'INVALID_YEAR', 'Tahun CSR wajib berupa 1900–2100');
        if (!program) add(module, rowNumber, 'REQUIRED_PROGRAM', 'Program CSR wajib diisi');
        if (!['Planning', 'On Going', 'Completed', 'Cancelled'].includes(status)) add(module, rowNumber, 'INVALID_STATUS', `Status CSR '${rawStatus}' tidak valid`);
        continue;
      }

      if (module === 'grievance') {
        const registration = rowValue(row, columns, ['no registrasi', 'no reg', 'register_no', 'nomor registrasi', 'no. reg', 'no.', 'register no.', 'register no']);
        const date = rowValue(row, columns, ['tanggal log', 'log_date', 'tanggal', 'date', 'log date']);
        const complainant = rowValue(row, columns, ['nama pelapor', 'complainant_name', 'pelapor', 'complainant', 'name']);
        const rawSig = rowValue(row, columns, ['signifikansi', 'significance', 'tingkat']);
        const significance = normalizeGrievanceSignificance(rawSig);
        const rawStatus = rowValue(row, columns, ['status']);
        const status = normalizeGrievanceStatus(rawStatus);
        if (!validationDate(date)) add(module, rowNumber, 'INVALID_DATE', 'Log date wajib diisi dan harus valid');
        if (!complainant) add(module, rowNumber, 'REQUIRED_COMPLAINANT', 'Nama pelapor wajib diisi');
        if (!['Low', 'Medium', 'High', 'Critical'].includes(significance)) add(module, rowNumber, 'INVALID_SIGNIFICANCE', `Significance '${rawSig}' tidak valid`);
        if (status && !['Open', 'On Progress', 'Resolved', 'Closed'].includes(status)) add(module, rowNumber, 'INVALID_STATUS', `Status grievance '${rawStatus}' tidak valid`);
        const identity = registration ? validationSignature('grievance-register', registration) : validationSignature('grievance-fallback', date, complainant, rowValue(row, columns, ['alamat', 'address']), rowValue(row, columns, ['phone', 'no hp', 'telepon', 'no telepon']), rowValue(row, columns, ['kategori', 'category']), rowValue(row, columns, ['deskripsi', 'description', 'keluhan', 'rincian']), rowValue(row, columns, ['location', 'lokasi']));
        // Supporting files may be backfilled on re-import and are not part of
        // the conflict signature.
        const signature = validationSignature(
          validationDate(date),
          complainant,
          rowValue(row, columns, ['alamat', 'address']),
          rowValue(row, columns, ['phone', 'no hp', 'telepon', 'no telepon']),
          rowValue(row, columns, ['kategori', 'category']),
          significance,
          rowValue(row, columns, ['deskripsi', 'description', 'keluhan', 'rincian']),
          rowValue(row, columns, ['location', 'lokasi']),
          status || 'Open'
        );
        const existing = registration
          ? grievances.find((item) => item.register_no.trim().toLowerCase() === registration.toLowerCase())
          : grievances.find((item) => validationSignature('grievance-fallback', item.log_date, item.complainant_name, item.address, item.phone, item.category, item.description, item.location) === identity);
        if (existing) {
          const existingSignature = validationSignature(
            validationDate(existing.log_date),
            existing.complainant_name,
            existing.address,
            existing.phone,
            existing.category,
            existing.significance,
            existing.description,
            existing.location,
            existing.status
          );
          add(
            module,
            rowNumber,
            existing.is_deleted ? 'SOFT_DELETED_MATCH' : existingSignature === signature ? 'DUPLICATE_IDENTICAL' : 'IDENTITY_CONFLICT',
            existing.is_deleted
              ? 'Nomor registrasi cocok dengan record soft-deleted; import diblokir'
              : existingSignature === signature
                ? 'Grievance identik sudah ada; akan dilewati'
                : 'Nomor registrasi sudah ada; data akan diperbarui',
            existing.is_deleted,
            { identity, existingId: String(existing.id) }
          );
        }
        recordDuplicate(module, rowNumber, identity, signature);
        continue;
      }

      if (module === 'lrp') {
        const program = rowValue(row, columns, ['program']);
        const year = rowValue(row, columns, ['year', 'tahun']);
        if (!program) add(module, rowNumber, 'REQUIRED_PROGRAM', 'Program LRP wajib diisi');
        if (validationYear(year) === null) add(module, rowNumber, 'INVALID_YEAR', 'Tahun LRP wajib berupa 1900–2100');
        const identity = makeLrpIdentity(program, validationYear(year)!);
        const signature = validationSignature(program, year);
        const existing = lrps.find((item) => makeLrpIdentity(item.program, item.year) === identity);
        if (existing) {
          const existingSignature = validationSignature(existing.program, existing.year);
          add(
            module,
            rowNumber,
            existing.is_deleted ? 'SOFT_DELETED_MATCH' : existingSignature === signature ? 'DUPLICATE_IDENTICAL' : 'IDENTITY_CONFLICT',
            existing.is_deleted
              ? 'LRP cocok dengan record soft-deleted; import diblokir'
              : existingSignature === signature
                ? 'LRP identik sudah ada; akan dilewati'
                : 'Program dan tahun LRP sudah ada; data akan diperbarui',
            existing.is_deleted,
            { identity, existingId: String(existing.id) }
          );
        }
        recordDuplicate(module, rowNumber, identity, signature);
      }
    }
  }
  return { summary, conflicts };
}
