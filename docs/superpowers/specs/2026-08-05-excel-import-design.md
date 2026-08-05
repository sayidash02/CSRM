# Design Doc: Excel Bulk Import Wizard (Approach 3)

## 1. Overview
A feature to allow users to bulk-import historical data from a predefined Excel file (`CRS.xlsx`) containing 6 modules of data. The system uses a "Wizard" approach where the user uploads the file, previews the interpreted data (including any new master data that will be auto-created), and then confirms the import.

## 2. Architecture & Data Flow
### UI Component (`ImportWizardModal`)
- **Step 1: Upload** - A drag-and-drop or file picker for `.xlsx` files.
- **Step 2: Processing** - A loading spinner while the backend parses the file.
- **Step 3: Preview** - A summary screen displaying:
  - Total valid rows found per module (e.g., Daily Activities: 156 rows, CSR: 45 rows).
  - Number of new Master Data entries to be created (e.g., 3 new PICs, 1 new Category).
- **Step 4: Execute** - A "Confirm Import" button that triggers the actual database insertion.
- **Step 5: Success** - A confirmation screen and modal dismissal.

### Backend Endpoints
1. `POST /api/upload/preview`
   - Accepts: `multipart/form-data` (the Excel file).
   - Action: Saves the file temporarily (`os.tmpdir()` or similar). Uses `exceljs` to parse the 6 sheets. Applies *Smart Header Detection*. Collects all unique string values for foreign keys (PIC, Category) and compares them against the database.
   - Returns: JSON with a `fileId` (path or identifier to the temp file) and a summary object containing row counts per module and a list of new master data strings to be created.
   - Side-effects: None (no database changes).

2. `POST /api/upload/confirm`
   - Accepts: `{ fileId: string }`.
   - Action: Reads the temp file again (or uses a cached parsed JSON if memory permits). Starts a Prisma Database Transaction (`prisma.$transaction`).
     - Auto-creates any missing PICs and Categories based on the parsed strings.
     - Inserts the rows into the 6 corresponding tables (`daily_activities`, `stakeholders`, `top_issues`, `proposals`, `csr_projects`, `grievance`).
   - Returns: Success message.
   - Side-effects: Modifies database. Deletes the temporary file.

## 3. Smart Header Detection Logic
To handle merged cells and report titles gracefully, the parsing algorithm will:
- Iterate through rows 1 to 10 of a given sheet.
- Check for specific identifying column names:
  - **Daily Activities:** Looks for "Tanggal" and "Kegiatan".
  - **Stakeholder Engagement:** Looks for "Stakeholder".
  - **Top Issues:** Looks for "Issue" or "Top 3".
  - **Proposals:** Looks for "NO REGISTRASI" or "INSTANSI".
  - **CSR Projects:** Looks for "PROGRAM" or "KEGIATAN".
  - **Grievance:** Looks for "GRIEVANCE REGISTER" or similar identifying text, followed by actual column headers (or hardcoded offsets relative to the main title).
- Once the header row is identified, the algorithm begins mapping the columns based on their text (or index). Data extraction starts from `HeaderRow + 1` until an empty row is encountered.

## 4. Master Data Auto-Creation (Option A)
- When extracting a row (e.g., a Daily Activity), if the "PIC" column contains "Budi", the backend checks the `pics` table.
- If "Budi" does not exist, it is queued for creation. 
- The newly created ID is then used for the `pic_id` foreign key.
- This applies to Categories and Sub-categories as well.

## 5. Error Handling & Transactions
- If `POST /api/upload/preview` fails (e.g., unsupported format, missing sheets), it returns a 400 Bad Request with a clear message.
- The `POST /api/upload/confirm` endpoint uses a Prisma transaction. If inserting row 150 of 200 fails due to a constraint, the entire import is rolled back, preventing partial data corruption.
