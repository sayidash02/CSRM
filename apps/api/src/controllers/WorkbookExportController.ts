import path from 'path';
import { Request, Response } from 'express';
import { catchAsync } from '../lib/catchAsync';
import { WorkbookExportService, WorkbookExportYear } from '../services/excel/WorkbookExportService';

const templatePath = process.env.CRMS_WORKBOOK_TEMPLATE_PATH
  || path.resolve(__dirname, '../../templates/CRS-operational-template.xlsx');
const workbookExportService = new WorkbookExportService(templatePath);

const parseYear = (value: unknown): WorkbookExportYear => {
  if (value === undefined || value === null || value === '' || value === 'All' || value === 'Semua') {
    return null;
  }
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error('Parameter year tidak valid');
  }
  return year;
};

export const exportWorkbook = catchAsync(async (req: Request, res: Response): Promise<void> => {
  let year: WorkbookExportYear;
  try {
    year = parseYear(req.query.year);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
    return;
  }

  const buffer = await workbookExportService.generateDatabaseWorkbookBuffer(year);
  const suffix = year === null ? 'all-years' : String(year);
  const fileName = `CRS-operational-${suffix}.xlsx`;

  res.status(200);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', buffer.byteLength);
  res.setHeader('X-Workbook-Year', year === null ? 'all' : String(year));
  res.send(buffer);
});
