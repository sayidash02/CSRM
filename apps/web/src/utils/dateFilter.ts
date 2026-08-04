export function filterByDateRange<T>(
  items: T[], 
  dateKey: keyof T, 
  range: { start?: string; end?: string }
): T[] {
  if (!range.start && !range.end) return items;
  
  return items.filter(item => {
    const itemDateVal = item[dateKey];
    if (!itemDateVal) return false;
    
    // Extract just the YYYY-MM-DD part for comparison
    const itemDateStr = String(itemDateVal).split('T')[0];
    
    let isValid = true;
    if (range.start && itemDateStr < range.start) isValid = false;
    if (range.end && itemDateStr > range.end) isValid = false;
    
    return isValid;
  });
}
