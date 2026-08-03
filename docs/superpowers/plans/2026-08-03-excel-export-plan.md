# Implementation Plan: Excel Export

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement server-side Excel generation using `exceljs` and connect it to the frontend's `handleExport` function. Integrate it fully for the `DailyActivitiesModule.tsx`.

**Tech Stack:** Node.js, Express, React, TypeScript.

---

### Task 1: Backend Setup (`exceljs`)

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/routes/export.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Install `exceljs`**
  Run `npm install exceljs` inside `apps/api`.

- [ ] **Step 2: Create Export Route**
  Create `apps/api/src/routes/export.ts`.
  It must export an express router with a `POST /excel` route.
  The route should extract `{ sheetName = 'Export', columns = [], data = [] } = req.body`.
  Initialize `const workbook = new ExcelJS.Workbook();` and `const worksheet = workbook.addWorksheet(sheetName);`.
  Map the `worksheet.columns` using the `columns` array (ensure you pass `header`, `key`, and `width`).
  Style the first row: `worksheet.getRow(1).font = { bold: true }; worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };`
  Loop through `data` and `worksheet.addRow(row)`.
  Set headers for file download (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename=${sheetName}.xlsx`).
  Send response: `await workbook.xlsx.write(res); res.end();`. Add a try/catch block returning a 500 status on error.

- [ ] **Step 3: Wire Route in App**
  In `apps/api/src/app.ts`, import `exportRoutes` and register it: `app.use('/api/export', exportRoutes);`.

---

### Task 2: Frontend Download Logic

**Files:**
- Modify: `apps/web/src/app/App.tsx`

- [ ] **Step 1: Update `handleExport`**
  In `App.tsx`, update `handleExport` to accept `(label: string, payload?: { columns: any[], data: any[] })`.
  Inside `handleExport`:
  1. Show loading toast: `showToast("Mempersiapkan \"..." + label + ".xlsx\"...", "info")`
  2. If `payload` exists, do a `try { const response = await apiClient.post('/export/excel', { sheetName: label, ...payload }, { responseType: 'blob' }); ... } catch(e) {}`.
  3. Inside the `try`, create an object URL: `const url = window.URL.createObjectURL(new Blob([response.data]));`. Create a temporary `<a>` element, set `href = url`, `download = label + ".xlsx"`, append to body, `.click()`, then remove it and revoke the URL. Show success toast.
  4. If it errors, show error toast.

---

### Task 3: Integrate with Daily Activities

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Update `onExport` prop type**
  Update the component signature so `onExport` accepts `payload?: any`. 
  `{ onExport: (l: string, payload?: any) => void; ... }`

- [ ] **Step 2: Generate Payload on Click**
  Create a `handleExportClick` function.
  Define `exportColumns` mapping the table headers and widths (e.g. `{ header: "Tanggal", key: "tanggal", width: 15 }`).
  Define `exportData` by mapping the `displayed` state array, extracting the raw string/number values (resolve `pic.name`, format dates, leave `cost` as a number).
  Call `onExport("Daily Activities", { columns: exportColumns, data: exportData })`.

- [ ] **Step 3: Update TopBar Prop**
  Change the `TopBar`'s `onExport` prop to call `handleExportClick` instead of just passing the label and items.

- [ ] **Step 4: Verify and Commit**
  Run `npx tsc --noEmit` inside `apps/web` and `apps/api`.
  Commit all changes: `git add . && git commit -m "feat: implement excel export for daily activities"`.

Report back when all tasks are complete.
