import { useRef, useState } from "react";
import { Image, Upload, X, Maximize2, Plus } from "lucide-react";
import { apiClient } from "../../lib/apiClient";

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
}

interface PhotoGalleryAttachmentInputProps {
  activityId?: string | number;
  value: AttachedPhoto[];
  onChange: (photos: AttachedPhoto[]) => void;
  onPendingFilesChange?: (files: File[]) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export function PhotoGalleryAttachmentInput({
  activityId,
  value,
  onChange,
  onPendingFilesChange,
  showToast,
}: PhotoGalleryAttachmentInputProps) {
  const [uploading, setUploading] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [pendingPreviews, setPendingPreviews] = useState<AttachedPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        showToast?.(`File "${file.name}" ditolak. Hanya JPG/PNG diperbolehkan`, "error");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast?.(`File "${file.name}" melebihi batas 5MB`, "error");
        return;
      }
    }

    if (activityId) {
      setUploading(true);
      try {
        const uploadedList: AttachedPhoto[] = [];
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('activity_id', String(activityId));

          const res = await apiClient.post('/daily-activities/upload-photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (res.data?.data) {
            uploadedList.push(res.data.data);
          }
        }
        onChange([...value, ...uploadedList]);
        showToast?.(`${files.length} foto berhasil diunggah`, "success");
      } catch (error: any) {
        console.error(error);
        showToast?.(error?.response?.data?.error || "Gagal mengunggah foto", "error");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } else {
      const localList: AttachedPhoto[] = files.map((file) => ({
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        file,
        previewUrl: URL.createObjectURL(file),
        isPending: true,
      }));
      const updatedPending = [...pendingPreviews, ...localList];
      setPendingPreviews(updatedPending);
      onChange([...value, ...updatedPending]);
      onPendingFilesChange?.(updatedPending.map(p => p.file!).filter(Boolean));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = async (photo: AttachedPhoto, index: number) => {
    if (photo.isPending) {
      const updated = pendingPreviews.filter((_, i) => i !== index);
      setPendingPreviews(updated);
      onChange(value.filter((p) => p !== photo));
      onPendingFilesChange?.(updated.map(p => p.file!).filter(Boolean));
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
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
          <Image size={15} className="text-forest" />
          Galeri Dokumentasi Foto ({allPhotos.length})
        </span>
        <span className="text-[11px] text-slate font-mono">JPG / PNG · maks 5MB</span>
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
                className="group relative flex flex-col bg-white rounded-xl border border-line shadow-2xs overflow-hidden"
              >
                <div className="relative aspect-4/3 bg-paper-2 flex items-center justify-center overflow-hidden">
                  <img src={src} alt={`Dokumentasi ${index + 1}`} className="w-full h-full object-cover" />
                  {photo.isPending && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-ochre text-white text-[10px] font-medium font-mono">
                      Draft
                    </span>
                  )}
                  <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewModalUrl(src || null)}
                      className="p-1.5 bg-white text-ink rounded-full shadow-sm hover:bg-paper"
                      title="Lihat ukuran penuh"
                    >
                      <Maximize2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removePhoto(photo, index)}
                      className="p-1.5 bg-clay text-white rounded-full shadow-sm hover:opacity-90"
                      title="Hapus foto"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                <div className="p-2 text-[11px] text-slate truncate font-mono" title={photo.original_name}>
                  {photo.original_name || `Foto ${index + 1}`}
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center gap-1.5 aspect-4/3 rounded-xl border-2 border-dashed border-line hover:border-forest bg-white/70 text-slate hover:text-forest transition-colors"
          >
            <Plus size={16} />
            <span className="text-[11px] font-semibold font-mono">
              {uploading ? "Menyimpan..." : "+ Tambah"}
            </span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="border-2 border-dashed border-line hover:border-forest bg-white/80 p-5 rounded-xl flex flex-col items-center justify-center gap-2 text-slate hover:text-forest transition-colors"
        >
          <Upload size={20} className="text-forest" />
          <span className="text-[13px] font-medium text-ink">
            {uploading ? "Menyimpan foto..." : "Upload Foto Kegiatan Lapangan"}
          </span>
        </button>
      )}

      {previewModalUrl && (
        <div
          className="fixed inset-0 z-[100] bg-ink/80 backdrop-blur-xs flex items-center justify-center p-6"
          onClick={() => setPreviewModalUrl(null)}
        >
          <img src={previewModalUrl} alt="Preview foto" className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}
