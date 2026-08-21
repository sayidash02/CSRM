import { FormEvent, ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { TreePine, Lock, User, AlertCircle } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

export type AuthUser = { username: string; role: 'USER' | 'ADMIN' };
type AuthContextValue = { user: AuthUser; logout: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthGate');
  return value;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ data: { authenticated: true; user: AuthUser } }>('/auth/session')
      .then((response) => {
        setUser(response.data.data.user);
        setStatus('authenticated');
      })
      .catch(() => setStatus('unauthenticated'));
  }, []);

  const logout = async () => {
    await apiClient.post('/auth/logout').catch(() => undefined);
    setPassword('');
    setUser(null);
    setStatus('unauthenticated');
  };

  const context = useMemo(() => (user ? { user, logout } : null), [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiClient.post<{ data: { authenticated: true; user: AuthUser } }>('/auth/login', {
        username,
        password,
      });
      setPassword('');
      setUser(response.data.data.user);
      setStatus('authenticated');
    } catch (requestError: any) {
      const message = requestError?.response?.data?.error?.message;
      setError(message || 'Login gagal. Periksa credential yang diberikan IT.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-[13px] text-slate">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-forest/30 border-t-forest animate-spin" />
          <span>Memeriksa sesi login…</span>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-8 text-ink">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-[0_4px_24px_rgba(20,32,27,0.06)]">
          {/* Brand Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-forest text-white shadow-inner">
              <TreePine size={24} />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-2">
              Community Relations Management System
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">Masuk ke CRMS</h1>
            <p className="mt-2 text-[13px] text-slate leading-relaxed">
              Silakan masukkan username dan kata sandi akun operasional CRMS Anda.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="crms-auth-username" className="mb-1.5 block text-[13px] font-medium text-ink">
                Username
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-2" />
                <input
                  id="crms-auth-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Masukkan username"
                  className="w-full rounded-lg border border-line bg-paper/50 py-2.5 pl-9 pr-3 text-[13px] text-ink outline-none transition-colors focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/15"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="crms-auth-password" className="mb-1.5 block text-[13px] font-medium text-ink">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-2" />
                <input
                  id="crms-auth-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-line bg-paper/50 py-2.5 pl-9 pr-3 text-[13px] text-ink outline-none transition-colors focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/15"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-clay/10 border border-clay/20 p-3 text-[12px] text-clay">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-forest py-2.5 text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-forest-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                'Masuk'
              )}
            </button>

            <p className="mt-4 text-center text-[11px] text-slate-2 leading-relaxed">
              Tidak ada pendaftaran mandiri. Jika membutuhkan akses akun baru atau lupa kata sandi, hubungi Administrator Sistem.
            </p>
          </form>
        </div>
      </main>
    );
  }

  if (!context) return null;
  return <AuthContext.Provider value={context}>{children}</AuthContext.Provider>;
}
