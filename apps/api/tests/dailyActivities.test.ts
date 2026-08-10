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

describe('DELETE and RESTORE /api/daily-activities/:id', () => {
  it('Should soft delete and then restore an activity', async () => {
    const list = await request(app).get('/api/daily-activities');
    const id = list.body.data[0].id;
    
    const res = await request(app).delete(`/api/daily-activities/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.is_deleted).toBe(true);

    const listAfter = await request(app).get('/api/daily-activities');
    expect(listAfter.body.data.length).toBe(0);

    const listDeleted = await request(app).get('/api/daily-activities?is_deleted=true');
    expect(listDeleted.status).toBe(200);
    expect(listDeleted.body.data.length).toBe(1);
    expect(listDeleted.body.data[0].id).toBe(id);

    const restoreRes = await request(app).patch(`/api/daily-activities/${id}/restore`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.is_deleted).toBe(false);

    const listRestored = await request(app).get('/api/daily-activities');
    expect(listRestored.body.data.length).toBe(1);
  });
});

describe('PUT /api/daily-activities/:id', () => {
  it('Should update an existing activity', async () => {
    // create one first because the previous test deleted it
    const payload = {
      activity_date: '2026-07-25',
      activity: 'Kunjungan Lapangan',
      pic_id: 1,
      category_id: 1,
      sub_category_id: 1
    };
    const createRes = await request(app).post('/api/daily-activities').send(payload);
    const id = createRes.body.data.id;
    
    const updatePayload = {
      activity_date: '2026-07-26',
      activity: 'Kunjungan Lapangan Updated',
      pic_id: 1,
      category_id: 1,
      sub_category_id: 1,
      cost: 500000
    };
    
    const res = await request(app).put(`/api/daily-activities/${id}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body.data.activity).toBe('Kunjungan Lapangan Updated');
    expect(res.body.data.cost).toBe('500000');
  });
});
