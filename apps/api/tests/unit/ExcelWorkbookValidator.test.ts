import {
  findColIndex,
  normalizeCategoryName,
  normalizeCsrStatus,
  normalizeGrievanceSignificance,
  normalizeGrievanceStatus,
  normalizePicName,
  normalizeProposalStatus,
  normalizeSubCategoryName,
  trunc,
  truncStr,
  validationDate,
  validationSignature,
  validationYear,
} from '../../src/services/excel/ExcelWorkbookValidator';

describe('ExcelWorkbookValidator Unit Tests', () => {
  describe('normalizeCategoryName', () => {
    it('normalizes common typos and case variations', () => {
      expect(normalizeCategoryName('Papper Work')).toBe('Paper Work');
      expect(normalizeCategoryName('paper work')).toBe('Paper Work');
      expect(normalizeCategoryName('paperwork')).toBe('Paper Work');
      expect(normalizeCategoryName('stakeholder engagement')).toBe('Stakeholder Engagement');
      expect(normalizeCategoryName('engagement')).toBe('Stakeholder Engagement');
      expect(normalizeCategoryName('Community Development')).toBe('Community Development');
      expect(normalizeCategoryName('')).toBe('');
      expect(normalizeCategoryName(null)).toBe('');
    });
  });

  describe('normalizeSubCategoryName', () => {
    it('normalizes sub category variations', () => {
      expect(normalizeSubCategoryName('Olah data')).toBe('Data Processing (Olah Data)');
      expect(normalizeSubCategoryName('data processing')).toBe('Data Processing (Olah Data)');
      expect(normalizeSubCategoryName('Issue dan Grievance')).toBe('Issue & Grievance');
      expect(normalizeSubCategoryName('issue & grievance')).toBe('Issue & Grievance');
      expect(normalizeSubCategoryName('issue-grievance')).toBe('Issue & Grievance');
      expect(normalizeSubCategoryName('Others')).toBe('Others');
      expect(normalizeSubCategoryName('')).toBe('');
      expect(normalizeSubCategoryName(null)).toBe('');
    });
  });

  describe('normalizeCsrStatus', () => {
    it('normalizes indonesian and english status variations', () => {
      expect(normalizeCsrStatus('Sudah terlaksana')).toBe('Completed');
      expect(normalizeCsrStatus('terlaksana')).toBe('Completed');
      expect(normalizeCsrStatus('selesai')).toBe('Completed');
      expect(normalizeCsrStatus('done')).toBe('Completed');
      expect(normalizeCsrStatus('sedang berjalan')).toBe('On Going');
      expect(normalizeCsrStatus('dalam proses')).toBe('On Going');
      expect(normalizeCsrStatus('proses')).toBe('On Going');
      expect(normalizeCsrStatus('on-going')).toBe('On Going');
      expect(normalizeCsrStatus('perencanaan')).toBe('Planning');
      expect(normalizeCsrStatus('dibatalkan')).toBe('Cancelled');
      expect(normalizeCsrStatus('')).toBe('Planning');
      expect(normalizeCsrStatus(null)).toBe('Planning');
    });
  });

  describe('normalizeProposalStatus', () => {
    it('normalizes proposal status with default to Accept for blank legacy imports', () => {
      expect(normalizeProposalStatus('')).toBe('Accept');
      expect(normalizeProposalStatus(null)).toBe('Accept');
      expect(normalizeProposalStatus('accept')).toBe('Accept');
      expect(normalizeProposalStatus('accepted')).toBe('Accept');
      expect(normalizeProposalStatus('disetujui')).toBe('Accept');
      expect(normalizeProposalStatus('diterima')).toBe('Accept');
      expect(normalizeProposalStatus('ditolak')).toBe('Decline');
      expect(normalizeProposalStatus('decline')).toBe('Decline');
      expect(normalizeProposalStatus('Pending')).toBe('Pending');
    });
  });

  describe('normalizeGrievanceSignificance', () => {
    it('normalizes grievance significance levels', () => {
      expect(normalizeGrievanceSignificance('low')).toBe('Low');
      expect(normalizeGrievanceSignificance('rendah')).toBe('Low');
      expect(normalizeGrievanceSignificance('sedang')).toBe('Medium');
      expect(normalizeGrievanceSignificance('medium')).toBe('Medium');
      expect(normalizeGrievanceSignificance('tinggi')).toBe('High');
      expect(normalizeGrievanceSignificance('high')).toBe('High');
      expect(normalizeGrievanceSignificance('kritis')).toBe('Critical');
      expect(normalizeGrievanceSignificance('critical')).toBe('Critical');
      expect(normalizeGrievanceSignificance(null)).toBe('Low');
    });
  });

  describe('normalizeGrievanceStatus', () => {
    it('normalizes grievance status', () => {
      expect(normalizeGrievanceStatus('buka')).toBe('Open');
      expect(normalizeGrievanceStatus('open')).toBe('Open');
      expect(normalizeGrievanceStatus('progress')).toBe('On Progress');
      expect(normalizeGrievanceStatus('proses')).toBe('On Progress');
      expect(normalizeGrievanceStatus('selesai')).toBe('Resolved');
      expect(normalizeGrievanceStatus('resolved')).toBe('Resolved');
      expect(normalizeGrievanceStatus('tutup')).toBe('Closed');
      expect(normalizeGrievanceStatus('closed')).toBe('Closed');
      expect(normalizeGrievanceStatus(null)).toBe('Open');
    });
  });

  describe('normalizePicName', () => {
    it('trims whitespace cleanly', () => {
      expect(normalizePicName('  Septian  ')).toBe('Septian');
      expect(normalizePicName('Ziya')).toBe('Ziya');
    });
  });

  describe('validationYear', () => {
    it('extracts 4-digit years from numbers and descriptive strings', () => {
      expect(validationYear(2026)).toBe(2026);
      expect(validationYear('2026')).toBe(2026);
      expect(validationYear('April 2026 : Tanggal 13-17')).toBe(2026);
      expect(validationYear('Tahun 2025 Semester 1')).toBe(2025);
      expect(validationYear('invalid string')).toBeNull();
      expect(validationYear(null)).toBeNull();
      expect(validationYear(1800)).toBeNull(); // Out of valid range
    });
  });

  describe('findColIndex', () => {
    it('finds column by exact keyword first, then by substring', () => {
      const colMap = new Map<string, number>([
        ['no', 1],
        ['tanggal', 2],
        ['daily title / kegiatan', 3],
        ['kategori', 4],
      ]);

      expect(findColIndex(colMap, ['no'])).toBe(1);
      expect(findColIndex(colMap, ['tanggal', 'date'])).toBe(2);
      expect(findColIndex(colMap, ['kegiatan', 'activity'])).toBe(3);
      expect(findColIndex(colMap, ['biaya', 'cost'])).toBe(-1);
    });
  });

  describe('trunc & truncStr', () => {
    it('truncates strings exceeding max length', () => {
      expect(trunc('Hello World', 5)).toBe('Hello');
      expect(trunc('Hi', 5)).toBe('Hi');
      expect(trunc(null, 5)).toBeNull();

      expect(truncStr('Hello World', 5, 'default')).toBe('Hello');
      expect(truncStr('', 5, 'default')).toBe('default');
      expect(truncStr(null, 5, 'default')).toBe('default');
    });
  });

  describe('validationSignature & validationDate', () => {
    it('creates lowercase piped signatures', () => {
      expect(validationSignature('Minggu 1', 'Issue A', 2026)).toBe('minggu 1|issue a|2026');
    });

    it('parses valid and multi-line dates', () => {
      const parsed = validationDate('2026-08-15\nRuang Rapat');
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.toISOString().slice(0, 10)).toBe('2026-08-15');
      expect(validationDate('invalid-date-value')).toBeNull();
    });
  });
});
