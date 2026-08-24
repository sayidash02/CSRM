import { useState } from "react";
import { Info, Calendar, Camera, MapPin, HardDrive, Copy, Check, ExternalLink } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import type { PhotoExifMetadata } from "../../lib/exifUtils";
import type { AttachedPhoto } from "./PhotoGalleryAttachmentInput";

interface PhotoMetadataModalProps {
  photo: AttachedPhoto;
  exif?: PhotoExifMetadata;
  onClose: () => void;
}

export function PhotoMetadataModal({ photo, exif, onClose }: PhotoMetadataModalProps) {
  const [copiedGps, setCopiedGps] = useState(false);

  const copyGpsCoordinates = () => {
    if (exif?.latitude && exif?.longitude) {
      navigator.clipboard.writeText(`${exif.latitude}, ${exif.longitude}`);
      setCopiedGps(true);
      setTimeout(() => setCopiedGps(false), 2000);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Modal title="Detail Metadata Foto & Informasi EXIF" onClose={onClose} size="md">
      <div className="flex flex-col gap-4 text-xs">
        {/* Photo header preview thumbnail */}
        <div className="flex items-center gap-3 bg-paper/40 p-3 rounded-xl border border-line">
          <div className="w-16 h-16 rounded-lg bg-paper-2 border border-line overflow-hidden shrink-0 flex items-center justify-center">
            <img
              src={photo.previewUrl || photo.url}
              alt="Thumbnail"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-semibold text-ink text-[13px] truncate" title={photo.original_name}>
              {photo.original_name || "Foto Kegiatan"}
            </span>
            <span className="text-slate text-[11px] font-mono mt-0.5">
              {photo.mime_type || "image/jpeg"} · {formatFileSize(photo.size_bytes || photo.file?.size)}
            </span>
            {photo.isPending ? (
              <span className="inline-block mt-1 text-[10px] text-ochre font-medium">
                ● Draft (Belum tersimpan di database)
              </span>
            ) : (
              <span className="inline-block mt-1 text-[10px] text-emerald-600 font-medium">
                ● Tersimpan aman di Database MySQL
              </span>
            )}
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 gap-2.5">
          {/* EXIF Date */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-line shadow-2xs">
            <Calendar size={16} className="text-forest shrink-0 mt-0.5" />
            <div className="flex flex-col flex-1">
              <span className="text-[11px] text-slate font-medium">Waktu Pengambilan Foto (EXIF DateTimeOriginal)</span>
              <span className="text-ink font-semibold mt-0.5">
                {exif?.dateTimeFormatted || (exif?.dateTaken ? exif.dateTaken.toLocaleString("id-ID") : "Tidak tertera di header EXIF")}
              </span>
              {exif?.dateTakenIso && (
                <span className="text-[10px] text-forest font-mono mt-0.5">
                  Format ISO: {exif.dateTakenIso}
                </span>
              )}
            </div>
          </div>

          {/* Camera Info */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-line shadow-2xs">
            <Camera size={16} className="text-forest shrink-0 mt-0.5" />
            <div className="flex flex-col flex-1">
              <span className="text-[11px] text-slate font-medium">Kamera / Perangkat</span>
              <span className="text-ink font-semibold mt-0.5">
                {[exif?.cameraMake, exif?.cameraModel].filter(Boolean).join(" - ") || "Kamera Standar / Tidak tertera"}
              </span>
              {exif?.imageWidth && exif?.imageHeight && (
                <span className="text-[10px] text-slate font-mono mt-0.5">
                  Dimensi: {exif.imageWidth} × {exif.imageHeight} piksel
                </span>
              )}
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-line shadow-2xs">
            <MapPin size={16} className="text-forest shrink-0 mt-0.5" />
            <div className="flex flex-col flex-1">
              <span className="text-[11px] text-slate font-medium">Koordinat Lokasi Geospasial (GPS)</span>
              {exif?.latitude && exif?.longitude ? (
                <div className="flex items-center justify-between mt-1 gap-2">
                  <span className="text-ink font-mono font-semibold">
                    {exif.latitude}, {exif.longitude}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={copyGpsCoordinates}
                      className="px-2 py-1 bg-paper hover:bg-paper-2 rounded border border-line text-slate hover:text-ink flex items-center gap-1 text-[11px]"
                      title="Salin koordinat"
                    >
                      {copiedGps ? <Check size={12} className="text-forest" /> : <Copy size={12} />}
                      {copiedGps ? "Tersalin" : "Salin"}
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${exif.latitude},${exif.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 bg-forest/10 hover:bg-forest/20 text-forest rounded border border-forest/20 flex items-center gap-1 text-[11px] font-medium"
                    >
                      <ExternalLink size={12} />
                      Buka Peta
                    </a>
                  </div>
                </div>
              ) : (
                <span className="text-slate italic mt-0.5">
                  Tidak ada tag GPS pada metadata foto ini
                </span>
              )}
            </div>
          </div>

          {/* Storage & Checksum */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-line shadow-2xs">
            <HardDrive size={16} className="text-forest shrink-0 mt-0.5" />
            <div className="flex flex-col flex-1">
              <span className="text-[11px] text-slate font-medium">Status Penyimpanan & Validasi</span>
              <span className="text-ink font-medium mt-0.5">
                Batas aman sistem: Maks. 5MB per foto (Format: JPEG/PNG)
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-forest text-white hover:bg-forest/90 rounded-lg shadow-2xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}
