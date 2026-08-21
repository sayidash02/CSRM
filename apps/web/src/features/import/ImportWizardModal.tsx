import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { apiClient } from '../../lib/apiClient';

interface ImportSummary {
  dailyActivities: number;
  stakeholders: number;
  topIssues: number;
  proposals: number;
  csr: number;
  grievance: number;
  lrp: number;
}

interface ConflictItem {
  module: string;
  row: number;
  code: string;
  message: string;
  blocking: boolean;
}

interface PreviewData {
  summary: ImportSummary;
  conflicts: ConflictItem[];
  canImport: boolean;
  newMasterData: {
    pics: string[];
    categories: string[];
  };
  fileToken: string;
}

interface ImportWizardModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 'upload' | 'processing' | 'preview' | 'success';

export function ImportWizardModal({ onClose, onSuccess }: ImportWizardModalProps) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMessage(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setStep('processing');
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await apiClient.post<{ data: PreviewData }>('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPreviewData(response.data.data);
      setStep('preview');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.error || 'Gagal memproses file Excel. Pastikan format template sesuai.'
      );
      setStep('upload');
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData?.fileToken) return;

    setIsConfirming(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.post<{ data: { totalImported: number } }>('/import/commit', {
        fileToken: previewData.fileToken,
      });

      setImportedCount(response.data.data.totalImported);
      setStep('success');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || 'Gagal melakukan impor data.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <Modal title="Impor Master Spreadsheet (Excel)" onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono ${
                step === 'upload' ? 'bg-forest text-white' : 'bg-forest/20 text-forest'
              }`}
            >
              1
            </span>
            <span className={`text-[12px] font-medium ${step === 'upload' ? 'text-ink font-semibold' : 'text-slate'}`}>
              Pilih File
            </span>
          </div>

          <div className="w-8 h-px bg-line" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono ${
                step === 'processing' || step === 'preview'
                  ? 'bg-forest text-white'
                  : 'bg-paper-2 text-slate-2'
              }`}
            >
              2
            </span>
            <span
              className={`text-[12px] font-medium ${
                step === 'preview' ? 'text-ink font-semibold' : 'text-slate'
              }`}
            >
              Validasi & Preview
            </span>
          </div>

          <div className="w-8 h-px bg-line" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono ${
                step === 'success' ? 'bg-forest text-white' : 'bg-paper-2 text-slate-2'
              }`}
            >
              3
            </span>
            <span className={`text-[12px] font-medium ${step === 'success' ? 'text-ink font-semibold' : 'text-slate'}`}>
              Selesai
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-clay/10 border border-clay/20 rounded-xl flex items-start gap-3 text-clay text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold block">Terjadi Kesalahan</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                isDragOver
                  ? 'border-forest bg-forest/5'
                  : 'border-line hover:border-forest/60 bg-paper/40'
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-file-input"
              />
              <label htmlFor="excel-file-input" className="cursor-pointer space-y-3 block">
                <div className="w-12 h-12 rounded-xl bg-forest/10 text-forest flex items-center justify-center mx-auto shadow-2xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-ink">
                    Klik untuk memilih file atau seret file ke sini
                  </p>
                  <p className="text-[11px] text-slate mt-1">
                    Format file yang didukung: <strong className="font-mono text-ink">.xlsx / .xls</strong> (Maksimal 100MB)
                  </p>
                </div>
              </label>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-3.5 bg-white border border-line rounded-xl shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-forest/10 text-forest">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-medium text-ink font-mono truncate max-w-md">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-clay hover:opacity-80 font-medium"
                >
                  Hapus
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate border border-line rounded-lg hover:bg-paper-2 hover:text-ink transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!selectedFile}
                className={`px-4 py-2 text-xs font-medium text-white rounded-lg transition-all flex items-center gap-1.5 ${
                  selectedFile
                    ? 'bg-forest hover:bg-forest-2 shadow-2xs'
                    : 'bg-paper-2 text-slate-2 cursor-not-allowed border border-line'
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
            <Loader2 className="w-10 h-10 text-forest animate-spin" />
            <div>
              <h3 className="text-[15px] font-semibold text-ink">
                Menganalisis file Excel...
              </h3>
              <p className="text-xs text-slate mt-1 max-w-sm">
                Membaca sheet, mendeteksi struktur kolom, dan mengecek validitas data. Mohon tunggu sebentar.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {step === 'preview' && previewData && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[13px] font-semibold text-ink mb-3">Ringkasan Data yang Ditemukan</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                <div className="p-3 bg-forest/5 border border-forest/20 rounded-xl">
                  <span className="text-[11px] font-medium text-forest block">Daily Activities</span>
                  <span className="text-lg font-bold font-mono text-ink mt-0.5 block">
                    {previewData.summary.dailyActivities} <span className="text-xs font-normal text-slate">baris</span>
                  </span>
                </div>
                <div className="p-3 bg-paper/60 border border-line rounded-xl">
                  <span className="text-[11px] font-medium text-slate block">Stakeholders</span>
                  <span className="text-lg font-bold font-mono text-ink mt-0.5 block">
                    {previewData.summary.stakeholders} <span className="text-xs font-normal text-slate">baris</span>
                  </span>
                </div>
                <div className="p-3 bg-ochre/10 border border-ochre/20 rounded-xl">
                  <span className="text-[11px] font-medium text-ochre block">Top Issues</span>
                  <span className="text-lg font-bold font-mono text-ink mt-0.5 block">
                    {previewData.summary.topIssues} <span className="text-xs font-normal text-slate">baris</span>
                  </span>
                </div>
                <div className="p-3 bg-paper/60 border border-line rounded-xl">
                  <span className="text-[11px] font-medium text-slate block">Proposals</span>
                  <span className="text-lg font-bold font-mono text-ink mt-0.5 block">
                    {previewData.summary.proposals} <span className="text-xs font-normal text-slate">baris</span>
                  </span>
                </div>
                <div className="p-3 bg-forest/5 border border-forest/20 rounded-xl">
                  <span className="text-[11px] font-medium text-forest block">CSR Projects</span>
                  <span className="text-lg font-bold font-mono text-ink mt-0.5 block">
                    {previewData.summary.csr} <span className="text-xs font-normal text-slate">baris</span>
                  </span>
                </div>
                <div className="p-3 bg-clay/10 border border-clay/20 rounded-xl">
                  <span className="text-[11px] font-medium text-clay block">Grievance</span>
                  <span className="text-lg font-bold font-mono text-ink mt-0.5 block">
                    {previewData.summary.grievance} <span className="text-xs font-normal text-slate">baris</span>
                  </span>
                </div>
                <div className="p-3 bg-paper/60 border border-line rounded-xl">
                  <span className="text-[11px] font-medium text-slate block">LRP</span>
                  <span className="text-lg font-bold font-mono text-ink mt-0.5 block">
                    {previewData.summary.lrp} <span className="text-xs font-normal text-slate">baris</span>
                  </span>
                </div>
              </div>
            </div>

            {previewData.conflicts?.length > 0 && (
              <div className={`p-4 border rounded-xl space-y-2 ${previewData.canImport ? 'bg-ochre/10 border-ochre/25' : 'bg-clay/10 border-clay/25'}`}>
                <div className="flex items-center gap-2 font-semibold text-xs text-ink">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-ochre" />
                  {previewData.canImport ? 'Catatan preview' : 'Import diblokir sampai konflik diperbaiki'}
                </div>
                <div className="max-h-40 overflow-auto space-y-1 text-xs">
                  {previewData.conflicts.map((conflict, index) => (
                    <div key={`${conflict.module}-${conflict.row}-${index}`} className={conflict.blocking ? 'text-clay' : 'text-ochre'}>
                      <strong>{conflict.module} baris {conflict.row} · {conflict.code}:</strong> {conflict.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warning if new master data will be created */}
            {(previewData.newMasterData.pics.length > 0 || previewData.newMasterData.categories.length > 0) && (
              <div className="p-4 bg-ochre/10 border border-ochre/25 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-ochre font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 text-ochre shrink-0" />
                  Master Data Belum Terdaftar
                </div>
                <p className="text-xs text-slate leading-relaxed">
                  Excel ini berisi entri yang belum ada di Master Reference. Tambahkan master data terlebih dahulu; import tidak akan mengisi default atau membuat referensi diam-diam.
                </p>

                {previewData.newMasterData.pics.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-ink block mb-1">
                      PIC Baru ({previewData.newMasterData.pics.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {previewData.newMasterData.pics.map((pic, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-white text-ink border border-line rounded-md text-[11px] font-mono"
                        >
                          {pic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {previewData.newMasterData.categories.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-ink block mb-1">
                      Kategori / Sub-Kategori Baru ({previewData.newMasterData.categories.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {previewData.newMasterData.categories.map((cat, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-white text-ink border border-line rounded-md text-[11px] font-mono"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setStep('upload')}
                disabled={isConfirming}
                className="px-4 py-2 text-xs font-medium text-slate border border-line rounded-lg hover:bg-paper-2 hover:text-ink transition-colors disabled:opacity-50"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isConfirming || !previewData.canImport}
                className="px-4 py-2 text-xs font-medium text-white bg-forest hover:bg-forest-2 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
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
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-forest/15 flex items-center justify-center text-forest">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-ink">Impor Data Berhasil!</h3>
              <p className="text-xs text-slate max-w-sm">
                Total <strong className="text-forest font-mono">{importedCount}</strong> baris data telah berhasil diimpor ke database.
              </p>
            </div>
            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-2 text-xs font-medium text-white bg-forest hover:bg-forest-2 rounded-lg transition-all shadow-2xs"
            >
              Selesai
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
