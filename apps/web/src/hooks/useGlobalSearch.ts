import { useState, useMemo } from 'react';
import { useDebounce } from './useDebounce';

export function extractSearchableText(obj: unknown, visited = new WeakSet()): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj).toLowerCase();
  }
  if (obj instanceof Date) {
    return obj.toISOString().toLowerCase();
  }
  if (typeof obj === 'object') {
    if (visited.has(obj)) return '';
    visited.add(obj);
    return Object.values(obj).map(val => extractSearchableText(val, visited)).join(' ');
  }
  return '';
}

export function useGlobalSearch<T>(items: T[]) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 300);
  
  const filtered = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (debouncedQ.trim() === "") return items;
    
    const searchTerms = debouncedQ.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return items.filter(item => {
      const itemText = extractSearchableText(item);
      return searchTerms.every(term => itemText.includes(term));
    });
  }, [items, debouncedQ]);
  
  return { q, setQ, filtered };
}

