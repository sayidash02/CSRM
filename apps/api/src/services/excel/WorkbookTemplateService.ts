import ExcelJS from 'exceljs';
import {
  getWorkbookSheetContract,
  LRP_SHEET_HEADERS,
} from './WorkbookContract';

const LRP_SHEET_NAME = 'LRP';

function clearWorksheetData(worksheet: ExcelJS.Worksheet, dataStartRow: number): void {
  for (let rowNumber = dataStartRow; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    worksheet.getRow(rowNumber).eachCell({ includeEmpty: true }, (cell) => {
      // Clearing the value also removes ExcelJS hyperlink values while keeping
      // row/cell styles, dimensions, filters, and merged header regions intact.
      cell.value = null;
    });
  }
}

function addLrpSheet(workbook: ExcelJS.Workbook): void {
  const existing = workbook.getWorksheet(LRP_SHEET_NAME);
  if (existing) {
    workbook.removeWorksheet(existing.id);
  }

  const worksheet = workbook.addWorksheet(LRP_SHEET_NAME);
  worksheet.columns = [
    { header: LRP_SHEET_HEADERS[0], key: 'no', width: 8 },
    { header: LRP_SHEET_HEADERS[1], key: 'program', width: 42 },
    { header: LRP_SHEET_HEADERS[2], key: 'sharepoint_link', width: 64 },
  ];

  const header = worksheet.getRow(1);
  header.height = 24;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      left: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      right: { style: 'thin', color: { argb: 'FFD9E2F3' } },
    };
  });

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = 'A1:C1';
}

/**
 * Create a safe blank workbook based on the company's workbook structure.
 * Operational rows retain their formatting but lose all old values and
 * hyperlinks. Hidden helper sheets are removed so old records cannot leak into
 * a test fixture or a recovery template.
 */
export function sanitizeWorkbookForTemplate(workbook: ExcelJS.Workbook): void {
  // Legacy company workbooks can contain defined names that point to external
  // workbooks and span millions of rows. ExcelJS expands those ranges into a
  // cell matrix while loading, so they are never useful in the operational
  // export template and must not be carried forward.
  workbook.definedNames.model = [];

  for (const worksheet of [...workbook.worksheets]) {
    if (worksheet.state !== 'visible') {
      workbook.removeWorksheet(worksheet.id);
      continue;
    }

    const contract = getWorkbookSheetContract(worksheet.name, worksheet.state);
    if (contract) {
      clearWorksheetData(worksheet, contract.dataStartRow);
    }
  }

  addLrpSheet(workbook);
}
