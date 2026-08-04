import React, { useState, useEffect } from "react";
import { apiClient } from '../../lib/apiClient';
import { Edit2, Trash2, Check, X, Plus } from "lucide-react";
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';

const inputCls = "w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring";

export function PicManagementModal({ onClose }: { onClose: () => void }) {
  const [pics, setPics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [picToDelete, setPicToDelete] = useState<any | null>(null);

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
    if (!newName.trim()) return;
    try {
      await apiClient.post('/pics', { name: newName });
      setNewName("");
      loadPics();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await apiClient.put(`/pics/${id}`, { name: editName });
      setEditingId(null);
      loadPics();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/pics/${id}`);
      loadPics();
      setPicToDelete(null);
    } catch (e) {
      console.error(e);
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
                {pics.map((p: any) => (
                  <tr key={p.id} className="group">
                    <td className="py-2">
                      {editingId === p.id ? (
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} autoFocus />
                      ) : (
                        <span className="text-foreground">{p.name}</span>
                      )}
                    </td>
                    <td className="py-2 text-right w-20">
                      {editingId === p.id ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleUpdate(p.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-muted rounded"><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingId(p.id); setEditName(p.name); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={13} /></button>
                          <button onClick={() => setPicToDelete(p)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
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
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Nama PIC baru..." className={`${inputCls} flex-1`} />
          <button onClick={handleAdd} className="px-3 py-2 bg-primary text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"><Plus size={14} />Tambah</button>
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
