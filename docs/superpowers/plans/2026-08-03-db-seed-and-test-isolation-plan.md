# Database Seeding & Test Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a robust Prisma seeder for initial Master Data and isolate integration tests using a separate test database to prevent data loss.

**Architecture:** A standalone TypeScript script (`prisma/seed.ts`) will act as the master data seeder via `upsert`. Test commands will be wrapped with `dotenv-cli` to point to a `.env.test` file overriding the `DATABASE_URL`.

**Tech Stack:** Prisma, TypeScript, Node.js, `dotenv-cli`, Jest.

---

### Task 1: Create Prisma Seeder

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Write the seeder script**

Create `apps/api/prisma/seed.ts` with the following content:
```typescript
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
    // We cannot upsert easily by name only if there's no unique constraint on name. 
    // Wait, sub_categories has UNIQUE (category_id, name).
    // Prisma upsert needs a unique identifier. Since it's a compound unique key, we can use it.
    // However, Prisma upsert syntax for compound keys is a bit tricky if not explicitly named.
    // Let's just find first, then create if not exists to be safe and simple.
    
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
```

- [ ] **Step 2: Add Prisma seed config to package.json**

Modify `apps/api/package.json` to include the `prisma.seed` configuration. Add this at the root level of the JSON:
```json
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
```

- [ ] **Step 3: Run the seeder to verify**

Run: `npx prisma db seed` in `apps/api`
Expected: Outputs "Seeding Database..." and "Seeding finished successfully."

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/seed.ts apps/api/package.json
git commit -m "feat(api): add prisma seeder for master data"
```

### Task 2: Configure Test Database Isolation

**Files:**
- Create: `apps/api/.env.test`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install dotenv-cli**

Run: `npm install -D dotenv-cli` inside `apps/api`

- [ ] **Step 2: Create test environment file**

Create `apps/api/.env.test` with the following content:
```env
# URL for the test database
DATABASE_URL="mysql://root:@localhost:3306/crms_test"
```

- [ ] **Step 3: Update test scripts in package.json**

Modify the `"test"` script in `apps/api/package.json` to use `dotenv-cli`:
Replace:
```json
"test": "jest"
```
With:
```json
"test": "dotenv -e .env.test -- jest"
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json apps/api/.env.test
git commit -m "chore(api): configure isolated test database environment"
```

### Task 3: Cleanup Frontend Hardcoded Data

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Remove unused SUB_CATS array**

In `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`, find and delete the following line (around line 28):
```typescript
const SUB_CATS = ["Donasi","Internal Meeting","Issue","Issue & Grievance","Kehumasan","Project CSR","Security","Support Project","Data Processing (Olah Data)"];
```

- [ ] **Step 2: Verify frontend compilation**

Run: `npx tsc --noEmit` inside `apps/web`
Expected: Clean compilation with exit code 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
git commit -m "refactor(web): remove unused hardcoded sub-categories"
```
