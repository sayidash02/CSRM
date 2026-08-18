import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';

beforeAll(async () => {
  await prisma.stakeholder_engagement.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/stakeholders', () => {
  it('rejects non-HTTPS attachment links before touching the database', async () => {
    const res = await request(app).post('/api/stakeholders').send({
      stakeholder: 'Test stakeholder',
      document_link: 'javascript:alert(1)',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('document_link');
  });

  it('Positive: Should create a new stakeholder engagement', async () => {
    const payload = {
      stakeholder: 'Government Official',
      date: '2026-07-25',
      venue: 'City Hall',
      concern_issue: 'Infrastructure',
      document_link: 'https://example.com/doc'
    };
    const res = await request(app).post('/api/stakeholders').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.stakeholder).toBe('Government Official');
  });

  it('Negative: Should fail if stakeholder is missing', async () => {
    const payload = { date: '2026-07-25', venue: 'City Hall' };
    const res = await request(app).post('/api/stakeholders').send(payload);
    expect(res.status).toBe(400);
  });

  it('Negative: Should fail if stakeholder is an empty string', async () => {
    const payload = {
      stakeholder: '   ',
      date: '2026-07-25',
      venue: 'City Hall'
    };
    const res = await request(app).post('/api/stakeholders').send(payload);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/stakeholders', () => {
  it('Should return list of stakeholders not deleted', async () => {
    const res = await request(app).get('/api/stakeholders');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('Should return deleted stakeholders when is_deleted=true', async () => {
    const res = await request(app).get('/api/stakeholders?is_deleted=true');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('PUT /api/stakeholders/:id', () => {
  it('Should update an existing stakeholder engagement', async () => {
    const createRes = await request(app).post('/api/stakeholders').send({
      stakeholder: 'NGO',
      date: '2026-08-01',
      venue: 'HQ'
    });
    const id = createRes.body.data.id;
    
    const updatePayload = {
      stakeholder: 'NGO Updated',
      concern_issue: 'Environment'
    };
    
    const res = await request(app).put(`/api/stakeholders/${id}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body.data.stakeholder).toBe('NGO Updated');
    expect(res.body.data.concern_issue).toBe('Environment');
  });
});

describe('DELETE /api/stakeholders/:id', () => {
  it('Should soft delete a stakeholder engagement', async () => {
    const list = await request(app).get('/api/stakeholders');
    const id = list.body.data[0].id;
    
    const res = await request(app).delete(`/api/stakeholders/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(true);
  });

  it('Should return 404 when deleting non-existent stakeholder engagement', async () => {
    const res = await request(app).delete('/api/stakeholders/999999');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/stakeholders/:id/restore', () => {
  it('Should restore a soft-deleted stakeholder engagement', async () => {
    const listDeleted = await request(app).get('/api/stakeholders?is_deleted=true');
    const id = listDeleted.body.data[0].id;

    const res = await request(app).patch(`/api/stakeholders/${id}/restore`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(false);
  });

  it('Should return 404 when restoring non-existent stakeholder engagement', async () => {
    const res = await request(app).patch('/api/stakeholders/999999/restore');
    expect(res.status).toBe(404);
  });
});
