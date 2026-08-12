# Server-Side Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full server-side sorting for paginated tables (specifically Daily Activities, which is the only paginated module) to ensure all data is sorted globally before being paginated.

**Architecture:** We will modify the generic `DataTable` component to accept `onSortChange` and `serverSortConfig`. If provided, it bypasses local sorting and delegates to the parent. The `DailyActivitiesModule` will maintain sort state and pass it to the backend. The backend `DailyActivitiesController` will safely map the sort params to Prisma `orderBy`.

**Tech Stack:** React, Express, Prisma

---

### Task 1: Update DataTable to support Server-Side Sorting

**Files:**
- Modify: `apps/web/src/components/ui/DataTable.tsx`

- [ ] **Step 1: Update types and props in DataTable**
Modify `DataTable.tsx` to accept `onSortChange` and `serverSortConfig`.

Find the interface `DataTableProps`:
```tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
  serverSortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
}
```

Update the component signature:
```tsx
export function DataTable<T>({ data, columns, onSortChange, serverSortConfig }: DataTableProps<T>) {
```

- [ ] **Step 2: Update the `requestSort` function**
Modify the `requestSort` function so that if `onSortChange` is provided, it fires that callback instead of modifying local state.

```tsx
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (onSortChange) {
      if (serverSortConfig && serverSortConfig.key === key && serverSortConfig.direction === 'asc') {
        direction = 'desc';
      }
      onSortChange(key, direction);
      return;
    }

    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
```

- [ ] **Step 3: Update local sorting logic to skip if `serverSortConfig` is used**
In the `sortedData` useMemo block, ensure local sorting is bypassed if `onSortChange` exists (meaning sorting is server-side).

```tsx
    if (sortConfig !== null && !onSortChange) {
      sortableItems.sort((a, b) => {
        // ... existing sort logic ...
```

- [ ] **Step 4: Update the UI to reflect `serverSortConfig`**
In the table header rendering, update the arrow display logic to check both `sortConfig` and `serverSortConfig`:

Replace:
```tsx
                      {col.sortable && col.accessor && sortConfig?.key === col.accessor && (
                        sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
```
With:
```tsx
                      {col.sortable && col.accessor && (sortConfig?.key === col.accessor || serverSortConfig?.key === col.accessor) && (
                        (sortConfig?.direction === 'asc' || serverSortConfig?.direction === 'asc') ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
```

- [ ] **Step 5: Commit changes**
```bash
git add apps/web/src/components/ui/DataTable.tsx
git commit -m "feat(ui): add server-side sorting support to DataTable"
```

---

### Task 2: Update Backend Controller for Sorting

**Files:**
- Modify: `apps/api/src/controllers/DailyActivitiesController.ts`

- [ ] **Step 1: Extract and validate sort query params**
In `getDailyActivities`, extract `sort_by` and `sort_dir`.
Create a safe `orderBy` object mapping to prevent invalid queries.

Replace:
```typescript
export const getDailyActivities = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted, page, limit, search, cat, sub_cat, start, end, no_paginate } = req.query;
```
With:
```typescript
export const getDailyActivities = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { year, is_deleted, page, limit, search, cat, sub_cat, start, end, no_paginate, sort_by, sort_dir } = req.query;
```

- [ ] **Step 2: Build the dynamic `orderBy` object**
Before the `prisma.daily_activities.findMany` call, build the `orderBy` object.

Insert:
```typescript
  let orderByConfig: any = { activity_date: 'desc' };

  if (sort_by) {
    const dir = sort_dir === 'asc' ? 'asc' : 'desc';
    
    // Whitelist and map frontend accessors to Prisma relations/fields
    switch(sort_by as string) {
      case 'activity_date':
      case 'activity':
      case 'focus':
      case 'institution_group':
      case 'location':
      case 'cost':
      case 'description_result':
        orderByConfig = { [sort_by as string]: dir };
        break;
      case 'category.name':
        orderByConfig = { category: { name: dir } };
        break;
      case 'sub_category_name':
        orderByConfig = { sub_category: { name: dir } };
        break;
      default:
        // Ignore unsupported sort columns (like pics) and fallback to date
        orderByConfig = { activity_date: 'desc' };
    }
  }
```

- [ ] **Step 3: Apply `orderByConfig` to queries**
Replace the hardcoded `orderBy: { activity_date: 'desc' }` with `orderBy: orderByConfig` in both `findMany` calls (for `no_paginate=true` and the paginated version).

- [ ] **Step 4: Commit changes**
```bash
git add apps/api/src/controllers/DailyActivitiesController.ts
git commit -m "feat(api): support dynamic sorting in Daily Activities"
```

---

### Task 3: Update Daily Activities Frontend Module

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Add state for sorting**
Add state hooks for `sortBy` and `sortDir`.

```tsx
  const [sortBy, setSortBy] = useState<string>('activity_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
```

- [ ] **Step 2: Add sort params to the debounce dependency array**
Update the `useEffect` dependency array that triggers `fetchData`.

```tsx
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [activeYear, showDeleted, page, limit, catFilter, subCatFilter, dateRange.start, dateRange.end, q, sortBy, sortDir]);
```

- [ ] **Step 3: Append sort params to API call**
In `fetchData()`:

```tsx
      if (dateRange.start) params.append('start', dateRange.start);
      if (dateRange.end) params.append('end', dateRange.end);
      
      params.append('sort_by', sortBy);
      params.append('sort_dir', sortDir);

      const res = await apiClient.get(`/daily-activities?${params.toString()}`);
```

Do the same in `handleExportClick()`:
```tsx
      if (dateRange.end) params.append('end', dateRange.end);

      params.append('sort_by', sortBy);
      params.append('sort_dir', sortDir);

      const res = await apiClient.get(`/daily-activities?${params.toString()}`);
```

- [ ] **Step 4: Pass sort props to `DataTable`**
In the JSX where `<DataTable>` is rendered:

Replace:
```tsx
          {!isLoading && <DataTable data={displayed} columns={columns} />}
```
With:
```tsx
          {!isLoading && (
            <DataTable 
              data={displayed} 
              columns={columns} 
              onSortChange={(key, dir) => { setSortBy(key); setSortDir(dir); setPage(1); }}
              serverSortConfig={{ key: sortBy, direction: sortDir }}
            />
          )}
```

- [ ] **Step 5: Commit changes**
```bash
git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
git commit -m "feat(ui): wire server-side sorting to Daily Activities table"
```
