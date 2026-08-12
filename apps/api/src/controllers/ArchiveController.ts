import { Request, Response } from 'express';
import { ArchiveService } from '../services/ArchiveService';
import { SyncService } from '../services/SyncService';
import { MockSharePointClient } from '../services/sharepoint/MockSharePointClient';
import { catchAsync } from '../lib/catchAsync';

const sharePointClient = new MockSharePointClient();
const syncService = new SyncService(sharePointClient);
const archiveService = new ArchiveService(syncService, sharePointClient);

export const archiveYear = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year } = req.body || {};
  if (year === undefined || year === null || year === '' || isNaN(Number(year))) {
    res.status(400).json({ error: 'Valid year is required.' });
    return;
  }

  const numericYear = Number(year);
  await archiveService.archiveYear(numericYear);
  res.status(200).json({ message: `Year ${numericYear} archived successfully.` });
});

export const restoreYear = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year } = req.body || {};
  if (year === undefined || year === null || year === '' || isNaN(Number(year))) {
    res.status(400).json({ error: 'Valid year is required.' });
    return;
  }

  const numericYear = Number(year);
  await archiveService.restoreYear(numericYear);
  res.status(200).json({ message: `Year ${numericYear} restored successfully.` });
});

