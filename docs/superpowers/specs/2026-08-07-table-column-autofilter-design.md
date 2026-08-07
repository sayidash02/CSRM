# Table Column AutoFilter Design

## 1. Overview
The goal is to implement an Excel-like "AutoFilter" feature directly on the column headers of the `DataTable` component. This replaces the existing detached dropdown filters located in the `TopBar` across various modules, providing a more intuitive and space-efficient user experience.

## 2. Architecture & Component Changes

### 2.1 DataTable Component (`apps/web/src/components/ui/DataTable.tsx`)
- **Type Extension:** Extend `ColumnDef<T>` to include an optional `filterOptions?: { label: string; value: string }[]` property.
- **State Management:** Add a local React state `activeFilters: Record<string, string>` to keep track of the selected filter value for each column (keyed by the column's `accessor`).
- **Filtering Logic:** 
  - Before applying the sorting logic in `sortedData`, apply a filtering pass. 
  - For each column that has an active filter (and its value is not "All"), filter the rows where the nested value matches the active filter value.
- **UI Implementation:** 
  - If a column has `filterOptions`, render a "Filter" (funnel) icon next to the column header text and sort icon.
  - Clicking the funnel icon opens a dropdown (using a lightweight absolute div or Radix UI Popover) containing the `filterOptions`.
  - The funnel icon will have a distinct styling (e.g., primary color) when a specific filter is active, indicating to the user that the data is currently being filtered by that column.

### 2.2 Module Implementations
The following modules currently have `TopBar` filters that will be migrated to the new `DataTable` inline filter:

#### Proposals Module (`ProposalsModule.tsx`)
- **Remove:** The `statusFilter` state and the `<select>` dropdown in the `TopBar`.
- **Update:** Add `filterOptions` to the "Status" column definition with options: All, Under Review, Approved, Declined.

#### Grievance Module (`GrievanceModule.tsx`)
- **Remove:** The `statusFilter` and `sigFilter` states, and their respective `<select>` dropdowns in the `TopBar`.
- **Update:** 
  - Add `filterOptions` to the "Status" column with options: All, Open, On Progress, Resolved, Closed.
  - Add `filterOptions` to the "No. Reg" (or a newly dedicated/adjusted) column for "Signifikansi" with options: All, Low, Medium, High, Critical. Since "Signifikansi" is currently rendered under the Register No, the filter can be attached to the "register_no" accessor, or we can abstract the filtering target.

#### CSR Projects Module (`CsrProjectsModule.tsx`)
- **Remove:** The `statusFilter` state and the `<select>` dropdown in the `TopBar`.
- **Update:** Add `filterOptions` to the "Status" column definition with options: All, Planning, On Going, Completed, Cancelled.

## 3. Data Flow
1. User clicks the funnel icon on the "Status" column header.
2. User selects "Approved".
3. `DataTable` updates its internal `activeFilters` state to `{ status: "Approved" }`.
4. The `useMemo` hook in `DataTable` recalculates:
   - First, it filters the raw `data` to only include rows where `item.status === "Approved"`.
   - Then, it applies any active sorting (`sortConfig`).
5. The UI re-renders with the filtered and sorted rows.

## 4. Edge Cases & Considerations
- **Multiple Filters:** The design supports filtering multiple columns simultaneously (e.g., Status = Open AND Significance = High in the Grievance module).
- **Resetting Filters:** Each filter dropdown must include an "All" (Semua) option that clears the filter for that specific column.
- **Missing Accessor:** A column must have an `accessor` defined if `filterOptions` are provided, otherwise the `DataTable` won't know which data field to evaluate.
