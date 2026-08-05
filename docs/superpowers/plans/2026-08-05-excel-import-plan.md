# Excel Bulk Import Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 1-click bulk import feature that allows users to upload a historical Excel file (`CRS.xlsx`), previews the data, auto-creates missing master data, and saves to 6 module tables.

**Architecture:** 
- Backend: Express routes with `multer` for file upload. `ExcelImportService` parses the `.xlsx` file using `exceljs`, applies Smart Header Detection to find tables, and uses a Prisma transaction for atomic bulk inserts.
- Frontend: `ImportWizardModal` React component that walks the user through Upload -> Preview -> Confirm steps. A prominent trigger button is added to the Dashboard.

**Tech Stack:** React, Tailwind CSS, Express, Prisma, `multer`, `exceljs`.

---

### Task 1: Backend Setup (Routes & Controller)

**Files:**
- Create: `apps/api/src/routes/import.ts`
- Create: `apps/api/src/controllers/ImportController.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Create the Controller**
Create `apps/api/src/controllers/ImportController.ts`:
```typescript
import { Request, Response } from 'express';

export const previewImport = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
  // Placeholder for service call
  res.json({ success: true, data: { fileId: req.file.path, summary: { dailyActivities: 0 }, newMasterData: { pics: [] } } });
};

export const confirmImport = async (req: Request, res: Response) => {
  const { fileId } = req.body;
  if (!fileId) return res.status(400).json({ success: false, message: "No fileId provided" });
  // Placeholder for service call
  res.json({ success: true, message: "Import successful" });
};
```

- [ ] **Step 2: Create the Routes**
Create `apps/api/src/routes/import.ts`:
```typescript
import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { previewImport, confirmImport } from '../controllers/ImportController';

const router = Router();
const upload = multer({ dest: path.join(os.tmpdir(), 'crms-imports') });

router.post('/preview', upload.single('file'), previewImport);
router.post('/confirm', confirmImport);

export default router;
```

- [ ] **Step 3: Mount the routes in app.ts**
Modify `apps/api/src/app.ts`. Add `import importRoutes from './routes/import';` and `app.use('/api/import', importRoutes);`.

- [ ] **Step 4: Verify Compilation**
Run: `npx tsc --noEmit --project apps/api/tsconfig.json`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/api/src/routes/import.ts apps/api/src/controllers/ImportController.ts apps/api/src/app.ts
git commit -m "feat: add import routes and controller shells"
```

---

### Task 2: Excel Parsing & Preview Service

**Files:**
- Create: `apps/api/src/services/ExcelImportService.ts`
- Modify: `apps/api/src/controllers/ImportController.ts`

- [ ] **Step 1: Write ExcelImportService logic**
Create `apps/api/src/services/ExcelImportService.ts`. Implement the `preview` method which reads the file using `exceljs`, applies smart header detection (searching rows 1-10 for keywords like "Tanggal" for Daily Activities), and extracts counts. Extract unique PICs and Categories from the Daily Activities sheet, query Prisma to see what's missing, and return the summary.

```typescript
import ExcelJS from 'exceljs';
import prisma from '../lib/prisma';

export class ExcelImportService {
  static async preview(filePath: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    // Minimal mock for plan brevity: The actual subagent will implement 
    // smart header detection (rows 1-10) and data extraction for all 6 sheets here.
    let dailyCount = 0;
    const pics = new Set<string>();
    const sheet = workbook.worksheets.find(w => w.name.toLowerCase().includes('daily'));
    if (sheet) {
      // Find header...
      dailyCount = Math.max(0, sheet.rowCount - 2); // Approximation for preview
      pics.add("Placeholder PIC");
    }

    return {
      fileId: filePath,
      summary: {
        dailyActivities: dailyCount,
        stakeholders: 0,
        topIssues: 0,
        proposals: 0,
        csr: 0,
        grievance: 0
      },
      newMasterData: {
        pics: Array.from(pics),
        categories: []
      }
    };
  }
  
  static async confirm(fileId: string) {
    // To be implemented in Task 3
    return true;
  }
}
```

- [ ] **Step 2: Connect Service to Controller**
Modify `apps/api/src/controllers/ImportController.ts` to call `ExcelImportService.preview(req.file.path)` and handle errors via `try/catch`.

- [ ] **Step 3: Verify Compilation**
Run: `npx tsc --noEmit --project apps/api/tsconfig.json`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/services/ExcelImportService.ts apps/api/src/controllers/ImportController.ts
git commit -m "feat: implement excel parsing preview service"
```

---

### Task 3: Excel Import Execution (Transactions)

**Files:**
- Modify: `apps/api/src/services/ExcelImportService.ts`
- Modify: `apps/api/src/controllers/ImportController.ts`

- [ ] **Step 1: Implement confirm method**
In `apps/api/src/services/ExcelImportService.ts`, implement `confirm(fileId: string)`. 
1. Re-parse the excel file to get structured JSON arrays for all 6 modules.
2. Use `prisma.$transaction`.
3. Auto-create missing PICs, Categories, and SubCategories. Build a mapping dict (e.g., `picMap['Septian'] = id`).
4. Map the string relations in Daily Activities to their IDs.
5. Bulk insert (`createMany`) into `daily_activities`, `stakeholder_engagement`, `top_issues`, `proposals`, `csr_projects`, `grievance`.
6. Use `fs.unlinkSync(fileId)` to clean up the temp file.

- [ ] **Step 2: Connect confirm in Controller**
Modify `apps/api/src/controllers/ImportController.ts` to call `ExcelImportService.confirm(fileId)`. Handle try/catch and return `200 OK`.

- [ ] **Step 3: Verify Compilation**
Run: `npx tsc --noEmit --project apps/api/tsconfig.json`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/services/ExcelImportService.ts apps/api/src/controllers/ImportController.ts
git commit -m "feat: implement excel import db transaction execution"
```

---

### Task 4: Frontend UI Component (ImportWizardModal)

**Files:**
- Create: `apps/web/src/features/import/ImportWizardModal.tsx`

- [ ] **Step 1: Create the UI Component**
Create `apps/web/src/features/import/ImportWizardModal.tsx`. It needs state for `step` ('upload', 'processing', 'preview', 'success'), `file`, and `previewData`.

```tsx
import React, { useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { Modal, ModalFooter } from '../../components/ui/Modal';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

export function ImportWizardModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [step, setStep] = useState<'upload' | 'processing' | 'preview' | 'success'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) return;
    setStep('processing');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiClient.post('/import/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      setPreviewData(res.data.data);
      setStep('preview');
    } catch (e) {
      alert("Failed to preview file");
      setStep('upload');
    }
  };

  const handleConfirm = async () => {
    setStep('processing');
    try {
      await apiClient.post('/import/confirm', { fileId: previewData.fileId });
      setStep('success');
    } catch (e) {
      alert("Failed to import data");
      setStep('preview');
    }
  };

  return (
    <Modal title="Import Master Excel" onClose={onClose}>
      <div className="p-6">
        {step === 'upload' && (
          <div className="flex flex-col gap-4">
            <input type="file" accept=".xlsx" onChange={e => setFile(e.target.files?.[0] || null)} className="border p-2" />
            <button onClick={handleUpload} disabled={!file} className="bg-primary text-white px-4 py-2 rounded">Preview Data</button>
          </div>
        )}
        {step === 'processing' && <div className="text-center py-8">Processing...</div>}
        {step === 'preview' && previewData && (
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold">Import Summary</h3>
            <ul className="text-sm">
              <li>Daily Activities: {previewData.summary.dailyActivities} rows</li>
              <li>New PICs: {previewData.newMasterData.pics.length}</li>
            </ul>
            <button onClick={handleConfirm} className="bg-primary text-white px-4 py-2 rounded">Confirm Import</button>
          </div>
        )}
        {step === 'success' && (
          <div className="text-center py-8 flex flex-col items-center gap-2">
            <CheckCircle className="text-green-500" size={48} />
            <p>Import Complete!</p>
            <button onClick={() => { onSuccess(); onClose(); }} className="bg-primary text-white px-4 py-2 rounded mt-4">Tutup</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify Compilation**
Run: `npx tsc --noEmit --project apps/web/tsconfig.json`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/features/import/ImportWizardModal.tsx
git commit -m "feat: add import wizard modal UI"
```

---

### Task 5: Integrate ImportWizard to Dashboard

**Files:**
- Modify: `apps/web/src/features/dashboard/DashboardModule.tsx`

- [ ] **Step 1: Add Trigger Button**
Modify `DashboardModule.tsx` to include an "Import Data Excel" button near the top title or in a new actions section. Render `<ImportWizardModal>` when clicked.

```tsx
// Inside DashboardModule.tsx, near top imports:
import { ImportWizardModal } from '../import/ImportWizardModal';
import { UploadCloud } from 'lucide-react';

// Inside component state:
const [showImport, setShowImport] = useState(false);

// Inside the JSX render, near the header:
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
  <button 
    onClick={() => setShowImport(true)}
    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors"
  >
    <UploadCloud size={16} />
    Import Excel
  </button>
</div>

// At the bottom of the component:
{showImport && (
  <ImportWizardModal 
    onClose={() => setShowImport(false)} 
    onSuccess={() => {
      // Trigger dashboard reload if needed, or window.location.reload()
      window.location.reload(); 
    }} 
  />
)}
```

- [ ] **Step 2: Verify Compilation**
Run: `npx tsc --noEmit --project apps/web/tsconfig.json`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/features/dashboard/DashboardModule.tsx
git commit -m "feat: integrate import wizard trigger to dashboard"
```
