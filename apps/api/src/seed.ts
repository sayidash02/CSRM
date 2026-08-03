import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed process...');

  // 1. Seed Stakeholder Engagement Category
  let stakeholderCat = await prisma.categories.findFirst({ where: { name: 'Stakeholder Engagement' } });
  if (!stakeholderCat) {
    stakeholderCat = await prisma.categories.create({ data: { name: 'Stakeholder Engagement' } });
    console.log('Created category: Stakeholder Engagement');
  } else {
    console.log('Category already exists: Stakeholder Engagement');
  }

  const stakeholderSubCats = [
    'Donasi', 'internal meeting', 'issue', 'Issue dan Grievance', 
    'kehumasan', 'project CSR', 'Security', 'support project'
  ];

  for (const sub of stakeholderSubCats) {
    const existing = await prisma.sub_categories.findFirst({
      where: { name: sub, category_id: stakeholderCat.id }
    });
    if (!existing) {
      await prisma.sub_categories.create({
        data: { name: sub, category_id: stakeholderCat.id }
      });
      console.log(`  Created sub-category: ${sub}`);
    }
  }

  // 2. Seed Paper Work Category
  let paperworkCat = await prisma.categories.findFirst({ where: { name: 'Paper Work' } });
  if (!paperworkCat) {
    paperworkCat = await prisma.categories.create({ data: { name: 'Paper Work' } });
    console.log('Created category: Paper Work');
  } else {
    console.log('Category already exists: Paper Work');
  }

  const paperworkSubCats = ['Olah data'];

  for (const sub of paperworkSubCats) {
    const existing = await prisma.sub_categories.findFirst({
      where: { name: sub, category_id: paperworkCat.id }
    });
    if (!existing) {
      await prisma.sub_categories.create({
        data: { name: sub, category_id: paperworkCat.id }
      });
      console.log(`  Created sub-category: ${sub}`);
    }
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
