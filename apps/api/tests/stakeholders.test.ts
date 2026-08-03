import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import stakeholdersRouter from '../src/routes/stakeholders';

(BigInt.prototype as any).toJSON = function() { return this.toString(); };

const testApp = express();
testApp.use(express.json());
testApp.use('/api/stakeholders', stakeholdersRouter);

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.stakeholder_engagement.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/stakeholders', () => {
  it('Positive: Should create a new stakeholder engagement', async () => {
    const payload = {
      stakeholder: 'Government Official',
      date: '2026-07-25',
      venue: 'City Hall',
      concern_issue: 'Infrastructure',
      document_link: 'http://example.com/doc'
    };
    const res = await request(testApp).post('/api/stakeholders').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.stakeholder).toBe('Government Official');
  });

  it('Negative: Should fail if stakeholder is missing', async () => {
    const payload = { date: '2026-07-25', venue: 'City Hall' };
    const res = await request(testApp).post('/api/stakeholders').send(payload);
    expect(res.status).toBe(400);
  });

  it('Negative: Should fail if stakeholder is an empty string', async () => {
    const payload = {
      stakeholder: '   ',
      date: '2026-07-25',
      venue: 'City Hall'
    };
    const res = await request(testApp).post('/api/stakeholders').send(payload);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/stakeholders', () => {
  it('Should return list of stakeholders not deleted', async () => {
    const res = await request(testApp).get('/api/stakeholders');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('PUT /api/stakeholders/:id', () => {
  it('Should update an existing stakeholder engagement', async () => {
    const createRes = await request(testApp).post('/api/stakeholders').send({
      stakeholder: 'NGO',
      date: '2026-08-01',
      venue: 'HQ'
    });
    const id = createRes.body.data.id;
    
    const updatePayload = {
      stakeholder: 'NGO Updated',
      concern_issue: 'Environment'
    };
    
    const res = await request(testApp).put(`/api/stakeholders/${id}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body.data.stakeholder).toBe('NGO Updated');
    expect(res.body.data.concern_issue).toBe('Environment');
  });
});

describe('DELETE /api/stakeholders/:id', () => {
  it('Should soft delete a stakeholder engagement', async () => {
    const list = await request(testApp).get('/api/stakeholders');
    const id = list.body.data[0].id;
    
    const res = await request(testApp).delete(`/api/stakeholders/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(true);
  });
});
