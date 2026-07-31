import request from 'supertest';
import express from 'express';
import topIssuesRouter from '../src/routes/topIssues';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const testApp = express();
testApp.use(express.json());
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
testApp.use('/api/top-issues', topIssuesRouter);

beforeAll(async () => {
  await prisma.top_issues.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/top-issues', () => {
  it('Positive: Should create a new top issue', async () => {
    const payload = {
      period: 'Q1 2026',
      issue: 'Water Quality',
      description: 'Local community complained about water quality',
      follow_up: 'Scheduled meeting',
      main_document: 'doc.pdf',
      supporting_document: 'supp.pdf',
      next_plan: 'Investigate'
    };
    const res = await request(testApp).post('/api/top-issues').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.issue).toBe('Water Quality');
  });

  it('Negative: Should fail if required field missing', async () => {
    const payload = { period: 'Q1 2026' }; // missing issue
    const res = await request(testApp).post('/api/top-issues').send(payload);
    expect(res.status).toBe(400);
  });

  it('Negative: Should fail if period missing', async () => {
    const payload = { issue: 'Water Quality' }; // missing period
    const res = await request(testApp).post('/api/top-issues').send(payload);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/top-issues', () => {
  it('Should return list of top issues not deleted', async () => {
    const res = await request(testApp).get('/api/top-issues');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('DELETE /api/top-issues/:id', () => {
  it('Should soft delete a top issue', async () => {
    const list = await request(testApp).get('/api/top-issues');
    const id = list.body.data[0].id;
    
    const res = await request(testApp).delete(`/api/top-issues/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(true);

    const listAfter = await request(testApp).get('/api/top-issues');
    expect(listAfter.body.data.length).toBe(0);
  });
});

describe('PUT /api/top-issues/:id', () => {
  it('Should update an existing top issue', async () => {
    // create one first because the previous test deleted it
    const payload = {
      period: 'Q2 2026',
      issue: 'Air Quality',
    };
    const createRes = await request(testApp).post('/api/top-issues').send(payload);
    const id = createRes.body.data.id;
    
    const updatePayload = {
      period: 'Q2 2026',
      issue: 'Air Quality Updated',
    };
    
    const res = await request(testApp).put(`/api/top-issues/${id}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body.data.issue).toBe('Air Quality Updated');
  });
});
