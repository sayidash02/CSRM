import { MonthlyReportService } from '../../src/services/MonthlyReportService';
import { prisma } from '../../src/lib/prisma';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    grievance: { findMany: jest.fn() },
    daily_activities: { findMany: jest.fn() },
    top_issues: { findMany: jest.fn() },
    proposals: { findMany: jest.fn() },
    csr_projects: { findMany: jest.fn() },
    stakeholder_engagement: { findMany: jest.fn() },
    lrp: { findMany: jest.fn() },
  },
}));

describe('MonthlyReportService Unit Tests', () => {
  let service: MonthlyReportService;

  beforeEach(() => {
    service = new MonthlyReportService();
    jest.clearAllMocks();

    (prisma.grievance.findMany as jest.Mock).mockResolvedValue([
      { register_no: 'GRV-001', complainant_name: 'John Doe', category: 'Environmental', status: 'Open' }
    ]);
    (prisma.daily_activities.findMany as jest.Mock).mockResolvedValue([{}, {}]);
    (prisma.top_issues.findMany as jest.Mock).mockResolvedValue([{}]);
    (prisma.proposals.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.csr_projects.findMany as jest.Mock).mockResolvedValue([{}, {}, {}]);
    (prisma.stakeholder_engagement.findMany as jest.Mock).mockResolvedValue([{}]);
    (prisma.lrp.findMany as jest.Mock).mockResolvedValue([{}, {}]);
  });

  it('should throw error for invalid month values', async () => {
    await expect(service.generateReport(0, 2026)).rejects.toThrow('Invalid month: must be between 1 and 12');
    await expect(service.generateReport(13, 2026)).rejects.toThrow('Invalid month: must be between 1 and 12');
  });

  it('should execute 7 queries in parallel with accurate UTC date bounds', async () => {
    await service.generateReport(8, 2026);

    const expectedStartDate = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));
    const expectedEndDate = new Date(Date.UTC(2026, 8, 0, 23, 59, 59, 999));

    expect(prisma.grievance.findMany).toHaveBeenCalledWith({
      where: { log_date: { gte: expectedStartDate, lte: expectedEndDate }, is_deleted: false }
    });
    expect(prisma.daily_activities.findMany).toHaveBeenCalledWith({
      where: { activity_date: { gte: expectedStartDate, lte: expectedEndDate }, is_deleted: false }
    });
    expect(prisma.top_issues.findMany).toHaveBeenCalledWith({
      where: { created_at: { gte: expectedStartDate, lte: expectedEndDate }, is_deleted: false }
    });
    expect(prisma.proposals.findMany).toHaveBeenCalledWith({
      where: { date_received: { gte: expectedStartDate, lte: expectedEndDate }, is_deleted: false }
    });
    expect(prisma.csr_projects.findMany).toHaveBeenCalledWith({
      where: { created_at: { gte: expectedStartDate, lte: expectedEndDate }, is_deleted: false }
    });
    expect(prisma.stakeholder_engagement.findMany).toHaveBeenCalledWith({
      where: { created_at: { gte: expectedStartDate, lte: expectedEndDate }, is_deleted: false }
    });
    expect(prisma.lrp.findMany).toHaveBeenCalledWith({
      where: { year: 2026, is_deleted: false }
    });
  });

  it('should build executive report Excel workbook with Dashboard and Grievance sheets', async () => {
    const workbook = await service.generateReport(8, 2026);

    expect(workbook.creator).toBe('CRMS System');
    
    const dashboardSheet = workbook.getWorksheet('Dashboard');
    expect(dashboardSheet).toBeDefined();
    expect(dashboardSheet?.getCell('A1').value).toBe('CRMS Monthly Executive Report');
    expect(dashboardSheet?.getCell('A2').value).toBe('Periode: 8/2026');
    expect(dashboardSheet?.getCell('B5').value).toBe(2); // Daily activities
    expect(dashboardSheet?.getCell('B6').value).toBe(1); // Stakeholders
    expect(dashboardSheet?.getCell('B7').value).toBe(1); // Top issues
    expect(dashboardSheet?.getCell('B8').value).toBe(0); // Proposals
    expect(dashboardSheet?.getCell('B9').value).toBe(3); // CSR Projects
    expect(dashboardSheet?.getCell('B10').value).toBe(1); // Grievances
    expect(dashboardSheet?.getCell('B11').value).toBe(2); // LRP

    const grievanceSheet = workbook.getWorksheet('Grievances');
    expect(grievanceSheet).toBeDefined();
    const row2 = grievanceSheet?.getRow(2);
    expect(row2?.getCell(1).value).toBe('GRV-001');
    expect(row2?.getCell(2).value).toBe('John Doe');
    expect(row2?.getCell(3).value).toBe('Environmental');
    expect(row2?.getCell(4).value).toBe('Open');
  });
});
