import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, UserRound } from 'lucide-react';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import type { AdminUser, AdminUserRole, CreateAdminUserInput, UpdateAdminUserInput } from '../../api/adminUsers';

const inputClass = 'w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';

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
    <Modal title={isEdit ? `Kelola akun ${user.username}` : 'Tambah akun CRMS'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-800">
            {isEdit
              ? 'Perubahan role, status, dan password akan langsung berlaku pada login berikutnya.'
              : 'Buat akun lokal untuk user atau IT. Password tidak pernah ditampilkan kembali setelah disimpan.'}
          </div>

          <div>
            <label htmlFor="admin-user-username" className="mb-1.5 block text-xs font-medium text-muted-foreground">Username</label>
            <div className="relative">
              <UserRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
            {!isEdit && <p className="mt-1 text-[11px] text-muted-foreground">Disimpan dalam huruf kecil.</p>}
          </div>

          <div>
            <label htmlFor="admin-user-role" className="mb-1.5 block text-xs font-medium text-muted-foreground">Role</label>
            <select id="admin-user-role" value={role} onChange={(event) => setRole(event.target.value as AdminUserRole)} disabled={isSelf || submitting} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}>
              <option value="USER">USER — mengelola data operasional</option>
              <option value="ADMIN">ADMIN — mengelola akun, data operasional read-only</option>
            </select>
            {isSelf && <p className="mt-1 text-[11px] text-amber-700">Role akun yang sedang dipakai tidak dapat diturunkan dari browser ini.</p>}
          </div>

          <div>
            <label htmlFor="admin-user-password" className="mb-1.5 block text-xs font-medium text-muted-foreground">{isEdit ? 'Password baru (opsional)' : 'Password'}</label>
            <div className="relative">
              <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input id="admin-user-password" type="password" autoComplete={isEdit ? 'new-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} disabled={submitting} className={`${inputClass} pl-9 disabled:opacity-60`} required={!isEdit} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Minimal 12 karakter. Jangan gunakan password yang sama dengan akun lain.</p>
          </div>

          <div>
            <label htmlFor="admin-user-password-confirmation" className="mb-1.5 block text-xs font-medium text-muted-foreground">Konfirmasi password</label>
            <input id="admin-user-password-confirmation" type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} disabled={submitting} className={`${inputClass} disabled:opacity-60`} required={!isEdit && password.length > 0} />
          </div>

          {isEdit && (
            <label className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${isSelf ? 'border-amber-200 bg-amber-50/60' : 'border-border bg-muted/30'}`}>
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={isSelf || submitting} className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring disabled:opacity-60" />
              <span>
                <span className="block font-medium text-foreground">Akun aktif</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Akun nonaktif tidak dapat login.</span>
                {isSelf && <span className="mt-1 block text-xs text-amber-700">Akun yang sedang digunakan tidak dapat dinonaktifkan sendiri.</span>}
              </span>
            </label>
          )}

          {validationError && <p role="alert" className="text-sm text-red-700">{validationError}</p>}
        </div>
        <ModalFooter onClose={onClose} onSave={() => undefined} saveType="submit" saveLabel={submitting ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Buat akun'} disableSave={submitting} />
      </form>
    </Modal>
  );
}
