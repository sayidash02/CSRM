import React, { useState } from "react";
import { FileSpreadsheet, Settings, Eye } from "lucide-react";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { Modal } from "../../components/ui/Modal";
import { PicManagementModal } from "./PicManagementModal";
import { CategoryManagementModal } from "./CategoryManagementModal";
import { PhotoGalleryAttachmentInput } from "./PhotoGalleryAttachmentInput";
import { SharepointLinksInput, type DocumentLink } from "../../components/ui/SharepointLinksInput";
import type { DailyActivity } from "./DailyActivitiesModule";

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

export const emptyDailyDraft = {
  activity_date: "", activity: "", stakeholder_id: "", institution_group: "", address: "",
  focus: "", location: "", cost: "", pic_ids: [] as (string | number)[], category_id: "",
  sub_category_id: "", keterangan: "", hasil: "", kesimpulan: "", next_plan: "", description_result: "",
  sharepoint_links: [] as DocumentLink[], photos: [], pendingFiles: [] as File[]
};

export function DailyActivityForm({
  initial, defaultValues, onDraftChange, onClose, onSave, refs, onRefreshReferences, showToast, onDownloadMom, onViewMom
}: {
  initial?: DailyActivity; defaultValues?: typeof emptyDailyDraft; onDraftChange?: (v: typeof emptyDailyDraft) => void;
  onClose: () => void; onSave: (d: Omit<DailyActivity, "id">) => void;
  refs: { pics: any[], categories: any[], sub_categories: any[] };
  onRefreshReferences: () => void; showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  onDownloadMom?: () => void;
  onViewMom?: () => void;
}) {
  const [showPicManager, setShowPicManager] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

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
          sharepoint_links: initial.sharepoint_links ?? [],
          photos: initial.photos ?? [],
          pendingFiles: [],
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
        [!f.activity, "Nama Kegiatan"],
        [!f.pic_ids || f.pic_ids.length === 0, "PIC (Tim CSR)"],
        [!f.category_id, "Kategori"],
        [!f.sub_category_id, "Sub Kategori"],
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
      sharepoint_links: f.sharepoint_links,
      photos: f.photos,
      pendingFiles: f.pendingFiles,
    } as any);
    if (!initial) onDraftChange?.({ ...emptyDailyDraft });
    onClose();
  };

  return (
    <Modal title={initial ? "Edit Kegiatan & Notulensi (MOM)" : "Tambah Kegiatan Baru"} onClose={onClose}>
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 max-h-[75vh] overflow-y-auto">
        <Field label="Tanggal Kegiatan" required><input type="date" value={f.activity_date ? String(f.activity_date).split('T')[0] : ""} onChange={e => set("activity_date", e.target.value)} className={inputCls} /></Field>
        <div className="col-span-1 md:col-span-2"><Field label="Nama Kegiatan" required><input type="text" value={f.activity} onChange={e => set("activity", e.target.value)} placeholder="Judul / Deskripsi kegiatan" className={inputCls} /></Field></div>

        <Field label="Lokasi (Desa / Wilayah)"><input type="text" value={f.location} onChange={e => set("location", e.target.value)} placeholder="Contoh: Cilamaya Girang" className={inputCls} /></Field>
        <Field label="Tempat / Venue Pertemuan"><input type="text" value={f.address} onChange={e => set("address", e.target.value)} placeholder="Contoh: Balai Desa / Rumah Warga" className={inputCls} /></Field>
        <Field label="Fokus / Topik Kegiatan"><input type="text" value={f.focus} onChange={e => set("focus", e.target.value)} placeholder="Topik / Fokus kegiatan" className={inputCls} /></Field>
        <Field label="Biaya (Rp)"><CurrencyInput value={f.cost} onChange={val => set("cost", val)} className={`${inputCls} font-mono`} /></Field>

        <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          <Field label="Kategori" required>
            <div className="flex gap-2">
              <select value={f.category_id} onChange={e => { const next = { ...f, category_id: e.target.value, sub_category_id: "" }; setF(next); if (!initial) onDraftChange?.(next as any); }} className={inputCls}>
                <option value="">Pilih Kategori</option>
                {refs.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowCategoryManager(true)} className="p-2 border border-border rounded-md hover:bg-muted text-muted-foreground shrink-0 cursor-pointer" title="Kelola Kategori & Sub Kategori"><Settings size={14} /></button>
            </div>
          </Field>
          <Field label="Sub Kategori" required>
            <div className="flex gap-2">
              <select value={f.sub_category_id} onChange={e => set("sub_category_id", e.target.value)} className={inputCls}>
                <option value="">Pilih Sub Kategori</option>
                {refs.sub_categories.filter(s => String(s.category_id) === String(f.category_id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowCategoryManager(true)} className="p-2 border border-border rounded-md hover:bg-muted text-muted-foreground shrink-0 cursor-pointer" title="Kelola Kategori & Sub Kategori"><Settings size={14} /></button>
            </div>
          </Field>
        </div>

        <div className="col-span-1 md:col-span-3">
          <Field label="PIC (Tim Internal CSR)" required>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <div className="flex flex-wrap gap-1.5 p-2 bg-input-background border border-border rounded-md min-h-[42px]">
                  {refs.pics.length === 0 && <span className="text-xs text-muted-foreground self-center">Belum ada PIC</span>}
                  {refs.pics.map(p => {
                    const isSelected = f.pic_ids.map(String).includes(String(p.id));
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          const strId = String(p.id);
                          const next = isSelected ? f.pic_ids.map(String).filter(id => id !== strId) : [...f.pic_ids.map(String), strId];
                          set("pic_ids", next);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {p.name}
                        {isSelected && <span className="text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="button" onClick={() => setShowPicManager(true)} className="p-2 border border-border rounded-md hover:bg-muted text-muted-foreground shrink-0 cursor-pointer" title="Kelola PIC"><Settings size={14} /></button>
            </div>
          </Field>
        </div>

        <div className="col-span-1 md:col-span-3">
          <Field label="Peserta Eksternal / Instansi Terkait (Attendees)" hint="Daftar peserta eksternal (dapat berupa teks baris baru atau penomoran 1., 2.)">
            <textarea
              rows={2}
              value={f.institution_group}
              onChange={e => set("institution_group", e.target.value)}
              placeholder="Contoh:&#10;1. Anggota kelompok nelayan&#10;2. Tokoh masyarakat setempat"
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>

        <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          <Field label="Keterangan & Latar Belakang"><textarea rows={3} value={f.keterangan} onChange={e => set("keterangan", e.target.value)} placeholder="Latar belakang / agenda pertemuan" className={`${inputCls} resize-none`} /></Field>
          <Field label="Hasil Pertemuan & Pembahasan"><textarea rows={3} value={f.hasil} onChange={e => set("hasil", e.target.value)} placeholder="Poin-poin pembahasan / hasil yang dicapai" className={`${inputCls} resize-none`} /></Field>
        </div>

        <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          <Field label="Kesimpulan Pertemuan"><textarea rows={2} value={f.kesimpulan} onChange={e => set("kesimpulan", e.target.value)} placeholder="Kesimpulan akhir dari pertemuan" className={`${inputCls} resize-none`} /></Field>
          <Field label="Rencana Tindak Lanjut (Next Plan)"><textarea rows={2} value={f.next_plan} onChange={e => set("next_plan", e.target.value)} placeholder="Rencana tindak lanjut / action items" className={`${inputCls} resize-none`} /></Field>
        </div>

        <div className="col-span-1 md:col-span-3">
          <SharepointLinksInput
            value={f.sharepoint_links}
            onChange={(links) => setF({ ...f, sharepoint_links: links })}
          />
        </div>

        <div className="col-span-1 md:col-span-3">
          <PhotoGalleryAttachmentInput
            value={f.photos || []}
            onChange={(photos) => setF({ ...f, photos })}
            activityId={initial?.id}
            activityDate={f.activity_date ? String(f.activity_date).split('T')[0] : ""}
            location={f.location || f.address || ""}
            activityTitle={f.activity || ""}
            picName={refs.pics.filter(p => f.pic_ids.map(String).includes(String(p.id))).map(p => p.name).join(', ')}
            onDateExtracted={(dateIso) => {
              if (!f.activity_date) {
                set("activity_date", dateIso);
              }
            }}
            onPendingFilesChange={(files) => setF({ ...f, pendingFiles: files })}
            showToast={showToast}
          />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-border bg-gray-50/50 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {initial && onViewMom && (
            <button
              type="button"
              onClick={onViewMom}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-forest hover:bg-forest-2 rounded-md transition-colors shadow-2xs cursor-pointer"
              title="Lihat lembar Notulensi (MOM) untuk kegiatan ini"
            >
              <Eye size={14} />
              <span>Lihat MOM</span>
            </button>
          )}
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
      {showCategoryManager && <CategoryManagementModal onClose={() => { setShowCategoryManager(false); onRefreshReferences(); }} showToast={showToast} onUpdated={onRefreshReferences} />}
    </Modal>
  );
}
