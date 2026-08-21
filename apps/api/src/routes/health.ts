import { Router } from 'express';
import prisma from '../lib/prisma';
import { getConfig } from '../config';
import { AppError } from '../lib/errorHandler';

const router = Router();

router.get('/', async (_req, res, next) => {
  const timeoutMs = getConfig().healthTimeoutMs;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('health check timeout')), timeoutMs);
    });
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    res.status(200).json({ data: { status: 'ok' } });
  } catch {
    next(new AppError('DEPENDENCY_UNAVAILABLE', 503, 'Service temporarily unavailable'));
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
});

export default router;
