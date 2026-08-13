import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';

describe('AuditLog API Routes', () => {
  beforeEach(async () => {
    await prisma.audit_logs.deleteMany({});
  });

  afterAll(async () => {
    await prisma.audit_logs.deleteMany({});
  });

  it('should fetch audit logs for a given entityType and entityId', async () => {
    const log = await prisma.audit_logs.create({
      data: {
        entity_type: 'daily_activities',
        entity_id: 100n,
        action: 'UPDATE',
        changes: { cost: { old: 100, new: 200 } }
      }
    });

    const response = await request(app).get('/api/audit-logs/daily_activities/100');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].entity_type).toBe('daily_activities');
    expect(response.body.data[0].action).toBe('UPDATE');
  });

  it('should return 400 if entityId is invalid', async () => {
    const response = await request(app).get('/api/audit-logs/daily_activities/abc');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing or invalid entityType or entityId' });
  });
});
