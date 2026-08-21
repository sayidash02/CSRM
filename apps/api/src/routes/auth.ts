import { Router } from 'express';
import {
  authenticateCredentials,
  clearSessionCookie,
  createSession,
  getSessionTokenFromCookieHeader,
  getSessionUserFromCookieHeader,
  isAuthConfigured,
  setSessionCookie,
  revokeSession,
} from '../lib/auth';

const router = Router();
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
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
  const key = req.ip || 'unknown';
  if (isRateLimited(key)) { res.status(429).json({ error: { code: 'AUTH_RATE_LIMITED', message: 'Too many login attempts' } }); return; }
  if (!isAuthConfigured()) { res.status(503).json({ error: { code: 'AUTH_NOT_CONFIGURED', message: 'Authentication is not configured' } }); return; }

  try {
    const username = typeof req.body?.username === 'string' ? req.body.username : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    let user = username && password ? await authenticateCredentials(username, password) : null;

    if (!user) {
      recordFailedAttempt(key);
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } });
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

router.post('/logout', (req, res) => {
  revokeSession(getSessionTokenFromCookieHeader(req.headers.cookie));
  clearSessionCookie(res);
  res.status(204).send();
});

export default router;
