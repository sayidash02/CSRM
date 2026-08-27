import { Request, Response } from 'express';
import { ExcelImportService } from '../services/ExcelImportService';
import { catchAsync } from '../lib/catchAsync';
import { importFileStore } from '../services/ImportFileStore';
import { errorFields, logger } from '../lib/logger';

function cleanupImportFile(filePath: string, requestId: string, phase: 'preview' | 'confirm'): void {
  try {
    importFileStore.removeFile(filePath);
  } catch (error) {
    logger.error('import_temp_cleanup_failed', {
      requestId,
      phase,
      ...errorFields(error),
    });
  }
}

export const previewImport = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const result = await ExcelImportService.preview(req.file.path);
    const fileId = importFileStore.register(req.file.path);

    logger.info('import_preview_completed', {
      requestId: req.requestId,
      uploadSizeBytes: req.file.size,
      rowCount: Object.values(result.summary).reduce((total, count) => total + count, 0),
      conflictCount: result.conflicts.length,
      canImport: result.canImport,
    });

    res.status(200).json({
      success: true,
      data: { ...result, fileId, fileToken: fileId },
    });
  } catch (error) {
    logger.error('import_preview_failed', {
      requestId: req.requestId,
      uploadSizeBytes: req.file.size,
      ...errorFields(error),
    });
    cleanupImportFile(req.file.path, req.requestId, 'preview');
    throw error;
  }
});

export const confirmImport = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const fileId = req.body?.fileId || req.body?.fileToken;

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
    logger.info('import_confirm_completed', {
      requestId: req.requestId,
      importedRowCount: result.count,
    });
  } finally {
    cleanupImportFile(importPath, req.requestId, 'confirm');
  }

  res.status(200).json({
    success: true,
    message: 'Import completed successfully',
    count: result.count,
    data: { totalImported: result.count }
  });
});
