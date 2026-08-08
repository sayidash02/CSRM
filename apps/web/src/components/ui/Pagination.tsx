import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function Pagination({ page, limit, totalItems, totalPages, onPageChange, onLimitChange }: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);

  // Simple page numbers: 1, 2, ..., totalPages
  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    // Show first, last, current, and adjacent pages
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (i === page - 2 || i === page + 2) {
      pages.push('...');
    }
  }
  
  // Deduplicate '...'
  const displayPages = pages.filter((p, idx, arr) => p !== '...' || arr[idx - 1] !== '...');

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-white sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Previous</button>
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Next</button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-700">
            Menampilkan <span className="font-medium">{startItem}</span> - <span className="font-medium">{endItem}</span> dari <span className="font-medium">{totalItems}</span>
          </p>
          <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} className="text-sm border-gray-300 rounded-md focus:ring-primary focus:border-primary">
            <option value={10}>10 per halaman</option>
            <option value={50}>50 per halaman</option>
            <option value={100}>100 per halaman</option>
          </select>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            {displayPages.map((p, i) => (
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">...</span>
              ) : (
                <button key={`page-${p}`} onClick={() => onPageChange(p as number)} className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${page === p ? 'z-10 bg-primary text-white focus-visible:outline-primary' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>
                  {p}
                </button>
              )
            ))}
            <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
