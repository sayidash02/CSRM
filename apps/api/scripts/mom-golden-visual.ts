import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ExcelJS from 'exceljs';
import { DailyActivityMomExportService } from '../src/services/excel/DailyActivityMomExportService';
import { MomDocumentExportService } from '../src/services/mom/MomDocumentExportService';
import { goldenMomActivity } from '../tests/fixtures/mom-golden-fixture';

type Command = { command: string; args: string[] };

const repoRoot = path.resolve(__dirname, '../../..');
const outputRoot = process.env.MOM_GOLDEN_OUTPUT_DIR || path.join(os.tmpdir(), 'crms-mom-golden');
const runDirectory = path.join(outputRoot, `run-${Date.now()}`);

const existing = (candidates: string[]): string | null => candidates.find((candidate) => fs.existsSync(candidate)) ?? null;

const findExecutable = (name: string): string | null => {
  const configured = name === 'python' ? process.env.CRMS_PYTHON : process.env.LIBREOFFICE_BIN;
  if (configured && fs.existsSync(configured)) return configured;
  const lookup = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(lookup, [name], { encoding: 'utf8' });
  if (result.status === 0) return result.stdout.trim().split(/\r?\n/)[0] || name;
  return null;
};

const run = (command: Command, cwd = repoRoot): void => {
  const result = spawnSync(command.command, command.args, { cwd, encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw new Error(`Command could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Command failed (${result.status}): ${command.command} ${command.args.join(' ')}`);
};

const findPdf = async (directory: string, preferredStem: string): Promise<string> => {
  const files = await fsPromises.readdir(directory);
  const pdf = files.find((file) => file.toLowerCase().endsWith('.pdf') && file.toLowerCase().startsWith(preferredStem.toLowerCase()));
  if (!pdf) throw new Error(`No PDF was produced in ${directory}`);
  return path.join(directory, pdf);
};

const rasterize = (pdfPath: string, outputDirectory: string, stem: string, pdftoppm: string | null, magick: string | null): void => {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const prefix = path.join(outputDirectory, stem);
  if (pdftoppm) {
    run({ command: pdftoppm, args: ['-png', '-r', '144', pdfPath, prefix] });
    return;
  }
  if (magick) {
    run({ command: magick, args: ['-density', '144', pdfPath, `${prefix}-%03d.png`] });
    return;
  }
  throw new Error('No PDF rasterizer found (install pdftoppm or ImageMagick).');
};

const renderOfficePdf = (office: string, inputPath: string, outputDirectory: string): string => {
  fs.mkdirSync(outputDirectory, { recursive: true });
  run({ command: office, args: ['--headless', '--convert-to', 'pdf', '--outdir', outputDirectory, inputPath] });
  return path.join(outputDirectory, `${path.basename(inputPath, path.extname(inputPath))}.pdf`);
};

const renderDocxPdf = (office: string, python: string | null, docxPath: string, outputDirectory: string): Promise<string> => {
  const renderScript = existing([
    process.env.DOCX_RENDER_SCRIPT || '',
    path.join(process.env.USERPROFILE || '', '.codex', 'plugins', 'cache', 'openai-primary-runtime', 'documents', '26.819.11345', 'skills', 'documents', 'render_docx.py'),
    path.join(process.env.HOME || '', '.codex', 'plugins', 'cache', 'openai-primary-runtime', 'documents', '26.819.11345', 'skills', 'documents', 'render_docx.py'),
  ].filter(Boolean));

  if (renderScript && python) {
    run({ command: python, args: [renderScript, docxPath, '--output_dir', outputDirectory, '--emit_pdf'] });
  } else {
    renderOfficePdf(office, docxPath, outputDirectory);
  }
  return findPdf(outputDirectory, path.basename(docxPath, '.docx'));
};

const compare = (python: string, goldenDirectory: string, candidateDirectory: string, diffDirectory: string): void => {
  run({
    command: python,
    args: [
      path.join(repoRoot, 'scripts', 'mom-visual-compare.py'),
      '--golden-dir', goldenDirectory,
      '--candidate-dir', candidateDirectory,
      '--diff-dir', diffDirectory,
    ],
  });
};

async function main(): Promise<void> {
  await fsPromises.mkdir(runDirectory, { recursive: true });
  const xlsxPath = path.join(runDirectory, 'golden-mom.xlsx');
  const docxPath = path.join(runDirectory, 'golden-mom.docx');
  const pdfPath = path.join(runDirectory, 'golden-mom.pdf');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daily Notes', {
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  DailyActivityMomExportService.populateMomWorksheet(worksheet, goldenMomActivity, workbook);
  await fsPromises.writeFile(xlsxPath, Buffer.from(await workbook.xlsx.writeBuffer()));

  const docx = await MomDocumentExportService.renderSingleDocxBuffer(goldenMomActivity);
  await fsPromises.writeFile(docxPath, docx.buffer);
  const pdf = await MomDocumentExportService.renderSinglePdfBuffer(goldenMomActivity);
  await fsPromises.writeFile(pdfPath, pdf.buffer);

  const office = findExecutable('soffice') || findExecutable('libreoffice');
  const requireRenderer = process.argv.includes('--require-renderer') || process.env.MOM_GOLDEN_REQUIRE_RENDERER === 'true';
  const artifactSummary = { xlsx: xlsxPath, docx: docxPath, pdf: pdfPath };
  if (!office) {
    const result = { status: 'SKIPPED', reason: 'LibreOffice/soffice not found; visual render is a workstation/server UAT gate.', artifacts: artifactSummary };
    console.log(JSON.stringify(result, null, 2));
    if (requireRenderer) process.exitCode = 2;
    return;
  }

  const python = findExecutable('python');
  const pdftoppm = findExecutable('pdftoppm');
  const magick = findExecutable('magick');
  if (!python || (!pdftoppm && !magick)) {
    const result = { status: 'SKIPPED', reason: 'Python/PIL and a PDF rasterizer (pdftoppm or ImageMagick) are required for visual comparison.', artifacts: artifactSummary };
    console.log(JSON.stringify(result, null, 2));
    if (requireRenderer) process.exitCode = 2;
    return;
  }

  const renderDirectory = path.join(runDirectory, 'rendered');
  const excelPdf = renderOfficePdf(office, xlsxPath, path.join(renderDirectory, 'excel'));
  const docxPdf = await renderDocxPdf(office, python, docxPath, path.join(renderDirectory, 'docx'));
  const excelPages = path.join(renderDirectory, 'excel-pages');
  const docxPages = path.join(renderDirectory, 'docx-pages');
  const pdfPages = path.join(renderDirectory, 'pdf-pages');
  rasterize(excelPdf, excelPages, 'page', pdftoppm, magick);
  rasterize(docxPdf, docxPages, 'page', pdftoppm, magick);
  rasterize(pdfPath, pdfPages, 'page', pdftoppm, magick);
  compare(python, excelPages, docxPages, path.join(runDirectory, 'diff-docx'));
  compare(python, excelPages, pdfPages, path.join(runDirectory, 'diff-pdf'));
  console.log(JSON.stringify({ status: 'PASS', artifacts: artifactSummary, renderDirectory }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'FAIL', error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
