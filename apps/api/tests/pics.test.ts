import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';

beforeAll(async () => {
  await prisma.daily_activity_pics.deleteMany();
  await prisma.pics.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('PIC Management API', () => {
  it('POST /api/pics - Should create a new active PIC', async () => {
    const res = await request(app).post('/api/pics').send({ name: 'Adit' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Adit');
    expect(res.body.data.is_active).toBe(true);
  });

  it('POST /api/pics - Should return 409 Conflict when creating duplicate active PIC', async () => {
    const res = await request(app).post('/api/pics').send({ name: 'Adit' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });

  it('DELETE /api/pics/:id - Should soft delete a PIC', async () => {
    const listRes = await request(app).get('/api/pics');
    const picId = listRes.body.data[0].id;

    const delRes = await request(app).delete(`/api/pics/${picId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.data.is_active).toBe(false);
  });

  it('POST /api/pics - Should reactivate a soft-deleted PIC when re-adding', async () => {
    const res = await request(app).post('/api/pics').send({ name: 'Adit' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Adit');
    expect(res.body.data.is_active).toBe(true);
  });
});
