# Grievance UI Columns Expansion Design

## Objective
Ensure the `Grievance` frontend module (`GrievanceModule.tsx`) explicitly displays and exports the `investigation`, `resolution`, and `feedback` (Complainant Feedback) fields. Currently, the backend database and Excel import/export logic already support these 3 fields, but the frontend table omits `feedback` and merges `investigation` and `resolution` into a single truncated column.

## Approach

### 1. Separate Table Columns (`apps/web/src/features/grievance/GrievanceModule.tsx`)
In `columns` definition within `GrievanceModule.tsx`:
- Remove the merged `"Penyelesaian"` column.
- Add an `"Investigasi"` column displaying `g.investigation` with `line-clamp-2` and a fallback dash (`—`).
- Add a `"Resolusi"` column displaying `g.resolution` with `line-clamp-2` and a fallback dash (`—`).
- Add a `"Feedback Pelapor"` column displaying `g.feedback` with `line-clamp-2` and a fallback dash (`—`).

### 2. Complete Browser Export Payload (`handleExportClick`)
In `handleExportClick` function within `GrievanceModule.tsx`:
- Include `"Investigation": g.investigation || ""`
- Include `"Resolution": g.resolution || ""`
- Include `"Complainant Feedback": g.feedback || ""`

### 3. Verify Form Modal Inputs
- `GrievanceFormModal` already contains textareas for `investigation`, `resolution`, and `feedback`. Ensure default values and state handlers bind cleanly without issues.

## Scope & Verification
- Only `apps/web/src/features/grievance/GrievanceModule.tsx` requires modifications.
- Backend and database schemas are already aligned with `schema.sql`.
- Verification will be conducted by running `npx tsc --noEmit` in `apps/web` and `npm run build`.
