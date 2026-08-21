import fs from 'node:fs/promises';
import { Request, Response } from 'express';
import { ExcelImportService } from '../services/ExcelImportService';
import { catchAsync } from '../lib/catchAsync';
import { importFileStore } from '../services/ImportFileStore';

export const previewImport = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const result = await ExcelImportService.preview(req.file.path);
    const fileId = importFileStore.register(req.file.path);

    res.status(200).json({
      success: true,
      data: { ...result, fileId },
    });
  } catch (error) {
    await fs.rm(req.file.path, { force: true }).catch(() => undefined);
    throw error;
  }
});

export const confirmImport = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { fileId } = req.body || {};

  if (typeof fileId !== 'string' || !fileId) {
    res.status(400).json({ error: 'Missing fileId' });
    return;
  }

  const importPath = importFileStore.take(fileId);
  if (!importPath) {
    res.status(400).json({ error: 'Invalid or expired import file token' });
    return;
  }

  let result: { success: boolean; count: number };
  try {
    result = await ExcelImportService.confirm(importPath);
  } finally {
    importFileStore.removeFile(importPath);
  }

  res.status(200).json({
    success: true,
    message: 'Import completed successfully',
    count: result.count
  });
});
