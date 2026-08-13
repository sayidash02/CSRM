# Remove Stakeholder 360 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Stakeholder 360 feature, reverting the database schema to use text fields instead of relationships, and cleaning up backend/frontend code while preserving data.

**Architecture:** We will first run a data migration script to convert relational IDs back to text values. Then we will update `schema.sql` and `schema.prisma` to drop the tables/columns. Finally, we will remove the controllers, routes, and UI components associated with Stakeholder 360.

**Tech Stack:** Node.js, Express, Prisma, React 18, TypeScript.

---

### Task 1: Data Migration Script

**Files:**
- Create: `scripts/migrate-stakeholder-rollback.ts`

- [ ] **Step 1: Write migration script**
Create a script to copy `name` from `stakeholders` back to the text columns before we drop the relation. Note: since `institution_group` might have been replaced or renamed in Prisma, check the current Prisma schema if it still has `institution_group` or if we need to add it back via SQL first.
Wait, if the text columns (`institution_group`, `stakeholder`) were *removed* from the DB, we cannot copy data to them until we add them back.
Therefore, the script must execute raw SQL to ADD the text columns back, copy the data, and then we will drop the IDs in Task 2.

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Add back the text columns
  await prisma.$executeRawUnsafe(`ALTER TABLE daily_activities ADD COLUMN IF NOT EXISTS institution_group VARCHAR(255);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE stakeholder_engagement ADD COLUMN IF NOT EXISTS stakeholder VARCHAR(255);`);
  
  // Migrate daily_activities
  await prisma.$executeRawUnsafe(`
    UPDATE daily_activities da
    JOIN stakeholders s ON da.stakeholder_id = s.id
    SET da.institution_group = s.name
    WHERE da.stakeholder_id IS NOT NULL;
  `);

  // Migrate stakeholder_engagement
  await prisma.$executeRawUnsafe(`
    UPDATE stakeholder_engagement se
    JOIN stakeholders s ON se.stakeholder_id = s.id
    SET se.stakeholder = s.name
    WHERE se.stakeholder_id IS NOT NULL;
  `);

  console.log("Data migration completed.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Execute the script**
Run: `npx ts-node scripts/migrate-stakeholder-rollback.ts`
Expected: Output "Data migration completed." without errors.

- [ ] **Step 3: Commit**
```bash
git add scripts/migrate-stakeholder-rollback.ts
git commit -m "chore: run data migration for stakeholder rollback"
```

---

### Task 2: Revert Database Schema

**Files:**
- Modify: `schema.sql`
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Update `schema.sql`**
Remove `stakeholders` table.
In `daily_activities`: remove `stakeholder_id` and `stakeholder_engagement_id`, keep `institution_group VARCHAR(255)`.
In `stakeholder_engagement`: remove `stakeholder_id`, keep `stakeholder VARCHAR(255)`.
In `csr_projects`: remove `grievance_id` if present.

- [ ] **Step 2: Update `apps/api/prisma/schema.prisma`**
Reflect the changes made in `schema.sql`. Remove the `stakeholders` model and all related relational fields (`stakeholder_id`, etc.) in `daily_activities`, `stakeholder_engagement`, and `csr_projects`. Add back `institution_group` (String?) and `stakeholder` (String?).

- [ ] **Step 3: Run Prisma Generate**
Run: `cd apps/api && npx prisma generate`
Expected: Successfully generates Prisma Client.

- [ ] **Step 4: Commit**
```bash
git add schema.sql apps/api/prisma/schema.prisma
git commit -m "refactor(db): revert stakeholder 360 schema changes"
```

---

### Task 3: Backend Clean-up

**Files:**
- Delete: `apps/api/src/controllers/StakeholderController.ts` (if exists)
- Delete: `apps/api/src/controllers/StakeholdersController.ts` (if exists)
- Delete: `apps/api/src/routes/stakeholder.routes.ts` (and related route files)
- Modify: `apps/api/src/app.ts` (or `apps/api/src/routes/index.ts`)
- Modify: `apps/api/src/controllers/DailyActivitiesController.ts`
- Modify: `apps/api/src/controllers/CsrProjectsController.ts`

- [ ] **Step 1: Delete Stakeholder API files**
Run: `rm apps/api/src/controllers/StakeholderController.ts apps/api/src/controllers/StakeholdersController.ts apps/api/src/routes/stakeholder.routes.ts` (Ignore errors if files don't exist exactly with these names, verify via `ls`).

- [ ] **Step 2: Unmount routes**
Remove imports and `app.use()` calls for stakeholders in `apps/api/src/app.ts` (or the main router file).

- [ ] **Step 3: Revert controllers**
In `DailyActivitiesController.ts` and `CsrProjectsController.ts`, remove any `include: { stakeholder: true }` from Prisma queries. Ensure `institution_group` is extracted from `req.body` and saved, replacing `stakeholder_id`.

- [ ] **Step 4: Test Compilation**
Run: `cd apps/api && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/api/src
git commit -m "refactor(api): remove stakeholder 360 backend logic"
```

---

### Task 4: Frontend Clean-up

**Files:**
- Delete: `apps/web/src/features/stakeholders/Stakeholder360.tsx`
- Delete: `apps/web/src/api/stakeholders.ts` (if exists)
- Delete: `apps/web/src/hooks/useStakeholders.ts` (if exists)
- Modify: `apps/web/src/app/App.tsx` (or Router)
- Modify: `apps/web/src/features/daily-activities/` (Form components)
- Modify: `apps/web/src/features/stakeholders/` (Form components)
- Modify: `apps/web/src/features/csr-projects/` (Form components)

- [ ] **Step 1: Delete Stakeholder UI files**
Remove the profile page and custom hooks.

- [ ] **Step 2: Remove Routes & Sidebar Links**
In `App.tsx` (or router config), remove the route `/stakeholders/:id`. In the sidebar/layout component, remove the link to "Master Stakeholders".

- [ ] **Step 3: Revert Form Inputs**
In the form files for Daily Activities, Stakeholder Engagement, and CSR Projects, change the `Stakeholder` field from a Searchable Combobox (which emits an ID) back to a standard Text Input (which emits a string).

- [ ] **Step 4: Test Compilation**
Run: `cd apps/web && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src
git commit -m "refactor(web): remove stakeholder 360 UI and revert forms"
```
