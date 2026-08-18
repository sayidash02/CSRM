import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { sanitizeWorkbookForTemplate } from '../src/services/excel/WorkbookTemplateService';

const projectRoot = path.resolve(__dirname, '../../..');
const sourceArgument = process.argv[2]?.trim();
const outputArgument = process.argv[3]?.trim();
const sourcePath = path.resolve(sourceArgument || path.join(projectRoot, 'CSR(Isi).xlsx'));
const outputPath = path.resolve(
  outputArgument || path.join(projectRoot, 'apps/api/templates/CRS-operational-template.xlsx'),
);

async function removeDefinedNamesFromArchive(sourcePath: string): Promise<Buffer> {
  // JSZip is already a dependency of ExcelJS. Resolve it relative to the
  // ExcelJS package so this utility works with pnpm's strict node_modules
  // layout without adding a second runtime dependency.
  const jsZipPath = require.resolve('jszip', {
    paths: [path.dirname(require.resolve('exceljs'))],
  });
  const JSZip: any = require(jsZipPath);

  const zip = await JSZip.loadAsync(await fs.readFile(sourcePath));
  const workbookEntry = zip.file('xl/workbook.xml');
  if (workbookEntry) {
    const workbookXml = await workbookEntry.async('string');
    // Defined names are not part of the export contract. Removing the whole
    // block prevents ExcelJS from expanding legacy external ranges during the
    // subsequent load (some point at row 1,048,576).
    zip.file('xl/workbook.xml', workbookXml.replace(/<definedNames>[\s\S]*?<\/definedNames>/, ''));
  }

  return zip.generateAsync({ type: 'nodebuffer' });
}

async function main(): Promise<void> {
  await fs.access(sourcePath);

  const workbook = new ExcelJS.Workbook();
  const sourceBuffer = (await removeDefinedNamesFromArchive(sourcePath)) as any;
  await workbook.xlsx.load(sourceBuffer);
  sanitizeWorkbookForTemplate(workbook);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Sanitized workbook template written to ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error('Unable to create sanitized workbook template', error);
  process.exitCode = 1;
});
