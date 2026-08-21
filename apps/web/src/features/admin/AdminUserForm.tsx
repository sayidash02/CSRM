import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, UserRound } from 'lucide-react';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import type { AdminUser, AdminUserRole, CreateAdminUserInput, UpdateAdminUserInput } from '../../api/adminUsers';

const inputClass = 'w-full rounded-lg border border-line bg-paper/50 px-3 py-2 text-[13px] text-ink outline-none focus:border-forest focus:bg-white transition-colors';

type AdminUserFormProps = {
  currentUser: string;
  user: AdminUser | null;
  submitting: boolean;
  onClose: () => void;
  onCreate: (input: CreateAdminUserInput) => Promise<void>;
  onUpdate: (id: string, input: UpdateAdminUserInput) => Promise<void>;
};

export function AdminUserForm({ currentUser, user, submitting, onClose, onCreate, onUpdate }: AdminUserFormProps) {
  const isEdit = user !== null;
  const isSelf = user?.username === currentUser;
  const [username, setUsername] = useState(user?.username ?? '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [role, setRole] = useState<AdminUserRole>(user?.role ?? 'USER');
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setUsername(user?.username ?? '');
    setPassword('');
    setPasswordConfirmation('');
    setRole(user?.role ?? 'USER');
    setIsActive(user?.is_active ?? true);
    setValidationError('');
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = username.trim().toLowerCase();
    if (!isEdit && !/^[a-z0-9._-]{3,100}$/.test(normalizedUsername)) {
      setValidationError('Username 3-100 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.');
      return;
    }
    if (password && password.length < 12) {
      setValidationError('Password harus berisi minimal 12 karakter.');
      return;
    }
    if (!isEdit && password.length === 0) {
      setValidationError('Password wajib diisi saat membuat akun.');
      return;
    }
    if (password !== passwordConfirmation) {
      setValidationError('Konfirmasi password tidak sama.');
      return;
    }
    setValidationError('');
    if (isEdit) {
      const input: UpdateAdminUserInput = { role, is_active: isActive };
      if (password) input.password = password;
      await onUpdate(user.id, input);
      return;
    }
    await onCreate({ username: normalizedUsername, password, role });
  };

  return (
    <Modal title={isEdit ? `Kelola Akun ${user.username}` : 'Tambah Akun CRMS'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="rounded-xl border border-forest/20 bg-forest/5 p-3.5 text-xs text-forest leading-relaxed">
            {isEdit
              ? 'Perubahan role, status, dan password akan langsung berlaku pada login berikutnya.'
              : 'Buat akun lokal untuk user atau IT. Password tidak pernah ditampilkan kembali setelah disimpan.'}
          </div>

          <div>
            <label htmlFor="admin-user-username" className="mb-1.5 block text-xs font-medium text-slate">
              Username
            </label>
            <div className="relative">
              <UserRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-2" />
              <input
                id="admin-user-username"
                type="text"
                autoComplete="username"
                value={username}
                disabled={isEdit || submitting}
                onChange={(event) => setUsername(event.target.value)}
                className={`${inputClass} pl-9 disabled:cursor-not-allowed disabled:opacity-60`}
                required
              />
            </div>
            {!isEdit && <p className="mt-1 text-[11px] text-slate-2">Disimpan dalam format huruf kecil.</p>}
          </div>

          <div>
            <label htmlFor="admin-user-role" className="mb-1.5 block text-xs font-medium text-slate">
              Role Akun
            </label>
            <select
              id="admin-user-role"
              value={role}
              onChange={(event) => setRole(event.target.value as AdminUserRole)}
              disabled={isSelf || submitting}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60 font-mono text-xs`}
            >
              <option value="USER">USER — mengelola seluruh data operasional</option>
              <option value="ADMIN">ADMIN — mengelola akun, data operasional bersifat read-only</option>
            </select>
            {isSelf && (
              <p className="mt-1 text-[11px] text-ochre font-medium">
                Role akun yang sedang dipakai tidak dapat diturunkan dari sesi ini.
              </p>
            )}
          </div>

          {isEdit && (
            <div className="rounded-xl border border-line bg-paper/40 p-3.5">
              <label className="flex items-center justify-between gap-3 text-xs font-medium text-ink cursor-pointer">
                <span>Status Akun Aktif</span>
                <input
                  type="checkbox"
                  checked={isActive}
                  disabled={isSelf || submitting}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 rounded border-line text-forest focus:ring-forest"
                />
              </label>
              <p className="mt-1 text-[11px] text-slate">
                Akun nonaktif tidak akan dapat melakukan login ke CRMS.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="admin-user-password" className="mb-1.5 block text-xs font-medium text-slate">
              {isEdit ? 'Password Baru (opsional)' : 'Password'}
            </label>
            <div className="relative">
              <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-2" />
              <input
                id="admin-user-password"
                type="password"
                autoComplete="new-password"
                value={password}
                disabled={submitting}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isEdit ? 'Biarkan kosong jika tidak ingin mengubah' : 'Minimal 12 karakter'}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {(password.length > 0 || !isEdit) && (
            <div>
              <label htmlFor="admin-user-password-confirmation" className="mb-1.5 block text-xs font-medium text-slate">
                Konfirmasi Password
              </label>
              <div className="relative">
                <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-2" />
                <input
                  id="admin-user-password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  disabled={submitting}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  placeholder="Ulangi password di atas"
                  className={`${inputClass} pl-9`}
                  required={!isEdit || password.length > 0}
                />
              </div>
            </div>
          )}

          {validationError && (
            <p role="alert" className="rounded-lg bg-clay/10 border border-clay/20 p-2.5 text-xs text-clay">
              {validationError}
            </p>
          )}
        </div>

        <ModalFooter
          onClose={onClose}
          onSave={() => undefined}
          saveType="submit"
          isEdit={isEdit}
          disableSave={submitting}
          saveLabel={submitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Akun'}
        />
      </form>
    </Modal>
  );
}
