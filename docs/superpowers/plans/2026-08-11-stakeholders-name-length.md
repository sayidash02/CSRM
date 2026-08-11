# Stakeholders Name Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase the maximum character length for the `stakeholders.name` column from 100 to 255 to resolve `PrismaClientKnownRequestError` during Excel import.

**Architecture:** A simple database schema change (SQL and Prisma) combined with an application-level safety net using a truncation function on import.

**Tech Stack:** Prisma, SQL, TypeScript

---

### Task 1: Update Database Schema

**Files:**
- Modify: `schema.sql`
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Update SQL Schema**
Modify `schema.sql` to change the `name` column definition in the `stakeholders` table from `VARCHAR(100)` to `VARCHAR(255)`.

Find this exact line:
```sql
  name VARCHAR(100) NOT NULL UNIQUE,
```

Replace with:
```sql
  name VARCHAR(255) NOT NULL UNIQUE,
```

- [ ] **Step 2: Update Prisma Schema**
Modify `apps/api/prisma/schema.prisma` to change the `@db.VarChar(100)` annotation on the `name` field in the `stakeholders` model.

Find this exact line:
```prisma
  name                   String                   @unique @db.VarChar(100)
```

Replace with:
```prisma
  name                   String                   @unique @db.VarChar(255)
```

- [ ] **Step 3: Generate Prisma Client & Push DB**
Run the following commands to ensure Prisma reads the new schema and pushes it to the test database.

Run: 
```bash
npx prisma generate
npx dotenv -e .env.test -- npx prisma db push --accept-data-loss
```
Expected: Successfully generated Prisma Client and synchronized the test database.

- [ ] **Step 4: Commit**
```bash
git add schema.sql apps/api/prisma/schema.prisma
git commit -m "fix(db): increase stakeholders.name limit to 255 characters"
```

### Task 2: Apply Hard Truncation in Import Service

**Files:**
- Modify: `apps/api/src/services/ExcelImportService.ts`

- [ ] **Step 1: Add truncation to stakeholder creation**
Modify `apps/api/src/services/ExcelImportService.ts` to wrap the `name` variable with `truncStr(name, 255)` when creating a new stakeholder.

Find this exact line inside the `uniqueStakeholdersToCreate.entries()` loop (around line 858):
```typescript
          const created = await tx.stakeholders.create({ data: { name } });
```

Replace with:
```typescript
          const created = await tx.stakeholders.create({ data: { name: truncStr(name, 255) } });
```

- [ ] **Step 2: Run all tests to verify**
Run the backend tests to ensure the application still passes successfully and there are no Prisma type errors.

Run:
```bash
npm run test
```
Expected: All tests pass.

- [ ] **Step 3: Commit**
```bash
git add apps/api/src/services/ExcelImportService.ts
git commit -m "fix(import): truncate new stakeholder names to 255 characters"
```
