import path from 'node:path';
import ExcelJS from 'exceljs';
import { readImportWorkbookBuffer } from '../../src/services/excel/ImportWorkbookReader';
import { sanitizeImportWorkbookArchive } from '../../src/services/excel/WorkbookArchiveSanitizer';

type ZipEntry = {
  async(type: 'string'): Promise<string>;
};

type ZipArchive = {
  file(name: string): ZipEntry | null;
  file(name: string, data: string): ZipArchive;
  generateAsync(options: { type: 'nodebuffer' }): Promise<Buffer>;
};

type JSZipConstructor = {
  loadAsync(data: Buffer): Promise<ZipArchive>;
};

function getJSZip(): JSZipConstructor {
  const jsZipPath = require.resolve('jszip', {
    paths: [path.dirname(require.resolve('exceljs'))],
  });
  return require(jsZipPath) as JSZipConstructor;
}

async function addLegacyDefinedNames(source: Buffer): Promise<Buffer> {
  const JSZip = getJSZip();
  const zip = await JSZip.loadAsync(source);
  const workbookEntry = zip.file('xl/workbook.xml');
  if (!workbookEntry) throw new Error('Test workbook metadata is missing');

  const workbookXml = await workbookEntry.async('string');
  const definedNames = [
    '<definedNames>',
    '<definedName name="Count_2022">\'[1]2022\'!$D$7:$D$1048572</definedName>',
    '<definedName name="Count_2021">\'[1]2021\'!$D$7:$D$1048576</definedName>',
    '</definedNames>',
  ].join('');

  zip.file('xl/workbook.xml', workbookXml.replace('</sheets>', `</sheets>${definedNames}`));
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function makeUnsafeWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daily Activities 2026');
  worksheet.addRow(['No', 'Tanggal', 'Kegiatan', 'Dokumen']);
  worksheet.addRow([
    1,
    new Date('2026-08-27T00:00:00.000Z'),
    'Kegiatan tetap terbaca',
    { text: 'Dokumen', hyperlink: 'https://example.com/document.pdf' },
  ]);

  const imageId = workbook.addImage({
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    extension: 'png',
  });
  worksheet.addImage(imageId, {
    tl: { col: 4, row: 1 },
    ext: { width: 16, height: 16 },
  });

  return addLegacyDefinedNames(Buffer.from(await workbook.xlsx.writeBuffer()));
}

describe('ImportWorkbookReader', () => {
  it('removes legacy defined names that span millions of external cells', async () => {
    const unsafeWorkbook = await makeUnsafeWorkbook();

    const sanitized = await sanitizeImportWorkbookArchive(unsafeWorkbook);

    expect(sanitized.removedDefinedNameCount).toBe(2);
    const zip = await getJSZip().loadAsync(sanitized.buffer);
    const workbookEntry = zip.file('xl/workbook.xml');
    expect(workbookEntry).not.toBeNull();
    await expect(workbookEntry!.async('string')).resolves.not.toContain('<definedNames>');
  });

  it('loads cell values and hyperlinks without materializing legacy defined names', async () => {
    const workbook = await readImportWorkbookBuffer(await makeUnsafeWorkbook(), 'preview');
    const worksheet = workbook.getWorksheet('Daily Activities 2026');

    expect(worksheet?.getCell('C2').value).toBe('Kegiatan tetap terbaca');
    expect(worksheet?.getCell('D2').hyperlink).toBe('https://example.com/document.pdf');
    expect(workbook.definedNames.model).toEqual([]);
  });

  it('retains embedded images for the confirm phase', async () => {
    const workbook = await readImportWorkbookBuffer(await makeUnsafeWorkbook(), 'confirm');
    const worksheet = workbook.getWorksheet('Daily Activities 2026');

    expect(worksheet?.getImages()).toHaveLength(1);
    expect(workbook.getImage(0)?.buffer).toBeDefined();
  });

  it('rejects a non-XLSX payload as a safe upload error', async () => {
    await expect(readImportWorkbookBuffer(Buffer.from('not a ZIP archive'), 'preview'))
      .rejects
      .toMatchObject({
        code: 'FILE_UPLOAD_ERROR',
        statusCode: 400,
      });
  });
});
