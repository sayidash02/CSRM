import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { apiClient } from '../../lib/apiClient';
import { Edit2, Trash2, Search, Plus, Download, RotateCcw, History, Image, Upload, X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { RestoreConfirmModal } from '../../components/ui/RestoreConfirmModal';
import { AuditHistoryDrawer } from '../../components/ui/AuditHistoryDrawer';
import { SharepointLinksInput, type DocumentLink } from '../../components/ui/SharepointLinksInput';
import { SharepointLinksBadge } from '../../components/ui/SharepointLinksBadge';

export interface GrievancePhoto {
  id: number | string;
  url: string;
  original_name?: string;
  mime_type?: string;
  size_bytes?: number;
  sort_order?: number;
}

export interface Grievance {
  id: number | string;
  register_no: string;
  log_date: string;
  complainant_name: string;
  address: string;
  phone: string;
  category: string;
  significance: string;
  description: string;
  location: string;
  investigation: string;
  resolution: string | null;
  feedback: string | null;
  status: string;
  completion_date: string | null;
  remarks: string | null;
  photos?: GrievancePhoto[];
  sharepoint_links?: DocumentLink[] | null;
}

const formatDate = (d: string | Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const inputCls = "w-full text-[13px] rounded-lg border border-line bg-paper/50 px-3 py-2 text-ink outline-none focus:border-forest focus:bg-white transition-all";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate block mb-1.5">{label}{required && <span className="text-clay ml-0.5">*</span>}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-2 mt-1">{hint}</p>}
    </div>
  );
}

function PhotoLightboxModal({ 
  title, 
  photos, 
  initialIndex = 0, 
  onClose 
}: { 
  title: string; 
  photos: GrievancePhoto[]; 
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

function DeleteConfirm({ label, onCancel, onConfirm }: { label: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center z-[60] p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl border border-line shadow-2xl w-full max-w-sm p-6 text-ink" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-clay/10 flex items-center justify-center shrink-0"><Trash2 size={16} className="text-clay" /></div>
          <div>
            <div className="text-[15px] font-semibold text-ink">Hapus data?</div>
            <p className="text-xs text-slate mt-1 leading-relaxed">"<span className="font-medium text-ink">{label}</span>" akan dihapus (soft delete) dan tidak muncul di daftar modul aktif.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-medium border border-line rounded-lg hover:bg-paper-2 transition-colors">Batal</button>
          <button onClick={onConfirm} className="px-4 py-2 text-xs font-medium bg-clay text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-1.5"><Trash2 size={12} />Hapus</button>
        </div>
      </div>
    </div>
  );
}

function TopBar({ title, subtitle, onAdd, addLabel, showSearch, searchValue, onSearch, onExport, children, showDeleted }: {
  title: string; subtitle?: string; onAdd?: () => void; addLabel?: string;
  showSearch?: boolean; searchValue?: string; onSearch?: (v: string) => void;
  onExport?: () => void; children?: React.ReactNode; showDeleted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-line shrink-0 gap-3 flex-wrap shadow-2xs">
      <div className="shrink-0">
        <h1 className="text-[15px] font-semibold text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-[11px] text-slate font-mono mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        {showSearch && (
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-2" />
            <input value={searchValue} onChange={e => onSearch?.(e.target.value)} placeholder="Cari pengaduan…"
              className="pl-8 pr-3 py-1.5 text-[12px] bg-paper/50 rounded-lg border border-line text-ink outline-none focus:border-forest focus:bg-white w-48 placeholder:text-slate-2" />
          </div>
        )}
        <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate border border-line bg-white rounded-lg hover:bg-paper-2 hover:text-ink transition-colors shadow-2xs cursor-pointer"><Download size={13} />Ekspor Data</button>
        {!showDeleted && onAdd && (
          <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-forest text-white rounded-lg hover:bg-forest-2 transition-colors shadow-2xs font-medium cursor-pointer">
            <Plus size={13} />{addLabel ?? "Catat Pengaduan Baru"}
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "On Going": "bg-forest/10 text-forest border border-forest/20",
    "On Progress": "bg-forest/10 text-forest border border-forest/20",
    Open: "bg-ochre/15 text-ochre border border-ochre/30",
    Resolved: "bg-forest/20 text-forest font-semibold border border-forest/30",
    Closed: "bg-paper-2 text-slate border border-line",
    Cancelled: "bg-clay/10 text-clay border border-clay/20",
    Declined: "bg-clay/10 text-clay border border-clay/20"
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium font-mono ${map[status] ?? "bg-paper-2 text-slate border border-line"}`}>{status}</span>;
}

function SignificanceBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    Low: "bg-paper-2 text-slate border border-line",
    Medium: "bg-ochre/10 text-ochre border border-ochre/20",
    High: "bg-clay/10 text-clay border border-clay/20 font-medium",
    Critical: "bg-clay text-white font-semibold"
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono ${map[level] ?? ""}`}>{level}</span>;
}

export const emptyGrievanceDraft = {
  register_no: "", log_date: "", complainant_name: "", address: "", phone: "",
  category: "", significance: "Low", description: "", location: "",
  investigation: "", resolution: "", feedback: "", status: "Open",
  completion_date: "", remarks: "", sharepoint_links: [] as DocumentLink[]
};

export function GrievanceForm({
  initial,
  onClose,
  onSave,
  showToast,
  defaultValues,
  onDraftChange,
  onPhotosUpdated
}: {
  initial?: Grievance;
  onClose: () => void;
  onSave: (d: Omit<Grievance, "id">, pendingFiles?: File[]) => void;
  showToast?: (msg: string, type?: "success"|"error"|"info") => void;
  defaultValues?: typeof emptyGrievanceDraft;
  onDraftChange?: (v: typeof emptyGrievanceDraft) => void;
  onPhotosUpdated?: () => void;
}) {
  const [f, setF] = useState(
    initial
      ? {
          register_no: initial.register_no ?? "",
          log_date: initial.log_date ? initial.log_date.split("T")[0] : "",
          complainant_name: initial.complainant_name ?? "",
          address: initial.address ?? "",
          phone: initial.phone ?? "",
          category: initial.category ?? "",
          significance: initial.significance ?? "Low",
          description: initial.description ?? "",
          location: initial.location ?? "",
          investigation: initial.investigation ?? "",
          resolution: initial.resolution ?? "",
          feedback: initial.feedback ?? "",
          status: initial.status ?? "Open",
          completion_date: initial.completion_date ? initial.completion_date.split("T")[0] : "",
          remarks: initial.remarks ?? "",
          sharepoint_links: initial.sharepoint_links ?? []
        }
      : { ...emptyGrievanceDraft, ...defaultValues }
  );

  const [existingPhotos, setExistingPhotos] = useState<GrievancePhoto[]>(initial?.photos || []);
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: any) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial && onDraftChange) onDraftChange(next);
  };

  const handleClear = () => {
    setF({ ...emptyGrievanceDraft });
    setPendingFiles([]);
    if (onDraftChange) onDraftChange({ ...emptyGrievanceDraft });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        showToast?.(`File "${file.name}" ditolak. Hanya JPG/PNG/WebP diperbolehkan`, "error");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast?.(`File "${file.name}" melebihi batas 5MB`, "error");
        return;
      }
    }

    if (initial?.id) {
      setUploadingPhoto(true);
      try {
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await apiClient.post(`/grievance/${initial.id}/photos`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          setExistingPhotos(prev => [...prev, res.data.data]);
        }
        showToast?.("Foto dokumentasi berhasil ditambahkan", "success");
        onPhotosUpdated?.();
      } catch (err: any) {
        showToast?.(err.response?.data?.error || "Gagal mengunggah foto", "error");
      } finally {
        setUploadingPhoto(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } else {
      const newPending = files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setPendingFiles(prev => [...prev, ...newPending]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteExistingPhoto = async (photoId: string | number) => {
    if (!initial?.id) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus foto dokumentasi ini dari server?')) {
      return;
    }
    try {
      await apiClient.delete(`/grievance/${initial.id}/photos/${photoId}`);
      setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
      showToast?.("Foto dokumentasi berhasil dihapus", "success");
      onPhotosUpdated?.();
    } catch (err: any) {
      showToast?.(err.response?.data?.error || "Gagal menghapus foto", "error");
    }
  };

  const handleDeletePendingPhoto = (index: number) => {
    setPendingFiles(prev => {
      const target = prev[index];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = () => {
    const missing: string[] = (
      [
        [!f.register_no?.trim(), "No. Registrasi"],
        [!f.log_date, "Tanggal Masuk"],
        [!f.complainant_name, "Nama Pelapor"],
        [!f.category, "Kategori"],
        [!f.description, "Deskripsi"],
        [!f.status, "Status"],
      ] as [boolean, string][]
    ).filter(([cond]) => cond).map(([, label]) => label);

    if (missing.length > 0) {
      if (showToast) {
        showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
      }
      return;
    }

    onSave(
      {
        register_no: f.register_no.trim(),
        log_date: f.log_date,
        complainant_name: f.complainant_name,
        address: f.address,
        phone: f.phone,
        category: f.category,
        significance: f.significance,
        description: f.description,
        location: f.location,
        investigation: f.investigation,
        resolution: f.resolution || null,
        feedback: f.feedback || null,
        status: f.status,
        completion_date: f.completion_date || null,
        remarks: f.remarks || null,
        sharepoint_links: f.sharepoint_links
      },
      pendingFiles.map(p => p.file)
    );
    if (!initial && onDraftChange) onDraftChange({ ...emptyGrievanceDraft });
    onClose();
  };

  return (
    <Modal title={initial ? "Edit Data Pengaduan (Grievance)" : "Registrasi Pengaduan Baru (Grievance)"} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="No. Registrasi" required hint="Contoh: 001/JSP/Grievance/09/03/2026">
            <input 
              type="text" 
              value={f.register_no} 
              onChange={e => set("register_no", e.target.value)} 
              placeholder="Masukkan nomor registrasi..." 
              className={`${inputCls} font-mono`} 
            />
          </Field>
          <Field label="Tanggal Masuk" required>
            <input type="date" value={f.log_date} onChange={e => set("log_date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Status Penanganan" required>
            <select value={f.status} onChange={e => set("status", e.target.value)} className={inputCls}>
              <option value="Open">Open (Terbuka)</option>
              <option value="On Progress">On Progress (Sedang Ditangani)</option>
              <option value="Resolved">Resolved (Terselesaikan)</option>
              <option value="Closed">Closed (Ditutup)</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Nama Pelapor" required>
            <input type="text" value={f.complainant_name} onChange={e => set("complainant_name", e.target.value)} placeholder="Nama warga / pelapor" className={inputCls} />
          </Field>
          <Field label="Nomor Kontak / Telepon">
            <input type="text" value={f.phone} onChange={e => set("phone", e.target.value)} placeholder="Contoh: 08123456789" className={inputCls} />
          </Field>
          <Field label="Alamat Pelapor">
            <input type="text" value={f.address} onChange={e => set("address", e.target.value)} placeholder="Dusun / Desa pelapor" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Kategori Keluhan" required>
            <input type="text" value={f.category} onChange={e => set("category", e.target.value)} placeholder="Misal: Lingkungan, Sosial, Akses" className={inputCls} />
          </Field>
          <Field label="Tingkat Signifikansi">
            <select value={f.significance} onChange={e => set("significance", e.target.value)} className={inputCls}>
              <option value="Low">Low (Rendah)</option>
              <option value="Medium">Medium (Sedang)</option>
              <option value="High">High (Tinggi)</option>
              <option value="Critical">Critical (Kritis)</option>
            </select>
          </Field>
          <Field label="Lokasi Kejadian">
            <input type="text" value={f.location} onChange={e => set("location", e.target.value)} placeholder="Titik lokasi masalah" className={inputCls} />
          </Field>
        </div>

        <Field label="Deskripsi Detail Pengaduan" required>
          <textarea rows={2} value={f.description} onChange={e => set("description", e.target.value)} placeholder="Rincian keluhan atau masalah yang disampaikan warga" className={`${inputCls} resize-none`} />
        </Field>

        <Field label="Hasil Investigasi Lapangan">
          <textarea rows={2} value={f.investigation} onChange={e => set("investigation", e.target.value)} placeholder="Fakta temuan lapangan dan hasil verifikasi tim CSR" className={`${inputCls} resize-none`} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tindakan Resolusi / Kesepakatan">
            <textarea rows={2} value={f.resolution} onChange={e => set("resolution", e.target.value)} placeholder="Solusi atau tindakan tindak lanjut penyelesaian" className={`${inputCls} resize-none`} />
          </Field>
          <Field label="Umpan Balik Pelapor (Feedback)">
            <textarea rows={2} value={f.feedback} onChange={e => set("feedback", e.target.value)} placeholder="Tanggapan / konfirmasi dari pelapor atas penyelesaian" className={`${inputCls} resize-none`} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal Selesai Penanganan">
            <input type="date" value={f.completion_date} onChange={e => set("completion_date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Catatan Tambahan (Remarks)">
            <input type="text" value={f.remarks} onChange={e => set("remarks", e.target.value)} placeholder="Catatan internal tim CSR" className={inputCls} />
          </Field>
        </div>

        <SharepointLinksInput
          value={f.sharepoint_links}
          onChange={(links) => set("sharepoint_links", links)}
        />

        {/* FOTO DOKUMENTASI & LAMPIRAN */}
        <div className="pt-2 border-t border-line">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <Image size={14} className="text-forest" />
              Foto Dokumentasi & Berita Acara
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-forest bg-forest/10 hover:bg-forest/20 rounded-md border border-forest/30 transition-all cursor-pointer shadow-2xs"
            >
              <Upload size={12} />
              {uploadingPhoto ? "Mengunggah..." : "Tambah Foto"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>

          {/* List of Existing & Pending Photos */}
          {existingPhotos.length === 0 && pendingFiles.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-line rounded-xl p-4 text-center bg-paper/30 hover:bg-forest/5 hover:border-forest/40 transition-all cursor-pointer"
            >
              <Image size={24} className="mx-auto text-slate-2 mb-1" />
              <p className="text-xs text-slate font-medium">Klik untuk melampirkan foto dokumentasi / berita acara</p>
              <p className="text-[10px] text-slate-2 mt-0.5">Format JPG, PNG, atau WebP (Maks. 5MB per foto)</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto p-1 bg-paper/20 rounded-xl border border-line">
              {/* Existing Photos */}
              {existingPhotos.map((photo) => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-line aspect-square bg-paper shadow-2xs">
                  <img src={photo.url} alt={photo.original_name || "Foto"} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingPhoto(photo.id)}
                      className="p-1 rounded-md bg-clay text-white hover:opacity-90 transition-opacity shadow"
                      title="Hapus foto"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Pending Photos */}
              {pendingFiles.map((pending, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-forest/40 aspect-square bg-forest/5 shadow-2xs">
                  <img src={pending.preview} alt="Pending" className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 px-1 py-0.2 bg-forest text-[9px] font-mono text-white rounded">Baru</span>
                  <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleDeletePendingPhoto(idx)}
                      className="p-1 rounded-md bg-clay text-white hover:opacity-90 transition-opacity shadow"
                      title="Hapus"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ModalFooter
        onClose={onClose}
        onSave={handleSave}
        onClear={!initial ? handleClear : undefined}
        saveLabel={initial ? "Simpan Perubahan" : "Simpan Pengaduan"}
        isEdit={!!initial}
      />
    </Modal>
  );
}

export default function GrievanceModule({ activeYear, onExport, showToast }: { activeYear: string; onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<Grievance[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [addDraft, setAddDraft] = useState({ ...emptyGrievanceDraft });
  const [viewingPhotos, setViewingPhotos] = useState<{ title: string; photos: GrievancePhoto[]; initialIndex: number } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const yearParam = activeYear ? `year=${activeYear}` : '';
      const isDeletedParam = `is_deleted=${showDeleted}`;
      const queryParams = [yearParam, isDeletedParam].filter(Boolean).join('&');
      const res = await apiClient.get(`/grievance?${queryParams}`);
      setItems(res.data.data || []);
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal mengambil data", "error");
    }
  }, [activeYear, showDeleted, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async (d: Omit<Grievance, "id">, pendingPhotos?: File[]) => {
    try {
      const year = parseInt(activeYear) || new Date().getFullYear();
      const res = await apiClient.post('/grievance', { ...d, year });
      const createdId = res.data.data?.id;

      if (createdId && pendingPhotos && pendingPhotos.length > 0) {
        for (const file of pendingPhotos) {
          const form = new FormData();
          form.append('file', file);
          await apiClient.post(`/grievance/${createdId}/photos`, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      if (showToast) showToast(`Pengaduan '${d.complainant_name}' berhasil ditambahkan`, "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<Grievance, "id">) => {
    try {
      const year = parseInt(activeYear) || new Date().getFullYear();
      await apiClient.put(`/grievance/${id}`, { ...d, year });
      if (showToast) showToast(`Pengaduan '${d.complainant_name}' berhasil diperbarui`, "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number, name?: string) => {
    try {
      await apiClient.delete(`/grievance/${id}`);
      if (showToast) showToast(`Pengaduan '${name || ''}' berhasil dihapus`, "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal menghapus data", "error");
    }
  };

  const handleRestore = async (id: string | number) => {
    try {
      await apiClient.patch(`/grievance/${id}/restore`);
      if (showToast) showToast("Pengaduan berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };

  const { q, setQ, filtered } = useGlobalSearch(items);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Grievance | null>(null);
  const [toDelete, setToDelete] = useState<Grievance | null>(null);
  const [toRestore, setToRestore] = useState<Grievance | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | number | null>(null);

  const displayed = filtered;

  const columns: ColumnDef<Grievance>[] = useMemo(() => [
    { 
      header: "No. Reg & Signifikansi", 
      accessor: "register_no", 
      sortable: true,
      filterOptions: [
        { label: "Semua Signifikansi", value: "All" },
        { label: "Low", value: "Low" },
        { label: "Medium", value: "Medium" },
        { label: "High", value: "High" },
        { label: "Critical", value: "Critical" }
      ],
      render: (g) => <div><span className="text-xs font-mono font-medium text-forest">{g.register_no}</span><div className="mt-1"><SignificanceBadge level={g.significance} /></div></div> 
    },
    { header: "Pelapor & Kontak", accessor: "complainant_name", sortable: true, render: (g) => <div><div className="text-[13px] font-medium text-ink">{g.complainant_name}</div><div className="text-xs text-slate mt-0.5">{g.phone}</div><div className="text-xs text-slate mt-0.5">{g.address}</div></div> },
    { header: "Tanggal & Kategori", accessor: "log_date", sortable: true, render: (g) => <div><div className="text-xs text-slate font-mono">{formatDate(g.log_date)}</div><div className="text-xs text-slate mt-0.5">{g.category}</div></div> },
    { header: "Deskripsi & Lokasi", accessor: "description", sortable: true, render: (g) => <div className="max-w-[200px] whitespace-normal"><div className="text-xs text-ink leading-relaxed line-clamp-2">{g.description}</div><div className="text-xs text-slate mt-0.5 line-clamp-1">📍 {g.location}</div></div> },
    { header: "Investigasi Lapangan", accessor: "investigation", sortable: true, render: (g) => <div className="max-w-[200px] whitespace-normal text-xs text-slate leading-relaxed line-clamp-2">{g.investigation || "—"}</div> },
    { header: "Resolusi & Solusi", accessor: "resolution", sortable: true, render: (g) => <div className="max-w-[200px] whitespace-normal text-xs text-slate leading-relaxed line-clamp-2">{g.resolution || "—"}</div> },
    { header: "Feedback Pelapor", accessor: "feedback", sortable: true, render: (g) => <div className="max-w-[200px] whitespace-normal text-xs text-slate leading-relaxed line-clamp-2">{g.feedback || "—"}</div> },
    { 
      header: "Status Penanganan", 
      accessor: "status", 
      sortable: true, 
      filterOptions: [
        { label: "Semua Status", value: "All" },
        { label: "Open", value: "Open" },
        { label: "On Progress", value: "On Progress" },
        { label: "Resolved", value: "Resolved" },
        { label: "Closed", value: "Closed" }
      ],
      render: (g) => <div><StatusBadge status={g.status} />{g.completion_date && <div className="text-[10px] text-slate font-mono mt-1">Selesai: {formatDate(g.completion_date)}</div>}</div> 
    },
    {
      header: "Dokumentasi",
      className: "text-center whitespace-nowrap",
      render: (g) => {
        const photos = g.photos || [];
        if (photos.length === 0) return <span className="text-slate-2 text-xs">—</span>;
        return (
          <button
            onClick={() => setViewingPhotos({ title: `${g.register_no} — ${g.complainant_name}`, photos, initialIndex: 0 })}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-forest bg-forest/10 hover:bg-forest/20 px-2 py-0.5 rounded-md border border-forest/20 transition-all cursor-pointer shadow-2xs"
            title={`Lihat ${photos.length} foto dokumentasi`}
          >
            <Image size={12} className="text-forest" />
            <span>{photos.length} Foto</span>
          </button>
        );
      }
    },
    {
      header: "Tautan",
      className: "text-center whitespace-nowrap",
      render: (g) => <SharepointLinksBadge links={g.sharepoint_links} />
    },
    { header: "Aksi", render: (g) => showDeleted ? (
      <div className="flex items-center justify-end">
        <button 
          onClick={() => setToRestore(g)} 
          className="px-2.5 py-1 text-xs font-medium text-forest bg-forest/10 hover:bg-forest/20 rounded-md border border-forest/30 flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw size={12} />
          Pulihkan
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => { setSelectedHistoryId(g.id); setHistoryDrawerOpen(true); }} title="Riwayat Perubahan" className="p-1.5 rounded-md hover:bg-paper-2 text-slate-2 hover:text-ink transition-colors cursor-pointer"><History size={13} /></button>
        <button onClick={() => setEditing(g)} title="Edit Pengaduan" className="p-1.5 rounded-md hover:bg-ochre/10 text-slate-2 hover:text-ochre transition-colors cursor-pointer"><Edit2 size={13} /></button>
        <button onClick={() => setToDelete(g)} title="Hapus Pengaduan" className="p-1.5 rounded-md hover:bg-clay/10 text-slate-2 hover:text-clay transition-colors cursor-pointer"><Trash2 size={13} /></button>
      </div>
    )}
  ], [showDeleted, activeYear]);

  const handleExportClick = () => {
    const exportData = displayed.map(g => ({
      "Register No": g.register_no,
      "Date": formatDate(g.log_date),
      "Complainant": g.complainant_name,
      "Category": g.category,
      "Significance": g.significance,
      "Description": g.description,
      "Location": g.location,
      "Status": g.status,
      "Investigation": g.investigation || "",
      "Resolution": g.resolution || "",
      "Complainant Feedback": g.feedback || "",
      "Remarks": g.remarks || "",
      "Jumlah Foto": g.photos?.length || 0
    }));
    onExport("Grievance", exportData);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-paper">
      <TopBar title="Grievance" subtitle="Pencatatan, investigasi, dan resolusi keluhan masyarakat" addLabel="Catat Pengaduan Baru" onAdd={() => setShowForm(true)} showDeleted={showDeleted} showSearch searchValue={q} onSearch={setQ} onExport={handleExportClick}>
        <div className="flex items-center gap-2 mr-2">
          <span className="text-[12px] font-medium text-slate">Data Terhapus:</span>
          <input 
            type="checkbox" 
            checked={showDeleted} 
            onChange={(e) => setShowDeleted(e.target.checked)} 
            className="w-4 h-4 rounded border-line text-forest focus:ring-forest cursor-pointer"
          />
        </div>
      </TopBar>
      <div className="flex-1 overflow-auto p-4 sm:p-5 flex flex-col">
        <div className="flex-1 min-h-0">
          <DataTable columns={columns} data={displayed} />
        </div>
      </div>
      {showForm && <GrievanceForm defaultValues={addDraft} onDraftChange={setAddDraft} onClose={() => setShowForm(false)} onSave={handleAdd} showToast={showToast} />}
      {editing && <GrievanceForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} showToast={showToast} onPhotosUpdated={fetchData} />}
      {toDelete && <DeleteConfirm label={`${toDelete.register_no} — ${toDelete.complainant_name}`} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id, toDelete.complainant_name); setToDelete(null); }} />}
      {toRestore && <RestoreConfirmModal label={toRestore.complainant_name || ''} onCancel={() => setToRestore(null)} onConfirm={() => { handleRestore(toRestore.id); setToRestore(null); }} />}
      {viewingPhotos && <PhotoLightboxModal title={viewingPhotos.title} photos={viewingPhotos.photos} initialIndex={viewingPhotos.initialIndex} onClose={() => setViewingPhotos(null)} />}
      <AuditHistoryDrawer isOpen={historyDrawerOpen} onClose={() => setHistoryDrawerOpen(false)} entityType="grievance" entityId={selectedHistoryId} />
    </div>
  );
}
