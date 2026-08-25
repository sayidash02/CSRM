import React from "react";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  Tag, 
  DollarSign, 
  Image as ImageIcon,
  CheckCircle2,
  Building2,
  FileCheck2
} from "lucide-react";
import type { DailyActivity } from "./DailyActivitiesModule";

interface MomPreviewModalProps {
  activity: DailyActivity;
  onClose: () => void;
  onDownloadMom: (id: string | number, activity: string, date: string, format?: 'xlsx' | 'docx' | 'pdf') => void;
  onViewPhoto?: (photos: any[], initialIndex: number) => void;
}

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function formatFullIndonesianDate(d?: string | Date | null): string {
  if (!d) return "-";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "-";
  const dayName = INDONESIAN_DAYS[dateObj.getDay()];
  const dayNum = dateObj.getDate();
  const monthName = INDONESIAN_MONTHS[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${dayName}, ${dayNum} ${monthName} ${year}`;
}

export function MomPreviewModal({
  activity,
  onClose,
  onDownloadMom,
  onViewPhoto
}: MomPreviewModalProps) {
  const pics = activity.pics && activity.pics.length > 0 
    ? activity.pics.map((p: any) => p.name).join(', ')
    : (activity.pic?.name || '-');

  const stakeholderName = activity.stakeholder?.name || activity.institution_group || '-';
  const categoryName = activity.category?.name || activity.category_name || '-';
  const subCategoryName = activity.sub_category?.name || activity.sub_category_name || '-';
  const costFormatted = activity.cost 
    ? `Rp ${Number(activity.cost).toLocaleString('id-ID')}` 
    : '-';

  const photos = activity.photos || [];

  return (
    <div className="fixed inset-0 bg-ink/70 backdrop-blur-xs flex items-center justify-center z-[65] p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-line shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* TOP ACTION BAR */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-paper border-b border-line shrink-0 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center text-forest">
              <FileCheck2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Tinjauan Notulensi Kegiatan (MOM)</h2>
              <p className="text-[11px] text-slate font-mono">ID Kegiatan: #{activity.id} • {activity.activity}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Export Actions */}
            <button
              onClick={() => onDownloadMom(activity.id, activity.activity, activity.activity_date, 'pdf')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-clay bg-clay/10 hover:bg-clay/20 rounded-lg border border-clay/30 transition-all cursor-pointer shadow-2xs"
              title="Unduh format PDF resmi"
            >
              <FileText size={13} className="text-clay" />
              <span>PDF</span>
            </button>

            <button
              onClick={() => onDownloadMom(activity.id, activity.activity, activity.activity_date, 'docx')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-ink bg-paper-2 hover:bg-paper rounded-lg border border-line transition-all cursor-pointer shadow-2xs"
              title="Unduh format Word (.docx)"
            >
              <FileText size={13} className="text-slate" />
              <span>Word</span>
            </button>

            <button
              onClick={() => onDownloadMom(activity.id, activity.activity, activity.activity_date, 'xlsx')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-forest bg-forest/10 hover:bg-forest/20 rounded-lg border border-forest/30 transition-all cursor-pointer shadow-2xs"
              title="Unduh format Excel (.xlsx)"
            >
              <FileSpreadsheet size={13} className="text-forest" />
              <span>Excel</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate hover:text-ink hover:bg-paper-2 rounded-lg transition-colors cursor-pointer ml-1"
              title="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* DOCUMENT PREVIEW BODY (PAPER LAYOUT) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-paper/40 flex justify-center">
          <div 
            className="w-full max-w-3xl bg-white rounded-xl border border-line shadow-sm p-6 sm:p-10 text-ink space-y-6"
          >
            {/* OFFICIAL DOCUMENT HEADER */}
            <div className="border-b-2 border-forest pb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-forest text-white">
                    CSR & Community Relations
                  </span>
                  <span className="text-xs text-slate font-mono">Form Ref: CSR-MOM-V2</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-ink mt-2 tracking-tight">
                  MINUTES OF MEETING (MOM)
                </h1>
                <p className="text-xs text-slate mt-0.5">
                  Catatan Notulensi Kegiatan & Interaksi Lapangan
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-medium text-slate">No. Dokumen:</div>
                <div className="text-xs font-mono font-bold text-forest">
                  MOM-{new Date(activity.activity_date || new Date()).getFullYear()}-{String(activity.id).padStart(4, '0')}
                </div>
              </div>
            </div>

            {/* METADATA GRID */}
            <div className="bg-paper/50 rounded-xl border border-line p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-forest mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate font-medium">Hari & Tanggal:</span>
                    <p className="font-semibold text-ink">{formatFullIndonesianDate(activity.activity_date)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Building2 size={14} className="text-forest mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate font-medium">Instansi / Kelompok Warga:</span>
                    <p className="font-semibold text-ink">{stakeholderName}</p>
                    {activity.address && <p className="text-slate text-[11px]">📍 {activity.address}</p>}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-forest mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate font-medium">Lokasi Kegiatan:</span>
                    <p className="font-semibold text-ink">{activity.location || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Users size={14} className="text-forest mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate font-medium">PIC (Tim CSR):</span>
                    <p className="font-semibold text-ink">{pics}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Tag size={14} className="text-forest mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate font-medium">Kategori & Sub Kategori:</span>
                    <p className="font-semibold text-ink">{categoryName} • {subCategoryName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <DollarSign size={14} className="text-forest mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate font-medium">Realisasi Biaya:</span>
                    <p className="font-semibold text-ink font-mono">{costFormatted}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* KEGIATAN & FOKUS */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-forest uppercase tracking-wider">Topik / Nama Kegiatan:</span>
              <h2 className="text-base font-semibold text-ink bg-forest/5 p-3 rounded-lg border border-forest/20">
                {activity.activity}
              </h2>
              {activity.focus && (
                <p className="text-xs text-slate mt-1 italic">
                  Fokus Utama: <span className="font-medium text-ink not-italic">{activity.focus}</span>
                </p>
              )}
            </div>

            {/* SECTIONS: KETERANGAN, HASIL, KESIMPULAN, NEXT PLAN */}
            <div className="space-y-4">
              {/* 1. Keterangan / Uraian */}
              <div className="border border-line rounded-xl p-4 bg-white">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-line mb-2">
                  <CheckCircle2 size={13} className="text-forest" />
                  1. Uraian & Latar Belakang Kegiatan
                </h3>
                <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                  {activity.keterangan || activity.description_result || <span className="text-slate-2 italic">Tidak ada catatan keterangan khusus.</span>}
                </div>
              </div>

              {/* 2. Hasil Pembahasan */}
              <div className="border border-line rounded-xl p-4 bg-white">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-line mb-2">
                  <CheckCircle2 size={13} className="text-forest" />
                  2. Hasil Pembahasan & Fakta Lapangan
                </h3>
                <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                  {activity.hasil || <span className="text-slate-2 italic">Tidak ada catatan hasil khusus.</span>}
                </div>
              </div>

              {/* 3. Kesimpulan */}
              <div className="border border-line rounded-xl p-4 bg-white">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-line mb-2">
                  <CheckCircle2 size={13} className="text-forest" />
                  3. Kesimpulan Rapat / Pertemuan
                </h3>
                <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                  {activity.kesimpulan || <span className="text-slate-2 italic">Tidak ada kesimpulan khusus.</span>}
                </div>
              </div>

              {/* 4. Rencana Selanjutnya (Next Plan) */}
              <div className="border border-line rounded-xl p-4 bg-forest/5 border-forest/20">
                <h3 className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-forest/20 mb-2">
                  <CheckCircle2 size={13} className="text-forest" />
                  4. Rencana Tindak Lanjut (Next Plan)
                </h3>
                <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap font-medium">
                  {activity.next_plan || <span className="text-slate-2 font-normal italic">Tidak ada rencana tindak lanjut tercatat.</span>}
                </div>
              </div>
            </div>

            {/* DOKUMENTASI FOTO TERLAMPIR */}
            {photos.length > 0 && (
              <div className="border border-line rounded-xl p-4 bg-white space-y-3">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-line">
                  <ImageIcon size={13} className="text-forest" />
                  Lampiran Foto Dokumentasi ({photos.length} Foto)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((p, idx) => (
                    <div 
                      key={p.id || idx}
                      onClick={() => onViewPhoto?.(photos, idx)}
                      className="group relative rounded-lg overflow-hidden border border-line aspect-4/3 bg-paper cursor-pointer shadow-2xs hover:border-forest transition-all"
                      title="Klik untuk memperbesar foto"
                    >
                      <img 
                        src={p.url} 
                        alt={p.original_name || `Foto ${idx + 1}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                      />
                      <div className="absolute inset-0 bg-ink/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium gap-1">
                        <ImageIcon size={12} />
                        <span>Perbesar</span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-[10px] text-white truncate font-mono">
                        {p.original_name || `Foto Dokumentasi ${idx + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PENGESAHAN / TANDA TANGAN */}
            <div className="pt-6 border-t border-line grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-12">
                <p className="text-slate font-medium">Dibuat Oleh (PIC Tim CSR):</p>
                <div>
                  <p className="font-bold text-ink underline">{pics !== '-' ? pics : '....................................'}</p>
                  <p className="text-[10px] text-slate-2 mt-0.5">Petugas CSR Lapangan</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="text-slate font-medium">Disetujui Oleh:</p>
                <div>
                  <p className="font-bold text-ink underline">....................................</p>
                  <p className="text-[10px] text-slate-2 mt-0.5">CSR & Community Relations Lead</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 bg-paper border-t border-line flex items-center justify-between text-xs text-slate shrink-0">
          <span>Gunakan tombol unduhan di atas (PDF, Word, atau Excel) untuk mengekspor dokumen notulensi ini.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-paper-2 hover:bg-paper text-ink font-medium rounded-lg border border-line transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
