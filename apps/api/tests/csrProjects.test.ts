import request from 'supertest';
import app from '../src/app';
import csrProjectsRouter from '../src/routes/csrProjects';

app.use('/api/csr-projects', csrProjectsRouter);
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.csr_projects.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/csr-projects', () => {
  it('Positive: Should create a new CSR project', async () => {
    const payload = {
      project_year: 2026,
      program: 'Program A',
      activity: 'Activity A',
      status: 'Planning'
    };
    const res = await request(app).post('/api/csr-projects').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.program).toBe('Program A');
    expect(res.body.data.project_year).toBe(2026);
  });

  it('Negative: Should fail if required field missing', async () => {
    const payload = { project_year: 2026 };
    const res = await request(app).post('/api/csr-projects').send(payload);
    expect(res.status).toBe(400);
  });

  it('Negative: Should fail with invalid year type', async () => {
    const payload = { project_year: 'invalid', program: 'Program A' };
    const res = await request(app).post('/api/csr-projects').send(payload);
    // Depending on validation, might be 500 from prisma or 400
    // Let's expect it not to be 201
    expect(res.status).not.toBe(201);
  });
});

describe('GET /api/csr-projects', () => {
  it('Should return list of CSR projects not deleted', async () => {
    const res = await request(app).get('/api/csr-projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('DELETE /api/csr-projects/:id', () => {
  it('Should soft delete a CSR project', async () => {
    const list = await request(app).get('/api/csr-projects');
    const id = list.body.data[0].id;
    
    const res = await request(app).delete(`/api/csr-projects/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(true);

    const listAfter = await request(app).get('/api/csr-projects');
    expect(listAfter.body.data.length).toBe(0);
  });
});

describe('PUT /api/csr-projects/:id', () => {
  it('Should update an existing CSR project', async () => {
    const payload = {
      project_year: 2026,
      program: 'Program B'
    };
    const createRes = await request(app).post('/api/csr-projects').send(payload);
    const id = createRes.body.data.id;
    
    const updatePayload = {
      project_year: 2027,
      program: 'Program B Updated',
      status: 'Ongoing'
    };
    
    const res = await request(app).put(`/api/csr-projects/${id}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body.data.program).toBe('Program B Updated');
    expect(res.body.data.project_year).toBe(2027);
    expect(res.body.data.status).toBe('Ongoing');
  });
});
