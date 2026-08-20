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

export function parseCellNumber(val: any): number | null {
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
