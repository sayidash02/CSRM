import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { sanitizeWorkbookForTemplate } from '../../src/services/excel/WorkbookTemplateService';

describe('sanitizeWorkbookForTemplate', () => {
  it('removes operational data and hidden helper sheets while adding an empty LRP sheet', () => {
    const workbook = new ExcelJS.Workbook();
    const daily = workbook.addWorksheet('Daily Activities 2026');
    daily.addRow(['No', 'Tanggal', 'Kegiatan', 'Instansi/kelompok']);
    daily.addRow([1, new Date('2026-01-01'), 'Data lama', 'Pihak lama']);
    daily.getCell('C2').value = {
      text: 'Data lama',
      hyperlink: 'https://contoso.sharepoint.com/old-document',
    };

    const raw = workbook.addWorksheet('Raw', { state: 'hidden' });
    raw.addRow(['Data lama', 'https://contoso.sharepoint.com/raw-document']);
    workbook.addWorksheet('Master (jangan dihapus)');

    sanitizeWorkbookForTemplate(workbook);

    expect(workbook.getWorksheet('Raw')).toBeUndefined();
    expect(workbook.getWorksheet('Master (jangan dihapus)')).toBeDefined();
    expect(daily.getCell('A2').value).toBeNull();
    expect(daily.getCell('C2').value).toBeNull();
    expect(daily.getCell('C2').hyperlink).toBeUndefined();

    const lrp = workbook.getWorksheet('LRP');
    expect(lrp).toBeDefined();
    expect(lrp!.getRow(1).values).toEqual([, 'No', 'Program', 'SharePoint Link']);
    expect(lrp!.getRow(2).values).toEqual([]);
  });

  it('does not leave SharePoint URLs in any cell value', () => {
    const workbook = new ExcelJS.Workbook();
    const proposal = workbook.addWorksheet('Proposal 2026');
    proposal.addRow(['NO', 'NO REGISTRASI', 'PROPOSAL']);
    proposal.addRow([]);
    proposal.addRow([1, '001/JSP/CRS/2026', 'https://contoso.sharepoint.com/proposal']);

    sanitizeWorkbookForTemplate(workbook);

    for (const worksheet of workbook.worksheets) {
      worksheet.eachRow((row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          expect(JSON.stringify(cell.value ?? '')).not.toContain('sharepoint.com');
        });
      });
    }
  });

  it('removes legacy defined names before the template is exported', () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Daily Activities 2026');
    workbook.definedNames.model = [{
      name: 'LegacyExternalRange',
      ranges: ["'[1]2022'!$D$7:$D$8"],
    }];

    sanitizeWorkbookForTemplate(workbook);

    expect(workbook.definedNames.model).toEqual([]);
  });

  it('keeps legacy defined names out of the checked-in template archive', async () => {
    const templatePath = path.resolve(__dirname, '../../templates/CRS-operational-template.xlsx');
    const jsZipPath = require.resolve('jszip', {
      paths: [path.dirname(require.resolve('exceljs'))],
    });
    const JSZip: any = require(jsZipPath);
    const zip = await JSZip.loadAsync(await fs.readFile(templatePath));
    const workbookEntry = zip.file('xl/workbook.xml');

    expect(workbookEntry).not.toBeNull();
    const workbookXml = await workbookEntry.async('string');
    expect(workbookXml).not.toContain('<definedNames>');
  });
});
