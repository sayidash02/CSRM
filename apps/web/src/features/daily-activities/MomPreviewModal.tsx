import { useState, useEffect } from "react";
import { apiClient } from "../../lib/apiClient";
import { 
  FileSpreadsheet, 
  FileText, 
  X, 
  FileCheck2,
  Loader2,
  RefreshCw
} from "lucide-react";
import type { DailyActivity } from "./DailyActivitiesModule";

interface MomPreviewModalProps {
  activity: DailyActivity;
  onClose: () => void;
  onDownloadMom: (id: string | number, activity: string, date: string, format?: 'xlsx' | 'docx' | 'pdf') => void;
  onViewPhoto?: (photos: any[], initialIndex: number) => void;
}

export function MomPreviewModal({
  activity,
  onClose,
  onDownloadMom,
  onViewPhoto
}: MomPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPdf = () => {
    setLoading(true);
    setError(null);
    apiClient.get(`/daily-activities/${activity.id}/mom?format=pdf`, { responseType: 'blob' })
      .then(res => {
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch(err => {
        console.error('Gagal memuat PDF MOM:', err);
        setError('Gagal memuat dokumen PDF MOM. Silakan coba lagi.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPdf();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [activity.id]);

  return (
    <div className="fixed inset-0 bg-ink/70 backdrop-blur-xs flex items-center justify-center z-[65] p-2 sm:p-4 md:p-6" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl border border-line shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-ink"
        onClick={e => e.stopPropagation()}
      >
        {/* TOP ACTION BAR */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-paper border-b border-line shrink-0 gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center text-forest">
              <FileCheck2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <span>Notulensi Kegiatan (MOM)</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-clay/10 text-clay border border-clay/30">
                  PDF Preview
                </span>
              </h2>
              <p className="text-[11px] text-slate font-mono truncate max-w-md">
                ID #{activity.id} • {activity.activity}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Export Actions */}
            <button
              onClick={() => onDownloadMom(activity.id, activity.activity, activity.activity_date, 'pdf')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-clay bg-clay/10 hover:bg-clay/20 rounded-lg border border-clay/30 transition-all cursor-pointer shadow-2xs"
              title="Unduh file dokumen PDF resmi"
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

            <div className="h-4 w-px bg-line mx-1" />

            <button
              onClick={onClose}
              className="p-1.5 text-slate hover:text-ink hover:bg-paper-2 rounded-lg transition-colors cursor-pointer"
              title="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PDF VIEWER CONTAINER */}
        <div className="flex-1 w-full bg-slate/10 overflow-hidden relative flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center bg-white/80 backdrop-blur-xs rounded-2xl shadow-sm border border-line">
              <Loader2 size={32} className="animate-spin text-forest" />
              <div>
                <p className="text-sm font-semibold text-ink">Memuat Dokumen PDF Resmi MOM...</p>
                <p className="text-xs text-slate mt-0.5 font-mono">Menyiapkan layout, tabel, dan lampiran dokumentasi</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center bg-white rounded-2xl shadow-sm border border-line max-w-md">
              <div className="w-12 h-12 rounded-full bg-clay/10 text-clay flex items-center justify-center">
                <X size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Gagal Membuka Dokumen PDF</p>
                <p className="text-xs text-slate mt-1">{error}</p>
              </div>
              <button
                onClick={loadPdf}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-forest hover:bg-forest-2 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <RefreshCw size={13} />
                <span>Coba Lagi</span>
              </button>
            </div>
          )}

          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0 bg-white"
              title={`MOM Preview - ${activity.activity}`}
            />
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-2.5 bg-paper border-t border-line flex items-center justify-between text-xs text-slate shrink-0">
          <span className="font-mono text-[11px]">
            * Dokumen PDF resmi siap cetak langsung dari browser.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-paper-2 text-ink font-medium rounded-lg border border-line transition-colors cursor-pointer shadow-2xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
