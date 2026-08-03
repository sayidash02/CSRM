# Implementation Plan: Universal Sortable DataTable

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a central `DataTable` component with built-in sorting logic and refactor all 7 CRMS modules to use it instead of their raw HTML tables.

**Tech Stack:** React (TypeScript).

---

### Task 1: Create the DataTable Component

**Files:**
- Create: `apps/web/src/components/ui/DataTable.tsx`

- [ ] **Step 1: Write `DataTable.tsx`**
  Create the file with a reusable `DataTable` component. 
  It must accept `data` and `columns` props. The `columns` should be typed like `export type ColumnDef<T> = { header: string, accessor?: string, sortable?: boolean, className?: string, render?: (item: T, idx: number) => React.ReactNode }`.
  Implement internal state `sortConfig = { key, direction }`.
  Sort logic should handle strings (`localeCompare`) and numbers, and support nested accessors like `"pic.name"` via dot notation splitting.
  The `<thead>` should map the columns and render up/down arrow icons (`ArrowUp`, `ArrowDown` from `lucide-react`) next to the header if it's currently sorted.
  The `<tbody>` should map `sortedData` and then `columns`, calling `col.render(item, i)` if provided, else falling back to raw data. Ensure it uses `bg-card rounded-xl border border-border` styling to match the previous tables.
  
- [ ] **Step 2: Commit**
  Commit the new component with `git add apps/web/src/components/ui/DataTable.tsx` and `git commit -m "feat(web): add universal DataTable component with sorting"`.

---

### Task 2: Refactor Group 1 (Daily Activities & CSR)

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`
- Modify: `apps/web/src/features/csr-projects/CsrProjectsModule.tsx`

- [ ] **Step 1: Refactor Daily Activities**
  Import `DataTable` and `ColumnDef`. Define a `columns: ColumnDef<DailyActivity>[]` array that perfectly replicates the current table formatting (including `max-w-[]` classes, `formatDate`, `formatIDR`, multi-line divs, and Action buttons). 
  Replace the `<div className="bg-card..."> <table...> ... </table> </div>` block with `<DataTable columns={columns} data={displayed} />`.
  
- [ ] **Step 2: Refactor CSR Projects**
  Do the exact same for CSR projects. Define its specific columns perfectly replicating its `<tr>` output.

- [ ] **Step 3: Verification & Commit**
  Run `npx tsc --noEmit` in `apps/web`.
  Commit the changes.

---

### Task 3: Refactor Group 2 (Grievance, LRP, Proposals)

**Files:**
- Modify: `apps/web/src/features/grievance/GrievanceModule.tsx`
- Modify: `apps/web/src/features/lrp/LrpModule.tsx`
- Modify: `apps/web/src/features/proposals/ProposalsModule.tsx`

- [ ] **Step 1: Refactor Grievance, LRP, and Proposals**
  In each file, replace the raw table HTML with `<DataTable />`. Make sure to carefully define the `columns` array so no custom formatting (like badges or external links) is lost. Ensure `accessor` is set correctly for sorting.

- [ ] **Step 2: Verification & Commit**
  Run `npx tsc --noEmit` in `apps/web`.
  Commit the changes.

---

### Task 4: Refactor Group 3 (Stakeholders, Top Issues)

**Files:**
- Modify: `apps/web/src/features/stakeholders/StakeholdersModule.tsx`
- Modify: `apps/web/src/features/top-issues/TopIssuesModule.tsx`

- [ ] **Step 1: Refactor Stakeholders and Top Issues**
  Replace raw HTML tables with `<DataTable />`. Create exact matching `columns`. 

- [ ] **Step 2: Verification & Commit**
  Run `npx tsc --noEmit` in `apps/web`.
  Commit the changes.

Report back when all tasks are complete.
