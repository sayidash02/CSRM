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
    if (!values || !values[2]) return; // Skip empty rows

    let activity_date = values[3];
    if (activity_date instanceof Date) {
      activity_date = activity_date.toISOString();
    } else {
      activity_date = String(activity_date || '');
    }

    const activity = String(values[4] || '');
    const institution_group = String(values[5] || '');
    const address = String(values[6] || '');
    const catName = String(values[7] || '').toLowerCase().trim();
    const subCatName = String(values[8] || '').toLowerCase().trim();
    const focus = String(values[9] || '');
    const location = String(values[10] || '');
    const cost = Number(values[11]) || 0;
    const keterangan = String(values[12] || '');
    const hasil = String(values[13] || '');
    const document_link = String(values[14] || '');
    const picName = String(values[15] || '').toLowerCase().trim();

    const description_result = [keterangan, hasil].filter(Boolean).join(' - ');

    const categoryMatch = categories.find(c => c.name.toLowerCase().trim() === catName);
    const subCategoryMatch = subCategories.find(s => s.name.toLowerCase().trim() === subCatName);
    const picMatch = pics.find(p => p.name.toLowerCase().trim() === picName);

    const errors: string[] = [];
    if (!activity_date || activity_date === 'undefined') errors.push("Tanggal kosong atau salah format");
    if (!activity) errors.push("Kegiatan wajib diisi");
    if (catName && !categoryMatch) errors.push(`Kategori '${values[7]}' tidak ditemukan`);
    if (subCatName && !subCategoryMatch) errors.push(`Sub Category '${values[8]}' tidak ditemukan`);
    if (picName && !picMatch) errors.push(`PIC '${values[15]}' tidak ditemukan`);
    if (!catName) errors.push("Kategori wajib diisi");
    if (!picName) errors.push("PIC wajib diisi");

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
      category_name: values[7] || '',
      sub_category_name: values[8] || '',
      pic_name: values[15] || ''
    };

    if (errors.length > 0) {
      errorRows.push({ ...mappedData, errors });
    } else {
      validRows.push(mappedData);
    }
  });

  return { validRows, errorRows };
}
