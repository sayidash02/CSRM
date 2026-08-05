import { parseDailyActivitiesExcel } from '../../src/services/ExcelImportService';
import ExcelJS from 'exceljs';
import prisma from '../../src/lib/prisma';

describe('ExcelImportService', () => {
  beforeAll(async () => {
    await prisma.daily_activities.deleteMany();
    await prisma.sub_categories.deleteMany();
    await prisma.categories.deleteMany();
    await prisma.pics.deleteMany();

    await prisma.categories.create({ data: { id: 1, name: 'Kategori 1' } });
    await prisma.sub_categories.create({ data: { id: 1, category_id: 1, name: 'Sub 1' } });
    await prisma.pics.create({ data: { id: 1, name: 'Ziya', is_active: true } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should parse valid excel buffer and return validRows length 1 and errorRows length 0', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.addRow(['No', 'Tanggal', 'Kegiatan', 'Instansi', 'Alamat', 'Kategori', 'Sub Category', 'Fokus', 'Lokasi', 'Biaya', 'Keterangan', 'Hasil', 'link', 'PIC']);
    ws.addRow([1, '2026-08-01', 'Test Act', 'Group A', 'Address', 'Kategori 1', 'Sub 1', 'Focus 1', 'Loc 1', 50000, 'Ket', 'Has', '', 'Ziya']);
    const buffer = await wb.xlsx.writeBuffer();

    const result = await parseDailyActivitiesExcel(buffer as any);
    
    expect(result.validRows.length).toBe(1);
    expect(result.errorRows.length).toBe(0);
    expect(result.validRows[0].activity).toBe('Test Act');
    expect(result.validRows[0].category_id).toBe('1');
    expect(result.validRows[0].sub_category_id).toBe('1');
    expect(result.validRows[0].pic_id).toBe('1');
  });

  it('should return errorRows length 1 when an unknown PIC is supplied', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.addRow(['No', 'Tanggal', 'Kegiatan', 'Instansi', 'Alamat', 'Kategori', 'Sub Category', 'Fokus', 'Lokasi', 'Biaya', 'Keterangan', 'Hasil', 'link', 'PIC']);
    ws.addRow([1, '2026-08-01', 'Test Act', 'Group A', 'Address', 'Kategori 1', 'Sub 1', 'Focus 1', 'Loc 1', 50000, 'Ket', 'Has', '', 'Unknown PIC']);
    const buffer = await wb.xlsx.writeBuffer();

    const result = await parseDailyActivitiesExcel(buffer as any);

    expect(result.validRows.length).toBe(0);
    expect(result.errorRows.length).toBe(1);
    expect(result.errorRows[0].errors).toContain("PIC 'Unknown PIC' tidak ditemukan");
  });

  it('should return errorRows when category or sub_category is missing or not found', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.addRow(['No', 'Tanggal', 'Kegiatan', 'Instansi', 'Alamat', 'Kategori', 'Sub Category', 'Fokus', 'Lokasi', 'Biaya', 'Keterangan', 'Hasil', 'link', 'PIC']);
    ws.addRow([1, '2026-08-01', 'Test Act 2', 'Group A', 'Address', '', 'Sub Unknown', 'Focus 1', 'Loc 1', 50000, 'Ket', 'Has', '', 'Ziya']);
    const buffer = await wb.xlsx.writeBuffer();

    const result = await parseDailyActivitiesExcel(buffer as any);

    expect(result.validRows.length).toBe(0);
    expect(result.errorRows.length).toBe(1);
    expect(result.errorRows[0].errors).toContain("Kategori wajib diisi");
    expect(result.errorRows[0].errors).toContain("Sub Category 'Sub Unknown' tidak ditemukan");
  });

  it('should return errorRows when cost is an invalid number', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.addRow(['No', 'Tanggal', 'Kegiatan', 'Instansi', 'Alamat', 'Kategori', 'Sub Category', 'Fokus', 'Lokasi', 'Biaya', 'Keterangan', 'Hasil', 'link', 'PIC']);
    ws.addRow([1, '2026-08-01', 'Test Act 3', 'Group A', 'Address', 'Kategori 1', 'Sub 1', 'Focus 1', 'Loc 1', 'invalid-cost', 'Ket', 'Has', '', 'Ziya']);
    const buffer = await wb.xlsx.writeBuffer();

    const result = await parseDailyActivitiesExcel(buffer as any);

    expect(result.validRows.length).toBe(0);
    expect(result.errorRows.length).toBe(1);
    expect(result.errorRows[0].errors).toContain("Biaya 'invalid-cost' bukan berupa angka");
  });
});
