# Implementation Plan: Split Date and Venue in Stakeholder Engagement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the Stakeholder Engagement module to separate the `date_venue` field into a `date` (DATE) and `venue` (String) field at the database level, update the UI form to have two separate inputs, and combine them visually in the data table and Excel export.

---

### Task 1: Database and Schema Updates

**Files:**
- Modify: `schema.sql`
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Update SQL Schema**
  1. In `schema.sql`, locate the `stakeholder_engagement` table creation block.
  2. Remove the `date_venue VARCHAR(255)` column.
  3. Add `date DATE` and `venue VARCHAR(255)` columns below `stakeholder`.

- [ ] **Step 2: Update Prisma Schema**
  1. In `apps/api/prisma/schema.prisma`, locate the `stakeholder_engagement` model.
  2. Remove `date_venue String? @db.VarChar(255)`.
  3. Add `date DateTime? @db.Date` and `venue String? @db.VarChar(255)`.

- [ ] **Step 3: Push Changes to Database**
  1. Run `cd apps/api && npx prisma db push --accept-data-loss` (to force the column drop in the local database).
  2. Run `cd apps/api && npx prisma generate` to update the Prisma Client types.

---

### Task 2: Backend Controller and Tests

**Files:**
- Modify: `apps/api/src/controllers/StakeholdersController.ts`
- Modify: `apps/api/tests/stakeholders.test.ts`

- [ ] **Step 1: Update Controller Logic**
  1. In `StakeholdersController.ts`, update the `req.body` destructuring in `create` and `update` functions.
  2. Replace `date_venue` with `date` and `venue`. Ensure `date` is passed as a valid Date object or ISO string if present, or null. (e.g. `date: date ? new Date(date) : null`)

- [ ] **Step 2: Update Integration Tests**
  1. In `stakeholders.test.ts`, find the test payloads for `POST` and `PUT`.
  2. Replace `date_venue: "2026-07-01 - Venue"` with `date: "2026-07-01"` and `venue: "Venue"`.
  3. Run `npx jest tests/stakeholders.test.ts` to ensure tests pass.

---

### Task 3: Frontend Module Updates

**Files:**
- Modify: `apps/web/src/features/stakeholders/StakeholdersModule.tsx`

- [ ] **Step 1: Update Interfaces and Form State**
  1. Update `Stakeholder` interface: replace `date_venue?: string` with `date?: string; venue?: string;`.
  2. In `StakeholderForm`, update initial state `f` to have `date: initial?.date ? initial.date.split('T')[0] : ""` and `venue: initial?.venue ?? ""`. Remove `date_venue`.
  3. Update `handleSave` payload to send `date` and `venue`.

- [ ] **Step 2: Update Form UI**
  1. Replace the combined `<Field>` with two separate `<Field>` components:
     - `label="Tanggal"`, input `type="date"`, bound to `f.date`.
     - `label="Tempat"`, input `type="text"`, bound to `f.venue`.

- [ ] **Step 3: Update DataTable and Export Logic**
  1. In `columns` array, modify the column that previously mapped to `date_venue`.
  2. Change its accessor/cell to combine `row.date` and `row.venue`. (e.g. `(row.date ? new Date(row.date).toLocaleDateString('id-ID') : "") + (row.date && row.venue ? " — " : "") + (row.venue || "")`).
  3. In `handleExportClick`, update the `exportData` mapping similarly to concatenate `date` and `venue` into one string for the Excel column.

- [ ] **Step 4: Verification & Commit**
  Run `npx tsc --noEmit` in `apps/web` to verify types.
  Commit all changes: `git add . && git commit -m "feat: split stakeholder date and venue fields"`
