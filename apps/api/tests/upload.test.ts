import request from 'supertest';
import app from '../src/app';

describe('POST /api/upload', () => {
  it('Should reject if no file provided', async () => {
    const res = await request(app)
      .post('/api/upload')
      .field('activity_date', '2026-08-05')
      .field('pic_name', 'Ziya');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No file uploaded');
  });

  it('Should accept if activity_date or pic_name is missing (using defaults)', async () => {
    const buffer = Buffer.from('dummy content');
    const res = await request(app)
      .post('/api/upload')
      .attach('file', buffer, 'test.pdf');
    
    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain('mocksharepoint');
  });

  it('Should accept valid upload and return mock URL', async () => {
    const buffer = Buffer.from('dummy content');
    const res = await request(app)
      .post('/api/upload')
      .field('activity_date', '2026-08-05')
      .field('pic_name', 'Ziya')
      .attach('file', buffer, 'test.pdf');
    
    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain('mocksharepoint');
  });
});
