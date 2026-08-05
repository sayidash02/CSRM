# Spec: Archive & Year Filter Feature

## 1. Overview
The user requires a mechanism to manage CRMS data year-by-year. To prevent accidental permanent data loss and allow flexible viewing, this feature introduces a Global Year Filter and an Archive/Restore system. Data is not permanently deleted; instead, it is safely backed up to SharePoint (as an Excel master file) and soft-deleted (archived) from the active UI.

## 2. Architecture & Database Changes
To differentiate between a manual user deletion (soft delete) and an automated archive deletion, we will introduce a new boolean column `is_archived` to all 7 module tables.

**Schema Update (Migration):**
Add `is_archived BOOLEAN NOT NULL DEFAULT FALSE` to the following tables:
- `daily_activities`
- `stakeholder_engagement`
- `top_issues`
- `proposals`
- `csr_projects`
- `grievance`
- `lrp`

*Index Recommendation:* Add an index on `is_archived` to optimize global filtering queries.

**Year Determination Logic:**
Since not all tables have a standard `date` column, the "year" of a record will be determined by:
- `daily_activities`: `YEAR(activity_date)`
- `stakeholder_engagement`: `YEAR(date)`
- `top_issues`: `YEAR(created_at)` (Since `period` is a free-text VARCHAR)
- `proposals`: `YEAR(date_received)`
- `csr_projects`: `project_year`
- `grievance`: `YEAR(log_date)`
- `lrp`: `YEAR(created_at)`

## 3. Core Components

### 3.1 Global Year Filter (UI & Backend)
- **UI:** A global dropdown in the application header/navigation to select the "Active Year".
- **Backend:** All `GET` list endpoints (Search/Filter/Export) will accept a `year` query parameter. 
- **Query Condition:** Queries will append `WHERE is_deleted = FALSE AND is_archived = FALSE AND <Year Logic> = <Selected Year>`.

### 3.2 Archive (Tutup Tahun) Flow
- **UI:** A dedicated "Pengaturan Arsip" (Archive Settings) page.
- **Action:** User selects a year (e.g., 2025) and clicks "Arsipkan".
- **Warning Prompt:** "Anda akan mengarsipkan data tahun 2025. Data akan diekspor ke Excel untuk pengamanan, lalu disembunyikan dari aplikasi. Apakah Anda yakin?"
- **Backend Execution:**
  1. Retrieve all records for the selected year across all 7 modules (where `is_deleted = FALSE` and `is_archived = FALSE`).
  2. Generate a 7-sheet Excel file (similar to the standard Sync logic) representing the archive snapshot.
  3. Upload the Excel file to SharePoint (e.g., in a specific `Arsip` folder or named `Arsip_2025.xlsx`).
  4. Perform bulk update: `UPDATE <table> SET is_archived = TRUE WHERE <Year Logic> = 2025 AND is_deleted = FALSE`.
  5. Log the archive event (optional, can reuse `sync_log` with a specific status/type or create `archive_log`).

### 3.3 Restore (Pulihkan) Flow
- **UI:** In the "Pengaturan Arsip" page, a list of previously archived years.
- **Action:** User clicks "Pulihkan" on a specific year.
- **Backend Execution:**
  1. Perform bulk update: `UPDATE <table> SET is_archived = FALSE WHERE <Year Logic> = <Selected Year> AND is_archived = TRUE`.
  2. Data returns to the active pool (viewable when the Global Filter is set to that year). Note that data manually deleted (`is_deleted = TRUE`) remains deleted.

## 4. Error Handling & Idempotency
- **Transactions:** The `is_archived` update across 7 tables must be wrapped in a database transaction to prevent partial archives.
- **Double-Click Prevention:** The Archive button must be disabled immediately upon click and display a loading state until the SharePoint upload and database transaction complete.
- **SharePoint Failures:** If the Excel upload fails, the database transaction must be aborted (rolled back). Data is only archived if the backup is successfully secured.

## 5. Scope & Constraints
- The archive Excel generation reuses the existing `exceljs` logic built for the "Export & Sync" feature.
- The SharePoint upload uses the existing `DocumentUploadService`/Graph API configuration.
