import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, KeyRound, Plus, RefreshCw, ShieldCheck, UserCog, UserRound, UsersRound, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AdminUserForm } from './AdminUserForm';
import { createAdminUser, listAdminUsers, updateAdminUser, type AdminUser, type CreateAdminUserInput, type UpdateAdminUserInput } from '../../api/adminUsers';

const errorMessage = (error: any, fallback: string): string => {
  const payload = error?.response?.data;
  if (typeof payload?.error === 'string') return payload.error;
  if (typeof payload?.error?.message === 'string') return payload.error.message;
  if (typeof payload?.message === 'string') return payload.message;
  return fallback;
};

const formatDate = (value: string | null): string => {
  if (!value) return 'Belum pernah';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Tidak diketahui';
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

function RoleBadge({ role }: { role: AdminUser['role'] }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold font-mono ${
        role === 'ADMIN'
          ? 'bg-forest/10 text-forest border border-forest/20'
          : 'bg-paper-2 text-slate border border-line'
      }`}
    >
      {role === 'ADMIN' ? <ShieldCheck size={12} /> : <UserRound size={12} />}
      {role}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-forest">
      <CheckCircle2 size={13} />
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-2">
      <XCircle size={13} />
      Nonaktif
    </span>
  );
}

export default function AdminUsersModule({ currentUsername }: { currentUsername: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await listAdminUsers());
    } catch (requestError) {
      setError(errorMessage(requestError, 'Daftar akun tidak dapat dimuat.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? users.filter((user) => user.username.toLowerCase().includes(query) || user.role.toLowerCase().includes(query)) : users;
  }, [search, users]);

  const handleCreate = async (input: CreateAdminUserInput) => {
    setSubmitting(true);
    try {
      await createAdminUser(input);
      toast.success(`Akun ${input.username} berhasil dibuat.`);
      setEditingUser(undefined);
      await loadUsers();
    } catch (requestError) {
      toast.error(errorMessage(requestError, 'Akun tidak dapat dibuat.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, input: UpdateAdminUserInput) => {
    setSubmitting(true);
    try {
      await updateAdminUser(id, input);
      toast.success('Perubahan akun berhasil disimpan.');
      setEditingUser(undefined);
      await loadUsers();
    } catch (requestError) {
      toast.error(errorMessage(requestError, 'Perubahan akun tidak dapat disimpan.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-paper p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10 text-forest">
                <UserCog size={18} />
              </div>
              <h1 className="text-[17px] font-bold tracking-tight text-ink">Pengelolaan Akun</h1>
            </div>
            <p className="mt-1 text-[12px] text-slate">
              Buat akun lokal, atur role, reset password, dan nonaktifkan akses login. Ini satu-satunya jalur pendaftaran akun; data operasional tetap read-only untuk ADMIN.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingUser(null)}
            className="flex items-center gap-1.5 rounded-lg bg-forest px-3.5 py-2 text-[12px] font-medium text-white shadow-2xs hover:bg-forest-2 transition-colors"
          >
            <Plus size={14} />
            Tambah akun
          </button>
        </header>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3" aria-label="Ringkasan akun">
          <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-[12px] font-medium text-slate">
              <UsersRound size={14} />Total akun
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-ink">{users.length}</div>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-[12px] font-medium text-slate">
              <CheckCircle2 size={14} className="text-forest" />Akun aktif
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-forest">
              {users.filter((user) => user.is_active).length}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-[12px] font-medium text-slate">
              <ShieldCheck size={14} className="text-forest" />Administrator
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-ink">
              {users.filter((user) => user.role === 'ADMIN' && user.is_active).length}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-forest/20 bg-forest/5 p-4 text-[12px] text-forest">
          <div className="flex items-start gap-2">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" />
            <p>
              <strong>Boundary akses:</strong> Halaman ini hanya dapat diakses oleh ADMIN dan server memverifikasi otorisasi di setiap request. Tidak ada register publik, dan password selalu di-hash menggunakan Argon2id.
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/30 p-4">
            <div>
              <h2 className="text-[13px] font-semibold text-ink">Daftar Akun Lokal</h2>
              <p className="mt-0.5 text-[11px] text-slate">Nonaktifkan akun ketika akses IT/user sudah tidak diperlukan.</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="admin-user-search" className="sr-only">Cari akun</label>
              <input
                id="admin-user-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari username..."
                className="w-48 rounded-lg border border-line bg-paper/50 px-3 py-1.5 text-[12px] text-ink outline-none focus:border-forest"
              />
              <button
                type="button"
                onClick={() => void loadUsers()}
                disabled={loading}
                aria-label="Muat ulang daftar akun"
                className="rounded-lg border border-line p-2 text-slate hover:bg-paper-2 hover:text-ink disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2 p-5" aria-busy="true" aria-label="Memuat akun">
              <div className="h-10 animate-pulse rounded bg-paper-2" />
              <div className="h-10 animate-pulse rounded bg-paper-2" />
              <div className="h-10 animate-pulse rounded bg-paper-2" />
            </div>
          ) : error ? (
            <div role="alert" className="flex items-center justify-between gap-3 p-6 text-[13px] text-clay">
              <span className="flex items-center gap-2">
                <CircleAlert size={16} />
                {error}
              </span>
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="rounded-lg border border-clay/30 px-3 py-1.5 text-[12px] font-medium text-clay hover:bg-clay/10"
              >
                Coba lagi
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <UsersRound size={24} className="mx-auto text-slate-2" />
              <p className="mt-2 text-[13px] font-medium text-ink">
                {search ? 'Akun tidak ditemukan' : 'Belum ada akun tambahan'}
              </p>
              <p className="mt-1 text-[11px] text-slate">
                {search ? 'Coba kata kunci pencarian lain.' : 'Buat akun pertama untuk user atau IT.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead className="bg-paper/70 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-2 border-b border-line">
                  <tr>
                    <th scope="col" className="px-4 py-3">Username</th>
                    <th scope="col" className="px-4 py-3">Role</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Login terakhir</th>
                    <th scope="col" className="px-4 py-3">Dibuat</th>
                    <th scope="col" className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-paper/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-medium text-ink">
                          <UserRound size={15} className="text-slate-2" />
                          {user.username}
                          {user.username === currentUsername && (
                            <span className="rounded-md bg-ochre/15 px-1.5 py-0.5 text-[10px] font-semibold text-ochre font-mono">
                              Anda
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                      <td className="px-4 py-3"><StatusBadge active={user.is_active} /></td>
                      <td className="px-4 py-3 text-xs font-mono text-slate">{formatDate(user.last_login_at)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingUser(user)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[12px] font-medium text-slate hover:bg-paper-2 hover:text-ink transition-colors"
                        >
                          <KeyRound size={12} />
                          Kelola
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {editingUser !== undefined && (
        <AdminUserForm
          currentUser={currentUsername}
          user={editingUser}
          submitting={submitting}
          onClose={() => setEditingUser(undefined)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
