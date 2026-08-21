import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MASTER_DATA = [
  {
    category: 'Stakeholder Engagement',
    subCategories: [
      'Donasi',
      'Internal Meeting',
      'Issue',
      'Issue & Grievance',
      'Kehumasan',
      'Project CSR',
      'Security',
      'Support Project',
    ],
  },
  {
    category: 'Paper Work',
    subCategories: ['Data Processing (Olah Data)'],
  },
] as const;

export async function seedMasterData(client: PrismaClient): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.pics.upsert({
      where: { name: 'Ziya Ramadhani' },
      update: { is_active: true },
      create: { name: 'Ziya Ramadhani', is_active: true },
    });

    for (const entry of MASTER_DATA) {
      const category = await tx.categories.upsert({
        where: { name: entry.category },
        update: {},
        create: { name: entry.category },
      });

      for (const name of entry.subCategories) {
        await tx.sub_categories.upsert({
          where: {
            category_id_name: {
              category_id: category.id,
              name,
            },
          },
          update: {},
          create: { category_id: category.id, name },
        });
      }
    }
  });

  console.log('Canonical master-data seed completed successfully. Account setup is a separate command.');
}

seedMasterData(prisma)
  .catch((error) => {
    console.error('Canonical master-data seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
