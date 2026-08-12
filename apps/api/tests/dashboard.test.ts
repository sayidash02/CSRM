import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clear related tables to ensure predictable counts
  await prisma.proposals.deleteMany();
  await prisma.grievance.deleteMany();
  await prisma.sync_log.deleteMany();
});

afterAll(async () => {
  await prisma.proposals.deleteMany({ where: { registration_no: 'PRP-TEST-001' } });
  await prisma.grievance.deleteMany({ where: { register_no: 'GRV-TEST-001' } });
  await prisma.$disconnect();
});

describe('GET /api/dashboard/stats', () => {
  it('Should return updated dashboard stats structure with new metrics', async () => {
    // Insert mock data for stale proposals
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 20); // > 14 days ago
    
    await prisma.proposals.create({
      data: {
        registration_no: 'PRP-TEST-001',
        date_received: oldDate,
        institution: 'Test Inst',
        status: 'Accept',
        is_deleted: false
      }
    });

    // Insert mock data for untouched grievance
    await prisma.grievance.create({
      data: {
        register_no: 'GRV-TEST-001',
        log_date: new Date(),
        complainant_name: 'John',
        significance: 'High',
        status: 'Open',
        investigation: null,
        resolution: null,
        is_deleted: false
      }
    });

    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    
    const { actionable, trends, sync } = res.body.data;
    
    // Check Actionable
    expect(actionable.untouchedGrievances).toBe(1);
    
    // Check Trends (should have weekly properties)
    expect(trends).toHaveProperty('weeklyThisWeek');
    expect(trends).toHaveProperty('weeklyLastWeek');
    expect(trends).toHaveProperty('weeklyTrend');
    
    // Check Sync
    expect(sync).toHaveProperty('unsyncedCount');
    expect(sync).toHaveProperty('lastSyncDate');
  });
});
