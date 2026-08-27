import { useState, useMemo, useEffect, useCallback } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { apiClient } from '../../lib/apiClient';
import { Edit2, Trash2, Search, Plus, Download, AlertTriangle, RotateCcw, History } from "lucide-react";
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { RestoreConfirmModal } from '../../components/ui/RestoreConfirmModal';
import { AuditHistoryDrawer } from '../../components/ui/AuditHistoryDrawer';
import { SharepointLinksInput, type DocumentLink } from '../../components/ui/SharepointLinksInput';
import { SharepointLinksBadge } from '../../components/ui/SharepointLinksBadge';

export interface LrpProgram {
  id: string | number;
  program: string;
  year: number;
  sharepoint_links?: DocumentLink[] | null;
}

type LrpFormData = Omit<LrpProgram, 'id' | 'year'>;

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
            <input value={searchValue} onChange={e => onSearch?.(e.target.value)} placeholder="Cari program LRP…"
              className="pl-8 pr-3 py-1.5 text-[12px] bg-paper/50 rounded-lg border border-line text-ink outline-none focus:border-forest focus:bg-white w-48 placeholder:text-slate-2" />
          </div>
        )}
        <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate border border-line bg-white rounded-lg hover:bg-paper-2 hover:text-ink transition-colors shadow-2xs cursor-pointer"><Download size={13} />Ekspor Data</button>
        {!showDeleted && onAdd && (
          <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-forest text-white rounded-lg hover:bg-forest-2 transition-colors shadow-2xs font-medium cursor-pointer">
            <Plus size={13} />{addLabel ?? "Tambah Program LRP"}
          </button>
        )}
      </div>
    </div>
  );
}

export const emptyLrpDraft = {
  program: "",
  sharepoint_links: [] as DocumentLink[]
};

export function LrpForm({
  initial,
  defaultValues,
  onDraftChange,
  onClose,
  onSave,
  showToast,
}: {
  initial?: LrpProgram;
  defaultValues?: typeof emptyLrpDraft;
  onDraftChange?: (v: typeof emptyLrpDraft) => void;
  onClose: () => void;
  onSave: (d: LrpFormData) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [f, setF] = useState(
    initial
      ? {
          program: initial.program ?? "",
          sharepoint_links: initial.sharepoint_links ?? []
        }
      : { ...emptyLrpDraft, ...defaultValues }
  );

  const set = (k: string, v: any) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial && onDraftChange) onDraftChange(next);
  };

  const handleClear = () => {
    setF({ ...emptyLrpDraft });
    if (onDraftChange) onDraftChange({ ...emptyLrpDraft });
  };

  const handleSave = () => {
    if (!f.program.trim()) {
      showToast?.("Nama program belum diisi", "error");
      return;
    }
    onSave(f);
    if (!initial && onDraftChange) onDraftChange({ ...emptyLrpDraft });
    onClose();
  };

  return (
    <Modal title={initial ? "Edit Program LRP" : "Tambah Program LRP Baru"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nama Program LRP" required hint="Program bantuan / pelatihan pemulihan mata pencaharian">
          <input
            type="text"
            value={f.program}
            onChange={(e) => set("program", e.target.value)}
            placeholder="Contoh: Pelatihan Budidaya Perikanan / Bantuan Usaha"
            className={inputCls}
          />
        </Field>

        <SharepointLinksInput
          value={f.sharepoint_links}
          onChange={(links) => set("sharepoint_links", links)}
        />
      </div>
      <ModalFooter
        onClose={onClose}
        onSave={handleSave}
        onClear={!initial ? handleClear : undefined}
        saveLabel={initial ? "Simpan Perubahan" : "Simpan Program"}
        isEdit={!!initial}
      />
    </Modal>
  );
}

export default function LrpModule({
  activeYear,
  onExport,
  showToast,
}: {
  activeYear: string;
  onExport?: (l: string, data: any[]) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [items, setItems] = useState<LrpProgram[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [addDraft, setAddDraft] = useState({ ...emptyLrpDraft });

  const fetchData = useCallback(async () => {
    try {
      const yearParam = activeYear ? `year=${activeYear}` : '';
      const isDeletedParam = `is_deleted=${showDeleted}`;
      const queryParams = [yearParam, isDeletedParam].filter(Boolean).join('&');
      const res = await apiClient.get(`/lrp?${queryParams}`);
      setItems(res.data.data || []);
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal memuat data program LRP", "error");
    }
  }, [activeYear, showDeleted, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { q, setQ, filtered } = useGlobalSearch(items);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LrpProgram | null>(null);
  const [toDelete, setToDelete] = useState<LrpProgram | null>(null);
  const [toRestore, setToRestore] = useState<LrpProgram | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | number | null>(null);

  const onAdd = async (d: LrpFormData) => {
    try {
      const year = parseInt(activeYear) || new Date().getFullYear();
      await apiClient.post('/lrp', { ...d, year });
      showToast?.(`Program '${d.program}' berhasil ditambahkan`, "success");
      fetchData();
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal menyimpan data", "error");
    }
  };

  const onEdit = async (id: string | number, d: LrpFormData) => {
    try {
      const year = parseInt(activeYear) || new Date().getFullYear();
      await apiClient.put(`/lrp/${id}`, { ...d, year });
      showToast?.(`Program '${d.program}' berhasil diperbarui`, "success");
      fetchData();
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal memperbarui data", "error");
    }
  };

  const onDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/lrp/${id}`);
      showToast?.("Program berhasil dihapus", "success");
      fetchData();
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal menghapus data", "error");
    }
  };

  const handleRestore = async (id: string | number) => {
    try {
      await apiClient.patch(`/lrp/${id}/restore`);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };

  const columns: ColumnDef<LrpProgram>[] = useMemo(() => [
    { header: "No", render: (_, i) => <span className="text-xs text-slate-2 font-mono">{i + 1}</span> },
    { header: "Tahun", accessor: "year", sortable: true, render: (p) => <span className="text-xs font-mono text-slate">{p.year}</span> },
    { header: "Nama Program LRP", accessor: "program", sortable: true, render: (p) => <span className="text-[13px] font-medium text-ink">{p.program}</span> },
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
        <button onClick={() => setEditing(p)} title="Edit Program" className="p-1.5 rounded-md hover:bg-ochre/10 text-slate-2 hover:text-ochre transition-colors cursor-pointer"><Edit2 size={13} /></button>
        <button onClick={() => setToDelete(p)} title="Hapus Program" className="p-1.5 rounded-md hover:bg-clay/10 text-slate-2 hover:text-clay transition-colors cursor-pointer"><Trash2 size={13} /></button>
      </div>
    )}
  ], [showDeleted]);

  const handleExportClick = () => {
    const exportData = filtered.map(p => ({
      "Program": p.program,
      "Year": p.year
    }));
    onExport?.("LRP", exportData);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-paper">
      <TopBar title="Livelihood Restoration (LRP)" subtitle="Program pemulihan mata pencaharian dan kemandirian warga" addLabel="Tambah Program LRP" onAdd={() => setShowForm(true)} showDeleted={showDeleted} showSearch searchValue={q} onSearch={setQ} onExport={handleExportClick}>
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
        <div className="bg-ochre/10 border border-ochre/25 rounded-xl p-3.5 mb-4 flex items-start gap-2.5 shrink-0">
          <AlertTriangle size={15} className="text-ochre shrink-0 mt-0.5" />
          <p className="text-xs text-ochre leading-relaxed">Data LRP menyimpan nama program dan tahun. Dokumen terkait dikelola manual di luar CRIMEs.</p>
        </div>
        <div className="flex-1 min-h-0">
          <DataTable columns={columns} data={filtered} />
        </div>
      </div>
      {showForm && <LrpForm defaultValues={addDraft} onDraftChange={setAddDraft} onClose={() => setShowForm(false)} onSave={onAdd} showToast={showToast} />}
      {editing && <LrpForm initial={editing} onClose={() => setEditing(null)} onSave={d => { onEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
      {toDelete && <DeleteConfirm label={toDelete.program} onCancel={() => setToDelete(null)} onConfirm={() => { onDelete(toDelete.id); setToDelete(null); }} />}
      {toRestore && <RestoreConfirmModal label={(toRestore as any).program_name || toRestore.program || ''} onCancel={() => setToRestore(null)} onConfirm={() => { handleRestore(toRestore.id); setToRestore(null); }} />}
      <AuditHistoryDrawer isOpen={historyDrawerOpen} onClose={() => setHistoryDrawerOpen(false)} entityType="lrp" entityId={selectedHistoryId} />
    </div>
  );
}
