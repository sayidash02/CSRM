import request from 'supertest';
import app from '../src/app';

describe('Legacy SharePoint sync flow', () => {
  it('is disabled because export and SharePoint upload are manual', async () => {
    const postResponse = await request(app).post('/api/sync').send({});
    expect(postResponse.status).toBe(410);
    expect(postResponse.body.error).toContain('manual');

    const statusResponse = await request(app).get('/api/sync/status');
    expect(statusResponse.status).toBe(410);
  });
});
