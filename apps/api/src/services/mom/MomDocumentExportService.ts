import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  ImageRun,
  PageBreak,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from 'docx';
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import prisma from '../../lib/prisma';
import {
  buildMomDocumentModel,
  MomDocumentModel,
  MomPhoto,
  safeFilePart,
} from './MomDocumentModel';

const DOCX_WIDTHS = [2160, 3420, 2160, 3420] as const;
const DOCX_TOTAL_WIDTH = DOCX_WIDTHS.reduce((sum, value) => sum + value, 0);
const PDF_PAGE_WIDTH = 612;
const PDF_PAGE_HEIGHT = 792;
const PDF_MARGIN = 28;
const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2;
const COLUMN_RATIOS = [24, 38, 24, 38];
const COLUMN_RATIO_TOTAL = COLUMN_RATIOS.reduce((sum, value) => sum + value, 0);

const COLORS = {
  navy: '1E3A8A',
  title: 'F1F5F9',
  softBlue: 'DBEAFE',
  paleBlue: 'EFF6FF',
  key: 'F8FAFC',
  border: 'CBD5E1',
  text: '1F2937',
  dark: '0F172A',
  label: '334155',
  muted: '64748B',
  white: 'FFFFFF',
};

const docxBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: COLORS.border,
};

const docxBorders = {
  top: docxBorder,
  bottom: docxBorder,
  left: docxBorder,
  right: docxBorder,
};

type DocxAlign = (typeof AlignmentType)[keyof typeof AlignmentType];

type PdfCell = {
  text: string;
  width: number;
  fill?: string | undefined;
  color?: string | undefined;
  bold?: boolean | undefined;
  italic?: boolean | undefined;
  size?: number | undefined;
  align?: 'left' | 'center' | 'right' | undefined;
  padding?: number | undefined;
};

const docxRun = (
  text: string,
  options: { size?: number; bold?: boolean; italic?: boolean; color?: string } = {},
): TextRun => new TextRun({
  text,
  font: 'Times New Roman',
  size: options.size ?? 20,
  bold: options.bold,
  italics: options.italic,
  color: options.color ?? COLORS.text,
} as any);

const docxParagraph = (
  text: string,
  options: {
    size?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    align?: DocxAlign;
    spacingAfter?: number;
  } = {},
): Paragraph => new Paragraph({
  children: text.split(/\r?\n/).flatMap((line, index, lines) => [
    docxRun(line, options),
    ...(index < lines.length - 1 ? [new TextRun({ break: 1 })] : []),
  ]),
  alignment: options.align ?? AlignmentType.LEFT,
  spacing: { before: 0, after: options.spacingAfter ?? 0, line: 240 },
  keepLines: true,
});

const docxCell = (
  children: readonly (Paragraph | Table)[],
  options: {
    width?: number | undefined;
    columnSpan?: number | undefined;
    fill?: string | undefined;
    verticalAlign?: (typeof VerticalAlignTable)[keyof typeof VerticalAlignTable] | undefined;
    margins?: { top?: number; bottom?: number; left?: number; right?: number } | undefined;
  } = {},
): TableCell => new TableCell({
  children,
  width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
  columnSpan: options.columnSpan,
  shading: options.fill ? { type: ShadingType.CLEAR, fill: options.fill } : undefined,
  verticalAlign: options.verticalAlign ?? VerticalAlignTable.TOP,
  margins: {
    top: options.margins?.top ?? 80,
    bottom: options.margins?.bottom ?? 80,
    left: options.margins?.left ?? 100,
    right: options.margins?.right ?? 100,
  },
  borders: docxBorders,
} as any);

const docxRow = (children: readonly TableCell[], height = 0): TableRow => new TableRow({
  children,
  cantSplit: true,
  height: height > 0 ? { value: height, rule: HeightRule.ATLEAST } : undefined,
} as any);

const docxTable = (rows: readonly TableRow[], widths: readonly number[] = DOCX_WIDTHS): Table => new Table({
  rows,
  width: { size: widths.reduce((sum, value) => sum + value, 0), type: WidthType.DXA },
  columnWidths: widths,
  layout: TableLayoutType.FIXED,
  borders: {
    top: docxBorder,
    bottom: docxBorder,
    left: docxBorder,
    right: docxBorder,
    insideHorizontal: docxBorder,
    insideVertical: docxBorder,
  },
} as any);

const mergedDocxRow = (
  text: string,
  fill: string,
  options: { size?: number; bold?: boolean; italic?: boolean; color?: string; align?: DocxAlign } = {},
  height = 420,
): TableRow => docxRow([
  docxCell([
    docxParagraph(text, {
      size: options.size ?? 20,
      bold: options.bold,
      italic: options.italic,
      color: options.color,
      align: options.align ?? AlignmentType.LEFT,
    } as any),
  ], { width: DOCX_TOTAL_WIDTH, columnSpan: 4, fill, verticalAlign: VerticalAlignTable.CENTER }),
], height);

const imageRun = (photo: MomPhoto, maxWidth: number, maxHeight: number): ImageRun => {
  const scale = Math.min(maxWidth / photo.width, maxHeight / photo.height, 1);
  const width = Math.max(100, Math.round(photo.width * scale));
  const height = Math.max(80, Math.round(photo.height * scale));
  return new ImageRun({
    type: photo.mimeType === 'image/png' ? 'png' : 'jpg',
    data: photo.data,
    transformation: { width, height },
    altText: { title: photo.originalName, description: 'Foto dokumentasi kegiatan', name: photo.originalName },
  });
};

const photoParagraph = (photo: MomPhoto, maxWidth: number, maxHeight: number): Paragraph => new Paragraph({
  children: [imageRun(photo, maxWidth, maxHeight)],
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 0, line: 240 },
});

const renderMomDocxBlocks = (model: MomDocumentModel): Array<Paragraph | Table> => {
  const blocks: Array<Paragraph | Table> = [];

  blocks.push(docxTable([
    docxRow([
      docxCell([docxParagraph('PT JAWA SATU POWER — EXTERNAL AFFAIRS & CSR', { size: 20, bold: true, color: COLORS.white })], { width: DOCX_WIDTHS[0] + DOCX_WIDTHS[1] + DOCX_WIDTHS[2], columnSpan: 3, fill: COLORS.navy, verticalAlign: VerticalAlignTable.CENTER }),
      docxCell([docxParagraph(`DOC ID: ${model.docId}`, { size: 18, bold: true, color: COLORS.white, align: AlignmentType.RIGHT })], { width: DOCX_WIDTHS[3], fill: COLORS.navy, verticalAlign: VerticalAlignTable.CENTER }),
    ], 480),
  ]));
  blocks.push(docxTable([mergedDocxRow('MINUTES OF MEETING & DAILY ACTIVITY REPORT', COLORS.softBlue, { size: 26, bold: true, color: COLORS.navy, align: AlignmentType.CENTER }, 560)]));
  blocks.push(docxTable([mergedDocxRow(`Topik / Daily Title : ${model.title}`, COLORS.title, { size: 22, bold: true, color: COLORS.dark }, 640)]));

  blocks.push(docxTable(model.metadata.map((item) => docxRow([
    docxCell([docxParagraph(item.leftLabel, { size: 19, bold: true, color: COLORS.label })], { width: DOCX_WIDTHS[0], fill: COLORS.key, verticalAlign: VerticalAlignTable.CENTER }),
    docxCell([docxParagraph(item.leftValue, { size: 20, color: COLORS.dark })], { width: DOCX_WIDTHS[1], verticalAlign: VerticalAlignTable.CENTER }),
    docxCell([docxParagraph(item.rightLabel, { size: 19, bold: true, color: COLORS.label })], { width: DOCX_WIDTHS[2], fill: COLORS.key, verticalAlign: VerticalAlignTable.CENTER }),
    docxCell([docxParagraph(item.rightValue, { size: 20, color: COLORS.dark })], { width: DOCX_WIDTHS[3], verticalAlign: VerticalAlignTable.CENTER }),
  ], 440))));

  blocks.push(docxTable([
    mergedDocxRow('I. DAFTAR HADIR (ATTENDEES MATRIX)', COLORS.softBlue, { size: 21, bold: true, color: COLORS.navy }, 440),
    docxRow([
      docxCell([docxParagraph('Tim Internal PT Jawa Satu Power (JSP)', { size: 19, bold: true, color: COLORS.navy, align: AlignmentType.CENTER })], { width: DOCX_WIDTHS[0] + DOCX_WIDTHS[1], columnSpan: 2, fill: COLORS.paleBlue, verticalAlign: VerticalAlignTable.CENTER }),
      docxCell([docxParagraph('Peserta Eksternal / Stakeholders', { size: 19, bold: true, color: COLORS.navy, align: AlignmentType.CENTER })], { width: DOCX_WIDTHS[2] + DOCX_WIDTHS[3], columnSpan: 2, fill: COLORS.paleBlue, verticalAlign: VerticalAlignTable.CENTER }),
    ], 440),
    docxRow([
      docxCell([docxParagraph(model.internalAttendees.map((name) => `• ${name}`).join('\n'), { size: 20 })], { width: DOCX_WIDTHS[0] + DOCX_WIDTHS[1], columnSpan: 2 }),
      docxCell([docxParagraph(model.externalAttendees.map((name, index) => name === '-' ? name : `${index + 1}. ${name}`).join('\n'), { size: 20 })], { width: DOCX_WIDTHS[2] + DOCX_WIDTHS[3], columnSpan: 2 }),
    ], 900),
  ]));

  for (const section of model.sections) {
    blocks.push(docxTable([
      mergedDocxRow(section.title, COLORS.softBlue, { size: 21, bold: true, color: COLORS.navy }, 440),
      mergedDocxRow(section.body, COLORS.white, { size: 20, color: COLORS.text }, Math.max(520, section.minimumHeight * 12)),
    ]));
  }

  blocks.push(docxTable([mergedDocxRow('VI. LAMPIRAN DOKUMEN & DOKUMENTASI FOTO KEGIATAN', COLORS.softBlue, { size: 21, bold: true, color: COLORS.navy }, 440)]));
  if (model.photos.length === 0) {
    blocks.push(docxTable([mergedDocxRow('[ Area Dokumentasi Foto / Lampiran Kegiatan ]\n(Foto dokumentasi pertemuan / kegiatan lapangan dapat dilampirkan di sini)', COLORS.key, { size: 20, italic: true, color: COLORS.muted, align: AlignmentType.CENTER }, 2300)]));
  } else if (model.photos.length === 1) {
    blocks.push(docxTable([docxRow([
      docxCell([photoParagraph(model.photos[0]!, 620, 380)], { width: DOCX_TOTAL_WIDTH, columnSpan: 4, fill: COLORS.key, verticalAlign: VerticalAlignTable.CENTER }),
    ], 2900)]));
  } else {
    for (let index = 0; index < model.photos.length; index += 2) {
      const left = model.photos[index];
      const right = model.photos[index + 1];
      blocks.push(docxTable([docxRow([
        docxCell(left ? [photoParagraph(left, 300, 230)] : [docxParagraph('-')], { width: DOCX_WIDTHS[0] + DOCX_WIDTHS[1], columnSpan: 2, fill: COLORS.key, verticalAlign: VerticalAlignTable.CENTER }),
        docxCell(right ? [photoParagraph(right, 300, 230)] : [docxParagraph('-')], { width: DOCX_WIDTHS[2] + DOCX_WIDTHS[3], columnSpan: 2, fill: COLORS.key, verticalAlign: VerticalAlignTable.CENTER }),
      ], 1900)]));
    }
  }
  blocks.push(docxTable([mergedDocxRow(model.photoSummary, COLORS.white, { size: 20, bold: model.photos.length > 0, color: model.photos.length > 0 ? '1D4ED8' : COLORS.muted }, 420)]));

  blocks.push(docxTable([
    docxRow([
      docxCell([docxParagraph('Dibuat Oleh,', { size: 19, bold: true, color: COLORS.label, align: AlignmentType.CENTER })], { width: DOCX_WIDTHS[0] + DOCX_WIDTHS[1], columnSpan: 2, fill: COLORS.key, verticalAlign: VerticalAlignTable.CENTER }),
      docxCell([docxParagraph('Diketahui / Disetujui Oleh,', { size: 19, bold: true, color: COLORS.label, align: AlignmentType.CENTER })], { width: DOCX_WIDTHS[2] + DOCX_WIDTHS[3], columnSpan: 2, fill: COLORS.key, verticalAlign: VerticalAlignTable.CENTER }),
    ], 440),
    docxRow([
      docxCell([docxParagraph('')], { width: DOCX_WIDTHS[0] + DOCX_WIDTHS[1], columnSpan: 2 }),
      docxCell([docxParagraph('')], { width: DOCX_WIDTHS[2] + DOCX_WIDTHS[3], columnSpan: 2 }),
    ], 1100),
    docxRow([
      docxCell([docxParagraph(`( ${model.creatorName} )`, { size: 20, bold: true, color: COLORS.dark, align: AlignmentType.CENTER })], { width: DOCX_WIDTHS[0] + DOCX_WIDTHS[1], columnSpan: 2, verticalAlign: VerticalAlignTable.CENTER }),
      docxCell([docxParagraph(`( ${model.approverName} )`, { size: 20, bold: true, color: COLORS.dark, align: AlignmentType.CENTER })], { width: DOCX_WIDTHS[2] + DOCX_WIDTHS[3], columnSpan: 2, verticalAlign: VerticalAlignTable.CENTER }),
    ], 440),
  ]));

  return blocks;
};

const createDocx = (blocks: Array<Paragraph | Table>): Document => new Document({
  creator: 'CSRM - Jawa Satu Power',
  title: 'Minutes of Meeting & Daily Activity Report',
  description: 'CSRM MOM output generated from the database',
  styles: {
    default: {
      document: {
        run: { font: 'Times New Roman', size: 20, color: COLORS.text },
        paragraph: { spacing: { before: 0, after: 0, line: 240 } },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 360, right: 360, bottom: 360, left: 360 },
      },
    },
    children: blocks,
  }],
});

const safeNumber = (value: unknown): number | null => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const hexColor = (value: string) => {
  const normalized = value.replace('#', '');
  return rgb(
    parseInt(normalized.slice(0, 2), 16) / 255,
    parseInt(normalized.slice(2, 4), 16) / 255,
    parseInt(normalized.slice(4, 6), 16) / 255,
  );
};

const pdfTextLines = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
  const lines: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines : [''];
};

class PdfMomRenderer {
  private page!: PDFPage;
  private y = PDF_MARGIN;
  private constructor(
    private readonly document: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
    private readonly italic: PDFFont,
  ) {}

  public static async create(document: PDFDocument): Promise<PdfMomRenderer> {
    return new PdfMomRenderer(
      document,
      await document.embedFont(StandardFonts.TimesRoman),
      await document.embedFont(StandardFonts.TimesRomanBold),
      await document.embedFont(StandardFonts.TimesRomanItalic),
    );
  }

  public async startPage(): Promise<void> {
    this.page = this.document.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
    this.y = PDF_MARGIN;
  }

  private async ensure(height: number): Promise<void> {
    if (!this.page || this.y + height > PDF_PAGE_HEIGHT - PDF_MARGIN) await this.startPage();
  }

  private drawRect(x: number, top: number, width: number, height: number, fill = COLORS.white): void {
    this.page.drawRectangle({
      x,
      y: PDF_PAGE_HEIGHT - top - height,
      width,
      height,
      color: hexColor(fill),
      borderColor: hexColor(COLORS.border),
      borderWidth: 0.5,
    });
  }

  private drawText(text: string, x: number, top: number, width: number, height: number, options: { size?: number | undefined; bold?: boolean | undefined; italic?: boolean | undefined; color?: string | undefined; align?: 'left' | 'center' | 'right' | undefined; padding?: number | undefined } = {}): void {
    const size = options.size ?? 10;
    const font = options.italic ? this.italic : options.bold ? this.bold : this.regular;
    const padding = options.padding ?? 5;
    const lines = pdfTextLines(text, font, size, Math.max(1, width - padding * 2));
    const lineHeight = size + 3;
    const maxLines = Math.max(1, Math.floor((height - padding * 2) / lineHeight));
    const visibleLines = lines.slice(0, maxLines);
    visibleLines.forEach((line, index) => {
      const lineWidth = font.widthOfTextAtSize(line, size);
      const lineX = options.align === 'center'
        ? x + (width - lineWidth) / 2
        : options.align === 'right'
          ? x + width - padding - lineWidth
          : x + padding;
      this.page.drawText(line, {
        x: lineX,
        y: PDF_PAGE_HEIGHT - top - padding - size - index * lineHeight,
        size,
        font,
        color: hexColor(options.color ?? COLORS.text),
      });
    });
  }

  private drawCells(cells: PdfCell[], height: number): void {
    let x = PDF_MARGIN;
    for (const cell of cells) {
      this.drawRect(x, this.y, cell.width, height, cell.fill ?? COLORS.white);
      this.drawText(cell.text, x, this.y, cell.width, height, {
        size: cell.size ?? 10,
        bold: cell.bold,
        italic: cell.italic,
        color: cell.color,
        align: cell.align,
        padding: cell.padding,
      });
      x += cell.width;
    }
    this.y += height;
  }

  private async drawMerged(text: string, height: number, options: { fill?: string; size?: number; bold?: boolean; italic?: boolean; color?: string; align?: 'left' | 'center' | 'right' } = {}): Promise<void> {
    await this.ensure(height);
    this.drawCells([{ text, width: PDF_CONTENT_WIDTH, fill: options.fill, size: options.size, bold: options.bold, italic: options.italic, color: options.color, align: options.align }], height);
  }

  private async drawSection(section: MomDocumentModel['sections'][number]): Promise<void> {
    await this.drawMerged(section.title, 24, { fill: COLORS.softBlue, size: 10.5, bold: true, color: COLORS.navy });
    const font = this.regular;
    const widths = PDF_CONTENT_WIDTH;
    const lines = pdfTextLines(section.body, font, 10, widths - 10);
    let offset = 0;
    while (offset < lines.length) {
      const available = PDF_PAGE_HEIGHT - PDF_MARGIN - this.y;
      const lineCapacity = Math.max(1, Math.floor((Math.min(300, Math.max(60, available)) - 10) / 13));
      const chunk = lines.slice(offset, offset + lineCapacity);
      const height = Math.max(section.minimumHeight, chunk.length * 13 + 12);
      await this.ensure(Math.min(height, 300));
      const body = chunk.join('\n');
      this.drawMerged(body, height, { size: 10, color: COLORS.text });
      offset += chunk.length;
    }
  }

  private async drawPhoto(photo: MomPhoto, x: number, top: number, maxWidth: number, maxHeight: number): Promise<void> {
    const image: PDFImage = photo.mimeType === 'image/png'
      ? await this.document.embedPng(photo.data)
      : await this.document.embedJpg(photo.data);
    const scale = Math.min(maxWidth / photo.width, maxHeight / photo.height, 1);
    const width = Math.max(40, photo.width * scale);
    const height = Math.max(30, photo.height * scale);
    this.page.drawImage(image, {
      x: x + (maxWidth - width) / 2,
      y: PDF_PAGE_HEIGHT - top - height - (maxHeight - height) / 2,
      width,
      height,
    });
  }

  public async drawMom(model: MomDocumentModel): Promise<void> {
    await this.startPage();
    const widths = COLUMN_RATIOS.map((ratio) => PDF_CONTENT_WIDTH * ratio / COLUMN_RATIO_TOTAL);
    this.drawCells([
      { text: 'PT JAWA SATU POWER — EXTERNAL AFFAIRS & CSR', width: widths[0]! + widths[1]! + widths[2]!, fill: COLORS.navy, size: 9, bold: true, color: COLORS.white },
      { text: `DOC ID: ${model.docId}`, width: widths[3]!, fill: COLORS.navy, size: 8, bold: true, color: COLORS.white, align: 'right' },
    ], 24);
    await this.drawMerged('MINUTES OF MEETING & DAILY ACTIVITY REPORT', 28, { fill: COLORS.softBlue, size: 13, bold: true, color: COLORS.navy, align: 'center' });
    await this.drawMerged(`Topik / Daily Title : ${model.title}`, 32, { fill: COLORS.title, size: 11, bold: true, color: COLORS.dark });

    for (const item of model.metadata) {
      await this.ensure(22);
      this.drawCells([
        { text: item.leftLabel, width: widths[0]!, fill: COLORS.key, size: 9.5, bold: true, color: COLORS.label },
        { text: item.leftValue, width: widths[1]!, size: 10, color: COLORS.dark },
        { text: item.rightLabel, width: widths[2]!, fill: COLORS.key, size: 9.5, bold: true, color: COLORS.label },
        { text: item.rightValue, width: widths[3]!, size: 10, color: COLORS.dark },
      ], 22);
    }

    await this.drawMerged('I. DAFTAR HADIR (ATTENDEES MATRIX)', 24, { fill: COLORS.softBlue, size: 10.5, bold: true, color: COLORS.navy });
    await this.ensure(22);
    this.drawCells([
      { text: 'Tim Internal PT Jawa Satu Power (JSP)', width: widths[0]! + widths[1]!, fill: COLORS.paleBlue, size: 9.5, bold: true, color: COLORS.navy, align: 'center' },
      { text: 'Peserta Eksternal / Stakeholders', width: widths[2]! + widths[3]!, fill: COLORS.paleBlue, size: 9.5, bold: true, color: COLORS.navy, align: 'center' },
    ], 22);
    const internalText = model.internalAttendees.map((name) => `• ${name}`).join('\n');
    const externalText = model.externalAttendees.map((name, index) => name === '-' ? name : `${index + 1}. ${name}`).join('\n');
    await this.ensure(45);
    const attendeeHeight = Math.max(45, Math.max(internalText.split('\n').length, externalText.split('\n').length) * 13 + 12);
    this.drawCells([
      { text: internalText, width: widths[0]! + widths[1]!, size: 10 },
      { text: externalText, width: widths[2]! + widths[3]!, size: 10 },
    ], attendeeHeight);

    for (const section of model.sections) await this.drawSection(section);

    await this.drawMerged('VI. LAMPIRAN DOKUMEN & DOKUMENTASI FOTO KEGIATAN', 24, { fill: COLORS.softBlue, size: 10.5, bold: true, color: COLORS.navy });
    if (model.photos.length === 0) {
      await this.drawMerged('[ Area Dokumentasi Foto / Lampiran Kegiatan ]\n(Foto dokumentasi pertemuan / kegiatan lapangan dapat dilampirkan di sini)', 180, { fill: COLORS.key, size: 10, italic: true, color: COLORS.muted, align: 'center' });
    } else if (model.photos.length === 1) {
      const photo = model.photos[0]!;
      const maxHeight = 270;
      const scale = Math.min(450 / photo.width, maxHeight / photo.height, 1);
      const photoHeight = Math.max(140, photo.height * scale + 20);
      await this.ensure(photoHeight);
      this.drawRect(PDF_MARGIN, this.y, PDF_CONTENT_WIDTH, photoHeight, COLORS.key);
      await this.drawPhoto(photo, PDF_MARGIN, this.y, PDF_CONTENT_WIDTH, photoHeight);
      this.y += photoHeight;
    } else {
      for (let index = 0; index < model.photos.length; index += 2) {
        const left = model.photos[index];
        const right = model.photos[index + 1];
        const maxHeight = 170;
        await this.ensure(maxHeight + 10);
        const leftWidth = PDF_CONTENT_WIDTH / 2;
        this.drawRect(PDF_MARGIN, this.y, leftWidth, maxHeight, COLORS.key);
        this.drawRect(PDF_MARGIN + leftWidth, this.y, leftWidth, maxHeight, COLORS.key);
        if (left) await this.drawPhoto(left, PDF_MARGIN, this.y, leftWidth, maxHeight);
        if (right) await this.drawPhoto(right, PDF_MARGIN + leftWidth, this.y, leftWidth, maxHeight);
        this.y += maxHeight;
      }
    }
    await this.drawMerged(model.photoSummary, 26, { size: 10, bold: model.photos.length > 0, color: model.photos.length > 0 ? '1D4ED8' : COLORS.muted });

    await this.drawMerged('Dibuat Oleh,                                      Diketahui / Disetujui Oleh,', 24, { fill: COLORS.key, size: 9.5, bold: true, color: COLORS.label, align: 'center' });
    await this.ensure(58);
    this.drawCells([
      { text: '', width: PDF_CONTENT_WIDTH / 2 },
      { text: '', width: PDF_CONTENT_WIDTH / 2 },
    ], 58);
    await this.drawMerged(`( ${model.creatorName} )                                      ( ${model.approverName} )`, 24, { size: 10, bold: true, color: COLORS.dark, align: 'center' });
  }
}

const activityInclude = {
  daily_activity_pics: { include: { pic: true } },
  photos: { where: { is_deleted: false }, orderBy: { sort_order: 'asc' as const } },
  category: true,
  sub_category: true,
};

export type MomExportFilters = {
  year?: string | number | null;
  start?: string;
  end?: string;
  search?: string;
  cat?: string;
  sub_cat?: string;
  is_deleted?: boolean;
};

const buildWhere = (options: MomExportFilters): any => {
  const where: any = { is_deleted: options.is_deleted === true, is_archived: false };
  if (options.year && options.year !== 'Semua' && options.year !== 'All' && !Number.isNaN(Number.parseInt(String(options.year), 10))) {
    const year = String(options.year);
    where.activity_date = { gte: new Date(`${year}-01-01T00:00:00.000Z`), lte: new Date(`${year}-12-31T23:59:59.999Z`) };
  }
  if (options.start && options.end) {
    where.activity_date = { gte: new Date(`${options.start}T00:00:00.000Z`), lte: new Date(`${options.end}T23:59:59.999Z`) };
  }
  if (options.cat && options.cat !== 'All' && safeNumber(options.cat) !== null) where.category_id = BigInt(options.cat);
  if (options.sub_cat && options.sub_cat !== 'All' && safeNumber(options.sub_cat) !== null) where.sub_category_id = BigInt(options.sub_cat);
  if (options.search) {
    where.OR = [
      { activity: { contains: options.search } },
      { location: { contains: options.search } },
      { institution_group: { contains: options.search } },
      { keterangan: { contains: options.search } },
      { hasil: { contains: options.search } },
      { kesimpulan: { contains: options.search } },
      { next_plan: { contains: options.search } },
    ];
  }
  return where;
};

const queryActivity = async (id: bigint | string | number): Promise<any> => {
  const activity = await prisma.daily_activities.findUnique({ where: { id: BigInt(id) }, include: activityInclude });
  if (!activity) {
    const error: any = new Error('Data kegiatan harian tidak ditemukan');
    error.status = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  return activity;
};

const fileNameForModel = (model: MomDocumentModel, extension: 'docx' | 'pdf'): string => `MOM_${safeFilePart(model.title)}_${model.dateLabel.replace(/\s+/g, '_')}.${extension}`;

const combinedFileName = (models: MomDocumentModel[], extension: 'docx' | 'pdf'): string => {
  const year = models.length > 0 && models.every((model) => model.year === models[0]!.year) ? String(models[0]!.year) : 'All';
  return `Daily_Activities_MOM_Workbook_${year}.${extension}`;
};

const renderSummaryDocx = (models: MomDocumentModel[]): Table => {
  const widths = [600, 1700, 3800, 2200, 1800, 1060];
  const header = ['No', 'Tanggal', 'Daily Title / Kegiatan', 'Lokasi', 'Kategori', 'Foto'];
  const rows: TableRow[] = [docxRow(header.map((text, index) => docxCell([docxParagraph(text, { size: 17, bold: true, color: COLORS.navy, align: AlignmentType.CENTER })], { width: widths[index], fill: COLORS.softBlue, verticalAlign: VerticalAlignTable.CENTER })), 400)];
  models.forEach((model, index) => rows.push(docxRow([
    docxCell([docxParagraph(String(index + 1), { size: 17, align: AlignmentType.CENTER })], { width: widths[0], verticalAlign: VerticalAlignTable.CENTER }),
    docxCell([docxParagraph(`${model.dayLabel}, ${model.dateLabel}`, { size: 17 })], { width: widths[1] }),
    docxCell([docxParagraph(model.title, { size: 17 })], { width: widths[2] }),
    docxCell([docxParagraph(model.metadata[0]?.rightValue ?? '-', { size: 17 })], { width: widths[3] }),
    docxCell([docxParagraph(model.metadata[2]?.leftValue ?? '-', { size: 17 })], { width: widths[4] }),
    docxCell([docxParagraph(String(model.photos.length), { size: 17, align: AlignmentType.CENTER })], { width: widths[5] }),
  ], 420)));
  return docxTable(rows, widths);
};

export class MomDocumentExportService {
  public static async renderSingleDocxBuffer(activity: any): Promise<{ buffer: Buffer; fileName: string }> {
    const model = buildMomDocumentModel(activity);
    const document = createDocx(renderMomDocxBlocks(model));
    return { buffer: await Packer.toBuffer(document), fileName: fileNameForModel(model, 'docx') };
  }

  public static async renderSinglePdfBuffer(activity: any): Promise<{ buffer: Buffer; fileName: string }> {
    const model = buildMomDocumentModel(activity);
    const document = await PDFDocument.create();
    const renderer = await PdfMomRenderer.create(document);
    await renderer.drawMom(model);
    return { buffer: Buffer.from(await document.save()), fileName: fileNameForModel(model, 'pdf') };
  }

  public static async renderCombinedDocxBuffer(activities: any[]): Promise<{ buffer: Buffer; fileName: string }> {
    const models = activities.map(buildMomDocumentModel);
    const blocks: Array<Paragraph | Table> = [
      new Paragraph({ children: [docxRun('DAILY ACTIVITIES — MOM GABUNGAN', { size: 28, bold: true, color: COLORS.navy })], alignment: AlignmentType.CENTER, spacing: { before: 0, after: 160 } }),
      new Paragraph({ children: [docxRun('Ringkasan kegiatan dan halaman MOM mengikuti kontrak template Excel.', { size: 19, color: COLORS.muted })], alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 } }),
      renderSummaryDocx(models),
    ];
    models.forEach((model) => blocks.push(new Paragraph({ children: [new PageBreak()] },), ...renderMomDocxBlocks(model)));
    const document = createDocx(blocks);
    return { buffer: await Packer.toBuffer(document), fileName: combinedFileName(models, 'docx') };
  }

  public static async renderCombinedPdfBuffer(activities: any[]): Promise<{ buffer: Buffer; fileName: string }> {
    const models = activities.map(buildMomDocumentModel);
    const document = await PDFDocument.create();
    const summaryPage = document.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
    const font = await document.embedFont(StandardFonts.TimesRoman);
    const bold = await document.embedFont(StandardFonts.TimesRomanBold);
    let y = PDF_MARGIN;
    const drawText = (text: string, x: number, top: number, width: number, height: number, fontToUse: PDFFont, size: number, align: 'left' | 'center' = 'left') => {
      const lines = pdfTextLines(text, fontToUse, size, width - 8);
      lines.slice(0, Math.max(1, Math.floor((height - 8) / (size + 3)))).forEach((line, index) => {
        const textWidth = fontToUse.widthOfTextAtSize(line, size);
        summaryPage.drawText(line, { x: align === 'center' ? PDF_MARGIN + (width - textWidth) / 2 : x + 4, y: PDF_PAGE_HEIGHT - top - 4 - size - index * (size + 3), size, font: fontToUse, color: hexColor(COLORS.text) });
      });
    };
    summaryPage.drawText('DAILY ACTIVITIES — MOM GABUNGAN', { x: PDF_MARGIN, y: PDF_PAGE_HEIGHT - y - 18, size: 16, font: bold, color: hexColor(COLORS.navy) });
    y += 32;
    summaryPage.drawText('Ringkasan kegiatan dan halaman MOM mengikuti kontrak template Excel.', { x: PDF_MARGIN, y: PDF_PAGE_HEIGHT - y - 12, size: 10, font, color: hexColor(COLORS.muted) });
    y += 26;
    const summaryWidths = [28, 76, 190, 110, 100, 52];
    const headers = ['No', 'Tanggal', 'Daily Title / Kegiatan', 'Lokasi', 'Kategori', 'Foto'];
    const drawSummaryRow = (values: string[], fill: string, boldRow = false) => {
      let x = PDF_MARGIN;
      values.forEach((value, index) => {
        const width = summaryWidths[index]!;
        summaryPage.drawRectangle({ x, y: PDF_PAGE_HEIGHT - y - 28, width, height: 28, color: hexColor(fill), borderColor: hexColor(COLORS.border), borderWidth: 0.5 });
        drawText(value, x, y, width, 28, boldRow ? bold : font, 8, index === 0 || index === 5 ? 'center' : 'left');
        x += width;
      });
      y += 28;
    };
    drawSummaryRow(headers, COLORS.softBlue, true);
    models.forEach((model, index) => drawSummaryRow([
      String(index + 1), `${model.dayLabel}, ${model.dateLabel}`, model.title,
      model.metadata[0]?.rightValue ?? '-', model.metadata[2]?.leftValue ?? '-', String(model.photos.length),
    ], COLORS.white));

    const renderer = await PdfMomRenderer.create(document);
    for (const model of models) await renderer.drawMom(model);
    return { buffer: Buffer.from(await document.save()), fileName: combinedFileName(models, 'pdf') };
  }

  public static async generateSingleDocxBuffer(id: bigint | string | number): Promise<{ buffer: Buffer; fileName: string }> {
    return this.renderSingleDocxBuffer(await queryActivity(id));
  }

  public static async generateSinglePdfBuffer(id: bigint | string | number): Promise<{ buffer: Buffer; fileName: string }> {
    return this.renderSinglePdfBuffer(await queryActivity(id));
  }

  public static async generateCombinedDocxBuffer(options: MomExportFilters): Promise<{ buffer: Buffer; fileName: string; count: number }> {
    const activities = await prisma.daily_activities.findMany({ where: buildWhere(options), include: activityInclude, orderBy: { activity_date: 'asc' } });
    const result = await this.renderCombinedDocxBuffer(activities);
    return { ...result, count: activities.length };
  }

  public static async generateCombinedPdfBuffer(options: MomExportFilters): Promise<{ buffer: Buffer; fileName: string; count: number }> {
    const activities = await prisma.daily_activities.findMany({ where: buildWhere(options), include: activityInclude, orderBy: { activity_date: 'asc' } });
    const result = await this.renderCombinedPdfBuffer(activities);
    return { ...result, count: activities.length };
  }
}
