import { useState, useEffect } from "react";
import { apiClient } from '../../lib/apiClient';
import { Edit2, Trash2, Check, X, Plus, Folder, ChevronRight, Layers } from "lucide-react";
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';

const inputCls = "w-full text-[13px] rounded-lg border border-line bg-paper/50 px-3 py-2 text-ink outline-none focus:border-forest focus:bg-white transition-all";

interface SubCategoryItem {
  id: string;
  category_id: string;
  name: string;
}

interface CategoryItem {
  id: string;
  name: string;
  sub_categories: SubCategoryItem[];
}

export function CategoryManagementModal({
  onClose,
  showToast = () => {},
  onUpdated = () => {}
}: {
  onClose: () => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  onUpdated?: () => void;
}) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category Add / Edit State
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [catToDelete, setCatToDelete] = useState<CategoryItem | null>(null);

  // SubCategory Add / Edit State
  const [newSubName, setNewSubName] = useState("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");
  const [subToDelete, setSubToDelete] = useState<SubCategoryItem | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/categories');
      const data: CategoryItem[] = res.data.data;
      setCategories(data);
      if (data.length > 0) {
        // Keep previous selection if still exists, otherwise select first
        setSelectedCategoryId(prev => {
          if (prev && data.some(c => c.id === prev)) return prev;
          return data[0].id;
        });
      } else {
        setSelectedCategoryId(null);
      }
    } catch (e) {
      console.error(e);
      showToast("Gagal memuat daftar kategori", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || null;

  // --- Category Actions ---
  const handleAddCategory = async () => {
    if (!newCatName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.post('/categories', { name: newCatName.trim() });
      setNewCatName("");
      showToast(`Kategori '${newCatName.trim()}' berhasil ditambahkan`, "success");
      await loadCategories();
      onUpdated();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menambahkan kategori", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editCatName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.put(`/categories/${id}`, { name: editCatName.trim() });
      setEditingCatId(null);
      showToast(`Kategori '${editCatName.trim()}' berhasil diperbarui`, "success");
      await loadCategories();
      onUpdated();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal memperbarui kategori", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/categories/${id}`);
      showToast("Kategori berhasil dihapus", "success");
      setCatToDelete(null);
      await loadCategories();
      onUpdated();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menghapus kategori", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Sub-Category Actions ---
  const handleAddSubCategory = async () => {
    if (!newSubName.trim() || !selectedCategoryId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.post('/categories/sub-categories', {
        category_id: selectedCategoryId,
        name: newSubName.trim()
      });
      setNewSubName("");
      showToast(`Sub-kategori '${newSubName.trim()}' berhasil ditambahkan`, "success");
      await loadCategories();
      onUpdated();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menambahkan sub-kategori", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubCategory = async (id: string) => {
    if (!editSubName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.put(`/categories/sub-categories/${id}`, { name: editSubName.trim() });
      setEditingSubId(null);
      showToast(`Sub-kategori '${editSubName.trim()}' berhasil diperbarui`, "success");
      await loadCategories();
      onUpdated();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal memperbarui sub-kategori", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubCategory = async (id: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/categories/sub-categories/${id}`);
      showToast("Sub-kategori berhasil dihapus", "success");
      setSubToDelete(null);
      await loadCategories();
      onUpdated();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menghapus sub-kategori", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-line shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col text-ink" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest/10 flex items-center justify-center text-forest">
              <Layers size={17} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Kelola Kategori &amp; Sub Kategori</h2>
              <p className="text-[11px] text-slate font-mono mt-0.5">Kustomisasi master data kategori kegiatan CSR</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-paper-2 text-slate hover:text-ink transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Content Body: 2 Columns */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-line">
          {/* Left Column: Categories List */}
          <div className="p-5 flex flex-col overflow-hidden h-full">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                <Folder size={14} className="text-forest" />
                Daftar Kategori Utama
              </h3>
              <span className="text-[11px] text-slate font-mono">{categories.length} Kategori</span>
            </div>

            {/* Add Category Form */}
            <div className="flex gap-2 mb-4 shrink-0">
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                placeholder="Nama kategori baru..."
                className={inputCls}
              />
              <button
                onClick={handleAddCategory}
                disabled={!newCatName.trim() || isSubmitting}
                className="px-3.5 py-2 text-xs font-medium text-white bg-forest hover:bg-forest-2 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <Plus size={13} />
                Tambah
              </button>
            </div>

            {/* Category Items List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {loading ? (
                <p className="text-xs text-slate font-mono text-center py-6">Memuat kategori...</p>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate">Belum ada kategori. Silakan tambahkan di atas.</div>
              ) : (
                categories.map(c => {
                  const isSelected = selectedCategoryId === c.id;
                  const isEditing = editingCatId === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => !isEditing && setSelectedCategoryId(c.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-forest/10 border-forest/30 shadow-2xs text-forest"
                          : "bg-paper/40 border-line/60 hover:bg-paper hover:border-line text-ink"
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-2" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editCatName}
                            onChange={e => setEditCatName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleUpdateCategory(c.id);
                              if (e.key === 'Escape') setEditingCatId(null);
                            }}
                            autoFocus
                            className={`${inputCls} py-1 text-xs`}
                          />
                          <button
                            onClick={() => handleUpdateCategory(c.id)}
                            className="p-1.5 text-forest hover:bg-forest/10 rounded-md transition-colors"
                            title="Simpan"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingCatId(null)}
                            className="p-1.5 text-slate hover:bg-paper-2 rounded-md transition-colors"
                            title="Batal"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          <span className={`text-[13px] font-medium truncate ${isSelected ? "text-forest" : "text-ink"}`}>
                            {c.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-paper-2 border border-line text-slate shrink-0">
                            {c.sub_categories?.length || 0} sub
                          </span>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setEditingCatId(c.id);
                              setEditCatName(c.name);
                            }}
                            className="p-1.5 text-slate hover:text-ochre hover:bg-ochre/10 rounded-md transition-colors opacity-70 group-hover:opacity-100"
                            title="Ubah Nama Kategori"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setCatToDelete(c);
                            }}
                            className="p-1.5 text-slate hover:text-clay hover:bg-clay/10 rounded-md transition-colors opacity-70 group-hover:opacity-100"
                            title="Hapus Kategori"
                          >
                            <Trash2 size={13} />
                          </button>
                          <ChevronRight size={14} className={`transition-transform ${isSelected ? "text-forest translate-x-0.5" : "text-slate-2"}`} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Sub-Categories of Selected Category */}
          <div className="p-5 flex flex-col overflow-hidden h-full bg-paper/20">
            {selectedCategory ? (
              <>
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div>
                    <h3 className="text-[13px] font-semibold text-ink">
                      Sub-Kategori untuk <span className="text-forest underline decoration-forest/30">{selectedCategory.name}</span>
                    </h3>
                    <p className="text-[11px] text-slate font-mono mt-0.5">
                      {selectedCategory.sub_categories?.length || 0} sub-kategori terdaftar
                    </p>
                  </div>
                </div>

                {/* Add SubCategory Form */}
                <div className="flex gap-2 mb-4 shrink-0">
                  <input
                    type="text"
                    value={newSubName}
                    onChange={e => setNewSubName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSubCategory(); }}
                    placeholder={`Tambah sub-kategori untuk ${selectedCategory.name}...`}
                    className={inputCls}
                  />
                  <button
                    onClick={handleAddSubCategory}
                    disabled={!newSubName.trim() || isSubmitting}
                    className="px-3.5 py-2 text-xs font-medium text-white bg-forest hover:bg-forest-2 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    <Plus size={13} />
                    Tambah
                  </button>
                </div>

                {/* SubCategory Items List */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {!selectedCategory.sub_categories || selectedCategory.sub_categories.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate border border-dashed border-line rounded-xl bg-paper/30">
                      Belum ada sub-kategori untuk <span className="font-semibold">{selectedCategory.name}</span>.<br />
                      Tambahkan melalui kolom di atas.
                    </div>
                  ) : (
                    selectedCategory.sub_categories.map(s => {
                      const isEditing = editingSubId === s.id;

                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-line/60 bg-white hover:border-line transition-all shadow-2xs"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 flex-1 mr-2">
                              <input
                                type="text"
                                value={editSubName}
                                onChange={e => setEditSubName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleUpdateSubCategory(s.id);
                                  if (e.key === 'Escape') setEditingSubId(null);
                                }}
                                autoFocus
                                className={`${inputCls} py-1 text-xs`}
                              />
                              <button
                                onClick={() => handleUpdateSubCategory(s.id)}
                                className="p-1.5 text-forest hover:bg-forest/10 rounded-md transition-colors"
                                title="Simpan"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingSubId(null)}
                                className="p-1.5 text-slate hover:bg-paper-2 rounded-md transition-colors"
                                title="Batal"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[13px] text-ink font-medium truncate flex-1 pr-2">
                              {s.name}
                            </span>
                          )}

                          {!isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingSubId(s.id);
                                  setEditSubName(s.name);
                                }}
                                className="p-1.5 text-slate hover:text-ochre hover:bg-ochre/10 rounded-md transition-colors"
                                title="Ubah Nama Sub-Kategori"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => setSubToDelete(s)}
                                className="p-1.5 text-slate hover:text-clay hover:bg-clay/10 rounded-md transition-colors"
                                title="Hapus Sub-Kategori"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate">
                <Folder size={32} className="text-slate-2 mb-2" />
                <p className="text-xs">Pilih salah satu kategori di sebelah kiri untuk mengelola sub-kategorinya.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-line bg-paper/30 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate font-mono">
            * Kategori / Sub-kategori yang sedang aktif dipakai kegiatan tidak dapat dihapus.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-ink bg-white border border-line hover:bg-paper-2 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Delete Category Confirmation */}
      {catToDelete && (
        <DeleteConfirmModal
          label={`Kategori '${catToDelete.name}' ${catToDelete.sub_categories?.length ? `beserta ${catToDelete.sub_categories.length} sub-kategorinya` : ''}`}
          onCancel={() => setCatToDelete(null)}
          onConfirm={() => handleDeleteCategory(catToDelete.id)}
        />
      )}

      {/* Delete Sub-Category Confirmation */}
      {subToDelete && (
        <DeleteConfirmModal
          label={`Sub-Kategori '${subToDelete.name}'`}
          onCancel={() => setSubToDelete(null)}
          onConfirm={() => handleDeleteSubCategory(subToDelete.id)}
        />
      )}
    </div>
  );
}
