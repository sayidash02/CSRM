# Implementation Plan: Seeding Daily Activities Categories and Subcategories

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the backend seed script to automatically populate specific sub-categories for "Stakeholder Engagement" and "Paper Work" categories, and then run the script to seed the database.

---

### Task 1: Update the Seed Script

**Files:**
- Modify: `apps/api/src/seed.ts`

- [ ] **Step 1: Define Stakeholder Engagement Sub-Categories**
  1. In `seed.ts`, locate the block where `stakeholderCat` is processed.
  2. Create an array: `const stakeholderSubCats = ['Donasi', 'internal meeting', 'issue', 'Issue dan Grievance', 'kehumasan', 'project CSR', 'Security', 'support project'];`.
  3. Replace the single "Donasi" insertion logic with a `for...of` loop over `stakeholderSubCats`.
  4. Inside the loop, check if the sub-category exists (`findFirst` where `name: subCatName` and `category_id: stakeholderCat.id`).
  5. If it does not exist, create it. If it does, optionally log that it already exists.

- [ ] **Step 2: Define Paper Work Sub-Categories**
  1. Locate the block where `paperworkCat` is processed.
  2. Create an array: `const paperworkSubCats = ['Olah data'];`.
  3. Replace the existing insertion logic with a `for...of` loop over `paperworkSubCats`.
  4. Inside the loop, check if the sub-category exists (`findFirst` where `name: subCatName` and `category_id: paperworkCat.id`).
  5. If it does not exist, create it.

- [ ] **Step 3: Save and Format**
  Ensure TypeScript syntax is correct and the `prisma` client is used properly inside the async `main` function.

---

### Task 2: Execute and Verify

- [ ] **Step 1: Run the Seed Script**
  1. Open the terminal and navigate to `apps/api`.
  2. Run `npx ts-node src/seed.ts` (ensure you are using a compatible environment, such as PowerShell or bash as needed).
  3. Verify the console output indicates successful seeding without errors.

- [ ] **Step 2: Commit Changes**
  1. Stage the changes: `git add apps/api/src/seed.ts`
  2. Commit: `git commit -m "chore: add specific sub-categories to seed script"`
