import { useState, useMemo, useEffect, useCallback } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { apiClient } from '../../lib/apiClient';
import { Edit2, Trash2, Search, Plus, Download, RotateCcw, History } from "lucide-react";
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { RestoreConfirmModal } from '../../components/ui/RestoreConfirmModal';
import { AuditHistoryDrawer } from '../../components/ui/AuditHistoryDrawer';

export interface TopIssue {
  id: number | string;
  period: string;
  issue: string;
  description: string;
  follow_up: string;
  next_plan: string;
}

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
            <input value={searchValue} onChange={e => onSearch?.(e.target.value)} placeholder="Cari isu penting…"
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

const emptyTopIssueDraft = {
  period: "",
  issue: "",
  description: "",
  follow_up: "",
  next_plan: ""
};

function TopIssueForm({
  initial,
  defaultValues,
  onDraftChange,
  onClose,
  onSave,
  showToast
}: {
  initial?: TopIssue;
  defaultValues?: typeof emptyTopIssueDraft;
  onDraftChange?: (v: typeof emptyTopIssueDraft) => void;
  onClose: () => void;
  onSave: (d: Omit<TopIssue, "id">) => void;
  showToast?: (msg: string, type?: "success"|"error"|"info") => void;
}) {
  const [f, setF] = useState(
    initial
      ? {
          period: initial.period ?? "",
          issue: initial.issue ?? "",
          description: initial.description ?? "",
          follow_up: initial.follow_up ?? "",
          next_plan: initial.next_plan ?? ""
        }
      : { ...emptyTopIssueDraft, ...defaultValues }
  );

  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };

  const handleClear = () => {
    setF({ ...emptyTopIssueDraft });
    onDraftChange?.({ ...emptyTopIssueDraft });
  };

  const handleSave = () => {
    const missing: string[] = (
      [
        [!f.period, "Periode"],
        [!f.issue, "Isu"],
      ] as [boolean, string][]
    ).filter(([cond]) => cond).map(([, label]) => label);

    if (missing.length > 0) {
      if (showToast) {
        showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
      }
      return;
    }
    onSave(f);
    if (!initial) onDraftChange?.({ ...emptyTopIssueDraft });
    onClose();
  };

  return (
    <Modal title={initial ? "Edit Isu Penting" : "Tambah Top Issue"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Periode" required hint="Contoh: Juli 2026 : Tanggal 21-25">
          <input type="text" value={f.period} onChange={e => set("period", e.target.value)} placeholder="Juli 2026 : Tanggal 21-25" className={inputCls} />
        </Field>
        <Field label="Isu" required>
          <input type="text" value={f.issue} onChange={e => set("issue", e.target.value)} placeholder="Judul / nama isu" className={inputCls} />
        </Field>
        <Field label="Deskripsi">
          <textarea rows={3} value={f.description} onChange={e => set("description", e.target.value)} placeholder="Penjelasan detail isu" className={`${inputCls} resize-none`} />
        </Field>
        <Field label="Follow Up">
          <textarea rows={2} value={f.follow_up} onChange={e => set("follow_up", e.target.value)} placeholder="Tindakan yang sudah / sedang dilakukan" className={`${inputCls} resize-none`} />
        </Field>
        <Field label="Next Plan">
          <textarea rows={2} value={f.next_plan} onChange={e => set("next_plan", e.target.value)} placeholder="Rencana tindak lanjut berikutnya" className={`${inputCls} resize-none`} />
        </Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Isu"} isEdit={!!initial} />
    </Modal>
  );
}

export default function TopIssuesModule({ activeYear, onExport, showToast }: { activeYear: string; onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<TopIssue[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const yearParam = activeYear ? `year=${activeYear}` : '';
      const isDeletedParam = `is_deleted=${showDeleted}`;
      const queryParams = [yearParam, isDeletedParam].filter(Boolean).join('&');
      const res = await apiClient.get(`/top-issues?${queryParams}`);
      setItems(res.data.data);
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal mengambil data", "error");
    }
  }, [activeYear, showDeleted, showToast]);

  useEffect(() => {
    fetchData();
  }, [activeYear, showDeleted, fetchData]);

  const handleAdd = async (d: Omit<TopIssue, "id">) => {
    try {
      const year = parseInt(activeYear) || new Date().getFullYear();
      const res = await apiClient.post('/top-issues', { ...d, year });
      if (res.data?.data) {
        setItems(prev => [res.data.data, ...prev]);
      } else {
        fetchData();
      }
      if (showToast) showToast(`Isu '${d.issue}' berhasil ditambahkan`, "success");
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<TopIssue, "id">) => {
    try {
      const year = parseInt(activeYear) || new Date().getFullYear();
      const res = await apiClient.put(`/top-issues/${id}`, { ...d, year });
      if (res.data?.data) {
        setItems(prev => prev.map(i => i.id === id ? res.data.data : i));
      } else {
        fetchData();
      }
      if (showToast) showToast(`Isu '${d.issue}' berhasil diperbarui`, "success");
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number, title?: string) => {
    try {
      await apiClient.delete(`/top-issues/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      if (showToast) showToast(`Isu '${title || ''}' berhasil dihapus`, "success");
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal menghapus data", "error");
    }
  };

  const handleRestore = useCallback(async (id: string | number) => {
    try {
      await apiClient.patch(`/top-issues/${id}/restore`);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  }, [showToast, fetchData]);

  const { q, setQ, filtered } = useGlobalSearch(items);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TopIssue | null>(null);
  const [toDelete, setToDelete] = useState<TopIssue | null>(null);
  const [toRestore, setToRestore] = useState<TopIssue | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | number | null>(null);
  const [periodFilter, setPeriodFilter] = useState("All");
  const [addDraft, setAddDraft] = useState({ ...emptyTopIssueDraft });
  
  const displayed = periodFilter === "All" ? filtered : filtered.filter(i => i.period === periodFilter);

  const columns: ColumnDef<TopIssue>[] = useMemo(() => [
    { header: "No", render: (_, i) => <span className="text-xs font-mono text-slate-2">{i + 1}</span> },
    { header: "Isu & Periode", accessor: "issue", sortable: true, render: (issue) => <div><div className="text-[13px] font-semibold text-ink whitespace-normal">{issue.issue}</div><div className="text-xs text-slate font-mono mt-0.5">{issue.period}</div></div> },
    { header: "Deskripsi", accessor: "description", sortable: true, render: (issue) => <div className="text-xs text-slate leading-relaxed max-w-[220px] whitespace-normal"><div className="line-clamp-3">{issue.description}</div></div> },
    { header: "Follow Up", accessor: "follow_up", sortable: true, render: (issue) => <div className="text-xs text-slate leading-relaxed max-w-[220px] whitespace-normal"><div className="line-clamp-3">{issue.follow_up}</div></div> },
    { header: "Next Plan", accessor: "next_plan", sortable: true, render: (issue) => <div className="text-xs text-slate leading-relaxed max-w-[220px] whitespace-normal"><div className="line-clamp-3">{issue.next_plan}</div></div> },
    { header: "Aksi", render: (issue) => showDeleted ? (
      <div className="flex items-center justify-end">
        <button 
          onClick={() => setToRestore(issue)} 
          className="px-2.5 py-1 text-xs font-medium text-forest bg-forest/10 hover:bg-forest/20 rounded-md border border-forest/30 flex items-center gap-1"
        >
          <RotateCcw size={12} />
          Restore
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => { setSelectedHistoryId(issue.id); setHistoryDrawerOpen(true); }} title="Riwayat Perubahan" className="p-1.5 rounded-md hover:bg-paper-2 text-slate-2 hover:text-ink transition-colors"><History size={13} /></button>
        <button onClick={() => setEditing(issue)} title="Edit Isu" className="p-1.5 rounded-md hover:bg-ochre/10 text-slate-2 hover:text-ochre transition-colors"><Edit2 size={13} /></button>
        <button onClick={() => setToDelete(issue)} title="Hapus Isu" className="p-1.5 rounded-md hover:bg-clay/10 text-slate-2 hover:text-clay transition-colors"><Trash2 size={13} /></button>
      </div>
    )}
  ], [showDeleted, handleRestore]);

  const handleExportClick = () => {
    const exportData = displayed.map(i => ({
      "Period": i.period,
      "Issue": i.issue,
      "Description": i.description,
      "Follow Up": i.follow_up,
      "Next Plan": i.next_plan
    }));
    onExport("Top Issue", exportData);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-paper">
      <TopBar title="Top Issue" subtitle="Isu prioritas yang sedang dipantau dan ditindaklanjuti" addLabel="Tambah Isu" onAdd={() => setShowForm(true)} showDeleted={showDeleted} showSearch searchValue={q} onSearch={setQ} onExport={handleExportClick}>
        <div className="flex items-center gap-2 mr-2">
          <span className="text-[12px] font-medium text-slate">Data Terhapus:</span>
          <input 
            type="checkbox" 
            checked={showDeleted} 
            onChange={(e) => setShowDeleted(e.target.checked)} 
            className="w-4 h-4 rounded border-line text-forest focus:ring-forest cursor-pointer"
          />
        </div>
        <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="px-3 py-1.5 text-[12px] bg-paper/50 border border-line rounded-lg text-ink outline-none focus:border-forest font-medium">
          <option value="All">Semua Periode</option>
          {Array.from(new Set(items.map(i => i.period))).map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </TopBar>
      <div className="flex-1 overflow-auto p-4 sm:p-5 flex flex-col">
        <div className="flex-1 min-h-0">
          <DataTable columns={columns} data={displayed} />
        </div>
      </div>
      {showForm && <TopIssueForm defaultValues={addDraft} onDraftChange={setAddDraft} onClose={() => setShowForm(false)} onSave={handleAdd} showToast={showToast} />}
      {editing && <TopIssueForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
      {toDelete && <DeleteConfirm label={toDelete.issue} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id, toDelete.issue); setToDelete(null); }} />}
      {toRestore && <RestoreConfirmModal label={(toRestore as any).issue_name || toRestore.issue || ''} onCancel={() => setToRestore(null)} onConfirm={() => { handleRestore(toRestore.id); setToRestore(null); }} />}
      <AuditHistoryDrawer isOpen={historyDrawerOpen} onClose={() => setHistoryDrawerOpen(false)} entityType="top_issues" entityId={selectedHistoryId} />
    </div>
  );
}
