# Daily Activities Stat Card Refactor Design

## Context
The "Daily Activities" stat card on the Dashboard Review currently displays a dense subtext showing week-over-week and month-over-month comparisons: `M: 0 vs 6 | B: 2 vs 54`. 
Users found this information confusing and out of place compared to the clean, simple subtext used in other stat cards (e.g., "pertemuan stakeholder", "isu dipantau").

## Objective
Simplify the Daily Activities stat card to improve readability and maintain visual consistency with other dashboard metrics.

## Proposed Changes
1. **Remove the dense metric string:** Delete the `M: X vs Y | B: X vs Y` string from the card's `sub` field.
2. **Standardize the subtext:** Replace it with a simple, descriptive text: `"aktivitas tercatat"`.
3. **Maintain existing indicators:** Keep the main activity count (`stats.totals.daily`) and the visual trend indicator (`stats.trends.weeklyTrend`) to preserve insight into performance growth.

## Impact
- **Affected File:** `apps/web/src/features/dashboard/DashboardModule.tsx`
- **Visual Impact:** Cleaner layout, matching other cards in the dashboard.
- **Data Impact:** No backend or API changes required; this is purely a frontend presentation change.
