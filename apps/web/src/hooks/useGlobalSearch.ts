import { useState, useMemo } from 'react';
import { useDebounce } from './useDebounce';

function extractSearchableText(obj: any): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string' || typeof obj === 'number') return String(obj).toLowerCase();
  if (typeof obj === 'object') {
    return Object.values(obj).map(extractSearchableText).join(' ');
  }
  return '';
}

export function useGlobalSearch<T>(items: T[]) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  
  const filtered = useMemo(() => {
    if (debouncedQ.trim() === "") return items;
    
    const searchTerms = debouncedQ.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return items.filter(item => {
      const itemText = extractSearchableText(item);
      // All terms must exist somewhere in the row's text
      return searchTerms.every(term => itemText.includes(term));
    });
  }, [items, debouncedQ]);
  
  return { q, setQ, filtered };
}
