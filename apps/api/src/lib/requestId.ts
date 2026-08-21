import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from './logger';

declare global {
  namespace Express {
    interface Request { requestId: string; }
  }
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function requestIdFromHeader(value: string | undefined): string {
  return value && REQUEST_ID_PATTERN.test(value) ? value : randomUUID();
}

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const requestId = requestIdFromHeader(req.get('x-request-id'));
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

export const requestLoggingMiddleware: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const fields = {
      requestId: req.requestId,
      method: req.method,
      // Route templates are safe to log; never log an unmatched URL, which may contain PII.
      route: req.route?.path || 'unmatched',
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };
    if (res.statusCode >= 500) logger.error('http_request_failed', fields);
    else if (res.statusCode >= 400) logger.warn('http_request_rejected', fields);
    else logger.info('http_request_completed', fields);
  });
  next();
};
