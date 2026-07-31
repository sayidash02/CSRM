import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SyncService } from '../services/SyncService';
import { GraphSharePointClient } from '../services/sharepoint/GraphSharePointClient';

const prisma = new PrismaClient();
const sharePointClient = new GraphSharePointClient();
const syncService = new SyncService(sharePointClient);

let isSyncing = false;

export const triggerSync = async (req: Request, res: Response): Promise<void> => {
  if (isSyncing) {
    res.status(429).json({ error: 'Sync is already in progress. Please wait.' });
    return;
  }

  isSyncing = true;
  try {
    await syncService.executeSync('User (via Web UI)');
    res.status(200).json({ message: 'Sync completed successfully' });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed: ' + (error instanceof Error ? error.message : String(error)) });
  } finally {
    isSyncing = false;
  }
};

export const getSyncStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const lastSync = await prisma.sync_log.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { synced_at: 'desc' }
    });

    let unsyncedCount = 0;

    if (lastSync) {
      const lastSyncDate = lastSync.synced_at;
      
      const counts = await Promise.all([
        prisma.daily_activities.count({ where: { updated_at: { gt: lastSyncDate } } }),
        prisma.stakeholder_engagement.count({ where: { updated_at: { gt: lastSyncDate } } }),
        prisma.top_issues.count({ where: { updated_at: { gt: lastSyncDate } } }),
        prisma.proposals.count({ where: { updated_at: { gt: lastSyncDate } } }),
        prisma.csr_projects.count({ where: { updated_at: { gt: lastSyncDate } } }),
        prisma.grievance.count({ where: { updated_at: { gt: lastSyncDate } } }),
        prisma.lrp.count({ where: { updated_at: { gt: lastSyncDate } } }),
      ]);
      unsyncedCount = counts.reduce((a, b) => a + b, 0);
    } else {
      // If no successful sync ever, all active records are unsynced
      const counts = await Promise.all([
        prisma.daily_activities.count({ where: { is_deleted: false } }),
        prisma.stakeholder_engagement.count({ where: { is_deleted: false } }),
        prisma.top_issues.count({ where: { is_deleted: false } }),
        prisma.proposals.count({ where: { is_deleted: false } }),
        prisma.csr_projects.count({ where: { is_deleted: false } }),
        prisma.grievance.count({ where: { is_deleted: false } }),
        prisma.lrp.count({ where: { is_deleted: false } }),
      ]);
      unsyncedCount = counts.reduce((a, b) => a + b, 0);
    }

    res.status(200).json({
      data: {
        last_sync: lastSync,
        unsynced_count: unsyncedCount,
        is_syncing: isSyncing
      }
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
