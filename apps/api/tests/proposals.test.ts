import request from 'supertest';
import app from '../src/app';
import proposalsRouter from '../src/routes/proposals';
import prisma from '../src/lib/prisma';

app.use('/api/proposals', proposalsRouter);

beforeAll(async () => {
  await prisma.proposals.deleteMany();
});

describe('POST /api/proposals', () => {
  it('Positive: Should create a new proposal', async () => {
    const payload = {
      registration_no: 'PROP-001',
      date_received: '2026-07-30',
      institution: 'Inst A',
      status: 'Accept'
    };
    const res = await request(app).post('/api/proposals').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.registration_no).toMatch(/^PROP-2026-\d{4}$/);
    expect(res.body.data.institution).toBe('Inst A');
  });

  it('Negative: Should fail if required field missing', async () => {
    const payload = { registration_no: 'PROP-002' };
    const res = await request(app).post('/api/proposals').send(payload);
    expect(res.status).toBe(400);
  });

  it('Ignores a client-supplied registration number and allocates a new one', async () => {
    const payload = { 
      registration_no: 'PROP-001',
      date_received: '2026-07-30',
      institution: 'Inst B',
      status: 'Accept'
    };
    const res = await request(app).post('/api/proposals').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.registration_no).toMatch(/^PROP-2026-\d{4}$/);
    expect(res.body.data.registration_no).not.toBe('PROP-001');
  });
});

describe('GET /api/proposals', () => {
  it('Should return list of proposals not deleted', async () => {
    const res = await request(app).get('/api/proposals');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('Should return deleted proposals when is_deleted=true', async () => {
    const res = await request(app).get('/api/proposals?is_deleted=true');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('DELETE /api/proposals/:id', () => {
  it('Should soft delete a proposal', async () => {
    const list = await request(app).get('/api/proposals');
    const id = list.body.data[0].id;
    
    const res = await request(app).delete(`/api/proposals/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(true);

    const listAfter = await request(app).get('/api/proposals');
    expect(listAfter.body.data.some((item: any) => item.id === id)).toBe(false);

    const listDeleted = await request(app).get('/api/proposals?is_deleted=true');
    expect(listDeleted.body.data.some((item: any) => item.id === id)).toBe(true);
  });

  it('Should return 404 when deleting non-existent proposal', async () => {
    const res = await request(app).delete('/api/proposals/999999');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/proposals/:id/restore', () => {
  it('Should restore a deleted proposal', async () => {
    const listDeleted = await request(app).get('/api/proposals?is_deleted=true');
    const id = listDeleted.body.data[0].id;

    const res = await request(app).patch(`/api/proposals/${id}/restore`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(false);

    const listAfter = await request(app).get('/api/proposals');
    expect(listAfter.body.data.some((item: any) => item.id === id)).toBe(true);
  });

  it('Should return 404 when restoring non-existent proposal', async () => {
    const res = await request(app).patch('/api/proposals/999999/restore');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/proposals/:id', () => {
  it('Should update an existing proposal', async () => {
    const payload = {
      registration_no: 'PROP-003',
      date_received: '2026-07-31',
      institution: 'Inst C',
      status: 'Accept'
    };
    const createRes = await request(app).post('/api/proposals').send(payload);
    const id = createRes.body.data.id;
    
    const updatePayload = {
      registration_no: 'CLIENT-MUST-NOT-RENUMBER',
      date_received: '2026-08-01',
      institution: 'Inst C Updated',
      status: 'Decline'
    };
    
    const res = await request(app).put(`/api/proposals/${id}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body.data.registration_no).toBe(createRes.body.data.registration_no);
    expect(res.body.data.institution).toBe('Inst C Updated');
    expect(res.body.data.status).toBe('Decline');
  });
});
