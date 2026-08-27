import type { NextFunction, Request, Response } from 'express';
import { confirmImport, previewImport } from '../../src/controllers/ImportController';
import { logger } from '../../src/lib/logger';
import { ExcelImportService } from '../../src/services/ExcelImportService';
import { importFileStore } from '../../src/services/ImportFileStore';

function responseDouble(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('ImportController temporary file lifecycle', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the guarded import store to clean up a failed preview', async () => {
    const parseError = new Error('invalid workbook');
    const filePath = 'guarded-upload.xlsx';
    jest.spyOn(ExcelImportService, 'preview').mockRejectedValue(parseError);
    const removeFile = jest.spyOn(importFileStore, 'removeFile').mockImplementation(() => undefined);
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    const req = {
      file: { path: filePath, size: 128, mimetype: 'application/octet-stream' },
      requestId: 'request-preview-failure',
    } as Request;
    const res = responseDouble();
    const next = jest.fn() as NextFunction;

    await previewImport(req, res, next);

    expect(removeFile).toHaveBeenCalledWith(filePath);
    expect(next).toHaveBeenCalledWith(parseError);
  });

  it('does not turn a successful import into an error when temp cleanup fails', async () => {
    const tempPath = 'guarded-confirmed-upload.xlsx';
    jest.spyOn(importFileStore, 'take').mockReturnValue(tempPath);
    jest.spyOn(ExcelImportService, 'confirm').mockResolvedValue({ success: true, count: 3 });
    jest.spyOn(importFileStore, 'removeFile').mockImplementation(() => {
      throw new Error('cleanup failed');
    });
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    jest.spyOn(logger, 'info').mockImplementation(() => undefined);
    const req = {
      body: { fileId: 'a'.repeat(64) },
      requestId: 'request-confirm-success',
    } as Request;
    const res = responseDouble();
    const next = jest.fn() as NextFunction;

    await confirmImport(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 3 }));
    expect(next).not.toHaveBeenCalled();
  });
});
