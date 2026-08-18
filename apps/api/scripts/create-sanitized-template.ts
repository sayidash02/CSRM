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

async function main(): Promise<void> {
  await fs.access(sourcePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(sourcePath);
  sanitizeWorkbookForTemplate(workbook);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Sanitized workbook template written to ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error('Unable to create sanitized workbook template', error);
  process.exitCode = 1;
});
