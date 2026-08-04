# Date Range Filter Design

## Overview
A reusable date range filter component to allow users to filter records (such as Daily Activities) by a specific start and end date, instead of relying solely on the search bar or scrolling.

## Scope
- Create a new reusable React component `DateRangeFilter`.
- Integrate it into the `TopBar` component.
- Implement the filter logic initially in the `DailyActivitiesModule`.

## Architecture & Components

### 1. `DateRangeFilter` Component (`src/components/ui/DateRangeFilter.tsx`)
- **Trigger Button**: Displays "Semua Tanggal" if no filter is active. If active, displays the formatted range (e.g., "01 Agu - 07 Agu").
- **Popover/Dropdown**:
  - **Presets**: Quick buttons for "Hari Ini", "7 Hari Terakhir", "Bulan Ini", "Semua Waktu".
  - **Manual Inputs**: Two `<input type="date">` fields for "Dari" (Start) and "Sampai" (End).
  - **Actions**: "Terapkan" (Apply) to submit the manual dates, and "Reset" to clear.

### 2. `TopBar` Modifications
Add new props to the `TopBar` component:
- `showDateFilter?: boolean`
- `dateRange?: { start: string, end: string }`
- `onDateRangeChange?: (range: { start: string, end: string }) => void`

### 3. Data Filtering Logic
In module components (e.g., `DailyActivitiesModule.tsx`):
- Add local state: `const [dateRange, setDateRange] = useState({ start: "", end: "" });`
- Update the `displayed` memoized list to filter by date:
  - If `dateRange.start` is set, filter items where `item_date >= dateRange.start`.
  - If `dateRange.end` is set, filter items where `item_date <= dateRange.end`.
- Date column mapping will vary per module (e.g., `activity_date` for Daily Activities).

## Error Handling
- Validate that the start date is not after the end date before applying the filter. If invalid, handle gracefully (e.g., swap the dates or disable the apply button).

## Testing
- Verify that selecting a preset correctly sets the dates and filters the list.
- Verify that manual input works.
- Verify that clearing the filter ("Semua Waktu" or "Reset") restores the full list.
