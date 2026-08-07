import { parseCellDate } from '../../src/services/ExcelImportService';

describe('parseCellDate', () => {
  it('should parse Indonesian date string to a UTC Date without shifting days', () => {
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
