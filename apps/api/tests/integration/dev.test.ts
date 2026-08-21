import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import { createSession } from '../../src/lib/auth';

describe('Dev Routes Guard', () => {
  const originalEnv = process.env.NODE_ENV;

  async function authCookie(): Promise<string> {
    return `crms_session=${createSession({ id: 0n, username: 'dev-test', role: 'USER' })}`;
  }

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should return 404 in production environment', async () => {
    process.env.NODE_ENV = 'production';
    const response = await request(app).delete('/api/dev/reset').set('Cookie', await authCookie());
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('should return 404 when the environment is not explicitly development', async () => {
    process.env.NODE_ENV = 'staging';
    const response = await request(app).delete('/api/dev/reset').set('Cookie', await authCookie());
    expect(response.status).toBe(404);
  });
});

describe('Dev Reset Controller (Non-Production)', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalResetFlag = process.env.CRMS_ENABLE_DEV_RESET;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    process.env.CRMS_ENABLE_DEV_RESET = 'true';
    await prisma.daily_activities.deleteMany({});
    await prisma.pics.deleteMany({});
    await prisma.sub_categories.deleteMany({});
    await prisma.categories.deleteMany({});
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalEnv;
    if (originalResetFlag === undefined) delete process.env.CRMS_ENABLE_DEV_RESET;
    else process.env.CRMS_ENABLE_DEV_RESET = originalResetFlag;
    await prisma.daily_activities.deleteMany({});
    await prisma.pics.deleteMany({});
    await prisma.sub_categories.deleteMany({});
    await prisma.categories.deleteMany({});
  });

  it('should delete data and re-seed categories', async () => {
    const category = await prisma.categories.create({ data: { name: 'Test Category' } });
    const subCategory = await prisma.sub_categories.create({ data: { category_id: category.id, name: 'Test SubCategory' } });
    const pic = await prisma.pics.create({ data: { name: 'Test PIC' } });
    await prisma.daily_activities.create({
      data: {
        activity_date: new Date(),
        activity: 'Test',
        address: 'Addr',
        focus: 'Focus',
        location: 'Loc',
        cost: 100,
        description_result: 'Desc',
        daily_activity_pics: { create: [{ pic_id: pic.id }] },
        category_id: category.id,
        sub_category_id: subCategory.id
      }
    });

    const cookie = `crms_session=${createSession({ id: 0n, username: 'dev-test', role: 'USER' })}`;
    const response = await request(app).delete('/api/dev/reset').set('Cookie', cookie);
    expect(response.status).toBe(200);

    const activitiesCount = await prisma.daily_activities.count();
    const picsCount = await prisma.pics.count();
    expect(activitiesCount).toBe(0);
    expect(picsCount).toBe(0);

    const seededCategories = await prisma.categories.count();
    expect(seededCategories).toBeGreaterThan(0);
  });
});
