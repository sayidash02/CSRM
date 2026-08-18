import fs from 'fs';
import ExcelJS from 'exceljs';
import prisma from '../../lib/prisma';
import {
  getWorkbookSheetContract,
  LRP_SHEET_HEADERS,
  WorkbookModule,
  WorkbookSheetContract,
} from './WorkbookContract';

export interface DailyActivityExportRow {
  activity_date?: Date | string | null;
  activity?: string | null;
  institution_group?: string | null;
  address?: string | null;
  category?: { name?: string | null } | null;
  sub_category?: { name?: string | null } | null;
  focus?: string | null;
  location?: string | null;
  cost?: number | string | null;
  keterangan?: string | null;
  hasil?: string | null;
  description_result?: string | null;
  document_link?: string | null;
  daily_activity_pics?: Array<{ pic?: { name?: string | null } | null }>;
}

export interface StakeholderExportRow {
  stakeholder?: string | null;
  date?: Date | string | null;
  venue?: string | null;
  concern_issue?: string | null;
  document_link?: string | null;
}

export interface TopIssueExportRow {
  period?: string | null;
  issue?: string | null;
  description?: string | null;
  follow_up?: string | null;
  main_document?: string | null;
  supporting_document?: string | null;
  next_plan?: string | null;
}

export interface ProposalExportRow {
  registration_no?: string | null;
  date_received?: Date | string | null;
  institution?: string | null;
  address?: string | null;
  proposal_description?: string | null;
  proposal_file?: string | null;
  assessment_file?: string | null;
  status?: string | null;
}

export interface CsrProjectExportRow {
  project_year?: number | string | null;
  program?: string | null;
  activity?: string | null;
  type_of_activity?: string | null;
  location?: string | null;
  target_beneficiaries?: string | null;
  objective?: string | null;
  status?: string | null;
  budget?: number | string | null;
  implementation_period?: string | null;
  documentation_image?: string | null;
  document?: string | null;
}

export interface GrievanceExportRow {
  register_no?: string | null;
  log_date?: Date | string | null;
  complainant_name?: string | null;
  address?: string | null;
  phone?: string | null;
  category?: string | null;
  significance?: string | null;
  description?: string | null;
  location?: string | null;
  investigation?: string | null;
  resolution?: string | null;
  feedback?: string | null;
  status?: string | null;
  remarks?: string | null;
  supporting_files?: string | null;
}

export interface LrpExportRow {
  program?: string | null;
  sharepoint_link?: string | null;
}

export interface WorkbookExportData {
  dailyActivities: readonly DailyActivityExportRow[];
  stakeholders: readonly StakeholderExportRow[];
  topIssues: readonly TopIssueExportRow[];
  proposals: readonly ProposalExportRow[];
  csrProjects: readonly CsrProjectExportRow[];
  grievances: readonly GrievanceExportRow[];
  lrps: readonly LrpExportRow[];
}

export type WorkbookExportYear = number | null;

const text = (value: unknown): string => value === undefined || value === null ? '' : String(value);

const dateValue = (value: Date | string | null | undefined): Date | null => {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const numberValue = (value: number | string | null | undefined): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hyperlinkValue = (value: string | null | undefined): ExcelJS.CellValue => {
  const url = text(value).trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname
      ? { text: url, hyperlink: url }
      : url;
  } catch {
    // Preserve a legacy value as plain text rather than emitting an unsafe or
    // malformed Excel hyperlink.
    return url;
  }
};

const cloneRowStyle = (source: ExcelJS.Row, target: ExcelJS.Row, columnCount: number): void => {
  if (source.height !== undefined) target.height = source.height;
  for (let column = 1; column <= columnCount; column += 1) {
    target.getCell(column).style = { ...source.getCell(column).style };
  }
};

const clearDataRows = (worksheet: ExcelJS.Worksheet, contract: WorkbookSheetContract): void => {
  const columnCount = Math.max(worksheet.columnCount, contract.headers.length);
  for (let rowNumber = contract.dataStartRow; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    for (let column = 1; column <= columnCount; column += 1) {
      row.getCell(column).value = null;
    }
  }
};

const writeRow = (
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  values: readonly ExcelJS.CellValue[],
  styleSource: ExcelJS.Row,
): void => {
  const row = worksheet.getRow(rowNumber);
  cloneRowStyle(styleSource, row, values.length);
  values.forEach((value, index) => {
    row.getCell(index + 1).value = value ?? null;
  });
};

const setAutoFilter = (worksheet: ExcelJS.Worksheet, contract: WorkbookSheetContract, rowCount: number): void => {
  const headerRow = contract.headerRows[contract.headerRows.length - 1] ?? contract.dataStartRow - 1;
  worksheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: Math.max(headerRow, contract.dataStartRow + rowCount - 1), column: contract.headers.length },
  };
};

const yearDateRange = (year: WorkbookExportYear) => year === null
  ? undefined
  : { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };

const dateWhere = (field: string, year: WorkbookExportYear) => ({
  is_deleted: false,
  is_archived: false,
  ...(year === null ? {} : { [field]: yearDateRange(year) }),
});

const numericYearWhere = (field: string, year: WorkbookExportYear) => ({
  is_deleted: false,
  is_archived: false,
  ...(year === null ? {} : { [field]: year }),
});

export class WorkbookExportService {
  constructor(private readonly templatePath: string) {}

  public async generateWorkbookBuffer(data: WorkbookExportData): Promise<Buffer> {
    if (!fs.existsSync(this.templatePath)) {
      throw new Error('Workbook template tidak ditemukan');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.templatePath);

    const sheets = this.resolveSheets(workbook);
    for (const { worksheet, contract } of sheets.values()) {
      clearDataRows(worksheet, contract);
    }

    this.writeDailyActivities(sheets.get('dailyActivities')!.worksheet, sheets.get('dailyActivities')!.contract, data.dailyActivities);
    this.writeStakeholders(sheets.get('stakeholders')!.worksheet, sheets.get('stakeholders')!.contract, data.stakeholders);
    this.writeTopIssues(sheets.get('topIssues')!.worksheet, sheets.get('topIssues')!.contract, data.topIssues);
    this.writeProposals(sheets.get('proposals')!.worksheet, sheets.get('proposals')!.contract, data.proposals);
    this.writeCsrProjects(sheets.get('csr')!.worksheet, sheets.get('csr')!.contract, data.csrProjects);
    this.writeGrievances(sheets.get('grievance')!.worksheet, sheets.get('grievance')!.contract, data.grievances);
    this.writeLrps(sheets.get('lrp')!.worksheet, sheets.get('lrp')!.contract, data.lrps);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  public async generateDatabaseWorkbookBuffer(year: WorkbookExportYear = null): Promise<Buffer> {
    const [dailyActivities, stakeholders, topIssues, proposals, csrProjects, grievances, lrps] = await Promise.all([
      prisma.daily_activities.findMany({
        where: dateWhere('activity_date', year),
        include: { daily_activity_pics: { include: { pic: true } }, category: true, sub_category: true },
      }),
      prisma.stakeholder_engagement.findMany({ where: dateWhere('date', year) }),
      prisma.top_issues.findMany({ where: numericYearWhere('year', year) }),
      prisma.proposals.findMany({ where: dateWhere('date_received', year) }),
      prisma.csr_projects.findMany({ where: numericYearWhere('project_year', year) }),
      prisma.grievance.findMany({ where: dateWhere('log_date', year) }),
      prisma.lrp.findMany({ where: numericYearWhere('year', year) }),
    ]);

    return this.generateWorkbookBuffer({
      dailyActivities: dailyActivities.map((row) => ({ ...row, cost: row.cost?.toString() ?? null })),
      stakeholders,
      topIssues,
      proposals,
      csrProjects: csrProjects.map((row) => ({ ...row, budget: row.budget?.toString() ?? null })),
      grievances,
      lrps,
    });
  }

  private resolveSheets(workbook: ExcelJS.Workbook): Map<WorkbookModule, { worksheet: ExcelJS.Worksheet; contract: WorkbookSheetContract }> {
    const result = new Map<WorkbookModule, { worksheet: ExcelJS.Worksheet; contract: WorkbookSheetContract }>();
    for (const worksheet of workbook.worksheets) {
      const contract = getWorkbookSheetContract(worksheet.name, worksheet.state);
      if (contract && !result.has(contract.module)) {
        result.set(contract.module, { worksheet, contract });
      }
    }

    if (!result.has('lrp')) {
      const worksheet = workbook.addWorksheet('LRP');
      worksheet.columns = [
        { header: LRP_SHEET_HEADERS[0], key: 'no', width: 8 },
        { header: LRP_SHEET_HEADERS[1], key: 'program', width: 42 },
        { header: LRP_SHEET_HEADERS[2], key: 'sharepoint_link', width: 64 },
      ];
      const contract = getWorkbookSheetContract('LRP');
      if (contract) result.set('lrp', { worksheet, contract });
    }

    const required: WorkbookModule[] = ['dailyActivities', 'stakeholders', 'topIssues', 'proposals', 'csr', 'grievance', 'lrp'];
    const missing = required.filter((module) => !result.has(module));
    if (missing.length > 0) {
      throw new Error(`Template tidak memiliki sheet wajib: ${missing.join(', ')}`);
    }
    return result;
  }

  private writeDailyActivities(worksheet: ExcelJS.Worksheet, contract: WorkbookSheetContract, rows: readonly DailyActivityExportRow[]): void {
    const styleSource = worksheet.getRow(contract.dataStartRow);
    rows.forEach((row, index) => writeRow(worksheet, contract.dataStartRow + index, [
      index + 1,
      dateValue(row.activity_date),
      text(row.activity),
      text(row.institution_group),
      text(row.address),
      text(row.category?.name),
      text(row.sub_category?.name),
      text(row.focus),
      text(row.location),
      numberValue(row.cost),
      text(row.keterangan ?? row.description_result),
      text(row.hasil),
      hyperlinkValue(row.document_link),
      row.daily_activity_pics?.map((item) => text(item.pic?.name)).filter(Boolean).join(', ') ?? '',
    ], styleSource));
    setAutoFilter(worksheet, contract, rows.length);
  }

  private writeStakeholders(worksheet: ExcelJS.Worksheet, contract: WorkbookSheetContract, rows: readonly StakeholderExportRow[]): void {
    const styleSource = worksheet.getRow(contract.dataStartRow);
    rows.forEach((row, index) => writeRow(worksheet, contract.dataStartRow + index, [
      index + 1,
      text(row.stakeholder),
      [dateValue(row.date), text(row.venue)].filter(Boolean).map((value) => value instanceof Date ? value.toISOString().slice(0, 10) : value).join('\n'),
      text(row.concern_issue),
      hyperlinkValue(row.document_link),
    ], styleSource));
    setAutoFilter(worksheet, contract, rows.length);
  }

  private writeTopIssues(worksheet: ExcelJS.Worksheet, contract: WorkbookSheetContract, rows: readonly TopIssueExportRow[]): void {
    const styleSource = worksheet.getRow(contract.dataStartRow);
    rows.forEach((row, index) => writeRow(worksheet, contract.dataStartRow + index, [
      index + 1,
      text(row.period),
      text(row.issue),
      text(row.description),
      text(row.follow_up),
      hyperlinkValue(row.main_document),
      hyperlinkValue(row.supporting_document),
      text(row.next_plan),
    ], styleSource));
    setAutoFilter(worksheet, contract, rows.length);
  }

  private writeProposals(worksheet: ExcelJS.Worksheet, contract: WorkbookSheetContract, rows: readonly ProposalExportRow[]): void {
    const styleSource = worksheet.getRow(contract.dataStartRow);
    rows.forEach((row, index) => writeRow(worksheet, contract.dataStartRow + index, [
      index + 1,
      text(row.registration_no),
      dateValue(row.date_received),
      text(row.institution),
      text(row.address),
      text(row.proposal_description),
      hyperlinkValue(row.proposal_file),
      hyperlinkValue(row.assessment_file),
      text(row.status),
    ], styleSource));
    setAutoFilter(worksheet, contract, rows.length);
  }

  private writeCsrProjects(worksheet: ExcelJS.Worksheet, contract: WorkbookSheetContract, rows: readonly CsrProjectExportRow[]): void {
    const styleSource = worksheet.getRow(contract.dataStartRow);
    rows.forEach((row, index) => writeRow(worksheet, contract.dataStartRow + index, [
      index + 1,
      numberValue(row.project_year),
      text(row.program),
      text(row.activity),
      text(row.type_of_activity),
      text(row.location),
      text(row.target_beneficiaries),
      text(row.objective),
      text(row.status),
      numberValue(row.budget),
      text(row.implementation_period),
      hyperlinkValue(row.documentation_image),
      hyperlinkValue(row.document),
    ], styleSource));
    setAutoFilter(worksheet, contract, rows.length);
  }

  private writeGrievances(worksheet: ExcelJS.Worksheet, contract: WorkbookSheetContract, rows: readonly GrievanceExportRow[]): void {
    const styleSource = worksheet.getRow(contract.dataStartRow);
    rows.forEach((row, index) => writeRow(worksheet, contract.dataStartRow + index, [
      text(row.register_no),
      dateValue(row.log_date),
      text(row.complainant_name),
      text(row.address),
      text(row.phone),
      text(row.category),
      text(row.significance),
      text(row.description),
      text(row.location),
      text(row.investigation),
      text(row.resolution),
      text(row.feedback),
      text(row.status),
      text(row.remarks),
      hyperlinkValue(row.supporting_files),
    ], styleSource));
    setAutoFilter(worksheet, contract, rows.length);
  }

  private writeLrps(worksheet: ExcelJS.Worksheet, contract: WorkbookSheetContract, rows: readonly LrpExportRow[]): void {
    const styleSource = worksheet.getRow(contract.dataStartRow);
    rows.forEach((row, index) => writeRow(worksheet, contract.dataStartRow + index, [
      index + 1,
      text(row.program),
      hyperlinkValue(row.sharepoint_link),
    ], styleSource));
    setAutoFilter(worksheet, contract, rows.length);
  }
}
