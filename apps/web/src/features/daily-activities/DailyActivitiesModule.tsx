import React, { useState, useEffect, useRef } from "react";
import { apiClient } from '../../lib/apiClient';
import { Search, Plus, Download, FileSpreadsheet, FileText, ChevronDown, X, ChevronLeft, ChevronRight, Image as ImageIcon, Layers } from "lucide-react";
import { ImportExcelModal } from "./ImportExcelModal";
import { DailyActivityForm, emptyDailyDraft } from "./DailyActivityForm";
import { PhotoGalleryAttachmentInput } from "./PhotoGalleryAttachmentInput";
import { DailyActivityTable } from "./DailyActivityTable";
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { RestoreConfirmModal } from '../../components/ui/RestoreConfirmModal';
import { DateRangeFilter, DateRange } from "../../components/ui/DateRangeFilter";
import { AuditHistoryDrawer } from "../../components/ui/AuditHistoryDrawer";
import { MomPreviewModal } from "./MomPreviewModal";
import { CategoryManagementModal } from "./CategoryManagementModal";
import type { DocumentLink } from "../../components/ui/SharepointLinksInput";

function PhotoLightboxModal({ 
  title, 
  photos, 
  initialIndex = 0, 
  onClose 
}: { 
  title: string; 
  photos: Array<{ id: string | number; url: string; original_name?: string; mime_type?: string }>; 
  initialIndex?: number; 
  onClose: () => void 
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const current = photos[currentIndex];

  if (!current) return null;

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="relative max-w-4xl w-full bg-white rounded-2xl border border-line overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-paper/80 border-b border-line">
          <div>
            <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
            <p className="text-xs text-slate mt-0.5 font-mono">
              Foto {currentIndex + 1} dari {photos.length} • {current.original_name || 'Dokumentasi'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate hover:text-ink hover:bg-paper-2 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Image Display */}
        <div className="relative flex-1 bg-black/95 flex items-center justify-center p-4 min-h-[360px] max-h-[65vh] overflow-hidden select-none">
          <img 
            src={current.url} 
            alt={current.original_name || "Dokumentasi"} 
            className="max-h-[60vh] max-w-full object-contain rounded shadow-lg"
          />

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all shadow-md cursor-pointer"
                title="Foto Sebelumnya"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all shadow-md cursor-pointer"
                title="Foto Selanjutnya"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails Footer */}
        {photos.length > 1 && (
          <div className="flex items-center gap-2 p-3 bg-paper border-t border-line overflow-x-auto">
            {photos.map((p, idx) => (
              <button
                key={p.id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  currentIndex === idx ? "border-forest shadow-sm scale-105" : "border-line opacity-60 hover:opacity-100"
                }`}
              >
                <img src={p.url} alt="thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
  photos: Array<{ id: string | number; url: string; original_name?: string; mime_type?: string }>;
  pendingFiles?: File[];
  updated_at?: string;
  sharepoint_links?: DocumentLink[] | null;
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
};function TopBar({ 
  title, subtitle, onAdd, addLabel, showSearch, searchValue, onSearch, 
  onExportRekap, onExportMomWorkbook, onExportMomDocx, onExportMomPdf, onExportFullWorkbook,
  children, categories, catFilter, onCatFilterChange, subCategories, subCatFilter, onSubCatFilterChange, showDeleted,
  onManageCategories
}: {
  title: string; subtitle?: string; onAdd?: () => void; addLabel?: string;
  showSearch?: boolean; searchValue?: string; onSearch?: (v: string) => void;
  onExportRekap?: () => void;
  onExportMomWorkbook?: () => void;
  onExportMomDocx?: () => void;
  onExportMomPdf?: () => void;
  onExportFullWorkbook?: () => void;
  children?: React.ReactNode;
  categories?: any[]; catFilter?: string; onCatFilterChange?: (v: string) => void;
  subCategories?: any[]; subCatFilter?: string; onSubCatFilterChange?: (v: string) => void;
  showDeleted?: boolean;
  onManageCategories?: () => void;
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
    <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-line shrink-0 gap-3 flex-wrap">
      <div className="shrink-0">
        <h1 className="text-[15px] font-semibold text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-[11px] text-slate font-mono mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        {showSearch && (
          <>
            {categories && (
              <select 
                value={catFilter} 
                onChange={(e) => onCatFilterChange?.(e.target.value)}
                className="px-3 py-1.5 text-[12px] bg-paper/50 rounded-lg border border-line text-ink outline-none focus:border-forest"
              >
                <option value="All">Semua Kategori</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {subCategories && (
              <select 
                value={subCatFilter} 
                onChange={(e) => onSubCatFilterChange?.(e.target.value)}
                className="px-3 py-1.5 text-[12px] bg-paper/50 rounded-lg border border-line text-ink outline-none focus:border-forest max-w-[150px] truncate"
              >
                <option value="All">Semua Sub Kategori</option>
                {subCategories
                  .filter((s: any) => catFilter === "All" || catFilter === undefined || String(s.category_id) === String(catFilter))
                  .map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-2" />
              <input value={searchValue} onChange={e => onSearch?.(e.target.value)} placeholder="Cari kegiatan…"
                className="pl-8 pr-3 py-1.5 text-[12px] bg-paper/50 rounded-lg border border-line text-ink outline-none focus:border-forest focus:bg-white w-48 placeholder:text-slate-2" />
            </div>
          </>
        )}

        {/* Dedicated Direct MOM Button */}
        <button
          onClick={onExportMomWorkbook}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-forest hover:bg-forest-2 text-white font-medium rounded-lg transition-colors shadow-2xs cursor-pointer"
          title="Unduh All-in-One Workbook (Rekap + Notulensi MOM tiap kegiatan)"
        >
          <FileSpreadsheet size={13} />
          <span>Unduh MOM (Excel)</span>
        </button>

        {/* Export Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)} 
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate border border-line bg-white rounded-lg hover:bg-paper-2 hover:text-ink transition-colors shadow-2xs cursor-pointer"
          >
            <Download size={13} />
            Ekspor Data
            <ChevronDown size={12} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-1.5 w-64 bg-white border border-line rounded-xl shadow-lg z-50 py-1.5 text-xs animate-in fade-in-50 zoom-in-95">
              <button
                onClick={() => { setShowExportMenu(false); onExportRekap?.(); }}
                className="w-full text-left px-3.5 py-2 hover:bg-paper/60 flex flex-col transition-colors cursor-pointer"
              >
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <Download size={13} className="text-forest" /> Ekspor Rekap Master (Excel)
                </span>
                <span className="text-[11px] text-slate mt-0.5">Tabel rekapitulasi seluruh kegiatan</span>
              </button>

              <button
                onClick={() => { setShowExportMenu(false); onExportMomWorkbook?.(); }}
                className="w-full text-left px-3.5 py-2 hover:bg-paper/60 flex flex-col transition-colors border-t border-line/60 cursor-pointer"
              >
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <FileSpreadsheet size={13} className="text-forest" /> Ekspor Rekap &amp; MOM (Excel)
                </span>
                <span className="text-[11px] text-slate mt-0.5">1 File Excel: Master sheet + Tab notulensi tiap kegiatan</span>
              </button>

              {onExportMomDocx && (
                <button
                  onClick={() => { setShowExportMenu(false); onExportMomDocx(); }}
                  className="w-full text-left px-3.5 py-2 hover:bg-paper/60 flex flex-col transition-colors border-t border-line/60 cursor-pointer"
                >
                  <span className="font-semibold text-ink flex items-center gap-1.5">
                    <FileText size={13} className="text-slate" /> Ekspor Notulensi MOM (Word)
                  </span>
                  <span className="text-[11px] text-slate mt-0.5">Dokumen DOCX dengan layout resmi MOM</span>
                </button>
              )}

              {onExportMomPdf && (
                <button
                  onClick={() => { setShowExportMenu(false); onExportMomPdf(); }}
                  className="w-full text-left px-3.5 py-2 hover:bg-paper/60 flex flex-col transition-colors border-t border-line/60 cursor-pointer"
                >
                  <span className="font-semibold text-ink flex items-center gap-1.5">
                    <FileText size={13} className="text-clay" /> Ekspor Notulensi MOM (PDF)
                  </span>
                  <span className="text-[11px] text-slate mt-0.5">Dokumen PDF siap dibagikan atau diarsipkan</span>
                </button>
              )}

              {onExportFullWorkbook && (
                <button
                  onClick={() => { setShowExportMenu(false); onExportFullWorkbook?.(); }}
                  className="w-full text-left px-3.5 py-2 hover:bg-paper/60 flex flex-col transition-colors border-t border-line/60 cursor-pointer"
                >
                  <span className="font-semibold text-ink flex items-center gap-1.5">
                    <Download size={13} className="text-forest" /> Ekspor CSRM Full Workbook
                  </span>
                  <span className="text-[11px] text-slate mt-0.5">Semua 7 modul operasional perusahaan</span>
                </button>
              )}
            </div>
          )}
        </div>

        {onManageCategories && (
          <button
            onClick={onManageCategories}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate border border-line bg-white rounded-lg hover:bg-paper-2 hover:text-ink transition-colors shadow-2xs cursor-pointer"
            title="Kelola & Kustomisasi Kategori dan Sub Kategori"
          >
            <Layers size={13} className="text-forest" />
            <span>Kelola Kategori</span>
          </button>
        )}

        {!showDeleted && onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-forest text-white rounded-lg hover:bg-forest-2 transition-colors shadow-2xs font-medium cursor-pointer"
          >
            <Plus size={13} />
            {addLabel ?? "Tambah Kegiatan"}
          </button>
        )}
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
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<DailyActivity | null>(null);
  const [toDelete, setToDelete] = useState<DailyActivity | null>(null);
  const [toRestore, setToRestore] = useState<DailyActivity | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | number | null>(null);
  const [viewingPhotos, setViewingPhotos] = useState<{ title: string; photos: Array<{ id: string | number; url: string; original_name?: string; mime_type?: string }>; initialIndex: number } | null>(null);
  const [viewingMomActivity, setViewingMomActivity] = useState<DailyActivity | null>(null);

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
      const { pendingFiles = [], photos: _photos, ...payload } = d as any;
      const response = await apiClient.post('/daily-activities', payload);
      const activityId = response.data?.data?.id;
      for (const file of pendingFiles as File[]) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('activity_id', String(activityId));
        await apiClient.post('/daily-activities/upload-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
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
      const { pendingFiles: _pendingFiles, photos: _photos, ...payload } = d as any;
      await apiClient.put(`/daily-activities/${editing.id}`, payload);
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

  type MomFormat = 'xlsx' | 'docx' | 'pdf';

  const handleDownloadSingleMom = async (id: string | number, activityName: string, date: string, format: MomFormat = 'xlsx') => {
    try {
      const formatLabel = format === 'docx' ? 'Word' : format === 'pdf' ? 'PDF' : 'Excel';
      showToast(`Menyiapkan lembar Daily Notes (MOM) ${formatLabel}...`, "info");
      const res = await apiClient.get(`/daily-activities/${id}/mom?format=${format}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (activityName || 'Kegiatan').replace(/[/\\?%*:|"<>]/g, ' ').trim().substring(0, 35);
      const dateStr = formatDate(date).replace(/\s+/g, '_');
      link.setAttribute('download', `MOM_${safeTitle}_${dateStr}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Lembar Daily Notes (MOM) ${formatLabel} berhasil diunduh`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal mengunduh lembar Daily Notes", "error");
    }
  };

  const handleExportMomFormat = async (format: MomFormat) => {
    try {
      const formatLabel = format === 'docx' ? 'Word' : format === 'pdf' ? 'PDF' : 'Excel';
      showToast(`Menyiapkan MOM gabungan (${formatLabel})...`, "info");
      const params = new URLSearchParams();
      if (activeYear && activeYear !== 'Semua' && activeYear !== 'All') params.append('year', activeYear);
      params.append('is_deleted', String(showDeleted));
      if (q) params.append('search', q);
      if (catFilter !== 'All') params.append('cat', catFilter);
      if (subCatFilter !== 'All') params.append('sub_cat', subCatFilter);
      if (dateRange.start) params.append('start', dateRange.start);
      if (dateRange.end) params.append('end', dateRange.end);

      params.append('format', format);
      const res = await apiClient.get(`/daily-activities/export/mom-workbook?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Daily_Activities_MOM_Workbook_${activeYear || 'All'}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(`MOM gabungan (${formatLabel}) berhasil diunduh`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal mengekspor All-in-One Workbook", "error");
    }
  };

  const handleExportMomWorkbook = () => handleExportMomFormat('xlsx');
  const handleExportMomDocx = () => handleExportMomFormat('docx');
  const handleExportMomPdf = () => handleExportMomFormat('pdf');

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
        { header: "Supporting Documents / Photos", key: "photos", width: 30 }
      ];

      const exportData = exportItems.map((a: any) => ({
        ...a,
        activity_date: formatDate(a.activity_date),
        cost: formatIDR(a.cost),
        pic_names: a.pics?.map((p: any) => p.name).join(", ") || "-",
        photos: a.photos?.length ? `${a.photos.length} foto dokumentasi` : "-"
      }));

      onExport("Daily Activities", { sheetName: `Daily Activities ${activeYear || 'Semua'}`, columns: exportColumns, data: exportData });
    } catch (e) {
      console.error(e);
      showToast("Gagal mengambil data untuk export", "error");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar 
        title="Daily Activities" subtitle="Rekaman kegiatan harian & notulensi tim CSR" 
        onAdd={!showDeleted ? () => setShowForm(true) : undefined} addLabel="Tambah Kegiatan" 
        showDeleted={showDeleted}
        showSearch searchValue={q} onSearch={(val) => { setQ(val); setPage(1); }} 
        onExportRekap={handleExportRekapMaster}
        onExportMomWorkbook={handleExportMomWorkbook}
        onExportMomDocx={handleExportMomDocx}
        onExportMomPdf={handleExportMomPdf}
        onExportFullWorkbook={() => onExport("CSRM Full Workbook")}
        categories={references.categories}
        catFilter={catFilter}
        onCatFilterChange={(val) => { setCatFilter(val); setSubCatFilter("All"); setPage(1); }}
        subCategories={references.sub_categories}
        subCatFilter={subCatFilter}
        onSubCatFilterChange={(val) => { setSubCatFilter(val); setPage(1); }}
        onManageCategories={() => setShowCategoryManager(true)}
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

      <DailyActivityTable
        items={items}
        meta={meta}
        showDeleted={showDeleted}
        onEdit={setEditing}
        onDelete={setToDelete}
        onRestore={setToRestore}
        onHistory={(id) => { setSelectedHistoryId(id); setHistoryDrawerOpen(true); }}
        onDownloadSingleMom={handleDownloadSingleMom}
        onViewMom={setViewingMomActivity}
        onViewPhotos={(a, idx) => setViewingPhotos({ title: `${formatDate(a.activity_date)} — ${a.activity}`, photos: a.photos || [], initialIndex: idx || 0 })}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(lim) => { setLimit(lim); setPage(1); }}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={(key, dir) => { setSortBy(key); setSortDir(dir); setPage(1); }}
      />
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
          onViewMom={() => setViewingMomActivity(editing)}
          onDownloadMom={() => handleDownloadSingleMom(editing.id, editing.activity, editing.activity_date, 'xlsx')}
        />
      )}

      {showImport && (
        <ImportExcelModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); fetchData(); }}
        />
      )}

      {toDelete && (
        <DeleteConfirmModal
           label={`${toDelete.activity}`}
           onConfirm={() => { handleDelete(toDelete.id, toDelete.activity); setToDelete(null); }}
           onCancel={() => setToDelete(null)}
        />
      )}

      {toRestore && (
        <RestoreConfirmModal
           label={`${toRestore.activity}`}
           onConfirm={() => { handleRestore(toRestore.id); setToRestore(null); }}
           onCancel={() => setToRestore(null)}
        />
      )}

      {viewingPhotos && (
        <PhotoLightboxModal
          title={viewingPhotos.title}
          photos={viewingPhotos.photos}
          initialIndex={viewingPhotos.initialIndex}
          onClose={() => setViewingPhotos(null)}
        />
      )}

      {viewingMomActivity && (
        <MomPreviewModal
          activity={viewingMomActivity}
          onClose={() => setViewingMomActivity(null)}
          onDownloadMom={handleDownloadSingleMom}
          onViewPhoto={(photos, idx) => setViewingPhotos({ 
            title: `${formatDate(viewingMomActivity.activity_date)} — ${viewingMomActivity.activity}`, 
            photos, 
            initialIndex: idx 
          })}
        />
      )}

      {historyDrawerOpen && (
        <AuditHistoryDrawer
          isOpen={historyDrawerOpen}
          onClose={() => setHistoryDrawerOpen(false)}
          entityType="daily_activities"
          entityId={selectedHistoryId}
          references={references}
        />
      )}

      {showCategoryManager && (
        <CategoryManagementModal
          onClose={() => setShowCategoryManager(false)}
          showToast={showToast}
          onUpdated={fetchReferences}
        />
      )}
    </div>
  );
}
