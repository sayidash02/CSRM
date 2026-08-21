import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page?: number;
  currentPage?: number;
  limit?: number;
  totalItems?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export function Pagination({
  page,
  currentPage,
  limit = 50,
  totalItems = 0,
  totalPages = 1,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const activePage = page ?? currentPage ?? 1;
  const [jumpPage, setJumpPage] = useState<string>(activePage.toString());

  // Sync local input state if the external page prop changes
  useEffect(() => {
    setJumpPage(activePage.toString());
  }, [activePage]);

  if (totalItems === 0) return null;

  const startItem = (activePage - 1) * limit + 1;
  const endItem = Math.min(activePage * limit, totalItems);

  // Simple page numbers: 1, 2, ..., totalPages
  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= activePage - 1 && i <= activePage + 1)) {
      pages.push(i);
    } else if (i === activePage - 2 || i === activePage + 2) {
      pages.push('...');
    }
  }

  const displayPages = pages.filter((p, idx, arr) => p !== '...' || arr[idx - 1] !== '...');

  const handleJump = () => {
    const parsed = parseInt(jumpPage, 10);
    if (isNaN(parsed)) {
      setJumpPage(activePage.toString());
      return;
    }

    let targetPage = parsed;
    if (targetPage < 1) targetPage = 1;
    if (targetPage > totalPages) targetPage = totalPages;

    if (targetPage !== activePage) {
      onPageChange(targetPage);
    } else {
      setJumpPage(activePage.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJump();
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-line bg-white sm:px-5">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(activePage - 1)}
          disabled={activePage === 1}
          className="relative inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-slate hover:bg-paper-2 disabled:opacity-50"
        >
          Sebelumnya
        </button>
        <button
          onClick={() => onPageChange(activePage + 1)}
          disabled={activePage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-slate hover:bg-paper-2 disabled:opacity-50"
        >
          Berikutnya
        </button>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className="text-[12px] text-slate font-mono">
            Menampilkan <span className="font-semibold text-ink">{startItem}</span> –{' '}
            <span className="font-semibold text-ink">{endItem}</span> dari{' '}
            <span className="font-semibold text-ink">{totalItems}</span> data
          </p>

          {onLimitChange && (
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="text-[12px] font-mono border border-line rounded-lg bg-paper/40 px-2 py-1 text-ink outline-none focus:border-forest"
            >
              <option value={10}>10 per hal</option>
              <option value={50}>50 per hal</option>
              <option value={100}>100 per hal</option>
            </select>
          )}

          <div className="flex items-center gap-1.5 text-[12px] text-slate">
            <span>Ke hal:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onBlur={handleJump}
              onKeyDown={handleKeyDown}
              className="w-14 text-[12px] font-mono border border-line rounded-lg bg-paper/40 px-2 py-1 text-ink outline-none focus:border-forest text-center"
            />
          </div>
        </div>

        <div>
          <nav className="isolate inline-flex -space-x-px rounded-lg shadow-2xs" aria-label="Pagination">
            <button
              onClick={() => onPageChange(activePage - 1)}
              disabled={activePage === 1}
              className="relative inline-flex items-center rounded-l-lg px-2.5 py-1.5 text-slate-2 border border-line bg-white hover:bg-paper/60 focus:z-20 disabled:opacity-40"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            {displayPages.map((p, i) =>
              p === '...' ? (
                <span
                  key={`ellipsis-${i}`}
                  className="relative inline-flex items-center px-3 py-1.5 text-[12px] font-mono font-medium text-slate border border-line bg-white"
                >
                  ...
                </span>
              ) : (
                <button
                  key={`page-${p}`}
                  onClick={() => onPageChange(p as number)}
                  className={`relative inline-flex items-center px-3 py-1.5 text-[12px] font-mono font-medium border border-line transition-colors ${
                    activePage === p
                      ? 'z-10 bg-forest text-white border-forest font-semibold'
                      : 'text-ink bg-white hover:bg-paper/60'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => onPageChange(activePage + 1)}
              disabled={activePage === totalPages}
              className="relative inline-flex items-center rounded-r-lg px-2.5 py-1.5 text-slate-2 border border-line bg-white hover:bg-paper/60 focus:z-20 disabled:opacity-40"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
