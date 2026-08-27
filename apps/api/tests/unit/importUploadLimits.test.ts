import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { importParseExcel } from '../../src/controllers/DailyActivitiesController';
import importRouter from '../../src/routes/import';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function createTestApp() {
  const app = express();
  app.use('/import', importRouter);
  app.post('/daily-import', importParseExcel);
  app.use((_error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: 'unexpected parser execution' });
  });
  return app;
}

describe('Excel import upload limits', () => {
  it.each([
    ['/import/preview', 'master.xlsx'],
    ['/daily-import', 'daily.xlsx'],
  ])('rejects a workbook larger than 5 MB at %s before parsing', async (route, filename) => {
    const response = await request(createTestApp())
      .post(route)
      .attach('file', Buffer.alloc(MAX_IMPORT_BYTES + 1), {
        filename,
        contentType: EXCEL_MIME,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Ukuran file Excel melebihi batas 5 MB',
      code: 'FILE_UPLOAD_ERROR',
    });
  });
});
