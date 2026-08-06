# PIC Soft-Delete & Reactivation Design Spec

## Overview
When a user deletes a PIC, the backend sets `is_active = false` (soft delete). However, because `pics.name` has a `@unique` constraint in the MySQL database, attempting to re-add a PIC with the same name fails with a Prisma `P2002` unique constraint violation, which the controller handles by returning a `500 Internal server error`.

This spec defines the backend changes required to handle PIC reactivation upon creation and proper HTTP error code mapping for unique constraint violations.

## Scope
- Modify `apps/api/src/controllers/PicsController.ts`.
- Add integration/unit tests for `createPic`, `updatePic`, and `deletePic` in `apps/api/tests/` (or update existing tests).

## Architecture & Data Flow

### 1. `createPic` Logic Update:
When `POST /pics` is called with `{ name }`:
1. Trim `name` (`const cleanName = name.trim()`). If empty, return `400 Bad Request` (`{ error: 'Name is required' }`).
2. Search database for an existing PIC with `name == cleanName` (regardless of `is_active`).
3. If existing record found:
   - If `existingPic.is_active === true`: return `409 Conflict` (`{ error: 'PIC dengan nama ini sudah ada' }`).
   - If `existingPic.is_active === false`: reactivate record by updating `is_active: true`, return `200 OK` or `201 Created` with the updated record.
4. If no existing record found:
   - Create new record with `data: { name: cleanName, is_active: true }`, return `201 Created`.

### 2. Error Interception Enhancement:
- In `createPic`, `updatePic`, `deletePic`:
  - Catch Prisma errors (`Prisma.PrismaClientKnownRequestError`).
  - If code is `P2002` (Unique constraint failed): return `409 Conflict` with `{ error: 'PIC dengan nama tersebut sudah ada' }`.
  - Fallback catch: log error and return `500 Internal server error`.

## Security & Data Integrity
- Does not bypass soft-delete logic. Soft deleted records remain tied to historical `daily_activities` records.
- Prevents database duplicate name errors and silent internal server crashes.

## Testing Strategy
- Unit / Integration Test in `apps/api/tests/pics.test.ts`:
  1. Test creating a new PIC -> expect 201.
  2. Test creating duplicate active PIC -> expect 409 Conflict.
  3. Test deleting the PIC (`is_active = false`).
  4. Test re-adding the same PIC -> expect 200/201 Reactivated, `is_active` set back to `true`.
