import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';

export const devReset = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Delete all operational data in safe FK order
    await tx.daily_activities.deleteMany({});
    await tx.stakeholder_engagement.deleteMany({});
    await tx.top_issues.deleteMany({});
    await tx.proposals.deleteMany({});
    await tx.csr_projects.deleteMany({});
    await tx.grievance.deleteMany({});
    await tx.lrp.deleteMany({});
    await tx.sync_log.deleteMany({});
    await tx.pics.deleteMany({});
    await tx.sub_categories.deleteMany({});
    await tx.categories.deleteMany({});

    // 2. Re-seed categories
    const categories = ['Pendidikan', 'Kesehatan', 'Infrastruktur', 'Pemberdayaan Ekonomi', 'Lingkungan', 'Sosial & Budaya', 'Kapasitas Kelembagaan'];
    for (const name of categories) {
      await tx.categories.create({ data: { name } });
    }

    // 3. Re-seed sub_categories
    const createdCategories = await tx.categories.findMany();
    const catMap = new Map(createdCategories.map(c => [c.name, c.id]));
    
    const subCats = [
      { c: 'Pendidikan', s: 'Beasiswa' },
      { c: 'Pendidikan', s: 'Fasilitas Sekolah' },
      { c: 'Kesehatan', s: 'Pengobatan Gratis' },
      { c: 'Kesehatan', s: 'Fasilitas Kesehatan' },
      { c: 'Infrastruktur', s: 'Jalan & Jembatan' },
      { c: 'Infrastruktur', s: 'Air Bersih' }
    ];

    for (const item of subCats) {
      const catId = catMap.get(item.c);
      if (catId) {
        await tx.sub_categories.create({ data: { category_id: catId, name: item.s } });
      }
    }
  });

  res.status(200).json({ message: 'Database reset and seeded successfully' });
});

