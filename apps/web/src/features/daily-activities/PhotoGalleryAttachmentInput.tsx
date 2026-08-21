import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import { Image, Maximize2, Plus, Upload, X } from "lucide-react";

export type ActivityPhoto = {
  id?: string | number;
  url: string;
  original_name?: string;
  mime_type?: string;
  isPending?: boolean;
  previewUrl?: string;
};

export function PhotoGalleryAttachmentInput({
  value,
  onChange,
  activityId,
  onPendingFilesChange,
  showToast,
}: {
  value: ActivityPhoto[];
  onChange: (photos: ActivityPhoto[]) => void;
  activityId?: string | number;
  onPendingFilesChange?: (files: File[]) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingPreviews = useMemo<ActivityPhoto[]>(() => pendingFiles.map((file) => ({
    url: URL.createObjectURL(file),
    original_name: file.name,
    mime_type: file.type,
    isPending: true,
  })), [pendingFiles]);

  useEffect(() => () => {
    pendingPreviews.forEach((photo) => {
      URL.revokeObjectURL(photo.url);
    });
  }, [pendingPreviews]);

  const validateFile = (file: File): string | null => {
    if (!/^image\/(jpeg|png)$/.test(file.type) || !/\.(jpe?g|png)$/i.test(file.name)) return "Hanya foto JPG/JPEG atau PNG yang diperbolehkan";
    if (file.size > 5 * 1024 * 1024) return "Ukuran foto maksimal 5MB";
    return null;
  };

  const handleFilesSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const invalid = files.map(validateFile).find(Boolean);
    if (invalid) { showToast?.(invalid, "error"); return; }

    if (!activityId) {
      const next = [...pendingFiles, ...files];
      setPendingFiles(next);
      onPendingFilesChange?.(next);
      showToast?.(`${files.length} foto akan disimpan setelah kegiatan dibuat`, "info");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    let success = 0;
    let nextPhotos = [...value];
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("activity_id", String(activityId));
        const response = await apiClient.post("/daily-activities/upload-photo", formData, { headers: { "Content-Type": "multipart/form-data" } });
        const photo = response.data?.data;
        if (photo?.id && photo?.url) { nextPhotos = [...nextPhotos, photo]; onChange(nextPhotos); success += 1; }
      } catch (error: any) {
        showToast?.(error?.response?.data?.error || `Foto ${file.name} gagal diunggah`, "error");
      }
    }
    setUploading(false);
    if (success > 0) showToast?.(`${success} foto berhasil disimpan`, "success");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = async (photo: ActivityPhoto, index: number) => {
    if (photo.isPending) {
      const pendingIndex = Math.max(0, index - value.length);
      const next = pendingFiles.filter((_, fileIndex) => fileIndex !== pendingIndex);
      setPendingFiles(next);
      onPendingFilesChange?.(next);
      return;
    }
    if (activityId && photo.id) {
      try {
        await apiClient.delete(`/daily-activities/${activityId}/photos/${photo.id}`);
        onChange(value.filter((item) => item.id !== photo.id));
        showToast?.("Foto dihapus dari kegiatan", "info");
      } catch (error: any) {
        showToast?.(error?.response?.data?.error || "Foto gagal dihapus", "error");
      }
    }
  };

  const allPhotos = [...value, ...pendingPreviews];

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-50/80 p-3.5 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Image size={15} className="text-blue-600" />Galeri Dokumentasi Foto ({allPhotos.length})</span>
        <span className="text-[11px] text-slate-500">JPG/PNG · maksimal 5MB per foto</span>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFilesSelect} accept="image/jpeg,image/png" multiple className="hidden" />
      {allPhotos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {allPhotos.map((photo, index) => {
            const src = photo.previewUrl || photo.url;
            return (
              <div key={`${photo.id || photo.url}-${index}`} className="group relative flex flex-col bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                <div className="relative aspect-4/3 bg-slate-100 flex items-center justify-center overflow-hidden">
                  <img src={src} alt={`Dokumentasi ${index + 1}`} className="w-full h-full object-cover" />
                  {photo.isPending && <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-amber-500/90 text-white text-[10px]">Menunggu disimpan</span>}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button type="button" onClick={() => setPreviewModalUrl(src)} className="p-1.5 bg-white/90 text-slate-700 rounded-full" title="Lihat ukuran penuh"><Maximize2 size={13} /></button>
                    <button type="button" onClick={() => void removePhoto(photo, index)} className="p-1.5 bg-rose-500 text-white rounded-full" title="Hapus foto"><X size={13} /></button>
                  </div>
                </div>
                <div className="p-1.5 text-[11px] text-slate-600 truncate" title={photo.original_name}>{photo.original_name || `Foto ${index + 1}`}</div>
              </div>
            );
          })}
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex flex-col items-center justify-center gap-1.5 aspect-4/3 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white/60 text-slate-500 hover:text-blue-600">
            <Plus size={16} /><span className="text-[11px] font-semibold">{uploading ? "Menyimpan..." : "+ Tambah Foto"}</span>
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white/80 p-5 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-700">
          <Upload size={20} className="text-blue-600" /><span className="text-xs font-semibold">{uploading ? "Menyimpan..." : "Tambah Foto Kegiatan"}</span>
        </button>
      )}
      {previewModalUrl && <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6" onClick={() => setPreviewModalUrl(null)}><img src={previewModalUrl} alt="Preview foto" className="max-h-full max-w-full object-contain" /></div>}
    </div>
  );
}
