export function extractCellString(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') {
    const cell = val as {
      hyperlink?: unknown;
      result?: unknown;
      text?: unknown;
      richText?: Array<{ text?: unknown }>;
    };
    if (cell.hyperlink !== undefined && cell.hyperlink !== null) return String(cell.hyperlink).trim();
    if (cell.result !== undefined && cell.result !== null) return String(cell.result).trim();
    if (cell.text !== undefined && cell.text !== null) return String(cell.text).trim();
    if (Array.isArray(cell.richText)) {
      return cell.richText.map((part) => part.text || '').join('').trim();
    }
  }
  return String(val).trim();
}
