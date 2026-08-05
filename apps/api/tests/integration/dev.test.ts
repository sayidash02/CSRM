import request from 'supertest';
import app from '../../src/app';

describe('Dev Routes Guard', () => {
  const originalEnv = process.env.NODE_ENV;

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should return 404 in production environment', async () => {
    process.env.NODE_ENV = 'production';
    const response = await request(app).delete('/api/dev/reset');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });
});
