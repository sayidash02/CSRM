import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle, AlertTriangle } from "lucide-react";
import { Modal, ModalFooter } from "../../components/ui/Modal";
import { apiClient } from "../../lib/apiClient";

export function ImportExcelModal({ onClose, onSuccess, refs }: { onClose: () => void; onSuccess: () => void; refs: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [parsedData, setParsedData] = useState<{ validRows: any[]; errorRows: any[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setErrorMsg("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiClient.post("/daily-activities/import/parse", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setParsedData(res.data.data);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.response?.data?.error || "Gagal membaca file Excel");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!parsedData || parsedData.errorRows.length > 0) return;
    setLoading(true);
    setErrorMsg("");
    try {
      await apiClient.post("/daily-activities/import/commit", { rows: parsedData.validRows });
      onSuccess();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.response?.data?.error || "Gagal menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Import Excel Daily Activities" onClose={onClose}>
      <div className="p-6 h-[60vh] flex flex-col">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
            {errorMsg}
          </div>
        )}

        {!parsedData ? (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/30 p-6">
            <UploadCloud size={48} className="text-muted-foreground mb-4" />
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              ref={fileRef} 
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }} 
            />
            <button 
              type="button"
              onClick={() => fileRef.current?.click()} 
              className="px-4 py-2 bg-white border border-border text-foreground hover:bg-muted rounded text-sm mb-2 shadow-sm transition-colors"
            >
              {file ? file.name : "Pilih File Excel"}
            </button>
            <p className="text-xs text-muted-foreground mb-4">Format .xlsx atau .xls (Maks 5MB)</p>
            {file && (
              <button 
                type="button"
                onClick={handleUpload} 
                disabled={loading} 
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-blue-700 rounded text-sm transition-colors"
              >
                {loading ? "Menganalisis..." : "Upload & Analisis"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex gap-4 text-xs font-medium">
                <div className="text-green-600 flex items-center gap-1">
                  <CheckCircle size={14} /> Valid: {parsedData.validRows.length} baris
                </div>
                <div className="text-red-600 flex items-center gap-1">
                  <AlertTriangle size={14} /> Error: {parsedData.errorRows.length} baris
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { setParsedData(null); setFile(null); }} 
                className="text-xs text-muted-foreground hover:underline"
              >
                Pilih File Lain
              </button>
            </div>
            
            <div className="flex-1 overflow-auto border border-border rounded bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted sticky top-0 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-2 w-12 text-center">Status</th>
                    <th className="p-2 w-28">Tanggal</th>
                    <th className="p-2">Kegiatan</th>
                    <th className="p-2 w-32">Kategori</th>
                    <th className="p-2 w-28">PIC</th>
                    <th className="p-2">Error Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedData.errorRows.map((r: any) => (
                    <tr key={r.tempId} className="bg-red-50/40 hover:bg-red-50/70">
                      <td className="p-2 text-center text-red-600"><AlertTriangle size={14} className="mx-auto" /></td>
                      <td className="p-2 whitespace-nowrap font-mono">{String(r.activity_date || "").split('T')[0] || "-"}</td>
                      <td className="p-2 font-medium text-foreground">{r.activity || "-"}</td>
                      <td className="p-2">{r.category_name || "-"}</td>
                      <td className="p-2">{r.pic_name || "-"}</td>
                      <td className="p-2 text-red-600">{r.errors?.join(', ')}</td>
                    </tr>
                  ))}
                  {parsedData.validRows.map((r: any) => (
                    <tr key={r.tempId} className="hover:bg-muted/40">
                      <td className="p-2 text-center text-green-600"><CheckCircle size={14} className="mx-auto" /></td>
                      <td className="p-2 whitespace-nowrap font-mono">{String(r.activity_date || "").split('T')[0]}</td>
                      <td className="p-2 font-medium text-foreground">{r.activity}</td>
                      <td className="p-2">{r.category_name}</td>
                      <td className="p-2">{r.pic_name}</td>
                      <td className="p-2 text-muted-foreground">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <ModalFooter 
        onClose={onClose} 
        onSave={handleCommit} 
        saveLabel="Simpan Data" 
        disableSave={!parsedData || parsedData.errorRows.length > 0 || loading || parsedData.validRows.length === 0} 
      />
    </Modal>
  );
}
