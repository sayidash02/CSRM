import { Router } from 'express';
import prisma from '../lib/prisma.ts';
import {
  authenticateCredentials,
  clearSessionCookie,
  createSession,
  getSessionTokenFromCookieHeader,
  getSessionUserFromCookieHeader,
  isAuthConfigured,
  setSessionCookie,
  revokeSession,
  hashPassword,
  verifyPassword,
} from '../lib/auth';

const router = Router();
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 50;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(key: string, now = Date.now()): boolean {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) { attempts.set(key, { count: 0, resetAt: now + WINDOW_MS }); return false; }
  return entry.count >= MAX_ATTEMPTS;
}
function recordFailedAttempt(key: string, now = Date.now()): void {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + WINDOW_MS }); return; }
  entry.count += 1;
}

router.post('/login', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  const key = `${username || 'anon'}:${clientIp}`;

  if (isRateLimited(key)) { res.status(429).json({ error: { code: 'AUTH_RATE_LIMITED', message: 'Terlalu banyak percobaan login. Silakan tunggu beberapa saat.' } }); return; }
  if (!isAuthConfigured()) { res.status(503).json({ error: { code: 'AUTH_NOT_CONFIGURED', message: 'Authentication is not configured' } }); return; }

  try {
    let user = username && password ? await authenticateCredentials(username, password) : null;

    if (!user) {
      recordFailedAttempt(key);
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Username atau kata sandi salah' } });
      return;
    }
    attempts.delete(key);
    setSessionCookie(res, createSession(user));
    res.status(200).json({ data: { authenticated: true, user: { username: user.username, role: user.role } } });
  } catch (error) {
    next(error);
  }
});

router.get('/session', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const user = getSessionUserFromCookieHeader(req.headers.cookie);
  if (!user) { res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } }); return; }
  res.status(200).json({ data: { authenticated: true, user: { username: user.username, role: user.role } } });
});

router.get('/profile', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const sessionUser = getSessionUserFromCookieHeader(req.headers.cookie);
  if (!sessionUser) {
    res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
    return;
  }

  try {
    const user = await prisma.users.findFirst({
      where: { username: sessionUser.username }
    });

    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User tidak ditemukan' } });
      return;
    }

    const activityCount = await prisma.audit_logs.count({
      where: { actor_user_id: user.id }
    });

    res.status(200).json({
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
        activity_count: activityCount
      }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/profile/password', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const sessionUser = getSessionUserFromCookieHeader(req.headers.cookie);
  if (!sessionUser) {
    res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
    return;
  }

  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (!currentPassword) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Kata sandi saat ini harus diisi' } });
    return;
  }

  if (!newPassword || newPassword.length < 12 || newPassword.length > 200) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Kata sandi baru harus berisi 12-200 karakter' } });
    return;
  }

  try {
    const user = await prisma.users.findFirst({
      where: { username: sessionUser.username }
    });

    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User tidak ditemukan' } });
      return;
    }

    if (!verifyPassword(currentPassword, user.password_hash)) {
      res.status(400).json({ error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Kata sandi saat ini tidak sesuai' } });
      return;
    }

    const newHash = hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: user.id },
        data: { password_hash: newHash }
      });

      await tx.audit_logs.create({
        data: {
          entity_type: 'users',
          entity_id: user.id,
          action: 'UPDATE',
          actor_user_id: user.id,
          changes: { fields: ['password_hash'] }
        }
      });
    });

    res.status(200).json({
      data: { success: true, message: 'Kata sandi berhasil diperbarui' }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  revokeSession(getSessionTokenFromCookieHeader(req.headers.cookie));
  clearSessionCookie(res);
  res.status(204).send();
});

export default router;
