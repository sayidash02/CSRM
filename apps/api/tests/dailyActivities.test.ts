import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.daily_activities.deleteMany();
  await prisma.sub_categories.deleteMany();
  await prisma.categories.deleteMany();
  await prisma.pics.deleteMany();

  await prisma.categories.create({ data: { id: 1, name: 'Stakeholder Engagement' }});
  await prisma.sub_categories.create({ data: { id: 1, category_id: 1, name: 'Issue' }});
  await prisma.pics.create({ data: { id: 1, name: 'Ziya Ramadhani' }});
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/daily-activities', () => {
  it('Positive: Should create a new daily activity', async () => {
    const payload = {
      activity_date: '2026-07-25',
      activity: 'Kunjungan Lapangan',
      pic_id: 1,
      category_id: 1,
      sub_category_id: 1
    };
    const res = await request(app).post('/api/daily-activities').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.activity).toBe('Kunjungan Lapangan');
  });

  it('Negative: Should fail if required field missing', async () => {
    const payload = { activity_date: '2026-07-25' };
    const res = await request(app).post('/api/daily-activities').send(payload);
    expect(res.status).toBe(400);
  });

  it('Negative: Should fail if foreign key does not exist', async () => {
    const payload = {
      activity_date: '2026-07-25',
      activity: 'Kunjungan Lapangan',
      pic_id: 999, // Doesn't exist
      category_id: 1,
      sub_category_id: 1
    };
    const res = await request(app).post('/api/daily-activities').send(payload);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/daily-activities', () => {
  it('Should return list of activities not deleted', async () => {
    const res = await request(app).get('/api/daily-activities');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('DELETE /api/daily-activities/:id', () => {
  it('Should soft delete an activity', async () => {
    const list = await request(app).get('/api/daily-activities');
    const id = list.body.data[0].id;
    
    const res = await request(app).delete(`/api/daily-activities/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(true);

    const listAfter = await request(app).get('/api/daily-activities');
    expect(listAfter.body.data.length).toBe(0);
  });
});
