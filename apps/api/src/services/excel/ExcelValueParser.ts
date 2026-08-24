import { extractCellString } from './ExcelCellUtils';

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

  // If multi-line (e.g. "Senin, 15/04/2024\nDepan Housing"), take the first line
  if (str.includes('\n')) {
    str = str.split('\n')[0].trim();
  }

  // Remove Indonesian day names at start (e.g., "Senin, ", "Selasa ", etc.)
  str = str.replace(/^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)[,\s]*/i, '').trim();

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

  // Try parsing ISO YYYY-MM-DD or YYYY/MM/DD (e.g., "2026-08-15", "2024/04/15")
  const yyyymmddMatch = str.match(/\b(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1], 10);
    const month = parseInt(yyyymmddMatch[2], 10) - 1;
    const day = parseInt(yyyymmddMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month, day));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Try parsing DD/MM/YYYY or DD-MM-YYYY (e.g., "15/04/2024", "15-04-2024", "15/4/2024")
  const ddmmyyyyMatch = str.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    let year = parseInt(ddmmyyyyMatch[3], 10);
    if (year < 100) year += 2000;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month, day));
      if (!isNaN(d.getTime())) return d;
    }
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

export function parseCellNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val.result !== undefined && val.result !== null) {
    const num = Number(val.result);
    return isNaN(num) ? null : num;
  }
  let str = extractCellString(val).toLowerCase().trim();
  if (['-', '—', 'n/a', 'na', 'nil', 'none', ''].includes(str)) return null;

  str = str.replace(/(rp|idr|\s)/g, '');
  str = str.replace(/[,.]00$/, '');
  str = str.replace(/[.,]/g, '');
  str = str.replace(/[^0-9-]/g, '');

  if (!str || str === '-') return null;
  const num = Number(str);
  return isNaN(num) ? null : num;
}
