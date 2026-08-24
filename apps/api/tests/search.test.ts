import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';

describe('GET /api/search', () => {
  beforeAll(async () => {
    // Seed a test item in top_issues and grievance
    await prisma.top_issues.create({
      data: {
        issue: 'Pencarian Global Cilamaya',
        description: 'Nelayan terdampak jalur pipa pantai utara',
        period: 'Q3 2026',
        year: 2026,
        is_deleted: false,
      },
    });

    await prisma.grievance.create({
      data: {
        register_no: 'GRV-SEARCH-001',
        log_date: new Date('2026-08-01'),
        complainant_name: 'Pak Nelayan Cilamaya',
        category: 'Kompensasi',
        significance: 'High',
        status: 'Open',
        description: 'Tuntutan ganti rugi class action',
        is_deleted: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.top_issues.deleteMany({ where: { issue: 'Pencarian Global Cilamaya' } });
    await prisma.grievance.deleteMany({ where: { register_no: 'GRV-SEARCH-001' } });
    await prisma.$disconnect();
  });

  it('returns empty array when q is missing or empty', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it('searches across multiple modules when query matches', async () => {
    const res = await request(app).get('/api/search?q=Cilamaya');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const modules = res.body.data.map((item: any) => item.module);
    expect(modules).toContain('topissues');
    expect(modules).toContain('grievance');

    expect(res.body.meta.query).toBe('Cilamaya');
    expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
  });
});
