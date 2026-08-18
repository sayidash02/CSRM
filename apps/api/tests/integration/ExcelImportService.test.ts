import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import prisma from '../../src/lib/prisma';
import { ExcelImportService, parseDailyActivitiesExcel } from '../../src/services/ExcelImportService';

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
    expect(result.validRows[0]!.activity).toBe('Test Act');
    expect(result.validRows[0]!.category_id).toBe('1');
    expect(result.validRows[0]!.sub_category_id).toBe('1');
    expect(result.validRows[0]!.pic_ids[0]).toBe('1');
    expect(result.validRows[0]!.keterangan).toBe('Ket');
    expect(result.validRows[0]!.hasil).toBe('Has');
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
    expect(result.errorRows[0]!.errors).toContain("PIC 'Unknown PIC' tidak ditemukan");
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
    expect(result.errorRows[0]!.errors).toContain("Kategori wajib diisi");
    expect(result.errorRows[0]!.errors).toContain("Sub Category 'Sub Unknown' tidak ditemukan");
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
    expect(result.errorRows[0]!.errors).toContain("Biaya 'invalid-cost' bukan berupa angka");
  });

  it('should preserve hyperlinks from Docs and Supporting Docs columns when importing Top Issue rows', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crms-top-issue-import-'));
    const filePath = path.join(tempDir, 'top-issue-links.xlsx');
    const issue = 'Import hyperlink regression issue';
    const mainDocument = 'https://company.sharepoint.com/sites/csr/main-document.pdf';
    const supportingDocument = 'https://company.sharepoint.com/sites/csr/supporting-document.png';

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Top Issue');
      worksheet.addRow(['No', 'Periode', 'Issue', 'Deskripsi', 'Follow Up', 'Docs', 'Supporting Docs', 'Next Plan']);
      worksheet.addRow([
        1,
        '2025',
        issue,
        'Description',
        'Follow up',
        { text: 'Main document', hyperlink: mainDocument },
        { text: 'Supporting document', hyperlink: supportingDocument },
        'Next plan'
      ]);
      await workbook.xlsx.writeFile(filePath);

      await ExcelImportService.confirm(filePath);

      const imported = await prisma.top_issues.findFirst({ where: { issue } });
      expect(imported?.main_document).toBe(mainDocument);
      expect(imported?.supporting_document).toBe(supportingDocument);
    } finally {
      await prisma.top_issues.deleteMany({ where: { issue } });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
