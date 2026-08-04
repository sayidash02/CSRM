import React, { useState, useMemo, useEffect } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { apiClient } from '../../lib/apiClient';
import { Edit2, ExternalLink, Trash2, Search, Plus, Download, ChevronDown, FileText } from "lucide-react";
import { FileInput } from '../../components/ui/FileInput';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Modal, ModalFooter } from '../../components/ui/Modal';

export interface TopIssue {
  id: number | string;
  period: string;
  issue: string;
  description: string;
  follow_up: string;
  main_document: string | null;
  supporting_document: string | null;
  next_plan: string;
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

const emptyTopIssueDraft = {
  period: "",
  issue: "",
  description: "",
  follow_up: "",
  next_plan: "",
  main_document: "",
  supporting_document: ""
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
          next_plan: initial.next_plan ?? "",
          main_document: initial.main_document ?? "",
          supporting_document: initial.supporting_document ?? ""
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
    onSave({
      ...f,
      main_document: f.main_document || null,
      supporting_document: f.supporting_document || null
    });
    if (!initial) onDraftChange?.({ ...emptyTopIssueDraft });
    onClose();
  };

  return (
    <Modal title={initial ? "Edit Isu" : "Tambah Top Issue"} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <Field label="Periode" required hint="Contoh: Juli 2026 : Tanggal 21-25"><input type="text" value={f.period} onChange={e => set("period", e.target.value)} placeholder="Juli 2026 : Tanggal 21-25" className={inputCls} /></Field>
        <Field label="Isu" required><input type="text" value={f.issue} onChange={e => set("issue", e.target.value)} placeholder="Judul / nama isu" className={inputCls} /></Field>
        <Field label="Deskripsi"><textarea rows={3} value={f.description} onChange={e => set("description", e.target.value)} placeholder="Penjelasan detail isu" className={`${inputCls} resize-none`} /></Field>
        <Field label="Follow Up"><textarea rows={2} value={f.follow_up} onChange={e => set("follow_up", e.target.value)} placeholder="Tindakan yang sudah / sedang dilakukan" className={`${inputCls} resize-none`} /></Field>
        <Field label="Next Plan"><textarea rows={2} value={f.next_plan} onChange={e => set("next_plan", e.target.value)} placeholder="Rencana tindak lanjut berikutnya" className={`${inputCls} resize-none`} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Main Document">
            <FileInput 
              value={f.main_document || null} 
              onChange={url => set("main_document", url)}
              picName="Top Issue"
            />
          </Field>
          <Field label="Supporting Document">
            <FileInput 
              value={f.supporting_document || null} 
              onChange={url => set("supporting_document", url)}
              picName="Top Issue"
            />
          </Field>
        </div>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Isu"} isEdit={!!initial} />
    </Modal>
  );
}

export default function TopIssuesModule({ onExport, showToast }: { onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<TopIssue[]>([]);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/top-issues');
      setItems(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (d: Omit<TopIssue, "id">) => {
    try {
      await apiClient.post('/top-issues', d);
      fetchData();
      showToast(`Isu '${d.issue}' berhasil ditambahkan`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<TopIssue, "id">) => {
    try {
      await apiClient.put(`/top-issues/${id}`, d);
      fetchData();
      showToast(`Isu '${d.issue}' berhasil diperbarui`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/top-issues/${id}`);
      fetchData();
      showToast(`Isu '${toDelete?.issue || ''}' berhasil dihapus`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };

  const { q, setQ, filtered } = useGlobalSearch(items);
  const [expanded, setExpanded] = useState<number | string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TopIssue | null>(null);
  const [toDelete, setToDelete] = useState<TopIssue | null>(null);
  const [periodFilter, setPeriodFilter] = useState("All");
  const [addDraft, setAddDraft] = useState({ ...emptyTopIssueDraft });
  
  const displayed = periodFilter === "All" ? filtered : filtered.filter(i => i.period === periodFilter);

  const columns: ColumnDef<TopIssue>[] = useMemo(() => [
    { header: "No", render: (_, i) => <span className="text-xs font-mono text-muted-foreground">{i + 1}</span> },
    { header: "Isu & Periode", accessor: "issue", sortable: true, render: (issue) => <div><div className="text-sm font-semibold text-foreground whitespace-normal">{issue.issue}</div><div className="text-xs text-muted-foreground font-mono mt-0.5">{issue.period}</div></div> },
    { header: "Deskripsi", accessor: "description", sortable: true, render: (issue) => <div className="text-sm text-foreground leading-relaxed max-w-[200px] whitespace-normal"><div className="line-clamp-3">{issue.description}</div></div> },
    { header: "Follow Up", accessor: "follow_up", sortable: true, render: (issue) => <div className="text-sm text-foreground leading-relaxed max-w-[200px] whitespace-normal"><div className="line-clamp-3">{issue.follow_up}</div></div> },
    { header: "Next Plan", accessor: "next_plan", sortable: true, render: (issue) => <div className="text-sm text-foreground leading-relaxed max-w-[200px] whitespace-normal"><div className="line-clamp-3">{issue.next_plan}</div></div> },
    { header: "Docs", className: "whitespace-nowrap", render: (issue) => (
      <div className="flex flex-col gap-1.5">
        {issue.main_document && <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 cursor-pointer"><FileText size={11} /> Main Doc</span>}
        {issue.supporting_document && <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 cursor-pointer"><FileText size={11} /> Support Doc</span>}
        {!issue.main_document && !issue.supporting_document && <span className="text-muted-foreground text-xs">—</span>}
      </div>
    )},
    { header: "", render: (issue) => (
      <div className="flex items-center gap-1.5 justify-end">
        <button onClick={() => setEditing(issue)} className="p-1.5 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={12} /></button>
        <button onClick={() => setToDelete(issue)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
      </div>
    )}
  ], []);

  const handleExportClick = () => {
    const exportData = displayed.map(i => ({
      "Period": i.period,
      "Issue": i.issue,
      "Description": i.description,
      "Follow Up": i.follow_up,
      "Next Plan": i.next_plan
    }));
    onExport("Top Issues", exportData);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="Top Issues" subtitle="Isu prioritas yang sedang dipantau dan ditindaklanjuti" addLabel="Tambah Isu" onAdd={() => setShowForm(true)} showSearch searchValue={q} onSearch={setQ} onExport={handleExportClick}>
        <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="px-3 py-1.5 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground font-medium">
          <option value="All">Semua Periode</option>
          {Array.from(new Set(items.map(i => i.period))).map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </TopBar>
      <div className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="flex-1 min-h-0">
          <DataTable columns={columns} data={displayed} />
        </div>
      </div>
      {showForm && <TopIssueForm defaultValues={addDraft} onDraftChange={setAddDraft} onClose={() => setShowForm(false)} onSave={handleAdd} showToast={showToast} />}
      {editing && <TopIssueForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
      {toDelete && <DeleteConfirm label={toDelete.issue} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}
