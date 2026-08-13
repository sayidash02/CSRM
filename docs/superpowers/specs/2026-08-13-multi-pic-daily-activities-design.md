# Multi-PIC Support for Daily Activities

## 1. Overview
The user recently updated the core `schema.sql` database architecture to allow a single Daily Activity to have multiple PICs (a many-to-many relationship using the `daily_activity_pics` pivot table), removing the single `pic_id` column. However, the application (Prisma schema, Backend Controllers, and Frontend) still expects the old single-PIC behavior, resulting in bugs where only the last selected PIC is saved and displayed. 

This specification outlines the changes required to synchronize the application layers with the new schema, restoring the intended multi-PIC functionality while ensuring Audit Trail logs remain readable.

## 2. Architecture & Design Decisions
- **Database Synchronization:** We will update `apps/api/prisma/schema.prisma` to reflect the many-to-many structure by adding the `daily_activity_pics` pivot table and removing `pic_id` from `daily_activities`.
- **Backend Nested Writes:** The API will be updated to accept and save arrays of `pic_ids`. Prisma nested writes (`create` / `deleteMany`) will be used to manage the pivot table records efficiently.
- **Manual Audit Trail for PICs (Option 1):** Because the global generic Audit Trail interceptor only tracks scalar fields on the parent model, it cannot easily capture changes made via nested relations. To solve this, the `PUT` endpoint in `DailyActivitiesController` will manually compare the old and new PIC names, and manually insert an `audit_logs` record specifically for PIC changes, ensuring the UI retains a clean, readable history format (e.g., `Lama: Budi ➔ Baru: Budi, Andi`).

## 3. Implementation Details

### 3.1. Prisma Schema Sync
- **File:** `apps/api/prisma/schema.prisma`
- **Changes:**
  - Remove `pic_id` and the `pic` relation from `daily_activities`.
  - Add the `daily_activity_pics` model with a composite primary key `@@id([activity_id, pic_id])`.
  - Add the corresponding relation arrays in `daily_activities` and `pics`.
  - Re-generate the Prisma client (`npx prisma generate`).

### 3.2. API Controller Updates
- **File:** `apps/api/src/controllers/DailyActivitiesController.ts`
- **Changes:**
  - **GET List:** Update the fetch `include` clause to query `daily_activity_pics: { include: { pic: true } }`. Transform the response to map this nested object back into a flat `a.pics` array for frontend compatibility.
  - **POST Create:** Validate `pic_ids` (must be an array). Map it into nested Prisma syntax: `daily_activity_pics: { create: pic_ids.map(...) }`.
  - **PUT Edit:** 
    1. Fetch the existing PIC names.
    2. Fetch the incoming new PIC names.
    3. If the joined name strings differ, manually create a record in `audit_logs` with `action: 'UPDATE'` and `changes: { PIC: { old: oldNames, new: newNames } }`.
    4. Perform the update with nested relation replacement: `daily_activity_pics: { deleteMany: {}, create: [...] }`.

### 3.3. Frontend Reversion & Support
- **File:** `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`
- **Changes:**
  - In `DailyForm`, remove the hack that truncated `pic_ids` down to a single `pic_id` during `onSave`. Pass the full `pic_ids` array to the backend.
  - In the datatable `columns` definition, revert the PIC column back to reading the array: `accessor: "pics"` and `render: (a) => a.pics?.map((p: any) => p.name).join(', ') || '-'`.
  - Ensure the Excel Export logic correctly joins multiple PIC names.

## 4. Risks & Considerations
- **Audit Trail Sync:** The manual audit log creation in the PUT controller is independent of the generic interceptor. If the generic interceptor also logs scalar changes (e.g., `activity_date`), the user might see two separate log entries for a single save event if both a scalar field and PICs were changed. This is acceptable for prototype purposes and maintains clear data tracing.
