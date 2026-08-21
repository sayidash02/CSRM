import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';

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
    const res = await request(app).post('/api/grievance').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.register_no).toMatch(/^GRV-2026-\d{4}$/);
    expect(res.body.data.complainant_name).toBe('John Doe');
  });

  it('Negative: Should fail if required field missing', async () => {
    const payload = { register_no: 'GRV-2026-002' };
    const res = await request(app).post('/api/grievance').send(payload);
    expect(res.status).toBe(400);
  });

  it('Ignores a client-supplied registration number and allocates a new one', async () => {
    const payload = {
      register_no: 'GRV-2026-001',
      log_date: '2026-07-25',
      complainant_name: 'Jane Doe',
      significance: 'Medium'
    };
    const res = await request(app).post('/api/grievance').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.register_no).toMatch(/^GRV-2026-\d{4}$/);
    expect(res.body.data.register_no).not.toBe('GRV-2026-001');
  });
});

describe('GET /api/grievance', () => {
  it('Should return list of grievances not deleted', async () => {
    const res = await request(app).get('/api/grievance');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('Should return deleted grievances when is_deleted=true', async () => {
    const res = await request(app).get('/api/grievance?is_deleted=true');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('DELETE /api/grievance/:id', () => {
  it('Should soft delete a grievance', async () => {
    const list = await request(app).get('/api/grievance');
    const id = list.body.data[0].id;
    
    const res = await request(app).delete(`/api/grievance/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(true);

    const listAfter = await request(app).get('/api/grievance');
    expect(listAfter.body.data.some((item: any) => item.id === id)).toBe(false);

    const listDeleted = await request(app).get('/api/grievance?is_deleted=true');
    expect(listDeleted.status).toBe(200);
    expect(listDeleted.body.data.some((item: any) => item.id === id)).toBe(true);
  });

  it('Should return 404 when deleting non-existent grievance', async () => {
    const res = await request(app).delete('/api/grievance/999999');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/grievance/:id/restore', () => {
  it('Should restore a deleted grievance', async () => {
    const listDeleted = await request(app).get('/api/grievance?is_deleted=true');
    const id = listDeleted.body.data[0].id;

    const res = await request(app).patch(`/api/grievance/${id}/restore`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(false);

    const listAfter = await request(app).get('/api/grievance');
    expect(listAfter.body.data.some((item: any) => item.id === id)).toBe(true);
  });

  it('Should return 404 when restoring non-existent grievance', async () => {
    const res = await request(app).patch('/api/grievance/999999/restore');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/grievance/:id', () => {
  it('Should update an existing grievance', async () => {
    const list = await request(app).get('/api/grievance');
    const id = list.body.data[0].id;
    const originalRegisterNo = list.body.data[0].register_no;
    
    const updatePayload = {
      register_no: 'CLIENT-MUST-NOT-RENUMBER',
      log_date: '2026-07-26',
      complainant_name: 'John Doe Updated',
      significance: 'Low'
    };
    
    const res = await request(app).put(`/api/grievance/${id}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body.data.register_no).toBe(originalRegisterNo);
    expect(res.body.data.complainant_name).toBe('John Doe Updated');
    expect(res.body.data.significance).toBe('Low');
  });
});
