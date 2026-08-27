import ExcelJS from 'exceljs';
import { inflateRawSync } from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import { DailyActivityMomExportService } from '../../src/services/excel/DailyActivityMomExportService';
import { buildMomDocumentModel } from '../../src/services/mom/MomDocumentModel';
import { MomDocumentExportService } from '../../src/services/mom/MomDocumentExportService';
import {
  goldenMomActivity,
  goldenMomExpected,
  goldenPhotoPng,
  goldenPhotoPngSecond,
} from '../fixtures/mom-golden-fixture';

type ZipEntry = { name: string; method: number; compressedSize: number; localOffset: number };

const zipEntries = (buffer: Buffer): ZipEntry[] => {
  const entries: ZipEntry[] = [];
  const signature = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
  for (let offset = buffer.indexOf(signature); offset >= 0; offset = buffer.indexOf(signature, offset + 1)) {
    const nameLength = buffer.readUInt16LE(offset + 28);
    entries.push({
      name: buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'),
      method: buffer.readUInt16LE(offset + 10),
      compressedSize: buffer.readUInt32LE(offset + 20),
      localOffset: buffer.readUInt32LE(offset + 42),
    });
  }
  return entries;
};

const unzipEntry = (buffer: Buffer, entry: ZipEntry): Buffer => {
  const nameLength = buffer.readUInt16LE(entry.localOffset + 26);
  const extraLength = buffer.readUInt16LE(entry.localOffset + 28);
  const dataStart = entry.localOffset + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);
  return entry.method === 0 ? compressed : inflateRawSync(compressed);
};

const createGoldenWorkbook = async (): Promise<{ buffer: Buffer; worksheet: ExcelJS.Worksheet }> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daily Notes', {
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  DailyActivityMomExportService.populateMomWorksheet(worksheet, goldenMomActivity, workbook);
  return { buffer: Buffer.from(await workbook.xlsx.writeBuffer()), worksheet };
};

describe('MOM golden fixture contract', () => {
  it('keeps one shared field/photo model for all output formats', () => {
    const model = buildMomDocumentModel(goldenMomActivity);

    expect(model.docId).toBe(goldenMomExpected.docId);
    expect(model.title).toBe(goldenMomExpected.title);
    expect(model.dateLabel).toBe(goldenMomExpected.dateLabel);
    expect(model.sections.map((section) => section.title)).toEqual(goldenMomExpected.sectionTitles);
    expect(model.photos).toHaveLength(goldenMomExpected.photoCount);
    expect(model.photos.map((photo) => photo.data)).toEqual([goldenPhotoPng, goldenPhotoPngSecond]);
  });

  it('renders the approved Excel layout with both fixture photos', async () => {
    const { buffer, worksheet } = await createGoldenWorkbook();
    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer as any);
    const loadedSheet = reloaded.getWorksheet('Daily Notes');
    expect(loadedSheet).toBeDefined();

    const text = loadedSheet!.getSheetValues()
      .flat()
      .filter((value): value is string => typeof value === 'string')
      .join('\n');
    expect(text).toContain(goldenMomExpected.title);
    expect(text).toContain('VI. LAMPIRAN DOKUMEN & DOKUMENTASI FOTO KEGIATAN');
    expect(text).toContain(`Foto dokumentasi tersimpan di CSRM: ${goldenMomExpected.photoCount} file`);
    expect(text).not.toContain('Diketahui / Disetujui Oleh,');

    const images = typeof (worksheet as any).getImages === 'function'
      ? (worksheet as any).getImages()
      : (worksheet as any)._media;
    expect(images).toHaveLength(goldenMomExpected.photoCount);
  });

  it('embeds the same photo count in DOCX and keeps the document contract', async () => {
    const { buffer } = await MomDocumentExportService.renderSingleDocxBuffer(goldenMomActivity);
    const entries = zipEntries(buffer);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(entries.map((entry) => entry.name)).toContain('word/document.xml');
    const media = entries.filter((entry) => entry.name.startsWith('word/media/') && !entry.name.endsWith('/'));
    expect(media).toHaveLength(goldenMomExpected.photoCount);
    expect(media.map((entry) => unzipEntry(buffer, entry))).toEqual([goldenPhotoPng, goldenPhotoPngSecond]);
  });

  it('embeds the same photo count in PDF and keeps the document contract', async () => {
    const { buffer } = await MomDocumentExportService.renderSinglePdfBuffer(goldenMomActivity);
    const pdf = await PDFDocument.load(buffer);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.getPages().length).toBeGreaterThanOrEqual(1);
    expect((pdf as any).context.indirectObjects.size).toBeGreaterThan(0);
    expect((buffer.toString('latin1').match(/\/Subtype \/Image/g) ?? []).length)
      .toBeGreaterThanOrEqual(goldenMomExpected.photoCount);
  });
});
