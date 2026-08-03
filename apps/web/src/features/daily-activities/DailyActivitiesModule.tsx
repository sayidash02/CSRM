import React, { useState, useMemo, useEffect } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { apiClient } from '../../lib/apiClient';
import { Edit2, ExternalLink, Trash2, Check, X, Calendar, Search, Plus, Download, Settings } from "lucide-react";
import { FileInput } from '../../components/ui/FileInput';
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { PicManagementModal } from './PicManagementModal';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';

// Types
export interface DailyActivity {
  id: number | string;
  activity_date: string;
  activity: string;
  institution_group: string;
  address: string;
  focus: string;
  location: string;
  cost: number;
  pic_id: string | number;
  category_id: string | number;
  sub_category_id: string | number;
  description_result: string;
  document_link: string | null;
  // Included relations from backend
  pic?: any;
  category?: any;
  sub_category?: any;
}

const PIC_LIST = ["Ziya Ramadhani", "Adji Pratama", "Ziya & Adji", "Fadhil Akbar", "Nisa Rahayu"];


// Helpers
const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const formatDate = (d: string | Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });



// Re-usable UI from App.tsx (We should technically extract these to shared, but for now we inline them or import if exported. Since they are not exported, we inline the ones we need or just assume they are available. Wait, App.tsx doesn't export them. I will copy them here to avoid breaking App.tsx)

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

function Modal({ title, onClose, children, size = "md" }: { title: string; onClose: () => void; children: React.ReactNode; size?: "md" | "lg" }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-card rounded-2xl border border-border shadow-2xl w-full ${size === "lg" ? "max-w-3xl" : "max-w-2xl"} max-h-[92vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onSave, saveLabel = "Simpan", isEdit }: { onClose: () => void; onSave: () => void; saveLabel?: string; isEdit?: boolean }) {
  return (
    <div className="px-6 py-4 border-t border-border flex gap-2 justify-end bg-muted/20 rounded-b-2xl shrink-0">
      <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors">Batal</button>
      <button onClick={onSave} className={`px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-1.5 text-white ${isEdit ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-blue-700"}`}>
        {isEdit ? <Edit2 size={13} /> : <Check size={13} />}{saveLabel}
      </button>
    </div>
  );
}

function DeleteConfirm({ label, onCancel, onConfirm }: { label: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={onCancel}>
      <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0"><Trash2 size={15} className="text-red-500" /></div>
          <div>
            <div className="text-sm font-semibold text-foreground">Hapus data?</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">"<span className="font-medium text-foreground">{label}</span>" akan dihapus (soft delete) dan tidak muncul di daftar.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">Batal</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-1.5"><Trash2 size={12} />Hapus</button>
        </div>
      </div>
    </div>
  );
}

function TopBar({ title, subtitle, onAdd, addLabel, showSearch, searchValue, onSearch, onExport, children }: {
  title: string; subtitle?: string; onAdd?: () => void; addLabel?: string;
  showSearch?: boolean; searchValue?: string; onSearch?: (v: string) => void;
  onExport?: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-border shrink-0 gap-3 flex-wrap">
      <div className="shrink-0">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 font-mono">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        {showSearch && (
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchValue} onChange={e => onSearch?.(e.target.value)} placeholder="Cari…"
              className="pl-8 pr-3 py-1.5 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring w-44 placeholder:text-muted-foreground" />
          </div>
        )}
        <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"><Download size={13} />Export</button>
        {onAdd && <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-blue-700 transition-colors"><Plus size={13} />{addLabel ?? "Tambah"}</button>}
      </div>
    </div>
  );
}

function DailyForm({ initial, onClose, onSave, refs, onRefreshReferences }: { initial?: DailyActivity; onClose: () => void; onSave: (d: Omit<DailyActivity, "id">) => void; refs: { pics: any[], categories: any[], sub_categories: any[] }; onRefreshReferences: () => void }) {
  const [showPicManager, setShowPicManager] = useState(false);
  const [f, setF] = useState({
    activity_date: initial?.activity_date ?? "",
    activity: initial?.activity ?? "",
    institution_group: initial?.institution_group ?? "",
    address: initial?.address ?? "",
    focus: initial?.focus ?? "",
    location: initial?.location ?? "",
    cost: String(initial?.cost ?? ""),
    pic_id: initial?.pic_id ?? "",
    category_id: initial?.category_id ?? "",
    sub_category_id: initial?.sub_category_id ?? "",
    description_result: initial?.description_result ?? "",
    document_link: initial?.document_link ?? ""
  });
  
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  
  const handleSave = () => {
    if (!f.activity_date || !f.activity || !f.pic_id || !f.category_id || !f.sub_category_id) return;
    onSave({ ...f, cost: Number(f.cost) || 0, document_link: f.document_link || null });
    onClose();
  };
  
  return (
    <Modal title={initial ? "Edit Kegiatan" : "Tambah Kegiatan Baru"} onClose={onClose}>
      <div className="px-6 py-4 grid grid-cols-3 gap-4">
        <Field label="Tanggal Kegiatan" required><input type="date" value={String(f.activity_date).split('T')[0]} onChange={e => set("activity_date", e.target.value)} className={inputCls} /></Field>
        <div className="col-span-2"><Field label="Kegiatan" required><input type="text" value={f.activity} onChange={e => set("activity", e.target.value)} placeholder="Deskripsi kegiatan" className={inputCls} /></Field></div>
        <Field label="Institusi / Kelompok"><input type="text" value={f.institution_group} onChange={e => set("institution_group", e.target.value)} placeholder="Nama institusi" className={inputCls} /></Field>
        <Field label="Alamat"><input type="text" value={f.address} onChange={e => set("address", e.target.value)} placeholder="Alamat institusi" className={inputCls} /></Field>
        <Field label="Lokasi"><input type="text" value={f.location} onChange={e => set("location", e.target.value)} placeholder="Lokasi kegiatan" className={inputCls} /></Field>
        <Field label="Fokus"><input type="text" value={f.focus} onChange={e => set("focus", e.target.value)} placeholder="Fokus kegiatan" className={inputCls} /></Field>
        <Field label="Biaya (Rp)"><CurrencyInput value={f.cost} onChange={val => set("cost", val)} className={`${inputCls} font-mono`} /></Field>
        <Field label="Category" required><select value={f.category_id} onChange={e => set("category_id", e.target.value)} className={inputCls}><option value="">Pilih Category</option>{refs.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Sub Category" required><select value={f.sub_category_id} onChange={e => set("sub_category_id", e.target.value)} className={inputCls}><option value="">Pilih Sub Category</option>{refs.sub_categories.filter(s => String(s.category_id) === String(f.category_id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="PIC" required>
          <div className="flex gap-2 items-center">
            <select value={f.pic_id} onChange={e => set("pic_id", e.target.value)} className={`${inputCls} flex-1`}>
              <option value="">Pilih PIC</option>
              {refs.pics.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowPicManager(true)} className="p-2 border border-border rounded-md hover:bg-muted text-muted-foreground shrink-0" title="Atur PIC"><Settings size={14} /></button>
          </div>
        </Field>
        <div className="col-span-3"><Field label="Keterangan & Hasil"><textarea rows={2} value={f.description_result} onChange={e => set("description_result", e.target.value)} placeholder="Uraian kegiatan dan hasil yang dicapai" className={`${inputCls} resize-none`} /></Field></div>
        <div className="col-span-3">
          <Field label="Dokumen Lampiran" hint="Pilih file dokumen (maks 5MB). Pastikan Tanggal dan PIC sudah terisi.">
            <FileInput 
              value={f.document_link || null} 
              onChange={url => set("document_link", url)}
              activityDate={f.activity_date}
              picName={refs.pics.find(p => String(p.id) === String(f.pic_id))?.name}
            />
          </Field>
        </div>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} saveLabel={initial ? "Simpan Perubahan" : "Simpan Kegiatan"} isEdit={!!initial} />
      {showPicManager && <PicManagementModal onClose={() => { setShowPicManager(false); onRefreshReferences(); }} />}
    </Modal>
  );
}

export default function DailyActivitiesModule({ onExport, showToast }: { onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<DailyActivity[]>([]);
  const [references, setReferences] = useState({ pics: [], categories: [], sub_categories: [] });
  
  useEffect(() => {
    fetchData();
    fetchReferences();
  }, []);

  const fetchReferences = async () => {
    try {
      const res = await apiClient.get('/references');
      setReferences(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/daily-activities');
      setItems(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (d: Omit<DailyActivity, "id">) => {
    try {
      await apiClient.post('/daily-activities', d);
      fetchData();
      showToast("Data berhasil ditambahkan", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<DailyActivity, "id">) => {
    try {
      await apiClient.put(`/daily-activities/${id}`, d);
      fetchData();
      showToast("Data berhasil diperbarui", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/daily-activities/${id}`);
      fetchData();
      showToast("Data berhasil dihapus", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };

  const { q, setQ, filtered } = useGlobalSearch(items);
  const [catFilter, setCatFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DailyActivity | null>(null);
  const [toDelete, setToDelete] = useState<DailyActivity | null>(null);
  
  const displayed = filtered;

  const columns: ColumnDef<DailyActivity>[] = useMemo(() => [
    { header: "No", render: (_, i) => <span className="text-xs text-muted-foreground font-mono">{i + 1}</span> },
    { header: "Tanggal", accessor: "activity_date", sortable: true, render: (a) => <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{formatDate(a.activity_date)}</span> },
    { header: "Kegiatan", accessor: "activity", sortable: true, render: (a) => <div className="text-sm font-medium text-foreground whitespace-normal max-w-[200px]">{a.activity}</div> },
    { header: "Fokus", accessor: "focus", sortable: true, render: (a) => <div className="text-xs text-muted-foreground whitespace-normal max-w-[150px]">{a.focus || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Institusi & Alamat", accessor: "institution_group", sortable: true, render: (a) => (
      <div className="max-w-[200px]">
        <div className="text-sm font-medium text-foreground">{a.institution_group || <span className="text-muted-foreground/50">—</span>}</div>
        {a.address && <div className="text-xs text-muted-foreground mt-0.5 whitespace-normal">{a.address}</div>}
      </div>
    )},
    { header: "Lokasi", accessor: "location", sortable: true, render: (a) => <div className="text-xs text-foreground max-w-[150px] whitespace-normal">{a.location || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "PIC", accessor: "pic.name", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.pic?.name || a.pic_id}</span> },
    { header: "Biaya", accessor: "cost", sortable: true, render: (a) => <div className="text-xs text-right font-mono whitespace-nowrap">{a.cost > 0 ? formatIDR(a.cost) : <span className="text-muted-foreground">—</span>}</div> },
    { header: "Keterangan & Hasil", accessor: "description_result", sortable: true, render: (a) => <div className="text-xs text-foreground whitespace-normal leading-relaxed max-w-[250px]">{a.description_result || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Docs", className: "text-center", render: (a) => a.document_link && a.document_link !== "[]" ? <span className="text-blue-600 cursor-pointer" title="Ada Lampiran Dokumen"><ExternalLink size={12} /></span> : <span className="text-muted-foreground text-xs">—</span> },
    { header: "", render: (a) => (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => setEditing(a)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={12} /></button>
        <button onClick={() => setToDelete(a)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
      </div>
    )}
  ], []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Daily Activities" subtitle="Rekaman kegiatan harian tim CRS" onAdd={() => setShowForm(true)} addLabel="Tambah Kegiatan" showSearch searchValue={q} onSearch={setQ} onExport={() => onExport("Daily Activities Juli 2026", items)}>
      </TopBar>
      <div className="flex-1 overflow-auto p-6 h-full flex flex-col">
        <div className="flex-1 min-h-0">
          <DataTable columns={columns} data={displayed} />
        </div>
        <div className="mt-2 text-xs text-muted-foreground font-mono">Menampilkan {displayed.length} dari {items.length} kegiatan</div>
      </div>
      {showForm && <DailyForm refs={references} onRefreshReferences={fetchReferences} onClose={() => setShowForm(false)} onSave={handleAdd} />}
      {editing && <DailyForm refs={references} onRefreshReferences={fetchReferences} initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} />}
      {toDelete && <DeleteConfirm label={toDelete.activity} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}
