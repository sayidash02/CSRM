import { useState, useEffect } from "react";
import { apiClient } from '../../lib/apiClient';
import { Edit2, UserX, Check, X, Plus } from "lucide-react";
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';

const inputCls = "w-full text-[13px] rounded-lg border border-line bg-paper/50 px-3 py-2 text-ink outline-none focus:border-forest focus:bg-white transition-all";

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

  const handleDeactivate = async (id: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/pics/${id}`);
      showToast("PIC berhasil dinonaktifkan", "success");
      loadPics();
      setPicToDelete(null);
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.error || "Gagal menonaktifkan PIC", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-line shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col text-ink" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper/30 shrink-0">
          <h2 className="text-[15px] font-semibold text-ink">Kelola Master PIC Lapangan</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-paper-2 text-slate hover:text-ink transition-colors"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Add Form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              placeholder="Nama PIC baru..."
              className={inputCls}
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-forest hover:bg-forest-2 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Plus size={13} />
              Tambah
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate font-mono text-center py-4">Memuat daftar PIC...</p>
          ) : (
            <table className="w-full text-[13px]">
              <tbody className="divide-y divide-line/60">
                {pics.map((p) => (
                  <tr key={p.id} className="group hover:bg-paper/30 transition-colors">
                    <td className="py-2.5">
                      {editingId === p.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(p.id);
                            else if (e.key === 'Escape') setEditingId(null);
                          }}
                          className={inputCls}
                          autoFocus
                        />
                      ) : (
                        <span className="text-ink font-medium">{p.name}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right w-24">
                      {editingId === p.id ? (
                        <div className="flex justify-end gap-1">
                          <button
                            disabled={isSubmitting}
                            onClick={() => handleUpdate(p.id)}
                            title="Simpan Perubahan"
                            className="p-1.5 text-forest hover:bg-forest/10 rounded-md transition-colors"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            disabled={isSubmitting}
                            onClick={() => setEditingId(null)}
                            title="Batal"
                            className="p-1.5 text-slate hover:bg-paper-2 rounded-md transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            disabled={isSubmitting}
                            onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                            title="Edit Nama PIC"
                            className="p-1.5 text-slate-2 hover:text-ochre hover:bg-ochre/10 rounded-md transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            disabled={isSubmitting}
                            onClick={() => setPicToDelete(p)}
                            title="Nonaktifkan PIC"
                            className="p-1.5 text-slate-2 hover:text-clay hover:bg-clay/10 rounded-md transition-colors"
                          >
                            <UserX size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {pics.length === 0 && <tr><td colSpan={2} className="text-center py-4 text-slate text-xs">Belum ada PIC terdaftar.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-3.5 border-t border-line flex justify-end bg-paper/30 rounded-b-2xl shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate border border-line rounded-lg hover:bg-paper-2 hover:text-ink transition-colors">Tutup</button>
        </div>
      </div>
      {picToDelete && (
        <DeleteConfirmModal
          label={picToDelete.name}
          title="Konfirmasi Nonaktifkan PIC"
          description={`PIC "${picToDelete.name}" akan dinonaktifkan. Data kegiatan masa lalu tetap aman dan utuh, namun PIC ini tidak akan muncul lagi di formulir input kegiatan baru.`}
          confirmButtonText="Nonaktifkan"
          onCancel={() => setPicToDelete(null)}
          onConfirm={() => handleDeactivate(picToDelete.id)}
        />
      )}
    </div>
  );
}
