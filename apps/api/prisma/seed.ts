import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Ensure at least one PIC exists
  const pic = await prisma.pics.upsert({
    where: { name: 'Ziya Ramadhani' },
    update: {},
    create: {
      name: 'Ziya Ramadhani',
      is_active: true
    }
  });

  // 2. Stakeholder Engagement Category & Sub-categories
  const catStakeholder = await prisma.categories.upsert({
    where: { name: 'Stakeholder Engagement' },
    update: {},
    create: { name: 'Stakeholder Engagement' }
  });

  const stakeholderSubCats = [
    'Donasi', 'Internal meeting', 'Issue', 'Issue dan Grievance',
    'Kehumasan', 'Project CSR', 'Security', 'Support project'
  ];

  for (const name of stakeholderSubCats) {
    const existing = await prisma.sub_categories.findFirst({
      where: { category_id: catStakeholder.id, name }
    });
    
    if (!existing) {
      await prisma.sub_categories.create({
        data: { category_id: catStakeholder.id, name }
      });
    }
  }

  // 3. Paper Work Category & Sub-categories
  const catPaperWork = await prisma.categories.upsert({
    where: { name: 'Paper Work' },
    update: {},
    create: { name: 'Paper Work' }
  });

  const existingPaper = await prisma.sub_categories.findFirst({
    where: { category_id: catPaperWork.id, name: 'Olah data' }
  });

  if (!existingPaper) {
    await prisma.sub_categories.create({
      data: { category_id: catPaperWork.id, name: 'Olah data' }
    });
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
