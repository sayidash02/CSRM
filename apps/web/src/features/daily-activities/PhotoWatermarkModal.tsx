import React, { useEffect, useRef, useState } from "react";
import { Stamp, Sparkles, Check, RefreshCw } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import {
  applyWatermarkToImage,
  type WatermarkOptions,
} from "../../lib/watermarkUtils";
import type { AttachedPhoto } from "./PhotoGalleryAttachmentInput";

const inputCls =
  "w-full px-3 py-1.5 text-xs bg-white border border-line rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest";

interface PhotoWatermarkModalProps {
  photo: AttachedPhoto;
  defaultOptions: WatermarkOptions;
  onClose: () => void;
  onApply: (watermarkedFile: File, previewUrl: string) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export function PhotoWatermarkModal({
  photo,
  defaultOptions,
  onClose,
  onApply,
  showToast,
}: PhotoWatermarkModalProps) {
  const [options, setOptions] = useState<WatermarkOptions>({
    organizationName: defaultOptions.organizationName || "CRS & COMMUNITY RELATIONS | ARSIP AUDIT",
    dateText: defaultOptions.dateText || "",
    locationText: defaultOptions.locationText || "",
    activityTitle: defaultOptions.activityTitle || "",
    note: defaultOptions.note || "",
    position: defaultOptions.position || "bottom-left",
    badgeTheme: defaultOptions.badgeTheme || "slate",
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [generatedFile, setGeneratedFile] = useState<File | null>(null);
  const debounceTimerRef = useRef<any>(null);

  const rawSource = photo.file || photo.previewUrl || photo.url;

  // Generate live preview when options change
  const renderWatermarkPreview = async () => {
    if (!rawSource) return;
    setProcessing(true);
    try {
      let sourceToUse: Blob | File | string = rawSource;
      if (typeof rawSource === "string") {
        const resp = await fetch(rawSource);
        sourceToUse = await resp.blob();
      }
      const result = await applyWatermarkToImage(sourceToUse as any, options, photo.original_name);
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(result.previewUrl);
      setGeneratedFile(result.file);
    } catch (err: any) {
      console.error("Gagal merender watermark preview:", err);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      renderWatermarkPreview();
    }, 250);
    return () => clearTimeout(debounceTimerRef.current);
  }, [options]);

  const handleApply = () => {
    if (!generatedFile || !previewUrl) {
      showToast?.("Watermark belum selesai diproses", "error");
      return;
    }
    onApply(generatedFile, previewUrl);
    showToast?.("Watermark audit berhasil diterapkan ke foto", "success");
    onClose();
  };

  return (
    <Modal title="Bubuhi Cap Air (Watermark) Dokumentasi & Audit" onClose={onClose} size="lg">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left column: Live Preview */}
        <div className="md:col-span-7 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate">
            <span className="font-semibold text-ink flex items-center gap-1.5">
              <Sparkles size={14} className="text-forest" />
              Live Preview Watermark
            </span>
            {processing && (
              <span className="flex items-center gap-1 text-forest animate-pulse font-mono text-[11px]">
                <RefreshCw size={12} className="animate-spin" /> Memperbarui...
              </span>
            )}
          </div>

          <div className="relative aspect-4/3 w-full bg-paper-2 rounded-xl border border-line overflow-hidden flex items-center justify-center shadow-inner">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Watermark preview"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate text-xs">
                <RefreshCw size={18} className="animate-spin text-forest" />
                <span>Memuat gambar...</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate italic">
            * Cap air akan ditanam secara permanen pada resolusi asli foto untuk lampiran audit, dokumen MOM, dan ekspor PDF/Excel.
          </p>
        </div>

        {/* Right column: Options form */}
        <div className="md:col-span-5 flex flex-col gap-3.5 bg-paper/30 p-4 rounded-xl border border-line">
          <div className="text-xs font-semibold text-ink flex items-center gap-1.5 pb-2 border-b border-line">
            <Stamp size={14} className="text-forest" />
            Pengaturan Watermark
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate block mb-1">
              Instansi / Departemen
            </label>
            <input
              type="text"
              value={options.organizationName}
              onChange={(e) => setOptions({ ...options, organizationName: e.target.value })}
              className={inputCls}
              placeholder="Contoh: CRS & COMMUNITY RELATIONS"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate block mb-1">
              Tanggal Kegiatan / Pengambilan
            </label>
            <input
              type="text"
              value={options.dateText}
              onChange={(e) => setOptions({ ...options, dateText: e.target.value })}
              className={inputCls}
              placeholder="Contoh: 25 Mei 2026"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate block mb-1">
              Lokasi / Desa / Venue
            </label>
            <input
              type="text"
              value={options.locationText}
              onChange={(e) => setOptions({ ...options, locationText: e.target.value })}
              className={inputCls}
              placeholder="Contoh: Cilamaya Girang, Karawang"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate block mb-1">
              Judul Kegiatan / Topik
            </label>
            <input
              type="text"
              value={options.activityTitle}
              onChange={(e) => setOptions({ ...options, activityTitle: e.target.value })}
              className={inputCls}
              placeholder="Contoh: Koordinasi Kelompok Nelayan"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate block mb-1">
              Posisi Watermark
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              {[
                { id: "bottom-left", label: "Bawah Kiri" },
                { id: "bottom-right", label: "Bawah Kanan" },
                { id: "bottom-strip", label: "Pita Bawah" },
              ].map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => setOptions({ ...options, position: pos.id as any })}
                  className={`py-1 px-2 rounded-md border text-center transition-colors font-medium ${
                    options.position === pos.id
                      ? "bg-forest text-white border-forest shadow-2xs"
                      : "bg-white text-slate border-line hover:bg-paper"
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate block mb-1">
              Tema Tampilan Badge
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              {[
                { id: "slate", label: "Slate Dark" },
                { id: "navy", label: "Navy Blue" },
                { id: "emerald", label: "Emerald" },
              ].map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setOptions({ ...options, badgeTheme: theme.id as any })}
                  className={`py-1 px-2 rounded-md border text-center transition-colors font-medium ${
                    options.badgeTheme === theme.id
                      ? "bg-forest text-white border-forest shadow-2xs"
                      : "bg-white text-slate border-line hover:bg-paper"
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-line">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-medium text-slate hover:text-ink hover:bg-paper rounded-lg border border-line transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={processing || !generatedFile}
          className="px-5 py-2 text-xs font-semibold text-white bg-forest hover:bg-forest/90 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={14} />
          Terapkan Watermark
        </button>
      </div>
    </Modal>
  );
}
