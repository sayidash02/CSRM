import prisma from '../lib/prisma';
import { SyncService } from './SyncService';
import { ISharePointClient } from './sharepoint/ISharePointClient';

export class ArchiveService {
  private syncService: SyncService;
  private sharePointClient: ISharePointClient;

  constructor(arg1: SyncService | ISharePointClient, arg2: ISharePointClient | SyncService) {
    if ('generateWorkbookBuffer' in arg1) {
      this.syncService = arg1 as SyncService;
      this.sharePointClient = arg2 as ISharePointClient;
    } else {
      this.sharePointClient = arg1 as ISharePointClient;
      this.syncService = arg2 as SyncService;
    }
  }

  public async archiveYear(year: number, triggeredBy: string = 'System'): Promise<void> {
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    await prisma.$transaction(async (tx) => {
      // 1. Fetch unarchived & non-deleted data for the given year across all 7 module tables
      const [da, se, ti, pr, cp, gr, lrp] = await Promise.all([
        tx.daily_activities.findMany({
          where: { is_deleted: false, is_archived: false, activity_date: { gte: startDate, lte: endDate } },
          include: { pic: true, category: true, sub_category: true }
        }),
        tx.stakeholder_engagement.findMany({
          where: { is_deleted: false, is_archived: false, date: { gte: startDate, lte: endDate } }
        }),
        tx.top_issues.findMany({
          where: { is_deleted: false, is_archived: false, created_at: { gte: startDate, lte: endDate } }
        }),
        tx.proposals.findMany({
          where: { is_deleted: false, is_archived: false, date_received: { gte: startDate, lte: endDate } }
        }),
        tx.csr_projects.findMany({
          where: { is_deleted: false, is_archived: false, project_year: year }
        }),
        tx.grievance.findMany({
          where: { is_deleted: false, is_archived: false, log_date: { gte: startDate, lte: endDate } }
        }),
        tx.lrp.findMany({
          where: { is_deleted: false, is_archived: false, created_at: { gte: startDate, lte: endDate } }
        })
      ]);

      // 2. Generate Excel buffer
      const buffer = await this.syncService.generateWorkbookBuffer(da, se, ti, pr, cp, gr, lrp);

      // 3. Upload file to SharePoint
      const folderPath = '0. Testing/Arsip';
      const fileName = `Arsip_CRMS_${year}.xlsx`;
      await this.sharePointClient.uploadFile(folderPath, fileName, buffer, buffer.byteLength);

      // 4. Perform bulk update is_archived: true for those same date filters & is_deleted: false, is_archived: false
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
          where: { is_deleted: false, is_archived: false, created_at: { gte: startDate, lte: endDate } },
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
          where: { is_deleted: false, is_archived: false, created_at: { gte: startDate, lte: endDate } },
          data: { is_archived: true }
        })
      ]);
    });
  }

  public async restoreYear(year: number): Promise<void> {
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
          where: { is_archived: true, created_at: { gte: startDate, lte: endDate } },
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
          where: { is_archived: true, created_at: { gte: startDate, lte: endDate } },
          data: { is_archived: false }
        })
      ]);
    });
  }
}
