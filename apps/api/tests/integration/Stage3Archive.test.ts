import prisma from '../../src/lib/prisma';
import { ArchiveService } from '../../src/services/ArchiveService';

describe('Stage 3 semantic archive years', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('archives and restores Top Issue/LRP by semantic year, not created_at', async () => {
    const issue = 'Anonymous archive semantic issue';
    const program = 'Anonymous archive semantic LRP';
    await prisma.top_issues.create({
      data: { period: 'Q1', year: 2024, issue, created_at: new Date('2020-01-01T00:00:00.000Z') },
    });
    await prisma.lrp.create({
      data: { program, year: 2024, created_at: new Date('2020-01-01T00:00:00.000Z') },
    });

    try {
      const service = new ArchiveService();
      await service.archiveYear(2024);
      await expect(prisma.top_issues.findFirst({ where: { issue } })).resolves.toMatchObject({ is_archived: true });
      await expect(prisma.lrp.findFirst({ where: { program } })).resolves.toMatchObject({ is_archived: true });

      await service.restoreYear(2024);
      await expect(prisma.top_issues.findFirst({ where: { issue } })).resolves.toMatchObject({ is_archived: false });
      await expect(prisma.lrp.findFirst({ where: { program } })).resolves.toMatchObject({ is_archived: false });
    } finally {
      await prisma.top_issues.deleteMany({ where: { issue } });
      await prisma.lrp.deleteMany({ where: { program } });
    }
  });
});
