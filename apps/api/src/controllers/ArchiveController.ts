import { Request, Response } from 'express';
import { ArchiveService } from '../services/ArchiveService';
import { catchAsync } from '../lib/catchAsync';

const archiveService = new ArchiveService();

function readYear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value >= 1900 && value <= 2100 ? value : null;
  }
  if (typeof value !== 'string' || !/^\d{4}$/.test(value.trim())) return null;
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null;
}

export const archiveYear = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year } = req.body || {};
  const numericYear = readYear(year);
  if (numericYear === null) {
    res.status(400).json({ error: 'Valid year is required.' });
    return;
  }
  await archiveService.archiveYear(numericYear);
  res.status(200).json({ message: `Year ${numericYear} archived successfully.` });
});

export const restoreYear = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year } = req.body || {};
  const numericYear = readYear(year);
  if (numericYear === null) {
    res.status(400).json({ error: 'Valid year is required.' });
    return;
  }
  await archiveService.restoreYear(numericYear);
  res.status(200).json({ message: `Year ${numericYear} restored successfully.` });
});

