# Stakeholder Excel Import Fix Design

## Objective
Fix two issues related to importing Stakeholder Engagement data from the `CRS(Isi).xlsx` template:
1. Dates in the system are shifted 1 day earlier than what is written in the Excel file.
2. The Venue string is bundled together with the Date string in the database because the Excel template uses a single "Date And Venue" column separated by a newline (`\n`).

## Approach

### 1. Fix Timezone Shift Globally (`parseCellDate` in `ExcelImportService.ts`)
The root cause of the date shift is that Node.js `Date.parse()` interprets date strings without explicit timezones as local time. When this local time is saved/converted to UTC for storage in the database, it shifts backwards by the local timezone offset (e.g., UTC+7 shifts back 7 hours). If the local date was parsed as 00:00:00, the resulting UTC time falls on the previous day.

**Change:**
Update the generic `parseCellDate` function to explicitly construct a UTC Date object when parsing matched string dates. We will use `Date.UTC(year, month, date)` to ensure the time is strictly `00:00:00 UTC`.

### 2. Split "Date And Venue" Field in Stakeholder Sheet (`ExcelImportService.ts`)
The Stakeholder Engagement sheet contains a column named "Date And Venue" where the contents look like `"Sabtu, 06 Juni 2026\nKaranganyar"`. Currently, the system attempts to parse this entire string as a Date, and saves the entire string as the Venue.

**Change:**
- Locate the extraction logic for `rawStakeholders`.
- Extract the raw string from the combined column.
- Check for a newline (`\n`). If present, split the string into two segments.
- Pass the first segment (the date portion) to `parseCellDate()`.
- Use the second segment (the venue portion) as the actual `venue`.
- If no newline is present, fallback to the current behavior (attempt to extract the date, use the whole string as venue).

### 3. Restore Combined Format for Export (`SyncService.ts`)
When exporting the master data back to Excel, the `SyncService` creates the Stakeholder Engagement sheet. Since we are now cleanly separating Date and Venue in the database, we must concatenate them back into a single cell to preserve the expected `[Date]\n[Venue]` format for the end user.

**Change:**
- In `SyncService.ts` (`addStakeholdersSheet`), modify the `date_venue` row assembly.
- Combine the formatted date and the venue string using `\n` as the delimiter.

## Scope & Trade-offs
- This change specifically targets the parsing mechanism of the Stakeholder Engagement sheet without requiring the user to change their existing Excel templates.
- **Trade-off:** The splitting logic depends heavily on the presence of a newline (`\n`). If a user mistakenly separates the date and venue using only spaces or commas, the venue extraction may be incomplete. However, the `parseCellDate` regex will still reliably extract the date. This is an acceptable trade-off for backwards compatibility with the current template.
