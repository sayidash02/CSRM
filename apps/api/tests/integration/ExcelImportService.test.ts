import { parseDailyActivitiesExcel } from '../../src/services/ExcelImportService';
import ExcelJS from 'exceljs';

describe('ExcelImportService', () => {
  it('should parse excel buffer and return mapped data', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.addRow(['No', 'Tanggal', 'Kegiatan', 'Instansi', 'Alamat', 'Kategori', 'Sub Category', 'Fokus', 'Lokasi', 'Biaya', 'Keterangan', 'Hasil', 'link', 'PIC']);
    ws.addRow([1, '2026-08-01', 'Test Act', 'Group A', 'Address', 'Kategori 1', 'Sub 1', 'Focus 1', 'Loc 1', 50000, 'Ket', 'Has', '', 'Ziya']);
    const buffer = await wb.xlsx.writeBuffer();

    const result = await parseDailyActivitiesExcel(buffer as Buffer);
    
    expect(result.validRows).toBeDefined();
    expect(result.errorRows).toBeDefined();
  });
});
