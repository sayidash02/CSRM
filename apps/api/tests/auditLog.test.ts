import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';

describe('Audit Logs API & Interceptor', () => {
  let testActivityId: string;

  beforeAll(async () => {
    // Soft delete or clear test audit logs if needed
    await (prisma as any).audit_logs.deleteMany({ where: { entity_type: 'daily_activities' } });
  });

  afterAll(async () => {
    if (testActivityId) {
      await (prisma as any).daily_activities.deleteMany({ where: { id: BigInt(testActivityId) } });
    }
  });

  it('GET /api/audit-logs/:entityType/:entityId should validate invalid entityId', async () => {
    const res = await request(app).get('/api/audit-logs/daily_activities/invalid_id');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing or invalid entityType or entityId');
  });

  it('GET /api/audit-logs/:entityType/:entityId should return empty list when no logs exist', async () => {
    const res = await request(app).get('/api/audit-logs/daily_activities/999999');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('Prisma extension should create audit log on update', async () => {
    let cat = await prisma.categories.findFirst({ where: { name: 'Stakeholder Engagement' } });
    if (!cat) {
      cat = await prisma.categories.create({ data: { name: 'Stakeholder Engagement' } });
    }
    let subCat = await prisma.sub_categories.findFirst({ where: { category_id: cat.id } });
    if (!subCat) {
      subCat = await prisma.sub_categories.create({ data: { category_id: cat.id, name: 'Issue' } });
    }
    let pic = await prisma.pics.findFirst({ where: { name: 'Ziya Ramadhani' } });
    if (!pic) {
      pic = await prisma.pics.create({ data: { name: 'Ziya Ramadhani' } });
    }

    // 2. Create activity
    const activity = await prisma.daily_activities.create({
      data: {
        category_id: cat.id,
        sub_category_id: subCat.id,
        daily_activity_pics: { create: [{ pic_id: pic.id }] },
        activity_date: new Date('2026-08-10'),
        institution_group: 'Initial Inst',
        activity: 'Initial Activity',
        cost: 1000
      }
    });

    testActivityId = activity.id.toString();

    // 3. Update activity to trigger interceptor
    await prisma.daily_activities.update({
      where: { id: activity.id },
      data: {
        cost: 2000,
        institution_group: 'Updated Inst'
      }
    });

    // The mutation and audit insert are one awaited transaction, so the row is
    // visible immediately after update resolves.
    const res = await request(app).get(`/api/audit-logs/daily_activities/${testActivityId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const latestLog = res.body.data[0];
    expect(latestLog.entity_type).toBe('daily_activities');
    expect(latestLog.action).toBe('UPDATE');
    expect(latestLog.changes).toBeDefined();
    expect(String(latestLog.changes.cost.old)).toBe('1000');
    expect(String(latestLog.changes.cost.new)).toBe('2000');
    expect(latestLog.changes.institution_group).toEqual({ old: 'Initial Inst', new: 'Updated Inst' });
  });
});
