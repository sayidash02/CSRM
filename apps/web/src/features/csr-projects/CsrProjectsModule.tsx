import { useState, useMemo, useEffect } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { apiClient } from '../../lib/apiClient';
import { Edit2, Trash2, Search, Plus, Download, RotateCcw, History } from "lucide-react";
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Modal, ModalFooter } from "../../components/ui/Modal";
import { RestoreConfirmModal } from '../../components/ui/RestoreConfirmModal';
import { AuditHistoryDrawer } from '../../components/ui/AuditHistoryDrawer';

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
  grievance_id?: string | number | null;
  grievance?: any;
}

const formatIDR = (n: number | null) => {
  if (!n) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
};

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "On Going": "bg-forest/10 text-forest border border-forest/20",
    Planning: "bg-ochre/10 text-ochre border border-ochre/20",
    Completed: "bg-forest/20 text-forest font-semibold border border-forest/30",
    Cancelled: "bg-clay/10 text-clay border border-clay/20",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium font-mono ${map[status] ?? "bg-paper-2 text-slate border border-line"}`}>{status}</span>;
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
            <input value={searchValue} onChange={e => onSearch?.(e.target.value)} placeholder="Cari program CSR…"
              className="pl-8 pr-3 py-1.5 text-[12px] bg-paper/50 rounded-lg border border-line text-ink outline-none focus:border-forest focus:bg-white w-48 placeholder:text-slate-2" />
          </div>
        )}
        <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate border border-line bg-white rounded-lg hover:bg-paper-2 hover:text-ink transition-colors shadow-2xs"><Download size={13} />Export</button>
        {!showDeleted && onAdd && (
          <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-forest text-white rounded-lg hover:bg-forest-2 transition-colors shadow-2xs font-medium">
            <Plus size={13} />{addLabel ?? "Tambah"}
          </button>
        )}
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
  grievance_id: ""
};

function CsrForm({
  initial,
  onClose,
  onSave,
  showToast,
  defaultValues,
  onDraftChange
}: {
  initial?: CsrProject;
  onClose: () => void;
  onSave: (d: Omit<CsrProject, "id">) => void;
  showToast?: (msg: string, type?: "success"|"error"|"info") => void;
  defaultValues?: typeof emptyCsrDraft;
  onDraftChange?: (v: typeof emptyCsrDraft) => void;
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
          grievance_id: initial.grievance_id ? String(initial.grievance_id) : ""
        }
      : { ...emptyCsrDraft, ...defaultValues }
  );

  const [grievances, setGrievances] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/grievance').then(res => {
      setGrievances(res.data.data || []);
    }).catch(() => undefined);
  }, []);

  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial && onDraftChange) onDraftChange(next);
  };

  const handleClear = () => {
    setF({ ...emptyCsrDraft });
    if (onDraftChange) onDraftChange({ ...emptyCsrDraft });
  };

  const handleSave = () => {
    const missing: string[] = (
      [
        [!f.program, "Program"],
        [!f.status, "Status"],
      ] as [boolean, string][]
    ).filter(([cond]) => cond).map(([, label]) => label);

    if (missing.length > 0) {
      if (showToast) {
        showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
      }
      return;
    }

    onSave({
      project_year: parseInt(f.project_year) || new Date().getFullYear(),
      program: f.program,
      activity: f.activity || null,
      type_of_activity: f.type_of_activity || null,
      location: f.location || null,
      target_beneficiaries: f.target_beneficiaries || null,
      objective: f.objective || null,
      status: f.status,
      budget: f.budget ? parseFloat(f.budget) : null,
      implementation_period: f.implementation_period || null,
      grievance_id: f.grievance_id ? f.grievance_id : null
    });
    if (!initial && onDraftChange) onDraftChange({ ...emptyCsrDraft });
    onClose();
  };

  return (
    <Modal title={initial ? "Edit CSR Project" : "Tambah Program CSR"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tahun" required>
            <input type="number" value={f.project_year} onChange={e => set("project_year", e.target.value)} className={`${inputCls} font-mono`} />
          </Field>
          <Field label="Status" required>
            <select value={f.status} onChange={e => set("status", e.target.value)} className={inputCls}>
              <option value="Planning">Planning</option>
              <option value="On Going">On Going</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </Field>
        </div>
        <Field label="Program" required>
          <input type="text" value={f.program} onChange={e => set("program", e.target.value)} placeholder="Nama program CSR" className={inputCls} />
        </Field>
        <Field label="Kegiatan">
          <input type="text" value={f.activity} onChange={e => set("activity", e.target.value)} placeholder="Rincian kegiatan" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bentuk Kegiatan">
            <input type="text" value={f.type_of_activity} onChange={e => set("type_of_activity", e.target.value)} placeholder="Misal: Pelatihan / Bantuan" className={inputCls} />
          </Field>
          <Field label="Lokasi">
            <input type="text" value={f.location} onChange={e => set("location", e.target.value)} placeholder="Desa / Kecamatan" className={inputCls} />
          </Field>
        </div>
        <Field label="Target/Sasaran">
          <input type="text" value={f.target_beneficiaries} onChange={e => set("target_beneficiaries", e.target.value)} placeholder="Kelompok masyarakat sasaran" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget / Anggaran">
            <CurrencyInput value={f.budget} onChange={v => set("budget", v)} placeholder="Rp 0" className={inputCls} />
          </Field>
          <Field label="Periode Pelaksanaan">
            <input type="text" value={f.implementation_period} onChange={e => set("implementation_period", e.target.value)} placeholder="Misal: Q1 2026 / Jan-Mar" className={inputCls} />
          </Field>
        </div>
        <Field label="Tujuan">
          <textarea rows={2} value={f.objective} onChange={e => set("objective", e.target.value)} placeholder="Tujuan program" className={`${inputCls} resize-none`} />
        </Field>
        <Field label="Terkait Pengaduan (Opsional)">
          <select value={f.grievance_id} onChange={e => set("grievance_id", e.target.value)} className={inputCls}>
            <option value="">— Tidak ada —</option>
            {grievances.map(g => (
              <option key={g.id} value={g.id}>{g.register_no} — {g.complaint_issue}</option>
            ))}
          </select>
        </Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Program"} isEdit={!!initial} />
    </Modal>
  );
}

export default function CsrProjectsModule({ activeYear, onExport, showToast }: { activeYear: string; onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<CsrProject[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [addDraft, setAddDraft] = useState({ ...emptyCsrDraft });

  useEffect(() => {
    fetchData();
  }, [activeYear, showDeleted]);

  const fetchData = async () => {
    try {
      const yearParam = activeYear ? `year=${activeYear}` : '';
      const isDeletedParam = `is_deleted=${showDeleted}`;
      const queryParams = [yearParam, isDeletedParam].filter(Boolean).join('&');
      const res = await apiClient.get(`/csr-projects?${queryParams}`);
      setItems(res.data.data || []);
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal mengambil data", "error");
    }
  };

  const handleAdd = async (d: Omit<CsrProject, "id">) => {
    try {
      const year = parseInt(activeYear) || new Date().getFullYear();
      await apiClient.post('/csr-projects', { ...d, project_year: d.project_year || year });
      if (showToast) showToast(`Program '${d.program}' berhasil ditambahkan`, "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<CsrProject, "id">) => {
    try {
      const year = parseInt(activeYear) || new Date().getFullYear();
      await apiClient.put(`/csr-projects/${id}`, { ...d, project_year: d.project_year || year });
      if (showToast) showToast(`Program '${d.program}' berhasil diperbarui`, "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number, title?: string) => {
    try {
      await apiClient.delete(`/csr-projects/${id}`);
      if (showToast) showToast(`Program '${title || ''}' berhasil dihapus`, "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal menghapus data", "error");
    }
  };

  const handleRestore = async (id: string | number) => {
    try {
      await apiClient.patch(`/csr-projects/${id}/restore`);
      if (showToast) showToast("Program berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };

  const { q, setQ, filtered } = useGlobalSearch(items);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CsrProject | null>(null);
  const [toDelete, setToDelete] = useState<CsrProject | null>(null);
  const [toRestore, setToRestore] = useState<CsrProject | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | number | null>(null);

  const displayed = filtered;

  const columns: ColumnDef<CsrProject>[] = useMemo(() => [
    { header: "Tahun", accessor: "project_year", sortable: true, render: (p) => <div className="text-xs font-mono text-slate">{p.project_year}</div> },
    { header: "Program", accessor: "program", sortable: true, render: (p) => <div className="text-[13px] font-semibold text-ink whitespace-normal">{p.program}</div> },
    { header: "Kegiatan", accessor: "activity", sortable: true, render: (p) => <div className="text-xs text-slate whitespace-normal">{p.activity || "—"}</div> },
    { header: "Bentuk Kegiatan", accessor: "type_of_activity", sortable: true, render: (p) => <div className="text-xs text-slate">{p.type_of_activity || "—"}</div> },
    { header: "Lokasi", accessor: "location", sortable: true, render: (p) => <div className="text-xs text-slate whitespace-normal">{p.location || "—"}</div> },
    { header: "Target/Sasaran", accessor: "target_beneficiaries", sortable: true, render: (p) => <div className="text-xs text-slate whitespace-normal">{p.target_beneficiaries || "—"}</div> },
    { header: "Tujuan", accessor: "objective", sortable: true, render: (p) => <div className="text-xs text-slate italic leading-relaxed max-w-[200px] whitespace-normal"><div className="line-clamp-2">{p.objective || "—"}</div></div> },
    { 
      header: "Status", 
      accessor: "status", 
      sortable: true, 
      filterOptions: [
        { label: "Semua Status", value: "All" },
        { label: "Planning", value: "Planning" },
        { label: "On Going", value: "On Going" },
        { label: "Completed", value: "Completed" },
        { label: "Cancelled", value: "Cancelled" }
      ],
      render: (p) => <StatusBadge status={p.status} /> 
    },
    { header: "Realisasi", accessor: "budget", sortable: true, render: (p) => <div className="text-[13px] font-semibold font-mono text-ink whitespace-nowrap text-right">{formatIDR(p.budget)}</div> },
    { header: "Periode", accessor: "implementation_period", sortable: true, render: (p) => <div className="text-xs font-mono text-slate whitespace-nowrap">{p.implementation_period || "—"}</div> },
    { header: "Aksi", render: (p) => showDeleted ? (
      <div className="flex items-center justify-end">
        <button 
          onClick={() => setToRestore(p)} 
          className="px-2.5 py-1 text-xs font-medium text-forest bg-forest/10 hover:bg-forest/20 rounded-md border border-forest/30 flex items-center gap-1"
        >
          <RotateCcw size={12} />
          Restore
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => { setSelectedHistoryId(p.id); setHistoryDrawerOpen(true); }} title="Riwayat Perubahan" className="p-1.5 rounded-md hover:bg-paper-2 text-slate-2 hover:text-ink transition-colors"><History size={13} /></button>
        <button onClick={() => setEditing(p)} title="Edit Program" className="p-1.5 rounded-md hover:bg-ochre/10 text-slate-2 hover:text-ochre transition-colors"><Edit2 size={13} /></button>
        <button onClick={() => setToDelete(p)} title="Hapus Program" className="p-1.5 rounded-md hover:bg-clay/10 text-slate-2 hover:text-clay transition-colors"><Trash2 size={13} /></button>
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
    <div className="flex-1 flex flex-col overflow-hidden bg-paper">
      <TopBar title="CSR Project" subtitle="Program tanggung jawab sosial perusahaan tahun berjalan" addLabel="Tambah Program" onAdd={() => setShowForm(true)} showDeleted={showDeleted} showSearch searchValue={q} onSearch={setQ} onExport={handleExportClick}>
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
        <div className="mb-3 text-xs text-slate font-mono shrink-0">{displayed.length} program · Total budget: <span className="text-ink font-semibold">{formatIDR(displayed.reduce((s, c) => s + Number(c.budget || 0), 0))}</span></div>
        <div className="flex-1 min-h-0">
          <DataTable columns={columns} data={displayed} />
        </div>
      </div>
      {showForm && <CsrForm defaultValues={addDraft} onDraftChange={setAddDraft} onClose={() => setShowForm(false)} onSave={handleAdd} showToast={showToast} />}
      {editing && <CsrForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
      {toDelete && <DeleteConfirm label={toDelete.program} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id, toDelete.program); setToDelete(null); }} />}
      {toRestore && <RestoreConfirmModal label={toRestore.program || ''} onCancel={() => setToRestore(null)} onConfirm={() => { handleRestore(toRestore.id); setToRestore(null); }} />}
      <AuditHistoryDrawer isOpen={historyDrawerOpen} onClose={() => setHistoryDrawerOpen(false)} entityType="csr_projects" entityId={selectedHistoryId} />
    </div>
  );
}
