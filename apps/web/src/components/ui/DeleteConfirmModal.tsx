import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function DeleteConfirmModal({ label, onCancel, onConfirm }: { label: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[80] p-4" onClick={onCancel}>
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border" onClick={e => e.stopPropagation()}>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="text-red-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Konfirmasi Hapus</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              &quot;<span className="font-medium text-foreground">{label}</span>&quot; akan dihapus (soft delete) dan tidak muncul di daftar.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors">Batal</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Hapus</button>
        </div>
      </div>
    </div>
  );
}
