import { FormEvent, ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    apiClient.get<{ data: { authenticated: true; user: AuthUser } }>('/auth/session')
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
    try {
      const response = await apiClient.post<{ data: { authenticated: true; user: AuthUser } }>('/auth/login', { username, password });
      setPassword('');
      setUser(response.data.data.user);
      setStatus('authenticated');
    } catch (requestError: any) {
      const message = requestError?.response?.data?.error?.message;
      setError(message || 'Login gagal. Periksa credential yang diberikan IT.');
    }
  };

  if (status === 'checking') {
    return <div className="flex min-h-screen items-center justify-center bg-[#0F1729] text-sm text-slate-300">Memeriksa session…</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F1729] px-4 text-slate-100">
        <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
          <div className="mb-6">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-blue-400">CRMS</div>
            <h1 className="mt-2 text-xl font-semibold">Masuk ke CRMS</h1>
            <p className="mt-2 text-sm text-slate-400">Masukkan username dan password CRMS yang diberikan IT atau administrator.</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">Tidak ada pendaftaran publik. Jika membutuhkan akun, hubungi IT atau ADMIN CRMS.</p>
          </div>
          <label htmlFor="crms-auth-username" className="mb-2 block text-sm font-medium text-slate-200">Username</label>
          <input
            id="crms-auth-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            required
          />
          <label htmlFor="crms-auth-password" className="mb-2 mt-4 block text-sm font-medium text-slate-200">Password</label>
          <input
            id="crms-auth-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
            required
          />
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
          <button type="submit" className="mt-5 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500">
            Masuk
          </button>
        </form>
      </main>
    );
  }

  if (!context) return null;
  return <AuthContext.Provider value={context}>{children}</AuthContext.Provider>;
}
