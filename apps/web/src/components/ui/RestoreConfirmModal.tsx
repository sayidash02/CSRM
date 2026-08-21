import { RotateCcw } from 'lucide-react';

export function RestoreConfirmModal({ label, onCancel, onConfirm }: { label: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center z-[80] p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-line text-ink" onClick={e => e.stopPropagation()}>
        <div className="flex gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
            <RotateCcw className="text-forest" size={18} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Konfirmasi Pulihkan</h3>
            <p className="text-xs text-slate mt-1 leading-relaxed">
              &quot;<span className="font-medium text-ink">{label}</span>&quot; akan dipulihkan dan kembali muncul di daftar modul aktif.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-medium text-slate hover:bg-paper-2 hover:text-ink border border-line rounded-lg transition-colors">Batal</button>
          <button onClick={onConfirm} className="px-4 py-2 text-xs font-medium bg-forest text-white rounded-lg hover:bg-forest-2 transition-colors">Pulihkan</button>
        </div>
      </div>
    </div>
  );
}
