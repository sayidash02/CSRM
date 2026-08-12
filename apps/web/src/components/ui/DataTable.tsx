import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Filter } from 'lucide-react';

export type ColumnDef<T> = {
  header: string;
  accessor?: string;
  sortable?: boolean;
  className?: string;
  render?: (item: T, idx: number) => React.ReactNode;
  filterOptions?: { label: string; value: string }[];
};

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
  serverSortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
}

export function DataTable<T>({ data, columns, onSortChange, serverSortConfig }: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!openFilter) return;
    const handleClickOutside = () => setOpenFilter(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openFilter]);

  const toggleFilter = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenFilter(openFilter === key ? null : key);
  };

  const selectFilter = (key: string, value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveFilters(prev => ({ ...prev, [key]: value }));
    setOpenFilter(null);
  };

  const getNestedValue = (obj: any, path: string) => {
    if (!path || obj == null) return undefined;
    return path.split('.').reduce((acc: any, part) => (acc != null ? acc[part] : undefined), obj);
  };

  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];

    if (Object.keys(activeFilters).length > 0) {
      sortableItems = sortableItems.filter(item => {
        for (const [key, filterValue] of Object.entries(activeFilters)) {
          if (filterValue === 'All' || filterValue === 'all') continue;
          const itemValue = getNestedValue(item, key);
          if (String(itemValue) !== String(filterValue)) {
            return false;
          }
        }
        return true;
      });
    }

    if (sortConfig !== null && !onSortChange) {
      sortableItems.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.key);
        const bValue = getNestedValue(b, sortConfig.key);

        if (aValue === bValue) return 0;
        
        if (aValue == null && bValue != null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (aValue != null && bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue, undefined, { numeric: true })
            : bValue.localeCompare(aValue, undefined, { numeric: true });
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }

        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig, activeFilters, onSortChange]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';

    if (onSortChange) {
      if (serverSortConfig && serverSortConfig.key === key && serverSortConfig.direction === 'asc') {
        direction = 'desc';
      }
      onSortChange(key, direction);
      return;
    }

    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-full">
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground bg-muted/90 backdrop-blur z-10 sticky top-0">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3 font-medium ${col.sortable ? 'cursor-pointer hover:bg-muted/80' : ''} ${col.className || ''} relative`}
                  onClick={() => col.sortable && col.accessor ? requestSort(col.accessor) : undefined}
                >
                  <div className="flex items-center gap-1 justify-between">
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && col.accessor && (sortConfig?.key === col.accessor || serverSortConfig?.key === col.accessor) && (
                        (serverSortConfig?.key === col.accessor ? serverSortConfig.direction : sortConfig?.direction) === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
                    </div>
                    {col.filterOptions && col.accessor && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => toggleFilter(col.accessor!, e)}
                          aria-label={`Filter ${col.header}`}
                          aria-expanded={openFilter === col.accessor}
                          className={`p-1 rounded hover:bg-muted ${activeFilters[col.accessor] && activeFilters[col.accessor] !== 'All' ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                        >
                          <Filter className="h-3 w-3" />
                        </button>
                        {openFilter === col.accessor && (
                          <div className="absolute top-full right-0 mt-1 w-40 bg-card border border-border rounded-md shadow-lg z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="max-h-60 overflow-y-auto py-1">
                              {col.filterOptions.map((opt) => (
                                <div
                                  key={opt.value}
                                  className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-muted ${activeFilters[col.accessor!] === opt.value || (!activeFilters[col.accessor!] && opt.value === 'All') ? 'bg-muted/50 font-medium text-primary' : 'text-foreground'}`}
                                  onClick={(e) => selectFilter(col.accessor!, opt.value, e)}
                                >
                                  {opt.label}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.length > 0 ? (
              sortedData.map((item, idx) => (
                <tr key={(item as any).id ?? idx} className="hover:bg-muted/50 transition-colors">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`px-4 py-3 align-top ${col.className || ''}`}>
                      {col.render ? col.render(item, idx) : (col.accessor ? getNestedValue(item, col.accessor) : null)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
