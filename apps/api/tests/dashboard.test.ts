import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clear related tables to ensure predictable counts
  await prisma.proposals.deleteMany();
  await prisma.grievance.deleteMany();
});

afterAll(async () => {
  await prisma.proposals.deleteMany({ where: { registration_no: { in: ['PRP-TEST-001', 'PRP-YEAR-2025', 'PRP-YEAR-2026'] } } });
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
    
    const { actionable, trends } = res.body.data;
    
    // Check Actionable
    expect(actionable.untouchedGrievances).toBe(1);
    
    // Check Trends (should have weekly properties)
    expect(trends).toHaveProperty('weeklyThisWeek');
    expect(trends).toHaveProperty('weeklyLastWeek');
    expect(trends).toHaveProperty('weeklyTrend');
    
    expect(res.body.data.filters.year).toBeNull();
  });

  it('Should scope statistics to a selected year or all years', async () => {
    await prisma.proposals.createMany({
      data: [
        {
          registration_no: 'PRP-YEAR-2025',
          date_received: new Date('2025-06-01T00:00:00.000Z'),
          institution: 'Year 2025',
          status: 'Accept',
          is_deleted: false
        },
        {
          registration_no: 'PRP-YEAR-2026',
          date_received: new Date('2026-06-01T00:00:00.000Z'),
          institution: 'Year 2026',
          status: 'Accept',
          is_deleted: false
        }
      ]
    });

    const selected = await request(app).get('/api/dashboard/stats?year=2025');
    expect(selected.status).toBe(200);
    expect(selected.body.data.filters.year).toBe(2025);
    expect(selected.body.data.totals.proposals).toBe(1);

    const all = await request(app).get('/api/dashboard/stats?year=All');
    expect(all.status).toBe(200);
    expect(all.body.data.filters.year).toBeNull();
    expect(all.body.data.totals.proposals).toBe(3);

    const invalid = await request(app).get('/api/dashboard/stats?year=1800');
    expect(invalid.status).toBe(400);
  });
});
