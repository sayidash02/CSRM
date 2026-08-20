import React, { useMemo, useRef, useState } from "react";
import { apiClient } from "../../lib/apiClient";
import { ExternalLink, Image, Maximize2, Plus, Upload, X } from "lucide-react";
import { parseSharePointLinks, serializeSharePointLinks } from "../../components/ui/sharePointLinks";

export function PhotoGalleryAttachmentInput({
  value,
  onChange,
  activityDate,
  picName,
  showToast
}: {
  value: string | null;
  onChange: (url: string) => void;
  activityDate?: string;
  picName?: string;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [manualLink, setManualLink] = useState('');
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const links = useMemo(() => parseSharePointLinks(value), [value]);

  const getResolvedImgSrc = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    if (url.trim().toLowerCase().startsWith('file:')) return '';
    const clean = url.replace(/\\/g, '/');
    if (clean.startsWith('/uploads/')) {
      return `http://localhost:3000${clean}`;
    }
    return `http://localhost:3000/uploads/${clean.replace(/^\/+/, '')}`;
  };

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalidSize = files.find((f) => f.size > 5 * 1024 * 1024);
    if (invalidSize) {
      showToast?.(`File "${invalidSize.name}" melebihi batas 5MB`, "error");
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];
    let errorCount = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('activity_date', activityDate || new Date().toISOString());
        formData.append('pic_name', picName || 'User');

        const res = await apiClient.post('/daily-activities/upload-photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const url = res.data?.data?.url || res.data?.url || '';
        if (url) uploadedUrls.push(url);
      } catch (err: any) {
        console.error("Upload error for file:", file.name, err);
        errorCount++;
      }
    }

    setUploading(false);
    if (uploadedUrls.length > 0) {
      const nextLinks = [...links, ...uploadedUrls];
      onChange(serializeSharePointLinks(nextLinks));
      showToast?.(`${uploadedUrls.length} foto berhasil ditambahkan ke galeri!`, "success");
    }
    if (errorCount > 0) {
      showToast?.(`${errorCount} file gagal diunggah ke server`, "error");
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const nextLinks = links.filter((_, idx) => idx !== index);
    onChange(serializeSharePointLinks(nextLinks));
    showToast?.("Foto dihapus dari galeri", "info");
  };

  const handleAddManualLink = () => {
    const trimmed = manualLink.trim();
    if (!trimmed) return;
    if (links.includes(trimmed)) {
      showToast?.("Link tersebut sudah ada di galeri", "info");
      return;
    }
    const nextLinks = [...links, trimmed];
    onChange(serializeSharePointLinks(nextLinks));
    setManualLink('');
    showToast?.("Link dokumentasi berhasil ditambahkan", "success");
  };

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-50/80 p-3.5 rounded-lg border border-border">
      {/* Header Tabs */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Image size={15} className="text-blue-600" />
          <span>Galeri Dokumentasi Foto ({links.length} Foto Terlampir)</span>
        </span>
        <div className="flex rounded-md bg-slate-200/70 p-0.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'upload' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Upload Langsung (dev/test)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'link' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Link SharePoint
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilesSelect}
        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
        multiple
        className="hidden"
      />

      {activeTab === 'upload' ? (
        <div className="flex flex-col gap-3">
          {links.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {/* Photo Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {links.map((link, idx) => {
                  const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(link) || link.startsWith('/uploads/');
                  const imgSrc = getResolvedImgSrc(link);

                  return (
                    <div
                      key={`${link}-${idx}`}
                      className="group relative flex flex-col bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden hover:border-blue-400 transition-all"
                    >
                      <div className="relative aspect-4/3 bg-slate-100 flex items-center justify-center overflow-hidden">
                        {isImg ? (
                          <img
                            src={imgSrc}
                            alt={`Dokumentasi ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-slate-400">
                            <ExternalLink size={24} />
                            <span className="text-[10px] mt-1">Dokumen PDF</span>
                          </div>
                        )}

                        {/* Top Action Badges */}
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold backdrop-blur-xs">
                          Foto {idx + 1}
                        </div>

                        {/* Hover Overlay Buttons */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewModalUrl(imgSrc)}
                            className="p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-full shadow-md transition-transform hover:scale-110"
                            title="Lihat ukuran penuh"
                          >
                            <Maximize2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition-transform hover:scale-110"
                            title="Hapus foto ini"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>

                      {/* File Card Footer */}
                      <div className="p-1.5 flex items-center justify-between text-[11px] text-slate-600 bg-slate-50/70 border-t border-slate-100">
                        <span className="truncate max-w-[110px]" title={link}>
                          {link.split('/').pop() || `Foto ${idx + 1}`}
                        </span>
                        {link.startsWith('http') && (
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="Buka link luar"
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add More Photos Button in Grid */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex flex-col items-center justify-center gap-1.5 aspect-4/3 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white/60 hover:bg-blue-50/50 text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
                >
                  <div className="p-1.5 bg-blue-50 rounded-full text-blue-600">
                    <Plus size={16} />
                  </div>
                  <span className="text-[11px] font-semibold">
                    {uploading ? "Mengunggah..." : "+ Tambah Foto"}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white/80 hover:bg-blue-50/40 p-5 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
            >
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform shadow-2xs">
                <Upload size={20} />
              </div>
              <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-700">
                {uploading ? "Sedang Mengunggah Foto..." : "Klik untuk Pilih & Unggah Foto Galeri"}
              </span>
              <span className="text-[11px] text-slate-400 text-center">
                Dapat memilih 1 atau banyak foto sekaligus (JPG, PNG, WEBP, maks 5MB per file)
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* List of existing manual links */}
          {links.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {links.map((l, idx) => (
                <div
                  key={`${l}-${idx}`}
                  className="flex items-center justify-between bg-white px-3 py-1.5 rounded-md border border-slate-200 text-xs shadow-2xs"
                >
                  <span className="truncate max-w-[320px] text-blue-600 font-mono text-[11px]" title={l}>
                    {idx + 1}. {l}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors"
                    title="Hapus tautan ini"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="url"
              value={manualLink}
              onChange={(e) => setManualLink(e.target.value)}
              placeholder="https://jawasatupower.sharepoint.com/..."
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddManualLink}
              disabled={!manualLink.trim()}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors shadow-2xs"
            >
              + Tambah Link
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Tempel URL SharePoint atau link penyimpanan cloud resmi JSP.
          </p>
        </div>
      )}

      {/* Lightbox Zoom Preview Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[85vh] bg-slate-900 rounded-lg overflow-hidden p-2 border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-3 right-3 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors z-10"
              title="Tutup preview"
            >
              <X size={18} />
            </button>
            <img
              src={previewModalUrl}
              alt="Preview Zoom"
              className="max-h-[80vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
