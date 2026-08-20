import React, { useMemo } from "react";
import { Edit2, ExternalLink, Trash2, RotateCcw, History, FileSpreadsheet, Image } from "lucide-react";
import { parseSharePointLinks } from "../../components/ui/sharePointLinks";
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
  onDownloadSingleMom: (id: string | number, activity: string, date: string) => void;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const formatDate = (d?: string | Date | null) => {
  if (!d) return "-";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "-";
  return dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export function DailyActivityTable({
  items, meta, showDeleted, onEdit, onDelete, onRestore, onHistory, onDownloadSingleMom,
  page, limit, onPageChange, onLimitChange
}: DailyActivityTableProps) {
  const columns: ColumnDef<DailyActivity>[] = useMemo(() => [
    { header: "No", render: (_, i) => <span className="text-xs text-muted-foreground font-mono">{(meta.page - 1) * meta.limit + i + 1}</span> },
    { header: "Tanggal", accessor: "activity_date", sortable: true, render: (a) => <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{formatDate(a.activity_date)}</span> },
    { header: "Daily Title / Kegiatan", accessor: "activity", sortable: true, render: (a) => <div className="text-sm font-medium text-foreground whitespace-normal max-w-[200px]">{a.activity}</div> },
    { header: "Fokus", accessor: "focus", sortable: true, render: (a) => <div className="text-xs text-muted-foreground whitespace-normal max-w-[130px]">{a.focus || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Attendees / Instansi & Venue", accessor: "institution_group", sortable: true, render: (a) => (
      <div className="max-w-[200px]">
        <div className="text-sm font-medium text-foreground whitespace-normal line-clamp-2">{a.stakeholder?.name || a.institution_group || <span className="text-muted-foreground/50">—</span>}</div>
        {a.address && <div className="text-xs text-muted-foreground mt-0.5 whitespace-normal line-clamp-1">📍 {a.address}</div>}
      </div>
    )},
    { header: "Lokasi", accessor: "location", sortable: true, render: (a) => <div className="text-xs text-foreground max-w-[120px] whitespace-normal">{a.location || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Biaya", accessor: "cost", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.cost ? `Rp ${Number(a.cost).toLocaleString('id-ID')}` : '-'}</span> },
    { header: "PIC (JSP)", accessor: "pics", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.pics && a.pics.length > 0 ? a.pics.map((p: any) => p.name).join(', ') : '-'}</span> },
    { header: "Category", accessor: "category.name", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.category?.name || a.category_name || '-'}</span> },
    { header: "Sub Category", accessor: "sub_category_name", sortable: true },
    { header: "Keterangan", accessor: "keterangan", sortable: true, render: (a) => <div className="text-xs text-foreground whitespace-normal leading-relaxed max-w-[180px] line-clamp-3" title={a.keterangan || ''}>{a.keterangan || (!a.hasil ? a.description_result : null) || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Hasil", accessor: "hasil", sortable: true, render: (a) => <div className="text-xs text-foreground whitespace-normal leading-relaxed max-w-[180px] line-clamp-3" title={a.hasil || ''}>{a.hasil || <span className="text-muted-foreground/50">—</span>}</div> },
    { header: "Kesimpulan", accessor: "kesimpulan", sortable: true, render: (a) => <div className="text-xs text-foreground whitespace-normal leading-relaxed max-w-[160px] line-clamp-3" title={a.kesimpulan || ''}>{a.kesimpulan || <span className="text-muted-foreground/50">—</span>}</div> },
    {
      header: "Dokumentasi",
      className: "text-center whitespace-nowrap",
      render: (a) => {
        const links = parseSharePointLinks(a.document_link);
        if (links.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
        if (links.length === 1) {
          const l = links[0];
          const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(l) || l.startsWith('/uploads/');
          const fullUrl = l.startsWith('http') ? l : `http://localhost:3000${l.replace(/^file:\/\//, '').replace(/^\/+/, '/')}`;
          return (
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              title={l}
            >
              {isImg ? <Image size={12} className="text-blue-600" /> : <ExternalLink size={12} />}
              <span>1 File</span>
            </a>
          );
        }
        return (
          <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200" title={`${links.length} file dokumentasi terlampir`}>
            <Image size={12} className="text-emerald-600" />
            <span>{links.length} Foto</span>
          </div>
        );
      }
    },
    {
      header: "Daily Notes (MOM)",
      className: "text-center whitespace-nowrap",
      render: (a) => (
        <button
          onClick={() => onDownloadSingleMom(a.id, a.activity, a.activity_date)}
          title={`Unduh lembar Daily Notes / Notulensi MOM: ${a.activity}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 rounded-md border border-emerald-300 transition-all shadow-2xs active:scale-95"
        >
          <FileSpreadsheet size={13} className="text-emerald-600" />
          <span>Unduh MOM</span>
        </button>
      )
    },
    { header: "Aksi", render: (a) => showDeleted ? (
      <div className="flex items-center justify-end">
        <button
          onClick={() => onRestore(a)}
          className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1"
        >
          <RotateCcw size={12} />
          Restore
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => { onHistory(a.id); }} title="Riwayat Perubahan" className="p-1 rounded hover:bg-gray-100 text-muted-foreground hover:text-gray-800 transition-colors"><History size={12} /></button>
        <button onClick={() => onEdit(a)} className="p-1 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"><Edit2 size={12} /></button>
        <button onClick={() => onDelete(a)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
      </div>
    )}
  ], [showDeleted, meta.page, meta.limit, onRestore, onHistory, onEdit, onDelete, onDownloadSingleMom]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <DataTable
        columns={columns}
        data={items}
      />
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
