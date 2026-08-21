import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { DailyActivityMomExportService } from '../../src/services/excel/DailyActivityMomExportService';

describe('DailyActivityMomExportService security boundary', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('does not read file:// attachments in production', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crms-mom-security-'));
    const imagePath = path.join(tempDir, 'private.png');
    const onePixelPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    await fs.writeFile(imagePath, onePixelPng);

    try {
      process.env.NODE_ENV = 'production';
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Daily Notes');

      DailyActivityMomExportService.populateMomWorksheet(worksheet, {
        id: 1,
        activity_date: new Date('2026-05-25T00:00:00.000Z'),
        activity: 'Security boundary test',
        document_link: `file:///${imagePath.replace(/\\/g, '/')}`,
      }, workbook);

      expect(worksheet.getImages()).toHaveLength(0);
      const cellText: string[] = [];
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          if (typeof cell.value === 'string') cellText.push(cell.value);
        });
      });
      expect(cellText.join('\n').toLowerCase()).not.toContain('file://');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
