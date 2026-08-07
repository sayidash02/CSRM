import React, { useState, useMemo, useEffect } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { apiClient } from '../../lib/apiClient';
import { Edit2, ExternalLink, Trash2, Check, X, Search, Plus, Download, RotateCcw } from "lucide-react";
import { FileInput } from '../../components/ui/FileInput';
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Modal, ModalFooter } from "../../components/ui/Modal";
import { RestoreConfirmModal } from '../../components/ui/RestoreConfirmModal';

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

function TopBar({ title, subtitle, onAdd, addLabel, showSearch, searchValue, onSearch, onExport, children, showDeleted }: {
  title: string; subtitle?: string; onAdd?: () => void; addLabel?: string;
  showSearch?: boolean; searchValue?: string; onSearch?: (v: string) => void;
  onExport?: () => void; children?: React.ReactNode; showDeleted?: boolean;
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
        {!showDeleted && onAdd && <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-blue-700 transition-colors"><Plus size={13} />{addLabel ?? "Tambah"}</button>}
      </div>
    </div>
  );
}

const emptyCsrDraft = {
  project_year: String(new Date().getFullYear()),
  program: "",
  activity: "",
  type_of_activity: "",
  location: "",
  target_beneficiaries: "",
  objective: "",
  status: "Planning",
  budget: "",
  implementation_period: "",
  documentation_image: "",
  document: ""
};

function CsrForm({
  initial,
  defaultValues,
  onDraftChange,
  onClose,
  onSave,
  showToast
}: {
  initial?: CsrProject;
  defaultValues?: typeof emptyCsrDraft;
  onDraftChange?: (v: typeof emptyCsrDraft) => void;
  onClose: () => void;
  onSave: (d: Omit<CsrProject, "id">) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [f, setF] = useState(
    initial
      ? {
          project_year: String(initial.project_year ?? new Date().getFullYear()),
          program: initial.program ?? "",
          activity: initial.activity ?? "",
          type_of_activity: initial.type_of_activity ?? "",
          location: initial.location ?? "",
          target_beneficiaries: initial.target_beneficiaries ?? "",
          objective: initial.objective ?? "",
          status: initial.status ?? "Planning",
          budget: initial.budget ? String(initial.budget) : "",
          implementation_period: initial.implementation_period ?? "",
          documentation_image: initial.documentation_image ?? "",
          document: initial.document ?? ""
        }
      : { ...emptyCsrDraft, ...defaultValues }
  );

  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };

  const handleClear = () => {
    setF({ ...emptyCsrDraft });
    onDraftChange?.({ ...emptyCsrDraft });
  };

  const handleSave = () => {
    const missing: string[] = (
      [
        [!f.program, "Nama Program"],
        [!f.project_year, "Tahun"],
      ] as [boolean, string][]
    ).filter(([cond]) => cond).map(([, label]) => label);

    if (missing.length > 0) {
      if (showToast) {
        showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
      }
      return;
    }
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
    if (!initial) onDraftChange?.({ ...emptyCsrDraft });
    onClose();
  };

  return (
    <Modal title={initial ? "Edit CSR Project" : "Tambah CSR Project"} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Tahun" required><input type="number" value={f.project_year} onChange={e => set("project_year", e.target.value)} className={`${inputCls} font-mono`} /></Field>
          <div className="col-span-2"><Field label="Program" required><input type="text" value={f.program} onChange={e => set("program", e.target.value)} placeholder="Nama program CSR" className={inputCls} /></Field></div>
        </div>
        <Field label="Kegiatan"><input type="text" value={f.activity} onChange={e => set("activity", e.target.value)} placeholder="Deskripsi aktivitas program" className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bentuk Kegiatan"><input type="text" value={f.type_of_activity} onChange={e => set("type_of_activity", e.target.value)} placeholder="Infrastruktur, Pendidikan, Ekonomi…" className={inputCls} /></Field>
          <Field label="Lokasi"><input type="text" value={f.location} onChange={e => set("location", e.target.value)} placeholder="Nama desa / kecamatan" className={inputCls} /></Field>
          <Field label="Target/Sasaran"><input type="text" value={f.target_beneficiaries} onChange={e => set("target_beneficiaries", e.target.value)} placeholder="cth: 500 KK" className={inputCls} /></Field>
          <Field label="Periode Pelaksanaan"><input type="text" value={f.implementation_period} onChange={e => set("implementation_period", e.target.value)} placeholder="Jan – Des 2026" className={inputCls} /></Field>
        </div>
        <Field label="Tujuan"><textarea rows={2} value={f.objective} onChange={e => set("objective", e.target.value)} placeholder="Tujuan program" className={`${inputCls} resize-none`} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status"><select value={f.status} onChange={e => set("status", e.target.value)} className={inputCls}><option>Planning</option><option>On Going</option><option>Completed</option><option>Cancelled</option></select></Field>
          <Field label="Realisasi"><CurrencyInput value={f.budget} onChange={val => set("budget", val)} className={`${inputCls} font-mono`} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Docx">
            <FileInput 
              value={f.document || null} 
              onChange={url => set("document", url)}
              picName="CSR Project"
            />
          </Field>
          <Field label="Image Dokumentasi">
            <FileInput 
              value={f.documentation_image || null} 
              onChange={url => set("documentation_image", url)}
              picName="CSR Project"
            />
          </Field>
        </div>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Program"} isEdit={!!initial} />
    </Modal>
  );
}

export default function CsrProjectsModule({ activeYear, onExport, showToast }: { activeYear: string; onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<CsrProject[]>([]);
  const [addDraft, setAddDraft] = useState({ ...emptyCsrDraft });
  const [showDeleted, setShowDeleted] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, [activeYear, showDeleted]);

  const fetchData = async () => {
    try {
      const yearParam = activeYear ? `year=${activeYear}` : '';
      const isDeletedParam = `is_deleted=${showDeleted}`;
      const queryParams = [yearParam, isDeletedParam].filter(Boolean).join('&');
      const res = await apiClient.get(`/csr-projects${queryParams ? `?${queryParams}` : ''}`);
      setItems(res.data.data);
    } catch (e: any) {
      console.error(e);
      if (showToast) showToast(e.response?.data?.error || "Gagal memuat data", "error");
    }
  };

  const handleAdd = async (d: Omit<CsrProject, "id">) => {
    try {
      await apiClient.post('/csr-projects', d);
      fetchData();
      showToast(`Program '${d.program}' berhasil ditambahkan`, "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<CsrProject, "id">) => {
    try {
      await apiClient.put(`/csr-projects/${id}`, d);
      fetchData();
      showToast(`Program '${d.program}' berhasil diperbarui`, "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/csr-projects/${id}`);
      fetchData();
      showToast(`Program '${toDelete?.program || ''}' berhasil dihapus`, "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menghapus data", "error");
    }
  };

  const handleRestore = async (id: string | number) => {
    try {
      await apiClient.patch(`/csr-projects/${id}/restore`);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };

  const { q, setQ, filtered } = useGlobalSearch(items);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CsrProject | null>(null);
  const [toDelete, setToDelete] = useState<CsrProject | null>(null);
  const [toRestore, setToRestore] = useState<CsrProject | null>(null);
  
  const displayed = statusFilter === "All" ? filtered : filtered.filter(c => c.status === statusFilter);

  const columns: ColumnDef<CsrProject>[] = useMemo(() => [
    { header: "No", render: (_, i) => <div className="text-xs text-muted-foreground">{i + 1}</div> },
    { header: "Tahun", accessor: "project_year", sortable: true, render: (p) => <div className="text-sm text-foreground">{p.project_year}</div> },
    { header: "Program", accessor: "program", sortable: true, render: (p) => <div className="text-sm font-semibold text-foreground whitespace-normal">{p.program}</div> },
    { header: "Kegiatan", accessor: "activity", sortable: true, render: (p) => <div className="text-xs text-foreground whitespace-normal">{p.activity || "—"}</div> },
    { header: "Bentuk Kegiatan", accessor: "type_of_activity", sortable: true, render: (p) => <div className="text-xs text-foreground">{p.type_of_activity || "—"}</div> },
    { header: "Lokasi", accessor: "location", sortable: true, render: (p) => <div className="text-xs text-foreground whitespace-normal">{p.location || "—"}</div> },
    { header: "Target/Sasaran", accessor: "target_beneficiaries", sortable: true, render: (p) => <div className="text-xs text-foreground whitespace-normal">{p.target_beneficiaries || "—"}</div> },
    { header: "Tujuan", accessor: "objective", sortable: true, render: (p) => <div className="text-xs text-muted-foreground italic leading-relaxed max-w-[200px] whitespace-normal">{p.objective || "—"}</div> },
    { header: "Status", accessor: "status", sortable: true, render: (p) => <StatusBadge status={p.status} /> },
    { header: "Realisasi", accessor: "budget", sortable: true, render: (p) => <div className="text-sm font-semibold font-mono whitespace-nowrap text-right">{formatIDR(p.budget)}</div> },
    { header: "Periode Pelaksanaan", accessor: "implementation_period", sortable: true, render: (p) => <div className="text-xs font-mono text-foreground whitespace-nowrap">{p.implementation_period || "—"}</div> },
    { header: "Image Dokumentasi", render: (p) => (
      p.documentation_image ? <span className="text-xs text-blue-600 cursor-pointer flex items-center gap-1"><ExternalLink size={11} />Gambar</span> : <span className="text-muted-foreground text-xs">—</span>
    )},
    { header: "Docx", render: (p) => (
      p.document ? <span className="text-xs text-blue-600 cursor-pointer flex items-center gap-1"><ExternalLink size={11} />Dokumen</span> : <span className="text-muted-foreground text-xs">—</span>
    )},
    { header: "", render: (p) => showDeleted ? (
      <div className="flex items-center justify-end">
        <button 
          onClick={() => setToRestore(p)} 
          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1"
        >
          <RotateCcw size={12} />
          Restore
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => setEditing(p)} className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={13} /></button>
        <button onClick={() => setToDelete(p)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
      </div>
    )}
  ], [showDeleted]);

  const handleExportClick = () => {
    const exportData = displayed.map(p => ({
      "Year": p.project_year,
      "Program": p.program,
      "Activity": p.activity || "",
      "Type": p.type_of_activity || "",
      "Location": p.location || "",
      "Beneficiaries": p.target_beneficiaries || "",
      "Objective": p.objective || "",
      "Status": p.status,
      "Budget": p.budget || 0,
      "Period": p.implementation_period || ""
    }));
    onExport("CSR Project", exportData);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="CSR Project" subtitle="Program tanggung jawab sosial perusahaan tahun berjalan" addLabel="Tambah Program" onAdd={() => setShowForm(true)} showDeleted={showDeleted} showSearch searchValue={q} onSearch={setQ} onExport={handleExportClick}>
        <div className="flex items-center gap-2 mr-2">
          <span className="text-sm font-medium text-foreground">Data Terhapus:</span>
          <input 
            type="checkbox" 
            checked={showDeleted} 
            onChange={(e) => setShowDeleted(e.target.checked)} 
            className="w-4 h-4 rounded border-border text-blue-600 focus:ring-ring"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-medium">
          <option value="All">Semua Status</option>
          <option value="Planning">Planning</option>
          <option value="On Going">On Going</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </TopBar>
      <div className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="mb-4 text-xs text-muted-foreground font-mono shrink-0">{displayed.length} program · Total budget: <span className="text-foreground font-semibold">{formatIDR(displayed.reduce((s, c) => s + Number(c.budget || 0), 0))}</span></div>
        <div className="flex-1 min-h-0">
          <DataTable columns={columns} data={displayed} />
        </div>
      </div>
      {showForm && <CsrForm defaultValues={addDraft} onDraftChange={setAddDraft} onClose={() => setShowForm(false)} onSave={handleAdd} showToast={showToast} />}
      {editing && <CsrForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
      {toDelete && <DeleteConfirm label={toDelete.program} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id); setToDelete(null); }} />}
      {toRestore && <RestoreConfirmModal label={(toRestore as any).project_name || toRestore.program || ''} onCancel={() => setToRestore(null)} onConfirm={() => { handleRestore(toRestore.id); setToRestore(null); }} />}
    </div>
  );
}


