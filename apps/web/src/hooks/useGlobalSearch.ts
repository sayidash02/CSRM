import { useState, useMemo } from 'react';

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
  
  const filtered = useMemo(() => {
    if (q.trim() === "") return items;
    
    const searchTerms = q.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return items.filter(item => {
      const itemText = extractSearchableText(item);
      // All terms must exist somewhere in the row's text
      return searchTerms.every(term => itemText.includes(term));
    });
  }, [items, q]);
  
  return { q, setQ, filtered };
}
