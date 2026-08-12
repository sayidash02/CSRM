# Server-Side Sorting Design

## Context
The current data tables in the frontend (such as Daily Activities, LRP, Stakeholders, etc.) perform sorting strictly on the client side for the data currently visible on the screen. Because the tables use server-side pagination (bringing down only 50 rows at a time), client-side sorting does not accurately represent the global dataset (e.g., older records on page 2 will never surface to the top of page 1).

## Scope
Implement full server-side sorting for all paginated tables across the CRMS modules. This requires updating the shared UI component, the individual module pages, and all backend Prisma controllers.

## Architecture: Full Server-Side Sorting

### 1. Frontend Changes
- **`DataTable.tsx` component**: 
  - Add an optional `onSortChange?: (sortKey: string, sortDir: 'asc' | 'desc') => void` prop.
  - Add an optional `serverSortConfig?: { key: string; direction: 'asc' | 'desc' }` prop.
  - When a user clicks a sortable column header, if `onSortChange` is provided, bypass the local `sortableItems.sort()` logic entirely and instead invoke the callback.
- **Module Pages (e.g., `DailyActivitiesModule.tsx`, `LrpModule.tsx`)**:
  - Add two new React states: `sortBy` (e.g. default `'activity_date'`) and `sortDir` (e.g. default `'desc'`).
  - Bind `DataTable`'s `onSortChange` to update these states and trigger `setPage(1)`.
  - Append `sort_by=${sortBy}&sort_dir=${sortDir}` to the `apiClient.get` URL parameters.

### 2. Backend Changes
- **Standardized Query Params**: All paginated `GET` endpoints will extract `sort_by` and `sort_dir` from `req.query`.
- **Validation & Safe Mapping**: 
  - To prevent Prisma crashing from invalid inputs, controllers will implement a whitelist of allowed sort columns.
  - For relational sort keys (e.g., sorting by category name in frontend `category.name`), the controller will map this to the proper Prisma syntax: `orderBy: { category: { name: 'asc' } }`.
- **Default Fallback**: If no sort parameter is provided or the provided one is invalid, the controller falls back to the default sensible sort order for that model.
- **Update Prisma Queries**: The `orderBy` property in `prisma.<model>.findMany` will be dynamically assigned based on the sanitized input.

## Out of Scope
- Sorting on highly complex calculated fields (e.g. array counts or aggregations) that cannot be mapped simply to Prisma without raw SQL. If encountered, these specific columns will be marked `sortable: false` on the frontend.
