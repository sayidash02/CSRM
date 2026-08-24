import {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  TreePine,
  Lock,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
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
    if (!username.trim() || !password.trim()) return;

    setError('');
    setLoading(true);
    try {
      const response = await apiClient.post<{ data: { authenticated: true; user: AuthUser } }>('/auth/login', {
        username: username.trim(),
        password,
      });
      setPassword('');
      setUser(response.data.data.user);
      setStatus('authenticated');
    } catch (requestError: any) {
      const message = requestError?.response?.data?.error?.message;
      setError(message || 'Login gagal. Periksa kembali username dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordKeyEvents = (e: KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4 text-ink">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-forest text-white shadow-md">
            <TreePine size={28} className="animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate">
            <Loader2 size={15} className="animate-spin text-forest" />
            <span>Memeriksa sesi login CRMS...</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-4 py-10 text-ink selection:bg-forest/20 selection:text-ink">
        {/* Subtle Ambient Background Elements */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-forest/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-ochre/8 blur-3xl" />

        {/* Login Card */}
        <div className="relative z-10 w-full max-w-[420px] rounded-2xl border border-line bg-white p-7 shadow-[0_16px_40px_-12px_rgba(20,32,27,0.08)] sm:p-8 transition-all">
          {/* Brand Header */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-3.5 grid h-12 w-12 place-items-center rounded-xl bg-forest text-white shadow-sm ring-4 ring-forest/10">
              <TreePine size={24} />
            </div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-forest">
              Community Relations
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">Masuk ke CRMS</h1>
            <p className="mt-1.5 text-[13px] text-slate leading-relaxed">
              Masukkan kredensial akun operasional CRS Anda untuk melanjutkan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label
                htmlFor="crms-auth-username"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink"
              >
                Username
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-2">
                  <User size={16} />
                </div>
                <input
                  id="crms-auth-username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  spellCheck={false}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Masukkan username"
                  className="w-full rounded-lg border border-line bg-paper/40 py-2.5 pl-9 pr-3.5 text-sm text-ink placeholder:text-slate-2 outline-none transition-all focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/15"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="crms-auth-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink"
                >
                  Kata Sandi
                </label>
                {capsLockOn && (
                  <span className="font-mono text-[10px] font-semibold text-ochre uppercase tracking-wider">
                    Caps Lock Aktif
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-2">
                  <Lock size={16} />
                </div>
                <input
                  id="crms-auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={handlePasswordKeyEvents}
                  onKeyUp={handlePasswordKeyEvents}
                  placeholder="Masukkan kata sandi"
                  className="w-full rounded-lg border border-line bg-paper/40 py-2.5 pl-9 pr-10 text-sm text-ink placeholder:text-slate-2 outline-none transition-all focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/15"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-2 hover:text-ink transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-clay/30 bg-clay/10 p-3 text-xs text-clay"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-forest py-2.5 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-forest-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Security & IT Footer */}
          <div className="mt-6 border-t border-line/70 pt-4">
            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-slate">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-forest" />
              <span>
                <strong>Akses Terbatas:</strong> Portal internal operasional CRS. Tidak ada pendaftaran mandiri. Hubungi Administrator Sistem untuk akses akun.
              </span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!context) return null;
  return <AuthContext.Provider value={context}>{children}</AuthContext.Provider>;
}

