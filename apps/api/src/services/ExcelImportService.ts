import ExcelJS from 'exceljs';
import prisma from '../lib/prisma';

export interface ParsedDailyActivityRow {
  tempId: string;
  activity_date: string;
  activity: string;
  institution_group: string;
  address: string;
  category_id: string | null;
  sub_category_id: string | null;
  focus: string;
  location: string;
  cost: number;
  description_result: string;
  document_link: string;
  pic_id: string | null;
  category_name: string;
  sub_category_name: string;
  pic_name: string;
}

export interface ExcelImportErrorRow extends ParsedDailyActivityRow {
  errors: string[];
}

export interface ExcelImportResult {
  validRows: ParsedDailyActivityRow[];
  errorRows: ExcelImportErrorRow[];
}

function extractCellString(val: any): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') {
    if (val.result !== undefined) return String(val.result ?? '');
    if (val.text !== undefined) return String(val.text ?? '');
    if (Array.isArray(val.richText)) {
      return val.richText.map((r: any) => r.text || '').join('');
    }
  }
  return String(val).trim();
}

export async function parseDailyActivitiesExcel(buffer: Buffer): Promise<ExcelImportResult> {
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
    let cost = 0;
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
    const document_link = extractCellString(values[13]);
    const rawPic = extractCellString(values[14]);

    const description_result = [keterangan, hasil].filter(Boolean).join(' - ');

    const catName = rawCat.toLowerCase();
    const subCatName = rawSubCat.toLowerCase();
    const picName = rawPic.toLowerCase();

    const categoryMatch = categories.find(c => c.name.toLowerCase().trim() === catName);
    const subCategoryMatch = subCategories.find(s => s.name.toLowerCase().trim() === subCatName);
    const picMatch = pics.find(p => p.name.toLowerCase().trim() === picName);

    const errors: string[] = [];
    if (!activity_date) errors.push("Tanggal kosong atau salah format");
    if (!activity) errors.push("Kegiatan wajib diisi");
    if (costError) errors.push(`Biaya '${values[10]}' bukan berupa angka`);
    if (rawCat && !categoryMatch) errors.push(`Kategori '${rawCat}' tidak ditemukan`);
    if (rawSubCat && !subCategoryMatch) errors.push(`Sub Category '${rawSubCat}' tidak ditemukan`);
    if (rawPic && !picMatch) errors.push(`PIC '${rawPic}' tidak ditemukan`);
    if (!rawCat) errors.push("Kategori wajib diisi");
    if (!rawPic) errors.push("PIC wajib diisi");

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
      description_result,
      document_link,
      pic_id: picMatch ? String(picMatch.id) : null,
      category_name: rawCat,
      sub_category_name: rawSubCat,
      pic_name: rawPic
    };

    if (errors.length > 0) {
      errorRows.push({ ...mappedData, errors });
    } else {
      validRows.push(mappedData);
    }
  });

  return { validRows, errorRows };
}
