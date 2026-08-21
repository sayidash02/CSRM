import React, { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { apiClient } from "../../lib/apiClient";
import { toast } from "sonner";
import {
  Archive,
  RotateCcw,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Database,
  Info,
  Loader2,
} from "lucide-react";

function ResetModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [challenge, setChallenge] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (challenge !== "RESET") return;
    setLoading(true);
    try {
      await apiClient.delete('/dev/reset');
      onSuccess();
    } catch (e) {
      console.error(e);
      alert("Failed to reset database");
      setLoading(false);
    }
  };

  return (
    <Modal title="Peringatan Berbahaya!" onClose={onClose}>
      <div className="p-4 space-y-4">
        <p className="text-sm text-red-600 font-semibold">
          Apakah Anda yakin ingin menghapus semua data?
        </p>
        <p className="text-sm text-muted-foreground">
          Ini akan menghapus seluruh data dari 7 modul, daftar PIC, dan riwayat sinkronisasi. 
          Kategori akan dikembalikan ke nilai default. Aksi ini tidak dapat dibatalkan.
        </p>
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Ketik <strong>RESET</strong> untuk melanjutkan:
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
            placeholder="RESET"
          />
        </div>
      </div>
      <div className="flex justify-end p-4 border-t border-border bg-muted/30 gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          disabled={loading}
        >
          Batal
        </button>
        <button
          onClick={handleReset}
          disabled={challenge !== "RESET" || loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? "Menghapus..." : "Hapus Semua"}
        </button>
      </div>
    </Modal>
  );
}

export default function ArchiveSettings() {
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [customYearInput, setCustomYearInput] = useState<string>("");
  const [useCustomYear, setUseCustomYear] = useState<boolean>(false);
  const [confirmMode, setConfirmMode] = useState<"archive" | "restore" | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const effectiveYear = useCustomYear ? Number(customYearInput) : selectedYear;
  const isValidYear = Number.isInteger(effectiveYear) && effectiveYear >= 2000 && effectiveYear <= 2100;

  const handleArchive = async () => {
    if (!isValidYear) {
      toast.error("Pilih atau masukkan tahun yang valid (2000 - 2100)");
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.post("/archive/archive", { year: effectiveYear });
      toast.success(response.data?.message || `Data tahun ${effectiveYear} berhasil diarsipkan`);
      setConfirmMode(null);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || `Gagal mengarsipkan data tahun ${effectiveYear}`;
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!isValidYear) {
      toast.error("Pilih atau masukkan tahun yang valid (2000 - 2100)");
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.post("/archive/restore", { year: effectiveYear });
      toast.success(response.data?.message || `Data tahun ${effectiveYear} berhasil dipulihkan`);
      setConfirmMode(null);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || `Gagal memulihkan data tahun ${effectiveYear}`;
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Archive size={18} />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Pengaturan Arsip &amp; Restorasi Tahun
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola arsip data tahunan untuk mengamankan data historis dan mengoptimalkan tampilan modul aktif CRMS.
          </p>
        </div>
      </div>

      {/* Target Year Selector */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calendar size={16} className="text-blue-500" />
          <span>Pilih Tahun Target</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Tahun yang akan Diproses
            </label>
            {!useCustomYear ? (
              <div className="flex gap-2 items-center">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="flex-1 px-3 py-2 text-sm bg-input-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                >
                  <option value={2023}>2023</option>
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
                <button
                  type="button"
                  onClick={() => setUseCustomYear(true)}
                  className="px-3 py-2 text-xs border border-border rounded-md text-muted-foreground hover:bg-muted transition-colors whitespace-nowrap"
                >
                  Input Manual
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Contoh: 2022"
                  value={customYearInput}
                  onChange={(e) => setCustomYearInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-input-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomYear(false);
                    setCustomYearInput("");
                  }}
                  className="px-3 py-2 text-xs border border-border rounded-md text-muted-foreground hover:bg-muted transition-colors whitespace-nowrap"
                >
                  Pilih dari Daftar
                </button>
              </div>
            )}
          </div>

          <div className="bg-muted/40 p-3.5 rounded-xl border border-border text-xs space-y-1.5">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Info size={14} className="text-blue-500 shrink-0" />
              <span>Target Pengarsipan / Pemulihan:</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Tahun Terpilih:{" "}
              <strong className="text-foreground font-mono">
                {isValidYear ? effectiveYear : "Tahun tidak valid"}
              </strong>
            </p>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Archive Card */}
        <div className="bg-card rounded-2xl border border-amber-200/50 dark:border-amber-900/30 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Archive size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base">Arsipkan Tahun</h3>
                <p className="text-xs text-muted-foreground">Status is_archived = true</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mengarsipkan seluruh data transaksi pada tahun{" "}
              <strong className="text-foreground font-mono">{effectiveYear}</strong> meliputi 7 modul: Daily Activities, Stakeholders, Top Issues, Proposals, CSR, Grievance, dan LRP.
            </p>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
              <span>Data yang diarsipkan tidak hilang dari database, tetapi tidak akan ditampilkan pada daftar modul aktif.</span>
            </div>
          </div>

          <button
            onClick={() => setConfirmMode("archive")}
            disabled={!isValidYear || isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Archive size={16} />
            Arsipkan Tahun {isValidYear ? effectiveYear : ""}
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-card rounded-2xl border border-blue-200/50 dark:border-blue-900/30 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base">Pulihkan Tahun</h3>
                <p className="text-xs text-muted-foreground">Status is_archived = false</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Memulihkan data tahun{" "}
              <strong className="text-foreground font-mono">{effectiveYear}</strong> yang sebelumnya diarsipkan agar kembali muncul dan diakses di modul aktif CRMS.
            </p>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <Database size={15} className="shrink-0 mt-0.5 text-blue-600" />
              <span>Memulihkan data akan mengembalikan visibilitas seluruh data pada tahun ini ke pencarian dan modul aktif.</span>
            </div>
          </div>

          <button
            onClick={() => setConfirmMode("restore")}
            disabled={!isValidYear || isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <RotateCcw size={16} />
            Pulihkan Tahun {isValidYear ? effectiveYear : ""}
          </button>
        </div>
      </div>

      {/* Summary Info */}
      <div className="bg-muted/30 rounded-2xl border border-border p-5 text-xs space-y-2">
        <h4 className="font-semibold text-foreground flex items-center gap-1.5">
          <CheckCircle2 size={15} className="text-emerald-500" />
          <span>Informasi Keamanan &amp; Backup Arsip</span>
        </h4>
        <p className="text-muted-foreground leading-relaxed">
          Download workbook melalui tombol Download Excel sebelum mengarsipkan bila membutuhkan salinan lokal. Pengarsipan hanya mengubah status lokal dan bersifat reversible.
        </p>
      </div>

      {/* Confirmation Modal */}
      {confirmMode && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={isLoading ? undefined : () => setConfirmMode(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3 items-start">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  confirmMode === "archive"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                {confirmMode === "archive" ? <AlertTriangle size={20} /> : <RotateCcw size={20} />}
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-base">
                  {confirmMode === "archive"
                    ? `Konfirmasi Pengarsipan Tahun ${effectiveYear}`
                    : `Konfirmasi Pemulihan Tahun ${effectiveYear}`}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {confirmMode === "archive" ? (
                    <>
                      Apakah Anda yakin ingin mengarsipkan seluruh data transaksi tahun{" "}
                      <strong className="text-foreground font-mono">{effectiveYear}</strong>? Data ini
                      tidak akan ditampilkan pada modul utama.
                    </>
                  ) : (
                    <>
                      Apakah Anda yakin ingin memulihkan seluruh data tahun{" "}
                      <strong className="text-foreground font-mono">{effectiveYear}</strong>? Data ini
                      akan muncul kembali pada modul aktif.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmMode(null)}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmMode === "archive" ? handleArchive : handleRestore}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer ${
                  confirmMode === "archive"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sedang memproses...
                  </>
                ) : confirmMode === "archive" ? (
                  <>
                    <Archive size={14} />
                    Ya, Arsipkan
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    Ya, Pulihkan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone - Development Only */}
      {import.meta.env.DEV && (
        <div className="mt-8 border border-red-200 bg-red-50/50 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-red-200">
            <h3 className="text-sm font-semibold text-red-800">Danger Zone (Development Only)</h3>
            <p className="text-xs text-red-600 mt-1">Aksi di bawah ini bersifat destruktif dan hanya muncul saat development.</p>
          </div>
          <div className="p-4 bg-white/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Reset Database</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Hapus seluruh data operasional dan kembalikan ke state awal.</p>
              </div>
              <button
                onClick={() => setShowResetModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <ResetModal
          onClose={() => setShowResetModal(false)}
          onSuccess={() => {
            setShowResetModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
