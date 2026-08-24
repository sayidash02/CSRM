import { useEffect, useState } from 'react';
import { translateField, translateValue } from '../../utils/fieldDictionary';
import { apiClient } from '../../lib/apiClient';
import { X, History } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string | number | null;
  references?: any;
}

export const AuditHistoryDrawer: React.FC<DrawerProps> = ({ isOpen, onClose, entityType, entityId, references }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [localRefs, setLocalRefs] = useState<any>(references || null);

  useEffect(() => {
    if (references) {
      setLocalRefs(references);
    } else if (isOpen) {
      apiClient.get('/references')
        .then(res => setLocalRefs(res.data?.data || null))
        .catch(e => console.error('Failed to load references for audit log:', e));
    }
  }, [isOpen, references]);

  useEffect(() => {
    if (isOpen && entityId) {
      setLoading(true);
      apiClient.get(`/audit-logs/${entityType}/${entityId}`)
        .then(res => setLogs(res.data?.data || res.data || []))
        .catch(e => console.error(e))
        .finally(() => setLoading(false));
    }
  }, [isOpen, entityType, entityId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs" onClick={onClose}></div>
      <div className="w-96 h-full bg-white shadow-2xl relative z-10 flex flex-col border-l border-line text-ink">
        <div className="p-4 border-b border-line flex justify-between items-center bg-paper/40">
          <div className="flex items-center gap-2">
            <History size={16} className="text-forest" />
            <h2 className="text-[14px] font-bold text-ink">Riwayat Perubahan</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-paper-2 text-slate hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <p className="text-xs text-slate font-mono">Memuat riwayat perubahan...</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-slate">Belum ada catatan riwayat perubahan pada data ini.</p>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="border border-line p-3.5 rounded-xl shadow-2xs text-[12px] bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold ${
                    log.action === 'UPDATE' ? 'bg-ochre/15 text-ochre' : log.action === 'DELETE' ? 'bg-clay/15 text-clay' : 'bg-forest/15 text-forest'
                  }`}>
                    {log.action === 'UPDATE' ? 'Diedit' : log.action === 'DELETE' ? 'Dihapus' : 'Dibuat'}
                  </span>
                  <span className="text-[11px] text-slate-2 font-mono">
                    {new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                {log.changes && Object.entries(log.changes).map(([field, vals]: any) => (
                  <div key={field} className="mt-1.5 bg-paper/60 border border-line/60 p-2 rounded-lg text-[11px]">
                    <span className="font-semibold text-ink">{translateField(field)}</span>: 
                    <span className="text-clay line-through mx-1">{translateValue(field, vals.old, localRefs)}</span> ➔ 
                    <span className="text-forest font-semibold mx-1">{translateValue(field, vals.new, localRefs)}</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
