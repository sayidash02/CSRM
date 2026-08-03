import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export type ColumnDef<T> = {
  header: string;
  accessor?: string;
  sortable?: boolean;
  className?: string;
  render?: (item: T, idx: number) => React.ReactNode;
};

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
}

export function DataTable<T>({ data, columns }: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.key);
        const bValue = getNestedValue(b, sortConfig.key);

        if (aValue === bValue) return 0;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        
        if (aValue == null && bValue != null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (aValue != null && bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
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
                  className={`px-4 py-3 font-medium ${col.sortable ? 'cursor-pointer hover:bg-muted/80' : ''} ${col.className || ''}`}
                  onClick={() => col.sortable && col.accessor ? requestSort(col.accessor) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && col.accessor && sortConfig?.key === col.accessor && (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.length > 0 ? (
              sortedData.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/50 transition-colors">
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
