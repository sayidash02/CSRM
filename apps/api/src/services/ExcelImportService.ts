import fs from 'fs';
import ExcelJS from 'exceljs';
import prisma from '../lib/prisma';
import { extractCellString } from './excel/ExcelCellUtils';
import { commitWorkbookRows } from './excel/ExcelWorkbookCommitService';
import { parseDailyActivitiesWorkbook } from './excel/ExcelDailyActivityParser';
import { parseCellDate, parseCellNumber } from './excel/ExcelValueParser';
import {
  allocateImportRegistration,
  detectSheetHeader,
  extractAttachmentValue,
  findColIndex,
  isRowIdentical,
  isRowNonEmpty,
  normalizeCategoryName,
  normalizeCsrStatus,
  normalizeGrievanceSignificance,
  normalizeGrievanceStatus,
  normalizePicName,
  normalizeProposalStatus,
  normalizeSubCategoryName,
  rowColumnMap,
  rowValue,
  shouldReadDataRow,
  trunc,
  truncStr,
  validationDate,
  validationYear,
  validateWorkbook
} from './excel/ExcelWorkbookValidator';
import { previewWorkbook } from './excel/ExcelWorkbookPreviewService';

// Preserve the existing service-level exports for callers and tests.
export { parseCellDate, parseCellNumber };

export interface ParsedDailyActivityRow {
  tempId: string;
  activity_date: string;
  activity: string;
  institution_group: string;
  address: string;
  category_id: string | null;
  sub_category_id: string | null;
  focus: string;
  location: string;
  cost: number | null;
  keterangan: string;
  hasil: string;
  description_result: string;
  pic_ids: string[];
  category_name: string;
  sub_category_name: string;
  pic_names: string[];
}

export interface ExcelImportErrorRow extends ParsedDailyActivityRow {
  errors: string[];
}

export interface ExcelImportResult {
  validRows: ParsedDailyActivityRow[];
  errorRows: ExcelImportErrorRow[];
}

export interface ImportPreviewSummary {
  dailyActivities: number;
  stakeholders: number;
  topIssues: number;
  proposals: number;
  csr: number;
  grievance: number;
  lrp: number;
}

export interface ImportConflict {
  module: keyof ImportPreviewSummary;
  row: number;
  code: string;
  message: string;
  blocking: boolean;
  identity?: string;
  existingId?: string;
  fields?: string[];
}

export interface ImportPreviewResult {
  fileId: string;
  summary: ImportPreviewSummary;
  newMasterData: {
    pics: string[];
    categories: string[];
  };
  conflicts: ImportConflict[];
  canImport: boolean;
}

export class ExcelImportService {
  static async preview(filePath: string): Promise<ImportPreviewResult> {
    return previewWorkbook(filePath);
  }

  static async confirm(fileId: string): Promise<{ success: boolean; count: number }> {
    if (!fs.existsSync(fileId)) {
      throw new Error(`Import file not found: ${fileId}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(fileId);
    const validation = await validateWorkbook(workbook);
    const blockingConflicts = validation.conflicts.filter((conflict) => conflict.blocking);
    if (blockingConflicts.length > 0) {
      throw Object.assign(new Error('Import preview contains blocking conflicts'), {
        status: 422,
        conflicts: validation.conflicts,
      });
    }

    const rawDailyActivities: Array<{
      activity_date: Date;
      activity: string;
      institution_group: string | null;
      address: string | null;
      focus: string | null;
      location: string | null;
      keterangan: string | null;
      hasil: string | null;
      kesimpulan: string | null;
      next_plan: string | null;
      description_result: string | null;
      cost: number | null;
      document_link: string | null;
      pic_names: string[];
      category_name: string;
      sub_category_name: string;
    }> = [];

    const rawStakeholders: Array<{
      stakeholder: string;
      date: Date | null;
      venue: string | null;
      concern_issue: string | null;
      document_link: string | null;
    }> = [];

    const rawTopIssues: Array<{
      period: string;
      year: number;
      issue: string;
      description: string | null;
      follow_up: string | null;
      main_document: string | null;
      supporting_document: string | null;
      next_plan: string | null;
    }> = [];

    const rawLrps: Array<{
      program: string;
      year: number;
    }> = [];

    const rawProposals: Array<{
      registration_no: string;
      source_registration_no: string | null;
      date_received: Date;
      institution: string;
      address: string | null;
      proposal_description: string | null;
      proposal_file: string | null;
      assessment_file: string | null;
      status: string;
    }> = [];

    const rawCsr: Array<{
      project_year: number;
      program: string;
      activity: string | null;
      type_of_activity: string | null;
      location: string | null;
      target_beneficiaries: string | null;
      objective: string | null;
      status: string;
      budget: number | null;
      implementation_period: string | null;
      documentation_image: string | null;
      document: string | null;
    }> = [];

    const rawGrievance: Array<{
      register_no: string;
      source_register_no: string | null;
      log_date: Date;
      complainant_name: string;
      address: string | null;
      phone: string | null;
      category: string | null;
      significance: string;
      description: string | null;
      location: string | null;
      investigation: string | null;
      resolution: string | null;
      feedback: string | null;
      status: string;
      remarks: string | null;
      supporting_files: string | null;
    }> = [];

    const existingProposals = await prisma.proposals.findMany({ select: { registration_no: true } });
    const usedProposalRegNos = new Set<string>(existingProposals.map(p => p.registration_no.toLowerCase()));

    const existingGrievances = await prisma.grievance.findMany({ select: { register_no: true } });
    const usedGrievanceRegNos = new Set<string>(existingGrievances.map(g => g.register_no.toLowerCase()));

    for (const worksheet of workbook.worksheets) {
      const detection = detectSheetHeader(worksheet);
      if (!detection) continue;

      const headerRow = worksheet.getRow(detection.headerRowIndex);
      const colMap = new Map<string, number>();

      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const headerText = extractCellString(cell.value).toLowerCase().trim();
        if (headerText) {
          colMap.set(headerText, colNumber);
        }
      });

      const sheetType = detection.sheetType;

      if (sheetType === 'dailyActivities') {
        const dateCol = findColIndex(colMap, ['tanggal', 'date', 'activity_date']);
        const actCol = findColIndex(colMap, ['kegiatan', 'activity', 'nama kegiatan']);
        const instCol = findColIndex(colMap, ['instansi', 'institution_group', 'institution', 'kelompok instansi', 'kelompok']);
        const addrCol = findColIndex(colMap, ['alamat', 'address']);
        const focusCol = findColIndex(colMap, ['fokus', 'focus']);
        const locCol = findColIndex(colMap, ['lokasi', 'location']);
        const costCol = findColIndex(colMap, ['biaya', 'cost', 'anggaran']);
        const docCol = findColIndex(colMap, ['link dokumen', 'dokumen', 'document_link', 'lampiran', 'link']);
        const picCol = findColIndex(colMap, ['pic', 'pic name', 'nama pic']);
        const subCatCol = findColIndex(colMap, ['sub_category', 'sub category', 'subkategori', 'sub kategori']);
        const catCol = findColIndex(colMap, ['category', 'kategori']);
        const ketCol = findColIndex(colMap, ['keterangan']);
        const hasCol = findColIndex(colMap, ['hasil']);
        const kesCol = findColIndex(colMap, ['kesimpulan', 'conclusion']);
        const planCol = findColIndex(colMap, ['next_plan', 'next plan', 'rencana', 'rencana selanjutnya']);
        const descCol = findColIndex(colMap, ['description_result', 'deskripsi / hasil', 'keterangan / hasil', 'deskripsi']);

        for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          if (!shouldReadDataRow(worksheet, detection, r) || !isRowNonEmpty(row)) continue;
          if (isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;

          const activity_date = parseCellDate(row.getCell(dateCol).value)!;
          const activity = truncStr(extractCellString(row.getCell(actCol).value), 255);
          const institution_group = instCol !== -1 ? trunc(extractCellString(row.getCell(instCol).value), 255) : null;
          const address = addrCol !== -1 ? trunc(extractCellString(row.getCell(addrCol).value), 255) : null;
          const focus = focusCol !== -1 ? trunc(extractCellString(row.getCell(focusCol).value), 255) : null;
          const location = locCol !== -1 ? trunc(extractCellString(row.getCell(locCol).value), 255) : null;
          const cost = costCol !== -1 ? parseCellNumber(row.getCell(costCol).value) : null;
          const document_link = docCol !== -1 ? extractAttachmentValue(row.getCell(docCol).value) : null;
          const raw_pic_name = picCol !== -1 ? extractCellString(row.getCell(picCol).value).trim() : '';
          let pic_names = raw_pic_name.split(/[,&]|\bdan\b/i).map(n => normalizePicName(n.trim())).filter(Boolean);
          if (pic_names.length === 0) pic_names = [];
          
          const rawCat = catCol !== -1 ? extractCellString(row.getCell(catCol).value).trim() : '';
          const category_name = normalizeCategoryName(rawCat);
          
          const rawSubCat = subCatCol !== -1 ? extractCellString(row.getCell(subCatCol).value).trim() : '';
          const sub_category_name = normalizeSubCategoryName(rawSubCat, category_name);

          const keterangan = ketCol !== -1 ? (extractCellString(row.getCell(ketCol).value) || null) : null;
          const hasil = hasCol !== -1 ? (extractCellString(row.getCell(hasCol).value) || null) : null;
          const kesimpulan = kesCol !== -1 ? (extractCellString(row.getCell(kesCol).value) || null) : null;
          const next_plan = planCol !== -1 ? (extractCellString(row.getCell(planCol).value) || null) : null;
          let description_result: string | null = null;
          if (descCol !== -1) {
            description_result = extractCellString(row.getCell(descCol).value) || null;
          } else {
            description_result = [keterangan, hasil].filter(Boolean).join(' - ') || null;
          }

          rawDailyActivities.push({
            activity_date,
            activity,
            institution_group,
            address,
            focus,
            location,
            keterangan,
            hasil,
            kesimpulan,
            next_plan,
            description_result,
            cost,
            document_link,
            pic_names,
            category_name,
            sub_category_name
          });
        }
      } else if (sheetType === 'stakeholders') {
        const stkCol = findColIndex(colMap, ['stakeholder', 'nama stakeholder', 'pihak']);
        const dateCol = findColIndex(colMap, ['tanggal', 'date', 'waktu']);
        const venueCol = findColIndex(colMap, ['tempat', 'venue', 'lokasi']);
        const issueCol = findColIndex(colMap, ['concern_issue', 'concern / issue', 'concern', 'issue', 'isu', 'permasalahan']);
        const docCol = findColIndex(colMap, ['link dokumen', 'dokumen', 'document_link', 'lampiran', 'link', 'docs', 'doc', 'document']);

        for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          if (!shouldReadDataRow(worksheet, detection, r) || !isRowNonEmpty(row)) continue;
          if (isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;

          const stakeholder = stkCol !== -1 ? truncStr(extractCellString(row.getCell(stkCol).value), 255) : '';
          if (!stakeholder) continue;

          let date = dateCol !== -1 && row.getCell(dateCol).value ? parseCellDate(row.getCell(dateCol).value) : null;
          let venue = venueCol !== -1 ? trunc(extractCellString(row.getCell(venueCol).value), 255) : null;

          // Split logic if Date and Venue are in the same cell
          if (dateCol === venueCol && dateCol !== -1) {
            const cellValue = extractCellString(row.getCell(dateCol).value);
            if (cellValue.includes('\n')) {
              const parts = cellValue.split('\n');
              date = parseCellDate(parts[0]);
              venue = trunc(parts.slice(1).join('\n').trim(), 255);
            }
          }
          const concern_issue = issueCol !== -1 ? (extractCellString(row.getCell(issueCol).value) || null) : null;
          const document_link = docCol !== -1 ? extractAttachmentValue(row.getCell(docCol).value) : null;

          rawStakeholders.push({
            stakeholder,
            date,
            venue,
            concern_issue,
            document_link
          });
        }
      } else if (sheetType === 'topIssues') {
        const periodCol = findColIndex(colMap, ['periode', 'period']);
        const yearCol = findColIndex(colMap, ['year', 'tahun']);
        const issueCol = findColIndex(colMap, ['top issue', 'issue', 'isu', 'masalah']);
        const descCol = findColIndex(colMap, ['description', 'deskripsi', 'keterangan']);
        const folCol = findColIndex(colMap, ['tindak lanjut', 'follow_up', 'follow up']);
        const mainDocCol = findColIndex(colMap, ['docs', 'dokumen utama', 'main_document', 'main document', 'dokumen']);
        const suppDocCol = findColIndex(colMap, ['supporting docs', 'dokumen pendukung', 'supporting_document', 'supporting document', 'pendukung']);
        const planCol = findColIndex(colMap, ['rencana selanjutnya', 'next_plan', 'next plan', 'rencana']);

        for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          if (!shouldReadDataRow(worksheet, detection, r) || !isRowNonEmpty(row)) continue;
          if (isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;

          const issue = issueCol !== -1 ? truncStr(extractCellString(row.getCell(issueCol).value), 255) : '';
          if (!issue) continue;

          const period = truncStr(extractCellString(row.getCell(periodCol).value), 50);
          const rawYear = yearCol !== -1 ? row.getCell(yearCol).value : null;
          const year = validationYear(rawYear) ?? validationYear(period) ?? 2026;
          const description = descCol !== -1 ? (extractCellString(row.getCell(descCol).value) || null) : null;
          const follow_up = folCol !== -1 ? (extractCellString(row.getCell(folCol).value) || null) : null;
          const main_document = mainDocCol !== -1 ? extractAttachmentValue(row.getCell(mainDocCol).value) : null;
          const supporting_document = suppDocCol !== -1 ? extractAttachmentValue(row.getCell(suppDocCol).value) : null;
          const next_plan = planCol !== -1 ? (extractCellString(row.getCell(planCol).value) || null) : null;

          rawTopIssues.push({
            period,
            year,
            issue,
            description,
            follow_up,
            main_document,
            supporting_document,
            next_plan
          });
        }
      } else if (sheetType === 'proposals') {
        const regCol = findColIndex(colMap, ['no registrasi', 'no reg', 'registration_no', 'nomor registrasi', 'no. reg', 'no.']);
        const dateCol = findColIndex(colMap, ['tanggal diterima', 'date_received', 'tanggal', 'date']);
        const instCol = findColIndex(colMap, ['instansi', 'institution', 'lembaga']);
        const addrCol = findColIndex(colMap, ['alamat', 'address']);
        const descCol = findColIndex(colMap, ['deskripsi proposal', 'proposal_description', 'deskripsi', 'perihal', 'keterangan']);
        const proposalFileCol = findColIndex(colMap, ['proposal', 'proposal_file', 'link proposal', 'file proposal']);
        const assessmentFileCol = findColIndex(colMap, ['assessment', 'assessment_file', 'link assessment', 'file assessment']);
        const statusCol = findColIndex(colMap, ['status']);

        for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          if (!shouldReadDataRow(worksheet, detection, r) || !isRowNonEmpty(row)) continue;
          if (isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;

          const rawInst = instCol !== -1 ? extractCellString(row.getCell(instCol).value).trim() : '';
          const rawPropDesc = descCol !== -1 ? extractCellString(row.getCell(descCol).value).trim() : '';
          const rawPropReg = regCol !== -1 ? extractCellString(row.getCell(regCol).value).trim() : '';
          if (!rawInst && !rawPropDesc && !rawPropReg) continue;

          const source_registration_no = rawPropReg ? truncStr(rawPropReg, 50) : null;
          const provisionalYear = parseCellDate(row.getCell(dateCol).value)!.getUTCFullYear();
          const registration_no = source_registration_no
            ? truncStr(source_registration_no, 50)
            : allocateImportRegistration('PROP', provisionalYear, usedProposalRegNos);

          const date_received = parseCellDate(row.getCell(dateCol).value)!;
          const institution = truncStr(rawInst, 255);
          const address = addrCol !== -1 ? trunc(extractCellString(row.getCell(addrCol).value), 255) : null;
          const proposal_description = descCol !== -1 ? (extractCellString(row.getCell(descCol).value) || null) : null;
          const proposal_file = proposalFileCol !== -1 ? extractAttachmentValue(row.getCell(proposalFileCol).value) : null;
          const assessment_file = assessmentFileCol !== -1 ? extractAttachmentValue(row.getCell(assessmentFileCol).value) : null;
          const status = normalizeProposalStatus(extractCellString(row.getCell(statusCol).value));

          rawProposals.push({
            registration_no,
            source_registration_no,
            date_received,
            institution,
            address,
            proposal_description,
            proposal_file,
            assessment_file,
            status
          });
        }
      } else if (sheetType === 'csr') {
        const yearCol = findColIndex(colMap, ['tahun', 'project_year', 'year']);
        const progCol = findColIndex(colMap, ['nama program', 'program']);
        const actCol = findColIndex(colMap, ['kegiatan', 'activity']);
        const typeCol = findColIndex(colMap, ['bentuk kegiatan', 'bentuk', 'jenis kegiatan', 'tipe kegiatan', 'type_of_activity', 'jenis']);
        const locCol = findColIndex(colMap, ['lokasi', 'location']);
        const benCol = findColIndex(colMap, ['target/sasaran', 'sasaran', 'target', 'penerima manfaat', 'target penerima', 'target_beneficiaries', 'penerima']);
        const objCol = findColIndex(colMap, ['tujuan', 'objective']);
        const statusCol = findColIndex(colMap, ['status']);
        const budCol = findColIndex(colMap, ['realisasi', 'realisasi(biaya dalam bentuk rupiah)', 'anggaran', 'budget', 'biaya']);
        const periodCol = findColIndex(colMap, ['periode pelaksanaan', 'waktu pelaksanaan', 'implementation_period', 'durasi', 'periode']);
        const imgCol = findColIndex(colMap, ['image dokumentasi', 'image', 'dokumentasi', 'gambar']);
        const docCol = findColIndex(colMap, ['docx', 'document', 'dokumen']);

        for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          if (!shouldReadDataRow(worksheet, detection, r) || !isRowNonEmpty(row)) continue;
          if (isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;

          const program = progCol !== -1 ? truncStr(extractCellString(row.getCell(progCol).value), 255) : '';
          if (!program) continue;

          const rawYear = yearCol !== -1 ? row.getCell(yearCol).value : null;
          const rawPeriod = periodCol !== -1 ? row.getCell(periodCol).value : null;
          const project_year = validationYear(rawYear) ?? validationYear(rawPeriod) ?? 2026;
          const activity = actCol !== -1 ? trunc(extractCellString(row.getCell(actCol).value), 255) : null;
          const type_of_activity = typeCol !== -1 ? trunc(extractCellString(row.getCell(typeCol).value), 100) : null;
          const location = locCol !== -1 ? trunc(extractCellString(row.getCell(locCol).value), 255) : null;
          const target_beneficiaries = benCol !== -1 ? trunc(extractCellString(row.getCell(benCol).value), 255) : null;
          const objective = objCol !== -1 ? (extractCellString(row.getCell(objCol).value) || null) : null;
          const status = normalizeCsrStatus(extractCellString(row.getCell(statusCol).value));
          const budget = budCol !== -1 ? parseCellNumber(row.getCell(budCol).value) : null;
          const implementation_period = periodCol !== -1 ? trunc(extractCellString(row.getCell(periodCol).value), 100) : null;
          const documentation_image = imgCol !== -1 ? extractAttachmentValue(row.getCell(imgCol).value) : null;
          const document = docCol !== -1 ? extractAttachmentValue(row.getCell(docCol).value) : null;

          rawCsr.push({
            project_year,
            program,
            activity,
            type_of_activity,
            location,
            target_beneficiaries,
            objective,
            status,
            budget,
            implementation_period,
            documentation_image,
            document
          });
        }
      } else if (sheetType === 'grievance') {
        const regCol = findColIndex(colMap, ['no registrasi', 'no reg', 'register_no', 'nomor registrasi', 'no. reg', 'no.', 'register no.', 'register no']);
        const dateCol = findColIndex(colMap, ['tanggal log', 'log_date', 'tanggal', 'date', 'log date']);
        const compCol = findColIndex(colMap, ['nama pelapor', 'complainant_name', 'pelapor', 'complainant', 'name']);
        const addrCol = findColIndex(colMap, ['alamat', 'address']);
        const phoneCol = findColIndex(colMap, ['phone', 'no hp', 'telepon', 'no telepon']);
        const catCol = findColIndex(colMap, ['kategori', 'category']);
        const sigCol = findColIndex(colMap, ['signifikansi', 'significance', 'tingkat']);
        const descCol = findColIndex(colMap, ['deskripsi', 'description', 'keluhan', 'rincian']);
        const locCol = findColIndex(colMap, ['location', 'lokasi']);
        const invCol = findColIndex(colMap, ['investigation', 'investigasi']);
        const resCol = findColIndex(colMap, ['resolution', 'resolusi', 'penyelesaian']);
        const feedCol = findColIndex(colMap, ['complainant feedback', 'feedback', 'umpan balik']);
        const statusCol = findColIndex(colMap, ['status']);
        const remCol = findColIndex(colMap, ['remarks', 'catatan', 'keterangan']);
        const docCol = findColIndex(colMap, ['related supporting docs (photo, settlement note etc)', 'related supporting docs', 'supporting docs', 'dokumen pendukung', 'supporting_files', 'docs']);

        for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          if (!shouldReadDataRow(worksheet, detection, r) || !isRowNonEmpty(row)) continue;
          if (isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;

          const rawCompName = compCol !== -1 ? extractCellString(row.getCell(compCol).value).trim() : '';
          const rawGrievanceDesc = descCol !== -1 ? extractCellString(row.getCell(descCol).value).trim() : '';
          const rawGrievanceReg = regCol !== -1 ? extractCellString(row.getCell(regCol).value).trim() : '';
          if (!rawCompName && !rawGrievanceDesc && !rawGrievanceReg) continue;

          const source_register_no = rawGrievanceReg ? truncStr(rawGrievanceReg, 50) : null;
          const provisionalYear = parseCellDate(row.getCell(dateCol).value)!.getUTCFullYear();
          const register_no = source_register_no
            ? truncStr(source_register_no, 50)
            : allocateImportRegistration('GRV', provisionalYear, usedGrievanceRegNos);

          const log_date = parseCellDate(row.getCell(dateCol).value)!;
          const complainant_name = truncStr(rawCompName, 255);
          const address = addrCol !== -1 ? trunc(extractCellString(row.getCell(addrCol).value), 255) : null;
          const phone = phoneCol !== -1 ? trunc(extractCellString(row.getCell(phoneCol).value), 30) : null;
          const category = catCol !== -1 ? trunc(extractCellString(row.getCell(catCol).value), 100) : null;
          const significance = normalizeGrievanceSignificance(extractCellString(row.getCell(sigCol).value));
          const description = descCol !== -1 ? (extractCellString(row.getCell(descCol).value) || null) : null;
          const location = locCol !== -1 ? trunc(extractCellString(row.getCell(locCol).value), 255) : null;
          const investigation = invCol !== -1 ? (extractCellString(row.getCell(invCol).value) || null) : null;
          const resolution = resCol !== -1 ? (extractCellString(row.getCell(resCol).value) || null) : null;
          const feedback = feedCol !== -1 ? (extractCellString(row.getCell(feedCol).value) || null) : null;
          const status = normalizeGrievanceStatus(extractCellString(row.getCell(statusCol).value));
          const remarks = remCol !== -1 ? (extractCellString(row.getCell(remCol).value) || null) : null;
          const supporting_files = docCol !== -1 ? extractAttachmentValue(row.getCell(docCol).value) : null;

          rawGrievance.push({
            register_no,
            source_register_no,
            log_date,
            complainant_name,
            address,
            phone,
            category,
            significance,
            description,
            location,
            investigation,
            resolution,
            feedback,
            status,
            remarks,
            supporting_files
          });
        }
      } else if (sheetType === 'lrp') {
        const programCol = findColIndex(colMap, ['program']);
        const yearCol = findColIndex(colMap, ['year', 'tahun']);
        for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          if (!shouldReadDataRow(worksheet, detection, r) || !isRowNonEmpty(row) || isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;
          rawLrps.push({
            program: truncStr(extractCellString(row.getCell(programCol).value), 255),
            year: validationYear(row.getCell(yearCol).value)!,
          });
        }
      }
    }

    const totalImportedRows =
      rawDailyActivities.length +
      rawStakeholders.length +
      rawTopIssues.length +
      rawProposals.length +
      rawCsr.length +
      rawGrievance.length +
      rawLrps.length;

    await commitWorkbookRows({
      dailyActivities: rawDailyActivities,
      stakeholders: rawStakeholders,
      topIssues: rawTopIssues,
      lrps: rawLrps,
      proposals: rawProposals,
      csr: rawCsr,
      grievances: rawGrievance
    });
    if (fs.existsSync(fileId)) {
      try {
        fs.unlinkSync(fileId);
      } catch (_) {}
    }

    return {
      success: true,
      count: totalImportedRows
    };
  }
}

export async function parseDailyActivitiesExcel(buffer: Buffer): Promise<ExcelImportResult> {
  return parseDailyActivitiesWorkbook(buffer);
}
