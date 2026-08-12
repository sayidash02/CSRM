import { Request, Response } from 'express';
import { ExcelImportService } from '../services/ExcelImportService';
import { catchAsync } from '../lib/catchAsync';

export const previewImport = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const result = await ExcelImportService.preview(req.file.path);

  res.status(200).json({
    success: true,
    data: result
  });
});

export const confirmImport = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { fileId } = req.body || {};

  if (!fileId) {
    res.status(400).json({ error: 'Missing fileId' });
    return;
  }

  const result = await ExcelImportService.confirm(fileId);

  res.status(200).json({
    success: true,
    message: 'Import completed successfully',
    count: result.count
  });
});
