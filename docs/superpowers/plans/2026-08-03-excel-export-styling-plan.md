# Implementation Plan: Excel Export Styling (Corporate Hybrid)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the `exceljs` export logic in the backend to implement a beautiful, corporate-grade styling with zebra striping, auto-filters, freeze panes, and wrap-text.

---

### Task 1: Refactor `export.ts` to Apply Corporate Styling

**Files:**
- Modify: `apps/api/src/routes/export.ts`

- [ ] **Step 1: Setup Columns and Data Mapping**
  1. Initialize `worksheet` as usual.
  2. Set `worksheet.columns = columns;` (this natively writes headers to Row 1).
  3. Insert data rows using `data.forEach((row) => worksheet.addRow(row));`.

- [ ] **Step 2: Shift Rows and Add Document Title Header**
  1. Shift all rows down by 3 to make room for the document title: `worksheet.spliceRows(1, 0, [], [], []);`
  2. Access Row 1, set cell A1 value to `Data Export - ${sheetName}`.
  3. Style Row 1: `font = { size: 16, bold: true }`.
  4. Merge Row 1 cells: `worksheet.mergeCells(1, 1, 1, columns.length);`
  5. Access Row 2, set cell A2 value to `Generated on: ${new Date().toLocaleString()}`.
  6. Style Row 2: `font = { italic: true }`.
  7. Merge Row 2 cells: `worksheet.mergeCells(2, 1, 2, columns.length);`

- [ ] **Step 3: Style the Table Header (Now Row 4)**
  1. Access Row 4: `const headerRow = worksheet.getRow(4);`
  2. Set background color to Navy: `fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };`
  3. Set text color to White and Bold: `font = { color: { argb: 'FFFFFFFF' }, bold: true };`
  4. Set alignment: `alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };`
  5. Apply auto-filter for the entire table width on row 4: `worksheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };`
  6. Apply Freeze Panes so row 4 and above stick to the top: `worksheet.views = [{ state: 'frozen', ySplit: 4 }];`

- [ ] **Step 4: Style Data Rows and Apply Zebra Striping (Rows 5 onwards)**
  1. Iterate over all rows starting from Row 5: `for (let i = 5; i <= worksheet.rowCount; i++)`
  2. For each cell in the row (`row.eachCell(...)`):
     - Apply thin borders on all 4 sides: `border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }`
     - Apply alignment: `alignment = { vertical: 'top', wrapText: true }`
     - Apply Zebra Striping: If `i % 2 === 0` (even rows), set background fill to light gray: `fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F4F4' } };`
     - Otherwise, set background fill to white: `fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };`

- [ ] **Step 5: Verification & Commit**
  Run `npx tsc --noEmit` in `apps/api` (if possible) or ensure TypeScript types are correct.
  Commit changes: `git add apps/api/src/routes/export.ts && git commit -m "feat: overhaul excel export styling"`
