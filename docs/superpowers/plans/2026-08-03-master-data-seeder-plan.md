# Implementation Plan: Master Data Seeder

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a database seeder script to populate Categories and Sub Categories for the CRMS application.

**Tech Stack:** Node.js, Prisma, TypeScript.

---

### Task 1: Create Seed Script

**Files:**
- Create: `apps/api/src/seed.ts`

- [ ] **Step 1: Write seeder logic**
  Create `apps/api/src/seed.ts` with the following content:
  ```typescript
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
  ```
- [ ] **Step 2: Commit**
  ```bash
  git add apps/api/src/seed.ts
  git commit -m "feat(api): add master data seeder script for categories"
  ```

### Task 2: Add Seed Command

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Update package.json scripts**
  Add the `"seed": "ts-node src/seed.ts"` script into the `"scripts"` section of `apps/api/package.json`.
- [ ] **Step 2: Commit**
  ```bash
  git add apps/api/package.json
  git commit -m "chore(api): add seed script to package.json"
  ```

### Task 3: Execute Seed

- [ ] **Step 1: Run Seeder**
  Run `npm run seed` inside `apps/api`. Verify that it outputs "Seeding finished successfully."
