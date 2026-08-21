import path from 'path';
import ExcelJS from 'exceljs';
import { WorkbookExportService } from '../../src/services/excel/WorkbookExportService';

describe('WorkbookExportService', () => {
  it('fills the sanitized company template without losing separate fields or links', async () => {
    const templatePath = path.resolve(__dirname, '../../templates/CRS-operational-template.xlsx');
    const service = new WorkbookExportService(templatePath);

    const buffer = await service.generateWorkbookBuffer({
      dailyActivities: [{
        activity_date: new Date('2026-02-03T00:00:00.000Z'),
        activity: 'Kegiatan baru',
        institution_group: 'Institusi',
        address: 'Alamat',
        category: { name: 'Stakeholder Engagement' },
        sub_category: { name: 'Issue' },
        focus: 'Fokus',
        location: 'Lokasi',
        cost: 125000,
        keterangan: 'Keterangan terpisah',
        hasil: 'Hasil terpisah',
        document_link: 'https://contoso.sharepoint.com/daily',
        daily_activity_pics: [{ pic: { name: 'PIC Satu' } }],
      }],
      stakeholders: [{
        stakeholder: 'Stakeholder',
        date: new Date('2026-02-04T00:00:00.000Z'),
        venue: 'Ruang Rapat',
        concern_issue: 'Concern',
        document_link: 'https://contoso.sharepoint.com/stakeholder',
      }],
      topIssues: [{
        period: 'Minggu 1',
        issue: 'Issue',
        description: 'Deskripsi',
        follow_up: 'Follow up',
        main_document: 'https://contoso.sharepoint.com/main',
        supporting_document: 'https://contoso.sharepoint.com/supporting',
        next_plan: 'Next plan',
      }],
      proposals: [{
        registration_no: 'PRP-001',
        date_received: new Date('2026-02-05T00:00:00.000Z'),
        institution: 'Pemohon',
        address: 'Alamat pemohon',
        proposal_description: 'Proposal',
        proposal_file: 'https://contoso.sharepoint.com/proposal',
        assessment_file: 'https://contoso.sharepoint.com/assessment',
        status: 'Accept',
      }],
      csrProjects: [{
        project_year: 2026,
        program: 'Program CSR',
        activity: 'Aktivitas',
        type_of_activity: 'Pendidikan',
        location: 'Lokasi CSR',
        target_beneficiaries: 'Penerima',
        objective: 'Tujuan',
        status: 'On Going',
        budget: 500000,
        implementation_period: 'Q1',
        documentation_image: 'https://contoso.sharepoint.com/image',
        document: 'https://contoso.sharepoint.com/doc',
      }],
      grievances: [{
        register_no: 'GRV-001',
        log_date: new Date('2026-02-06T00:00:00.000Z'),
        complainant_name: 'Pelapor',
        address: 'Alamat pelapor',
        phone: '0800000',
        category: 'Lingkungan',
        significance: 'High',
        description: 'Keluhan',
        location: 'Lokasi keluhan',
        investigation: 'Investigasi',
        resolution: 'Resolusi',
        feedback: 'Feedback',
        status: 'Open',
        remarks: 'Catatan',
        supporting_files: 'https://contoso.sharepoint.com/grievance',
      }],
      lrps: [{
        year: 2026,
        program: 'LRP Program',
      }],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const daily = workbook.getWorksheet('Daily Activities 2026')!;
    expect(daily.getCell('A2').value).toBe(1);
    expect(daily.getCell('B2').value).toBe('Selasa');
    expect(daily.getCell('D2').value).toBe('Kegiatan baru');
    expect(daily.getCell('K2').value).toBe('PIC Satu');
    expect(daily.getCell('L2').value).toBe('Institusi');
    expect(daily.getCell('M2').value).toBe('Keterangan terpisah');
    expect(daily.getCell('N2').value).toBe('Hasil terpisah');
    expect(daily.getCell('Q2').value).toBe('');

    expect(workbook.getWorksheet('Stakeholder Engagement 2026')!.getCell('A5').value).toBe(1);
    expect(workbook.getWorksheet('Top Issue')!.getCell('C4').value).toBe('Issue');
    expect(workbook.getWorksheet('Proposal 2026')!.getCell('B3').value).toBe('PRP-001');
    expect(workbook.getWorksheet('CSR Project 2026')!.getCell('C2').value).toBe('Program CSR');
    expect(workbook.getWorksheet('Grievance 2026')!.getCell('A7').value).toBe('GRV-001');
    expect(workbook.getWorksheet('LRP')!.getCell('B2').value).toBe('LRP Program');
    expect(workbook.getWorksheet('LRP')!.getCell('C2').value).toBe(2026);
    expect(workbook.getWorksheet('LRP')!.getCell('D2').value).toBeNull();
    expect(workbook.getWorksheet('Master (jangan dihapus)')).toBeDefined();
  }, 30000);
});
