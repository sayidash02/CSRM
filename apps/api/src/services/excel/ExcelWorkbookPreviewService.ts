import ExcelJS from 'exceljs';
import prisma from '../../lib/prisma';
import { extractCellString } from './ExcelCellUtils';
import { detectSheetHeader, isRowNonEmpty, shouldReadDataRow, validateWorkbook } from './ExcelWorkbookValidator';
import type { ImportPreviewResult, ImportPreviewSummary } from '../ExcelImportService';

export async function previewWorkbook(filePath: string): Promise<ImportPreviewResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const report = await validateWorkbook(workbook);
    const summary: ImportPreviewSummary = {
      dailyActivities: 0,
      stakeholders: 0,
      topIssues: 0,
      proposals: 0,
      csr: 0,
      grievance: 0,
      lrp: 0,
    };

    const excelPics = new Set<string>();
    const excelCategories = new Set<string>();

    for (const worksheet of workbook.worksheets) {
      const detection = detectSheetHeader(worksheet);
      if (!detection) continue;

      let validRowCount = 0;
      for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);
        if (isRowNonEmpty(row)) {
          validRowCount++;
        }
      }

      // The strict validator is the source of truth for row counts; retain
      // the scan below only for master-data discovery.

      if (detection.sheetType === 'dailyActivities') {
        const headerRow = worksheet.getRow(detection.headerRowIndex);
        let picCol = -1;
        let catCol = -1;

        headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const text = extractCellString(cell.value).trim().toLowerCase();
          if (text === 'pic' || text.includes('pic')) {
            picCol = colNumber;
          }
          if (text === 'kategori' || text === 'category' || text.includes('kategori')) {
            catCol = colNumber;
          }
        });

        if (picCol !== -1 || catCol !== -1) {
          for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
            const row = worksheet.getRow(r);
            if (!shouldReadDataRow(worksheet, detection, r) || !isRowNonEmpty(row)) continue;

            if (picCol !== -1) {
              let picVal = extractCellString(row.getCell(picCol).value).trim();
              if (picVal.length > 255) picVal = '';
              if (picVal) {
                const names = picVal.split(/[,&]|\bdan\b/i).map(n => n.trim()).filter(Boolean);
                for (const n of names) excelPics.add(n);
              }
            }
            if (catCol !== -1) {
              let catVal = extractCellString(row.getCell(catCol).value).trim();
              if (catVal.length > 50) catVal = ''; // Filter out obviously invalid Categories
              if (catVal) excelCategories.add(catVal);
            }
          }
        }
      }
    }

    const existingPics = await prisma.pics.findMany({ select: { name: true } });
    const existingCategories = await prisma.categories.findMany({ select: { name: true } });

    const dbPicNames = new Set(existingPics.map(p => p.name.trim().toLowerCase()));
    const dbCatNames = new Set(existingCategories.map(c => c.name.trim().toLowerCase()));

    const newPics = Array.from(excelPics).filter(p => !dbPicNames.has(p.toLowerCase()));
    const newCategories = Array.from(excelCategories).filter(c => !dbCatNames.has(c.toLowerCase()));

    return {
      fileId: filePath,
      summary: report.summary,
      newMasterData: {
        pics: newPics,
        categories: newCategories
      },
      conflicts: report.conflicts,
      canImport: report.conflicts.every((conflict) => !conflict.blocking)
    };}
