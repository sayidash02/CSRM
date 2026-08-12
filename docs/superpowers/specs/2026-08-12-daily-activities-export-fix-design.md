# Daily Activities Export & Excel Export Route Fix Design

## Context
Clicking the "Export" button in the Daily Activities module resulted in an error ("Gagal mengambil data untuk export"). The investigation revealed three underlying issues:
1. **Invalid Date Handling in Controller:** Sending `year=Semua` caused `DailyActivitiesController.ts` to execute `new Date("Semua-01-01...")`, resulting in an `Invalid Date` error and HTTP 500 from Prisma/Express.
2. **Field Mapping Mismatch:** `DailyActivitiesModule.tsx` attempted to map `a.pics?.map(...)` (array), whereas the Prisma relation model provides `a.pic` (single object).
3. **Excel Export Payload Handling:** `apps/api/src/routes/export.ts` only parsed `{ sheetName, columns, data }` objects, failing if an array payload was passed.

## Objective
Fix the Daily Activities export functionality and ensure robust Excel generation across all modules.

## Proposed Changes

### 1. Backend Controller (`apps/api/src/controllers/DailyActivitiesController.ts`)
- Validate the `year` query parameter before constructing date ranges.
- Only construct `activity_date` filters if `year` is a valid 4-digit number string and not `"Semua"` / `"All"`.

### 2. Frontend Module (`apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`)
- In `handleExportClick`:
  - Append `year` parameter only if `activeYear` is a valid year (not `"Semua"` or `"All"`).
  - Use `a.pic?.name || "-"` for the `pic_names` key instead of `a.pics?.map(...)`.
  - Fallback `category_name` to `a.category?.name` and `sub_category_name` to `a.sub_category?.name`.

### 3. Excel Export Route (`apps/api/src/routes/export.ts`)
- Support both object payload `{ sheetName, columns, data }` and array payload `[ { "Header": "Value" } ]`.
- If an array payload is provided, auto-generate `columns` from the keys of the first element.

## Impact
- **Affected Files:**
  - `apps/api/src/controllers/DailyActivitiesController.ts`
  - `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`
  - `apps/api/src/routes/export.ts`
- **Visual & UX Impact:** Export in Daily Activities will function seamlessly, downloading a formatted Excel file.
- **Data Impact:** No database schema or data mutations required.
