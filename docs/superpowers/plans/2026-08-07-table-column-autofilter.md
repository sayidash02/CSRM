# Table Column AutoFilter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement inline column filters (Excel-like AutoFilter) in the `DataTable` component and migrate existing top-bar filters from Proposals, Grievance, and CSR Projects modules to use it.

**Architecture:** Extend `ColumnDef` with `filterOptions`. `DataTable` will manage an `activeFilters` state and apply filtering to the data before sorting. The UI will render a funnel icon on the column header, opening a popover with options using absolute positioning or existing Radix UI dropdowns if available (we will use a lightweight absolute dropdown for simplicity since Radix Popover is in `package.json`).

**Tech Stack:** React, Tailwind CSS, Lucide React, TypeScript.

---

### Task 1: Update `DataTable` Core Logic and Types

**Files:**
- Modify: `apps/web/src/components/ui/DataTable.tsx`

- [ ] **Step 1: Update type definitions**

```tsx
// In apps/web/src/components/ui/DataTable.tsx
// Update ColumnDef type
export type ColumnDef<T> = {
  header: string;
  accessor?: string;
  sortable?: boolean;
  className?: string;
  render?: (item: T, idx: number) => React.ReactNode;
  filterOptions?: { label: string; value: string }[];
};
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm --filter web run tsc --noEmit` (or just run `tsc --noEmit` in `apps/web`)
Expected: PASS (if setup allows, else skip to next)

- [ ] **Step 3: Implement filtering state and logic**

```tsx
// Inside DataTable component:
import { Filter } from 'lucide-react'; // Add this to imports
// Add state:
const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

// Update sortedData useMemo to filter first:
  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];

    // 1. Apply Filters
    if (Object.keys(activeFilters).length > 0) {
      sortableItems = sortableItems.filter(item => {
        for (const [key, filterValue] of Object.entries(activeFilters)) {
          if (filterValue === 'All') continue;
          const itemValue = getNestedValue(item, key);
          if (String(itemValue) !== String(filterValue)) {
            return false;
          }
        }
        return true;
      });
    }

    // 2. Apply Sorting
    if (sortConfig !== null) {
// ... existing sorting logic ...
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/DataTable.tsx
git commit -m "feat: add filtering logic and types to DataTable"
```

---

### Task 2: Implement `DataTable` Filter UI

**Files:**
- Modify: `apps/web/src/components/ui/DataTable.tsx`

- [ ] **Step 1: Add Filter UI and interactions**

```tsx
// Add state for tracking open filter dropdown
const [openFilter, setOpenFilter] = useState<string | null>(null);

// Add toggle function
const toggleFilter = (key: string, e: React.MouseEvent) => {
  e.stopPropagation();
  setOpenFilter(openFilter === key ? null : key);
};

// Add select function
const selectFilter = (key: string, value: string, e: React.MouseEvent) => {
  e.stopPropagation();
  setActiveFilters(prev => ({ ...prev, [key]: value }));
  setOpenFilter(null);
};

// Inside the thead > tr > th mapping, add the filter UI:
<th
  key={idx}
  className={`px-4 py-3 font-medium ${col.sortable ? 'cursor-pointer hover:bg-muted/80' : ''} ${col.className || ''} relative`}
  onClick={() => col.sortable && col.accessor ? requestSort(col.accessor) : undefined}
>
  <div className="flex items-center gap-1 justify-between">
    <div className="flex items-center gap-1">
      {col.header}
      {col.sortable && col.accessor && sortConfig?.key === col.accessor && (
        sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      )}
    </div>
    {col.filterOptions && col.accessor && (
      <div className="relative">
        <button
          onClick={(e) => toggleFilter(col.accessor!, e)}
          className={`p-1 rounded hover:bg-muted ${activeFilters[col.accessor] && activeFilters[col.accessor] !== 'All' ? 'text-blue-600' : 'text-muted-foreground'}`}
        >
          <Filter className="h-3 w-3" />
        </button>
        {openFilter === col.accessor && (
          <div className="absolute top-full right-0 mt-1 w-40 bg-card border border-border rounded-md shadow-lg z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="max-h-60 overflow-y-auto py-1">
              {col.filterOptions.map((opt, i) => (
                <div
                  key={i}
                  className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-muted ${activeFilters[col.accessor!] === opt.value || (!activeFilters[col.accessor!] && opt.value === 'All') ? 'bg-muted/50 font-medium' : ''}`}
                  onClick={(e) => selectFilter(col.accessor!, opt.value, e)}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
</th>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/ui/DataTable.tsx
git commit -m "feat: render inline filter UI in DataTable header"
```

---

### Task 3: Migrate ProposalsModule

**Files:**
- Modify: `apps/web/src/features/proposals/ProposalsModule.tsx`

- [ ] **Step 1: Remove TopBar filter and update columns**

```tsx
// Remove statusFilter state:
// const [statusFilter, setStatusFilter] = useState("All"); // DELETE THIS
// Remove displayed filtering:
// const displayed = statusFilter === "All" ? filtered : filtered.filter(p => p.status === statusFilter); // CHANGE TO:
const displayed = filtered;

// Update columns definition to include filterOptions:
    { 
      header: "Status", 
      accessor: "status", 
      sortable: true, 
      filterOptions: [
        { label: "Semua Status", value: "All" },
        { label: "Under Review", value: "Under Review" },
        { label: "Approved", value: "Approved" },
        { label: "Declined", value: "Declined" }
      ],
      render: (p) => <StatusBadge status={p.status} /> 
    },

// Remove the <select> element from TopBar children:
// <select value={statusFilter} ... > ... </select> // DELETE THIS
```

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit` in `apps/web`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/ProposalsModule.tsx
git commit -m "refactor: migrate ProposalsModule filter to DataTable"
```

---

### Task 4: Migrate GrievanceModule

**Files:**
- Modify: `apps/web/src/features/grievance/GrievanceModule.tsx`

- [ ] **Step 1: Remove TopBar filters and update columns**

```tsx
// Remove sigFilter and statusFilter states:
// const [sigFilter, setSigFilter] = useState("All"); // DELETE THIS
// const [statusFilter, setStatusFilter] = useState("All"); // DELETE THIS

// Remove displayed filtering:
// const displayed = filtered.filter(g => sigFilter === "All" || g.significance === sigFilter).filter(g => statusFilter === "All" || g.status === statusFilter);
// CHANGE TO:
const displayed = filtered;

// Update columns for Significance (No. Reg):
    { 
      header: "No. Reg & Sig.", 
      accessor: "significance", // Attach to significance for filtering
      sortable: true, 
      filterOptions: [
        { label: "Semua Signifikansi", value: "All" },
        { label: "Low", value: "Low" },
        { label: "Medium", value: "Medium" },
        { label: "High", value: "High" },
        { label: "Critical", value: "Critical" }
      ],
      render: (g) => <div><span className="text-xs font-mono text-blue-600">{g.register_no}</span><div className="mt-1"><SignificanceBadge level={g.significance} /></div></div> 
    },

// Update columns for Status:
    { 
      header: "Status", 
      accessor: "status", 
      sortable: true, 
      filterOptions: [
        { label: "Semua Status", value: "All" },
        { label: "Open", value: "Open" },
        { label: "On Progress", value: "On Progress" },
        { label: "Resolved", value: "Resolved" },
        { label: "Closed", value: "Closed" }
      ],
      render: (g) => <div><StatusBadge status={g.status} />{g.completion_date && <div className="text-xs text-muted-foreground font-mono mt-1">Selesai: {formatDate(g.completion_date)}</div>}</div> 
    },

// Remove the two <select> elements from TopBar children in return statement.
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/grievance/GrievanceModule.tsx
git commit -m "refactor: migrate GrievanceModule filters to DataTable"
```

---

### Task 5: Migrate CsrProjectsModule

**Files:**
- Modify: `apps/web/src/features/csr-projects/CsrProjectsModule.tsx`

- [ ] **Step 1: Remove TopBar filter and update columns**

```tsx
// Remove statusFilter state:
// const [statusFilter, setStatusFilter] = useState("All"); // DELETE THIS
// Remove displayed filtering:
// const displayed = statusFilter === "All" ? filtered : filtered.filter(c => c.status === statusFilter);
// CHANGE TO:
const displayed = filtered;

// Update columns definition:
    { 
      header: "Status", 
      accessor: "status", 
      sortable: true, 
      filterOptions: [
        { label: "Semua Status", value: "All" },
        { label: "Planning", value: "Planning" },
        { label: "On Going", value: "On Going" },
        { label: "Completed", value: "Completed" },
        { label: "Cancelled", value: "Cancelled" }
      ],
      render: (p) => <StatusBadge status={p.status} /> 
    },

// Remove the <select> element from TopBar children.
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/csr-projects/CsrProjectsModule.tsx
git commit -m "refactor: migrate CsrProjectsModule filter to DataTable"
```
