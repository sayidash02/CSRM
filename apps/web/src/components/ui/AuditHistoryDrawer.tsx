import React, { useEffect, useState } from 'react';
import { translateField, translateValue } from '../../utils/fieldDictionary';
import { apiClient } from '../../lib/apiClient';

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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="w-96 h-full bg-white shadow-xl relative z-10 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Riwayat Perubahan</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black font-semibold text-sm">Tutup</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500">Memuat riwayat...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada riwayat perubahan.</p>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="border p-3 rounded shadow-sm text-sm bg-white">
                <div className="font-semibold text-gray-800">
                  {log.action === 'UPDATE' ? 'Diedit' : log.action === 'DELETE' ? 'Dihapus' : 'Dibuat'}
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  {new Date(log.created_at).toLocaleString('id-ID')}
                </div>
                {log.changes && Object.entries(log.changes).map(([field, vals]: any) => (
                  <div key={field} className="mt-1 bg-gray-50 p-2 rounded text-xs">
                    <span className="font-medium text-gray-700">{translateField(field)}</span>: 
                    <span className="text-red-500 line-through mx-1">{translateValue(field, vals.old, references)}</span> ➔ 
                    <span className="text-green-600 font-semibold mx-1">{translateValue(field, vals.new, references)}</span>
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

