import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { logger, errorFields } from './logger';

export type PublicErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_REFERENCE'
  | 'FILE_UPLOAD_ERROR'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: PublicErrorCode;
  public readonly details: Record<string, unknown> | undefined;

  constructor(code: PublicErrorCode, statusCode: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

type ErrorWithStatus = Error & {
  status?: number;
  statusCode?: number;
  expose?: boolean;
  conflicts?: unknown;
};

function publicErrorFor(err: unknown): { status: number; code: PublicErrorCode; message: string; details: Record<string, unknown> | undefined } {
  if (err instanceof AppError) {
    return { status: err.statusCode, code: err.code, message: err.message, details: err.details };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return { status: 404, code: 'NOT_FOUND', message: 'Data tidak ditemukan', details: undefined };
    if (err.code === 'P2002') return { status: 409, code: 'CONFLICT', message: 'Data duplikat telah ada', details: undefined };
    if (err.code === 'P2003') return { status: 400, code: 'INVALID_REFERENCE', message: 'Referensi data tidak valid', details: undefined };
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return { status: 400, code: 'VALIDATION_ERROR', message: 'Format data tidak valid', details: undefined };
  }

  const typed = (err && typeof err === 'object' ? err : {}) as ErrorWithStatus;
  const status = Number.isInteger(typed.statusCode) ? typed.statusCode! : Number.isInteger(typed.status) ? typed.status! : 500;
  const safeStatus = status >= 400 && status <= 499 ? status : 500;
  const publicCode: PublicErrorCode = safeStatus === 404 ? 'NOT_FOUND' : safeStatus === 409 ? 'CONFLICT' : safeStatus < 500 ? 'BAD_REQUEST' : 'INTERNAL_ERROR';
  const message = safeStatus < 500 && typed.expose === true && typeof typed.message === 'string'
    ? typed.message
    : safeStatus < 500 ? 'Request tidak valid' : 'Internal server error';
  const details = safeStatus < 500 && Array.isArray(typed.conflicts) ? { conflicts: typed.conflicts } : undefined;
  return { status: safeStatus, code: publicCode, message, details };
}

export function sendPublicError(
  res: Response,
  status: number,
  code: PublicErrorCode,
  message: string,
  details?: Record<string, unknown>,
): void {
  // Keep the existing `error` string for current clients while exposing a stable machine-readable code.
  res.status(status).json({ error: message, code, ...details });
}

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction): void => {
  const publicError = publicErrorFor(err);
  logger.error('http_request_error', {
    requestId: req.requestId,
    method: req.method,
    route: req.route?.path || 'unmatched',
    status: publicError.status,
    code: publicError.code,
    ...errorFields(err),
  });
  if (res.headersSent) {
    next(err);
    return;
  }
  sendPublicError(res, publicError.status, publicError.code, publicError.message, publicError.details);
};
