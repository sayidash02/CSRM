import express, { Request, Response } from 'express';
import ExcelJS from 'exceljs';

const router = express.Router();

router.post('/excel', async (req: Request, res: Response) => {
  try {
    const { sheetName = 'Export', columns = [], data = [] } = req.body;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns;

    const firstRow = worksheet.getRow(1);
    firstRow.font = { bold: true };
    firstRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' } // Light grey
    };

    data.forEach((row: any) => {
      worksheet.addRow(row);
    });

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
