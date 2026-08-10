import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';

beforeAll(async () => {
  // Clean up existing records in dependency order
  await prisma.daily_activities.deleteMany({ where: { stakeholder: { name: { startsWith: 'TEST_STAKEHOLDER_' } } } });
  await prisma.stakeholder_engagement.deleteMany({ where: { stakeholder: { name: { startsWith: 'TEST_STAKEHOLDER_' } } } });
  await prisma.stakeholders.deleteMany({ where: { name: { startsWith: 'TEST_STAKEHOLDER_' } } });
});

afterAll(async () => {
  await prisma.daily_activities.deleteMany({ where: { stakeholder: { name: { startsWith: 'TEST_STAKEHOLDER_' } } } });
  await prisma.stakeholder_engagement.deleteMany({ where: { stakeholder: { name: { startsWith: 'TEST_STAKEHOLDER_' } } } });
  await prisma.stakeholders.deleteMany({ where: { name: { startsWith: 'TEST_STAKEHOLDER_' } } });
  await prisma.$disconnect();
});

describe('Master Stakeholders API (/api/master-stakeholders)', () => {
  describe('POST /api/master-stakeholders', () => {
    it('Positive: Should create a new master stakeholder', async () => {
      const res = await request(app)
        .post('/api/master-stakeholders')
        .send({ name: 'TEST_STAKEHOLDER_Alpha' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('TEST_STAKEHOLDER_Alpha');
      expect(res.body.data.is_active).toBe(true);
      expect(res.body.data.is_deleted).toBe(false);
    });

    it('Negative: Should return 400 when name is missing or empty string', async () => {
      const res1 = await request(app)
        .post('/api/master-stakeholders')
        .send({});
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/master-stakeholders')
        .send({ name: '   ' });
      expect(res2.status).toBe(400);
    });

    it('Negative: Should return 409 Conflict when name is duplicate', async () => {
      const res = await request(app)
        .post('/api/master-stakeholders')
        .send({ name: 'TEST_STAKEHOLDER_Alpha' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/master-stakeholders', () => {
    beforeAll(async () => {
      await request(app)
        .post('/api/master-stakeholders')
        .send({ name: 'TEST_STAKEHOLDER_Beta' });
    });

    it('Should return list of active master stakeholders ordered by name asc', async () => {
      const res = await request(app).get('/api/master-stakeholders');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      const testNames = res.body.data
        .map((s: any) => s.name)
        .filter((n: string) => n.startsWith('TEST_STAKEHOLDER_'));
      
      expect(testNames).toEqual(['TEST_STAKEHOLDER_Alpha', 'TEST_STAKEHOLDER_Beta']);
    });
  });

  describe('GET /api/master-stakeholders/:id', () => {
    let stakeholderId: string;

    beforeAll(async () => {
      const st = await prisma.stakeholders.findFirst({
        where: { name: 'TEST_STAKEHOLDER_Alpha' }
      });
      stakeholderId = st!.id.toString();
    });

    it('Positive: Should return stakeholder with nested 360 data (daily_activities & stakeholder_engagement)', async () => {
      const res = await request(app).get(`/api/master-stakeholders/${stakeholderId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id.toString()).toBe(stakeholderId);
      expect(res.body.data.name).toBe('TEST_STAKEHOLDER_Alpha');
      expect(Array.isArray(res.body.data.daily_activities)).toBe(true);
      expect(Array.isArray(res.body.data.stakeholder_engagement)).toBe(true);
    });

    it('Negative: Should return 404 for non-existent ID', async () => {
      const res = await request(app).get('/api/master-stakeholders/999999999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/master-stakeholders/:id', () => {
    let stakeholderId: string;

    beforeAll(async () => {
      const st = await prisma.stakeholders.findFirst({
        where: { name: 'TEST_STAKEHOLDER_Beta' }
      });
      stakeholderId = st!.id.toString();
    });

    it('Positive: Should update stakeholder name and active status', async () => {
      const res = await request(app)
        .put(`/api/master-stakeholders/${stakeholderId}`)
        .send({ name: 'TEST_STAKEHOLDER_Beta_Updated', is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('TEST_STAKEHOLDER_Beta_Updated');
      expect(res.body.data.is_active).toBe(false);
    });

    it('Negative: Should return 400 when updating with empty name', async () => {
      const res = await request(app)
        .put(`/api/master-stakeholders/${stakeholderId}`)
        .send({ name: '  ' });

      expect(res.status).toBe(400);
    });

    it('Negative: Should return 409 when updating to an existing duplicate name', async () => {
      const res = await request(app)
        .put(`/api/master-stakeholders/${stakeholderId}`)
        .send({ name: 'TEST_STAKEHOLDER_Alpha' });

      expect(res.status).toBe(409);
    });

    it('Negative: Should return 404 when updating non-existent ID', async () => {
      const res = await request(app)
        .put('/api/master-stakeholders/999999999')
        .send({ name: 'TEST_STAKEHOLDER_NonExistent' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/master-stakeholders/:id', () => {
    let stakeholderId: string;

    beforeAll(async () => {
      const st = await prisma.stakeholders.findFirst({
        where: { name: 'TEST_STAKEHOLDER_Beta_Updated' }
      });
      stakeholderId = st!.id.toString();
    });

    it('Positive: Should soft delete stakeholder (is_deleted: true)', async () => {
      const res = await request(app).delete(`/api/master-stakeholders/${stakeholderId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.is_deleted).toBe(true);

      // Verify getById returns 404 after soft delete
      const getRes = await request(app).get(`/api/master-stakeholders/${stakeholderId}`);
      expect(getRes.status).toBe(404);
    });

    it('Negative: Should return 404 when deleting non-existent ID', async () => {
      const res = await request(app).delete('/api/master-stakeholders/999999999');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/master-stakeholders/:id/restore', () => {
    let stakeholderId: string;

    beforeAll(async () => {
      const st = await prisma.stakeholders.findFirst({
        where: { name: 'TEST_STAKEHOLDER_Beta_Updated' }
      });
      stakeholderId = st!.id.toString();
    });

    it('Positive: Should restore soft-deleted stakeholder (is_deleted: false)', async () => {
      const res = await request(app).patch(`/api/master-stakeholders/${stakeholderId}/restore`);
      expect(res.status).toBe(200);
      expect(res.body.data.is_deleted).toBe(false);

      // Verify getById returns 200 after restore
      const getRes = await request(app).get(`/api/master-stakeholders/${stakeholderId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.name).toBe('TEST_STAKEHOLDER_Beta_Updated');
    });

    it('Negative: Should return 404 when restoring non-existent ID', async () => {
      const res = await request(app).patch('/api/master-stakeholders/999999999/restore');
      expect(res.status).toBe(404);
    });
  });
});
