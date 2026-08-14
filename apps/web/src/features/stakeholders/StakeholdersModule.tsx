import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { apiClient } from '../../lib/apiClient';
import { Edit2, ExternalLink, Trash2, Search, Plus, Download, RotateCcw } from "lucide-react";
import { FileInput } from '../../components/ui/FileInput';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { RestoreConfirmModal } from '../../components/ui/RestoreConfirmModal';

export interface Stakeholder {
  id: string;
  stakeholder: string;
  date: string | null;
  venue: string | null;
  concern_issue: string | null;
  document_link: string | null;
}

const inputCls = "w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

const formatDate = (d?: string | Date | null) => {
  if (!d) return "";
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(d);
  }
};

const formatInputDate = (d?: string | Date | null) => {
  if (!d) return "";
  if (typeof d === "string" && d.includes("T")) return d.split("T")[0];
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toISOString().split("T")[0];
  } catch {
    return String(d);
  }
};

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
    <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border shrink-0 gap-3 flex-wrap shadow-xs">
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

const emptyStakeholderDraft = {
  stakeholder: "", date: "", venue: "", concern_issue: "", document_link: ""
};

const parseDocumentLinks = (link?: string | null): string[] => {
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

function StakeholderForm({ 
  initial, 
  onClose, 
  onSave, 
  showToast,
  defaultValues,
  onDraftChange
}: { 
  initial?: Stakeholder; 
  onClose: () => void; 
  onSave: (d: Omit<Stakeholder, "id">) => void; 
  showToast?: (msg: string, type?: "success"|"error"|"info") => void;
  defaultValues?: typeof emptyStakeholderDraft;
  onDraftChange?: (v: typeof emptyStakeholderDraft) => void;
}) {
  const [f, setF] = useState(
    initial
      ? {
          stakeholder: initial.stakeholder ?? "",
          date: formatInputDate(initial.date),
          venue: initial.venue ?? "",
          concern_issue: initial.concern_issue ?? "",
          document_link: initial.document_link ?? ""
        }
      : { ...emptyStakeholderDraft, ...defaultValues }
  );
  
  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };

  const handleClear = () => {
    setF({ ...emptyStakeholderDraft });
    onDraftChange?.({ ...emptyStakeholderDraft });
  };
  
  const handleSave = () => {
    const missing: string[] = (
      [
        [!f.stakeholder, "Nama Stakeholder"],
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
      date: f.date || null,
      venue: f.venue || null,
      concern_issue: f.concern_issue || null,
      document_link: f.document_link || null
    });
    if (!initial) onDraftChange?.({ ...emptyStakeholderDraft });
    onClose();
  };
  
  return (
    <Modal title={initial ? "Edit Stakeholder Engagement" : "Tambah Stakeholder Engagement"} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <Field label="Nama Stakeholder" required>
          <input
            type="text"
            value={f.stakeholder}
            onChange={e => set("stakeholder", e.target.value)}
            placeholder="Nama stakeholder"
            className={inputCls}
          />
        </Field>
        <div className="flex gap-4">
          <div className="flex-1">
            <Field label="Tanggal"><input type="date" value={f.date} onChange={e => set("date", e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="flex-1">
            <Field label="Tempat"><input type="text" value={f.venue} onChange={e => set("venue", e.target.value)} placeholder="Contoh: Kantor Dinas..." className={inputCls} /></Field>
          </div>
        </div>
        <Field label="Concern / Isu yang Dibahas"><textarea rows={3} value={f.concern_issue} onChange={e => set("concern_issue", e.target.value)} placeholder="Topik atau isu yang dibahas dalam pertemuan" className={`${inputCls} resize-none`} /></Field>
        <Field label="Dokumen">
          <FileInput 
            value={f.document_link || null} 
            onChange={url => set("document_link", url)}
            activityDate={f.date}
            picName={f.stakeholder}
          />
        </Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan"} isEdit={!!initial} />
    </Modal>
  );
}

export interface StakeholdersModuleProps {
  activeYear: string;
  onExport: (l: string, data: any[]) => void;
  showToast: (msg: string, type?: "success"|"error"|"info") => void;
}

export default function StakeholdersModule({
  activeYear,
  onExport,
  showToast,
}: StakeholdersModuleProps) {
  const [items, setItems] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDraft, setAddDraft] = useState({ ...emptyStakeholderDraft });
  const [showDeleted, setShowDeleted] = useState(false);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const yearParam = activeYear ? `year=${activeYear}` : '';
      const isDeletedParam = `is_deleted=${showDeleted}`;
      const queryParams = [yearParam, isDeletedParam].filter(Boolean).join('&');
      const res = await apiClient.get(`/stakeholders${queryParams ? `?${queryParams}` : ''}`);
      setItems(res.data.data);
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal memuat data stakeholder", "error");
    } finally {
      setLoading(false);
    }
  }, [activeYear, showDeleted, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { q, setQ, filtered } = useGlobalSearch(items);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [toDelete, setToDelete] = useState<Stakeholder | null>(null);
  const [toRestore, setToRestore] = useState<Stakeholder | null>(null);

  const handleAdd = async (d: Omit<Stakeholder, "id">) => {
    try {
      const res = await apiClient.post('/stakeholders', d);
      if (res.data?.data) {
        setItems(prev => [res.data.data, ...prev]);
      } else {
        fetchData();
      }
      showToast(`Stakeholder '${d.stakeholder}' berhasil ditambahkan`, "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string, d: Omit<Stakeholder, "id">) => {
    try {
      const res = await apiClient.put(`/stakeholders/${id}`, d);
      setItems(prev => prev.map(i => i.id === id ? res.data.data : i));
      showToast(`Stakeholder '${d.stakeholder}' berhasil diperbarui`, "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (item: Stakeholder) => {
    const name = item.stakeholder;
    try {
      await apiClient.delete(`/stakeholders/${item.id}`);
      setItems(prev => prev.filter(i => i.id !== item.id));
      showToast(`Stakeholder '${name}' berhasil dihapus`, "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menghapus data", "error");
    }
  };

  const handleRestore = useCallback(async (id: string) => {
    try {
      await apiClient.patch(`/stakeholders/${id}/restore`);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  }, [showToast, fetchData]);

  const handleExportClick = () => {
    const exportData = filtered.map(s => {
      const formattedDate = formatDate(s.date);
      return {
        "Stakeholder": s.stakeholder,
        "Date/Venue": (formattedDate && s.venue) ? `${formattedDate} / ${s.venue}` : (formattedDate || s.venue || ""),
        "Concern/Issue": s.concern_issue || "",
        "Document Link": s.document_link || ""
      };
    });
    onExport("Stakeholders_Engagement", exportData);
  };

  const columns: ColumnDef<Stakeholder>[] = useMemo(() => [
    { header: "No", render: (_, i) => <span className="text-xs text-muted-foreground font-mono">{i + 1}</span> },
    { 
      header: "Stakeholder", 
      accessor: "stakeholder", 
      sortable: true, 
      render: (s) => (
        <span className="text-sm font-medium text-foreground">{s.stakeholder}</span>
      )
    },
    { 
      header: "Date & Venue", 
      accessor: "date", 
      sortable: true, 
      render: (s) => {
        const formattedDate = formatDate(s.date);
        return (
          <span className="text-xs text-muted-foreground font-mono">
            {(formattedDate && s.venue) ? `${formattedDate} / ${s.venue}` : (formattedDate || s.venue || "")}
          </span>
        );
      } 
    },
    { header: "Concern / Issue", accessor: "concern_issue", sortable: true, render: (s) => <div className="text-sm text-foreground max-w-xs"><div className="line-clamp-2">{s.concern_issue}</div></div> },
    { 
      header: "Docs", 
      className: "text-center", 
      render: (s) => {
        const links = parseDocumentLinks(s.document_link);
        if (links.length === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {links.map((link, idx) => (
              <a
                key={idx}
                href={link}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center"
              >
                <ExternalLink size={13} />
              </a>
            ))}
          </div>
        );
      }
    },
    { header: "", render: (s) => showDeleted ? (
      <div className="flex items-center justify-end">
        <button 
          onClick={() => setToRestore(s)} 
          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1"
        >
          <RotateCcw size={12} />
          Restore
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => setEditing(s)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600"><Edit2 size={12} /></button>
        <button onClick={() => setToDelete(s)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"><Trash2 size={12} /></button>
      </div>
    )},
  ], [showDeleted, handleRestore]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar 
        title="Stakeholder Engagement" 
        subtitle="Rekaman interaksi & pertemuan pemangku kepentingan" 
        showSearch 
        searchValue={q} 
        onSearch={setQ} 
        addLabel="Tambah Engagement" 
        onAdd={() => setShowForm(true)} 
        onExport={handleExportClick} 
        showDeleted={showDeleted}
      >
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
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="flex-1 min-h-0">
            <DataTable columns={columns} data={filtered} />
          </div>
        )}
        {!loading && (
          <div className="mt-2 text-xs text-muted-foreground font-mono">
            Menampilkan {filtered.length} dari {items.length} data engagement
          </div>
        )}
      </div>

      {showForm && <StakeholderForm onClose={() => setShowForm(false)} onSave={handleAdd} showToast={showToast} defaultValues={addDraft} onDraftChange={setAddDraft} />}
      {editing && <StakeholderForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
      {toDelete && <DeleteConfirm label={toDelete.stakeholder} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete); setToDelete(null); }} />}
      {toRestore && <RestoreConfirmModal label={toRestore.stakeholder || ''} onCancel={() => setToRestore(null)} onConfirm={() => { handleRestore(toRestore.id); setToRestore(null); }} />}
    </div>
  );
}
