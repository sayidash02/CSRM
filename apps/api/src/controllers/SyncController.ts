import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { SyncService } from '../services/SyncService';
import { GraphSharePointClient } from '../services/sharepoint/GraphSharePointClient';
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
    const data = await syncService.getSyncStatus(isSyncing);
    res.status(200).json({ data });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
