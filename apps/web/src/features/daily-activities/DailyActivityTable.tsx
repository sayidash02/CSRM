import { useMemo } from "react";
import { Edit2, Trash2, RotateCcw, History, FileSpreadsheet, FileText, Image } from "lucide-react";
import { DataTable, ColumnDef } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import type { DailyActivity } from "./DailyActivitiesModule";

interface DailyActivityTableProps {
  items: DailyActivity[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
  showDeleted: boolean;
  onEdit: (activity: DailyActivity) => void;
  onDelete: (activity: DailyActivity) => void;
  onRestore: (activity: DailyActivity) => void;
  onHistory: (id: string | number) => void;
  onDownloadSingleMom: (id: string | number, activity: string, date: string, format?: 'xlsx' | 'docx' | 'pdf') => void;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
}

const formatDate = (d?: string | Date | null) => {
  if (!d) return "-";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "-";
  return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export function DailyActivityTable({
  items, meta, showDeleted, onEdit, onDelete, onRestore, onHistory, onDownloadSingleMom,
  page, limit, onPageChange, onLimitChange, sortBy, sortDir, onSortChange
}: DailyActivityTableProps) {
  const columns: ColumnDef<DailyActivity>[] = useMemo(() => [
    { header: "No", render: (_, i) => <span className="text-xs text-slate-2 font-mono">{(meta.page - 1) * meta.limit + i + 1}</span> },
    { header: "Tanggal", accessor: "activity_date", sortable: true, render: (a) => <span className="text-xs text-slate font-mono whitespace-nowrap">{formatDate(a.activity_date)}</span> },
    { header: "Nama Kegiatan", accessor: "activity", sortable: true, render: (a) => <div className="text-[13px] font-medium text-ink whitespace-normal max-w-[220px]">{a.activity}</div> },
    { header: "Fokus", accessor: "focus", sortable: true, render: (a) => <div className="text-xs text-slate whitespace-normal max-w-[130px]">{a.focus || <span className="text-slate-2/50">—</span>}</div> },
    { header: "Instansi / Kelompok & Alamat", accessor: "institution_group", sortable: true, render: (a) => (
      <div className="max-w-[200px]">
        <div className="text-[13px] font-medium text-ink whitespace-normal line-clamp-2">{a.stakeholder?.name || a.institution_group || <span className="text-slate-2/50">—</span>}</div>
        {a.address && <div className="text-[11px] text-slate mt-0.5 whitespace-normal line-clamp-1">📍 {a.address}</div>}
      </div>
    )},
    { header: "Lokasi", accessor: "location", sortable: true, render: (a) => <div className="text-xs text-slate max-w-[120px] whitespace-normal">{a.location || <span className="text-slate-2/50">—</span>}</div> },
    { header: "Biaya", accessor: "cost", sortable: true, render: (a) => <span className="text-xs font-mono text-ink whitespace-nowrap">{a.cost ? `Rp ${Number(a.cost).toLocaleString('id-ID')}` : '-'}</span> },
    { header: "PIC (Tim CSR)", accessor: "pics", sortable: true, render: (a) => <span className="text-xs text-ink whitespace-nowrap">{a.pics && a.pics.length > 0 ? a.pics.map((p: any) => p.name).join(', ') : '-'}</span> },
    { header: "Kategori", accessor: "category.name", sortable: true, render: (a) => <span className="text-xs text-slate whitespace-nowrap">{a.category?.name || a.category_name || '-'}</span> },
    { header: "Sub Kategori", accessor: "sub_category.name", sortable: true, render: (a) => <span className="text-xs text-slate whitespace-nowrap">{a.sub_category?.name || a.sub_category_name || '-'}</span> },
    { header: "Keterangan", accessor: "keterangan", sortable: true, render: (a) => <div className="text-xs text-slate whitespace-normal leading-relaxed max-w-[180px] line-clamp-3" title={a.keterangan || ''}>{a.keterangan || (!a.hasil ? a.description_result : null) || <span className="text-slate-2/50">—</span>}</div> },
    { header: "Hasil", accessor: "hasil", sortable: true, render: (a) => <div className="text-xs text-slate whitespace-normal leading-relaxed max-w-[180px] line-clamp-3" title={a.hasil || ''}>{a.hasil || <span className="text-slate-2/50">—</span>}</div> },
    { header: "Kesimpulan", accessor: "kesimpulan", sortable: true, render: (a) => <div className="text-xs text-slate whitespace-normal leading-relaxed max-w-[160px] line-clamp-3" title={a.kesimpulan || ''}>{a.kesimpulan || <span className="text-slate-2/50">—</span>}</div> },
    {
      header: "Dokumentasi",
      className: "text-center whitespace-nowrap",
      render: (a) => {
        const photos = a.photos || [];
        if (photos.length === 0) return <span className="text-slate-2 text-xs">—</span>;
        return (
          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-forest bg-forest/10 px-2 py-0.5 rounded-md border border-forest/20" title={`${photos.length} foto dokumentasi terlampir`}>
            <Image size={12} className="text-forest" />
            <span>{photos.length} Foto</span>
          </div>
        );
      }
    },
    {
      header: "Notulensi (MOM)",
      className: "text-center whitespace-nowrap",
      render: (a) => (
        <div className="inline-flex items-center gap-1.5">
          <button
            onClick={() => onDownloadSingleMom(a.id, a.activity, a.activity_date, 'xlsx')}
            title={`Unduh MOM Excel: ${a.activity}`}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-forest bg-forest/10 hover:bg-forest/20 rounded-md border border-forest/30 transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet size={12} className="text-forest" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => onDownloadSingleMom(a.id, a.activity, a.activity_date, 'docx')}
            title={`Unduh MOM Word: ${a.activity}`}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-ink bg-paper-2 hover:bg-paper rounded-md border border-line transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <FileText size={12} className="text-slate" />
            <span>Word</span>
          </button>
          <button
            onClick={() => onDownloadSingleMom(a.id, a.activity, a.activity_date, 'pdf')}
            title={`Unduh MOM PDF: ${a.activity}`}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-clay bg-clay/10 hover:bg-clay/20 rounded-md border border-clay/30 transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <FileText size={12} className="text-clay" />
            <span>PDF</span>
          </button>
        </div>
      )
    },
    { header: "Aksi", render: (a) => showDeleted ? (
      <div className="flex items-center justify-end">
        <button
          onClick={() => onRestore(a)}
          className="px-2.5 py-1 text-xs font-medium text-forest bg-forest/10 hover:bg-forest/20 rounded-md border border-forest/30 flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw size={12} />
          Pulihkan
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => { onHistory(a.id); }} title="Riwayat Perubahan" className="p-1.5 rounded-md hover:bg-paper-2 text-slate-2 hover:text-ink transition-colors cursor-pointer"><History size={13} /></button>
        <button onClick={() => onEdit(a)} title="Edit Kegiatan" className="p-1.5 rounded-md hover:bg-ochre/10 text-slate-2 hover:text-ochre transition-colors cursor-pointer"><Edit2 size={13} /></button>
        <button onClick={() => onDelete(a)} title="Hapus Kegiatan" className="p-1.5 rounded-md hover:bg-clay/10 text-slate-2 hover:text-clay transition-colors cursor-pointer"><Trash2 size={13} /></button>
      </div>
    )}
  ], [showDeleted, meta.page, meta.limit, onRestore, onHistory, onEdit, onDelete, onDownloadSingleMom]);

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex-1 min-h-0">
        <DataTable
          columns={columns}
          data={items}
          onSortChange={onSortChange}
          serverSortConfig={sortBy ? { key: sortBy, direction: sortDir || 'desc' } : null}
        />
      </div>
      <Pagination
        page={page}
        currentPage={page}
        totalPages={meta.totalPages || 1}
        totalItems={meta.totalItems || 0}
        limit={limit}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />
    </div>
  );
}
