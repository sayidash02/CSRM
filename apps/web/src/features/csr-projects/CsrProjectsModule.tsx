import React, { useState, useMemo, useEffect } from "react";
import { apiClient } from '../../lib/apiClient';
import { Edit2, ExternalLink, Trash2, Check, X, Search, Plus, Download } from "lucide-react";

export interface CsrProject {
  id: number | string;
  project_year: number;
  program: string;
  activity: string | null;
  type_of_activity: string | null;
  location: string | null;
  target_beneficiaries: string | null;
  objective: string | null;
  status: string;
  budget: number | null;
  implementation_period: string | null;
  documentation_image: string | null;
  document: string | null;
}

const formatIDR = (n: number | null) => {
  if (!n) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
};

function useSearch<T>(items: T[], keys: (keyof T)[]) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() =>
    q.trim() === "" ? items : items.filter(item => keys.some(k => String(item[k]).toLowerCase().includes(q.toLowerCase()))),
    [items, q]);
  return { q, setQ, filtered };
}

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "On Going":"bg-blue-100 text-blue-700", Planning:"bg-slate-100 text-slate-600", Completed:"bg-emerald-100 text-emerald-700",
    Cancelled:"bg-red-100 text-red-600"
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono ${map[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
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

function CsrForm({ initial, onClose, onSave }: { initial?: CsrProject; onClose: () => void; onSave: (d: Omit<CsrProject, "id">) => void }) {
  const [f, setF] = useState({ 
    project_year: String(initial?.project_year ?? new Date().getFullYear()), 
    program: initial?.program ?? "", 
    activity: initial?.activity ?? "", 
    type_of_activity: initial?.type_of_activity ?? "", 
    location: initial?.location ?? "", 
    target_beneficiaries: initial?.target_beneficiaries ?? "", 
    objective: initial?.objective ?? "", 
    status: initial?.status ?? "Planning", 
    budget: initial?.budget ? String(initial.budget) : "", 
    implementation_period: initial?.implementation_period ?? "", 
    documentation_image: initial?.documentation_image ?? "",
    document: initial?.document ?? "" 
  });
  
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  
  const handleSave = () => { 
    if (!f.program || !f.project_year) return; 
    onSave({ 
      ...f, 
      project_year: Number(f.project_year), 
      budget: f.budget ? Number(f.budget) : null,
      activity: f.activity || null,
      type_of_activity: f.type_of_activity || null,
      location: f.location || null,
      target_beneficiaries: f.target_beneficiaries || null,
      objective: f.objective || null,
      implementation_period: f.implementation_period || null,
      documentation_image: f.documentation_image || null,
      document: f.document || null
    }); 
    onClose(); 
  };
  
  return (
    <Modal title={initial ? "Edit CSR Project" : "Tambah CSR Project"} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Tahun" required><input type="number" value={f.project_year} onChange={e => set("project_year", e.target.value)} className={`${inputCls} font-mono`} /></Field>
          <div className="col-span-2"><Field label="Nama Program" required><input type="text" value={f.program} onChange={e => set("program", e.target.value)} placeholder="Nama program CSR" className={inputCls} /></Field></div>
        </div>
        <Field label="Aktivitas / Kegiatan"><input type="text" value={f.activity} onChange={e => set("activity", e.target.value)} placeholder="Deskripsi aktivitas program" className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Jenis Kegiatan"><input type="text" value={f.type_of_activity} onChange={e => set("type_of_activity", e.target.value)} placeholder="Infrastruktur, Pendidikan, Ekonomi…" className={inputCls} /></Field>
          <Field label="Lokasi"><input type="text" value={f.location} onChange={e => set("location", e.target.value)} placeholder="Nama desa / kecamatan" className={inputCls} /></Field>
          <Field label="Target Penerima Manfaat"><input type="text" value={f.target_beneficiaries} onChange={e => set("target_beneficiaries", e.target.value)} placeholder="cth: 500 KK" className={inputCls} /></Field>
          <Field label="Periode Pelaksanaan"><input type="text" value={f.implementation_period} onChange={e => set("implementation_period", e.target.value)} placeholder="Jan – Des 2026" className={inputCls} /></Field>
        </div>
        <Field label="Tujuan / Objektif"><textarea rows={2} value={f.objective} onChange={e => set("objective", e.target.value)} placeholder="Tujuan program" className={`${inputCls} resize-none`} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status"><select value={f.status} onChange={e => set("status", e.target.value)} className={inputCls}><option>Planning</option><option>On Going</option><option>Completed</option><option>Cancelled</option></select></Field>
          <Field label="Budget (Rp)"><input type="number" value={f.budget} onChange={e => set("budget", e.target.value)} placeholder="0" className={`${inputCls} font-mono`} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Link Dokumen (SharePoint)"><input type="text" value={f.document} onChange={e => set("document", e.target.value)} placeholder="https://sharepoint/…" className={inputCls} /></Field>
          <Field label="Link Gambar Dokumentasi"><input type="text" value={f.documentation_image} onChange={e => set("documentation_image", e.target.value)} placeholder="https://sharepoint/…" className={inputCls} /></Field>
        </div>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} saveLabel={initial ? "Simpan Perubahan" : "Simpan Program"} isEdit={!!initial} />
    </Modal>
  );
}

export default function CsrProjectsModule({ onExport }: { onExport: (l: string) => void }) {
  const [items, setItems] = useState<CsrProject[]>([]);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/csr-projects');
      setItems(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (d: Omit<CsrProject, "id">) => {
    try {
      await apiClient.post('/csr-projects', d);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = async (id: string | number, d: Omit<CsrProject, "id">) => {
    try {
      await apiClient.put(`/csr-projects/${id}`, d);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/csr-projects/${id}`);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const { q, setQ, filtered } = useSearch(items, ["program", "activity", "type_of_activity", "location", "target_beneficiaries"]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CsrProject | null>(null);
  const [toDelete, setToDelete] = useState<CsrProject | null>(null);
  
  const displayed = statusFilter === "All" ? filtered : filtered.filter(c => c.status === statusFilter);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="CSR Projects" subtitle="Program tanggung jawab sosial perusahaan tahun berjalan" addLabel="Tambah Program" onAdd={() => setShowForm(true)} showSearch searchValue={q} onSearch={setQ} onExport={() => onExport("CSR Projects")}>
        <div className="flex gap-1">
          {["All","Planning","On Going","Completed","Cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>{s === "All" ? "Semua" : s}</button>
          ))}
        </div>
      </TopBar>
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {displayed.length > 0 && <div className="text-xs text-muted-foreground font-mono">{displayed.length} program · Total budget: <span className="text-foreground font-semibold">{formatIDR(displayed.reduce((s, c) => s + (c.budget || 0), 0))}</span></div>}
        {displayed.map(p => (
          <div key={p.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><StatusBadge status={p.status} /><span className="text-xs font-mono text-muted-foreground">{p.type_of_activity}</span></div>
                <h3 className="text-sm font-semibold text-foreground">{p.program}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{p.activity}</p>
              </div>
              <div className="flex items-start gap-2 shrink-0">
                <div className="text-right"><div className="text-xs text-muted-foreground font-mono">Budget</div><div className="text-sm font-semibold font-mono">{formatIDR(p.budget)}</div></div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => setEditing(p)} className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => setToDelete(p)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border grid grid-cols-4 gap-4 text-xs">
              <div><span className="text-muted-foreground">Lokasi</span><div className="font-medium text-foreground mt-0.5">{p.location || "—"}</div></div>
              <div><span className="text-muted-foreground">Target</span><div className="font-medium text-foreground mt-0.5">{p.target_beneficiaries || "—"}</div></div>
              <div><span className="text-muted-foreground">Periode</span><div className="font-medium font-mono text-foreground mt-0.5">{p.implementation_period || "—"}</div></div>
              <div className="flex items-end">
                <div className="flex flex-col gap-1">
                  {p.document && <span className="text-xs text-blue-600 cursor-pointer flex items-center gap-1"><ExternalLink size={11} />Dokumen</span>}
                  {p.documentation_image && <span className="text-xs text-blue-600 cursor-pointer flex items-center gap-1"><ExternalLink size={11} />Gambar</span>}
                </div>
              </div>
            </div>
            {p.objective && <div className="mt-2 text-xs text-muted-foreground italic leading-relaxed">{p.objective}</div>}
          </div>
        ))}
        {displayed.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Belum ada program CSR dengan filter ini.</div>}
      </div>
      {showForm && <CsrForm onClose={() => setShowForm(false)} onSave={handleAdd} />}
      {editing && <CsrForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} />}
      {toDelete && <DeleteConfirm label={toDelete.program} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}
