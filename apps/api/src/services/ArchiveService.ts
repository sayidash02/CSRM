import prisma from '../lib/prisma';

export class ArchiveService {
  public async archiveYear(year: number): Promise<void> {
    this.assertYear(year);
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    await prisma.$transaction(async (tx) => {
      // Archive is a local soft-state change only. Export is a separate,
      // explicit user download action.
      await Promise.all([
        tx.daily_activities.updateMany({
          where: { is_deleted: false, is_archived: false, activity_date: { gte: startDate, lte: endDate } },
          data: { is_archived: true }
        }),
        tx.stakeholder_engagement.updateMany({
          where: { is_deleted: false, is_archived: false, date: { gte: startDate, lte: endDate } },
          data: { is_archived: true }
        }),
        tx.top_issues.updateMany({
          where: { is_deleted: false, is_archived: false, year },
          data: { is_archived: true }
        }),
        tx.proposals.updateMany({
          where: { is_deleted: false, is_archived: false, date_received: { gte: startDate, lte: endDate } },
          data: { is_archived: true }
        }),
        tx.csr_projects.updateMany({
          where: { is_deleted: false, is_archived: false, project_year: year },
          data: { is_archived: true }
        }),
        tx.grievance.updateMany({
          where: { is_deleted: false, is_archived: false, log_date: { gte: startDate, lte: endDate } },
          data: { is_archived: true }
        }),
        tx.lrp.updateMany({
          where: { is_deleted: false, is_archived: false, year },
          data: { is_archived: true }
        })
      ]);
    });
  }

  public async restoreYear(year: number): Promise<void> {
    this.assertYear(year);
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.daily_activities.updateMany({
          where: { is_archived: true, activity_date: { gte: startDate, lte: endDate } },
          data: { is_archived: false }
        }),
        tx.stakeholder_engagement.updateMany({
          where: { is_archived: true, date: { gte: startDate, lte: endDate } },
          data: { is_archived: false }
        }),
        tx.top_issues.updateMany({
          where: { is_archived: true, year },
          data: { is_archived: false }
        }),
        tx.proposals.updateMany({
          where: { is_archived: true, date_received: { gte: startDate, lte: endDate } },
          data: { is_archived: false }
        }),
        tx.csr_projects.updateMany({
          where: { is_archived: true, project_year: year },
          data: { is_archived: false }
        }),
        tx.grievance.updateMany({
          where: { is_archived: true, log_date: { gte: startDate, lte: endDate } },
          data: { is_archived: false }
        }),
        tx.lrp.updateMany({
          where: { is_archived: true, year },
          data: { is_archived: false }
        })
      ]);
    });
  }

  private assertYear(year: number): void {
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      const error: any = new Error('Valid year is required.');
      error.status = 400;
      throw error;
    }
  }
}
