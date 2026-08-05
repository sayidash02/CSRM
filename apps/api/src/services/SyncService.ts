import ExcelJS from 'exceljs';
import { ISharePointClient } from './sharepoint/ISharePointClient';
import prisma from '../lib/prisma';

export class SyncService {
  constructor(private sharePointClient: ISharePointClient) {}

  public async getSyncStatus(isSyncing: boolean, year?: number) {
    const syncYear = year ?? new Date().getFullYear();

    const lastSync = await prisma.sync_log.findFirst({
      where: { status: 'SUCCESS', synced_year: syncYear },
      orderBy: { synced_at: 'desc' }
    });

    // Year filter helpers
    const dateRangeFilter = (col: string) => ({
      gte: new Date(`${syncYear}-01-01T00:00:00.000Z`),
      lte: new Date(`${syncYear}-12-31T23:59:59.999Z`)
    });

    let unsyncedCount = 0;

    if (lastSync) {
      const lastSyncDate = lastSync.synced_at;
      const counts = await Promise.all([
        prisma.daily_activities.count({ where: { updated_at: { gt: lastSyncDate }, is_deleted: false, is_archived: false, activity_date: dateRangeFilter('activity_date') } }),
        prisma.stakeholder_engagement.count({ where: { updated_at: { gt: lastSyncDate }, is_deleted: false, is_archived: false, date: dateRangeFilter('date') } }),
        prisma.top_issues.count({ where: { updated_at: { gt: lastSyncDate }, is_deleted: false, is_archived: false, year: syncYear } }),
        prisma.proposals.count({ where: { updated_at: { gt: lastSyncDate }, is_deleted: false, is_archived: false, date_received: dateRangeFilter('date_received') } }),
        prisma.csr_projects.count({ where: { updated_at: { gt: lastSyncDate }, is_deleted: false, is_archived: false, project_year: syncYear } }),
        prisma.grievance.count({ where: { updated_at: { gt: lastSyncDate }, is_deleted: false, is_archived: false, log_date: dateRangeFilter('log_date') } }),
        prisma.lrp.count({ where: { updated_at: { gt: lastSyncDate }, is_deleted: false, is_archived: false, year: syncYear } }),
      ]);
      unsyncedCount = counts.reduce((a, b) => a + b, 0);
    } else {
      const counts = await Promise.all([
        prisma.daily_activities.count({ where: { is_deleted: false, is_archived: false, activity_date: dateRangeFilter('activity_date') } }),
        prisma.stakeholder_engagement.count({ where: { is_deleted: false, is_archived: false, date: dateRangeFilter('date') } }),
        prisma.top_issues.count({ where: { is_deleted: false, is_archived: false, year: syncYear } }),
        prisma.proposals.count({ where: { is_deleted: false, is_archived: false, date_received: dateRangeFilter('date_received') } }),
        prisma.csr_projects.count({ where: { is_deleted: false, is_archived: false, project_year: syncYear } }),
        prisma.grievance.count({ where: { is_deleted: false, is_archived: false, log_date: dateRangeFilter('log_date') } }),
        prisma.lrp.count({ where: { is_deleted: false, is_archived: false, year: syncYear } }),
      ]);
      unsyncedCount = counts.reduce((a, b) => a + b, 0);
    }

    return {
      last_sync: lastSync,
      unsynced_count: unsyncedCount,
      is_syncing: isSyncing
    };
  }

  public async generateWorkbookBuffer(
    da: any[],
    se: any[],
    ti: any[],
    pr: any[],
    cp: any[],
    gr: any[],
    lrp: any[]
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CRMS System';
    workbook.created = new Date();

    this.addDailyActivitiesSheet(workbook, da);
    this.addStakeholdersSheet(workbook, se);
    this.addTopIssuesSheet(workbook, ti);
    this.addProposalsSheet(workbook, pr);
    this.addCsrProjectsSheet(workbook, cp);
    this.addGrievanceSheet(workbook, gr);
    this.addLrpSheet(workbook, lrp);

    return (await workbook.xlsx.writeBuffer()) as any as Buffer;
  }

  public async executeSync(triggeredBy: string = 'System', year?: number): Promise<void> {
    const startedAt = new Date();
    const syncYear = year ?? new Date().getFullYear();

    // Year filter helpers
    const dateRange = {
      gte: new Date(`${syncYear}-01-01T00:00:00.000Z`),
      lte: new Date(`${syncYear}-12-31T23:59:59.999Z`)
    };

    try {
      // 1. Fetch data from 7 tables (scoped to syncYear)
      const [
        dailyActivities,
        stakeholders,
        topIssues,
        proposals,
        csrProjects,
        grievances,
        lrps
      ] = await Promise.all([
        prisma.daily_activities.findMany({ where: { is_deleted: false, is_archived: false, activity_date: dateRange }, include: { pic: true, category: true, sub_category: true } }),
        prisma.stakeholder_engagement.findMany({ where: { is_deleted: false, is_archived: false, date: dateRange } }),
        prisma.top_issues.findMany({ where: { is_deleted: false, is_archived: false, year: syncYear } }),
        prisma.proposals.findMany({ where: { is_deleted: false, is_archived: false, date_received: dateRange } }),
        prisma.csr_projects.findMany({ where: { is_deleted: false, is_archived: false, project_year: syncYear } }),
        prisma.grievance.findMany({ where: { is_deleted: false, is_archived: false, log_date: dateRange } }),
        prisma.lrp.findMany({ where: { is_deleted: false, is_archived: false, year: syncYear } }),
      ]);

      // 2. Generate Workbook Buffer
      const buffer = await this.generateWorkbookBuffer(
        dailyActivities,
        stakeholders,
        topIssues,
        proposals,
        csrProjects,
        grievances,
        lrps
      );

      // 3. Upload to SharePoint
      const masterPath = '0. Testing/Master';
      const fileName = `CRMS_Master_Data_${syncYear}.xlsx`;
      const fileUrl = await this.sharePointClient.uploadFile(masterPath, fileName, buffer, buffer.byteLength);

      // 4. Update sync_log (with synced_year)
      await prisma.sync_log.create({
        data: {
          synced_at: startedAt,
          synced_year: syncYear,
          status: 'SUCCESS',
          file_url: fileUrl,
          triggered_by: triggeredBy
        }
      });
    } catch (error) {
      // Update sync_log with error
      await prisma.sync_log.create({
        data: {
          synced_at: startedAt,
          synced_year: syncYear,
          status: 'FAILED',
          error_message: error instanceof Error ? error.message : String(error),
          triggered_by: triggeredBy
        }
      });
      throw error;
    }
  }

  private formatDate(d: Date | null | undefined): string {
    if (!d) return '';
    return d.toISOString().split('T')[0] || '';
  }

  private hyperlink(url: string | null | undefined, text: string = 'Lihat Dokumen'): any {
    if (!url) return '';
    return { text, hyperlink: url };
  }

  private addDailyActivitiesSheet(workbook: ExcelJS.Workbook, data: any[]) {
    const sheet = workbook.addWorksheet('Daily Activities');
    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Activity Date', key: 'activity_date', width: 15 },
      { header: 'Activity', key: 'activity', width: 30 },
      { header: 'Institution Group', key: 'institution_group', width: 25 },
      { header: 'Address', key: 'address', width: 25 },
      { header: 'Fokus', key: 'focus', width: 20 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Cost (Biaya)', key: 'cost', width: 15 },
      { header: 'Description / Result', key: 'description_result', width: 40 },
      { header: 'Document Link', key: 'document_link', width: 20 },
      { header: 'PIC', key: 'pic', width: 20 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Sub Category', key: 'sub_category', width: 30 }
    ];

    data.forEach((row, idx) => {
      sheet.addRow({
        no: idx + 1,
        activity_date: this.formatDate(row.activity_date),
        activity: row.activity,
        institution_group: row.institution_group,
        address: row.address,
        focus: row.focus,
        location: row.location,
        cost: row.cost?.toString() || '0',
        description_result: row.description_result,
        document_link: this.hyperlink(row.document_link),
        pic: row.pic?.name || '',
        category: row.category?.name || '',
        sub_category: row.sub_category?.name || ''
      });
    });
  }

  private addStakeholdersSheet(workbook: ExcelJS.Workbook, data: any[]) {
    const sheet = workbook.addWorksheet('Stakeholder Engagement');
    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Stakeholder', key: 'stakeholder', width: 30 },
      { header: 'Date And Venue', key: 'date_venue', width: 30 },
      { header: 'Concern/Issue', key: 'concern_issue', width: 40 },
      { header: 'Docs', key: 'document_link', width: 20 }
    ];

    data.forEach((row, idx) => {
      sheet.addRow({
        no: idx + 1,
        stakeholder: row.stakeholder,
        date_venue: row.date_venue,
        concern_issue: row.concern_issue,
        document_link: this.hyperlink(row.document_link)
      });
    });
  }

  private addTopIssuesSheet(workbook: ExcelJS.Workbook, data: any[]) {
    const sheet = workbook.addWorksheet('Top Issues');
    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Periode', key: 'period', width: 20 },
      { header: 'Issue', key: 'issue', width: 30 },
      { header: 'Deskripsi', key: 'description', width: 40 },
      { header: 'Follow Up', key: 'follow_up', width: 30 },
      { header: 'Docs', key: 'main_document', width: 20 },
      { header: 'Supporting Docs', key: 'supporting_document', width: 20 },
      { header: 'Next Plan', key: 'next_plan', width: 30 }
    ];

    data.forEach((row, idx) => {
      sheet.addRow({
        no: idx + 1,
        period: row.period,
        issue: row.issue,
        description: row.description,
        follow_up: row.follow_up,
        main_document: this.hyperlink(row.main_document),
        supporting_document: this.hyperlink(row.supporting_document),
        next_plan: row.next_plan
      });
    });
  }

  private addProposalsSheet(workbook: ExcelJS.Workbook, data: any[]) {
    const sheet = workbook.addWorksheet('Proposals');
    sheet.columns = [
      { header: 'NO', key: 'no', width: 5 },
      { header: 'NO REGISTRASI', key: 'registration_no', width: 20 },
      { header: 'TANGGAL PENERIMAAN', key: 'date_received', width: 15 },
      { header: 'INSTANSI', key: 'institution', width: 25 },
      { header: 'ALAMAT', key: 'address', width: 30 },
      { header: 'KETERANGAN PROPOSAL', key: 'proposal_description', width: 40 },
      { header: 'PROPOSAL', key: 'proposal_file', width: 20 },
      { header: 'ASSESSMENT', key: 'assessment_file', width: 20 },
      { header: 'STATUS', key: 'status', width: 15 }
    ];

    data.forEach((row, idx) => {
      sheet.addRow({
        no: idx + 1,
        registration_no: row.registration_no,
        date_received: this.formatDate(row.date_received),
        institution: row.institution,
        address: row.address,
        proposal_description: row.proposal_description,
        proposal_file: this.hyperlink(row.proposal_file),
        assessment_file: this.hyperlink(row.assessment_file),
        status: row.status
      });
    });
  }

  private addCsrProjectsSheet(workbook: ExcelJS.Workbook, data: any[]) {
    const sheet = workbook.addWorksheet('CSR Projects');
    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Project Year', key: 'project_year', width: 10 },
      { header: 'Program', key: 'program', width: 25 },
      { header: 'Activity', key: 'activity', width: 25 },
      { header: 'Type of Activity', key: 'type_of_activity', width: 20 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Target Beneficiaries', key: 'target_beneficiaries', width: 25 },
      { header: 'Objective', key: 'objective', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Realisasi (Budget)', key: 'budget', width: 15 },
      { header: 'Implementation Period', key: 'implementation_period', width: 20 },
      { header: 'Documentation Image', key: 'documentation_image', width: 20 },
      { header: 'Document', key: 'document', width: 20 }
    ];

    data.forEach((row, idx) => {
      sheet.addRow({
        no: idx + 1,
        project_year: row.project_year,
        program: row.program,
        activity: row.activity,
        type_of_activity: row.type_of_activity,
        location: row.location,
        target_beneficiaries: row.target_beneficiaries,
        objective: row.objective,
        status: row.status,
        budget: row.budget?.toString() || '0',
        implementation_period: row.implementation_period,
        documentation_image: this.hyperlink(row.documentation_image),
        document: this.hyperlink(row.document)
      });
    });
  }

  private addGrievanceSheet(workbook: ExcelJS.Workbook, data: any[]) {
    const sheet = workbook.addWorksheet('Grievance');
    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Register No', key: 'register_no', width: 15 },
      { header: 'Log Date', key: 'log_date', width: 15 },
      { header: 'Complainant Name', key: 'complainant_name', width: 25 },
      { header: 'Address', key: 'address', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Significance', key: 'significance', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Investigation', key: 'investigation', width: 30 },
      { header: 'Resolution', key: 'resolution', width: 30 },
      { header: 'Feedback', key: 'feedback', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Completion Date', key: 'completion_date', width: 15 },
      { header: 'Remarks', key: 'remarks', width: 20 },
      { header: 'Supporting Files', key: 'supporting_files', width: 20 }
    ];

    data.forEach((row, idx) => {
      sheet.addRow({
        no: idx + 1,
        register_no: row.register_no,
        log_date: this.formatDate(row.log_date),
        complainant_name: row.complainant_name,
        address: row.address,
        phone: row.phone,
        category: row.category,
        significance: row.significance,
        description: row.description,
        location: row.location,
        investigation: row.investigation,
        resolution: row.resolution,
        feedback: row.feedback,
        status: row.status,
        completion_date: this.formatDate(row.completion_date),
        remarks: row.remarks,
        supporting_files: this.hyperlink(row.supporting_files)
      });
    });
  }

  private addLrpSheet(workbook: ExcelJS.Workbook, data: any[]) {
    const sheet = workbook.addWorksheet('LRP');
    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Program', key: 'program', width: 40 },
      { header: 'SharePoint Link', key: 'sharepoint_link', width: 30 }
    ];

    data.forEach((row, idx) => {
      sheet.addRow({
        no: idx + 1,
        program: row.program,
        sharepoint_link: this.hyperlink(row.sharepoint_link)
      });
    });
  }
}
