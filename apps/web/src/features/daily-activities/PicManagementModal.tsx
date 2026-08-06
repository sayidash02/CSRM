import React, { useState, useEffect } from "react";
import { apiClient } from '../../lib/apiClient';
import { Edit2, Trash2, Check, X, Plus } from "lucide-react";
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';

const inputCls = "w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring";

interface PicItem {
  id: string;
  name: string;
}

export function PicManagementModal({ onClose, showToast = () => {} }: { onClose: () => void; showToast?: (msg: string, type?: "success" | "error" | "info") => void }) {
  const [pics, setPics] = useState<PicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [picToDelete, setPicToDelete] = useState<PicItem | null>(null);

  const loadPics = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/pics');
      setPics(res.data.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPics();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.post('/pics', { name: newName });
      setNewName("");
      showToast(`PIC '${newName}' berhasil ditambahkan`, "success");
      loadPics();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menambahkan PIC", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.put(`/pics/${id}`, { name: editName });
      setEditingId(null);
      showToast(`PIC '${editName}' berhasil diperbarui`, "success");
      loadPics();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal memperbarui PIC", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/pics/${id}`);
      showToast("PIC berhasil dihapus", "success");
      loadPics();
      setPicToDelete(null);
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menghapus PIC", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">Atur PIC</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-3">
          {loading ? <p className="text-sm text-muted-foreground text-center py-4">Memuat data...</p> : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {pics.map((p) => (
                  <tr key={p.id} className="group">
                    <td className="py-2">
                      {editingId === p.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdate(p.id);
                            else if (e.key === 'Escape') setEditingId(null);
                          }}
                          className={inputCls}
                          autoFocus
                        />
                      ) : (
                        <span className="text-foreground">{p.name}</span>
                      )}
                    </td>
                    <td className="py-2 text-right w-20">
                      {editingId === p.id ? (
                        <div className="flex justify-end gap-1">
                          <button
                            disabled={isSubmitting}
                            onClick={() => handleUpdate(p.id)}
                            title="Simpan Perubahan"
                            className={`p-1 text-green-600 hover:bg-green-50 rounded active:scale-90 transition-transform ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            disabled={isSubmitting}
                            onClick={() => setEditingId(null)}
                            title="Batal"
                            className={`p-1 text-muted-foreground hover:bg-muted rounded active:scale-90 transition-transform ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            disabled={isSubmitting}
                            onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                            title="Edit PIC"
                            className={`p-1 text-blue-600 hover:bg-blue-50 rounded active:scale-90 transition-transform ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            disabled={isSubmitting}
                            onClick={() => setPicToDelete(p)}
                            title="Hapus PIC"
                            className={`p-1 text-red-500 hover:bg-red-50 rounded active:scale-90 transition-transform ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {pics.length === 0 && <tr><td colSpan={2} className="text-center py-4 text-muted-foreground text-xs">Belum ada PIC.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border flex gap-2 items-center bg-muted/20 shrink-0 rounded-b-2xl">
          <input
            disabled={isSubmitting}
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nama PIC baru..."
            className={`${inputCls} flex-1 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <button
            disabled={isSubmitting}
            onClick={handleAdd}
            className={`px-3 py-2 bg-primary text-white text-sm rounded-md hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-1 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Plus size={14} />
            {isSubmitting ? "Memproses..." : "Tambah"}
          </button>
        </div>
      </div>
      {picToDelete && (
        <DeleteConfirmModal
          label={picToDelete.name}
          onCancel={() => setPicToDelete(null)}
          onConfirm={() => handleDelete(picToDelete.id)}
        />
      )}
    </div>
  );
}
