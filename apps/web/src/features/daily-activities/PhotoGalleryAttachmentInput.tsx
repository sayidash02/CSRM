import React, { useRef, useState } from "react";
import {
  Image,
  Upload,
  X,
  Maximize2,
  Plus,
  Stamp,
  Info,
  MapPin,
  Calendar,
  Check,
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { extractExifFromBlob, type PhotoExifMetadata } from "../../lib/exifUtils";
import {
  applyWatermarkToImage,
  type WatermarkOptions,
} from "../../lib/watermarkUtils";
import { PhotoWatermarkModal } from "./PhotoWatermarkModal";
import { PhotoMetadataModal } from "./PhotoMetadataModal";

export interface AttachedPhoto {
  id?: string | number;
  url?: string;
  original_name?: string;
  mime_type?: string;
  size_bytes?: number;
  sort_order?: number;
  previewUrl?: string;
  file?: File;
  isPending?: boolean;
  exif?: PhotoExifMetadata;
  isWatermarked?: boolean;
}

interface PhotoGalleryAttachmentInputProps {
  activityId?: string | number;
  activityDate?: string;
  location?: string;
  activityTitle?: string;
  picName?: string;
  onDateExtracted?: (dateIso: string) => void;
  value: AttachedPhoto[];
  onChange: (photos: AttachedPhoto[]) => void;
  onPendingFilesChange?: (files: File[]) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export function PhotoGalleryAttachmentInput({
  activityId,
  activityDate,
  location,
  activityTitle,
  picName,
  onDateExtracted,
  value,
  onChange,
  onPendingFilesChange,
  showToast,
}: PhotoGalleryAttachmentInputProps) {
  const [uploading, setUploading] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [pendingPreviews, setPendingPreviews] = useState<AttachedPhoto[]>([]);
  const [autoWatermark, setAutoWatermark] = useState(true);

  // Modals state
  const [watermarkingPhoto, setWatermarkingPhoto] = useState<{
    photo: AttachedPhoto;
    index: number;
  } | null>(null);
  const [inspectingPhoto, setInspectingPhoto] = useState<AttachedPhoto | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultWatermarkOptions: WatermarkOptions = {
    organizationName: "CSR & COMMUNITY RELATIONS | ARSIP AUDIT",
    dateText: activityDate || "",
    locationText: location || "",
    activityTitle: activityTitle || "",
    position: "bottom-left",
    badgeTheme: "slate",
  };

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (!rawFiles.length) return;

    for (const file of rawFiles) {
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        showToast?.(`File "${file.name}" ditolak. Hanya JPG/PNG diperbolehkan`, "error");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast?.(`File "${file.name}" melebihi batas 5MB`, "error");
        return;
      }
    }

    setUploading(true);
    try {
      const processedItems: AttachedPhoto[] = [];

      for (const originalFile of rawFiles) {
        // 1. Extract EXIF metadata
        const exifMeta = await extractExifFromBlob(originalFile);

        // Auto-fill form date if available and form date is not yet set
        if (exifMeta.dateTakenIso && onDateExtracted && !activityDate) {
          onDateExtracted(exifMeta.dateTakenIso);
          showToast?.(
            `Tanggal kegiatan diisi otomatis (${exifMeta.dateTakenIso}) dari metadata EXIF foto`,
            "info"
          );
        }

        let fileToAttach = originalFile;
        let isWatermarked = false;

        // 2. Auto-apply watermark if enabled
        if (autoWatermark) {
          try {
            const wmOpts: WatermarkOptions = {
              ...defaultWatermarkOptions,
              dateText: activityDate || exifMeta.dateTakenIso || "",
              locationText: location || "",
              activityTitle: activityTitle || "",
            };
            const wmResult = await applyWatermarkToImage(originalFile, wmOpts, originalFile.name);
            fileToAttach = wmResult.file;
            isWatermarked = true;
          } catch (wmErr) {
            console.warn("Auto-watermark skipped for file:", originalFile.name, wmErr);
          }
        }

        if (activityId) {
          // Direct upload for existing activity
          const formData = new FormData();
          formData.append("file", fileToAttach);
          formData.append("activity_id", String(activityId));

          const res = await apiClient.post("/daily-activities/upload-photo", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (res.data?.data) {
            processedItems.push({
              ...res.data.data,
              exif: exifMeta,
              isWatermarked,
            });
          }
        } else {
          // Draft preview for new activity
          processedItems.push({
            original_name: fileToAttach.name,
            mime_type: fileToAttach.type,
            size_bytes: fileToAttach.size,
            file: fileToAttach,
            previewUrl: URL.createObjectURL(fileToAttach),
            isPending: true,
            exif: exifMeta,
            isWatermarked,
          });
        }
      }

      if (activityId) {
        onChange([...value, ...processedItems]);
        showToast?.(
          `${processedItems.length} foto berhasil diunggah ${
            autoWatermark ? "dengan cap air audit" : ""
          }`,
          "success"
        );
      } else {
        const updatedPending = [...pendingPreviews, ...processedItems];
        setPendingPreviews(updatedPending);
        onChange([...value, ...updatedPending]);
        onPendingFilesChange?.(updatedPending.map((p) => p.file!).filter(Boolean));
        if (autoWatermark) {
          showToast?.(
            `${processedItems.length} foto siap disimpan dengan cap air audit`,
            "info"
          );
        }
      }
    } catch (error: any) {
      console.error(error);
      showToast?.(error?.response?.data?.error || "Gagal memproses foto kegiatan", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApplyWatermark = async (
    index: number,
    watermarkedFile: File,
    newPreviewUrl: string
  ) => {
    const all = [...value, ...pendingPreviews];
    const target = all[index];
    if (!target) return;

    if (target.isPending) {
      const updated = pendingPreviews.map((p, i) => {
        if (i === index) {
          if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
          return {
            ...p,
            file: watermarkedFile,
            previewUrl: newPreviewUrl,
            original_name: watermarkedFile.name,
            size_bytes: watermarkedFile.size,
            isWatermarked: true,
          };
        }
        return p;
      });
      setPendingPreviews(updated);
      onChange([...value, ...updated]);
      onPendingFilesChange?.(updated.map((p) => p.file!).filter(Boolean));
      showToast?.("Watermark foto draft berhasil diperbarui", "success");
    } else if (target.id && activityId) {
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", watermarkedFile);

        const res = await apiClient.put(
          `/daily-activities/${activityId}/photos/${target.id}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        if (res.data?.data) {
          const timestamp = Date.now();
          const updatedValue = value.map((p) => {
            if (p.id === target.id) {
              return {
                ...p,
                ...res.data.data,
                url: `/api/daily-activities/${activityId}/photos/${target.id}?t=${timestamp}`,
                previewUrl: newPreviewUrl,
                isWatermarked: true,
              };
            }
            return p;
          });
          onChange(updatedValue);
          showToast?.("Watermark foto tersimpan berhasil diperbarui", "success");
        }
      } catch (err: any) {
        console.error("Gagal memperbarui watermark foto tersimpan:", err);
        showToast?.(err?.response?.data?.error || "Gagal memperbarui watermark foto tersimpan", "error");
      } finally {
        setUploading(false);
      }
    }
  };

  const removePhoto = async (photo: AttachedPhoto, index: number) => {
    if (photo.isPending) {
      const updated = pendingPreviews.filter((_, i) => i !== index);
      setPendingPreviews(updated);
      onChange(value.filter((p) => p !== photo));
      onPendingFilesChange?.(updated.map((p) => p.file!).filter(Boolean));
      if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    } else if (photo.id && activityId) {
      try {
        await apiClient.delete(`/daily-activities/${activityId}/photos/${photo.id}`);
        onChange(value.filter((p) => p.id !== photo.id));
        showToast?.("Foto dokumentasi berhasil dihapus", "success");
      } catch (error: any) {
        console.error(error);
        showToast?.(error?.response?.data?.error || "Foto gagal dihapus", "error");
      }
    }
  };

  const allPhotos = [...value, ...pendingPreviews];

  return (
    <div className="flex flex-col gap-3 w-full bg-paper/50 p-4 rounded-xl border border-line">
      {/* Header controls & Auto-Watermark toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
            <Image size={15} className="text-forest" />
            Galeri Dokumentasi Foto ({allPhotos.length})
          </span>
          <span className="text-[11px] text-slate font-mono hidden sm:inline">
            · JPG / PNG maks 5MB
          </span>
        </div>

        {/* Auto Watermark Switch */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-line shadow-2xs hover:border-forest/40 transition-colors">
            <input
              type="checkbox"
              checked={autoWatermark}
              onChange={(e) => setAutoWatermark(e.target.checked)}
              className="rounded text-forest focus:ring-forest/20 w-3.5 h-3.5"
            />
            <Stamp size={13} className={autoWatermark ? "text-forest" : "text-slate"} />
            <span className="text-[11px] font-medium text-ink">
              Auto Watermark Audit
            </span>
          </label>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilesSelect}
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
      />

      {allPhotos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {allPhotos.map((photo, index) => {
            const src = photo.previewUrl || photo.url;
            return (
              <div
                key={`${photo.id || photo.url}-${index}`}
                className="group relative flex flex-col bg-white rounded-xl border border-line shadow-2xs overflow-hidden transition-all hover:border-forest/50"
              >
                <div className="relative aspect-4/3 bg-paper-2 flex items-center justify-center overflow-hidden">
                  <img
                    src={src}
                    alt={`Dokumentasi ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Badges Overlay */}
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 items-start pointer-events-none">
                    {photo.isPending && (
                      <span className="px-1.5 py-0.5 rounded-md bg-ochre text-white text-[10px] font-medium font-mono shadow-xs">
                        Draft
                      </span>
                    )}
                    {photo.isWatermarked && (
                      <span className="px-1.5 py-0.5 rounded-md bg-forest text-white text-[10px] font-medium font-mono flex items-center gap-0.5 shadow-xs">
                        <Stamp size={10} /> Watermarked
                      </span>
                    )}
                    {photo.exif?.dateTakenIso && (
                      <span className="px-1.5 py-0.5 rounded-md bg-ink/75 text-white text-[9px] font-mono flex items-center gap-0.5 backdrop-blur-xs">
                        <Calendar size={9} /> {photo.exif.dateTakenIso}
                      </span>
                    )}
                    {photo.exif?.latitude && (
                      <span className="px-1.5 py-0.5 rounded-md bg-ink/75 text-white text-[9px] font-mono flex items-center gap-0.5 backdrop-blur-xs">
                        <MapPin size={9} /> GPS
                      </span>
                    )}
                  </div>

                  {/* Hover Actions Bar */}
                  <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 backdrop-blur-2xs">
                    <button
                      type="button"
                      onClick={() => setInspectingPhoto(photo)}
                      className="p-1.5 bg-white text-ink rounded-full shadow-sm hover:bg-paper hover:scale-105 transition-all"
                      title="Lihat Metadata EXIF & Detail"
                    >
                      <Info size={13} className="text-forest" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setWatermarkingPhoto({ photo, index })}
                      className="p-1.5 bg-white text-ink rounded-full shadow-sm hover:bg-paper hover:scale-105 transition-all cursor-pointer"
                      title="Edit / Bubuhi Watermark Audit"
                    >
                      <Stamp size={13} className="text-forest" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewModalUrl(src || null)}
                      className="p-1.5 bg-white text-ink rounded-full shadow-sm hover:bg-paper hover:scale-105 transition-all"
                      title="Lihat ukuran penuh"
                    >
                      <Maximize2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removePhoto(photo, index)}
                      className="p-1.5 bg-clay text-white rounded-full shadow-sm hover:opacity-90 hover:scale-105 transition-all"
                      title="Hapus foto"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Footer caption */}
                <div
                  className="p-2 text-[11px] text-slate truncate font-mono flex items-center justify-between gap-1"
                  title={photo.original_name}
                >
                  <span className="truncate">{photo.original_name || `Foto ${index + 1}`}</span>
                  {photo.exif?.cameraModel && (
                    <span className="text-[9px] text-slate/70 shrink-0 font-sans" title={photo.exif.cameraModel}>
                      📷
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center gap-1.5 aspect-4/3 rounded-xl border-2 border-dashed border-line hover:border-forest bg-white/70 text-slate hover:text-forest transition-colors shadow-2xs"
          >
            <Plus size={18} />
            <span className="text-[11px] font-semibold font-mono">
              {uploading ? "Memproses..." : "+ Tambah Foto"}
            </span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="border-2 border-dashed border-line hover:border-forest bg-white/80 p-6 rounded-xl flex flex-col items-center justify-center gap-2 text-slate hover:text-forest transition-colors group cursor-pointer"
        >
          <div className="p-3 bg-paper rounded-full text-forest group-hover:scale-110 transition-transform">
            <Upload size={22} />
          </div>
          <span className="text-[13px] font-semibold text-ink">
            {uploading ? "Mengekstrak EXIF & Memproses..." : "Upload Foto Kegiatan Lapangan"}
          </span>
          <span className="text-[11px] text-slate">
            {autoWatermark
              ? "⚡ Otomatis membaca metadata EXIF dan membubuhkan cap air audit"
              : "Klik untuk memilih foto format JPG/PNG (Maks 5MB)"}
          </span>
        </button>
      )}

      {/* Full-size preview modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-[100] bg-ink/80 backdrop-blur-xs flex items-center justify-center p-6"
          onClick={() => setPreviewModalUrl(null)}
        >
          <img
            src={previewModalUrl}
            alt="Preview foto"
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

      {/* Watermark Editor Modal */}
      {watermarkingPhoto && (
        <PhotoWatermarkModal
          photo={watermarkingPhoto.photo}
          defaultOptions={{
            ...defaultWatermarkOptions,
            dateText: activityDate || watermarkingPhoto.photo.exif?.dateTakenIso || "",
            locationText: location || "",
            activityTitle: activityTitle || "",
            picName: picName || "",
          }}
          onClose={() => setWatermarkingPhoto(null)}
          onApply={(file, previewUrl) =>
            handleApplyWatermark(watermarkingPhoto.index, file, previewUrl)
          }
          showToast={showToast}
        />
      )}

      {/* EXIF Metadata Details Modal */}
      {inspectingPhoto && (
        <PhotoMetadataModal
          photo={inspectingPhoto}
          exif={inspectingPhoto.exif}
          onClose={() => setInspectingPhoto(null)}
        />
      )}
    </div>
  );
}
