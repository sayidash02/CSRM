# Implementation Plan: Multiple File Upload Support

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the schema and frontend `FileInput` component to allow multiple file uploads across all modules.

**Tech Stack:** React, Prisma, SQL.

---

### Task 1: Update Database Schema

**Files:**
- Modify: `schema.sql`
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Update schema.sql**
  Change the data type for the following document columns from `VARCHAR(500)` or `VARCHAR(255)` to `TEXT` in `schema.sql`:
  - `daily_activities.document_link`
  - `stakeholder_engagement.document_link`
  - `top_issues.main_document`
  - `top_issues.supporting_document`
  - `proposals.proposal_file`
  - `proposals.assessment_file`
  - `csr_projects.documentation_image`
  - `csr_projects.document`
  - `grievance.supporting_files`
  - `lrp.sharepoint_link`
- [ ] **Step 2: Update schema.prisma**
  Make the exact same column type changes in `apps/api/prisma/schema.prisma` (change `@db.VarChar(500)` or similar to `@db.Text`).
- [ ] **Step 3: Commit**
  ```bash
  git add schema.sql apps/api/prisma/schema.prisma
  git commit -m "chore(db): change document columns from VARCHAR to TEXT for multi-file support"
  ```

### Task 2: Modify FileInput Component

**Files:**
- Modify: `apps/web/src/components/ui/FileInput.tsx`

- [ ] **Step 1: Update FileInput Logic**
  Modify `FileInput` to support uploading multiple files at once.
  When `multiple` is true (or just support it generically), `value` can be a single URL or a JSON array of URLs (e.g. `["url1", "url2"]`).
  - Add logic to parse `value`: if it starts with `[`, `JSON.parse` it, otherwise wrap it in an array `[value]`.
  - Add `multiple` prop to `<input type="file" multiple>`.
  - In `onChange` for the input, loop through `e.target.files`, upload them sequentially or in parallel, gather the returned URLs, append them to the parsed existing array, and emit `JSON.stringify(newArray)`.
  - Render a list of files with "Hapus" buttons. Clicking "Hapus" removes that specific URL from the array and emits the updated JSON string. If array is empty, emit `""`.
- [ ] **Step 2: Commit**
  ```bash
  git add apps/web/src/components/ui/FileInput.tsx
  git commit -m "feat(web): add multiple file upload support to FileInput"
  ```

### Task 3: Prisma Generate & Verification

- [ ] **Step 1: Regenerate Prisma Client**
  Run `npx prisma generate` inside `apps/api` to reflect the `schema.prisma` changes.
- [ ] **Step 2: Run Typecheck**
  Run `npx tsc --noEmit` in both `apps/api` and `apps/web` to ensure nothing broke.
- [ ] **Step 3: Commit**
  If any type fixes were needed, commit them.

Report back when all tasks are complete.
