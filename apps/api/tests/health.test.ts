import request from 'supertest';
import app from '../src/app';

describe('operational endpoints', () => {
  it('reports database readiness without exposing connection details', async () => {
    const response = await request(app).get('/health').set('X-Request-Id', 'health-check-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' } });
    expect(response.headers['x-request-id']).toBe('health-check-1');
    expect(JSON.stringify(response.body)).not.toContain('DATABASE_URL');
  });

  it('returns a stable public error for an unknown route', async () => {
    const response = await request(app).get('/route-that-does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not found');
    expect(response.body.code).toBe('NOT_FOUND');
    expect(response.body.stack).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('route-that-does-not-exist');
  });
});
