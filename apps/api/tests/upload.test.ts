import request from 'supertest';
import app from '../src/app';

describe('POST /api/upload', () => {
  it('is disabled because users paste SharePoint links instead', async () => {
    const res = await request(app).post('/api/upload');

    expect(res.status).toBe(404);
  });
});
