import fs from 'fs';
import ExcelJS from 'exceljs';
import prisma from '../lib/prisma';

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
  cost: number;
  description_result: string;
  document_link: string;
  pic_id: string | null;
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
}

export interface ImportPreviewResult {
  fileId: string;
  summary: ImportPreviewSummary;
  newMasterData: {
    pics: string[];
    categories: string[];
  };
}

function trunc(val: string | null | undefined, max: number): string | null {
  if (!val) return null;
  const s = String(val).trim();
  return s.length > max ? s.slice(0, max) : s;
}

function truncStr(val: string | null | undefined, max: number, defaultVal: string = ''): string {
  if (!val) return defaultVal;
  const s = String(val).trim();
  if (!s) return defaultVal;
  return s.length > max ? s.slice(0, max) : s;
}

function extractCellString(val: any): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') {
    if (val.result !== undefined && val.result !== null) return String(val.result).trim();
    if (val.text !== undefined && val.text !== null) return String(val.text).trim();
    if (Array.isArray(val.richText)) {
      return val.richText.map((r: any) => r.text || '').join('').trim();
    }
  }
  return String(val).trim();
}

export function parseCellDate(val: any): Date | null {
  if (!val) return null;

  // Handle Date instance: normalize using UTC date components
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate()));
  }

  // Handle Excel numeric serial dates (days since 1899-12-30)
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }
  }

  let str = extractCellString(val);
  if (!str) return null;

  // Normalize Indonesian month names & abbreviations to English
  const monthMap: Record<string, string> = {
    'agt': 'Aug', 'agustus': 'August',
    'des': 'Dec', 'desember': 'December',
    'okt': 'Oct', 'oktober': 'October',
    'mei': 'May',
    'nopi': 'Nov', 'nopember': 'November',
    'juni': 'June', 'juli': 'July',
    'maret': 'March', 'februari': 'February', 'januari': 'January'
  };

  for (const [idName, enName] of Object.entries(monthMap)) {
    str = str.replace(new RegExp(`\\b${idName}\\b`, 'gi'), enName);
  }

  const tryParseStr = (s: string) => {
    const hasTimezone = /(Z|UTC|GMT|[+-]\d{2}:?\d{2})$/i.test(s.trim());
    const parseCandidate = hasTimezone ? s : `${s} UTC`;
    let parsed = Date.parse(parseCandidate);
    if (isNaN(parsed)) {
      parsed = Date.parse(s);
    }
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    return null;
  };

  const parsedDirect = tryParseStr(str);
  if (parsedDirect) return parsedDirect;

  const dateMatch = str.match(/\d{1,2}\s+[a-zA-Z]+\s+\d{2,4}/);
  if (dateMatch) {
    const parsedMatch = tryParseStr(dateMatch[0]);
    if (parsedMatch) return parsedMatch;
  }

  return null;
}

function parseCellNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val.result !== undefined && val.result !== null) {
    const num = Number(val.result);
    return isNaN(num) ? null : num;
  }
  let str = extractCellString(val).toLowerCase();
  str = str.replace(/(rp|idr|\s)/g, '');
  str = str.replace(/[,.]00$/, '');
  str = str.replace(/[.,]/g, '');
  str = str.replace(/[^0-9-]/g, '');
  
  if (!str) return null;
  const num = Number(str);
  return isNaN(num) ? null : num;
}

function findColIndex(colMap: Map<string, number>, keywords: string[]): number {
  for (const kw of keywords) {
    for (const [headerText, colNum] of colMap.entries()) {
      if (headerText === kw) {
        return colNum;
      }
    }
  }
  for (const kw of keywords) {
    for (const [headerText, colNum] of colMap.entries()) {
      if (headerText.includes(kw)) {
        return colNum;
      }
    }
  }
  return -1;
}

function isRowNonEmpty(row: ExcelJS.Row): boolean {
  if (!row || !row.values) return false;
  const values = Array.isArray(row.values) ? row.values : Object.values(row.values);
  return values.some((val) => {
    if (val === null || val === undefined) return false;
    const str = extractCellString(val).trim();
    return str.length > 0;
  });
}

function isRowIdentical(row1: ExcelJS.Row, row2: ExcelJS.Row): boolean {
  if (!row1 || !row2 || !row1.values || !row2.values) return false;
  const v1 = Array.isArray(row1.values) ? row1.values : Object.values(row1.values);
  const v2 = Array.isArray(row2.values) ? row2.values : Object.values(row2.values);
  
  const maxLen = Math.max(v1.length, v2.length);
  for (let i = 1; i < maxLen; i++) {
    const s1 = extractCellString(v1[i]).toLowerCase();
    const s2 = extractCellString(v2[i]).toLowerCase();
    if (s1 !== s2) return false;
  }
  return true;
}

function detectSheetHeader(worksheet: ExcelJS.Worksheet): { sheetType: keyof ImportPreviewSummary; headerRowIndex: number } | null {
  const sheetNameLower = worksheet.name.toLowerCase().trim();

  // Ignore sheets that are typically raw dumps, pivot tables, or references
  if (['raw', 'master', 'reference', 'sheet1', 'sheet2', 'sheet3', 'data'].includes(sheetNameLower) || sheetNameLower.startsWith('raw ')) {
    return null;
  }

  let bestMatch: { sheetType: keyof ImportPreviewSummary; headerRowIndex: number, colCount: number } | null = null;

  const maxCheckRow = Math.min(10, worksheet.rowCount);
  for (let r = 1; r <= maxCheckRow; r++) {
    const row = worksheet.getRow(r);
    if (!row || !row.values) continue;

    const cellTexts: string[] = [];
    row.eachCell({ includeEmpty: false }, (cell) => {
      const str = extractCellString(cell.value).toLowerCase();
      // Ignore long texts which are likely data paragraphs, not headers
      if (str && str.length <= 100) cellTexts.push(str);
    });

    if (cellTexts.length === 0) continue;

    const hasTanggal = cellTexts.some(t => t.includes('tanggal') || t.includes('date'));
    const hasKegiatan = cellTexts.some(t => t.includes('kegiatan'));
    const hasStakeholder = cellTexts.some(t => t === 'stakeholder' || t === 'nama stakeholder' || t.includes('pihak'));
    const hasIssue = cellTexts.some(t => t === 'issue' || t === 'isu' || t.includes('concern') || t.includes('masalah'));
    const hasTop = cellTexts.some(t => t.includes('top'));
    const hasNoReg = cellTexts.some(t => t.includes('no registrasi') || t.includes('registrasi'));
    const hasInstansi = cellTexts.some(t => t.includes('instansi'));
    const hasProgram = cellTexts.some(t => t.includes('program'));
    const hasGrievance = cellTexts.some(t => t.includes('grievance') || t.includes('keluhan') || t.includes('investigation') || t.includes('resolution') || t.includes('significance'));
    const hasNo = cellTexts.some(t => t === 'no' || t === 'no.' || t === 'no ' || t === 'nomor');
    const hasDocs = cellTexts.some(t => t.includes('dokumen') || t.includes('docs') || t.includes('document'));

    let matchedType: keyof ImportPreviewSummary | null = null;

    if (hasTanggal && hasKegiatan) {
      matchedType = 'dailyActivities';
    } else if (hasStakeholder && (hasTanggal || hasIssue || hasDocs || hasNo || cellTexts.some(t => t.includes('venue')))) {
      matchedType = 'stakeholders';
    } else if (hasIssue && (hasTop || hasNo || hasDocs || cellTexts.some(t => t.includes('tindak') || t.includes('follow')))) {
      matchedType = 'topIssues';
    } else if (hasNoReg || hasInstansi) {
      matchedType = 'proposals';
    } else if ((hasProgram && hasNo) || (sheetNameLower.includes('csr') && (hasProgram || hasKegiatan || hasNo))) {
      matchedType = 'csr';
    } else if (hasGrievance && (hasNo || hasTanggal || hasIssue)) {
      matchedType = 'grievance';
    }

    if (matchedType) {
      if (!bestMatch || cellTexts.length >= bestMatch.colCount) {
        bestMatch = { sheetType: matchedType, headerRowIndex: r, colCount: cellTexts.length };
      }
    }
  }

  if (bestMatch) {
    return { sheetType: bestMatch.sheetType, headerRowIndex: bestMatch.headerRowIndex };
  }

  // Fallback sheet name matching if keywords weren't explicitly found in rows 1..10
  if (sheetNameLower.includes('daily')) return { sheetType: 'dailyActivities', headerRowIndex: 1 };
  if (sheetNameLower.includes('stakeholder')) return { sheetType: 'stakeholders', headerRowIndex: 1 };
  if (sheetNameLower.includes('issue') || sheetNameLower.includes('top')) return { sheetType: 'topIssues', headerRowIndex: 1 };
  if (sheetNameLower.includes('proposal')) return { sheetType: 'proposals', headerRowIndex: 1 };
  if (sheetNameLower.includes('csr')) return { sheetType: 'csr', headerRowIndex: 1 };
  if (sheetNameLower.includes('grievance')) return { sheetType: 'grievance', headerRowIndex: 1 };

  return null;
}

export class ExcelImportService {
  static async preview(filePath: string): Promise<ImportPreviewResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const summary: ImportPreviewSummary = {
      dailyActivities: 0,
      stakeholders: 0,
      topIssues: 0,
      proposals: 0,
      csr: 0,
      grievance: 0
    };

    const excelPics = new Set<string>();
    const excelCategories = new Set<string>();

    for (const worksheet of workbook.worksheets) {
      const detection = detectSheetHeader(worksheet);
      if (!detection) continue;

      let validRowCount = 0;
      for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);
        if (isRowNonEmpty(row)) {
          validRowCount++;
        }
      }

      summary[detection.sheetType] += validRowCount;

      if (detection.sheetType === 'dailyActivities') {
        const headerRow = worksheet.getRow(detection.headerRowIndex);
        let picCol = -1;
        let catCol = -1;

        headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const text = extractCellString(cell.value).trim().toLowerCase();
          if (text === 'pic' || text.includes('pic')) {
            picCol = colNumber;
          }
          if (text === 'kategori' || text === 'category' || text.includes('kategori')) {
            catCol = colNumber;
          }
        });

        if (picCol !== -1 || catCol !== -1) {
          for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
            const row = worksheet.getRow(r);
            if (!isRowNonEmpty(row)) continue;

            if (picCol !== -1) {
              let picVal = extractCellString(row.getCell(picCol).value).trim();
              if (picVal.length > 255) picVal = ''; 
              if (picVal) {
                const names = picVal.split(/[,&]|\bdan\b/i).map(n => n.trim()).filter(Boolean);
                for (const n of names) excelPics.add(n);
              }
            }
            if (catCol !== -1) {
              let catVal = extractCellString(row.getCell(catCol).value).trim();
              if (catVal.length > 50) catVal = ''; // Filter out obviously invalid Categories
              if (catVal) excelCategories.add(catVal);
            }
          }
        }
      }
    }

    const existingPics = await prisma.pics.findMany({ select: { name: true } });
    const existingCategories = await prisma.categories.findMany({ select: { name: true } });

    const dbPicNames = new Set(existingPics.map(p => p.name.trim().toLowerCase()));
    const dbCatNames = new Set(existingCategories.map(c => c.name.trim().toLowerCase()));

    const newPics = Array.from(excelPics).filter(p => !dbPicNames.has(p.toLowerCase()));
    const newCategories = Array.from(excelCategories).filter(c => !dbCatNames.has(c.toLowerCase()));

    return {
      fileId: filePath,
      summary,
      newMasterData: {
        pics: newPics,
        categories: newCategories
      }
    };
  }

  static async confirm(fileId: string): Promise<{ success: boolean; count: number }> {
    if (!fs.existsSync(fileId)) {
      throw new Error(`Import file not found: ${fileId}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(fileId);

    const rawDailyActivities: Array<{
      activity_date: Date;
      activity: string;
      institution_group: string | null;
      address: string | null;
      focus: string | null;
      location: string | null;
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
      issue: string;
      description: string | null;
      follow_up: string | null;
      main_document: string | null;
      supporting_document: string | null;
      next_plan: string | null;
    }> = [];

    const rawProposals: Array<{
      registration_no: string;
      date_received: Date;
      institution: string;
      address: string | null;
      proposal_description: string | null;
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
        const descCol = findColIndex(colMap, ['description_result', 'deskripsi / hasil', 'keterangan / hasil', 'deskripsi']);

        for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          if (!isRowNonEmpty(row)) continue;
          if (isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;

          const activity_date = dateCol !== -1 && row.getCell(dateCol).value ? (parseCellDate(row.getCell(dateCol).value) || new Date()) : new Date();
          const activity = actCol !== -1 ? truncStr(extractCellString(row.getCell(actCol).value), 255, 'Kegiatan') : 'Kegiatan';
          const institution_group = instCol !== -1 ? trunc(extractCellString(row.getCell(instCol).value), 255) : null;
          const address = addrCol !== -1 ? trunc(extractCellString(row.getCell(addrCol).value), 255) : null;
          const focus = focusCol !== -1 ? trunc(extractCellString(row.getCell(focusCol).value), 255) : null;
          const location = locCol !== -1 ? trunc(extractCellString(row.getCell(locCol).value), 255) : null;
          const cost = costCol !== -1 ? parseCellNumber(row.getCell(costCol).value) : null;
          const document_link = docCol !== -1 ? (extractCellString(row.getCell(docCol).value) || null) : null;
          let raw_pic_name = picCol !== -1 ? extractCellString(row.getCell(picCol).value).trim() : '';
          if (!raw_pic_name || raw_pic_name.length > 255) raw_pic_name = 'Umum';
          let pic_names = raw_pic_name.split(/[,&]|\bdan\b/i).map(n => n.trim()).filter(Boolean);
          if (pic_names.length === 0) pic_names = ['Umum'];
          
          let category_name = catCol !== -1 ? extractCellString(row.getCell(catCol).value).trim() : '';
          if (!category_name || category_name.length > 50) category_name = 'Umum';
          
          let sub_category_name = subCatCol !== -1 ? extractCellString(row.getCell(subCatCol).value).trim() : '';
          if (!sub_category_name || sub_category_name.length > 100) sub_category_name = 'Umum';

          let description_result: string | null = null;
          if (descCol !== -1) {
            description_result = extractCellString(row.getCell(descCol).value) || null;
          } else {
            const ketStr = ketCol !== -1 ? extractCellString(row.getCell(ketCol).value) : '';
            const hasStr = hasCol !== -1 ? extractCellString(row.getCell(hasCol).value) : '';
            description_result = [ketStr, hasStr].filter(Boolean).join(' - ') || null;
          }

          rawDailyActivities.push({
            activity_date,
            activity,
            institution_group,
            address,
            focus,
            location,
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
          if (!isRowNonEmpty(row)) continue;
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
          const document_link = docCol !== -1 ? (extractCellString(row.getCell(docCol).value) || null) : null;

          rawStakeholders.push({
            stakeholder,
            date,
            venue,
            concern_issue,
            document_link
          });
        }
      } else if (sheetType === 'topIssues') {
        const periodCol = findColIndex(colMap, ['periode', 'period', 'tahun']);
        const issueCol = findColIndex(colMap, ['top issue', 'issue', 'isu', 'masalah']);
        const descCol = findColIndex(colMap, ['description', 'deskripsi', 'keterangan']);
        const folCol = findColIndex(colMap, ['tindak lanjut', 'follow_up', 'follow up']);
        const mainDocCol = findColIndex(colMap, ['dokumen utama', 'main_document', 'main document', 'dokumen']);
        const suppDocCol = findColIndex(colMap, ['dokumen pendukung', 'supporting_document', 'supporting document', 'pendukung']);
        const planCol = findColIndex(colMap, ['rencana selanjutnya', 'next_plan', 'next plan', 'rencana']);

        for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          if (!isRowNonEmpty(row)) continue;
          if (isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;

          const issue = issueCol !== -1 ? truncStr(extractCellString(row.getCell(issueCol).value), 255) : '';
          if (!issue) continue;

          const period = periodCol !== -1 ? truncStr(extractCellString(row.getCell(periodCol).value), 50, '2024') : '2024';
          const description = descCol !== -1 ? (extractCellString(row.getCell(descCol).value) || null) : null;
          const follow_up = folCol !== -1 ? (extractCellString(row.getCell(folCol).value) || null) : null;
          const main_document = mainDocCol !== -1 ? (extractCellString(row.getCell(mainDocCol).value) || null) : null;
          const supporting_document = suppDocCol !== -1 ? (extractCellString(row.getCell(suppDocCol).value) || null) : null;
          const next_plan = planCol !== -1 ? (extractCellString(row.getCell(planCol).value) || null) : null;

          rawTopIssues.push({
            period,
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
        const statusCol = findColIndex(colMap, ['status']);

        for (let r = detection.headerRowIndex + 1; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          if (!isRowNonEmpty(row)) continue;
          if (isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;

          let registration_no = regCol !== -1 ? extractCellString(row.getCell(regCol).value) : '';
          if (!registration_no || usedProposalRegNos.has(registration_no.toLowerCase())) {
            registration_no = `PROP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
          }
          registration_no = truncStr(registration_no, 50);
          usedProposalRegNos.add(registration_no.toLowerCase());

          const date_received = dateCol !== -1 && row.getCell(dateCol).value ? (parseCellDate(row.getCell(dateCol).value) || new Date()) : new Date();
          const institution = instCol !== -1 ? truncStr(extractCellString(row.getCell(instCol).value), 255, 'Umum') : 'Umum';
          const address = addrCol !== -1 ? trunc(extractCellString(row.getCell(addrCol).value), 255) : null;
          const proposal_description = descCol !== -1 ? (extractCellString(row.getCell(descCol).value) || null) : null;
          const status = statusCol !== -1 ? truncStr(extractCellString(row.getCell(statusCol).value), 20, 'Accept') : 'Accept';

          rawProposals.push({
            registration_no,
            date_received,
            institution,
            address,
            proposal_description,
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
          if (!isRowNonEmpty(row)) continue;
          if (isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;

          const program = progCol !== -1 ? truncStr(extractCellString(row.getCell(progCol).value), 255) : '';
          if (!program) continue;

          const parsedYear = yearCol !== -1 ? parseCellNumber(row.getCell(yearCol).value) : null;
          const project_year = parsedYear ? Math.floor(parsedYear) : new Date().getFullYear();
          const activity = actCol !== -1 ? trunc(extractCellString(row.getCell(actCol).value), 255) : null;
          const type_of_activity = typeCol !== -1 ? trunc(extractCellString(row.getCell(typeCol).value), 100) : null;
          const location = locCol !== -1 ? trunc(extractCellString(row.getCell(locCol).value), 255) : null;
          const target_beneficiaries = benCol !== -1 ? trunc(extractCellString(row.getCell(benCol).value), 255) : null;
          const objective = objCol !== -1 ? (extractCellString(row.getCell(objCol).value) || null) : null;
          const status = statusCol !== -1 ? truncStr(extractCellString(row.getCell(statusCol).value), 20, 'Planning') : 'Planning';
          const budget = budCol !== -1 ? parseCellNumber(row.getCell(budCol).value) : null;
          const implementation_period = periodCol !== -1 ? trunc(extractCellString(row.getCell(periodCol).value), 100) : null;
          const documentation_image = imgCol !== -1 ? (extractCellString(row.getCell(imgCol).value) || null) : null;
          const document = docCol !== -1 ? (extractCellString(row.getCell(docCol).value) || null) : null;

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
          if (!isRowNonEmpty(row)) continue;
          if (isRowIdentical(row, worksheet.getRow(detection.headerRowIndex))) continue;

          let register_no = regCol !== -1 ? extractCellString(row.getCell(regCol).value) : '';
          if (!register_no || usedGrievanceRegNos.has(register_no.toLowerCase())) {
            register_no = `GRV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
          }
          register_no = truncStr(register_no, 50);
          usedGrievanceRegNos.add(register_no.toLowerCase());

          const log_date = dateCol !== -1 && row.getCell(dateCol).value ? (parseCellDate(row.getCell(dateCol).value) || new Date()) : new Date();
          const complainant_name = compCol !== -1 ? truncStr(extractCellString(row.getCell(compCol).value), 255, 'Anonim') : 'Anonim';
          const address = addrCol !== -1 ? trunc(extractCellString(row.getCell(addrCol).value), 255) : null;
          const phone = phoneCol !== -1 ? trunc(extractCellString(row.getCell(phoneCol).value), 30) : null;
          const category = catCol !== -1 ? trunc(extractCellString(row.getCell(catCol).value), 100) : null;
          const significance = sigCol !== -1 ? truncStr(extractCellString(row.getCell(sigCol).value), 20, 'Low') : 'Low';
          const description = descCol !== -1 ? (extractCellString(row.getCell(descCol).value) || null) : null;
          const location = locCol !== -1 ? trunc(extractCellString(row.getCell(locCol).value), 255) : null;
          const investigation = invCol !== -1 ? (extractCellString(row.getCell(invCol).value) || null) : null;
          const resolution = resCol !== -1 ? (extractCellString(row.getCell(resCol).value) || null) : null;
          const feedback = feedCol !== -1 ? (extractCellString(row.getCell(feedCol).value) || null) : null;
          const status = statusCol !== -1 ? truncStr(extractCellString(row.getCell(statusCol).value), 20, 'Open') : 'Open';
          const remarks = remCol !== -1 ? (extractCellString(row.getCell(remCol).value) || null) : null;
          const supporting_files = docCol !== -1 ? (extractCellString(row.getCell(docCol).value) || null) : null;

          rawGrievance.push({
            register_no,
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
      }
    }

    const totalImportedRows =
      rawDailyActivities.length +
      rawStakeholders.length +
      rawTopIssues.length +
      rawProposals.length +
      rawCsr.length +
      rawGrievance.length;

    await prisma.$transaction(
      async (tx) => {
        // 1. Resolve / Create PICs
        const existingPics = await tx.pics.findMany();
        const picMap = new Map<string, bigint>();
        for (const p of existingPics) {
          picMap.set(p.name.trim().toLowerCase(), p.id);
        }

        const uniquePicsToCreate = new Map<string, string>();
        for (const item of rawDailyActivities) {
          for (const p of item.pic_names) {
            const trimmed = p.trim();
            const norm = trimmed.toLowerCase();
            if (norm && !picMap.has(norm) && !uniquePicsToCreate.has(norm)) {
              uniquePicsToCreate.set(norm, trimmed);
            }
          }
        }
        for (const [norm, name] of uniquePicsToCreate.entries()) {
          const created = await tx.pics.create({ data: { name } });
          picMap.set(norm, created.id);
        }

        // 2. Resolve / Create Categories
        const existingCategories = await tx.categories.findMany();
        const categoryMap = new Map<string, bigint>();
        for (const c of existingCategories) {
          categoryMap.set(c.name.trim().toLowerCase(), c.id);
        }

        const uniqueCatsToCreate = new Map<string, string>();
        for (const item of rawDailyActivities) {
          const trimmed = item.category_name.trim();
          const norm = trimmed.toLowerCase();
          if (norm && !categoryMap.has(norm) && !uniqueCatsToCreate.has(norm)) {
            uniqueCatsToCreate.set(norm, trimmed);
          }
        }
        for (const [norm, name] of uniqueCatsToCreate.entries()) {
          const created = await tx.categories.create({ data: { name } });
          categoryMap.set(norm, created.id);
        }

        // 3. Resolve / Create SubCategories
        const existingSubCategories = await tx.sub_categories.findMany();
        const subCategoryMap = new Map<string, bigint>();
        for (const sc of existingSubCategories) {
          subCategoryMap.set(`${sc.category_id}:${sc.name.trim().toLowerCase()}`, sc.id);
        }

        const uniqueSubCatsToCreate = new Map<string, { categoryId: bigint; name: string }>();
        for (const item of rawDailyActivities) {
          const catNorm = item.category_name.trim().toLowerCase();
          const catId = categoryMap.get(catNorm);
          if (!catId) continue;

          const trimmedSub = item.sub_category_name.trim();
          const subNorm = trimmedSub.toLowerCase();
          const subKey = `${catId}:${subNorm}`;
          if (subNorm && !subCategoryMap.has(subKey) && !uniqueSubCatsToCreate.has(subKey)) {
            uniqueSubCatsToCreate.set(subKey, { categoryId: catId, name: trimmedSub });
          }
        }
        for (const [subKey, val] of uniqueSubCatsToCreate.entries()) {
          const created = await tx.sub_categories.create({
            data: { category_id: val.categoryId, name: val.name }
          });
          subCategoryMap.set(subKey, created.id);
        }

        // 4. Resolve / Create Stakeholders
        const existingStakeholders = await tx.stakeholders.findMany();
        const stakeholderMap = new Map<string, bigint>();
        for (const s of existingStakeholders) {
          stakeholderMap.set(s.name.trim().toLowerCase(), s.id);
        }

        const uniqueStakeholdersToCreate = new Map<string, string>();

        for (const item of rawDailyActivities) {
          if (item.institution_group) {
            const trimmed = item.institution_group.trim();
            const norm = trimmed.toLowerCase();
            if (norm && !stakeholderMap.has(norm) && !uniqueStakeholdersToCreate.has(norm)) {
              uniqueStakeholdersToCreate.set(norm, trimmed);
            }
          }
        }

        for (const item of rawStakeholders) {
          const trimmed = item.stakeholder.trim();
          const norm = trimmed.toLowerCase();
          if (norm && !stakeholderMap.has(norm) && !uniqueStakeholdersToCreate.has(norm)) {
            uniqueStakeholdersToCreate.set(norm, trimmed);
          }
        }

        for (const [norm, name] of uniqueStakeholdersToCreate.entries()) {
          const created = await tx.stakeholders.create({ data: { name: truncStr(name, 255) } });
          stakeholderMap.set(norm, created.id);
        }

        // 5. Insert Daily Activities
        if (rawDailyActivities.length > 0) {
          for (const item of rawDailyActivities) {
            const catId = categoryMap.get(item.category_name.trim().toLowerCase())!;
            const subKey = `${catId}:${item.sub_category_name.trim().toLowerCase()}`;
            const subCatId = subCategoryMap.get(subKey)!;
            const pIds = item.pic_names.map(p => picMap.get(p.trim().toLowerCase())!);
            const pId = pIds.length > 0 ? pIds[0] : null;

            let sId: bigint | null = null;
            if (item.institution_group) {
              sId = stakeholderMap.get(item.institution_group.trim().toLowerCase()) || null;
            }

            await tx.daily_activities.create({
              data: {
                activity_date: item.activity_date,
                activity: item.activity,
                address: item.address,
                focus: item.focus,
                location: item.location,
                description_result: item.description_result,
                category_id: catId,
                sub_category_id: subCatId,
                pic_id: pId!,
                cost: item.cost,
                document_link: item.document_link,
                stakeholder_id: sId
              }
            });
          }
        }

        // 6. Insert Stakeholders Engagement
        if (rawStakeholders.length > 0) {
          const stakeholderEngagementsData = rawStakeholders.map(s => {
            const sId = stakeholderMap.get(s.stakeholder.trim().toLowerCase())!;
            return {
              stakeholder_id: sId,
              date: s.date,
              venue: s.venue,
              concern_issue: s.concern_issue,
              document_link: s.document_link
            };
          });

          await tx.stakeholder_engagement.createMany({
            data: stakeholderEngagementsData
          });
        }

        // 6. Insert Top Issues
        if (rawTopIssues.length > 0) {
          await tx.top_issues.createMany({
            data: rawTopIssues
          });
        }

        // 7. Insert Proposals
        if (rawProposals.length > 0) {
          await tx.proposals.createMany({
            data: rawProposals
          });
        }

        // 8. Insert CSR
        if (rawCsr.length > 0) {
          await tx.csr_projects.createMany({
            data: rawCsr
          });
        }

        // 9. Insert Grievance
        if (rawGrievance.length > 0) {
          await tx.grievance.createMany({
            data: rawGrievance
          });
        }
      },
      {
        maxWait: 10000,
        timeout: 60000
      }
    );

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
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Excel file is empty");

  const categories = await prisma.categories.findMany();
  const subCategories = await prisma.sub_categories.findMany();
  const pics = await prisma.pics.findMany({ where: { is_active: true } });

  const validRows: ParsedDailyActivityRow[] = [];
  const errorRows: ExcelImportErrorRow[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const values = row.values as any[];
    if (!values || values[1] === undefined || values[1] === null || values[1] === '') return;

    let activity_date = '';
    const rawDate = values[2];
    if (rawDate instanceof Date) {
      activity_date = rawDate.toISOString();
    } else {
      activity_date = extractCellString(rawDate);
    }

    const activity = extractCellString(values[3]);
    const institution_group = extractCellString(values[4]);
    const address = extractCellString(values[5]);
    const rawCat = extractCellString(values[6]);
    const rawSubCat = extractCellString(values[7]);
    const focus = extractCellString(values[8]);
    const location = extractCellString(values[9]);
    
    const rawCost = values[10];
    let cost = 0;
    let costError = false;
    if (rawCost !== undefined && rawCost !== null && rawCost !== '') {
      const parsedCost = Number(rawCost);
      if (isNaN(parsedCost)) {
        costError = true;
      } else {
        cost = parsedCost;
      }
    }

    const keterangan = extractCellString(values[11]);
    const hasil = extractCellString(values[12]);
    const document_link = extractCellString(values[13]);
    const rawPic = extractCellString(values[14]);

    const description_result = [keterangan, hasil].filter(Boolean).join(' - ');

    const catName = rawCat.toLowerCase();
    const subCatName = rawSubCat.toLowerCase();
    const rawPicNames = rawPic.split(/[,&]|\bdan\b/i).map(n => n.trim()).filter(Boolean);
    const picNames = rawPicNames.map(n => n.toLowerCase());

    const categoryMatch = categories.find(c => c.name.toLowerCase().trim() === catName);
    const subCategoryMatch = subCategories.find(s => s.name.toLowerCase().trim() === subCatName);
    const picMatches = picNames.map(pName => pics.find(p => p.name.toLowerCase().trim() === pName));

    const errors: string[] = [];
    if (!activity_date) errors.push("Tanggal kosong atau salah format");
    if (!activity) errors.push("Kegiatan wajib diisi");
    if (costError) errors.push(`Biaya '${values[10]}' bukan berupa angka`);
    if (rawCat && !categoryMatch) errors.push(`Kategori '${rawCat}' tidak ditemukan`);
    if (rawSubCat && !subCategoryMatch) errors.push(`Sub Category '${rawSubCat}' tidak ditemukan`);
    if (rawPicNames.length > 0) {
      rawPicNames.forEach((name, i) => {
        if (!picMatches[i]) errors.push(`PIC '${name}' tidak ditemukan`);
      });
    } else {
      errors.push("PIC wajib diisi");
    }
    if (!rawCat) errors.push("Kategori wajib diisi");

    const mappedData: ParsedDailyActivityRow = {
      tempId: `row-${rowNumber}`,
      activity_date,
      activity,
      institution_group,
      address,
      category_id: categoryMatch ? String(categoryMatch.id) : null,
      sub_category_id: subCategoryMatch ? String(subCategoryMatch.id) : null,
      focus,
      location,
      cost,
      description_result,
      document_link,
      pic_id: picMatches[0] ? String(picMatches[0].id) : null,
      category_name: rawCat,
      sub_category_name: rawSubCat,
      pic_names: rawPicNames
    };

    if (errors.length > 0) {
      errorRows.push({ ...mappedData, errors });
    } else {
      validRows.push(mappedData);
    }
  });

  return { validRows, errorRows };
}
