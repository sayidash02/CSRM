import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let catId: bigint;
let subCatId: bigint;
let picId: bigint;

beforeAll(async () => {
  await prisma.daily_activities.deleteMany();

  let subCat = await prisma.sub_categories.findFirst({ where: { name: 'Issue' } });
  if (!subCat) {
    let cat = await prisma.categories.findUnique({ where: { name: 'Stakeholder Engagement' } });
    if (!cat) {
      cat = await prisma.categories.create({ data: { name: 'Stakeholder Engagement' } });
    }
    catId = cat.id;
    subCat = await prisma.sub_categories.create({ data: { category_id: catId, name: 'Issue' } });
  } else {
    catId = subCat.category_id;
  }
  subCatId = subCat.id;

  let pic = await prisma.pics.findFirst({ where: { name: 'Ziya Ramadhani' } });
  if (!pic) {
    pic = await prisma.pics.create({ data: { name: 'Ziya Ramadhani' } });
  }
  picId = pic.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/daily-activities', () => {
  it('Positive: Should create a new daily activity', async () => {
    const payload = {
      activity_date: '2026-07-25',
      activity: 'Kunjungan Lapangan',
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString()
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

  it('Should sort activities by cost ascending when sort_by=cost&sort_dir=asc', async () => {
    const payload1 = {
      activity_date: '2026-07-25',
      activity: 'Activity Expensive',
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString(),
      cost: 1000000
    };
    const payload2 = {
      activity_date: '2026-07-25',
      activity: 'Activity Cheap',
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString(),
      cost: 50000
    };

    const create1 = await request(app).post('/api/daily-activities').send(payload1);
    const create2 = await request(app).post('/api/daily-activities').send(payload2);

    const res = await request(app).get('/api/daily-activities?sort_by=cost&sort_dir=asc');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const costs = res.body.data.map((item: any) => Number(item.cost)).filter((c: number) => !isNaN(c));
    for (let i = 0; i < costs.length - 1; i++) {
      expect(costs[i]).toBeLessThanOrEqual(costs[i + 1]);
    }

    if (create1.body?.data?.id) await prisma.daily_activities.delete({ where: { id: BigInt(create1.body.data.id) } });
    if (create2.body?.data?.id) await prisma.daily_activities.delete({ where: { id: BigInt(create2.body.data.id) } });
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
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString()
    };
    const createRes = await request(app).post('/api/daily-activities').send(payload);
    const id = createRes.body.data.id;
    
    const updatePayload = {
      activity_date: '2026-07-26',
      activity: 'Kunjungan Lapangan Updated',
      pic_id: picId.toString(),
      category_id: catId.toString(),
      sub_category_id: subCatId.toString(),
      cost: 500000
    };
    
    const res = await request(app).put(`/api/daily-activities/${id}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body.data.activity).toBe('Kunjungan Lapangan Updated');
    expect(res.body.data.cost).toBe('500000');
  });
});
