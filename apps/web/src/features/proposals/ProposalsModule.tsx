import React, { useState, useMemo, useEffect } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { apiClient } from '../../lib/apiClient';
import { Edit2, ExternalLink, Trash2, Search, Plus, Download } from "lucide-react";
import { FileInput } from '../../components/ui/FileInput';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Modal, ModalFooter } from '../../components/ui/Modal';

export interface Proposal {
  id: string | number;
  registration_no: string;
  date_received: string;
  institution: string;
  address: string | null;
  proposal_description: string | null;
  proposal_file: string | null;
  assessment_file: string | null;
  status: string;
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
    Approved:"bg-emerald-100 text-emerald-700", "Under Review":"bg-amber-100 text-amber-700",
    Declined:"bg-red-100 text-red-600"
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono ${map[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

const emptyProposalDraft = {
  registration_no: "", date_received: "", institution: "", address: "",
  proposal_description: "", proposal_file: "", assessment_file: "", status: "Under Review"
};

function ProposalForm({ initial, onClose, onSave, nextRegNo, showToast, defaultValues, onDraftChange }: {
  initial?: Proposal;
  onClose: () => void;
  onSave: (d: Omit<Proposal, "id">) => void;
  nextRegNo: string;
  showToast?: (msg: string, type?: "success"|"error"|"info") => void;
  defaultValues?: typeof emptyProposalDraft;
  onDraftChange?: (v: typeof emptyProposalDraft) => void;
}) {
  const [f, setF] = useState(
    initial
      ? { registration_no: initial.registration_no ?? nextRegNo, date_received: initial.date_received ? String(initial.date_received).split('T')[0] : "", institution: initial.institution ?? "", address: initial.address ?? "", proposal_description: initial.proposal_description ?? "", proposal_file: initial.proposal_file ?? "", assessment_file: initial.assessment_file ?? "", status: initial.status ?? "Under Review" }
      : { ...emptyProposalDraft, registration_no: defaultValues?.registration_no || nextRegNo, ...defaultValues }
  );
  
  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };

  const handleClear = () => {
    const cleared = { ...emptyProposalDraft, registration_no: nextRegNo };
    setF(cleared);
    onDraftChange?.(cleared);
  };
  
  const handleSave = () => {
    const missing: string[] = (
      [
        [!f.institution, "Nama Institusi"],
        [!f.date_received, "Tanggal Diterima"],
        [!f.registration_no, "No. Registrasi"],
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
      proposal_file: f.proposal_file || null,
      assessment_file: f.assessment_file || null,
      address: f.address || null,
      proposal_description: f.proposal_description || null
    });
    if (!initial) onDraftChange?.({ ...emptyProposalDraft });
    onClose();
  };
  
  return (
    <Modal title={initial ? "Edit Proposal" : "Tambah Proposal"} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="No. Registrasi"><input type="text" value={f.registration_no} onChange={e => set("registration_no", e.target.value)} className={inputCls} /></Field>
          <Field label="Tanggal Penerimaan" required><input type="date" value={f.date_received} onChange={e => set("date_received", e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Institusi / Pemohon" required><input type="text" value={f.institution} onChange={e => set("institution", e.target.value)} placeholder="Nama institusi atau kelompok" className={inputCls} /></Field>
        <Field label="Alamat"><input type="text" value={f.address || ''} onChange={e => set("address", e.target.value)} placeholder="Alamat lengkap" className={inputCls} /></Field>
        <Field label="Keterangan Proposal"><textarea rows={3} value={f.proposal_description || ''} onChange={e => set("proposal_description", e.target.value)} placeholder="Ringkasan isi proposal" className={`${inputCls} resize-none`} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="File Proposal">
            <FileInput 
              value={f.proposal_file || null} 
              onChange={url => set("proposal_file", url)}
              activityDate={f.date_received}
              picName={f.institution}
            />
          </Field>
          <Field label="File Assessment">
            <FileInput 
              value={f.assessment_file || null} 
              onChange={url => set("assessment_file", url)}
              activityDate={f.date_received}
              picName={f.institution}
            />
          </Field>
        </div>
        <Field label="Status"><select value={f.status} onChange={e => set("status", e.target.value)} className={inputCls}><option>Under Review</option><option>Approved</option><option>Declined</option></select></Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Proposal"} isEdit={!!initial} />
    </Modal>
  );
}

export default function ProposalsModule({ onExport, showToast }: { onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<Proposal[]>([]);
  const [addDraft, setAddDraft] = useState({ ...emptyProposalDraft });
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/proposals');
      setItems(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (d: Omit<Proposal, "id">) => {
    try {
      await apiClient.post('/proposals', d);
      fetchData();
      showToast(`Proposal dari '${d.institution}' berhasil ditambahkan`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<Proposal, "id">) => {
    try {
      await apiClient.put(`/proposals/${id}`, d);
      fetchData();
      showToast(`Proposal dari '${d.institution}' berhasil diperbarui`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/proposals/${id}`);
      fetchData();
      showToast(`Proposal dari '${toDelete?.institution || ''}' berhasil dihapus`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };

  const { q, setQ, filtered } = useGlobalSearch(items);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [toDelete, setToDelete] = useState<Proposal | null>(null);
  
  const displayed = statusFilter === "All" ? filtered : filtered.filter(p => p.status === statusFilter);
  const nextRegNo = `PRP-2026-${String(items.length + 1).padStart(4, "0")}`;

  const columns: ColumnDef<Proposal>[] = useMemo(() => [
    { header: "No. Reg", accessor: "registration_no", sortable: true, render: (p) => <span className="text-xs font-mono text-blue-600">{p.registration_no}</span> },
    { header: "Tgl Terima", accessor: "date_received", sortable: true, render: (p) => <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{formatDate(p.date_received)}</span> },
    { header: "Institusi", accessor: "institution", sortable: true, render: (p) => <div><div className="text-sm font-medium text-foreground truncate max-w-[150px]">{p.institution}</div><div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[150px]">{p.address}</div></div> },
    { header: "Keterangan", accessor: "proposal_description", sortable: true, render: (p) => <div className="text-sm text-foreground max-w-xs"><div className="line-clamp-2">{p.proposal_description}</div></div> },
    { header: "Status", accessor: "status", sortable: true, render: (p) => <StatusBadge status={p.status} /> },
    { header: "Files", render: (p) => (
      <div className="flex items-center gap-1.5 flex-wrap">
        {p.proposal_file && <span className="text-xs text-blue-600 cursor-pointer flex items-center gap-0.5"><ExternalLink size={11} />Prop</span>}
        {p.assessment_file && <span className="text-xs text-violet-600 cursor-pointer flex items-center gap-0.5"><ExternalLink size={11} />Assess</span>}
      </div>
    )},
    { header: "", render: (p) => (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => setEditing(p)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600"><Edit2 size={12} /></button>
        <button onClick={() => setToDelete(p)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"><Trash2 size={12} /></button>
      </div>
    )}
  ], []);

  const handleExportClick = () => {
    const exportData = displayed.map(p => ({
      "Registration No": p.registration_no,
      "Date": formatDate(p.date_received),
      "Institution": p.institution,
      "Address": p.address || "",
      "Proposal Description": p.proposal_description || "",
      "Status": p.status
    }));
    onExport("Proposals", exportData);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Proposals" subtitle="Manajemen proposal masuk dari komunitas & mitra" addLabel="Tambah Proposal" onAdd={() => setShowForm(true)} showSearch searchValue={q} onSearch={setQ} onExport={handleExportClick}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-medium">
          <option value="All">Semua Status</option>
          {Array.from(new Set(items.map(i => i.status))).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </TopBar>
      <div className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="flex-1 min-h-0">
          <DataTable columns={columns} data={displayed} />
        </div>
        <div className="mt-2 text-xs text-muted-foreground font-mono">Menampilkan {displayed.length} dari {items.length} proposal</div>
      </div>
      {showForm && <ProposalForm defaultValues={addDraft} onDraftChange={setAddDraft} onClose={() => setShowForm(false)} onSave={handleAdd} nextRegNo={nextRegNo} showToast={showToast} />}
      {editing && <ProposalForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} nextRegNo={editing.registration_no} showToast={showToast} />}
      {toDelete && <DeleteConfirm label={`${toDelete.registration_no} — ${toDelete.institution}`} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}

