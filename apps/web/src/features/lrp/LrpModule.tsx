import React, { useState, useMemo, useEffect } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { apiClient } from '../../lib/apiClient';
import { Edit2, ExternalLink, Trash2, Search, Plus, Download, AlertTriangle, RotateCcw } from "lucide-react";
import { FileInput } from '../../components/ui/FileInput';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Modal, ModalFooter } from '../../components/ui/Modal';

export interface LrpProgram {
  id: string | number;
  program: string;
  sharepoint_link: string;
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

const emptyLrpDraft = { program: "", sharepoint_link: "" };

const parseSharepointUrls = (link?: string | null): string[] => {
  if (!link) return [];
  const trimmed = link.trim();
  if (!trimmed || trimmed === "[]") return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === "string" && u.trim() !== "");
      }
    } catch {
      // fallback
    }
  }
  return [trimmed];
};

function LrpForm({
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
  onSave: (d: Omit<LrpProgram, "id">) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [f, setF] = useState(
    initial
      ? { program: initial.program ?? "", sharepoint_link: initial.sharepoint_link ?? "" }
      : { ...emptyLrpDraft, ...defaultValues }
  );

  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };

  const handleClear = () => {
    setF({ ...emptyLrpDraft });
    onDraftChange?.({ ...emptyLrpDraft });
  };

  const handleSave = () => {
    const missing: string[] = (
      [
        [!f.program, "Nama Program"],
        [!f.sharepoint_link, "Link SharePoint"],
      ] as [boolean, string][]
    ).filter(([cond]) => cond).map(([, label]) => label);

    if (missing.length > 0) {
      if (showToast) {
        showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
      }
      return;
    }
    onSave(f);
    if (!initial) onDraftChange?.({ ...emptyLrpDraft });
    onClose();
  };

  return (
    <Modal title={initial ? "Edit Program LRP" : "Tambah Program LRP"} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <Field label="Nama Program" required><input type="text" value={f.program} onChange={e => set("program", e.target.value)} placeholder="Nama / judul program LRP" className={inputCls} /></Field>
        <Field label="SharePoint Link" required hint="Upload file dokumen atau gambar untuk program LRP.">
          <FileInput 
            value={f.sharepoint_link || null} 
            onChange={url => set("sharepoint_link", url)}
            picName="LRP Program"
          />
        </Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Program"} isEdit={!!initial} />
    </Modal>
  );
}

export default function LrpModule({ activeYear, onExport, showToast }: { activeYear: string; onExport?: (l: string, data: any[]) => void; showToast?: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<LrpProgram[]>([]);
  const { q, setQ, filtered } = useGlobalSearch(items);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LrpProgram | null>(null);
  const [toDelete, setToDelete] = useState<LrpProgram | null>(null);
  const [addDraft, setAddDraft] = useState({ ...emptyLrpDraft });
  const [showDeleted, setShowDeleted] = useState(false);

  const fetchData = async () => {
    try {
      const yearParam = activeYear ? `year=${activeYear}` : '';
      const isDeletedParam = `is_deleted=${showDeleted}`;
      const queryParams = [yearParam, isDeletedParam].filter(Boolean).join('&');
      const res = await apiClient.get(`/lrp${queryParams ? `?${queryParams}` : ''}`);
      setItems(res.data.data);
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal memuat data LRP", "error");
    }
  };

  useEffect(() => { fetchData(); }, [activeYear, showDeleted]);

  const onAdd = async (d: Omit<LrpProgram, "id">) => {
    try {
      const year = parseInt(activeYear) || new Date().getFullYear();
      const res = await apiClient.post('/lrp', { ...d, year });
      if (res.data?.data) {
        setItems(prev => [res.data.data, ...prev]);
      } else {
        fetchData();
      }
      showToast?.(`Program LRP '${d.program}' berhasil ditambahkan`, "success");
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal menyimpan data", "error");
    }
  };

  const onEdit = async (id: string | number, d: Omit<LrpProgram, "id">) => {
    try {
      const year = parseInt(activeYear) || new Date().getFullYear();
      const res = await apiClient.put(`/lrp/${id}`, { ...d, year });
      setItems(prev => prev.map(i => i.id === id ? res.data.data : i));
      showToast?.(`Program LRP '${d.program}' berhasil diperbarui`, "success");
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal memperbarui data", "error");
    }
  };

  const onDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/lrp/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      showToast?.(`Program LRP '${toDelete?.program || ''}' berhasil dihapus`, "success");
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal menghapus data", "error");
    }
  };

  const handleRestore = async (id: string | number) => {
    if (!confirm("Apakah Anda yakin ingin memulihkan data ini?")) return;
    try {
      await apiClient.patch(`/lrp/${id}/restore`);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };

  const columns: ColumnDef<LrpProgram>[] = useMemo(() => [
    { header: "No", render: (_, i) => <span className="text-xs text-muted-foreground font-mono">{i + 1}</span> },
    { header: "Nama Program", accessor: "program", sortable: true, render: (p) => <span className="text-sm font-medium text-foreground">{p.program}</span> },
    {
      header: "SharePoint Link",
      accessor: "sharepoint_link",
      sortable: true,
      render: (p) => {
        const urls = parseSharepointUrls(p.sharepoint_link);
        if (urls.length === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            {urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 text-xs font-mono"
              >
                <ExternalLink size={10} className="shrink-0" />
                <span className="truncate max-w-[200px]">{url}</span>
              </a>
            ))}
          </div>
        );
      },
    },
    { header: "", render: (p) => showDeleted ? (
      <div className="flex items-center justify-end">
        <button 
          onClick={() => handleRestore(p.id)} 
          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1"
        >
          <RotateCcw size={12} />
          Restore
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => setEditing(p)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600"><Edit2 size={12} /></button>
        <button onClick={() => setToDelete(p)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"><Trash2 size={12} /></button>
      </div>
    )}
  ], [showDeleted, handleRestore]);

  const handleExportClick = () => {
    const exportData = filtered.map(p => ({
      "Program": p.program,
      "SharePoint Link": p.sharepoint_link
    }));
    onExport?.("LRP", exportData);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar title="LRP — Livelihood Restoration Program" subtitle="Program community development & pemulihan mata pencaharian" addLabel="Tambah Program" onAdd={() => setShowForm(true)} showDeleted={showDeleted} showSearch searchValue={q} onSearch={setQ} onExport={handleExportClick}>
        <div className="flex items-center gap-2 mr-2">
          <span className="text-sm font-medium text-foreground">Data Terhapus:</span>
          <input 
            type="checkbox" 
            checked={showDeleted} 
            onChange={(e) => setShowDeleted(e.target.checked)} 
            className="w-4 h-4 rounded border-border text-blue-600 focus:ring-ring"
          />
        </div>
      </TopBar>
      <div className="flex-1 overflow-auto p-6 flex flex-col">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3 shrink-0">
          <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">Modul ini belum memiliki sheet Excel berjalan — akan masuk ke sheet baru saat Export &amp; Sync berikutnya.</p>
        </div>
        <div className="flex-1 min-h-0">
          <DataTable columns={columns} data={filtered} />
        </div>
      </div>
      {showForm && <LrpForm defaultValues={addDraft} onDraftChange={setAddDraft} onClose={() => setShowForm(false)} onSave={onAdd} showToast={showToast} />}
      {editing && <LrpForm initial={editing} onClose={() => setEditing(null)} onSave={d => { onEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
      {toDelete && <DeleteConfirm label={toDelete.program} onCancel={() => setToDelete(null)} onConfirm={() => { onDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}

