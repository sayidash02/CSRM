import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();



let catId: bigint;
let subCatId: bigint;
let picId: bigint;

beforeAll(async () => {
  await prisma.sync_log.deleteMany();
  await prisma.daily_activities.deleteMany();

  let cat = await prisma.categories.findUnique({ where: { name: 'Stakeholder Engagement' } });
  if (!cat) {
    cat = await prisma.categories.create({ data: { name: 'Stakeholder Engagement' } });
  }
  catId = cat.id;

  let subCat = await prisma.sub_categories.findFirst({ where: { category_id: catId, name: 'Issue' } });
  if (!subCat) {
    subCat = await prisma.sub_categories.create({ data: { category_id: catId, name: 'Issue' } });
  }
  subCatId = subCat.id;

  let pic = await prisma.pics.findUnique({ where: { name: 'Ziya Ramadhani' } });
  if (!pic) {
    pic = await prisma.pics.create({ data: { name: 'Ziya Ramadhani' } });
  }
  picId = pic.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Sync Flow', () => {
  it('Phase 3: Uji regenerasi 2x (Bab 14)', async () => {
    // 1. Insert initial data
    await prisma.daily_activities.create({
      data: {
        activity_date: new Date('2026-08-01'),
        activity: 'Sync Test 1',
        daily_activity_pics: { create: [{ pic_id: picId }] },
        category_id: catId,
        sub_category_id: subCatId
      }
    });

    // 2. Run sync 1 after a short delay
    await new Promise(r => setTimeout(r, 1500));
    const res1 = await request(app).post('/api/sync').send({});
    expect(res1.status).toBe(200);
    expect(res1.body.message).toBe('Sync completed successfully');

    // 3. Verify sync_log created
    const logs1 = await prisma.sync_log.findMany();
    expect(logs1.length).toBe(1);
    expect(logs1[0]!.status).toBe('SUCCESS');

    // 4. Verify unsynced count becomes 0
    const status1 = await request(app).get('/api/sync/status');
    expect(status1.status).toBe(200);
    expect(status1.body.data.unsynced_count).toBe(0);

    // 5. Insert another data (simulating passing time)
    await new Promise(r => setTimeout(r, 1500)); // wait 1.5s to ensure updated_at > synced_at
    await prisma.daily_activities.create({
      data: {
        activity_date: new Date('2026-08-02'),
        activity: 'Sync Test 2',
        daily_activity_pics: { create: [{ pic_id: picId }] },
        category_id: catId,
        sub_category_id: subCatId
      }
    });

    // 6. Verify unsynced count is 1
    const status2 = await request(app).get('/api/sync/status');
    expect(status2.status).toBe(200);
    expect(status2.body.data.unsynced_count).toBe(1);

    // 7. Run sync 2 (Regenerasi 2x) after a short delay
    await new Promise(r => setTimeout(r, 1500));
    const res2 = await request(app).post('/api/sync').send({});
    expect(res2.status).toBe(200);

    // 8. Verify we have 2 logs and count is 0
    const logs2 = await prisma.sync_log.findMany();
    expect(logs2.length).toBe(2);
    
    const status3 = await request(app).get('/api/sync/status');
    expect(status3.status).toBe(200);
    expect(status3.body.data.unsynced_count).toBe(0);
  }, 15000);
});
