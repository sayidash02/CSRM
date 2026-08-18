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

  it('should not duplicate Top Issue rows when the same workbook is imported again', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crms-top-issue-reimport-'));
    const firstFilePath = path.join(tempDir, 'first-import.xlsx');
    const secondFilePath = path.join(tempDir, 'second-import.xlsx');
    const issue = 'Reimport duplicate regression issue';
    const mainDocument = 'https://company.sharepoint.com/sites/csr/reimport-main.pdf';
    const supportingDocument = 'https://company.sharepoint.com/sites/csr/reimport-supporting.png';

    const writeWorkbook = async (filePath: string, includeLinks: boolean) => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Top Issue');
      worksheet.addRow(['No', 'Periode', 'Issue', 'Deskripsi', 'Follow Up', 'Docs', 'Supporting Docs', 'Next Plan']);
      worksheet.addRow([
        1,
        '2025',
        issue,
        'Description',
        'Follow up',
        includeLinks ? { text: 'Main document', hyperlink: mainDocument } : '',
        includeLinks ? { text: 'Supporting document', hyperlink: supportingDocument } : '',
        'Next plan'
      ]);
      await workbook.xlsx.writeFile(filePath);
    };

    try {
      await writeWorkbook(firstFilePath, false);
      await writeWorkbook(secondFilePath, true);

      await ExcelImportService.confirm(firstFilePath);
      await ExcelImportService.confirm(secondFilePath);

      const imported = await prisma.top_issues.findMany({ where: { issue } });
      expect(imported).toHaveLength(1);
      expect(imported[0]!.main_document).toBe(mainDocument);
      expect(imported[0]!.supporting_document).toBe(supportingDocument);
    } finally {
      await prisma.top_issues.deleteMany({ where: { issue } });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should keep one row per source record across all imported modules on re-import', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crms-workbook-reimport-'));
    const firstFilePath = path.join(tempDir, 'first-import.xlsx');
    const secondFilePath = path.join(tempDir, 'second-import.xlsx');
    const mainDocument = 'https://company.sharepoint.com/sites/csr/all-main.pdf';
    const supportingDocument = 'https://company.sharepoint.com/sites/csr/all-supporting.pdf';

    const linkValue = (url: string, label: string, includeLinks: boolean) =>
      includeLinks ? { text: label, hyperlink: url } : '';

    const writeWorkbook = async (filePath: string, includeLinks: boolean) => {
      const workbook = new ExcelJS.Workbook();

      const daily = workbook.addWorksheet('Daily Activities 2026');
      daily.addRow(['No', 'Tanggal', 'Kegiatan', 'Instansi', 'Alamat', 'Kategori', 'Sub Category', 'Fokus', 'Lokasi', 'Biaya', 'Keterangan', 'Hasil', 'link', 'PIC']);
      daily.addRow([1, '2026-08-01', 'Reimport duplicate activity', 'Group A', 'Address A', 'Kategori 1', 'Sub 1', 'Focus A', 'Location A', 1000, 'Ket A', 'Has A', linkValue(mainDocument, 'Daily document', includeLinks), 'Ziya']);

      const stakeholders = workbook.addWorksheet('Stakeholder Engagement 2026');
      stakeholders.addRow(['No', 'Stakeholder', 'Tanggal', 'Tempat', 'Concern / Issue', 'Docs']);
      stakeholders.addRow([1, 'Reimport duplicate stakeholder', '2026-08-02', 'Venue A', 'Concern A', linkValue(supportingDocument, 'Stakeholder document', includeLinks)]);

      const topIssues = workbook.addWorksheet('Top Issue');
      topIssues.addRow(['No', 'Periode', 'Issue', 'Deskripsi', 'Follow Up', 'Docs', 'Supporting Docs', 'Next Plan']);
      topIssues.addRow([1, '2025', 'Reimport duplicate top issue', 'Description A', 'Follow up A', linkValue(mainDocument, 'Main document', includeLinks), linkValue(supportingDocument, 'Supporting document', includeLinks), 'Next plan A']);

      const proposals = workbook.addWorksheet('Proposal 2026');
      proposals.addRow(['No', 'No Registrasi', 'Tanggal Diterima', 'Instansi', 'Alamat', 'Keterangan Proposal', 'Proposal', 'Assessment', 'Status']);
      proposals.addRow([1, 'PROP-REIMPORT-001', '2026-08-03', 'Reimport duplicate institution', 'Address B', 'Proposal description A', linkValue(mainDocument, 'Proposal document', includeLinks), linkValue(supportingDocument, 'Assessment document', includeLinks), 'Accept']);

      const csr = workbook.addWorksheet('CSR Project 2026');
      csr.addRow(['No', 'Tahun', 'Nama Program', 'Kegiatan', 'Bentuk Kegiatan', 'Lokasi', 'Target/Sasaran', 'Tujuan', 'Status', 'Realisasi', 'Periode Pelaksanaan', 'Image Dokumentasi', 'Docx']);
      csr.addRow([1, 2025, 'Reimport duplicate initiative', 'Activity A', 'Type A', 'Location B', 'Target A', 'Objective A', 'Planning', 5000, '2025', linkValue(mainDocument, 'CSR image', includeLinks), linkValue(supportingDocument, 'CSR document', includeLinks)]);

      const grievance = workbook.addWorksheet('Grievance 2026');
      grievance.addRow(['No', 'Register No.', 'Log Date', 'Complainant Name', 'Address', 'Phone', 'Category', 'Significance', 'Description', 'Location', 'Investigation', 'Resolution', 'Complainant Feedback', 'Status', 'Remarks', 'Related Supporting Docs']);
      grievance.addRow([1, 'GRV-REIMPORT-001', '2026-08-04', 'Reimport duplicate complainant', 'Address C', '08123', 'Category A', 'Low', 'Grievance description A', 'Location C', 'Investigation A', 'Resolution A', 'Feedback A', 'Open', 'Remarks A', linkValue(supportingDocument, 'Grievance document', includeLinks)]);

      await workbook.xlsx.writeFile(filePath);
    };

    try {
      await writeWorkbook(firstFilePath, false);
      await writeWorkbook(secondFilePath, true);

      await ExcelImportService.confirm(firstFilePath);
      await ExcelImportService.confirm(secondFilePath);

      expect(await prisma.daily_activities.count({ where: { activity: 'Reimport duplicate activity' } })).toBe(1);
      expect(await prisma.stakeholder_engagement.count({ where: { stakeholder: 'Reimport duplicate stakeholder' } })).toBe(1);
      expect(await prisma.top_issues.count({ where: { issue: 'Reimport duplicate top issue' } })).toBe(1);
      expect(await prisma.proposals.count({ where: { registration_no: 'PROP-REIMPORT-001' } })).toBe(1);
      expect(await prisma.csr_projects.count({ where: { program: 'Reimport duplicate initiative' } })).toBe(1);
      expect(await prisma.grievance.count({ where: { register_no: 'GRV-REIMPORT-001' } })).toBe(1);

      const dailyRow = await prisma.daily_activities.findFirst({ where: { activity: 'Reimport duplicate activity' } });
      const stakeholderRow = await prisma.stakeholder_engagement.findFirst({ where: { stakeholder: 'Reimport duplicate stakeholder' } });
      const topIssueRow = await prisma.top_issues.findFirst({ where: { issue: 'Reimport duplicate top issue' } });
      const proposalRow = await prisma.proposals.findFirst({ where: { registration_no: 'PROP-REIMPORT-001' } });
      const csrRow = await prisma.csr_projects.findFirst({ where: { program: 'Reimport duplicate initiative' } });
      const grievanceRow = await prisma.grievance.findFirst({ where: { register_no: 'GRV-REIMPORT-001' } });

      expect(dailyRow?.document_link).toBe(mainDocument);
      expect(stakeholderRow?.document_link).toBe(supportingDocument);
      expect(topIssueRow?.main_document).toBe(mainDocument);
      expect(topIssueRow?.supporting_document).toBe(supportingDocument);
      expect(proposalRow?.proposal_file).toBe(mainDocument);
      expect(proposalRow?.assessment_file).toBe(supportingDocument);
      expect(csrRow?.documentation_image).toBe(mainDocument);
      expect(csrRow?.document).toBe(supportingDocument);
      expect(grievanceRow?.supporting_files).toBe(supportingDocument);
    } finally {
      await prisma.daily_activities.deleteMany({ where: { activity: 'Reimport duplicate activity' } });
      await prisma.stakeholder_engagement.deleteMany({ where: { stakeholder: 'Reimport duplicate stakeholder' } });
      await prisma.top_issues.deleteMany({ where: { issue: 'Reimport duplicate top issue' } });
      await prisma.proposals.deleteMany({ where: { registration_no: 'PROP-REIMPORT-001' } });
      await prisma.csr_projects.deleteMany({ where: { program: 'Reimport duplicate initiative' } });
      await prisma.grievance.deleteMany({ where: { register_no: 'GRV-REIMPORT-001' } });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
