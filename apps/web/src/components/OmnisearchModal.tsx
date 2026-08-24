import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  Calendar,
  Users,
  AlertTriangle,
  FileText,
  Leaf,
  MessageSquareWarning,
  TreePine,
  ArrowRight,
  Loader2,
  CornerDownLeft,
} from 'lucide-react';
import { apiClient } from '../lib/apiClient';

export type ModuleType =
  | 'dashboard'
  | 'daily'
  | 'stakeholder'
  | 'topissues'
  | 'proposals'
  | 'csr'
  | 'grievance'
  | 'lrp'
  | 'archive'
  | 'admin-users';

export interface SearchResultItem {
  id: string;
  module: ModuleType;
  moduleLabel: string;
  title: string;
  subtitle: string;
  date?: string | null;
  metadata?: Record<string, any>;
}

interface OmnisearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: ModuleType, searchKeyword?: string) => void;
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  daily: <Calendar size={15} className="text-forest" />,
  stakeholder: <Users size={15} className="text-ochre" />,
  topissues: <AlertTriangle size={15} className="text-clay" />,
  grievance: <MessageSquareWarning size={15} className="text-clay" />,
  proposals: <FileText size={15} className="text-forest-2" />,
  csr: <Leaf size={15} className="text-forest" />,
  lrp: <TreePine size={15} className="text-slate" />,
};

const MODULE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  daily: { bg: 'bg-forest/10', text: 'text-forest', label: 'Daily Activities' },
  stakeholder: { bg: 'bg-ochre/15', text: 'text-ochre', label: 'Stakeholder Engagement' },
  topissues: { bg: 'bg-clay/15', text: 'text-clay', label: 'Top Issues' },
  grievance: { bg: 'bg-clay/20', text: 'text-clay font-semibold', label: 'Grievance' },
  proposals: { bg: 'bg-forest-2/15', text: 'text-forest-2', label: 'Proposals' },
  csr: { bg: 'bg-forest/10', text: 'text-forest', label: 'CSR Projects' },
  lrp: { bg: 'bg-slate/15', text: 'text-slate', label: 'LRP' },
};

export function OmnisearchModal({ isOpen, onClose, onNavigate }: OmnisearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults([]);
      setCounts({});
      setActiveFilter('all');
    }
  }, [isOpen]);

  // Debounced API search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setCounts({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const handler = setTimeout(() => {
      apiClient
        .get<{ data: SearchResultItem[]; meta: { query: string; total: number; counts: Record<string, number> } }>(
          `/search?q=${encodeURIComponent(query.trim())}`
        )
        .then((res) => {
          setResults(res.data.data || []);
          setCounts(res.data.meta?.counts || {});
          setSelectedIndex(0);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 200);

    return () => clearTimeout(handler);
  }, [query]);

  // Filtered results by active tab
  const displayedResults = useMemo(() => {
    if (activeFilter === 'all') return results;
    return results.filter((item) => item.module === activeFilter);
  }, [results, activeFilter]);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      onNavigate(item.module, query.trim());
      onClose();
    },
    [onNavigate, query, onClose]
  );

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < displayedResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayedResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayedResults[selectedIndex]) {
        handleSelect(displayedResults[selectedIndex]);
      }
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;
    const selectedElement = listElement.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const totalResults = results.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-[10vh] backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_50px_-12px_rgba(20,32,27,0.25)] transition-all animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-line px-4 py-3.5 sm:px-5">
          <Search size={18} className="text-forest shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveFilter('all');
            }}
            placeholder="Cari di semua 7 modul (kegiatan, isu, keluhan, proposal, nama desa)..."
            className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-slate-2 outline-none font-sans"
          />
          {loading && <Loader2 size={16} className="animate-spin text-forest mr-2" />}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-2 hover:text-ink hover:bg-paper-2 transition-colors mr-1"
              aria-label="Hapus kata kunci"
            >
              <X size={15} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate">
            ESC
          </kbd>
        </div>

        {/* Filter Pills Bar (When Results Exist) */}
        {totalResults > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line/60 bg-paper/30 px-4 py-2 text-xs scrollbar-none">
            <button
              onClick={() => {
                setActiveFilter('all');
                setSelectedIndex(0);
              }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-forest text-white shadow-2xs'
                  : 'bg-white text-slate hover:text-ink hover:bg-paper border border-line/70'
              }`}
            >
              Semua ({totalResults})
            </button>
            {Object.entries(counts).map(([mod, count]) => {
              if (count === 0) return null;
              const badge = MODULE_BADGES[mod];
              return (
                <button
                  key={mod}
                  onClick={() => {
                    setActiveFilter(mod);
                    setSelectedIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
                    activeFilter === mod
                      ? 'bg-forest text-white shadow-2xs'
                      : 'bg-white text-slate hover:text-ink hover:bg-paper border border-line/70'
                  }`}
                >
                  {badge?.label || mod} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Results List or Empty State */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-line/40">
          {!query.trim() && (
            <div className="py-12 px-6 text-center text-slate">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-forest/10 text-forest">
                <Search size={20} />
              </div>
              <p className="text-[13px] font-semibold text-ink">Universal Omnisearch CSRM</p>
              <p className="mt-1 text-[12px] text-slate-2 max-w-sm mx-auto leading-relaxed">
                Ketik nama desa (mis. <em>Cilamaya</em>), kelompok nelayan, topik isu, nomor proposal, atau kata kunci apa pun.
              </p>
            </div>
          )}

          {query.trim() && !loading && displayedResults.length === 0 && (
            <div className="py-12 px-6 text-center text-slate">
              <p className="text-[13px] font-medium text-ink">Tidak ada data yang cocok</p>
              <p className="mt-1 text-[12px] text-slate-2">
                Tidak ditemukan hasil untuk pencarian &ldquo;{query}&rdquo; pada kategori ini.
              </p>
            </div>
          )}

          {displayedResults.map((item, index) => {
            const isSelected = index === selectedIndex;
            const badge = MODULE_BADGES[item.module] || {
              bg: 'bg-paper-2',
              text: 'text-slate',
              label: item.moduleLabel,
            };
            const icon = MODULE_ICONS[item.module] || <Search size={15} />;

            return (
              <div
                key={`${item.module}-${item.id}`}
                data-index={index}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`group flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
                  isSelected ? 'bg-forest/10 text-ink shadow-2xs' : 'hover:bg-paper/60 text-ink'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white border border-line shrink-0 mt-0.5 shadow-2xs">
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold text-ink truncate leading-tight">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate truncate mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-slate-2 group-hover:text-forest">
                  <span className="hidden sm:inline font-mono text-[11px] font-medium text-forest">
                    Buka
                  </span>
                  <CornerDownLeft size={13} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex items-center justify-between border-t border-line bg-paper/50 px-4 py-2.5 text-[11px] text-slate-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded bg-white border border-line px-1 py-0.5 font-mono text-[9px] text-slate">
                ↑
              </kbd>
              <kbd className="rounded bg-white border border-line px-1 py-0.5 font-mono text-[9px] text-slate">
                ↓
              </kbd>
              <span>Navigasi</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded bg-white border border-line px-1.5 py-0.5 font-mono text-[9px] text-slate">
                ↵
              </kbd>
              <span>Pilih</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded bg-white border border-line px-1.5 py-0.5 font-mono text-[9px] text-slate">
                ESC
              </kbd>
              <span>Tutup</span>
            </span>
          </div>

          <div className="font-mono text-[10px] text-forest font-semibold">
            Universal Search
          </div>
        </div>
      </div>
    </div>
  );
}
