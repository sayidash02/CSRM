import ExcelJS from 'exceljs';
import prisma from '../../lib/prisma';
import { getImageDimensions } from './MomAttachmentResolver';

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
  fgColor: { argb: 'FF1E3A8A' } // Deep Navy
};

const SUBHEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFDBEAFE' } // Soft Executive Blue Accent
};

const TITLE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' } // Light Slate
};

const SECTION_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFDBEAFE' } // Soft Accent Blue
};

const KEY_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' } // Light Grayish Blue
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
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
  cell.alignment = options?.alignment || { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
};

const applyMergedRowStyles = (
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  colEnd = 4,
  options?: {
    font?: Partial<ExcelJS.Font> | undefined;
    fill?: ExcelJS.Fill | undefined;
    border?: Partial<ExcelJS.Borders> | undefined;
    alignment?: Partial<ExcelJS.Alignment> | undefined;
  }
) => {
  for (let c = 1; c <= colEnd; c++) {
    const cell = worksheet.getRow(rowNumber).getCell(c);
    applyCellStyle(cell, options);
  }
};

type ActivityPhoto = {
  photo_data: Buffer | Uint8Array;
  mime_type: string;
  original_name: string;
  sort_order?: number;
  is_deleted?: boolean;
};

const getActivityPhotos = (activity: any): ActivityPhoto[] =>
  (Array.isArray(activity?.photos) ? activity.photos : [])
    .filter((photo: ActivityPhoto) => photo && photo.is_deleted !== true && photo.photo_data)
    .sort((a: ActivityPhoto, b: ActivityPhoto) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

const excelImageExtension = (photo: ActivityPhoto): 'jpeg' | 'png' | null => {
  const mime = String(photo.mime_type || '').toLowerCase();
  const name = String(photo.original_name || '').toLowerCase();
  if (mime === 'image/png' || name.endsWith('.png')) return 'png';
  if (mime === 'image/jpeg' || mime === 'image/jpg' || /\.(jpe?g)$/.test(name)) return 'jpeg';
  return null;
};

const photoBuffer = (photo: ActivityPhoto): Buffer => Buffer.from(photo.photo_data);

const addExcelPhoto = (
  worksheet: ExcelJS.Worksheet,
  workbook: ExcelJS.Workbook,
  photo: ActivityPhoto,
  topLeft: { col: number; row: number },
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } | null => {
  const extension = excelImageExtension(photo);
  if (!extension) return null;
  const buffer = photoBuffer(photo);
  const dimensions = getImageDimensions(buffer);
  const scale = Math.min(maxWidth / dimensions.width, maxHeight / dimensions.height, 1);
  const width = Math.max(120, Math.round(dimensions.width * scale));
  const height = Math.max(100, Math.round(dimensions.height * scale));
  const imageId = workbook.addImage({ buffer: buffer as any, extension });
  worksheet.addImage(imageId, { tl: topLeft, ext: { width, height } });
  return { width, height };
};


export class DailyActivityMomExportService {
  /**
   * Populate a single worksheet with an executive-level, 4-column balanced layout MOM (Minutes of Meeting).
   * Styled with Times New Roman typography, 2x2 metadata grid, dynamic row heights, photo documentation frame, and clean borders.
   */
  public static populateMomWorksheet(worksheet: ExcelJS.Worksheet, activity: any, workbook?: ExcelJS.Workbook): void {
    worksheet.getColumn('A').width = 24;
    worksheet.getColumn('B').width = 38;
    worksheet.getColumn('C').width = 24;
    worksheet.getColumn('D').width = 38;

    let currentRow = 1;

    const yearStr = activity.activity_date ? String(new Date(activity.activity_date).getFullYear()) : '2026';
    const docIdStr = activity.id ? String(activity.id).padStart(3, '0') : '001';

    // Row 1: Company Banner & Document Control (A1:C1 and D1)
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 3, {
      font: { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: BANNER_FILL,
      alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
    });
    worksheet.getCell(`A${currentRow}`).value = 'PT JAWA SATU POWER — EXTERNAL AFFAIRS & CSR';

    const cellD1 = worksheet.getCell(`D${currentRow}`);
    applyCellStyle(cellD1, {
      font: { name: 'Times New Roman', size: 9, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: BANNER_FILL,
      alignment: { vertical: 'middle', horizontal: 'right', indent: 1 }
    });
    cellD1.value = `DOC ID: JSP-EA-MOM-${yearStr}-${docIdStr}`;
    worksheet.getRow(currentRow).height = 24;
    currentRow++;

    // Row 2: Document Header Title (A2:D2)
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 4, {
      font: { name: 'Times New Roman', size: 13, bold: true, color: { argb: 'FF1E3A8A' } },
      fill: SUBHEADER_FILL,
      alignment: { vertical: 'middle', horizontal: 'center' }
    });
    worksheet.getCell(`A${currentRow}`).value = 'MINUTES OF MEETING & DAILY ACTIVITY REPORT';
    worksheet.getRow(currentRow).height = 28;
    currentRow++;

    // Row 3: Daily Activity Title (A3:D3)
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 4, {
      font: { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF0F172A' } },
      fill: TITLE_FILL,
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 }
    });
    worksheet.getCell(`A${currentRow}`).value = `Topik / Daily Title : ${activity.activity || '-'}`;
    worksheet.getRow(currentRow).height = 32;
    currentRow++;

    // Helper for 2x2 Metadata Rows
    const addMetadataGridRow = (k1: string, v1: string, k2: string, v2: string) => {
      const row = worksheet.getRow(currentRow);
      row.height = 22;

      const cellA = row.getCell(1);
      const cellB = row.getCell(2);
      const cellC = row.getCell(3);
      const cellD = row.getCell(4);

      cellA.value = k1;
      applyCellStyle(cellA, {
        font: { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FF334155' } },
        fill: KEY_FILL,
        alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
      });

      cellB.value = v1 || '-';
      applyCellStyle(cellB, {
        font: { name: 'Times New Roman', size: 10, color: { argb: 'FF0F172A' } },
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 }
      });

      cellC.value = k2;
      applyCellStyle(cellC, {
        font: { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FF334155' } },
        fill: KEY_FILL,
        alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
      });

      cellD.value = v2 || '-';
      applyCellStyle(cellD, {
        font: { name: 'Times New Roman', size: 10, color: { argb: 'FF0F172A' } },
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 }
      });

      currentRow++;
    };

    const picNames = activity.pics?.map((p: any) => p.name).filter(Boolean).join(', ')
      || activity.daily_activity_pics?.map((d: any) => d.pic?.name).filter(Boolean).join(', ')
      || '-';

    addMetadataGridRow(
      'Hari & Tanggal',
      `${getIndonesianDay(activity.activity_date)}, ${formatIndonesianDate(activity.activity_date)}`,
      'Lokasi Wilayah',
      activity.location || '-'
    );

    addMetadataGridRow(
      'Venue / Tempat',
      activity.address || '-',
      'PIC Internal JSP',
      picNames
    );

    addMetadataGridRow(
      'Kategori',
      activity.category?.name || '-',
      'Sub Kategori',
      activity.sub_category?.name || '-'
    );

    addMetadataGridRow(
      'Fokus Kegiatan',
      activity.focus || '-',
      'Anggaran / Biaya',
      formatCurrency(activity.cost)
    );

    // Section Content Builder
    const addSectionBlock = (sectionTitle: string, content: string | null | undefined, defaultMinHeight = 45) => {
      // Header
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      applyMergedRowStyles(worksheet, currentRow, 4, {
        font: { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } },
        fill: SECTION_FILL,
        alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
      });
      worksheet.getCell(`A${currentRow}`).value = sectionTitle;
      worksheet.getRow(currentRow).height = 24;
      currentRow++;

      // Content Box
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const text = content || '-';
      const numLines = text.split('\n').length;
      const calculatedHeight = Math.max(defaultMinHeight, Math.min(300, numLines * 20 + 16));

      applyMergedRowStyles(worksheet, currentRow, 4, {
        font: { name: 'Times New Roman', size: 10, color: { argb: 'FF1F2937' } },
        alignment: { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 }
      });
      worksheet.getCell(`A${currentRow}`).value = text;
      worksheet.getRow(currentRow).height = calculatedHeight;
      currentRow++;
    };

    // 1. Attendees Matrix (2-Column Subtable)
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 4, {
      font: { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } },
      fill: SECTION_FILL,
      alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
    });
    worksheet.getCell(`A${currentRow}`).value = 'I. DAFTAR HADIR (ATTENDEES MATRIX)';
    worksheet.getRow(currentRow).height = 24;
    currentRow++;

    // Subheaders for Attendees Matrix
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 2, {
      font: { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FF1E3A8A' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    });
    worksheet.getCell(`A${currentRow}`).value = 'Tim Internal PT Jawa Satu Power (JSP)';

    worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 4, {
      font: { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FF1E3A8A' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    });
    // Fix cell C styling
    applyCellStyle(worksheet.getCell(`C${currentRow}`), {
      font: { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FF1E3A8A' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    });
    worksheet.getCell(`C${currentRow}`).value = 'Peserta Eksternal / Stakeholders';
    worksheet.getRow(currentRow).height = 22;
    currentRow++;

    // Content for Attendees Matrix
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 2, {
      font: { name: 'Times New Roman', size: 10, color: { argb: 'FF1F2937' } },
      alignment: { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 }
    });
    const internalList = picNames !== '-'
      ? picNames.split(', ').map((p: string) => `• ${p}`).join('\n')
      : '• Tim Internal JSP';
    worksheet.getCell(`A${currentRow}`).value = internalList;

    worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 4, {
      font: { name: 'Times New Roman', size: 10, color: { argb: 'FF1F2937' } },
      alignment: { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 }
    });
    applyCellStyle(worksheet.getCell(`C${currentRow}`), {
      font: { name: 'Times New Roman', size: 10, color: { argb: 'FF1F2937' } },
      alignment: { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 }
    });

    let externalAttendees = activity.institution_group || '';
    let extListText = '-';
    if (externalAttendees) {
      const extLines = externalAttendees.split('\n').map((l: string) => l.trim()).filter(Boolean);
      if (extLines.length > 1) {
        extListText = extLines.map((l: string, idx: number) => `${idx + 1}. ${l.replace(/^[-*•\d.]+\s*/, '')}`).join('\n');
      } else {
        extListText = `1. ${externalAttendees.replace(/^[-*•\d.]+\s*/, '')}`;
      }
    }
    worksheet.getCell(`C${currentRow}`).value = extListText;

    const maxAttLines = Math.max(internalList.split('\n').length, extListText.split('\n').length);
    worksheet.getRow(currentRow).height = Math.max(45, maxAttLines * 20);
    currentRow++;

    // 2. Keterangan Pertemuan
    addSectionBlock('II. RINGKASAN & AGENDA PERTEMUAN', activity.keterangan || activity.description_result || '-', 50);

    // 3. Hasil Pertemuan
    addSectionBlock('III. POIN PEMBAHASAN & HASIL PERTEMUAN', activity.hasil || activity.description_result || '-', 90);

    // 4. Kesimpulan
    addSectionBlock('IV. KESIMPULAN (EXECUTIVE SUMMARY)', activity.kesimpulan || '-', 50);

    // 5. Next Plan
    addSectionBlock('V. RENCANA TINDAK LANJUT (NEXT PLAN / ACTION ITEMS)', activity.next_plan || '-', 50);

    // 6. Supporting Documents / Photo Documentation Frame
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 4, {
      font: { name: 'Times New Roman', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } },
      fill: SECTION_FILL,
      alignment: { vertical: 'middle', horizontal: 'left', indent: 1 }
    });
    worksheet.getCell(`A${currentRow}`).value = 'VI. LAMPIRAN DOKUMEN & DOKUMENTASI FOTO KEGIATAN';
    worksheet.getRow(currentRow).height = 24;
    currentRow++;

    // Photo Box Canvas Rows. Photos are read from MySQL, never from a client
    // supplied path or URL. Unsupported legacy formats are intentionally not
    // silently treated as links; the upload boundary accepts JPEG/PNG only.
    const photos = getActivityPhotos(activity);

    if (photos.length === 0 || !workbook) {
      const photoCanvasRow = currentRow;
      worksheet.mergeCells(`A${photoCanvasRow}:D${photoCanvasRow}`);
      applyMergedRowStyles(worksheet, photoCanvasRow, 4, {
        font: { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF64748B' } },
        fill: KEY_FILL,
        alignment: { vertical: 'middle', horizontal: 'center', wrapText: true }
      });
      worksheet.getCell(`A${photoCanvasRow}`).value = '[ Area Dokumentasi Foto / Lampiran Kegiatan ]\n(Foto dokumentasi pertemuan / kegiatan lapangan dapat dilampirkan di sini)';
      worksheet.getRow(photoCanvasRow).height = 180;
      currentRow++;
    } else if (photos.length === 1) {
      const photoCanvasRow = currentRow;
      worksheet.mergeCells(`A${photoCanvasRow}:D${photoCanvasRow}`);
      applyMergedRowStyles(worksheet, photoCanvasRow, 4, {
        fill: KEY_FILL,
        alignment: { vertical: 'middle', horizontal: 'center' }
      });

      const MAX_CONTAINER_WIDTH = 620;
      const MAX_CONTAINER_HEIGHT = 380;
      const dimensions = addExcelPhoto(
        worksheet,
        workbook,
        photos[0]!,
        { col: 0.15, row: photoCanvasRow - 1 + 0.08 },
        MAX_CONTAINER_WIDTH,
        MAX_CONTAINER_HEIGHT
      );
      const computedPhotoRowHeight = dimensions
        ? Math.max(140, Math.round(dimensions.height * 0.75) + 20)
        : 180;
      worksheet.getCell(`A${photoCanvasRow}`).value = '';
      worksheet.getRow(photoCanvasRow).height = computedPhotoRowHeight;
      currentRow++;
    } else {
      // 2 or more photos: Render in pairs (2 photos per row grid)
      for (let i = 0; i < photos.length; i += 2) {
        const photoCanvasRow = currentRow;
        worksheet.mergeCells(`A${photoCanvasRow}:D${photoCanvasRow}`);
        applyMergedRowStyles(worksheet, photoCanvasRow, 4, {
          fill: KEY_FILL,
          alignment: { vertical: 'middle', horizontal: 'center' }
        });
        worksheet.getCell(`A${photoCanvasRow}`).value = '';

        const photo1 = photos[i];
        const photo2 = photos[i + 1];

        let maxTargetHeight = 120;

        // Image 1 (Left / Cols A-B)
        if (photo1) {
          const dimensions1 = addExcelPhoto(
            worksheet,
            workbook,
            photo1,
            { col: photo2 ? 0.15 : 0.8, row: photoCanvasRow - 1 + 0.08 },
            photo2 ? 300 : 500,
            230
          );
          if (dimensions1) maxTargetHeight = Math.max(maxTargetHeight, dimensions1.height);
        }

        // Image 2 (Right / Cols C-D)
        if (photo2) {
          const dimensions2 = addExcelPhoto(
            worksheet,
            workbook,
            photo2,
            { col: 2.15, row: photoCanvasRow - 1 + 0.08 },
            300,
            230
          );
          if (dimensions2) maxTargetHeight = Math.max(maxTargetHeight, dimensions2.height);
        }

        worksheet.getRow(photoCanvasRow).height = Math.max(130, Math.round(maxTargetHeight * 0.75) + 20);
        currentRow++;
      }
    }

    // Preserve the existing document row in the template, but it is now a
    // photo summary rather than a legacy document-link field.
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 4, {
      font: { name: 'Times New Roman', size: 10, color: { argb: 'FF1F2937' } },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 }
    });
    const docCell = worksheet.getCell(`A${currentRow}`);
    if (photos.length > 0) {
      docCell.value = `Foto dokumentasi tersimpan di CRMS: ${photos.length} file`;
      docCell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
      worksheet.getRow(currentRow).height = 26;
    } else {
      docCell.value = 'Foto dokumentasi: -';
      docCell.font = { name: 'Times New Roman', size: 10, color: { argb: 'FF64748B' } };
      worksheet.getRow(currentRow).height = 26;
    }
    currentRow++;

    // 7. Lembar Pengesahan / Formal Sign-Off
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 2, {
      font: { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FF334155' } },
      fill: KEY_FILL,
      alignment: { vertical: 'middle', horizontal: 'center' }
    });
    worksheet.getCell(`A${currentRow}`).value = 'Dibuat Oleh,';

    worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 4, {
      font: { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FF334155' } },
      fill: KEY_FILL,
      alignment: { vertical: 'middle', horizontal: 'center' }
    });
    applyCellStyle(worksheet.getCell(`C${currentRow}`), {
      font: { name: 'Times New Roman', size: 9.5, bold: true, color: { argb: 'FF334155' } },
      fill: KEY_FILL,
      alignment: { vertical: 'middle', horizontal: 'center' }
    });
    worksheet.getCell(`C${currentRow}`).value = 'Diketahui / Disetujui Oleh,';
    worksheet.getRow(currentRow).height = 22;
    currentRow++;

    // Signature Space Row
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 2, {});
    worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 4, {});
    worksheet.getRow(currentRow).height = 55;
    currentRow++;

    // Signee Names Row
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 2, {
      font: { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0F172A' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    });
    const creatorName = picNames !== '-' ? picNames : 'Tim CRS / External Affairs';
    worksheet.getCell(`A${currentRow}`).value = `( ${creatorName} )`;

    worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
    applyMergedRowStyles(worksheet, currentRow, 4, {
      font: { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0F172A' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    });
    applyCellStyle(worksheet.getCell(`C${currentRow}`), {
      font: { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF0F172A' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    });
    worksheet.getCell(`C${currentRow}`).value = '( External Affairs & CSR Manager )';
    worksheet.getRow(currentRow).height = 24;
  }

  /**
   * Generates a single MOM Excel buffer for a given daily activity.
   */
  public static async generateSingleMomBuffer(id: bigint | string | number): Promise<{ buffer: Buffer; fileName: string; activity: any }> {
    const activity = await prisma.daily_activities.findUnique({
      where: { id: BigInt(id) },
      include: {
        daily_activity_pics: { include: { pic: true } },
        photos: { where: { is_deleted: false }, orderBy: { sort_order: 'asc' } },
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

    DailyActivityMomExportService.populateMomWorksheet(worksheet, activity, workbook);

    const safeTitle = (activity.activity || 'Activity')
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .substring(0, 40);
    const dateStr = formatIndonesianDate(activity.activity_date).replace(/\s+/g, '_');
    const fileName = `MOM_${safeTitle}_${dateStr}.xlsx`;

    const rawBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(rawBuffer);

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
        { address: { contains: q } },
        { focus: { contains: q } },
        { keterangan: { contains: q } },
        { hasil: { contains: q } },
        { kesimpulan: { contains: q } },
        { next_plan: { contains: q } },
        { daily_activity_pics: { some: { pic: { name: { contains: q } } } } },
        { category: { name: { contains: q } } },
        { sub_category: { name: { contains: q } } }
      ];
    }

    const activities = await prisma.daily_activities.findMany({
      where,
      include: {
        daily_activity_pics: { include: { pic: true } },
        photos: { where: { is_deleted: false }, orderBy: { sort_order: 'asc' } },
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
      { header: 'Supporting Documents / Photos', key: 'photos', width: 36 }
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
        photos: getActivityPhotos(act).length > 0
          ? `${getActivityPhotos(act).length} foto dokumentasi`
          : '-'
      });
      const photos = getActivityPhotos(act);
      row.height = photos.length > 0 ? Math.max(130, photos.length * 125) : 24;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Times New Roman', size: 10, color: { argb: 'FF1F2937' } };
        cell.border = THIN_BORDER;
        cell.alignment = {
          vertical: 'top',
          horizontal: colNum === 1 ? 'center' : (colNum === 10 ? 'right' : 'left'),
          wrapText: true
        };
        if (colNum === 17 && photos.length > 0) {
          cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
        }
      });
      if (photos.length > 0) {
        photos.forEach((photo, photoIndex) => {
          const rowFraction = photoIndex / photos.length;
          addExcelPhoto(rekapSheet, workbook, photo, {
            col: 16.08,
            row: row.number - 1 + rowFraction + 0.02
          }, 240, 115);
        });
      }
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
      DailyActivityMomExportService.populateMomWorksheet(momSheet, act, workbook);
    });

    const rawBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(rawBuffer);
    const yearSuffix = options.year ? String(options.year) : 'All';
    const fileName = `Daily_Activities_MOM_Workbook_${yearSuffix}.xlsx`;

    return { buffer, fileName, count: activities.length };
  }
}
