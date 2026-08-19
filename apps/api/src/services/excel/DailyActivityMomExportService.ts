import ExcelJS from 'exceljs';
import prisma from '../../lib/prisma';

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const formatIndonesianDate = (d: Date | string | null | undefined): string => {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '-';
  return `${date.getDate()} ${INDONESIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

export const getIndonesianDay = (d: Date | string | null | undefined): string => {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '-';
  return INDONESIAN_DAYS[date.getDay()] ?? '-';
};

const formatCurrency = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (isNaN(num) || num === 0) return '-';
  return `Rp ${num.toLocaleString('id-ID')}`;
};

const BANNER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A8A' } // Deep Navy Blue
};

const SUBHEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' } // Subtle Slate White
};

const SECTION_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9E2F3' } // Soft Executive Blue
};

const KEY_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' } // Light Grayish Blue
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFA6B9D0' } },
  left: { style: 'thin', color: { argb: 'FFA6B9D0' } },
  bottom: { style: 'thin', color: { argb: 'FFA6B9D0' } },
  right: { style: 'thin', color: { argb: 'FFA6B9D0' } }
};

const applyCellStyle = (
  cell: ExcelJS.Cell,
  options?: {
    font?: Partial<ExcelJS.Font> | undefined;
    fill?: ExcelJS.Fill | undefined;
    border?: Partial<ExcelJS.Borders> | undefined;
    alignment?: Partial<ExcelJS.Alignment> | undefined;
  }
) => {
  cell.font = options?.font || { name: 'Times New Roman', size: 10, color: { argb: 'FF1F2937' } };
  if (options?.fill) cell.fill = options.fill;
  cell.border = options?.border || THIN_BORDER;
  cell.alignment = options?.alignment || { vertical: 'top', horizontal: 'left', wrapText: true };
};

export class DailyActivityMomExportService {
  /**
   * Populate a single worksheet with an elegant, executive-level MOM (Minutes of Meeting) / Daily Notes format.
   * Styled cleanly with Times New Roman typography, refined section headers, and professional layout.
   */
  public static populateMomWorksheet(worksheet: ExcelJS.Worksheet, activity: any): void {
    worksheet.getColumn('A').width = 30;
    worksheet.getColumn('B').width = 95;

    let currentRow = 1;

    // Row 1: Banner Header (External Affairs - Daily Notes)
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const bannerCell = worksheet.getCell(`A${currentRow}`);
    bannerCell.value = 'External Affairs - Daily Notes';
    applyCellStyle(bannerCell, {
      font: { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: BANNER_FILL,
      alignment: { vertical: 'middle', horizontal: 'center' }
    });
    applyCellStyle(worksheet.getCell(`B${currentRow}`), { fill: BANNER_FILL });
    worksheet.getRow(currentRow).height = 30;
    currentRow++;

    // Row 2: Daily Title Subheader
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = `Daily Title : ${activity.activity || '-'}`;
    applyCellStyle(titleCell, {
      font: { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF0F172A' } },
      fill: SUBHEADER_FILL,
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true }
    });
    applyCellStyle(worksheet.getCell(`B${currentRow}`), { fill: SUBHEADER_FILL });
    worksheet.getRow(currentRow).height = 32;
    currentRow++;

    // Metadata Key-Value Helper
    const addKeyValueRow = (key: string, value: string) => {
      const cellA = worksheet.getCell(`A${currentRow}`);
      const cellB = worksheet.getCell(`B${currentRow}`);
      cellA.value = key;
      cellB.value = value || '-';
      applyCellStyle(cellA, {
        font: { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF334155' } },
        fill: KEY_FILL,
        alignment: { vertical: 'middle', horizontal: 'left' }
      });
      applyCellStyle(cellB, {
        font: { name: 'Times New Roman', size: 10, color: { argb: 'FF0F172A' } },
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true }
      });
      worksheet.getRow(currentRow).height = 22;
      currentRow++;
    };

    addKeyValueRow('Lokasi', activity.location || '-');
    addKeyValueRow('Venue / Tempat', activity.address || '-');
    addKeyValueRow('Hari & Tanggal', `${getIndonesianDay(activity.activity_date)}, ${formatIndonesianDate(activity.activity_date)}`);
    addKeyValueRow('Category', activity.category?.name || '-');
    if (activity.sub_category?.name) {
      addKeyValueRow('Sub Category', activity.sub_category.name);
    }
    if (activity.focus) {
      addKeyValueRow('Fokus', activity.focus);
    }
    if (activity.cost != null && Number(activity.cost) > 0) {
      addKeyValueRow('Biaya / Anggaran', formatCurrency(activity.cost));
    }

    // Section Header Helper
    const addSectionHeader = (title: string) => {
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      const headerCell = worksheet.getCell(`A${currentRow}`);
      headerCell.value = title;
      applyCellStyle(headerCell, {
        font: { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } },
        fill: SECTION_FILL,
        alignment: { vertical: 'middle', horizontal: 'left' }
      });
      applyCellStyle(worksheet.getCell(`B${currentRow}`), { fill: SECTION_FILL });
      worksheet.getRow(currentRow).height = 24;
      currentRow++;
    };

    // Section Content Helper
    const addSectionContent = (content: string | null | undefined, minHeight = 45) => {
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      const contentCell = worksheet.getCell(`A${currentRow}`);
      contentCell.value = content || '-';
      applyCellStyle(contentCell, {
        font: { name: 'Times New Roman', size: 10, color: { argb: 'FF1F2937' } },
        alignment: { vertical: 'top', horizontal: 'left', wrapText: true }
      });
      applyCellStyle(worksheet.getCell(`B${currentRow}`));
      worksheet.getRow(currentRow).height = minHeight;
      currentRow++;
    };

    // 1. Attendees
    addSectionHeader('Attendees');
    const internalPics = activity.pics?.map((p: any) => p.name).filter(Boolean).join(', ')
      || activity.daily_activity_pics?.map((d: any) => d.pic?.name).filter(Boolean).join(', ')
      || 'Tim PT Jawa Satu Power (JSP)';
    
    let externalAttendees = activity.institution_group || '';
    const attendeesLines: string[] = [
      `1. Tim Internal PT Jawa Satu Power (JSP) : ${internalPics}`
    ];
    if (externalAttendees) {
      const extLines = externalAttendees.split('\n').map((l: string) => l.trim()).filter(Boolean);
      if (extLines.length > 1) {
        extLines.forEach((l: string, idx: number) => {
          attendeesLines.push(`2.${idx + 1}. ${l.replace(/^[-*•\d.]+\s*/, '')}`);
        });
      } else {
        attendeesLines.push(`2. ${externalAttendees.replace(/^[-*•\d.]+\s*/, '')}`);
      }
    } else {
      attendeesLines.push('2. -');
    }
    addSectionContent(attendeesLines.join('\n'), 45);

    // 2. Keterangan Pertemuan
    addSectionHeader('Keterangan Pertemuan');
    addSectionContent(activity.keterangan || activity.description_result || '-', 50);

    // 3. Hasil Pertemuan
    addSectionHeader('Hasil Pertemuan');
    addSectionContent(activity.hasil || activity.description_result || '-', 90);

    // 4. Kesimpulan
    addSectionHeader('Kesimpulan');
    addSectionContent(activity.kesimpulan || '-', 50);

    // 5. Next Plan
    addSectionHeader('Next Plan');
    addSectionContent(activity.next_plan || '-', 50);

    // 6. Supporting Documents
    addSectionHeader('Supporting Documents / Documentation');
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const docCell = worksheet.getCell(`A${currentRow}`);
    if (activity.document_link) {
      docCell.value = {
        text: activity.document_link,
        hyperlink: activity.document_link
      };
      applyCellStyle(docCell, {
        font: { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1D4ED8' }, underline: true },
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true }
      });
    } else {
      docCell.value = '-';
      applyCellStyle(docCell, {
        font: { name: 'Times New Roman', size: 10, color: { argb: 'FF64748B' } },
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true }
      });
    }
    applyCellStyle(worksheet.getCell(`B${currentRow}`));
    worksheet.getRow(currentRow).height = 30;
  }

  /**
   * Generates a single MOM Excel buffer for a given daily activity.
   */
  public static async generateSingleMomBuffer(id: bigint | string | number): Promise<{ buffer: Buffer; fileName: string; activity: any }> {
    const activity = await prisma.daily_activities.findUnique({
      where: { id: BigInt(id) },
      include: {
        daily_activity_pics: { include: { pic: true } },
        category: true,
        sub_category: true
      }
    });

    if (!activity) {
      const err: any = new Error('Data kegiatan harian tidak ditemukan');
      err.status = 404;
      throw err;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CRMS - Jawa Satu Power';
    workbook.created = new Date();

    const sheetName = 'Daily Notes';
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
      pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    this.populateMomWorksheet(worksheet, activity);

    const rawBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(rawBuffer);

    const safeTitle = (activity.activity || 'Kegiatan')
      .replace(/[/\\?%*:|"<>]/g, ' ')
      .trim()
      .substring(0, 40);
    const dateStr = formatIndonesianDate(activity.activity_date).replace(/\s+/g, '_');
    const fileName = `MOM_${safeTitle}_${dateStr}.xlsx`;

    return { buffer, fileName, activity };
  }

  /**
   * Generates an All-in-One Workbook containing:
   * Sheet 1: Rekap Daily Activities (Master Table)
   * Sheet 2..N: MOM sheets for each activity.
   */
  public static async generateMomWorkbookBuffer(options: {
    year?: string | number | null;
    start?: string;
    end?: string;
    search?: string;
    cat?: string;
    sub_cat?: string;
    is_deleted?: boolean;
  }): Promise<{ buffer: Buffer; fileName: string; count: number }> {
    const where: any = {
      is_deleted: options.is_deleted === true,
      is_archived: false
    };

    if (options.year && options.year !== 'Semua' && options.year !== 'All' && !isNaN(parseInt(String(options.year)))) {
      const y = String(options.year);
      where.activity_date = {
        gte: new Date(`${y}-01-01T00:00:00.000Z`),
        lte: new Date(`${y}-12-31T23:59:59.999Z`)
      };
    }
    if (options.start && options.end) {
      where.activity_date = {
        gte: new Date(`${options.start}T00:00:00.000Z`),
        lte: new Date(`${options.end}T23:59:59.999Z`)
      };
    }
    if (options.cat && options.cat !== 'All') {
      where.category_id = BigInt(options.cat);
    }
    if (options.sub_cat && options.sub_cat !== 'All') {
      where.sub_category_id = BigInt(options.sub_cat);
    }
    if (options.search) {
      const q = options.search;
      where.OR = [
        { activity: { contains: q } },
        { location: { contains: q } },
        { institution_group: { contains: q } },
        { keterangan: { contains: q } },
        { hasil: { contains: q } },
        { kesimpulan: { contains: q } },
        { next_plan: { contains: q } }
      ];
    }

    const activities = await prisma.daily_activities.findMany({
      where,
      include: {
        daily_activity_pics: { include: { pic: true } },
        category: true,
        sub_category: true
      },
      orderBy: { activity_date: 'asc' }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CRMS - Jawa Satu Power';
    workbook.created = new Date();

    // Sheet 1: Master Rekap Table
    const rekapSheet = workbook.addWorksheet('Rekap Daily Activities', {
      views: [{ showGridLines: true }]
    });

    const columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Hari', key: 'day', width: 12 },
      { header: 'Tanggal', key: 'date', width: 16 },
      { header: 'Daily Title / Kegiatan', key: 'activity', width: 38 },
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Sub Category', key: 'sub_category', width: 22 },
      { header: 'Fokus', key: 'focus', width: 22 },
      { header: 'Lokasi (Wilayah)', key: 'location', width: 20 },
      { header: 'Venue (Tempat)', key: 'address', width: 25 },
      { header: 'Biaya', key: 'cost', width: 18 },
      { header: 'PIC (Internal JSP)', key: 'pics', width: 25 },
      { header: 'Attendees / Instansi Eksternal', key: 'institution_group', width: 30 },
      { header: 'Keterangan Pertemuan', key: 'keterangan', width: 35 },
      { header: 'Hasil Pertemuan', key: 'hasil', width: 40 },
      { header: 'Kesimpulan', key: 'kesimpulan', width: 35 },
      { header: 'Next Plan', key: 'next_plan', width: 35 },
      { header: 'Supporting Documents', key: 'document_link', width: 30 }
    ];
    rekapSheet.columns = columns;

    // Header styling
    const headerRow = rekapSheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
      cell.fill = SECTION_FILL;
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    // Populate data rows
    activities.forEach((act, idx) => {
      const picNames = act.daily_activity_pics?.map((dap: any) => dap.pic?.name).filter(Boolean).join(', ') || '-';
      const row = rekapSheet.addRow({
        no: idx + 1,
        day: getIndonesianDay(act.activity_date),
        date: formatIndonesianDate(act.activity_date),
        activity: act.activity || '-',
        category: act.category?.name || '-',
        sub_category: act.sub_category?.name || '-',
        focus: act.focus || '-',
        location: act.location || '-',
        address: act.address || '-',
        cost: formatCurrency(act.cost != null ? String(act.cost) : null),
        pics: picNames,
        institution_group: act.institution_group || '-',
        keterangan: act.keterangan || act.description_result || '-',
        hasil: act.hasil || act.description_result || '-',
        kesimpulan: act.kesimpulan || '-',
        next_plan: act.next_plan || '-',
        document_link: act.document_link || '-'
      });
      row.height = 24;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Times New Roman', size: 10, color: { argb: 'FF1F2937' } };
        cell.border = THIN_BORDER;
        cell.alignment = {
          vertical: 'top',
          horizontal: colNum === 1 ? 'center' : (colNum === 10 ? 'right' : 'left'),
          wrapText: true
        };
        if (colNum === 17 && act.document_link) {
          cell.value = { text: act.document_link, hyperlink: act.document_link };
          cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1D4ED8' }, underline: true };
        }
      });
    });

    // Sheet 2..N: Individual MOM sheets
    const usedSheetNames = new Set<string>(['Rekap Daily Activities']);
    activities.forEach((act, idx) => {
      let baseName = `MOM ${idx + 1}`;
      if (act.location) {
        baseName += ` - ${act.location.substring(0, 15)}`;
      } else if (act.activity) {
        baseName += ` - ${act.activity.substring(0, 15)}`;
      }
      baseName = baseName.replace(/[/\\?%*:|"<>]/g, '').trim().substring(0, 31);
      let uniqueName = baseName;
      let counter = 1;
      while (usedSheetNames.has(uniqueName)) {
        uniqueName = `${baseName.substring(0, 27)} (${counter++})`;
      }
      usedSheetNames.add(uniqueName);

      const momSheet = workbook.addWorksheet(uniqueName, {
        views: [{ showGridLines: true }],
        pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
      });
      this.populateMomWorksheet(momSheet, act);
    });

    const rawBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(rawBuffer);
    const yearSuffix = options.year ? String(options.year) : 'All';
    const fileName = `Daily_Activities_MOM_Workbook_${yearSuffix}.xlsx`;

    return { buffer, fileName, count: activities.length };
  }
}
