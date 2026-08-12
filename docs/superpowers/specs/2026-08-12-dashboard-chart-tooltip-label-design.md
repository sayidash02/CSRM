# Dashboard Sub-Category Chart Tooltip Label Design

## Context
In the Dashboard Overview, hovering over a bar in the "Aktivitas per Sub Category" bar chart displays a tooltip showing `value: [number]`. The term "value" is in English and unhelpful for end-users.

## Objective
Replace the generic label "value" with the localized Indonesian term "Jumlah" in the chart tooltip.

## Proposed Changes
1. **Add `name` attribute to `<Bar>`:** Modify `<Bar dataKey="value" ... />` in `DashboardModule.tsx` to `<Bar dataKey="value" name="Jumlah" ... />`.
2. **Tooltip Output:** The Recharts Tooltip will display `Jumlah: [number]` when hovering over any category bar.

## Impact
- **Affected File:** `apps/web/src/features/dashboard/DashboardModule.tsx`
- **Visual Impact:** Tooltip label changes from "value" to "Jumlah".
- **Data Impact:** No data structure or backend changes required.
