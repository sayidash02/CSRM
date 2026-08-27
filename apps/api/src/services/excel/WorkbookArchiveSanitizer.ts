import path from 'node:path';

type ZipEntry = {
  dir: boolean;
  _data?: { uncompressedSize?: number };
  async(type: 'string'): Promise<string>;
};

type ZipArchive = {
  files: Record<string, ZipEntry>;
  file(name: string): ZipEntry | null;
  file(name: string, data: string): ZipArchive;
  generateAsync(options: {
    type: 'nodebuffer';
    compression: 'DEFLATE';
    compressionOptions: { level: number };
  }): Promise<Buffer>;
};

type JSZipConstructor = {
  loadAsync(data: Buffer<ArrayBufferLike>): Promise<ZipArchive>;
};

export interface SanitizedImportWorkbookArchive {
  buffer: Buffer<ArrayBufferLike>;
  removedDefinedNameCount: number;
}

const MAX_ARCHIVE_ENTRY_COUNT = 4096;
const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 500 * 1024 * 1024;
const MAX_WORKBOOK_XML_BYTES = 20 * 1024 * 1024;

const DEFINED_NAME_PATTERN = /<(?:[A-Za-z_][\w.-]*:)?definedName\b/gi;
const DEFINED_NAMES_BLOCK_PATTERN = /<(?:[A-Za-z_][\w.-]*:)?definedNames\b[^>]*>[\s\S]*?<\/(?:[A-Za-z_][\w.-]*:)?definedNames\s*>/gi;
const EMPTY_DEFINED_NAMES_PATTERN = /<(?:[A-Za-z_][\w.-]*:)?definedNames\b[^>]*\/>/gi;

function getJSZip(): JSZipConstructor {
  // ExcelJS owns the compatible JSZip version. Resolve it from that package
  // so this stays reliable with pnpm's strict node_modules layout.
  const jsZipPath = require.resolve('jszip', {
    paths: [path.dirname(require.resolve('exceljs'))],
  });
  return require(jsZipPath) as JSZipConstructor;
}

function assertArchiveWithinImportLimits(zip: ZipArchive): void {
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > MAX_ARCHIVE_ENTRY_COUNT) {
    throw new Error('XLSX archive contains too many entries');
  }

  let totalUncompressedBytes = 0;
  for (const entry of entries) {
    const size = entry._data?.uncompressedSize;
    if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) {
      throw new Error('XLSX archive size metadata is invalid');
    }
    totalUncompressedBytes += size;
  }

  if (totalUncompressedBytes > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
    throw new Error('XLSX archive expands beyond the import limit');
  }
}

export function stripDefinedNamesFromWorkbookXml(workbookXml: string): {
  xml: string;
  removedDefinedNameCount: number;
} {
  const removedDefinedNameCount = (workbookXml.match(DEFINED_NAME_PATTERN) || []).length;
  return {
    xml: workbookXml
      .replace(DEFINED_NAMES_BLOCK_PATTERN, '')
      .replace(EMPTY_DEFINED_NAMES_PATTERN, ''),
    removedDefinedNameCount,
  };
}

export async function sanitizeImportWorkbookArchive(
  source: Buffer<ArrayBufferLike>,
): Promise<SanitizedImportWorkbookArchive> {
  const JSZip = getJSZip();
  const zip = await JSZip.loadAsync(source);
  assertArchiveWithinImportLimits(zip);

  const workbookEntry = zip.file('xl/workbook.xml');
  if (!workbookEntry) {
    throw new Error('XLSX workbook metadata is missing');
  }

  const workbookXmlSize = workbookEntry._data?.uncompressedSize;
  if (typeof workbookXmlSize !== 'number' || !Number.isFinite(workbookXmlSize)) {
    throw new Error('XLSX workbook metadata size is invalid');
  }
  if (workbookXmlSize > MAX_WORKBOOK_XML_BYTES) {
    throw new Error('XLSX workbook metadata exceeds the import limit');
  }

  const workbookXml = await workbookEntry.async('string');
  const sanitized = stripDefinedNamesFromWorkbookXml(workbookXml);
  if (sanitized.removedDefinedNameCount === 0) {
    return { buffer: source, removedDefinedNameCount: 0 };
  }

  zip.file('xl/workbook.xml', sanitized.xml);
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { buffer, removedDefinedNameCount: sanitized.removedDefinedNameCount };
}
