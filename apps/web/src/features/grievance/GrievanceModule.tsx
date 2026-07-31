import React, { useState, useMemo, useEffect } from "react";
import { apiClient } from '../../lib/apiClient';
import { Edit2, ExternalLink, Trash2, Check, X, Search, Plus, Download } from "lucide-react";
import { FileInput } from '../../components/ui/FileInput';

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
  supporting_files: string | null;
  remarks: string | null;
}

const formatDate = (d: string | Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "On Going":"bg-blue-100 text-blue-700", Planning:"bg-slate-100 text-slate-600", Completed:"bg-emerald-100 text-emerald-700",
    Cancelled:"bg-red-100 text-red-600", Approved:"bg-emerald-100 text-emerald-700", "Under Review":"bg-amber-100 text-amber-700",
    Declined:"bg-red-100 text-red-600", Open:"bg-orange-100 text-orange-700", "On Progress":"bg-blue-100 text-blue-700",
    Resolved:"bg-emerald-100 text-emerald-700", Closed:"bg-slate-100 text-slate-500"
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono ${map[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

function SignificanceBadge({ level }: { level: string }) {
  const map: Record<string, string> = { Low:"bg-slate-100 text-slate-500", Medium:"bg-amber-100 text-amber-700", High:"bg-orange-100 text-orange-700", Critical:"bg-red-100 text-red-700" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono ${map[level] ?? ""}`}>{level}</span>;
}

function GrievanceForm({ initial, onClose, onSave, nextRegNo }: { initial?: Grievance; onClose: () => void; onSave: (d: Omit<Grievance, "id">) => void; nextRegNo: string }) {
  const [f, setF] = useState({
    register_no: initial?.register_no ?? nextRegNo,
    log_date: initial?.log_date ? String(initial.log_date).split('T')[0] : "",
    complainant_name: initial?.complainant_name ?? "",
    address: initial?.address ?? "",
    phone: initial?.phone ?? "",
    category: initial?.category ?? "",
    significance: initial?.significance ?? "Low",
    description: initial?.description ?? "",
    location: initial?.location ?? "",
    investigation: initial?.investigation ?? "",
    resolution: initial?.resolution ?? "",
    feedback: initial?.feedback ?? "",
    status: initial?.status ?? "Open",
    completion_date: initial?.completion_date ? String(initial.completion_date).split('T')[0] : "",
    supporting_files: initial?.supporting_files ?? "",
    remarks: initial?.remarks ?? ""
  });
  
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const handleSave = () => { 
    if (!f.register_no || !f.log_date || !f.complainant_name || !f.significance) return; 
    onSave({ 
      ...f, 
      resolution: f.resolution || null, 
      feedback: f.feedback || null, 
      completion_date: f.completion_date || null, 
      supporting_files: f.supporting_files || null,
      remarks: f.remarks || null
    }); 
    onClose(); 
  };
  
  return (
    <Modal title={initial ? "Edit Pengaduan" : "Tambah Pengaduan"} onClose={onClose} size="lg">
      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="No. Registrasi"><input type="text" value={f.register_no} onChange={e => set("register_no", e.target.value)} className={`${inputCls} font-mono`} /></Field>
          <Field label="Tanggal Pengaduan" required><input type="date" value={f.log_date} onChange={e => set("log_date", e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Nama Pelapor" required><input type="text" value={f.complainant_name} onChange={e => set("complainant_name", e.target.value)} placeholder="Nama lengkap pelapor" className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Alamat"><input type="text" value={f.address} onChange={e => set("address", e.target.value)} placeholder="Alamat lengkap" className={inputCls} /></Field>
          <Field label="Telepon"><input type="text" value={f.phone} onChange={e => set("phone", e.target.value)} placeholder="0812-xxxx-xxxx" className={`${inputCls} font-mono`} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Kategori"><input type="text" value={f.category} onChange={e => set("category", e.target.value)} placeholder="Lingkungan, Kebisingan, dst" className={inputCls} /></Field>
          <Field label="Signifikansi" required><select value={f.significance} onChange={e => set("significance", e.target.value)} className={inputCls}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></Field>
        </div>
        <Field label="Deskripsi Pengaduan"><textarea rows={3} value={f.description} onChange={e => set("description", e.target.value)} placeholder="Uraian lengkap pengaduan" className={`${inputCls} resize-none`} /></Field>
        <Field label="Lokasi Kejadian"><input type="text" value={f.location} onChange={e => set("location", e.target.value)} placeholder="Titik lokasi kejadian" className={inputCls} /></Field>
        <Field label="Investigasi"><textarea rows={2} value={f.investigation} onChange={e => set("investigation", e.target.value)} placeholder="Tindakan investigasi yang sudah dilakukan" className={`${inputCls} resize-none`} /></Field>
        <Field label="Resolusi"><textarea rows={2} value={f.resolution} onChange={e => set("resolution", e.target.value)} placeholder="Tindakan penyelesaian yang dilakukan" className={`${inputCls} resize-none`} /></Field>
        <Field label="Feedback Pelapor"><textarea rows={2} value={f.feedback} onChange={e => set("feedback", e.target.value)} placeholder="Tanggapan / feedback dari pelapor" className={`${inputCls} resize-none`} /></Field>
        <Field label="Remarks"><textarea rows={2} value={f.remarks} onChange={e => set("remarks", e.target.value)} placeholder="Catatan tambahan" className={`${inputCls} resize-none`} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status"><select value={f.status} onChange={e => set("status", e.target.value)} className={inputCls}><option>Open</option><option>On Progress</option><option>Resolved</option><option>Closed</option></select></Field>
          <Field label="Tanggal Selesai"><input type="date" value={f.completion_date} onChange={e => set("completion_date", e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Dokumen Pendukung">
          <FileInput 
            value={f.supporting_files || null} 
            onChange={url => set("supporting_files", url)}
            activityDate={f.log_date}
            picName={f.complainant_name}
          />
        </Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} saveLabel={initial ? "Simpan Perubahan" : "Simpan Pengaduan"} isEdit={!!initial} />
    </Modal>
  );
}

export default function GrievanceModule({ onExport }: { onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<Grievance[]>([]);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/grievance');
      setItems(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (d: Omit<Grievance, "id">) => {
    try {
      await apiClient.post('/grievance', d);
      fetchData();
      showToast("Data berhasil ditambahkan", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<Grievance, "id">) => {
    try {
      await apiClient.put(`/grievance/${id}`, d);
      fetchData();
      showToast("Data berhasil diperbarui", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/grievance/${id}`);
      fetchData();
      showToast("Data berhasil dihapus", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };

  const { q, setQ, filtered } = useSearch(items, ["complainant_name", "register_no", "category", "description", "location"]);
  const [sigFilter, setSigFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState<string | number | null>(items[0]?.id ?? null);
  
  // Set selected dynamically when items arrive and selected is null
  useEffect(() => {
    if (items.length > 0 && selected === null) {
      setSelected(items[0].id);
    }
  }, [items, selected]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Grievance | null>(null);
  const [toDelete, setToDelete] = useState<Grievance | null>(null);
  
  const nextRegNo = `GRV-2026-${String(items.length + 1).padStart(4, "0")}`;
  const displayed = filtered.filter(g => sigFilter === "All" || g.significance === sigFilter).filter(g => statusFilter === "All" || g.status === statusFilter);
  const detail = items.find(g => g.id === selected);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Grievance" subtitle="Penanganan pengaduan & keluhan dari masyarakat" addLabel="Tambah Pengaduan" onAdd={() => setShowForm(true)} showSearch searchValue={q} onSearch={setQ} onExport={() => onExport("Grievance", items)}>
        <div className="flex gap-1">
          {["All","Low","Medium","High","Critical"].map(s => (
            <button key={s} onClick={() => setSigFilter(s)} className={`px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors ${sigFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>{s}</button>
          ))}
        </div>
      </TopBar>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 shrink-0 border-r border-border overflow-y-auto bg-card flex flex-col">
          <div className="p-2 border-b border-border flex gap-1 flex-wrap shrink-0">
            {["All","Open","On Progress","Resolved","Closed"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-2 py-1 text-[10px] rounded font-medium font-mono transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{s === "All" ? "Semua" : s}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {displayed.map(g => (
              <button key={g.id} onClick={() => setSelected(g.id)} className={`w-full text-left px-4 py-3.5 border-b border-border transition-colors ${selected === g.id ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-muted/50"}`}>
                <div className="flex items-center justify-between mb-1"><span className="text-xs font-mono text-blue-600">{g.register_no}</span><SignificanceBadge level={g.significance} /></div>
                <div className="text-sm font-medium text-foreground truncate">{g.complainant_name}</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">{formatDate(g.log_date)} · {g.category}</div>
                <div className="mt-1.5"><StatusBadge status={g.status} /></div>
              </button>
            ))}
            {displayed.length === 0 && <div className="px-4 py-8 text-sm text-muted-foreground text-center">Tidak ada pengaduan.</div>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {detail ? (
            <div className="max-w-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div><span className="text-xs font-mono text-blue-600">{detail.register_no}</span><h2 className="text-base font-semibold text-foreground mt-0.5">{detail.complainant_name}</h2></div>
                <div className="flex items-center gap-2">
                  <SignificanceBadge level={detail.significance} /><StatusBadge status={detail.status} />
                  <button onClick={() => setEditing(detail)} className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => setToDelete(detail)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-card rounded-xl border border-border p-4 text-sm">
                <div><span className="text-xs text-muted-foreground">Alamat</span><div className="font-medium mt-0.5">{detail.address}</div></div>
                <div><span className="text-xs text-muted-foreground">Telepon</span><div className="font-medium font-mono mt-0.5">{detail.phone}</div></div>
                <div><span className="text-xs text-muted-foreground">Kategori</span><div className="font-medium mt-0.5">{detail.category}</div></div>
                <div><span className="text-xs text-muted-foreground">Tanggal Log</span><div className="font-medium font-mono mt-0.5">{formatDate(detail.log_date)}</div></div>
                {detail.completion_date && <div><span className="text-xs text-muted-foreground">Tgl Selesai</span><div className="font-medium font-mono mt-0.5">{formatDate(detail.completion_date)}</div></div>}
              </div>
              {[{ label: "Deskripsi Pengaduan", val: detail.description }, { label: "Lokasi Kejadian", val: detail.location }, { label: "Investigasi", val: detail.investigation }, { label: "Resolusi", val: detail.resolution }, { label: "Feedback Pelapor", val: detail.feedback }, { label: "Remarks", val: detail.remarks }].map(({ label, val }) => val && (
                <div key={label} className="bg-card rounded-xl border border-border p-4"><div className="text-xs font-medium text-muted-foreground mb-2">{label}</div><p className="text-sm text-foreground leading-relaxed">{val}</p></div>
              ))}
              {detail.supporting_files && <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 border border-blue-100 bg-blue-50 rounded px-3 py-1.5 cursor-pointer"><ExternalLink size={11} /> Dokumen Pendukung</span>}
            </div>
          ) : <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Pilih pengaduan di sebelah kiri.</div>}
        </div>
      </div>
      {showForm && <GrievanceForm onClose={() => setShowForm(false)} onSave={handleAdd} nextRegNo={nextRegNo} />}
      {editing && <GrievanceForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} nextRegNo={editing.register_no} />}
      {toDelete && <DeleteConfirm label={`${toDelete.register_no} — ${toDelete.complainant_name}`} onCancel={() => setToDelete(null)} onConfirm={() => { if (selected === toDelete.id) setSelected(null); handleDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}
