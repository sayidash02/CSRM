import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, KeyRound, Plus, RefreshCw, ShieldCheck, UserCog, UserRound, UsersRound, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../lib/apiClient';
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
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${role === 'ADMIN' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>
      {role === 'ADMIN' ? <ShieldCheck size={12} /> : <UserRound size={12} />}
      {role}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} />Aktif</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><XCircle size={14} />Nonaktif</span>
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
    <div className="flex-1 overflow-y-auto bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><UserCog size={18} /></div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Pengelolaan Akun</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Buat akun lokal, atur role, reset password, dan nonaktifkan akses login. Ini satu-satunya jalur pendaftaran akun; data operasional tetap read-only untuk ADMIN.</p>
          </div>
          <button type="button" onClick={() => setEditingUser(null)} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-blue-700">
            <Plus size={15} />Tambah akun
          </button>
        </header>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3" aria-label="Ringkasan akun">
          <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><UsersRound size={14} />Total akun</div><div className="mt-2 text-2xl font-semibold text-foreground">{users.length}</div></div>
          <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><CheckCircle2 size={14} />Akun aktif</div><div className="mt-2 text-2xl font-semibold text-emerald-700">{users.filter((user) => user.is_active).length}</div></div>
          <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><ShieldCheck size={14} />Administrator</div><div className="mt-2 text-2xl font-semibold text-blue-700">{users.filter((user) => user.role === 'ADMIN' && user.is_active).length}</div></div>
        </section>

        <section className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-blue-900">
          <div className="flex items-start gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0" /><p><strong>Boundary akses:</strong> halaman ini hanya muncul untuk ADMIN dan endpoint tetap memverifikasi role di server. Tidak ada register publik, dan password tidak pernah dikembalikan dari API.</p></div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 p-4">
            <div><h2 className="text-sm font-semibold text-foreground">Daftar akun lokal</h2><p className="mt-0.5 text-xs text-muted-foreground">Nonaktifkan akun ketika akses IT/user sudah tidak diperlukan.</p></div>
            <div className="flex items-center gap-2">
              <label htmlFor="admin-user-search" className="sr-only">Cari akun</label>
              <input id="admin-user-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari username..." className="w-48 rounded-md border border-border bg-card px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" onClick={() => void loadUsers()} disabled={loading} aria-label="Muat ulang daftar akun" className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2 p-5" aria-busy="true" aria-label="Memuat akun"><div className="h-10 animate-pulse rounded bg-muted" /><div className="h-10 animate-pulse rounded bg-muted" /><div className="h-10 animate-pulse rounded bg-muted" /></div>
          ) : error ? (
            <div role="alert" className="flex items-center justify-between gap-3 p-6 text-sm text-red-700"><span className="flex items-center gap-2"><CircleAlert size={16} />{error}</span><button type="button" onClick={() => void loadUsers()} className="rounded-md border border-red-200 px-3 py-1.5 text-xs hover:bg-red-50">Coba lagi</button></div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center"><UsersRound size={24} className="mx-auto text-muted-foreground" /><p className="mt-2 text-sm font-medium text-foreground">{search ? 'Akun tidak ditemukan' : 'Belum ada akun tambahan'}</p><p className="mt-1 text-xs text-muted-foreground">{search ? 'Coba kata kunci lain.' : 'Buat akun pertama untuk user atau IT.'}</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted/70 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Username</th><th scope="col" className="px-4 py-3 font-medium">Role</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium">Login terakhir</th><th scope="col" className="px-4 py-3 font-medium">Dibuat</th><th scope="col" className="px-4 py-3 text-right font-medium">Aksi</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3"><div className="flex items-center gap-2 font-medium text-foreground"><UserRound size={15} className="text-muted-foreground" />{user.username}{user.username === currentUsername && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Anda</span>}</div></td>
                      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                      <td className="px-4 py-3"><StatusBadge active={user.is_active} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(user.last_login_at)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-right"><button type="button" onClick={() => setEditingUser(user)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"><KeyRound size={13} />Kelola</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {editingUser !== undefined && <AdminUserForm currentUser={currentUsername} user={editingUser} submitting={submitting} onClose={() => setEditingUser(undefined)} onCreate={handleCreate} onUpdate={handleUpdate} />}
    </div>
  );
}
