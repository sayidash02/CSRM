import React, { useState, useMemo } from "react";
import { Edit2, ExternalLink, Trash2, Check, X, Calendar, Search, Plus, Download } from "lucide-react";

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
const SUB_CATS = ["Donasi","Internal Meeting","Issue","Issue & Grievance","Kehumasan","Project CSR","Security","Support Project","Data Processing (Olah Data)"];

// Helpers
const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const formatDate = (d: string | Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

function useSearch<T>(items: T[], keys: (keyof T)[]) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() =>
    q.trim() === "" ? items : items.filter(item => keys.some(k => String(item[k]).toLowerCase().includes(q.toLowerCase()))),
    [items, q]);
  return { q, setQ, filtered };
}

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

function DailyForm({ initial, onClose, onSave }: { initial?: DailyActivity; onClose: () => void; onSave: (d: Omit<DailyActivity, "id">) => void }) {
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
        <Field label="Biaya (Rp)"><input type="number" value={f.cost} onChange={e => set("cost", e.target.value)} placeholder="0" className={`${inputCls} font-mono`} /></Field>
        <Field label="Category" required><select value={f.category_id} onChange={e => set("category_id", e.target.value)} className={inputCls}><option value="">Pilih Category</option><option value="1">Stakeholder Engagement</option><option value="2">Paper Work</option></select></Field>
        <Field label="Sub Category" required><select value={f.sub_category_id} onChange={e => set("sub_category_id", e.target.value)} className={inputCls}><option value="">Pilih Sub Category</option><option value="1">Issue</option><option value="2">Internal Meeting</option><option value="3">Donasi</option><option value="4">Project CSR</option><option value="5">Data Processing (Olah Data)</option><option value="6">Issue & Grievance</option><option value="7">Kehumasan</option></select></Field>
        <Field label="PIC" required><select value={f.pic_id} onChange={e => set("pic_id", e.target.value)} className={inputCls}><option value="">Pilih PIC</option><option value="1">Ziya Ramadhani</option><option value="2">Adji Pratama</option><option value="3">Ziya & Adji</option></select></Field>
        <div className="col-span-3"><Field label="Keterangan & Hasil"><textarea rows={2} value={f.description_result} onChange={e => set("description_result", e.target.value)} placeholder="Uraian kegiatan dan hasil yang dicapai" className={`${inputCls} resize-none`} /></Field></div>
        <div className="col-span-3"><Field label="Link Dokumen (SharePoint)" hint="Upload dokumen ke SharePoint terlebih dahulu, lalu paste link-nya di sini."><input type="text" value={f.document_link || ""} onChange={e => set("document_link", e.target.value)} placeholder="https://sharepoint/…" className={inputCls} /></Field></div>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} saveLabel={initial ? "Simpan Perubahan" : "Simpan Kegiatan"} isEdit={!!initial} />
    </Modal>
  );
}

export default function DailyActivitiesModule({ items, onAdd, onEdit, onDelete, onExport }: { items: DailyActivity[]; onAdd: (d: Omit<DailyActivity, "id">) => void; onEdit: (id: string | number, d: Omit<DailyActivity, "id">) => void; onDelete: (id: string | number) => void; onExport: (l: string) => void }) {
  const { q, setQ, filtered } = useSearch(items, ["activity", "institution_group", "location"]);
  const [catFilter, setCatFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DailyActivity | null>(null);
  const [toDelete, setToDelete] = useState<DailyActivity | null>(null);
  
  // Adjusted filter for demo purposes (we might just filter by category_id or omit)
  const displayed = filtered;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Daily Activities" subtitle="Rekaman kegiatan harian tim CRS" onAdd={() => setShowForm(true)} addLabel="Tambah Kegiatan" showSearch searchValue={q} onSearch={setQ} onExport={() => onExport("Daily Activities Juli 2026")}>
      </TopBar>
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["No","Tanggal","Kegiatan","Institusi","Lokasi","PIC","Biaya","Docs",""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground font-mono uppercase tracking-wide last:w-20">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayed.map((a, i) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{i + 1}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">{formatDate(a.activity_date)}</td>
                  <td className="px-4 py-3 max-w-[180px]"><div className="text-sm font-medium text-foreground truncate">{a.activity}</div><div className="text-xs text-muted-foreground mt-0.5 truncate">{a.focus}</div></td>
                  <td className="px-4 py-3 text-xs text-foreground">{a.institution_group}</td>
                  <td className="px-4 py-3 text-xs text-foreground">{a.location}</td>
                  <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">{a.pic?.name || a.pic_id}</td>
                  <td className="px-4 py-3 text-xs text-right font-mono whitespace-nowrap">{a.cost > 0 ? formatIDR(a.cost) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-center">{a.document_link ? <span className="text-blue-600 cursor-pointer"><ExternalLink size={12} /></span> : <span className="text-muted-foreground text-xs">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditing(a)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={12} /></button>
                      <button onClick={() => setToDelete(a)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayed.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada data yang cocok.</div>}
        </div>
        <div className="mt-2 text-xs text-muted-foreground font-mono">Menampilkan {displayed.length} dari {items.length} kegiatan</div>
      </div>
      {showForm && <DailyForm onClose={() => setShowForm(false)} onSave={onAdd} />}
      {editing && <DailyForm initial={editing} onClose={() => setEditing(null)} onSave={d => { onEdit(editing.id, d); setEditing(null); }} />}
      {toDelete && <DeleteConfirm label={toDelete.activity} onCancel={() => setToDelete(null)} onConfirm={() => { onDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}
