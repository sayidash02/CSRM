import { parseCellDate } from '../../src/services/ExcelImportService';

describe('parseCellDate', () => {
  describe('English & standard date strings', () => {
    it('should parse English date string to a UTC Date without shifting days', () => {
      const result = parseCellDate('05 Jan 2026');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2026-01-05T00:00:00.000Z');
    });

    it('should parse full string with venue to a UTC Date', () => {
      const result = parseCellDate('Sabtu, 06 Juni 2026\nKaranganyar');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2026-06-06T00:00:00.000Z');
    });
  });

  describe('Date instances', () => {
    it('should normalize Date instance to UTC date midnight', () => {
      const date = new Date(Date.UTC(2026, 7, 17, 14, 30, 0)); // 2026-08-17 14:30 UTC
      const result = parseCellDate(date);
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2026-08-17T00:00:00.000Z');
    });

    it('should return null for Invalid Date instance', () => {
      const invalidDate = new Date('invalid string date');
      const result = parseCellDate(invalidDate);
      expect(result).toBeNull();
    });
  });

  describe('Excel numeric serials', () => {
    it('should parse Excel numeric serial date (e.g. 45000)', () => {
      const result = parseCellDate(45000);
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2023-03-15T00:00:00.000Z');
    });
  });

  describe('Indonesian month abbreviations and names', () => {
    it('should parse "17 Agt 2026"', () => {
      const result = parseCellDate('17 Agt 2026');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2026-08-17T00:00:00.000Z');
    });

    it('should parse "05 Des 2026"', () => {
      const result = parseCellDate('05 Des 2026');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2026-12-05T00:00:00.000Z');
    });

    it('should parse "10 Okt 2026"', () => {
      const result = parseCellDate('10 Okt 2026');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2026-10-10T00:00:00.000Z');
    });

    it('should parse "20 Mei 2026"', () => {
      const result = parseCellDate('20 Mei 2026');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2026-05-20T00:00:00.000Z');
    });

    it('should parse "12 Nopi 2026" / "12 Nopember 2026"', () => {
      const res1 = parseCellDate('12 Nopi 2026');
      expect(res1?.toISOString()).toBe('2026-11-12T00:00:00.000Z');
      const res2 = parseCellDate('12 Nopember 2026');
      expect(res2?.toISOString()).toBe('2026-11-12T00:00:00.000Z');
    });

    it('should parse full Indonesian month names "17 Agustus 2026" and "05 Desember 2026"', () => {
      const res1 = parseCellDate('17 Agustus 2026');
      expect(res1?.toISOString()).toBe('2026-08-17T00:00:00.000Z');
      const res2 = parseCellDate('05 Desember 2026');
      expect(res2?.toISOString()).toBe('2026-12-05T00:00:00.000Z');
    });
  });

  describe('Null / undefined / invalid inputs', () => {
    it('should return null for null or undefined', () => {
      expect(parseCellDate(null)).toBeNull();
      expect(parseCellDate(undefined)).toBeNull();
    });

    it('should return null for empty or non-date strings', () => {
      expect(parseCellDate('')).toBeNull();
      expect(parseCellDate('   ')).toBeNull();
      expect(parseCellDate('not a date string')).toBeNull();
      expect(parseCellDate('abc xyz')).toBeNull();
    });
  });
});
