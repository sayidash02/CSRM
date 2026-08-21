import { useState, useMemo, useEffect } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { apiClient } from '../../lib/apiClient';
import { Edit2, Trash2, Search, Plus, Download, RotateCcw, History } from "lucide-react";
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { RestoreConfirmModal } from '../../components/ui/RestoreConfirmModal';
import { AuditHistoryDrawer } from '../../components/ui/AuditHistoryDrawer';

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

const emptyGrievanceDraft = {
  register_no: "", log_date: "", complainant_name: "", address: "", phone: "",
  category: "", significance: "Low", description: "", location: "",
  investigation: "", resolution: "", feedback: "", status: "Open",
  completion_date: "", remarks: ""
};

function GrievanceForm({
  initial,
  onClose,
  onSave,
  nextRegNo,
  showToast,
  defaultValues,
  onDraftChange
}: {
  initial?: Grievance;
  onClose: () => void;
  onSave: (d: Omit<Grievance, "id">) => void;
  nextRegNo: string;
  showToast?: (msg: string, type?: "success"|"error"|"info") => void;
  defaultValues?: typeof emptyGrievanceDraft;
  onDraftChange?: (v: typeof emptyGrievanceDraft) => void;
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
          remarks: initial.remarks ?? ""
        }
      : { ...emptyGrievanceDraft, ...defaultValues }
  );

  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial && onDraftChange) onDraftChange(next);
  };

  const handleClear = () => {
    setF({ ...emptyGrievanceDraft });
    if (onDraftChange) onDraftChange({ ...emptyGrievanceDraft });
  };

  const handleSave = () => {
    const missing: string[] = (
      [
        [!f.log_date, "Tgl Masuk"],
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

    onSave({
      register_no: initial ? f.register_no : (nextRegNo.includes("akan") ? "" : nextRegNo),
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
      remarks: f.remarks || null
    });
    if (!initial && onDraftChange) onDraftChange({ ...emptyGrievanceDraft });
    onClose();
  };

  return (
    <Modal title={initial ? "Edit Pengaduan" : "Registrasi Pengaduan (Grievance)"} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="No. Registrasi">
            <input type="text" value={initial ? f.register_no : nextRegNo} disabled className={`${inputCls} opacity-60 font-mono`} />
          </Field>
          <Field label="Tgl Masuk" required>
            <input type="date" value={f.log_date} onChange={e => set("log_date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Status" required>
            <select value={f.status} onChange={e => set("status", e.target.value)} className={inputCls}>
              <option value="Open">Open</option>
              <option value="On Progress">On Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Nama Pelapor" required>
            <input type="text" value={f.complainant_name} onChange={e => set("complainant_name", e.target.value)} placeholder="Nama warga / pelapor" className={inputCls} />
          </Field>
          <Field label="No. Telepon">
            <input type="text" value={f.phone} onChange={e => set("phone", e.target.value)} placeholder="08..." className={inputCls} />
          </Field>
          <Field label="Alamat">
            <input type="text" value={f.address} onChange={e => set("address", e.target.value)} placeholder="Dusun / Desa" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Kategori" required>
            <input type="text" value={f.category} onChange={e => set("category", e.target.value)} placeholder="Misal: Lingkungan, Sosial" className={inputCls} />
          </Field>
          <Field label="Signifikansi">
            <select value={f.significance} onChange={e => set("significance", e.target.value)} className={inputCls}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </Field>
          <Field label="Lokasi Kejadian">
            <input type="text" value={f.location} onChange={e => set("location", e.target.value)} placeholder="Lokasi terkait" className={inputCls} />
          </Field>
        </div>

        <Field label="Deskripsi Pengaduan" required>
          <textarea rows={2} value={f.description} onChange={e => set("description", e.target.value)} placeholder="Rincian keluhan / masalah yang disampaikan" className={`${inputCls} resize-none`} />
        </Field>

        <Field label="Hasil Investigasi">
          <textarea rows={2} value={f.investigation} onChange={e => set("investigation", e.target.value)} placeholder="Fakta lapangan & hasil investigasi tim" className={`${inputCls} resize-none`} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tindakan Resolusi">
            <textarea rows={2} value={f.resolution} onChange={e => set("resolution", e.target.value)} placeholder="Tindakan penyelesaian" className={`${inputCls} resize-none`} />
          </Field>
          <Field label="Feedback Pelapor">
            <textarea rows={2} value={f.feedback} onChange={e => set("feedback", e.target.value)} placeholder="Tanggapan dari pelapor setelah resolusi" className={`${inputCls} resize-none`} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tgl Selesai">
            <input type="date" value={f.completion_date} onChange={e => set("completion_date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Catatan / Remarks">
            <input type="text" value={f.remarks} onChange={e => set("remarks", e.target.value)} placeholder="Keterangan tambahan" className={inputCls} />
          </Field>
        </div>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Pengaduan"} isEdit={!!initial} />
    </Modal>
  );
}

export default function GrievanceModule({ activeYear, onExport, showToast }: { activeYear: string; onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<Grievance[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [addDraft, setAddDraft] = useState({ ...emptyGrievanceDraft });

  useEffect(() => {
    fetchData();
  }, [activeYear, showDeleted]);

  const fetchData = async () => {
    try {
      const yearParam = activeYear ? `year=${activeYear}` : '';
      const isDeletedParam = `is_deleted=${showDeleted}`;
      const queryParams = [yearParam, isDeletedParam].filter(Boolean).join('&');
      const res = await apiClient.get(`/grievance?${queryParams}`);
      setItems(res.data.data || []);
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal mengambil data", "error");
    }
  };

  const handleAdd = async (d: Omit<Grievance, "id">) => {
    try {
      const year = parseInt(activeYear) || new Date().getFullYear();
      await apiClient.post('/grievance', { ...d, year });
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
  const nextRegNo = "Akan dibuat server";

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
    { header: "Investigasi", accessor: "investigation", sortable: true, render: (g) => <div className="max-w-[200px] whitespace-normal text-xs text-slate leading-relaxed line-clamp-2">{g.investigation || "—"}</div> },
    { header: "Resolusi", accessor: "resolution", sortable: true, render: (g) => <div className="max-w-[200px] whitespace-normal text-xs text-slate leading-relaxed line-clamp-2">{g.resolution || "—"}</div> },
    { header: "Feedback", accessor: "feedback", sortable: true, render: (g) => <div className="max-w-[200px] whitespace-normal text-xs text-slate leading-relaxed line-clamp-2">{g.feedback || "—"}</div> },
    { 
      header: "Status", 
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
    { header: "Aksi", render: (g) => showDeleted ? (
      <div className="flex items-center justify-end">
        <button 
          onClick={() => setToRestore(g)} 
          className="px-2.5 py-1 text-xs font-medium text-forest bg-forest/10 hover:bg-forest/20 rounded-md border border-forest/30 flex items-center gap-1"
        >
          <RotateCcw size={12} />
          Restore
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => { setSelectedHistoryId(g.id); setHistoryDrawerOpen(true); }} title="Riwayat Perubahan" className="p-1.5 rounded-md hover:bg-paper-2 text-slate-2 hover:text-ink transition-colors"><History size={13} /></button>
        <button onClick={() => setEditing(g)} title="Edit Pengaduan" className="p-1.5 rounded-md hover:bg-ochre/10 text-slate-2 hover:text-ochre transition-colors"><Edit2 size={13} /></button>
        <button onClick={() => setToDelete(g)} title="Hapus Pengaduan" className="p-1.5 rounded-md hover:bg-clay/10 text-slate-2 hover:text-clay transition-colors"><Trash2 size={13} /></button>
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
      "Remarks": g.remarks || ""
    }));
    onExport("Grievance", exportData);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-paper">
      <TopBar title="Grievance Redress" subtitle="Penanganan pengaduan & keluhan dari masyarakat" addLabel="Tambah Pengaduan" onAdd={() => setShowForm(true)} showDeleted={showDeleted} showSearch searchValue={q} onSearch={setQ} onExport={handleExportClick}>
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
      {showForm && <GrievanceForm defaultValues={addDraft} onDraftChange={setAddDraft} onClose={() => setShowForm(false)} onSave={handleAdd} nextRegNo={nextRegNo} showToast={showToast} />}
      {editing && <GrievanceForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} nextRegNo={editing.register_no} showToast={showToast} />}
      {toDelete && <DeleteConfirm label={`${toDelete.register_no} — ${toDelete.complainant_name}`} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id, toDelete.complainant_name); setToDelete(null); }} />}
      {toRestore && <RestoreConfirmModal label={toRestore.complainant_name || ''} onCancel={() => setToRestore(null)} onConfirm={() => { handleRestore(toRestore.id); setToRestore(null); }} />}
      <AuditHistoryDrawer isOpen={historyDrawerOpen} onClose={() => setHistoryDrawerOpen(false)} entityType="grievance" entityId={selectedHistoryId} />
    </div>
  );
}
