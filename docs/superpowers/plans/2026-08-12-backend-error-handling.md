# Backend Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize Prisma error handling across all 15+ controllers using an Express error middleware and an async wrapper (`catchAsync`) to satisfy `AGENTS.md` requirements and remove repetitive `try-catch` blocks.

**Architecture:** We will create `catchAsync.ts` to wrap all controller functions so that unhandled promise rejections are automatically passed to Express's `next()`. We will also create `errorHandler.ts` to globally intercept Prisma errors (`P2002`, `P2025`, `PrismaClientValidationError`) and map them to HTTP 400/404/409 responses. Finally, we will apply this to all controllers in `apps/api/src/controllers/`.

*(Note: Multer uploads in `upload.ts`, `import.ts`, and `DailyActivitiesController.ts` are already correctly wrapped in callbacks as per `AGENTS.md`, so we don't need to refactor them, just ensure they pass unhandled errors to `next()` if needed.)*

**Tech Stack:** Express, TypeScript, Prisma.

---

### Task 1: Create Global Error Handler Utilities

**Files:**
- Create: `apps/api/src/lib/catchAsync.ts`
- Create: `apps/api/src/lib/errorHandler.ts`

- [ ] **Step 1: Write `catchAsync.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';

export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};
```

- [ ] **Step 2: Write `errorHandler.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error]', err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Data duplikat telah ada' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Referensi ID (Foreign Key) tidak valid atau tidak ditemukan' });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Format data tidak valid' });
  }

  // Fallback for other errors
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/catchAsync.ts apps/api/src/lib/errorHandler.ts
git commit -m "feat: add catchAsync and global errorHandler utilities"
```

---

### Task 2: Integrate Global Error Handler into App

**Files:**
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Apply `errorHandler` as the last middleware**

In `apps/api/src/app.ts`, import the error handler at the top and add it at the very bottom (after `app.use('/api/dev', devRoutes);`):

```typescript
// Add to imports at the top
import { errorHandler } from './lib/errorHandler';

// ... existing code ...

app.use('/api/dev', devRoutes);

// MUST BE THE LAST MIDDLEWARE
app.use(errorHandler);

export default app;
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/app.ts
git commit -m "chore: register global errorHandler in Express app"
```

---

### Task 3: Refactor Controllers (Batch 1)

**Files:**
- Modify: `apps/api/src/controllers/StakeholdersController.ts`
- Modify: `apps/api/src/controllers/TopIssuesController.ts`
- Modify: `apps/api/src/controllers/ProposalsController.ts`
- Modify: `apps/api/src/controllers/GrievanceController.ts`

- [ ] **Step 1: Refactor `StakeholdersController.ts`**

In `apps/api/src/controllers/StakeholdersController.ts`, import `catchAsync`, wrap all exported functions, remove `try/catch` blocks, and remove manual `P2025` handling:

```typescript
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';

export const createStakeholder = catchAsync(async (req: Request, res: Response) => {
  // ... core logic without try/catch
});

export const getStakeholders = catchAsync(async (req: Request, res: Response) => {
  // ... core logic without try/catch
});

// Repeat for deleteStakeholder, updateStakeholder, restoreStakeholder
```

- [ ] **Step 2: Repeat refactoring for `TopIssuesController.ts`, `ProposalsController.ts`, `GrievanceController.ts`**

Apply the exact same `catchAsync` wrapper and strip `try/catch` from these controllers.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/controllers/StakeholdersController.ts apps/api/src/controllers/TopIssuesController.ts apps/api/src/controllers/ProposalsController.ts apps/api/src/controllers/GrievanceController.ts
git commit -m "refactor: apply catchAsync to controllers batch 1"
```

---

### Task 4: Refactor Controllers (Batch 2)

**Files:**
- Modify: `apps/api/src/controllers/ArchiveController.ts`
- Modify: `apps/api/src/controllers/CsrProjectsController.ts`
- Modify: `apps/api/src/controllers/DailyActivitiesController.ts`
- Modify: `apps/api/src/controllers/DashboardController.ts`
- Modify: `apps/api/src/controllers/DevController.ts`
- Modify: `apps/api/src/controllers/LrpController.ts`
- Modify: `apps/api/src/controllers/PicsController.ts`

- [ ] **Step 1: Refactor all files in Batch 2**

Strip `try/catch`, remove custom `handleControllerError` where applicable (like in `DailyActivitiesController.ts`), and wrap exported functions in `catchAsync`. 

*Special Note for `DailyActivitiesController.ts`: Keep the `importParseExcel` logic intact as it uses Multer's callback, but wrap `importCommitExcel` with `catchAsync`.*

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/controllers/
git commit -m "refactor: apply catchAsync to controllers batch 2"
```

---

### Task 5: Refactor Controllers (Batch 3)

**Files:**
- Modify: `apps/api/src/controllers/ReferencesController.ts`
- Modify: `apps/api/src/controllers/StakeholderController.ts`
- Modify: `apps/api/src/controllers/SyncController.ts`
- Modify: `apps/api/src/controllers/UploadController.ts`
- Modify: `apps/api/src/controllers/YearsController.ts`

- [ ] **Step 1: Refactor all files in Batch 3**

Strip `try/catch` blocks and wrap exported functions in `catchAsync`.

- [ ] **Step 2: Test the Application**

Run the API tests or run `npm run dev` and manually verify that a Prisma error (e.g., trying to create a duplicate name where `@unique` applies) returns a clean JSON `409 Conflict` instead of a 500 error.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/controllers/
git commit -m "refactor: apply catchAsync to controllers batch 3"
```
