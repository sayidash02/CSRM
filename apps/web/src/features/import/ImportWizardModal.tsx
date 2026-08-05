import React, { useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/ui/Modal';
import {
  UploadCloud,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface ImportSummary {
  dailyActivities: number;
  stakeholders: number;
  topIssues: number;
  proposals: number;
  csr: number;
  grievance: number;
}

interface ImportPreviewData {
  fileId: string;
  summary: ImportSummary;
  newMasterData: {
    pics: string[];
    categories: string[];
  };
}

interface ImportWizardModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'upload' | 'processing' | 'preview' | 'success';

export function ImportWizardModal({ onClose, onSuccess }: ImportWizardModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx')) {
        setSelectedFile(file);
        setErrorMsg(null);
      } else {
        setErrorMsg('File harus berformat .xlsx');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setStep('processing');
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await apiClient.post('/import/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.data) {
        setPreviewData(response.data.data);
        setStep('preview');
      } else {
        throw new Error('Respon tidak valid dari server');
      }
    } catch (err: any) {
      console.error('Error analyzing Excel file:', err);
      const msg = err.response?.data?.error || err.message || 'Gagal menganalisis file Excel';
      setErrorMsg(msg);
      setStep('upload');
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;

    setIsConfirming(true);
    setErrorMsg(null);

    try {
      const response = await apiClient.post('/import/confirm', {
        fileId: previewData.fileId,
      });

      if (response.data && response.data.success) {
        setImportedCount(response.data.count || 0);
        setStep('success');
      } else {
        throw new Error(response.data?.error || 'Gagal mengimpor data');
      }
    } catch (err: any) {
      console.error('Error confirming import:', err);
      const msg = err.response?.data?.error || err.message || 'Gagal mengimpor data';
      setErrorMsg(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleFinish = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <Modal title="Import Master Excel" onClose={onClose} size="lg">
      <div className="p-6 space-y-6">
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-border hover:border-blue-400 bg-muted/20'
              }`}
            >
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="hidden"
                id="excel-file-input"
              />
              <label htmlFor="excel-file-input" className="cursor-pointer space-y-3 block">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Klik untuk memilih file atau drag & drop ke sini
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Format file yang didukung: <strong>.xlsx</strong> (Maksimal 5MB)
                  </p>
                </div>
              </label>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-3.5 bg-card border border-border rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground font-mono truncate max-w-md">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Hapus
                </button>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!selectedFile}
                className={`px-5 py-2 text-sm font-medium text-white rounded-xl transition-all flex items-center gap-2 ${
                  selectedFile
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20'
                    : 'bg-gray-300 cursor-not-allowed text-gray-500'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Analisis File Excel
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PROCESSING */}
        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Menganalisis file Excel...
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Membaca sheet, mendeteksi struktur kolom, dan mengecek validitas data. Mohon tunggu sebentar.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {step === 'preview' && previewData && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Ringkasan Data yang Ditemukan</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <span className="text-xs font-medium text-blue-600 block">Daily Activities</span>
                  <span className="text-xl font-bold font-mono text-blue-900 mt-1 block">
                    {previewData.summary.dailyActivities} <span className="text-xs font-normal text-blue-700">baris</span>
                  </span>
                </div>
                <div className="p-3.5 bg-violet-50/50 border border-violet-100 rounded-xl">
                  <span className="text-xs font-medium text-violet-600 block">Stakeholders</span>
                  <span className="text-xl font-bold font-mono text-violet-900 mt-1 block">
                    {previewData.summary.stakeholders} <span className="text-xs font-normal text-violet-700">baris</span>
                  </span>
                </div>
                <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl">
                  <span className="text-xs font-medium text-amber-600 block">Top Issues</span>
                  <span className="text-xl font-bold font-mono text-amber-900 mt-1 block">
                    {previewData.summary.topIssues} <span className="text-xs font-normal text-amber-700">baris</span>
                  </span>
                </div>
                <div className="p-3.5 bg-teal-50/50 border border-teal-100 rounded-xl">
                  <span className="text-xs font-medium text-teal-600 block">Proposals</span>
                  <span className="text-xl font-bold font-mono text-teal-900 mt-1 block">
                    {previewData.summary.proposals} <span className="text-xs font-normal text-teal-700">baris</span>
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <span className="text-xs font-medium text-emerald-600 block">CSR Projects</span>
                  <span className="text-xl font-bold font-mono text-emerald-900 mt-1 block">
                    {previewData.summary.csr} <span className="text-xs font-normal text-emerald-700">baris</span>
                  </span>
                </div>
                <div className="p-3.5 bg-red-50/50 border border-red-100 rounded-xl">
                  <span className="text-xs font-medium text-red-600 block">Grievance</span>
                  <span className="text-xl font-bold font-mono text-red-900 mt-1 block">
                    {previewData.summary.grievance} <span className="text-xs font-normal text-red-700">baris</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Warning if new master data will be created */}
            {(previewData.newMasterData.pics.length > 0 || previewData.newMasterData.categories.length > 0) && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Master Data Baru Otomatis Dibuat
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Excel ini berisi entri baru yang belum ada di Master Reference. Item berikut akan didaftarkan secara otomatis:
                </p>

                {previewData.newMasterData.pics.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-amber-900 block mb-1">
                      PIC Baru ({previewData.newMasterData.pics.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {previewData.newMasterData.pics.map((pic, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-amber-100/80 text-amber-800 border border-amber-200 rounded-md text-[11px] font-mono"
                        >
                          {pic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {previewData.newMasterData.categories.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-amber-900 block mb-1">
                      Kategori / Sub-Kategori Baru ({previewData.newMasterData.categories.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {previewData.newMasterData.categories.map((cat, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-amber-100/80 text-amber-800 border border-amber-200 rounded-md text-[11px] font-mono"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setStep('upload')}
                disabled={isConfirming}
                className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isConfirming}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengimpor Data...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Impor Data Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Impor Data Berhasil!</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Total <strong className="text-emerald-700 font-mono">{importedCount}</strong> baris data telah berhasil diimpor ke database.
              </p>
            </div>
            <button
              type="button"
              onClick={handleFinish}
              className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20"
            >
              Selesai
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
