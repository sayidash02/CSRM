# Dashboard Trend Indicator Tooltip Design

## Context
In the Dashboard Overview, the "Daily Activities" stat card features a weekly trend indicator (e.g., an upward green arrow and "+50%"). However, without surrounding text, users lack the context to understand what timeframe this percentage is being compared against.

## Objective
Provide clear context for the trend indicator without cluttering the stat card's clean UI design.

## Proposed Changes
1. **Wrap Trend Indicator in a Tooltip:** Modify the stat card rendering loop in `DashboardModule.tsx` to wrap the trend `<span>` element within a standard Radix UI Tooltip.
2. **Tooltip Content:** The tooltip will display the descriptive text: `"Dibandingkan dengan minggu lalu"`.
3. **Component Imports:** Utilize existing UI components `TooltipProvider`, `Tooltip`, `TooltipTrigger`, and `TooltipContent` from `@/app/components/ui/tooltip`.
4. **Conditional Wrapping:** Only apply the tooltip to stat cards that have a defined `trend` value.

## Impact
- **Affected File:** `apps/web/src/features/dashboard/DashboardModule.tsx`
- **Visual Impact:** No change to the default layout. A small informative tooltip will appear upon hovering over the trend indicator.
- **Data Impact:** Purely a frontend UI enhancement.
