# Implementation Plan: Export & Filter Expansion for 6 Modules

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Export Excel and Dropdown Filter functionality to the remaining 6 modules (Proposals, CSR Projects, Grievance, Top Issues, Stakeholders, LRP).

---

### Task 1: Module Proposals & CSR Projects (Status Filter)

**Files:**
- Modify: `apps/web/src/features/proposals/ProposalsModule.tsx`
- Modify: `apps/web/src/features/csr-projects/CsrProjectsModule.tsx`

- [ ] **Step 1: Proposals Module Updates**
  1. Add state: `const [statusFilter, setStatusFilter] = useState("All");`
  2. Compute `displayed`: `const displayed = useMemo(() => statusFilter === "All" ? filtered : filtered.filter(a => a.status === statusFilter), [filtered, statusFilter]);`
  3. Update `DataTable` to use `data={displayed}`.
  4. Create `handleExportClick` function to map `displayed` to `exportData` and call `onExport` with appropriate columns (Registration No, Date, Institution, Address, Proposal Description, Status). Format date using `formatDate`.
  5. Pass `<select>` as children to `<TopBar>` to control `statusFilter`. Map unique status from `items` or hardcode `["Under Review", "Approved", "Rejected"]`. Include `<option value="All">Semua Status</option>`. Set `TopBar`'s `onExport={handleExportClick}`.

- [ ] **Step 2: CSR Projects Module Updates**
  1. Add state `statusFilter`. Compute `displayed`. Update `DataTable`.
  2. Implement `handleExportClick` mapping `displayed` to `exportData` (Year, Program, Activity, Type, Location, Beneficiaries, Objective, Status, Budget, Period).
  3. Pass `<select>` as children to `<TopBar>` for `statusFilter` (Options: "Planning", "Ongoing", "Completed"). Set `onExport={handleExportClick}`.

---

### Task 2: Module Grievance & Top Issues (Multiple/Period Filter)

**Files:**
- Modify: `apps/web/src/features/grievance/GrievanceModule.tsx`
- Modify: `apps/web/src/features/top-issues/TopIssuesModule.tsx`

- [ ] **Step 1: Grievance Module Updates**
  1. Add states: `statusFilter` and `sigFilter` (Significance).
  2. Compute `displayed` applying both filters sequentially if not "All".
  3. Create `handleExportClick` with columns (Register No, Date, Complainant, Category, Significance, Description, Location, Status, Resolution, Remarks).
  4. Pass two `<select>` elements as children to `<TopBar>` for Status ("Open", "Closed") and Significance ("High", "Medium", "Low").

- [ ] **Step 2: Top Issues Module Updates**
  1. Add state `periodFilter`. Compute `displayed`.
  2. Create `handleExportClick` mapping columns (Period, Issue, Description, Follow Up, Next Plan).
  3. Pass `<select>` as children to `<TopBar>` rendering dynamic options based on `Array.from(new Set(items.map(i => i.period)))`.

---

### Task 3: Module Stakeholders & LRP (Export Only)

**Files:**
- Modify: `apps/web/src/features/stakeholders/StakeholdersModule.tsx`
- Modify: `apps/web/src/features/lrp/LrpModule.tsx`

- [ ] **Step 1: Stakeholders Module Updates**
  1. Create `handleExportClick` mapping `filtered` to `exportData` (Stakeholder, Date/Venue, Concern/Issue, Document Link).
  2. Set `onExport={handleExportClick}` on `TopBar`. No dropdown filters.

- [ ] **Step 2: LRP Module Updates**
  1. Create `handleExportClick` mapping `filtered` to `exportData` (Program, SharePoint Link).
  2. Set `onExport={handleExportClick}` on `TopBar`. No dropdown filters.

- [ ] **Step 3: Verification & Commit**
  Run `npx tsc --noEmit` in `apps/web` to verify types.
  Commit all changes: `git add . && git commit -m "feat: implement export and filters for all modules"`
