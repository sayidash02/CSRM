import ExcelJS from 'exceljs';
import prisma from '../lib/prisma';

export async function parseDailyActivitiesExcel(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  
  if (!ws) throw new Error("Excel file is empty");

  const categories = await prisma.categories.findMany();
  const subCategories = await prisma.sub_categories.findMany();
  const pics = await prisma.pics.findMany();

  const validRows: any[] = [];
  const errorRows: any[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const values = row.values as any[];
    if (!values) return;

    const no = values[1];
    if (no === undefined || no === null || no === '') return; // Skip empty rows

    let activity_date = values[2];
    if (activity_date instanceof Date) {
      activity_date = activity_date.toISOString();
    } else {
      activity_date = String(activity_date || '');
    }

    const activity = String(values[3] || '');
    const institution_group = String(values[4] || '');
    const address = String(values[5] || '');
    const rawCat = String(values[6] || '');
    const rawSubCat = String(values[7] || '');
    const catName = rawCat.toLowerCase().trim();
    const subCatName = rawSubCat.toLowerCase().trim();
    const focus = String(values[8] || '');
    const location = String(values[9] || '');
    const cost = Number(values[10]) || 0;
    const keterangan = String(values[11] || '');
    const hasil = String(values[12] || '');
    const document_link = String(values[13] || '');
    const rawPic = String(values[14] || '');
    const picName = rawPic.toLowerCase().trim();

    const description_result = [keterangan, hasil].filter(Boolean).join(' - ');

    const categoryMatch = categories.find(c => c.name.toLowerCase().trim() === catName);
    const subCategoryMatch = subCategories.find(s => s.name.toLowerCase().trim() === subCatName);
    const picMatch = pics.find(p => p.name.toLowerCase().trim() === picName);

    const errors: string[] = [];
    if (!activity_date || activity_date === 'undefined') errors.push("Tanggal kosong atau salah format");
    if (!activity) errors.push("Kegiatan wajib diisi");
    if (rawCat && !categoryMatch) errors.push(`Kategori '${rawCat}' tidak ditemukan`);
    if (rawSubCat && !subCategoryMatch) errors.push(`Sub Category '${rawSubCat}' tidak ditemukan`);
    if (rawPic && !picMatch) errors.push(`PIC '${rawPic}' tidak ditemukan`);
    if (!rawCat) errors.push("Kategori wajib diisi");
    if (!rawPic) errors.push("PIC wajib diisi");

    const mappedData = {
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

