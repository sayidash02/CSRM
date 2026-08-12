import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';

export class MonthlyReportService {
  async generateReport(month: number, year: number): Promise<ExcelJS.Workbook> {
    if (month < 1 || month > 12) {
      throw new Error('Invalid month: must be between 1 and 12');
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const [
      grievances,
      dailyActivities,
      topIssues,
      proposals,
      csrProjects,
      stakeholderEngagement,
      lrp
    ] = await Promise.all([
      prisma.grievance.findMany({
        where: { log_date: { gte: startDate, lte: endDate }, is_deleted: false }
      }),
      prisma.daily_activities.findMany({
        where: { activity_date: { gte: startDate, lte: endDate }, is_deleted: false }
      }),
      prisma.top_issues.findMany({
        where: { created_at: { gte: startDate, lte: endDate }, is_deleted: false }
      }),
      prisma.proposals.findMany({
        where: { date_received: { gte: startDate, lte: endDate }, is_deleted: false }
      }),
      prisma.csr_projects.findMany({
        where: { created_at: { gte: startDate, lte: endDate }, is_deleted: false }
      }),
      prisma.stakeholder_engagement.findMany({
        where: { created_at: { gte: startDate, lte: endDate }, is_deleted: false }
      }),
      prisma.lrp.findMany({
        where: { year, is_deleted: false }
      })
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CRMS System';

    const dashboardSheet = workbook.addWorksheet('Dashboard');
    dashboardSheet.getCell('A1').value = 'CRMS Monthly Executive Report';
    dashboardSheet.getCell('A2').value = `Periode: ${month}/${year}`;
    dashboardSheet.getCell('B5').value = dailyActivities.length;
    dashboardSheet.getCell('B6').value = stakeholderEngagement.length;
    dashboardSheet.getCell('B7').value = topIssues.length;
    dashboardSheet.getCell('B8').value = proposals.length;
    dashboardSheet.getCell('B9').value = csrProjects.length;
    dashboardSheet.getCell('B10').value = grievances.length;
    dashboardSheet.getCell('B11').value = lrp.length;

    const grievanceSheet = workbook.addWorksheet('Grievances');
    grievances.forEach((g: any, index: number) => {
      const row = grievanceSheet.getRow(index + 2);
      row.getCell(1).value = g.register_no;
      row.getCell(2).value = g.complainant_name;
      row.getCell(3).value = g.category;
      row.getCell(4).value = g.status;
    });

    return workbook;
  }
}
