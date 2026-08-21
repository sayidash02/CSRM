import React, { useState, useMemo, useEffect } from "react";
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

const emptyGrievanceDraft = {
  register_no: "", log_date: "", complainant_name: "", address: "", phone: "",
  category: "", significance: "Low", description: "", location: "",
  investigation: "", resolution: "", feedback: "", status: "Open",
  completion_date: "", remarks: ""
};

function GrievanceForm({
  initial,
  defaultValues,
  onDraftChange,
  onClose,
  onSave,
  nextRegNo,
  showToast
}: {
  initial?: Grievance;
  defaultValues?: typeof emptyGrievanceDraft;
  onDraftChange?: (v: typeof emptyGrievanceDraft) => void;
  onClose: () => void;
  onSave: (d: Omit<Grievance, "id">) => void;
  nextRegNo: string;
  showToast?: (msg: string, type?: "success"|"error"|"info") => void;
}) {
  const [f, setF] = useState(
    initial
      ? { register_no: initial.register_no ?? nextRegNo, log_date: initial.log_date ? String(initial.log_date).split('T')[0] : "", complainant_name: initial.complainant_name ?? "", address: initial.address ?? "", phone: initial.phone ?? "", category: initial.category ?? "", significance: initial.significance ?? "Low", description: initial.description ?? "", location: initial.location ?? "", investigation: initial.investigation ?? "", resolution: initial.resolution ?? "", feedback: initial.feedback ?? "", status: initial.status ?? "Open", completion_date: initial.completion_date ? String(initial.completion_date).split('T')[0] : "", remarks: initial.remarks ?? "" }
      : { ...emptyGrievanceDraft, register_no: defaultValues?.register_no || nextRegNo, ...defaultValues }
  );
  
  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };

  const handleClear = () => {
    const cleared = { ...emptyGrievanceDraft, register_no: nextRegNo };
    setF(cleared);
    onDraftChange?.(cleared);
  };

  const handleSave = () => {
    const missing: string[] = (
      [
        [!f.log_date, "Tanggal Pengaduan"],
        [!f.complainant_name, "Nama Pelapor"],
        [!f.significance, "Signifikansi"],
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
      resolution: f.resolution || null,
      feedback: f.feedback || null,
      completion_date: f.completion_date || null,
      remarks: f.remarks || null
    });
    if (!initial) onDraftChange?.({ ...emptyGrievanceDraft });
    onClose();
  };
  
  return (
    <Modal title={initial ? "Edit Pengaduan" : "Tambah Pengaduan"} onClose={onClose} size="lg">
      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="No. Registrasi" hint="Dibuat otomatis oleh server"><input type="text" value={initial ? f.register_no : "Akan dibuat server"} readOnly className={`${inputCls} font-mono bg-muted text-muted-foreground`} /></Field>
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
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Pengaduan"} isEdit={!!initial} />
    </Modal>
  );
}

export default function GrievanceModule({ activeYear, onExport, showToast }: { activeYear: string; onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<Grievance[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, [activeYear, showDeleted]);

  const fetchData = async () => {
    try {
      const yearParam = activeYear ? `year=${activeYear}` : '';
      const isDeletedParam = `is_deleted=${showDeleted}`;
      const queryParams = [yearParam, isDeletedParam].filter(Boolean).join('&');
      const res = await apiClient.get(`/grievance?${queryParams}`);
      setItems(res.data.data);
    } catch (e: any) {
      console.error(e);
      if (showToast) showToast(e.response?.data?.error || "Gagal mengambil data", "error");
    }
  };

  const handleAdd = async (d: Omit<Grievance, "id">) => {
    try {
      await apiClient.post('/grievance', d);
      fetchData();
      showToast(`Keluhan dari '${d.complainant_name}' berhasil ditambahkan`, "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<Grievance, "id">) => {
    try {
      await apiClient.put(`/grievance/${id}`, d);
      fetchData();
      showToast(`Keluhan dari '${d.complainant_name}' berhasil diperbarui`, "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number, name?: string) => {
    try {
      await apiClient.delete(`/grievance/${id}`);
      fetchData();
      showToast(`Keluhan dari '${name || ''}' berhasil dihapus`, "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menghapus data", "error");
    }
  };

  const handleRestore = async (id: string | number) => {
    try {
      await apiClient.patch(`/grievance/${id}/restore`);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
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
  const [addDraft, setAddDraft] = useState({ ...emptyGrievanceDraft });
  
  const nextRegNo = "Akan dibuat server";
  const displayed = filtered;

  const columns: ColumnDef<Grievance>[] = useMemo(() => [
    { 
      header: "No. Reg & Sig.", 
      accessor: "significance", 
      sortable: true, 
      filterOptions: [
        { label: "Semua Signifikansi", value: "All" },
        { label: "Low", value: "Low" },
        { label: "Medium", value: "Medium" },
        { label: "High", value: "High" },
        { label: "Critical", value: "Critical" }
      ],
      render: (g) => <div><span className="text-xs font-mono text-blue-600">{g.register_no}</span><div className="mt-1"><SignificanceBadge level={g.significance} /></div></div> 
    },
    { header: "Pelapor & Kontak", accessor: "complainant_name", sortable: true, render: (g) => <div><div className="text-sm font-medium text-foreground">{g.complainant_name}</div><div className="text-xs text-muted-foreground mt-0.5">{g.phone}</div><div className="text-xs text-muted-foreground mt-0.5">{g.address}</div></div> },
    { header: "Tanggal & Kategori", accessor: "log_date", sortable: true, render: (g) => <div><div className="text-xs text-muted-foreground font-mono">{formatDate(g.log_date)}</div><div className="text-xs text-muted-foreground mt-0.5">{g.category}</div></div> },
    { header: "Deskripsi & Lokasi", accessor: "description", sortable: true, render: (g) => <div className="max-w-[200px] whitespace-normal"><div className="text-sm text-foreground line-clamp-2">{g.description}</div><div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{g.location}</div></div> },
    { header: "Investigasi", accessor: "investigation", sortable: true, render: (g) => <div className="max-w-[200px] whitespace-normal text-xs text-muted-foreground line-clamp-2">{g.investigation || "—"}</div> },
    { header: "Resolusi", accessor: "resolution", sortable: true, render: (g) => <div className="max-w-[200px] whitespace-normal text-xs text-muted-foreground line-clamp-2">{g.resolution || "—"}</div> },
    { header: "Feedback Pelapor", accessor: "feedback", sortable: true, render: (g) => <div className="max-w-[200px] whitespace-normal text-xs text-muted-foreground line-clamp-2">{g.feedback || "—"}</div> },
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
      render: (g) => <div><StatusBadge status={g.status} />{g.completion_date && <div className="text-xs text-muted-foreground font-mono mt-1">Selesai: {formatDate(g.completion_date)}</div>}</div> 
    },
    { header: "", render: (g) => showDeleted ? (
      <div className="flex items-center justify-end">
        <button 
          onClick={() => setToRestore(g)} 
          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1"
        >
          <RotateCcw size={12} />
          Restore
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => { setSelectedHistoryId(g.id); setHistoryDrawerOpen(true); }} title="Riwayat Perubahan" className="p-1.5 rounded hover:bg-gray-100 text-muted-foreground hover:text-gray-800 transition-colors"><History size={13} /></button>
        <button onClick={() => setEditing(g)} className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={13} /></button>
        <button onClick={() => setToDelete(g)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
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
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Grievance" subtitle="Penanganan pengaduan & keluhan dari masyarakat" addLabel="Tambah Pengaduan" onAdd={() => setShowForm(true)} showDeleted={showDeleted} showSearch searchValue={q} onSearch={setQ} onExport={handleExportClick}>
        <div className="flex items-center gap-2 mr-2">
          <span className="text-sm font-medium text-foreground">Data Terhapus:</span>
          <input 
            type="checkbox" 
            checked={showDeleted} 
            onChange={(e) => setShowDeleted(e.target.checked)} 
            className="w-4 h-4 rounded border-border text-blue-600 focus:ring-ring cursor-pointer"
          />
        </div>
      </TopBar>
      <div className="flex-1 overflow-auto p-6 flex flex-col">
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
