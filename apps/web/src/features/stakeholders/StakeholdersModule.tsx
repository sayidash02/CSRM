import React, { useState, useMemo, useEffect } from "react";
import { apiClient } from '../../lib/apiClient';
import { Edit2, ExternalLink, Trash2, Check, X, Search, Plus, Download } from "lucide-react";
import { FileInput } from '../../components/ui/FileInput';

export interface Stakeholder {
  id: string;
  stakeholder: string;
  date_venue: string | null;
  concern_issue: string | null;
  document_link: string | null;
}

function useSearch<T>(items: T[], keys: (keyof T)[]) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() =>
    q.trim() === "" ? items : items.filter(item => keys.some(k => String(item[k] || '').toLowerCase().includes(q.toLowerCase()))),
    [items, q]);
  return { q, setQ, filtered };
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

function Modal({ title, onClose, children, size = "md" }: { title: string; onClose: () => void; children: React.ReactNode; size?: "md" | "lg" }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-card rounded-2xl border border-border shadow-2xl w-full ${size === "lg" ? "max-w-3xl" : "max-w-2xl"} max-h-[92vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onSave, saveLabel = "Simpan", isEdit }: { onClose: () => void; onSave: () => void; saveLabel?: string; isEdit?: boolean }) {
  return (
    <div className="px-6 py-4 border-t border-border flex gap-2 justify-end bg-muted/20 rounded-b-2xl shrink-0">
      <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors">Batal</button>
      <button onClick={onSave} className={`px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-1.5 text-white ${isEdit ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-blue-700"}`}>
        {isEdit ? <Edit2 size={13} /> : <Check size={13} />}{saveLabel}
      </button>
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

function StakeholderForm({ initial, onClose, onSave }: { initial?: Stakeholder; onClose: () => void; onSave: (d: Omit<Stakeholder, "id">) => void }) {
  const [f, setF] = useState({ 
    stakeholder: initial?.stakeholder ?? "", 
    date_venue: initial?.date_venue ?? "", 
    concern_issue: initial?.concern_issue ?? "", 
    document_link: initial?.document_link ?? "" 
  });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  
  const handleSave = () => { 
    if (!f.stakeholder) return; 
    onSave({ 
      ...f, 
      date_venue: f.date_venue || null,
      concern_issue: f.concern_issue || null,
      document_link: f.document_link || null
    }); 
    onClose(); 
  };
  
  return (
    <Modal title={initial ? "Edit Stakeholder" : "Tambah Stakeholder Engagement"} onClose={onClose}>
      <div className="px-6 py-4 space-y-4">
        <Field label="Nama Stakeholder" required><input type="text" value={f.stakeholder} onChange={e => set("stakeholder", e.target.value)} placeholder="Nama institusi / individu" className={inputCls} /></Field>
        <Field label="Tanggal & Tempat" hint="Contoh: 14 Juli 2026 — Kantor Dinas Sosial Bogor"><input type="text" value={f.date_venue} onChange={e => set("date_venue", e.target.value)} placeholder="14 Juli 2026 — Kantor Dinas…" className={inputCls} /></Field>
        <Field label="Concern / Isu yang Dibahas"><textarea rows={3} value={f.concern_issue} onChange={e => set("concern_issue", e.target.value)} placeholder="Topik atau isu yang dibahas dalam pertemuan" className={`${inputCls} resize-none`} /></Field>
        <Field label="Dokumen">
          <FileInput 
            value={f.document_link || null} 
            onChange={url => set("document_link", url)}
            activityDate={f.date_venue}
            picName={f.stakeholder}
          />
        </Field>
      </div>
      <ModalFooter onClose={onClose} onSave={handleSave} saveLabel={initial ? "Simpan Perubahan" : "Simpan"} isEdit={!!initial} />
    </Modal>
  );
}

export default function StakeholdersModule({ onExport, showToast }: { onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/stakeholders');
      setItems(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { q, setQ, filtered } = useSearch(items, ["stakeholder", "concern_issue", "date_venue"]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [toDelete, setToDelete] = useState<Stakeholder | null>(null);

  const handleAdd = async (d: Omit<Stakeholder, "id">) => {
    try {
      await apiClient.post('/stakeholders', d);
      fetchData();
      showToast("Data berhasil ditambahkan", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string, d: Omit<Stakeholder, "id">) => {
    try {
      await apiClient.put(`/stakeholders/${id}`, d);
      fetchData();
      showToast("Data berhasil diperbarui", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/stakeholders/${id}`);
      fetchData();
      showToast("Data berhasil dihapus", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };

  const handleExport = () => {
    onExport("Stakeholders", items);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar 
        title="Stakeholder Engagement" 
        subtitle="Rekaman pertemuan & komunikasi dengan pemangku kepentingan" 
        showSearch 
        searchValue={q} 
        onSearch={setQ} 
        addLabel="Tambah" 
        onAdd={() => setShowForm(true)} 
        onExport={handleExport} 
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["No","Stakeholder","Date & Venue","Concern / Issue","Docs",""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground font-mono uppercase tracking-wide last:w-16">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">Tidak ada data.</td>
                </tr>
              ) : (
                filtered.map((s, i) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{s.stakeholder}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{s.date_venue}</td>
                    <td className="px-4 py-3 text-sm text-foreground max-w-xs"><div className="line-clamp-2">{s.concern_issue}</div></td>
                    <td className="px-4 py-3 text-center">{s.document_link ? <a href={s.document_link} target="_blank" rel="noreferrer" className="text-blue-600 cursor-pointer inline-flex"><ExternalLink size={13} /></a> : <span className="text-muted-foreground text-xs">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditing(s)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600"><Edit2 size={12} /></button>
                        <button onClick={() => setToDelete(s)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && <div className="mt-2 text-xs text-muted-foreground font-mono">Menampilkan {filtered.length} dari {items.length} data</div>}
      </div>
      {showForm && <StakeholderForm onClose={() => setShowForm(false)} onSave={handleAdd} />}
      {editing && <StakeholderForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} />}
      {toDelete && <DeleteConfirm label={toDelete.stakeholder} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id); setToDelete(null); }} />}
    </div>
  );
}
