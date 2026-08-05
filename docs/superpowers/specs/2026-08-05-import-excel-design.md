# Design Doc: Import Excel (Fixed Template) for Daily Activities

## 1. Overview
This feature allows users to import hundreds of rows of daily activity data using a fixed Excel template (`CRS Dept Daily Activities 2026.xlsx`). Instead of starting from scratch, users can bypass manual data entry for historical data. The system utilizes "In-UI Error Correction" so that users can quickly fix any mismatched data (like unrecognized PICs or invalid dates) without re-uploading the file.

## 2. Architecture & Data Flow

### 2.1. Backend Parsing Endpoint (`POST /api/daily-activities/import/parse`)
- **Library:** `multer` (for file upload handling), `exceljs` (for parsing the `.xlsx` buffer in memory).
- **Process:**
  - Read the uploaded file and target the first worksheet.
  - Skip the header row (row 1).
  - For each subsequent row, map cells to the schema according to the fixed column indexes:
    - Col 2 (Tanggal) -> `activity_date`
    - Col 3 (Kegiatan) -> `activity`
    - Col 4 (Instansi/kelompok) -> `institution_group`
    - Col 5 (Alamat) -> `address`
    - Col 6 (Kategori) -> Look up ID from DB `categories` by `name` (case-insensitive).
    - Col 7 (Sub Category) -> Look up ID from DB `sub_categories` by `name`.
    - Col 8 (Fokus) -> `focus`
    - Col 9 (Lokasi) -> `location`
    - Col 10 (Biaya) -> `cost`
    - Col 11 & 12 (Keterangan + Hasil) -> Concat into `description_result`
    - Col 13 (link) -> `document_link`
    - Col 14 (PIC) -> Look up ID from DB `pics` by `name`.
- **Validation:**
  - Check if dates are valid.
  - Check if `category`, `sub_category`, and `pic` were successfully matched.
  - Check required fields (`activity`, `activity_date`).
- **Response:**
  ```json
  {
    "data": {
      "validRows": [ { ...mappedData, tempId: "row-1" } ],
      "errorRows": [ { ...mappedData, tempId: "row-2", errors: ["PIC 'John' tidak ditemukan"] } ]
    }
  }
  ```

### 2.2. Frontend UI (`ImportExcelModal.tsx`)
- **Upload State:** A drag-and-drop area or file input to select the `.xlsx` file.
- **Preview & Edit State:**
  - Displays a data table (using similar structure to `DataTable` but optimized for inline editing).
  - Valid rows have a green checkmark.
  - Error rows have a red warning and display the `errors` array messages.
  - Interactive fields: Cells that failed validation (e.g., PIC dropdown, Date picker) can be clicked and edited directly in the table.
- **Commit State:**
  - A "Simpan Data" button that is disabled as long as `errorRows.length > 0`.
  - Upon click, POSTs all corrected and valid rows to the commit endpoint.

### 2.3. Backend Commit Endpoint (`POST /api/daily-activities/import/commit`)
- **Payload:** An array of cleaned, valid `DailyActivity` objects.
- **Process:** Uses `prisma.daily_activities.createMany` to bulk insert the data.
- **Response:** Success status and count of inserted rows.

## 3. Edge Cases & Constraints
- **Empty Rows:** Excel parsers often return `null` for trailing empty rows. The backend must filter out rows where all columns are effectively empty or `No` is undefined.
- **Date Parsing:** Excel stores dates as serial numbers. `exceljs` usually parses them into JS `Date` objects if the cell format is correct, but the backend must handle string-fallback parsing if the user pasted plain text into the date column.
- **Cost Formatting:** Excel might include commas or currency symbols. The parser should cast to number robustly.
- **File Size:** The user rule limits file uploads to 5MB. Multer handles this constraint.

## 4. Scope Check
This design is fully scoped for **Daily Activities**. While the architectural pattern applies to all 7 modules, the current implementation phase will focus exclusively on Daily Activities to ensure the UX and parsing logic are stable before generalizing.
