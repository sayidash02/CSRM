# Design Spec: Soft Delete & Restore UI

## 1. Overview
The CRMS system currently implements soft-delete (`is_deleted = true`) across all 7 modules, ensuring data is never permanently lost. However, there is no user interface for viewing or restoring this deleted data. This design introduces a simple, safe, and integrated way for the CRS user to view and restore deleted records without requiring database access.

## 2. Architecture & Backend

### 2.1 Fetching Deleted Data
- **Approach**: Modify existing `GET /api/[module]` endpoints.
- **Implementation**: Add an optional `is_deleted` boolean query parameter.
  - If `is_deleted=true`, the query returns records where `is_deleted = TRUE`.
  - If omitted or `is_deleted=false`, it retains current behavior (`is_deleted = FALSE`).
- **Benefit**: Reuses existing complex GET logic (joins, pagination, filtering) without duplicating routes.

### 2.2 Restoring Data
- **Approach**: Create dedicated restore endpoints for each module.
- **Route**: `PATCH /api/[module]/:id/restore`
- **Implementation**:
  - Updates the specific record setting `is_deleted = FALSE`.
  - Implements standard try-catch error handling.
  - Returns appropriate HTTP status codes (200 on success, 404 if not found).

### 2.3 Hard Delete Policy
- In strict adherence to `AGENTS.md`, **no hard delete (`DELETE` HTTP verb that drops rows) will be implemented**. The system only supports soft-delete and restore.

## 3. Frontend UI/UX

### 3.1 The "Show Deleted" Toggle
- **Location**: Top of each module's main data table page.
- **Component**: A Switch/Toggle labeled "Tampilkan Data Terhapus" (Show Deleted Data).
- **Behavior**: Toggling this ON fetches data with `?is_deleted=true`.
- **Visual Indicator**: The table UI will display a warning banner or slightly tinted background to clearly indicate the user is viewing deleted records (the "Trash" mode).

### 3.2 Table Columns & Actions
- **Columns**: The table retains the exact same columns as the active data view to ensure familiarity.
- **Actions Column**:
  - Standard "Edit" and "Delete" buttons are hidden.
  - A new "Restore" button (with an appropriate icon) is displayed.

### 3.3 The Restore Flow
1. User clicks "Restore" on a record.
2. A confirmation dialog appears: *"Apakah Anda yakin ingin memulihkan data ini?"*
3. Upon confirmation, the frontend calls the `PATCH /api/[module]/:id/restore` endpoint.
4. On success:
   - A success toast notification appears (complying with Bab 13).
   - The record is immediately removed from the deleted data view.
   - The user can switch the toggle back to see the restored record in the active table.
