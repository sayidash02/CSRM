# Implementation Plan: Kategori Columns & Filter

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify `DailyActivitiesModule.tsx` to include Category and Sub Category columns, map their names properly (so they are searchable), add a Category dropdown filter to the `TopBar`, and update the Excel Export functionality.

---

### Task 1: Enrich Data for Table & Search

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Create Enriched Items Array**
  Inside `DailyActivitiesModule`, directly above the `useGlobalSearch` call, create an `enrichedItems` array by mapping over `items`. For each item, lookup its category and sub category name:
  ```typescript
  const enrichedItems = useMemo(() => {
    return items.map(a => ({
      ...a,
      category_name: refs.categories?.find(c => String(c.id) === String(a.category_id))?.name || "-",
      sub_category_name: refs.sub_categories?.find(s => String(s.id) === String(a.sub_category_id))?.name || "-"
    }));
  }, [items, refs.categories, refs.sub_categories]);
  ```

- [ ] **Step 2: Update Search Input**
  Change the `useGlobalSearch` hook to consume `enrichedItems` instead of `items`:
  `const { q, setQ, filtered } = useGlobalSearch(enrichedItems);`

---

### Task 2: Implement Dropdown Filter & Update Table Columns

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Add Dropdown Filter State & Logic**
  Inside `DailyActivitiesModule`, add: `const [catFilter, setCatFilter] = useState("All");`.
  Update the displayed data assignment:
  ```typescript
  const displayed = useMemo(() => {
    if (catFilter === "All") return filtered;
    return filtered.filter(a => String(a.category_id) === String(catFilter));
  }, [filtered, catFilter]);
  ```
  Pass `displayed` into the `<DataTable>` component.

- [ ] **Step 2: Update TopBar Component UI**
  In the internal `TopBar` function, add the new props: `categories?: any[]; catFilter?: string; onCatFilterChange?: (v: string) => void;`.
  In the return statement (where the search `<input>` is located), add a `<select>` element just before the search input. It should have:
  `value={catFilter}` and `onChange={(e) => onCatFilterChange?.(e.target.value)}`.
  Render an `<option value="All">Semua Kategori</option>`, then `.map` over `categories` to render the rest of the options `<option key={c.id} value={c.id}>{c.name}</option>`.

- [ ] **Step 3: Pass Props to TopBar**
  Where `<TopBar>` is used in `DailyActivitiesModule`, pass the new props:
  `categories={refs.categories} catFilter={catFilter} onCatFilterChange={setCatFilter}`

- [ ] **Step 4: Add Table Columns**
  In the `<DataTable>` usage inside `DailyActivitiesModule`, insert the two new columns into the `columns` array (e.g., between `Lokasi` and `PIC`):
  `{ header: "Kategori", accessor: "category_name", sortable: true }`
  `{ header: "Sub Kategori", accessor: "sub_category_name", sortable: true }`

---

### Task 3: Update Excel Export

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Update `exportColumns`**
  Inside `handleExportClick`, add the definitions for `Kategori` and `Sub Kategori`:
  `{ header: "Kategori", key: "kategori", width: 20 }`
  `{ header: "Sub Kategori", key: "sub_kategori", width: 25 }`

- [ ] **Step 2: Update `exportData`**
  Inside the mapping of `displayed` in `handleExportClick`, map the values:
  `kategori: a.category_name,`
  `sub_kategori: a.sub_category_name,`

- [ ] **Step 3: Verification & Commit**
  Run `npx tsc --noEmit` inside `apps/web` to ensure no Type errors.
  Commit all changes: `git add . && git commit -m "feat: add category filter and columns to daily activities"`
