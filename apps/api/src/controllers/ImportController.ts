import { Request, Response } from 'express';
import { ExcelImportService } from '../services/ExcelImportService';

export const previewImport = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const result = await ExcelImportService.preview(req.file.path);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in previewImport:', error);
    res.status(500).json({ error: 'Internal server error during import preview' });
  }
};

export const confirmImport = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error: any) {
    console.error('Error in confirmImport:', error);
    res.status(500).json({ error: error.message || 'Internal server error during import confirmation' });
  }
};
