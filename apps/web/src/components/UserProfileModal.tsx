import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Activity, 
  Lock, 
  Eye, 
  EyeOff, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  KeyRound,
  Loader2
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { apiClient } from '../lib/apiClient';

interface UserProfileData {
  id: string | number;
  username: string;
  role: 'USER' | 'ADMIN';
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  activity_count?: number;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function getInitials(name: string): string {
  if (!name) return 'CR';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const formatDate = (d?: string | Date | null) => {
  if (!d) return '—';
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '—';
  }
};

const formatDateTime = (d?: string | Date | null) => {
  if (!d) return '—';
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return '—';
    return `${dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, ${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
  } catch {
    return '—';
  }
};

export function UserProfileModal({ isOpen, onClose, onLogout, showToast }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Form states for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/auth/profile');
      setProfile(res.data.data);
    } catch (e: any) {
      console.error('Failed to load profile', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setIsChangingPassword(false);
    }
  }, [isOpen, fetchProfile]);

  if (!isOpen) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Kata sandi saat ini harus diisi');
      return;
    }
    if (newPassword.length < 12) {
      setPasswordError('Kata sandi baru minimal harus berisi 12 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi baru tidak cocok');
      return;
    }

    try {
      setSubmittingPassword(true);
      await apiClient.put('/auth/profile/password', {
        currentPassword,
        newPassword
      });

      showToast?.('Kata sandi berhasil diperbarui', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.error || 'Gagal memperbarui kata sandi';
      setPasswordError(msg);
      showToast?.(msg, 'error');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const initials = getInitials(profile?.username || 'User');

  return (
    <Modal title="Profil Pengguna" onClose={onClose} size="md">
      <div className="space-y-6">
        {/* Profile Card Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-slate-900 p-6 text-white shadow-md">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest text-xl font-bold text-white shadow-inner font-mono">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-ink bg-emerald-500" title="Aktif" />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg font-bold tracking-tight text-white capitalize">
                  {profile?.username || 'Memuat...'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase bg-forest/30 text-emerald-300 border border-forest/40">
                  <ShieldCheck size={11} /> {profile?.role || 'USER'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-paper/80">
                  ● Aktif
                </span>
              </div>

              <p className="text-xs text-paper/70 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                <Building2 size={13} className="text-forest-2 shrink-0" />
                Departemen CSR · PT Jawa Satu Power
              </p>
            </div>
          </div>
        </div>

        {/* Account Details Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-paper/60 border border-line flex items-start gap-3">
            <div className="p-2 rounded-lg bg-forest/10 text-forest shrink-0">
              <User size={15} />
            </div>
            <div>
              <span className="text-[11px] text-slate block">Nama Akun / Username</span>
              <span className="text-[13px] font-semibold text-ink font-mono">{profile?.username || '—'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-paper/60 border border-line flex items-start gap-3">
            <div className="p-2 rounded-lg bg-ochre/10 text-ochre shrink-0">
              <ShieldCheck size={15} />
            </div>
            <div>
              <span className="text-[11px] text-slate block">Hak Akses Sistem</span>
              <span className="text-[13px] font-semibold text-ink">
                {profile?.role === 'ADMIN' ? 'Administrator (Kelola Akun & View)' : 'User (Operator Penuh 7 Modul)'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-paper/60 border border-line flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
              <Calendar size={15} />
            </div>
            <div>
              <span className="text-[11px] text-slate block">Tanggal Terdaftar</span>
              <span className="text-[13px] font-medium text-ink">{formatDate(profile?.created_at)}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-paper/60 border border-line flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 shrink-0">
              <Clock size={15} />
            </div>
            <div>
              <span className="text-[11px] text-slate block">Sesi Login Terakhir</span>
              <span className="text-[13px] font-medium text-ink">{formatDateTime(profile?.last_login_at)}</span>
            </div>
          </div>
        </div>

        {/* Operational Contribution Summary */}
        <div className="p-4 rounded-xl border border-line bg-paper/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-forest/10 text-forest">
              <Activity size={18} />
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-ink">Riwayat Kontribusi &amp; Perubahan Data</h4>
              <p className="text-[11px] text-slate">Total aksi pencatatan, pembaruan, dan dokumentasi foto di 7 modul CRIMEs</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold font-mono text-forest">
              {loading ? '...' : (profile?.activity_count ?? 0)}
            </span>
            <span className="text-[11px] text-slate block">Aktivitas</span>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="border border-line rounded-xl overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            className="w-full px-4 py-3 bg-paper/40 hover:bg-paper/70 flex items-center justify-between text-left transition-colors cursor-pointer border-b border-line/60"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              <KeyRound size={15} className="text-forest" />
              <span>Ganti Kata Sandi (Password)</span>
            </div>
            <span className="text-xs font-medium text-forest hover:underline">
              {isChangingPassword ? 'Tutup Form' : 'Ubah Password'}
            </span>
          </button>

          {isChangingPassword && (
            <form onSubmit={handlePasswordSubmit} className="p-4 space-y-3.5 bg-paper/10 animate-in fade-in-50">
              {passwordError && (
                <div className="p-3 rounded-lg bg-clay/10 border border-clay/30 text-clay text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate block mb-1">
                  Kata Sandi Saat Ini <span className="text-clay">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan kata sandi lama Anda..."
                    className="w-full text-xs rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-forest pr-9 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-2 hover:text-ink cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate block mb-1">
                    Kata Sandi Baru (Min. 12 Karakter) <span className="text-clay">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Kata sandi baru..."
                      className="w-full text-xs rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-forest pr-9 font-mono"
                      required
                      minLength={12}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-2 hover:text-ink cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate block mb-1">
                    Konfirmasi Kata Sandi Baru <span className="text-clay">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru..."
                      className="w-full text-xs rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-forest pr-9 font-mono"
                      required
                      minLength={12}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-2 hover:text-ink cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submittingPassword}
                  className="px-4 py-2 text-xs font-semibold text-white bg-forest hover:bg-forest-2 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingPassword && <Loader2 size={13} className="animate-spin" />}
                  <span>{submittingPassword ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-line">
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('Apakah Anda yakin ingin keluar dari akun CRIMEs?')) {
                onClose();
                await onLogout();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-clay bg-clay/10 hover:bg-clay/20 border border-clay/25 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Keluar dari Akun (Logout)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-line bg-white hover:bg-paper-2 text-xs font-medium text-ink transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}
