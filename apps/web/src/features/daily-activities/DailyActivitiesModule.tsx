import React, { useState, useMemo, useEffect, useRef } from "react";
import { apiClient } from '../../lib/apiClient';
import { Edit2, ExternalLink, Trash2, Calendar, Search, Plus, Download, Settings, RotateCcw, History, FileSpreadsheet, ChevronDown, Image, Upload, Check, X } from "lucide-react";
import { SharePointLinkInput } from '../../components/ui/FileInput';
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { PicManagementModal } from './PicManagementModal';
import { ImportExcelModal } from "./ImportExcelModal";
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { RestoreConfirmModal } from '../../components/ui/RestoreConfirmModal';
import { Modal, ModalFooter } from "../../components/ui/Modal";
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

const inputCls = "w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

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

const emptyDailyDraft = {
  activity_date: "", activity: "", stakeholder_id: "", institution_group: "", address: "",
  focus: "", location: "", cost: "", pic_ids: [] as (string | number)[], category_id: "",
  sub_category_id: "", keterangan: "", hasil: "", kesimpulan: "", next_plan: "", description_result: "", document_link: ""
};

function PhotoAttachmentInput({
  value,
  onChange,
  activityDate,
  picName,
  showToast
}: {
  value: string | null;
  onChange: (url: string) => void;
  activityDate?: string;
  picName?: string;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayImageSrc = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (!value) return null;
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
      return value;
    }
    const cleanPath = value.replace(/^file:\/\//, '').replace(/\\/g, '/');
    if (cleanPath.startsWith('/uploads/')) {
      return `http://localhost:3000${cleanPath}`;
    }
    return `http://localhost:3000/uploads/${cleanPath.replace(/^\/+/, '')}`;
  }, [value, previewUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast?.("Ukuran file melebihi batas 5MB", "error");
      return;
    }

    if (file.type.startsWith('image/')) {
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('activity_date', activityDate || new Date().toISOString());
      formData.append('pic_name', picName || 'User');

      const res = await apiClient.post('/daily-activities/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedUrl = res.data?.data?.url || res.data?.url || '';
      onChange(uploadedUrl);
      setManualLink(uploadedUrl);
      showToast?.("Foto dokumentasi berhasil diunggah!", "success");
    } catch (err: any) {
      console.error("Upload error:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Gagal mengunggah foto ke server";
      showToast?.(msg, "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
    setManualLink('');
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyManualLink = () => {
    const trimmed = manualLink.trim();
    onChange(trimmed);
    showToast?.("Link dokumentasi berhasil disimpan", "success");
  };

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-50/80 p-3.5 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Image size={15} className="text-blue-600" />
          <span>Dokumentasi Foto / Lampiran Kegiatan</span>
        </span>
        <div className="flex rounded-md bg-slate-200/70 p-0.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'upload' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Upload Langsung
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'link' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Link SharePoint
          </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div className="flex flex-col gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
            className="hidden"
          />

          {value ? (
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs">
              {displayImageSrc && (
                <div className="relative w-16 h-16 rounded overflow-hidden border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center">
                  <img
                    src={displayImageSrc}
                    alt="Preview Dokumentasi"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Image size={20} className="text-slate-400 absolute" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <Check size={13} />
                  <span>File Dokumentasi Terlampir</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5" title={value}>
                  {value}
                </p>
                {value.startsWith('http') && (
                  <a
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-1"
                  >
                    <ExternalLink size={11} />
                    <span>Buka File Asli</span>
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors"
                >
                  Ganti
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={uploading}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                  title="Hapus foto / lampiran"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white/80 hover:bg-blue-50/40 p-4 rounded-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all group"
            >
              <div className="p-2 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                <Upload size={18} />
              </div>
              <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-700">
                {uploading ? "Sedang Mengunggah..." : "Klik untuk Pilih & Unggah Foto Dokumentasi"}
              </span>
              <span className="text-[11px] text-slate-400">
                Mendukung file JPG, PNG, WEBP, PDF (Maksimal 5MB)
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={manualLink}
              onChange={(e) => setManualLink(e.target.value)}
              placeholder="https://jawasatupower.sharepoint.com/..."
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleApplyManualLink}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors shadow-2xs"
            >
              Terapkan
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Tempel URL SharePoint atau link penyimpanan cloud resmi JSP.
          </p>
        </div>
      )}
    </div>
  );
}

function DailyForm({ 
  initial, defaultValues, onDraftChange, onClose, onSave, refs, onRefreshReferences, showToast, onDownloadMom 
}: { 
  initial?: DailyActivity; defaultValues?: typeof emptyDailyDraft; onDraftChange?: (v: typeof emptyDailyDraft) => void; 
  onClose: () => void; onSave: (d: Omit<DailyActivity, "id">) => void; 
  refs: { pics: any[], categories: any[], sub_categories: any[] }; 
  onRefreshReferences: () => void; showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  onDownloadMom?: () => void;
}) {
  const [showPicManager, setShowPicManager] = useState(false);

  const [f, setF] = useState(
    initial
      ? {
          activity_date: initial.activity_date ?? "",
          activity: initial.activity ?? "",
          stakeholder_id: initial.stakeholder_id != null ? String(initial.stakeholder_id) : (initial as any)?.stakeholder?.id ? String((initial as any).stakeholder.id) : "",
          institution_group: initial.institution_group ?? (initial as any)?.stakeholder?.name ?? "",
          address: initial.address ?? "",
          focus: initial.focus ?? "",
          location: initial.location ?? "",
          cost: initial.cost != null ? String(initial.cost) : "",
          pic_ids: initial.pics ? initial.pics.map((p: any) => String(p.id)) : (initial.pic_ids ? initial.pic_ids.map(id => String(id)) : []),
          category_id: initial.category_id != null ? String(initial.category_id) : "",
          sub_category_id: initial.sub_category_id != null ? String(initial.sub_category_id) : "",
          keterangan: initial.keterangan ?? (initial.hasil ? "" : initial.description_result ?? ""),
          hasil: initial.hasil ?? "",
          kesimpulan: initial.kesimpulan ?? "",
          next_plan: initial.next_plan ?? "",
          description_result: initial.description_result ?? "",
          document_link: initial.document_link ?? "",
        }
      : { ...emptyDailyDraft, ...defaultValues }
  );
  
  const set = (k: string, v: string | (string | number)[]) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next as any);
  };
  
  const handleClear = () => {
    setF({ ...emptyDailyDraft });
    onDraftChange?.({ ...emptyDailyDraft });
  };
  
  const handleSave = () => {
    const missing: string[] = (
      [
        [!f.activity_date, "Tanggal Kegiatan"],
        [!f.activity, "Daily Title / Kegiatan"],
        [!f.pic_ids || f.pic_ids.length === 0, "PIC"],
        [!f.category_id, "Category"],
        [!f.sub_category_id, "Sub Category"],
      ] as [boolean, string][]
    ).filter(([cond]) => cond).map(([, label]) => label);

    if (missing.length > 0) {
      if (showToast) {
        showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
      } else {
        alert(`Field berikut belum diisi: ${missing.join(", ")}`);
      }
      return;
    }
    const legacyDescription = [f.keterangan, f.hasil].filter(Boolean).join(" - ");
    onSave({
      ...f,
      pic_ids: f.pic_ids,
      stakeholder_id: f.stakeholder_id || null,
      cost: Number(f.cost) || 0,
      kesimpulan: f.kesimpulan || null,
      next_plan: f.next_plan || null,
      description_result: legacyDescription || null,
      document_link: f.document_link || null
    } as any);
    if (!initial) onDraftChange?.({ ...emptyDailyDraft });
    onClose();
  };
  
  return (
    <Modal title={initial ? "Edit Kegiatan & Daily Notes" : "Tambah Kegiatan Baru"} onClose={onClose}>
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[75vh] overflow-y-auto">
        <Field label="Tanggal Kegiatan" required><input type="date" value={String(f.activity_date).split('T')[0]} onChange={e => set("activity_date", e.target.value)} className={inputCls} /></Field>
        <div className="col-span-2"><Field label="Daily Title / Kegiatan" required><input type="text" value={f.activity} onChange={e => set("activity", e.target.value)} placeholder="Judul / Deskripsi kegiatan" className={inputCls} /></Field></div>
        
        <Field label="Lokasi (Desa / Wilayah)"><input type="text" value={f.location} onChange={e => set("location", e.target.value)} placeholder="Contoh: Cilamaya Girang" className={inputCls} /></Field>
        <Field label="Venue / Tempat"><input type="text" value={f.address} onChange={e => set("address", e.target.value)} placeholder="Contoh: Rumah Bapak Asep" className={inputCls} /></Field>
        <Field label="Fokus"><input type="text" value={f.focus} onChange={e => set("focus", e.target.value)} placeholder="Topik / Fokus kegiatan" className={inputCls} /></Field>
        <Field label="Biaya (Rp)"><CurrencyInput value={f.cost} onChange={val => set("cost", val)} className={`${inputCls} font-mono`} /></Field>

        <Field label="Category" required><select value={f.category_id} onChange={e => { const next = { ...f, category_id: e.target.value, sub_category_id: "" }; setF(next); if (!initial) onDraftChange?.(next as any); }} className={inputCls}><option value="">Pilih Category</option>{refs.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Sub Category" required><select value={f.sub_category_id} onChange={e => set("sub_category_id", e.target.value)} className={inputCls}><option value="">Pilih Sub Category</option>{refs.sub_categories.filter(s => String(s.category_id) === String(f.category_id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        
        <div className="col-span-3">
          <Field label="PIC (Tim Internal JSP)" required>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <div className="flex flex-wrap gap-1.5 p-2 bg-input-background border border-border rounded-md min-h-[42px]">
                  {refs.pics.length === 0 && <span className="text-xs text-muted-foreground self-center">Belum ada PIC</span>}
                  {refs.pics.map(p => {
                    const isSelected = f.pic_ids.map(String).includes(String(p.id));
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          let newIds = [...f.pic_ids.map(String)];
                          if (isSelected) {
                            newIds = newIds.filter(id => id !== String(p.id));
                          } else {
                            newIds.push(String(p.id));
                          }
                          set("pic_ids", newIds);
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-all active:scale-95 ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                            : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="button" onClick={() => setShowPicManager(true)} className="p-2 border border-border rounded-md hover:bg-muted text-muted-foreground shrink-0" title="Atur PIC"><Settings size={14} /></button>
            </div>
          </Field>
        </div>

        <div className="col-span-3">
          <Field label="Attendees Eksternal / Instansi" hint="Daftar peserta eksternal (dapat berupa teks baris baru atau penomoran 1., 2.)">
            <textarea
              rows={2}
              value={f.institution_group}
              onChange={e => set("institution_group", e.target.value)}
              placeholder="Contoh:&#10;1. Anggota kelompok nelayan ex class action&#10;2. Tokoh masyarakat setempat"
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>

        <div className="col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Keterangan Pertemuan"><textarea rows={3} value={f.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Latar belakang / agenda pertemuan" className={`${inputCls} resize-none`} /></Field>
          <Field label="Hasil Pertemuan"><textarea rows={3} value={f.hasil} onChange={e => set("hasil", e.target.value)} placeholder="Poin-poin pembahasan / hasil yang dicapai" className={`${inputCls} resize-none`} /></Field>
        </div>

        <div className="col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Kesimpulan"><textarea rows={2} value={f.kesimpulan} onChange={e => set("kesimpulan", e.target.value)} placeholder="Kesimpulan akhir dari pertemuan" className={`${inputCls} resize-none`} /></Field>
          <Field label="Next Plan"><textarea rows={2} value={f.next_plan} onChange={e => set("next_plan", e.target.value)} placeholder="Rencana tindak lanjut / action items" className={`${inputCls} resize-none`} /></Field>
        </div>

        <div className="col-span-3">
          <PhotoAttachmentInput
            value={f.document_link || null} 
            onChange={(url) => set("document_link", url)}
            activityDate={f.activity_date}
            picName={refs.pics.find(p => f.pic_ids.map(String).includes(String(p.id)))?.name}
            showToast={showToast}
          />
        </div>
      </div>
      <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-gray-50/50">
        <div>
          {initial && onDownloadMom && (
            <button
              type="button"
              onClick={onDownloadMom}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 rounded-md border border-emerald-300 transition-colors shadow-2xs"
              title="Unduh lembar Daily Notes (MOM) untuk kegiatan ini"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>Unduh MOM (Excel)</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!initial && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
            >
              Reset Form
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-blue-700 transition-colors shadow-xs"
          >
            {initial ? "Simpan Perubahan" : "Simpan Kegiatan"}
          </button>
        </div>
      </div>
      {showPicManager && <PicManagementModal onClose={() => { setShowPicManager(false); onRefreshReferences(); }} showToast={showToast} />}
    </Modal>
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
    { header: "Next Plan", accessor: "next_plan", sortable: true, render: (a) => <div className="text-xs text-foreground whitespace-normal leading-relaxed max-w-[160px] line-clamp-3" title={a.next_plan || ''}>{a.next_plan || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Docs", className: "text-center", render: (a) => a.document_link && a.document_link !== "[]" ? <a href={a.document_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 inline-block p-1" title="Buka Dokumen SharePoint"><ExternalLink size={12} /></a> : <span className="text-muted-foreground text-xs">—</span> },
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
        <DailyForm 
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
        <DailyForm 
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
