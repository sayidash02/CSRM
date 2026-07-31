import request from 'supertest';
import express from 'express';
import grievanceRouter from '../src/routes/grievance';
import { PrismaClient } from '@prisma/client';

(BigInt.prototype as any).toJSON = function() { return this.toString(); };

const testApp = express();
testApp.use(express.json());
testApp.use('/api/grievance', grievanceRouter);

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.grievance.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/grievance', () => {
  it('Positive: Should create a new grievance', async () => {
    const payload = {
      register_no: 'GRV-2026-001',
      log_date: '2026-07-25',
      complainant_name: 'John Doe',
      significance: 'High'
    };
    const res = await request(testApp).post('/api/grievance').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.register_no).toBe('GRV-2026-001');
    expect(res.body.data.complainant_name).toBe('John Doe');
  });

  it('Negative: Should fail if required field missing', async () => {
    const payload = { register_no: 'GRV-2026-002' };
    const res = await request(testApp).post('/api/grievance').send(payload);
    expect(res.status).toBe(400);
  });

  it('Negative: Should fail if register_no is duplicate', async () => {
    const payload = {
      register_no: 'GRV-2026-001',
      log_date: '2026-07-25',
      complainant_name: 'Jane Doe',
      significance: 'Medium'
    };
    const res = await request(testApp).post('/api/grievance').send(payload);
    expect(res.status).toBe(409);
  });
});

describe('GET /api/grievance', () => {
  it('Should return list of grievances not deleted', async () => {
    const res = await request(testApp).get('/api/grievance');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('PUT /api/grievance/:id', () => {
  it('Should update an existing grievance', async () => {
    const list = await request(testApp).get('/api/grievance');
    const id = list.body.data[0].id;
    
    const updatePayload = {
      register_no: 'GRV-2026-001-UPD',
      log_date: '2026-07-26',
      complainant_name: 'John Doe Updated',
      significance: 'Low'
    };
    
    const res = await request(testApp).put(`/api/grievance/${id}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body.data.register_no).toBe('GRV-2026-001-UPD');
    expect(res.body.data.complainant_name).toBe('John Doe Updated');
    expect(res.body.data.significance).toBe('Low');
  });
});

describe('DELETE /api/grievance/:id', () => {
  it('Should soft delete a grievance', async () => {
    const list = await request(testApp).get('/api/grievance');
    const id = list.body.data[0].id;
    
    const res = await request(testApp).delete(`/api/grievance/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(true);

    const listAfter = await request(testApp).get('/api/grievance');
    expect(listAfter.body.data.length).toBe(0);
  });
});
