import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { SyncService } from '../services/SyncService';
import { MockSharePointClient } from '../services/sharepoint/MockSharePointClient';
import { catchAsync } from '../lib/catchAsync';

const sharePointClient = new MockSharePointClient();
const syncService = new SyncService(sharePointClient);

let isSyncing = false;

export const triggerSync = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (isSyncing) {
    res.status(429).json({ error: 'Sync is already in progress. Please wait.' });
    return;
  }

  const year = req.body?.year ? parseInt(req.body.year) : new Date().getFullYear();
  if (isNaN(year) || year < 1900 || year > 2100) {
    res.status(400).json({ error: 'Parameter year tidak valid' });
    return;
  }

  isSyncing = true;
  try {
    await syncService.executeSync('User (via Web UI)', year);
    res.status(200).json({ message: 'Sync completed successfully', year });
  } finally {
    isSyncing = false;
  }
});

export const getSyncStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
  const data = await syncService.getSyncStatus(isSyncing, year);
  res.status(200).json({ data });
});
