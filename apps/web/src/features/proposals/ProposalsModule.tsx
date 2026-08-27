import { useState, useMemo } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { Edit2, Trash2, Search, Plus, Download, RotateCcw, History } from "lucide-react";
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { RestoreConfirmModal } from '../../components/ui/RestoreConfirmModal';
import { useProposals, useCreateProposal, useEditProposal, useDeleteProposal, useRestoreProposal } from '../../hooks/useProposals';
import { AuditHistoryDrawer } from '../../components/ui/AuditHistoryDrawer';
import { SharepointLinksInput, type DocumentLink } from '../../components/ui/SharepointLinksInput';
import { SharepointLinksBadge } from '../../components/ui/SharepointLinksBadge';

export interface Proposal {
  id: string | number;
  registration_no: string;
  date_received: string;
  institution: string;
  address: string | null;
  proposal_description: string | null;
  status: string;
  sharepoint_links?: DocumentLink[] | null;
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
            <input value={searchValue} onChange={e => onSearch?.(e.target.value)} placeholder="Cari proposal…"
              className="pl-8 pr-3 py-1.5 text-[12px] bg-paper/50 rounded-lg border border-line text-ink outline-none focus:border-forest focus:bg-white w-48 placeholder:text-slate-2" />
          </div>
        )}
        <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate border border-line bg-white rounded-lg hover:bg-paper-2 hover:text-ink transition-colors shadow-2xs cursor-pointer"><Download size={13} />Ekspor Data</button>
        {!showDeleted && onAdd && (
          <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-forest text-white rounded-lg hover:bg-forest-2 transition-colors shadow-2xs font-medium cursor-pointer">
            <Plus size={13} />{addLabel ?? "Tambah Proposal"}
          </button>
        )}
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  Accept: "bg-forest/10 text-forest border border-forest/20",
  Decline: "bg-clay/10 text-clay border border-clay/20",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium font-mono ${statusColors[status] ?? "bg-paper-2 text-slate border border-line"}`}>
      {status}
    </span>
  );
}

export const emptyProposalDraft = {
  registration_no: "", date_received: "", institution: "", address: "",
  proposal_description: "", status: "", sharepoint_links: [] as DocumentLink[]
};

export function ProposalForm({ initial, onClose, onSave, showToast, defaultValues, onDraftChange }: {
  initial?: Proposal;
  onClose: () => void;
  onSave: (d: Omit<Proposal, "id">) => void;
  showToast?: (msg: string, type?: "success"|"error"|"info") => void;
  defaultValues?: typeof emptyProposalDraft;
  onDraftChange?: (v: typeof emptyProposalDraft) => void;
}) {
  const [f, setF] = useState(
    initial
      ? {
          registration_no: initial.registration_no ?? "",
          date_received: initial.date_received ? initial.date_received.split("T")[0] : "",
          institution: initial.institution ?? "",
          address: initial.address ?? "",
          proposal_description: initial.proposal_description ?? "",
          status: initial.status ?? "Accept",
          sharepoint_links: initial.sharepoint_links ?? []
        }
      : { ...emptyProposalDraft, ...defaultValues }
  );

  const set = (k: string, v: any) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };

  const handleClear = () => {
    setF({ ...emptyProposalDraft });
    if (onDraftChange) onDraftChange({ ...emptyProposalDraft });
  };

  const handleSave = () => {
    const missing: string[] = (
      [
        [!f.registration_no?.trim(), "No. Registrasi"],
        [!f.date_received, "Tanggal Diterima"],
        [!f.institution, "Lembaga / Pemohon"],
        [!f.status, "Status Evaluasi"],
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
      registration_no: f.registration_no.trim(),
      sharepoint_links: f.sharepoint_links
    });
    if (!initial && onDraftChange) onDraftChange({ ...emptyProposalDraft });
    onClose();
  };

  return (
    <Modal title={initial ? "Edit Data Proposal" : "Tambah Proposal Masuk Baru"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="No. Registrasi" required hint="Contoh: 001/PROP/2026 atau PROP-2026-0001">
          <input 
            type="text" 
            value={f.registration_no} 
            onChange={e => set("registration_no", e.target.value)} 
            placeholder="Masukkan No. Registrasi Proposal..." 
            className={`${inputCls} font-mono`} 
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal Diterima" required>
            <input type="date" value={f.date_received} onChange={e => set("date_received", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Status Evaluasi" required>
            <select value={f.status} onChange={e => set("status", e.target.value)} className={inputCls}>
              <option value="Accept">Accept (Disetujui)</option>
              <option value="Decline">Decline (Ditolak)</option>
            </select>
          </Field>
        </div>
        <Field label="Nama Lembaga / Pemohon" required>
          <input type="text" value={f.institution} onChange={e => set("institution", e.target.value)} placeholder="Nama lembaga, kelompok, atau instansi pemohon" className={inputCls} />
        </Field>
        <Field label="Alamat Lembaga">
          <input type="text" value={f.address} onChange={e => set("address", e.target.value)} placeholder="Alamat lengkap pemohon" className={inputCls} />
        </Field>
        <Field label="Deskripsi / Rincian Proposal">
          <textarea rows={3} value={f.proposal_description} onChange={e => set("proposal_description", e.target.value)} placeholder="Rincian permohonan bantuan atau kerja sama" className={`${inputCls} resize-none`} />
        </Field>

        <SharepointLinksInput
          value={f.sharepoint_links}
          onChange={(links) => set("sharepoint_links", links)}
        />
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Proposal"} isEdit={!!initial} />
    </Modal>
  );
}

export default function ProposalsModule({ activeYear, onExport, showToast }: { activeYear: string; onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [showDeleted, setShowDeleted] = useState(false);
  const { data: items = [], refetch } = useProposals(activeYear, showDeleted);

  const createMutation = useCreateProposal();
  const editMutation = useEditProposal();
  const deleteMutation = useDeleteProposal();
  const restoreMutation = useRestoreProposal();

  const [addDraft, setAddDraft] = useState({ ...emptyProposalDraft });

  const handleAdd = async (d: Omit<Proposal, "id">) => {
    try {
      await createMutation.mutateAsync(d);
      if (showToast) showToast(`Proposal '${d.institution}' berhasil ditambahkan`, "success");
      refetch();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal menyimpan proposal", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<Proposal, "id">) => {
    try {
      await editMutation.mutateAsync({ id, data: d });
      if (showToast) showToast(`Proposal '${d.institution}' berhasil diperbarui`, "success");
      refetch();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memperbarui proposal", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteMutation.mutateAsync(id);
      if (showToast) showToast("Proposal berhasil dihapus", "success");
      refetch();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal menghapus proposal", "error");
    }
  };

  const handleRestore = async (id: string | number) => {
    try {
      await restoreMutation.mutateAsync(id);
      if (showToast) showToast("Proposal berhasil dipulihkan", "success");
      refetch();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan proposal", "error");
    }
  };

  const { q, setQ, filtered } = useGlobalSearch(items);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [toDelete, setToDelete] = useState<Proposal | null>(null);
  const [toRestore, setToRestore] = useState<Proposal | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | number | null>(null);
  
  const displayed = filtered;

  const columns: ColumnDef<Proposal>[] = useMemo(() => [
    { header: "No. Reg", accessor: "registration_no", sortable: true, render: (p) => <span className="text-xs font-mono font-medium text-forest">{p.registration_no}</span> },
    { header: "Tanggal Terima", accessor: "date_received", sortable: true, render: (p) => <span className="text-xs text-slate font-mono whitespace-nowrap">{formatDate(p.date_received)}</span> },
    { header: "Lembaga & Alamat", accessor: "institution", sortable: true, render: (p) => <div><div className="text-[13px] font-medium text-ink truncate max-w-[170px]">{p.institution}</div><div className="text-xs text-slate mt-0.5 truncate max-w-[170px]">{p.address}</div></div> },
    { header: "Deskripsi Proposal", accessor: "proposal_description", sortable: true, render: (p) => <div className="text-xs text-slate max-w-xs leading-relaxed"><div className="line-clamp-2">{p.proposal_description}</div></div> },
    { 
      header: "Status", 
      accessor: "status", 
      sortable: true, 
      filterOptions: [
        { label: "Semua Status", value: "all" },
        { label: "Accept", value: "Accept" },
        { label: "Decline", value: "Decline" }
      ],
      render: (p) => <StatusBadge status={p.status} /> 
    },
    {
      header: "Tautan",
      className: "text-center whitespace-nowrap",
      render: (p) => <SharepointLinksBadge links={p.sharepoint_links} />
    },
    { header: "Aksi", render: (p) => showDeleted ? (
      <div className="flex items-center justify-end">
        <button 
          onClick={() => setToRestore(p)} 
          className="px-2.5 py-1 text-xs font-medium text-forest bg-forest/10 hover:bg-forest/20 rounded-md border border-forest/30 flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw size={12} />
          Pulihkan
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => { setSelectedHistoryId(p.id); setHistoryDrawerOpen(true); }} title="Riwayat Perubahan" className="p-1.5 rounded-md hover:bg-paper-2 text-slate-2 hover:text-ink transition-colors cursor-pointer"><History size={13} /></button>
        <button onClick={() => setEditing(p)} title="Edit Proposal" className="p-1.5 rounded-md hover:bg-ochre/10 text-slate-2 hover:text-ochre transition-colors cursor-pointer"><Edit2 size={13} /></button>
        <button onClick={() => setToDelete(p)} title="Hapus Proposal" className="p-1.5 rounded-md hover:bg-clay/10 text-slate-2 hover:text-clay transition-colors cursor-pointer"><Trash2 size={13} /></button>
      </div>
    )}
  ], [showDeleted]);

  const handleExportClick = () => {
    const exportData = displayed.map(p => ({
      "Registration No": p.registration_no,
      "Date": formatDate(p.date_received),
      "Institution": p.institution,
      "Address": p.address || "",
      "Proposal Description": p.proposal_description || "",
      "Status": p.status
    }));
    onExport("Proposal", exportData);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-paper">
      <TopBar title="Proposals" subtitle="Pencatatan, evaluasi kelayakan, dan status proposal masuk" addLabel="Tambah Proposal" onAdd={() => setShowForm(true)} showDeleted={showDeleted} showSearch searchValue={q} onSearch={setQ} onExport={handleExportClick}>
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
        <div className="mt-2 text-xs text-slate font-mono">Menampilkan {displayed.length} dari {items.length} proposal</div>
      </div>
      {showForm && <ProposalForm defaultValues={addDraft} onDraftChange={setAddDraft} onClose={() => setShowForm(false)} onSave={handleAdd} showToast={showToast} />}
      {editing && <ProposalForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
      {toDelete && <DeleteConfirm label={`${toDelete.registration_no} — ${toDelete.institution}`} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id); setToDelete(null); }} />}
      {toRestore && <RestoreConfirmModal label={`${toRestore.registration_no} — ${toRestore.institution}`} onCancel={() => setToRestore(null)} onConfirm={() => { handleRestore(toRestore.id); setToRestore(null); }} />}
      <AuditHistoryDrawer isOpen={historyDrawerOpen} onClose={() => setHistoryDrawerOpen(false)} entityType="proposals" entityId={selectedHistoryId} />
    </div>
  );
}
