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

    // Provision development accounts only in non-production environments if not already present
    if (process.env.NODE_ENV !== 'production') {
      const { hashPassword } = await import('../src/lib/auth.ts');
      await tx.users.upsert({
        where: { username: 'it-admin' },
        update: {},
        create: {
          username: 'it-admin',
          password_hash: hashPassword('M4gangUnjani'),
          role: 'ADMIN',
          is_active: true,
        },
      });

      await tx.users.upsert({
        where: { username: 'crs-user' },
        update: {},
        create: {
          username: 'crs-user',
          password_hash: hashPassword('M4gangUnjani'),
          role: 'USER',
          is_active: true,
        },
      });
      console.log('Development accounts verified: it-admin / crs-user. In production, use: pnpm account:setup-admin');
    }

    // Ensure proposals table check constraints are compatible
    try {
      await tx.$executeRawUnsafe('ALTER TABLE `proposals` DROP CHECK `proposals_chk_1`').catch(() => undefined);
    } catch {
      // Ignore if not present
    }
  });

  console.log('Canonical master-data & admin seed completed successfully.');
}

seedMasterData(prisma)
  .catch((error) => {
    console.error('Canonical master-data seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
