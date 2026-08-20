import React, { useState, useMemo, useEffect, useRef } from "react";
import { apiClient } from '../../lib/apiClient';
import { Edit2, ExternalLink, Trash2, Search, Plus, Download, RotateCcw, History, FileSpreadsheet, ChevronDown, Image } from "lucide-react";

import { parseSharePointLinks } from '../../components/ui/sharePointLinks';


import { ImportExcelModal } from "./ImportExcelModal";
import { DailyActivityForm, emptyDailyDraft } from "./DailyActivityForm";
import { PhotoGalleryAttachmentInput } from "./PhotoGalleryAttachmentInput";
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { RestoreConfirmModal } from '../../components/ui/RestoreConfirmModal';

import { DateRangeFilter, DateRange } from "../../components/ui/DateRangeFilter";
import { AuditHistoryDrawer } from "../../components/ui/AuditHistoryDrawer";

// Types
export interface DailyActivity {
  id: number | string;
  activity_date: string;
  activity: string;
  institution_group?: string | null;
  stakeholder_id?: string | number | null;
  address: string;
  focus: string;
  location: string;
  cost: number;
  pic_ids: (string | number)[];
  category_id: string | number;
  sub_category_id: string | number;
  keterangan: string | null;
  hasil: string | null;
  kesimpulan?: string | null;
  next_plan?: string | null;
  /** Legacy compatibility value; new writes derive it from keterangan + hasil. */
  description_result: string | null;
  document_link: string | null;
  updated_at?: string;
  // Included relations from backend
  pics?: any[];
  pic?: any;
  category?: any;
  sub_category?: any;
  category_name?: string;
  sub_category_name?: string;
  stakeholder?: any;
}
// Helpers
const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const formatDate = (d?: string | Date | null) => {
  if (!d) return "-";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "-";
  return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

function TopBar({ 
  title, subtitle, onAdd, addLabel, showSearch, searchValue, onSearch, 
  onExportRekap, onExportMomWorkbook, onExportFullWorkbook,
  children, categories, catFilter, onCatFilterChange, subCategories, subCatFilter, onSubCatFilterChange, showDeleted 
}: {
  title: string; subtitle?: string; onAdd?: () => void; addLabel?: string;
  showSearch?: boolean; searchValue?: string; onSearch?: (v: string) => void;
  onExportRekap?: () => void;
  onExportMomWorkbook?: () => void;
  onExportFullWorkbook?: () => void;
  children?: React.ReactNode;
  categories?: any[]; catFilter?: string; onCatFilterChange?: (v: string) => void;
  subCategories?: any[]; subCatFilter?: string; onSubCatFilterChange?: (v: string) => void;
  showDeleted?: boolean;
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0 gap-3 flex-wrap">
      <div className="shrink-0">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 font-mono">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        {showSearch && (
          <>
            {categories && (
              <select 
                value={catFilter} 
                onChange={(e) => onCatFilterChange?.(e.target.value)}
                className="px-3 py-1.5 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="All">Semua Kategori</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {subCategories && (
              <select 
                value={subCatFilter} 
                onChange={(e) => onSubCatFilterChange?.(e.target.value)}
                className="px-3 py-1.5 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring max-w-[150px] truncate"
              >
                <option value="All">Semua Sub Kategori</option>
                {subCategories
                  .filter((s: any) => catFilter === "All" || catFilter === undefined || String(s.category_id) === String(catFilter))
                  .map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={searchValue} onChange={e => onSearch?.(e.target.value)} placeholder="Cari…"
                className="pl-8 pr-3 py-1.5 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring w-44 placeholder:text-muted-foreground" />
            </div>
          </>
        )}

        {/* Dedicated Direct MOM Button */}
        <button
          onClick={onExportMomWorkbook}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md transition-colors shadow-xs"
          title="Unduh All-in-One Workbook (Rekap + Notulensi MOM tiap kegiatan)"
        >
          <FileSpreadsheet size={14} />
          <span>Download MOM (Excel)</span>
        </button>

        {/* Export Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)} 
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
          >
            <Download size={13} />
            Export
            <ChevronDown size={12} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-1 w-64 bg-white border border-border rounded-lg shadow-lg z-50 py-1.5 text-xs animate-in fade-in-50 zoom-in-95">
              <button
                onClick={() => { setShowExportMenu(false); onExportRekap?.(); }}
                className="w-full text-left px-3.5 py-2 hover:bg-muted flex flex-col transition-colors"
              >
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Download size={13} className="text-blue-600" /> Export Rekap Master (Excel)
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Tabel rekapitulasi semua kegiatan</span>
              </button>

              <button
                onClick={() => { setShowExportMenu(false); onExportMomWorkbook?.(); }}
                className="w-full text-left px-3.5 py-2 hover:bg-muted flex flex-col transition-colors border-t border-border/50"
              >
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <FileSpreadsheet size={13} className="text-emerald-600" /> Export All-in-One (Rekap + MOMs)
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">1 File Excel: Master sheet + Tab notulensi tiap kegiatan</span>
              </button>

              {onExportFullWorkbook && (
                <button
                  onClick={() => { setShowExportMenu(false); onExportFullWorkbook?.(); }}
                  className="w-full text-left px-3.5 py-2 hover:bg-muted flex flex-col transition-colors border-t border-border/50"
                >
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Download size={13} className="text-indigo-600" /> Export CRMS Full Workbook
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">Semua 7 modul operasional perusahaan</span>
                </button>
              )}
            </div>
          )}
        </div>

        {!showDeleted && onAdd && <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-blue-700 transition-colors"><Plus size={13} />{addLabel ?? "Tambah"}</button>}
      </div>
    </div>
  );
}

export default function DailyActivitiesModule({ activeYear, onExport, showToast }: { activeYear: string; onExport: (l: string, payload?: any) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<DailyActivity[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 50, totalItems: 0, totalPages: 0 });
  const [references, setReferences] = useState({ pics: [], categories: [], sub_categories: [] });
  const [addDraft, setAddDraft] = useState({ ...emptyDailyDraft });
  const [showDeleted, setShowDeleted] = useState(false);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [subCatFilter, setSubCatFilter] = useState("All");
  const [dateRange, setDateRange] = useState<DateRange>({ start: "", end: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<string>('activity_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<DailyActivity | null>(null);
  const [toDelete, setToDelete] = useState<DailyActivity | null>(null);
  const [toRestore, setToRestore] = useState<DailyActivity | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | number | null>(null);

  // Debounce search & filters trigger fetchData
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [activeYear, showDeleted, page, limit, catFilter, subCatFilter, dateRange.start, dateRange.end, q, sortBy, sortDir]);

  useEffect(() => {
    fetchReferences();
  }, []);

  const fetchReferences = async () => {
    try {
      const res = await apiClient.get('/references');
      setReferences(res.data.data);
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal mengambil data referensi", "error");
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeYear) params.append('year', activeYear);
      params.append('is_deleted', String(showDeleted));
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (q) params.append('search', q);
      if (catFilter !== 'All') params.append('cat', catFilter);
      if (subCatFilter !== 'All') params.append('sub_cat', subCatFilter);
      if (dateRange.start) params.append('start', dateRange.start);
      if (dateRange.end) params.append('end', dateRange.end);
      params.append('sort_by', sortBy);
      params.append('sort_dir', sortDir);

      const res = await apiClient.get(`/daily-activities?${params.toString()}`);
      setItems(res.data.data);
      if (res.data.meta) setMeta(res.data.meta);
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal mengambil data kegiatan", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (d: Omit<DailyActivity, "id">) => {
    try {
      await apiClient.post('/daily-activities', d);
      fetchData();
      showToast("Kegiatan baru berhasil disimpan", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menyimpan data", "error");
    }
  };

  const handleUpdate = async (d: Omit<DailyActivity, "id">) => {
    if (!editing) return;
    try {
      await apiClient.put(`/daily-activities/${editing.id}`, d);
      fetchData();
      setEditing(null);
      showToast("Data kegiatan berhasil diperbarui", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number, activityName?: string) => {
    try {
      await apiClient.delete(`/daily-activities/${id}`);
      fetchData();
      showToast(`Kegiatan '${activityName || ''}' berhasil dihapus`, "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menghapus data", "error");
    }
  };

  const handleRestore = async (id: string | number) => {
    try {
      await apiClient.patch(`/daily-activities/${id}/restore`);
      showToast("Data berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };

  const handleDownloadSingleMom = async (id: string | number, activityName: string, date: string) => {
    try {
      showToast("Menyiapkan lembar Daily Notes (MOM)...", "info");
      const res = await apiClient.get(`/daily-activities/${id}/mom`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (activityName || 'Kegiatan').replace(/[/\\?%*:|"<>]/g, ' ').trim().substring(0, 35);
      const dateStr = formatDate(date).replace(/\s+/g, '_');
      link.setAttribute('download', `MOM_${safeTitle}_${dateStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("Lembar Daily Notes (MOM) berhasil diunduh", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal mengunduh lembar Daily Notes", "error");
    }
  };

  const handleExportMomWorkbook = async () => {
    try {
      showToast("Menyiapkan All-in-One Workbook (Rekap + MOMs)...", "info");
      const params = new URLSearchParams();
      if (activeYear && activeYear !== 'Semua' && activeYear !== 'All') params.append('year', activeYear);
      params.append('is_deleted', String(showDeleted));
      if (q) params.append('search', q);
      if (catFilter !== 'All') params.append('cat', catFilter);
      if (subCatFilter !== 'All') params.append('sub_cat', subCatFilter);
      if (dateRange.start) params.append('start', dateRange.start);
      if (dateRange.end) params.append('end', dateRange.end);

      const res = await apiClient.get(`/daily-activities/export/mom-workbook?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Daily_Activities_MOM_Workbook_${activeYear || 'All'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("Workbook Daily Activities (Rekap + MOMs) berhasil diunduh", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal mengekspor All-in-One Workbook", "error");
    }
  };

  const handleExportRekapMaster = async () => {
    try {
      showToast("Sedang menyiapkan data export rekap...", "info");
      const params = new URLSearchParams();
      if (activeYear && activeYear !== 'Semua' && activeYear !== 'All') params.append('year', activeYear);
      params.append('is_deleted', String(showDeleted));
      params.append('no_paginate', 'true');
      if (q) params.append('search', q);
      if (catFilter !== 'All') params.append('cat', catFilter);
      if (subCatFilter !== 'All') params.append('sub_cat', subCatFilter);
      if (dateRange.start) params.append('start', dateRange.start);
      if (dateRange.end) params.append('end', dateRange.end);
      params.append('sort_by', sortBy);
      params.append('sort_dir', sortDir);

      const res = await apiClient.get(`/daily-activities?${params.toString()}`);
      const rawData = Array.isArray(res.data.data) ? res.data.data : [];

      const exportItems = rawData.map((a: any) => ({
        ...a,
        category_name: a.category?.name || references.categories?.find((c: any) => String(c.id) === String(a.category_id))?.name || "-",
        sub_category_name: a.sub_category?.name || references.sub_categories?.find((s: any) => String(s.id) === String(a.sub_category_id))?.name || "-"
      }));

      const exportColumns = [
        { header: "Tanggal", key: "activity_date", width: 15 },
        { header: "Daily Title / Kegiatan", key: "activity", width: 40 },
        { header: "Attendees / Instansi", key: "institution_group", width: 25 },
        { header: "Venue (Tempat)", key: "address", width: 30 },
        { header: "Lokasi", key: "location", width: 20 },
        { header: "PIC (JSP)", key: "pic_names", width: 25 },
        { header: "Biaya", key: "cost", width: 20 },
        { header: "Category", key: "category_name", width: 20 },
        { header: "Sub Category", key: "sub_category_name", width: 25 },
        { header: "Keterangan Pertemuan", key: "keterangan", width: 35 },
        { header: "Hasil Pertemuan", key: "hasil", width: 35 },
        { header: "Kesimpulan", key: "kesimpulan", width: 35 },
        { header: "Next Plan", key: "next_plan", width: 35 },
        { header: "Supporting Documents", key: "document_link", width: 30 }
      ];

      const exportData = exportItems.map((a: any) => ({
        ...a,
        activity_date: formatDate(a.activity_date),
        cost: formatIDR(a.cost),
        pic_names: a.pics?.map((p: any) => p.name).join(", ") || "-"
      }));

      onExport("Daily Activities", { sheetName: `Daily Activities ${activeYear || 'Semua'}`, columns: exportColumns, data: exportData });
    } catch (e) {
      console.error(e);
      showToast("Gagal mengambil data untuk export", "error");
    }
  };

  const columns: ColumnDef<DailyActivity>[] = useMemo(() => [
    { header: "No", render: (_, i) => <span className="text-xs text-muted-foreground font-mono">{(meta.page - 1) * meta.limit + i + 1}</span> },
    { header: "Tanggal", accessor: "activity_date", sortable: true, render: (a) => <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{formatDate(a.activity_date)}</span> },
    { header: "Daily Title / Kegiatan", accessor: "activity", sortable: true, render: (a) => <div className="text-sm font-medium text-foreground whitespace-normal max-w-[200px]">{a.activity}</div> },
    { header: "Fokus", accessor: "focus", sortable: true, render: (a) => <div className="text-xs text-muted-foreground whitespace-normal max-w-[130px]">{a.focus || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Attendees / Instansi & Venue", accessor: "institution_group", sortable: true, render: (a) => (
      <div className="max-w-[200px]">
        <div className="text-sm font-medium text-foreground whitespace-normal line-clamp-2">{a.stakeholder?.name || a.institution_group || <span className="text-muted-foreground/50">—</span>}</div>
        {a.address && <div className="text-xs text-muted-foreground mt-0.5 whitespace-normal line-clamp-1">📍 {a.address}</div>}
      </div>
    )},
    { header: "Lokasi", accessor: "location", sortable: true, render: (a) => <div className="text-xs text-foreground max-w-[120px] whitespace-normal">{a.location || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Biaya", accessor: "cost", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.cost ? `Rp ${Number(a.cost).toLocaleString('id-ID')}` : '-'}</span> },
    { header: "PIC (JSP)", accessor: "pics", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.pics && a.pics.length > 0 ? a.pics.map((p: any) => p.name).join(', ') : '-'}</span> },
    { header: "Category", accessor: "category.name", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.category?.name || a.category_name || '-'}</span> },
    { header: "Sub Category", accessor: "sub_category_name", sortable: true },
    { header: "Keterangan", accessor: "keterangan", sortable: true, render: (a) => <div className="text-xs text-foreground whitespace-normal leading-relaxed max-w-[180px] line-clamp-3" title={a.keterangan || ''}>{a.keterangan || (!a.hasil ? a.description_result : null) || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Hasil", accessor: "hasil", sortable: true, render: (a) => <div className="text-xs text-foreground whitespace-normal leading-relaxed max-w-[180px] line-clamp-3" title={a.hasil || ''}>{a.hasil || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Kesimpulan", accessor: "kesimpulan", sortable: true, render: (a) => <div className="text-xs text-foreground whitespace-normal leading-relaxed max-w-[160px] line-clamp-3" title={a.kesimpulan || ''}>{a.kesimpulan || <span className="text-muted-foreground/50">—</span>}</div> },
    { 
      header: "Dokumentasi", 
      className: "text-center whitespace-nowrap", 
      render: (a) => {
        const links = parseSharePointLinks(a.document_link);
        if (links.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
        if (links.length === 1) {
          const l = links[0];
          const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(l) || l.startsWith('/uploads/');
          const fullUrl = l.startsWith('http') ? l : `http://localhost:3000${l.replace(/^file:\/\//, '').replace(/^\/+/, '/')}`;
          return (
            <a 
              href={fullUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors" 
              title={l}
            >
              {isImg ? <Image size={12} className="text-blue-600" /> : <ExternalLink size={12} />}
              <span>1 File</span>
            </a>
          );
        }
        return (
          <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200" title={`${links.length} file dokumentasi terlampir`}>
            <Image size={12} className="text-emerald-600" />
            <span>{links.length} Foto</span>
          </div>
        );
      } 
    },
    { 
      header: "Daily Notes (MOM)", 
      className: "text-center whitespace-nowrap", 
      render: (a) => (
        <button 
          onClick={() => handleDownloadSingleMom(a.id, a.activity, a.activity_date)} 
          title={`Unduh lembar Daily Notes / Notulensi MOM: ${a.activity}`} 
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 rounded-md border border-emerald-300 transition-all shadow-2xs active:scale-95"
        >
          <FileSpreadsheet size={13} className="text-emerald-600" />
          <span>Unduh MOM</span>
        </button>
      ) 
    },
    { header: "Aksi", render: (a) => showDeleted ? (
      <div className="flex items-center justify-end">
        <button 
          onClick={() => setToRestore(a)} 
          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1"
        >
          <RotateCcw size={12} />
          Restore
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => { setSelectedHistoryId(a.id); setHistoryDrawerOpen(true); }} title="Riwayat Perubahan" className="p-1 rounded hover:bg-gray-100 text-muted-foreground hover:text-gray-800 transition-colors"><History size={12} /></button>
        <button onClick={() => setEditing(a)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={12} /></button>
        <button onClick={() => setToDelete(a)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
      </div>
    )}
  ], [showDeleted, meta.page, meta.limit]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar 
        title="Daily Activities" subtitle="Rekaman kegiatan harian & notulensi tim CRS" 
        onAdd={!showDeleted ? () => setShowForm(true) : undefined} addLabel="Tambah Kegiatan" 
        showDeleted={showDeleted}
        showSearch searchValue={q} onSearch={(val) => { setQ(val); setPage(1); }} 
        onExportRekap={handleExportRekapMaster}
        onExportMomWorkbook={handleExportMomWorkbook}
        onExportFullWorkbook={() => onExport("CRMS Full Workbook")}
        categories={references.categories}
        catFilter={catFilter}
        onCatFilterChange={(val) => { setCatFilter(val); setSubCatFilter("All"); setPage(1); }}
        subCategories={references.sub_categories}
        subCatFilter={subCatFilter}
        onSubCatFilterChange={(val) => { setSubCatFilter(val); setPage(1); }}
      >
        <div className="flex items-center gap-2 mr-2">
          <span className="text-sm font-medium text-foreground">Data Terhapus:</span>
          <input 
            type="checkbox" 
            checked={showDeleted} 
            onChange={(e) => { setShowDeleted(e.target.checked); setPage(1); }} 
            className="w-4 h-4 rounded border-border text-blue-600 focus:ring-ring"
          />
        </div>
        <DateRangeFilter value={dateRange} onChange={(dr) => { setDateRange(dr); setPage(1); }} />
        {!showDeleted && (
          <button 
            onClick={() => setShowImport(true)} 
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
          >
            Import
          </button>
        )}
      </TopBar>

      <div className="flex-1 overflow-auto p-6">
        <DataTable
          columns={columns}
          data={items}
          isLoading={isLoading}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={(col, dir) => { setSortBy(col); setSortDir(dir); }}
        />
        <Pagination
          page={page}
          currentPage={page}
          totalPages={meta.totalPages || 1}
          totalItems={meta.totalItems || 0}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(lim) => { setLimit(lim); setPage(1); }}
        />
      </div>

      {showForm && (
        <DailyActivityForm
          onClose={() => setShowForm(false)} 
          onSave={handleCreate} 
          refs={references} 
          defaultValues={addDraft} 
          onDraftChange={setAddDraft} 
          onRefreshReferences={fetchReferences}
          showToast={showToast}
        />
      )}

      {editing && (
        <DailyActivityForm
          initial={editing} 
          onClose={() => setEditing(null)} 
          onSave={handleUpdate} 
          refs={references} 
          onRefreshReferences={fetchReferences}
          showToast={showToast}
          onDownloadMom={() => handleDownloadSingleMom(editing.id, editing.activity, editing.activity_date)}
        />
      )}

      {showImport && (
        <ImportExcelModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); fetchData(); }}
          refs={references}
        />
      )}

      {toDelete && (
        <DeleteConfirmModal
          title="Hapus Kegiatan"
          message={`Apakah Anda yakin ingin menghapus data kegiatan '${toDelete.activity}'?`}
          onConfirm={() => { handleDelete(toDelete.id, toDelete.activity); setToDelete(null); }}
          onClose={() => setToDelete(null)}
        />
      )}

      {toRestore && (
        <RestoreConfirmModal
          title="Pulihkan Kegiatan"
          message={`Apakah Anda yakin ingin memulihkan data kegiatan '${toRestore.activity}'?`}
          onConfirm={() => { handleRestore(toRestore.id); setToRestore(null); }}
          onClose={() => setToRestore(null)}
        />
      )}

      {historyDrawerOpen && (
        <AuditHistoryDrawer
          isOpen={historyDrawerOpen}
          onClose={() => setHistoryDrawerOpen(false)}
          entityType="daily_activities"
          entityId={selectedHistoryId}
        />
      )}
    </div>
  );
}
