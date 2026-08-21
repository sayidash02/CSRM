import ExcelJS from 'exceljs';
import prisma from '../../lib/prisma';
import { extractCellString } from './ExcelCellUtils';
import type { ExcelImportErrorRow, ExcelImportResult, ParsedDailyActivityRow } from '../ExcelImportService';

export async function parseDailyActivitiesWorkbook(buffer: Buffer): Promise<ExcelImportResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Excel file is empty");

  const categories = await prisma.categories.findMany();
  const subCategories = await prisma.sub_categories.findMany();
  const pics = await prisma.pics.findMany({ where: { is_active: true } });

  const validRows: ParsedDailyActivityRow[] = [];
  const errorRows: ExcelImportErrorRow[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const values = row.values as any[];
    if (!values || values[1] === undefined || values[1] === null || values[1] === '') return;

    let activity_date = '';
    const rawDate = values[2];
    if (rawDate instanceof Date) {
      activity_date = rawDate.toISOString();
    } else {
      activity_date = extractCellString(rawDate);
    }

    const activity = extractCellString(values[3]);
    const institution_group = extractCellString(values[4]);
    const address = extractCellString(values[5]);
    const rawCat = extractCellString(values[6]);
    const rawSubCat = extractCellString(values[7]);
    const focus = extractCellString(values[8]);
    const location = extractCellString(values[9]);

    const rawCost = values[10];
    let cost: number | null = null;
    let costError = false;
    if (rawCost !== undefined && rawCost !== null && rawCost !== '') {
      const parsedCost = Number(rawCost);
      if (isNaN(parsedCost)) {
        costError = true;
      } else {
        cost = parsedCost;
      }
    }

    const keterangan = extractCellString(values[11]);
    const hasil = extractCellString(values[12]);
    // Column 13 is retained as a legacy workbook slot, but its old URL value
    // is deliberately ignored. Photos are uploaded through the authenticated
    // MySQL photo endpoint after import.
    const rawPic = extractCellString(values[14]);

    const description_result = [keterangan, hasil].filter(Boolean).join(' - ');

    const catName = rawCat.toLowerCase();
    const subCatName = rawSubCat.toLowerCase();
    const rawPicNames = rawPic.split(/[,&]|\bdan\b/i).map(n => n.trim()).filter(Boolean);
    const picNames = rawPicNames.map(n => n.toLowerCase());

    const categoryMatch = categories.find(c => c.name.toLowerCase().trim() === catName);
    const subCategoryMatch = subCategories.find(s => s.name.toLowerCase().trim() === subCatName);
    const picMatches = picNames.map(pName => pics.find(p => p.name.toLowerCase().trim() === pName));

    const errors: string[] = [];
    if (!activity_date) errors.push("Tanggal kosong atau salah format");
    if (!activity) errors.push("Kegiatan wajib diisi");
    if (costError) errors.push(`Biaya '${values[10]}' bukan berupa angka`);
    if (rawCat && !categoryMatch) errors.push(`Kategori '${rawCat}' tidak ditemukan`);
    if (rawSubCat && !subCategoryMatch) errors.push(`Sub Category '${rawSubCat}' tidak ditemukan`);
    if (rawPicNames.length > 0) {
      rawPicNames.forEach((name, i) => {
        if (!picMatches[i]) errors.push(`PIC '${name}' tidak ditemukan`);
      });
    } else {
      errors.push("PIC wajib diisi");
    }
    if (!rawCat) errors.push("Kategori wajib diisi");

    const mappedData: ParsedDailyActivityRow = {
      tempId: `row-${rowNumber}`,
      activity_date,
      activity,
      institution_group,
      address,
      category_id: categoryMatch ? String(categoryMatch.id) : null,
      sub_category_id: subCategoryMatch ? String(subCategoryMatch.id) : null,
      focus,
      location,
      cost,
      keterangan,
      hasil,
      description_result,
      pic_ids: picMatches.map(p => p ? String(p.id) : '').filter(Boolean),
      category_name: rawCat,
      sub_category_name: rawSubCat,
      pic_names: rawPicNames
    };

    if (errors.length > 0) {
      errorRows.push({ ...mappedData, errors });
    } else {
      validRows.push(mappedData);
    }
  });

  return { validRows, errorRows };
}
