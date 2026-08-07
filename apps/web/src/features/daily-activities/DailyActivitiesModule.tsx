import React, { useState, useMemo, useEffect } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { apiClient } from '../../lib/apiClient';
import { Edit2, ExternalLink, Trash2, Calendar, Search, Plus, Download, Settings } from "lucide-react";
import { FileInput } from '../../components/ui/FileInput';
import { CurrencyInput } from "../../components/ui/CurrencyInput";
import { PicManagementModal } from './PicManagementModal';
import { ImportExcelModal } from "./ImportExcelModal";
import { DataTable, ColumnDef } from '../../components/ui/DataTable';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { Modal, ModalFooter } from "../../components/ui/Modal";
import { DateRangeFilter, DateRange } from "../../components/ui/DateRangeFilter";
import { filterByDateRange } from "../../utils/dateFilter";

// Types
export interface DailyActivity {
  id: number | string;
  activity_date: string;
  activity: string;
  institution_group: string;
  address: string;
  focus: string;
  location: string;
  cost: number;
  pic_ids: (string | number)[];
  category_id: string | number;
  sub_category_id: string | number;
  description_result: string;
  document_link: string | null;
  // Included relations from backend
  pics?: any[];
  pic?: any;
  category?: any;
  sub_category?: any;
  category_name?: string;
  sub_category_name?: string;
}

// Helpers
const formatIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const formatDate = (d: string | Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });



// Re-usable UI from App.tsx (We should technically extract these to shared, but for now we inline them or import if exported. Since they are not exported, we inline the ones we need or just assume they are available. Wait, App.tsx doesn't export them. I will copy them here to avoid breaking App.tsx)

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

function TopBar({ title, subtitle, onAdd, addLabel, showSearch, searchValue, onSearch, onExport, children, categories, catFilter, onCatFilterChange, subCategories, subCatFilter, onSubCatFilterChange }: {
  title: string; subtitle?: string; onAdd?: () => void; addLabel?: string;
  showSearch?: boolean; searchValue?: string; onSearch?: (v: string) => void;
  onExport?: () => void; children?: React.ReactNode;
  categories?: any[]; catFilter?: string; onCatFilterChange?: (v: string) => void;
  subCategories?: any[]; subCatFilter?: string; onSubCatFilterChange?: (v: string) => void;
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
          <>
            {categories && (
              <select 
                value={catFilter} 
                onChange={(e) => onCatFilterChange?.(e.target.value)}
                className="px-3 py-1.5 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="All">Semua Kategori</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {subCategories && (
              <select 
                value={subCatFilter} 
                onChange={(e) => onSubCatFilterChange?.(e.target.value)}
                className="px-3 py-1.5 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring max-w-[150px] truncate"
              >
                <option value="All">Semua Sub Kategori</option>
                {subCategories
                  .filter((s: any) => catFilter === "All" || catFilter === undefined || String(s.category_id) === String(catFilter))
                  .map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={searchValue} onChange={e => onSearch?.(e.target.value)} placeholder="Cari…"
                className="pl-8 pr-3 py-1.5 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring w-44 placeholder:text-muted-foreground" />
            </div>
          </>
        )}
        <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"><Download size={13} />Export</button>
        {onAdd && <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-blue-700 transition-colors"><Plus size={13} />{addLabel ?? "Tambah"}</button>}
      </div>
    </div>
  );
}

const emptyDailyDraft = {
  activity_date: "", activity: "", institution_group: "", address: "",
  focus: "", location: "", cost: "", pic_ids: [] as (string | number)[], category_id: "",
  sub_category_id: "", description_result: "", document_link: ""
};

function DailyForm({ initial, defaultValues, onDraftChange, onClose, onSave, refs, onRefreshReferences, showToast }: { initial?: DailyActivity; defaultValues?: typeof emptyDailyDraft; onDraftChange?: (v: typeof emptyDailyDraft) => void; onClose: () => void; onSave: (d: Omit<DailyActivity, "id">) => void; refs: { pics: any[], categories: any[], sub_categories: any[] }; onRefreshReferences: () => void; showToast?: (msg: string, type?: "success" | "error" | "info") => void }) {
  const [showPicManager, setShowPicManager] = useState(false);
  const [f, setF] = useState(
    initial
      ? {
          activity_date: initial.activity_date ?? "",
          activity: initial.activity ?? "",
          institution_group: initial.institution_group ?? "",
          address: initial.address ?? "",
          focus: initial.focus ?? "",
          location: initial.location ?? "",
          cost: initial.cost != null ? String(initial.cost) : "",
          pic_ids: initial.pic_ids ? initial.pic_ids.map(id => String(id)) : [],
          category_id: initial.category_id != null ? String(initial.category_id) : "",
          sub_category_id: initial.sub_category_id != null ? String(initial.sub_category_id) : "",
          description_result: initial.description_result ?? "",
          document_link: initial.document_link ?? "",
        }
      : { ...emptyDailyDraft, ...defaultValues }
  );
  
  const set = (k: string, v: string | (string | number)[]) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next as any);
  };
  
  const handleClear = () => {
    setF({ ...emptyDailyDraft });
    onDraftChange?.({ ...emptyDailyDraft });
  };
  
  const handleSave = () => {
    const missing: string[] = (
      [
        [!f.activity_date, "Tanggal Kegiatan"],
        [!f.activity, "Aktivitas"],
        [!f.pic_ids || f.pic_ids.length === 0, "PIC"],
        [!f.category_id, "Kategori"],
        [!f.sub_category_id, "Sub Kategori"],
      ] as [boolean, string][]
    ).filter(([cond]) => cond).map(([, label]) => label);

    if (missing.length > 0) {
      if (showToast) {
        showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
      } else {
        alert(`Field berikut belum diisi: ${missing.join(", ")}`);
      }
      return;
    }
    onSave({ ...f, cost: Number(f.cost) || 0, document_link: f.document_link || null } as any);
    if (!initial) onDraftChange?.({ ...emptyDailyDraft });
    onClose();
  };
  
  return (
    <Modal title={initial ? "Edit Kegiatan" : "Tambah Kegiatan Baru"} onClose={onClose}>
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Tanggal Kegiatan" required><input type="date" value={String(f.activity_date).split('T')[0]} onChange={e => set("activity_date", e.target.value)} className={inputCls} /></Field>
        <div className="col-span-2"><Field label="Kegiatan" required><input type="text" value={f.activity} onChange={e => set("activity", e.target.value)} placeholder="Deskripsi kegiatan" className={inputCls} /></Field></div>
        <Field label="Institusi / Kelompok"><input type="text" value={f.institution_group} onChange={e => set("institution_group", e.target.value)} placeholder="Nama institusi" className={inputCls} /></Field>
        <Field label="Alamat"><input type="text" value={f.address} onChange={e => set("address", e.target.value)} placeholder="Alamat institusi" className={inputCls} /></Field>
        <Field label="Lokasi"><input type="text" value={f.location} onChange={e => set("location", e.target.value)} placeholder="Lokasi kegiatan" className={inputCls} /></Field>
        <Field label="Fokus"><input type="text" value={f.focus} onChange={e => set("focus", e.target.value)} placeholder="Fokus kegiatan" className={inputCls} /></Field>
        <Field label="Biaya (Rp)"><CurrencyInput value={f.cost} onChange={val => set("cost", val)} className={`${inputCls} font-mono`} /></Field>
        <Field label="Category" required><select value={f.category_id} onChange={e => { const next = { ...f, category_id: e.target.value, sub_category_id: "" }; setF(next); if (!initial) onDraftChange?.(next as any); }} className={inputCls}><option value="">Pilih Category</option>{refs.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Sub Category" required><select value={f.sub_category_id} onChange={e => set("sub_category_id", e.target.value)} className={inputCls}><option value="">Pilih Sub Category</option>{refs.sub_categories.filter(s => String(s.category_id) === String(f.category_id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="PIC" required>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5 p-2 bg-input-background border border-border rounded-md min-h-[42px]">
                {refs.pics.length === 0 && <span className="text-xs text-muted-foreground self-center">Belum ada PIC</span>}
                {refs.pics.map(p => {
                  const isSelected = f.pic_ids.map(String).includes(String(p.id));
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        let newIds = [...f.pic_ids.map(String)];
                        if (isSelected) {
                          newIds = newIds.filter(id => id !== String(p.id));
                        } else {
                          newIds.push(String(p.id));
                        }
                        set("pic_ids", newIds);
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-all active:scale-95 ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                          : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="button" onClick={() => setShowPicManager(true)} className="p-2 border border-border rounded-md hover:bg-muted text-muted-foreground shrink-0" title="Atur PIC"><Settings size={14} /></button>
          </div>
        </Field>
        <div className="col-span-3"><Field label="Keterangan & Hasil"><textarea rows={2} value={f.description_result} onChange={e => set("description_result", e.target.value)} placeholder="Uraian kegiatan dan hasil yang dicapai" className={`${inputCls} resize-none`} /></Field></div>
        <div className="col-span-3">
          <Field label="Dokumen Lampiran" hint="Pilih file dokumen (maks 5MB). Pastikan Tanggal dan PIC sudah terisi.">
            <FileInput 
              value={f.document_link || null} 
              onChange={(fData: any) => set("document_link", typeof fData === 'string' ? fData : fData?.url || "")}
              picName={refs.pics.filter(p => f.pic_ids.map(String).includes(String(p.id))).map(p => p.name).join(", ")}
              activityDate={f.activity_date}
            />
          </Field>
        </div>
      </div>
      <ModalFooter
        onClose={onClose}
        onSave={handleSave}
        onClear={!initial ? handleClear : undefined}
        saveLabel={initial ? "Simpan Perubahan" : "Simpan Kegiatan"}
        isEdit={!!initial}
      />
      {showPicManager && <PicManagementModal onClose={() => { setShowPicManager(false); onRefreshReferences(); }} showToast={showToast} />}
    </Modal>
  );
}

export default function DailyActivitiesModule({ activeYear, onExport, showToast }: { activeYear: string; onExport: (l: string, payload?: any) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [items, setItems] = useState<DailyActivity[]>([]);
  const [references, setReferences] = useState({ pics: [], categories: [], sub_categories: [] });
  const [addDraft, setAddDraft] = useState({ ...emptyDailyDraft });
  
  useEffect(() => {
    fetchData();
    fetchReferences();
  }, [activeYear]);

  const fetchReferences = async () => {
    try {
      const res = await apiClient.get('/references');
      setReferences(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      const yearParam = activeYear ? `?year=${activeYear}` : '';
      const res = await apiClient.get(`/daily-activities${yearParam}`);
      setItems(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (d: Omit<DailyActivity, "id">) => {
    try {
      await apiClient.post('/daily-activities', d);
      fetchData();
      showToast(`Kegiatan '${d.activity}' berhasil ditambahkan`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<DailyActivity, "id">) => {
    try {
      await apiClient.put(`/daily-activities/${id}`, d);
      fetchData();
      showToast(`Kegiatan '${d.activity}' berhasil diperbarui`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number, activityName?: string) => {
    try {
      await apiClient.delete(`/daily-activities/${id}`);
      fetchData();
      showToast(`Kegiatan '${activityName || ''}' berhasil dihapus`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };

  const enrichedItems = useMemo(() => {
    return items.map(a => ({
      ...a,
      category_name: references.categories?.find((c: any) => String(c.id) === String(a.category_id))?.name || "-",
      sub_category_name: references.sub_categories?.find((s: any) => String(s.id) === String(a.sub_category_id))?.name || "-"
    }));
  }, [items, references.categories, references.sub_categories]);

  const { q, setQ, filtered } = useGlobalSearch(enrichedItems);
  const [catFilter, setCatFilter] = useState("All");
  const [subCatFilter, setSubCatFilter] = useState("All");
  const [dateRange, setDateRange] = useState<DateRange>({ start: "", end: "" });
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<DailyActivity | null>(null);
  const [toDelete, setToDelete] = useState<DailyActivity | null>(null);
  
  const displayed = useMemo(() => {
    let result = filtered;
    if (catFilter !== "All") result = result.filter(a => String(a.category_id) === String(catFilter));
    if (subCatFilter !== "All") result = result.filter(a => String(a.sub_category_id) === String(subCatFilter));
    result = filterByDateRange(result, 'activity_date', dateRange);
    return result;
  }, [filtered, catFilter, subCatFilter, dateRange]);

  const handleExportClick = () => {
    const exportColumns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Tanggal', key: 'date', width: 15 },
      { header: 'Kegiatan', key: 'activity', width: 30 },
      { header: 'Fokus', key: 'focus', width: 20 },
      { header: 'Institusi', key: 'institution', width: 25 },
      { header: 'Alamat', key: 'address', width: 30 },
      { header: 'Lokasi', key: 'location', width: 20 },
      { header: 'Kategori', key: 'kategori', width: 20 },
      { header: 'Sub Kategori', key: 'sub_kategori', width: 25 },
      { header: 'PIC', key: 'pic', width: 15 },
      { header: 'Biaya', key: 'cost', width: 15 },
      { header: 'Keterangan', key: 'description', width: 40 }
    ];

    const exportData = displayed.map((a, i) => ({
      no: i + 1,
      date: formatDate(a.activity_date),
      activity: a.activity,
      focus: a.focus || '-',
      institution: a.institution_group || '-',
      address: a.address || '-',
      location: a.location || '-',
      kategori: a.category?.name || '-',
      sub_kategori: a.sub_category_name,
      biaya: a.cost ? Number(a.cost) : null,
      pic: a.pics?.map(p => p.name).join(', ') || a.pic_ids?.join(', ') || '-',
      description: a.description_result || '-'
    }));

    onExport("Daily Activities", { sheetName: "Daily Activities Juli 2026", columns: exportColumns, data: exportData });
  };

  const columns: ColumnDef<DailyActivity>[] = useMemo(() => [
    { header: "No", render: (_, i) => <span className="text-xs text-muted-foreground font-mono">{i + 1}</span> },
    { header: "Tanggal", accessor: "activity_date", sortable: true, render: (a) => <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{formatDate(a.activity_date)}</span> },
    { header: "Kegiatan", accessor: "activity", sortable: true, render: (a) => <div className="text-sm font-medium text-foreground whitespace-normal max-w-[200px]">{a.activity}</div> },
    { header: "Fokus", accessor: "focus", sortable: true, render: (a) => <div className="text-xs text-muted-foreground whitespace-normal max-w-[150px]">{a.focus || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Institusi & Alamat", accessor: "institution_group", sortable: true, render: (a) => (
      <div className="max-w-[200px]">
        <div className="text-sm font-medium text-foreground">{a.institution_group || <span className="text-muted-foreground/50">—</span>}</div>
        {a.address && <div className="text-xs text-muted-foreground mt-0.5 whitespace-normal">{a.address}</div>}
      </div>
    )},
    { header: "Lokasi", accessor: "location", sortable: true, render: (a) => <div className="text-xs text-foreground max-w-[150px] whitespace-normal">{a.location || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Biaya", accessor: "cost", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.cost ? `Rp ${Number(a.cost).toLocaleString('id-ID')}` : '-'}</span> },
    { header: "PIC", accessor: "pics", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.pics?.map(p => p.name).join(', ') || a.pic_ids?.join(', ') || '-'}</span> },
    { header: "Kategori", accessor: "category.name", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.category?.name || '-'}</span> },
    { header: "Sub Kategori", accessor: "sub_category_name", sortable: true },
    { header: "Keterangan & Hasil", accessor: "description_result", sortable: true, render: (a) => <div className="text-xs text-foreground whitespace-normal leading-relaxed max-w-[250px]">{a.description_result || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Docs", className: "text-center", render: (a) => a.document_link && a.document_link !== "[]" ? <span className="text-blue-600 cursor-pointer" title="Ada Lampiran Dokumen"><ExternalLink size={12} /></span> : <span className="text-muted-foreground text-xs">—</span> },
    { header: "", render: (a) => (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => setEditing(a)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={12} /></button>
        <button onClick={() => setToDelete(a)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
      </div>
    )}
  ], []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar 
        title="Daily Activities" subtitle="Rekaman kegiatan harian tim CRS" 
        onAdd={() => setShowForm(true)} addLabel="Tambah Kegiatan" 
        showSearch searchValue={q} onSearch={setQ} 
        onExport={handleExportClick}
        categories={references.categories}
        catFilter={catFilter}
        onCatFilterChange={(val) => { setCatFilter(val); setSubCatFilter("All"); }}
        subCategories={references.sub_categories}
        subCatFilter={subCatFilter}
        onSubCatFilterChange={setSubCatFilter}
      >
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <button 
          type="button" 
          onClick={() => setShowImport(true)} 
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white text-foreground border border-border rounded-md hover:bg-muted transition-colors"
        >
          <Download size={13} className="rotate-180" />
          Import Excel
        </button>
      </TopBar>
      <div className="flex-1 overflow-auto p-6 h-full flex flex-col">
        <div className="flex-1 min-h-0">
          <DataTable columns={columns} data={displayed} />
        </div>
        <div className="mt-2 text-xs text-muted-foreground font-mono">Menampilkan {displayed.length} dari {items.length} kegiatan</div>
      </div>
      {showForm && <DailyForm defaultValues={addDraft} onDraftChange={setAddDraft} refs={references} onRefreshReferences={fetchReferences} onClose={() => setShowForm(false)} onSave={handleAdd} showToast={showToast} />}
      {editing && <DailyForm refs={references} onRefreshReferences={fetchReferences} initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
      {toDelete && <DeleteConfirmModal label={toDelete.activity} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id, toDelete.activity); setToDelete(null); }} />}
      {showImport && (
        <ImportExcelModal 
          onClose={() => setShowImport(false)} 
          onSuccess={() => { 
            setShowImport(false); 
            fetchData(); 
            showToast("Data kegiatan berhasil diimport dari Excel", "success"); 
          }} 
        />
      )}
    </div>
  );
}
