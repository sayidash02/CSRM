import { Request, Response } from 'express';
import { ArchiveService } from '../services/ArchiveService';
import { SyncService } from '../services/SyncService';
import { MockSharePointClient } from '../services/sharepoint/MockSharePointClient';

const sharePointClient = new MockSharePointClient();
const syncService = new SyncService(sharePointClient);
const archiveService = new ArchiveService(syncService, sharePointClient);

export const archiveYear = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year } = req.body || {};
    if (year === undefined || year === null || year === '' || isNaN(Number(year))) {
      res.status(400).json({ error: 'Valid year is required.' });
      return;
    }

    const numericYear = Number(year);
    await archiveService.archiveYear(numericYear);
    res.status(200).json({ message: `Year ${numericYear} archived successfully.` });
  } catch (error: any) {
    console.error('Error in archiveYear:', error);
    res.status(500).json({ error: error.message || 'Failed to archive year' });
  }
};

export const restoreYear = async (req: Request, res: Response): Promise<void> => {
  try {
    const { year } = req.body || {};
    if (year === undefined || year === null || year === '' || isNaN(Number(year))) {
      res.status(400).json({ error: 'Valid year is required.' });
      return;
    }

    const numericYear = Number(year);
    await archiveService.restoreYear(numericYear);
    res.status(200).json({ message: `Year ${numericYear} restored successfully.` });
  } catch (error: any) {
    console.error('Error in restoreYear:', error);
    res.status(500).json({ error: error.message || 'Failed to restore year' });
  }
};
