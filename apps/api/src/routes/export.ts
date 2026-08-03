import express, { Request, Response } from 'express';
import ExcelJS from 'exceljs';

const router = express.Router();

router.post('/excel', async (req: Request, res: Response) => {
  try {
    const { sheetName = 'Export', columns = [], data = [] } = req.body;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns;

    data.forEach((row: any) => {
      worksheet.addRow(row);
    });

    worksheet.spliceRows(1, 0, [], [], []);

    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = `Data Export - ${sheetName}`;
    titleRow.font = { size: 16, bold: true };
    if (columns.length > 0) {
      worksheet.mergeCells(1, 1, 1, columns.length);
    }

    const dateRow = worksheet.getRow(2);
    dateRow.getCell(1).value = `Generated on: ${new Date().toLocaleString()}`;
    dateRow.font = { italic: true };
    if (columns.length > 0) {
      worksheet.mergeCells(2, 1, 2, columns.length);
    }

    const headerRow = worksheet.getRow(4);
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    if (columns.length > 0) {
      worksheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };
    }
    worksheet.views = [{ state: 'frozen', ySplit: 4 }];

    for (let i = 5; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'top', wrapText: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: i % 2 === 0 ? 'FFF4F4F4' : 'FFFFFFFF' }
        };
      });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${sheetName.replace(/\s+/g, '_')}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
});

export default router;
