export function filterByDateRange<T>(
  items: T[], 
  dateKey: keyof T, 
  range?: { start?: string; end?: string }
): T[] {
  if (!Array.isArray(items)) return [];
  if (!range || (!range.start?.trim() && !range.end?.trim())) return items;
  
  const start = range.start?.trim();
  const end = range.end?.trim();
  
  return items.filter(item => {
    const itemDateVal = item[dateKey];
    if (!itemDateVal) return false;
    
    let itemDateStr = '';
    if (itemDateVal instanceof Date) {
      if (isNaN(itemDateVal.getTime())) return false;
      itemDateStr = itemDateVal.toISOString().split('T')[0];
    } else if (typeof itemDateVal === 'string') {
      itemDateStr = itemDateVal.split('T')[0].trim();
    } else {
      return false;
    }
    
    if (start && itemDateStr < start) return false;
    if (end && itemDateStr > end) return false;
    
    return true;
  });
}

