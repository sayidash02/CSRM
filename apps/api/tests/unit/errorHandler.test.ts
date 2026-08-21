import request from 'supertest';
import express from 'express';
import { AppError, errorHandler } from '../../src/lib/errorHandler';
import { requestIdMiddleware } from '../../src/lib/requestId';
import { logger } from '../../src/lib/logger';

describe('public error boundary', () => {
  it('returns a stable code and does not expose internal paths or stacks', async () => {
    const app = express();
    app.use(requestIdMiddleware);
    app.get('/failure', (_req, _res, next) => next(new Error('C:\\private\\secrets\\database.sql')));
    app.use(errorHandler);

    const response = await request(app).get('/failure');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    expect(response.body.error).not.toContain('private');
    expect(response.body.stack).toBeUndefined();
    expect(response.headers['x-request-id']).toMatch(/^[A-Za-z0-9-]{20,}$/);
  });

  it('preserves a safe application error message and code', async () => {
    const app = express();
    app.use(requestIdMiddleware);
    app.get('/validation', (_req, _res, next) => next(new AppError('VALIDATION_ERROR', 400, 'Year tidak valid')));
    app.use(errorHandler);

    const response = await request(app).get('/validation').set('X-Request-Id', 'test-request-1');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Year tidak valid', code: 'VALIDATION_ERROR' });
    expect(response.headers['x-request-id']).toBe('test-request-1');
  });
});

describe('structured logger redaction', () => {
  it('does not write credentials or PII fields', () => {
    const writes: string[] = [];
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);

    logger.info('workflow_succeeded', {
      requestId: 'request-1',
      authorization: 'Bearer very-secret-token',
      email: 'person@example.com',
      path: 'C:\\private\\file.xlsx',
      rows: 3,
    });

    writeSpy.mockRestore();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain('workflow_succeeded');
    expect(writes[0]).toContain('[REDACTED]');
    expect(writes[0]).not.toContain('very-secret-token');
    expect(writes[0]).not.toContain('person@example.com');
    expect(writes[0]).not.toContain('C:\\private');
  });
});
