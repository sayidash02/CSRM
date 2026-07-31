import request from 'supertest';
import app from '../src/app';
import proposalsRouter from '../src/routes/proposals';
import { PrismaClient } from '@prisma/client';

app.use('/api/proposals', proposalsRouter);

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.proposals.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/proposals', () => {
  it('Positive: Should create a new proposal', async () => {
    const payload = {
      registration_no: 'PROP-001',
      date_received: '2026-07-30',
      institution: 'Inst A',
      status: 'Under Review'
    };
    const res = await request(app).post('/api/proposals').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.registration_no).toBe('PROP-001');
    expect(res.body.data.institution).toBe('Inst A');
  });

  it('Negative: Should fail if required field missing', async () => {
    const payload = { registration_no: 'PROP-002' };
    const res = await request(app).post('/api/proposals').send(payload);
    expect(res.status).toBe(400);
  });

  it('Negative: Should fail with duplicate registration_no', async () => {
    const payload = { 
      registration_no: 'PROP-001',
      date_received: '2026-07-30',
      institution: 'Inst B'
    };
    const res = await request(app).post('/api/proposals').send(payload);
    expect(res.status).toBe(409);
  });
});

describe('GET /api/proposals', () => {
  it('Should return list of proposals not deleted', async () => {
    const res = await request(app).get('/api/proposals');
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
    expect(listAfter.body.data.length).toBe(0);
  });
});

describe('PUT /api/proposals/:id', () => {
  it('Should update an existing proposal', async () => {
    const payload = {
      registration_no: 'PROP-003',
      date_received: '2026-07-31',
      institution: 'Inst C'
    };
    const createRes = await request(app).post('/api/proposals').send(payload);
    const id = createRes.body.data.id;
    
    const updatePayload = {
      registration_no: 'PROP-003-UPD',
      date_received: '2026-08-01',
      institution: 'Inst C Updated',
      status: 'Approved'
    };
    
    const res = await request(app).put(`/api/proposals/${id}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body.data.registration_no).toBe('PROP-003-UPD');
    expect(res.body.data.institution).toBe('Inst C Updated');
    expect(res.body.data.status).toBe('Approved');
  });
});
