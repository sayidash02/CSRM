import fs from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { AppError } from '../../lib/errorHandler';
import { errorFields, logger } from '../../lib/logger';
import { sanitizeImportWorkbookArchive } from './WorkbookArchiveSanitizer';

export type ImportWorkbookPhase = 'preview' | 'confirm' | 'daily';

// Import only needs cells, merged headers, hyperlinks, and (during confirm)
// embedded images. Skipping presentation metadata reduces parse time and also
// avoids ExcelJS expanding unused worksheet validation metadata.
const BASE_IGNORED_WORKSHEET_NODES = [
  'sheetPr',
  'sheetViews',
  'sheetFormatPr',
  'autoFilter',
  'rowBreaks',
  'pageMargins',
  'dataValidations',
  'pageSetup',
  'headerFooter',
  'printOptions',
  'sheetProtection',
  'tableParts',
  'conditionalFormatting',
  'extLst',
];

function ignoredWorksheetNodes(phase: ImportWorkbookPhase): string[] {
  return phase === 'confirm'
    ? [...BASE_IGNORED_WORKSHEET_NODES]
    : [...BASE_IGNORED_WORKSHEET_NODES, 'picture', 'drawing'];
}

function megabytes(bytes: number): number {
  return Number((bytes / 1024 / 1024).toFixed(1));
}

export async function readImportWorkbookBuffer(
  source: Buffer<ArrayBufferLike>,
  phase: ImportWorkbookPhase,
): Promise<ExcelJS.Workbook> {
  const startedAt = process.hrtime.bigint();

  try {
    const sanitized = await sanitizeImportWorkbookArchive(source);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(sanitized.buffer as any, {
      ignoreNodes: ignoredWorksheetNodes(phase),
    });

    const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
    const memory = process.memoryUsage();
    logger.info('import_workbook_loaded', {
      phase,
      sourceSizeBytes: source.length,
      removedDefinedNameCount: sanitized.removedDefinedNameCount,
      worksheetCount: workbook.worksheets.length,
      durationMs: Number((Number(elapsedNanoseconds) / 1_000_000).toFixed(2)),
      heapUsedMb: megabytes(memory.heapUsed),
      rssMb: megabytes(memory.rss),
    });

    return workbook;
  } catch (error) {
    logger.warn('import_workbook_rejected', {
      phase,
      sourceSizeBytes: source.length,
      ...errorFields(error),
    });
    throw new AppError(
      'FILE_UPLOAD_ERROR',
      400,
      'File Excel tidak valid, rusak, atau terlalu kompleks untuk diimpor',
    );
  }
}

export async function readImportWorkbookFile(
  filePath: string,
  phase: ImportWorkbookPhase,
): Promise<ExcelJS.Workbook> {
  return readImportWorkbookBuffer(await fs.readFile(filePath), phase);
}
