# Bugfix & Enhancement Spec: Audit Trail Relation Mapping & PIC Display

## 1. Overview
This specification addresses two related UI issues in the `DailyActivities` module:
1. **PIC Display Issue:** The frontend datatable fails to display the PIC for imported or newly added items because it incorrectly expects an array (`a.pics`), whereas the Prisma schema and API return a single related object (`a.pic`).
2. **Audit Trail ID Issue:** The backend `diffHelper` generic interceptor captures changes in relational keys (e.g., `pic_id`, `category_id`) as raw numerical IDs. Consequently, the `AuditHistoryDrawer` displays meaningless ID transitions to the user (e.g., "PIC: 259 ➔ 253").

## 2. Architecture & Design Decisions
To resolve the Audit Trail ID issue while maintaining the backend's high performance and generic interceptor design, we adopt a **frontend-only mapping approach (Option 1)**. The backend will continue to log raw database changes as efficiently as possible. The frontend will dynamically translate these IDs into human-readable names using its locally available reference dictionary (master data).

## 3. Implementation Details

### 3.1. Datatable PIC Fix
- **File:** `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`
- **Change:** Update the column definition for "PIC".
  - From: `render: (a) => a.pics?.map(p => p.name).join(', ') || a.pic_ids?.join(', ') || '-'`
  - To: `render: (a) => a.pic?.name || '-'`

### 3.2. Value Translator Utility
- **File:** `apps/web/src/utils/fieldDictionary.ts`
- **Change:** Implement a new utility function `translateValue(field: string, value: any, references: any)`.
- **Logic:**
  - If `field === 'pic_id'`, look up `references?.pics?.find(p => p.id === Number(value))?.name`.
  - If `field === 'category_id'`, look up `references?.categories?.find(p => p.id === Number(value))?.name`.
  - If `field === 'sub_category_id'`, look up `references?.sub_categories?.find(p => p.id === Number(value))?.name`.
  - If no match or the field is not a known relation, return the raw `value` as a string.

### 3.3. Audit History Drawer Enhancement
- **File:** `apps/web/src/components/ui/AuditHistoryDrawer.tsx`
- **Change:**
  - Update `DrawerProps` to include an optional `references?: any` prop.
  - In the changes loop, wrap the rendered `old` and `new` values with the `translateValue` function.
  - Example: `translateValue(field, vals.old, references)` ➔ `translateValue(field, vals.new, references)`.

### 3.4. Drawer Integration Update
- **File:** `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`
- **Change:** Pass the existing `references` state down to the `<AuditHistoryDrawer />` component.

## 4. Risks & Considerations
- **Stale Master Data:** If a PIC is deleted from the master data, the ID mapping will fail. The `translateValue` function must fail gracefully and return the raw ID or a placeholder (e.g., `"Unknown (ID 259)"` or just `"259"`) to prevent UI crashes.
- **Data Types:** Ensure type conversions (e.g., `Number(value)` or `String(value)`) are handled correctly when matching against the references array, as API responses might mix BigInt strings and numerical IDs.
