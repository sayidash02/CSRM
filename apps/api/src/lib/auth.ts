import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import prisma from './prisma.ts';

const SESSION_COOKIE = 'crms_session';
const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_ACTIVE_SESSIONS = 50;
const SCRYPT_N = 8_192;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;

export type AuthenticatedUser = { id: bigint; username: string; role: string };
type SessionRecord = { user: AuthenticatedUser; expiresAt: number };
const sessions = new Map<string, SessionRecord>();

declare global {
  namespace Express {
    interface Request { crmsUser?: AuthenticatedUser; }
  }
}

function sessionTtlMs(): number {
  const configuredMinutes = Number(process.env.CRMS_AUTH_SESSION_TTL_MINUTES);
  if (Number.isFinite(configuredMinutes) && configuredMinutes >= 15 && configuredMinutes <= 24 * 60) return configuredMinutes * 60 * 1000;
  return DEFAULT_SESSION_TTL_MS;
}

function purgeExpiredSessions(now = Date.now()): void {
  for (const [token, session] of sessions) if (session.expiresAt <= now) sessions.delete(token);
}

function getCookieValue(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1 || part.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return null; }
  }
  return null;
}

export function hashPassword(password: string): string {
  if (password.length < 12 || password.length > 200) throw new Error('Password harus berisi 12-200 karakter');
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 32 * 1024 * 1024 });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  try {
    const [algorithm, nValue, rValue, pValue, saltValue, hashValue] = encoded.split('$');
    if (algorithm !== 'scrypt' || !nValue || !rValue || !pValue || !saltValue || !hashValue) return false;
    const expected = Buffer.from(hashValue, 'base64');
    const actual = scryptSync(password, Buffer.from(saltValue, 'base64'), expected.length, { N: Number(nValue), r: Number(rValue), p: Number(pValue), maxmem: 32 * 1024 * 1024 });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}

/** Database-backed local authentication is the only production mechanism. */
export function isAuthConfigured(): boolean {
  return typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;
}

export function createSession(user: AuthenticatedUser = { id: 0n, username: 'test', role: 'ADMIN' }, now = Date.now()): string {
  purgeExpiredSessions(now);
  while (sessions.size >= MAX_ACTIVE_SESSIONS) {
    const oldest = sessions.keys().next().value;
    if (typeof oldest !== 'string') break;
    sessions.delete(oldest);
  }
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { user, expiresAt: now + sessionTtlMs() });
  return token;
}

export function revokeSession(token: string | null): void { if (token) sessions.delete(token); }

export function getSessionUserFromCookieHeader(header: string | undefined, now = Date.now()): AuthenticatedUser | null {
  purgeExpiredSessions(now);
  const token = getCookieValue(header, SESSION_COOKIE);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt <= now) { sessions.delete(token); return null; }
  return session.user;
}

export function getSessionFromCookieHeader(header: string | undefined, now = Date.now()): boolean {
  return Boolean(getSessionUserFromCookieHeader(header, now));
}

export function getSessionTokenFromCookieHeader(header: string | undefined): string | null { return getCookieValue(header, SESSION_COOKIE); }

export function getSessionCookieOptions(environment = process.env.NODE_ENV): { httpOnly: true; sameSite: 'strict'; secure: boolean; path: '/'; maxAge: number } {
  return { httpOnly: true, sameSite: 'strict', secure: environment === 'production', path: '/', maxAge: sessionTtlMs() };
}

function serializeSessionCookie(token: string, environment = process.env.NODE_ENV): string {
  const options = getSessionCookieOptions(environment);
  return [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, `Max-Age=${Math.floor(options.maxAge / 1000)}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', options.secure ? 'Secure' : ''].filter(Boolean).join('; ');
}
function serializeExpiredSessionCookie(environment = process.env.NODE_ENV): string {
  const secure = environment === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${secure}`;
}
export function setSessionCookie(res: Response, token: string): void { res.setHeader('Set-Cookie', serializeSessionCookie(token)); }
export function clearSessionCookie(res: Response): void { res.setHeader('Set-Cookie', serializeExpiredSessionCookie()); }

export function allowedOrigins(): string[] {
  const configured = process.env.CRMS_ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);
  return configured?.length ? configured : ['http://localhost:5173', 'http://localhost:3000'];
}
export function isAllowedOrigin(origin: string): boolean { return allowedOrigins().includes(origin); }

export const authenticationMiddleware: RequestHandler = (req, res, next) => {
  const testBypass = process.env.NODE_ENV === 'test' && process.env.JEST_WORKER_ID !== undefined && process.env.CRMS_TEST_AUTH_BYPASS === 'true';
  if (testBypass) { req.crmsUser = { id: 0n, username: 'test', role: 'USER' }; next(); return; }
  if (!isAuthConfigured()) { res.status(503).json({ error: { code: 'AUTH_NOT_CONFIGURED', message: 'Authentication is not configured' } }); return; }
  const user = getSessionUserFromCookieHeader(req.headers.cookie);
  if (!user) { res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } }); return; }
  req.crmsUser = user;
  next();
};

export const requireRole = (...roles: string[]): RequestHandler => (req, res, next) => {
  if (!req.crmsUser || !roles.includes(req.crmsUser.role)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki hak akses untuk operasi ini' } }); return; }
  next();
};

export const originGuard: RequestHandler = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) { next(); return; }
  const origin = req.get('origin');
  if (origin && !isAllowedOrigin(origin)) { res.status(403).json({ error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Request origin is not allowed' } }); return; }
  next();
};

export async function authenticateCredentials(username: string, password: string): Promise<AuthenticatedUser | null> {
  const user = await prisma.users.findFirst({ where: { username: username.trim().toLowerCase(), is_active: true } });
  if (!user || (user.role !== 'USER' && user.role !== 'ADMIN') || !verifyPassword(password, user.password_hash)) return null;
  await prisma.users.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
  return { id: user.id, username: user.username, role: user.role };
}
