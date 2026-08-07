# Soft Delete & Restore UI All Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement UI and backend logic to view and restore soft-deleted data across the remaining CRMS modules.

**Architecture:** Modify `GET` endpoints to accept an optional `is_deleted=true` query. Add `PATCH /:id/restore` endpoints to set `is_deleted = false`. In the frontend, add a toggle in the top bar to fetch deleted records, and replace standard actions with a "Restore" button when in deleted mode.

**Tech Stack:** Express, Prisma, React, Vite, Tailwind

---

### Task 1: Update LRP Backend

**Files:**
- Modify: `apps/api/src/controllers/LrpController.ts`
- Modify: `apps/api/src/routes/lrp.ts`
- Modify: `apps/api/tests/lrp.test.ts`

- [ ] **Step 1: Write the failing test**
In `apps/api/tests/lrp.test.ts`, ensure `prisma` is imported from `../src/lib/prisma` (not `new PrismaClient()`). Add:
```typescript
  it('Should return deleted LRP when is_deleted=true', async () => {
    const res = await request(app).get('/api/lrp?is_deleted=true');
    expect(res.status).toBe(200);
  });
  it('Should return 404 when restoring non-existent lrp', async () => {
    const res = await request(app).patch('/api/lrp/999999/restore');
    expect(res.status).toBe(404);
  });
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx dotenv -e .env.test -- jest tests/lrp.test.ts`

- [ ] **Step 3: Modify GET handler in LrpController**
Find `getLrp` and update the `where` declaration:
```typescript
    const { year, is_deleted } = req.query;
    const isDeletedFilter = is_deleted === 'true';
    const where: any = { is_deleted: isDeletedFilter, is_archived: false };
```

- [ ] **Step 4: Add restore handler in LrpController**
```typescript
export const restoreLrp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.lrp.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: false }
    });
    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error.code === 'P2025') {
       res.status(404).json({ error: 'LRP not found' });
       return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
```
(Also remove any manual `id.toString()` in responses in the controller)

- [ ] **Step 5: Update routes in lrp.ts**
```typescript
import { restoreLrp } from '../controllers/LrpController';
router.patch('/:id/restore', restoreLrp);
```

- [ ] **Step 6: Run test to verify it passes**
Run: `npx dotenv -e .env.test -- jest tests/lrp.test.ts`

- [ ] **Step 7: Commit**
```bash
git add apps/api/src/controllers/LrpController.ts apps/api/src/routes/lrp.ts apps/api/tests/lrp.test.ts
git commit -m "feat(api): update LRP backend with soft delete filter and restore endpoint"
```

### Task 2: Update Stakeholders Backend

**Files:**
- Modify: `apps/api/src/controllers/StakeholdersController.ts`
- Modify: `apps/api/src/routes/stakeholders.ts`
- Modify: `apps/api/tests/stakeholders.test.ts`

- [ ] **Step 1: Write the failing test**
In `apps/api/tests/stakeholders.test.ts` (ensure `prisma` singleton):
```typescript
  it('Should return deleted stakeholders when is_deleted=true', async () => {
    const res = await request(app).get('/api/stakeholders?is_deleted=true');
    expect(res.status).toBe(200);
  });
  it('Should return 404 when restoring non-existent stakeholder', async () => {
    const res = await request(app).patch('/api/stakeholders/999999/restore');
    expect(res.status).toBe(404);
  });
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx dotenv -e .env.test -- jest tests/stakeholders.test.ts`

- [ ] **Step 3: Modify GET handler in StakeholdersController**
Find `getStakeholders` and update `where`:
```typescript
    const { year, is_deleted } = req.query;
    const isDeletedFilter = is_deleted === 'true';
    const where: any = { is_deleted: isDeletedFilter, is_archived: false };
```

- [ ] **Step 4: Add restore handler in StakeholdersController**
```typescript
export const restoreStakeholder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.stakeholders.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: false }
    });
    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error.code === 'P2025') {
       res.status(404).json({ error: 'Stakeholder not found' });
       return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
```
(Remove any manual `id.toString()` in this file).

- [ ] **Step 5: Update routes in stakeholders.ts**
```typescript
import { restoreStakeholder } from '../controllers/StakeholdersController';
router.patch('/:id/restore', restoreStakeholder);
```

- [ ] **Step 6: Run test to verify it passes**
Run: `npx dotenv -e .env.test -- jest tests/stakeholders.test.ts`

- [ ] **Step 7: Commit**
```bash
git add apps/api/src/controllers/StakeholdersController.ts apps/api/src/routes/stakeholders.ts apps/api/tests/stakeholders.test.ts
git commit -m "feat(api): update Stakeholders backend with soft delete filter and restore endpoint"
```

### Task 3: Update Top Issues Backend

**Files:**
- Modify: `apps/api/src/controllers/TopIssuesController.ts`
- Modify: `apps/api/src/routes/topIssues.ts`
- Modify: `apps/api/tests/topIssues.test.ts`

- [ ] **Step 1: Write the failing test**
In `apps/api/tests/topIssues.test.ts` (ensure `prisma` singleton):
```typescript
  it('Should return deleted top issues when is_deleted=true', async () => {
    const res = await request(app).get('/api/top-issues?is_deleted=true');
    expect(res.status).toBe(200);
  });
  it('Should return 404 when restoring non-existent top issue', async () => {
    const res = await request(app).patch('/api/top-issues/999999/restore');
    expect(res.status).toBe(404);
  });
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx dotenv -e .env.test -- jest tests/topIssues.test.ts`

- [ ] **Step 3: Modify GET handler in TopIssuesController**
Find `getTopIssues` and update `where`:
```typescript
    const { year, is_deleted } = req.query;
    const isDeletedFilter = is_deleted === 'true';
    const where: any = { is_deleted: isDeletedFilter, is_archived: false };
```

- [ ] **Step 4: Add restore handler in TopIssuesController**
```typescript
export const restoreTopIssue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.top_issues.update({
      where: { id: BigInt(id as string) },
      data: { is_deleted: false }
    });
    res.status(200).json({ data: result });
  } catch (error: any) {
    if (error.code === 'P2025') {
       res.status(404).json({ error: 'Top Issue not found' });
       return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
```
(Remove any manual `id.toString()` in this file).

- [ ] **Step 5: Update routes in topIssues.ts**
```typescript
import { restoreTopIssue } from '../controllers/TopIssuesController';
router.patch('/:id/restore', restoreTopIssue);
```

- [ ] **Step 6: Run test to verify it passes**
Run: `npx dotenv -e .env.test -- jest tests/topIssues.test.ts`

- [ ] **Step 7: Commit**
```bash
git add apps/api/src/controllers/TopIssuesController.ts apps/api/src/routes/topIssues.ts apps/api/tests/topIssues.test.ts
git commit -m "feat(api): update Top Issues backend with soft delete filter and restore endpoint"
```

### Task 4: Update Frontend Proposals Component

**Files:**
- Modify: `apps/web/src/features/proposals/ProposalsModule.tsx`

- [ ] **Step 1: Add State for Toggle**
Inside `export default function ProposalsModule()`, add:
```typescript
  const [showDeleted, setShowDeleted] = useState(false);
```

- [ ] **Step 2: Update the Fetch Request**
Update `fetchData` to append `is_deleted`:
```typescript
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/proposals?is_deleted=${showDeleted}`);
      setItems(res.data.data);
    } catch (e: any) {
      console.error(e);
      showToast?.("Gagal memuat data proposal", "error");
    } finally {
      setLoading(false);
    }
  };
```
Add `showDeleted` to the `useEffect` that calls `fetchData`.

- [ ] **Step 3: Add the Toggle to TopBar**
Update `TopBar` JSX:
```tsx
        <TopBar
          // ... existing props ...
        >
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm font-medium text-foreground">Data Terhapus:</span>
            <input 
              type="checkbox" 
              checked={showDeleted} 
              onChange={(e) => setShowDeleted(e.target.checked)} 
              className="w-4 h-4 rounded border-border text-blue-600 focus:ring-ring"
            />
          </div>
          {!showDeleted && onAdd && (
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus size={14} /> Tambah
            </button>
          )}
        </TopBar>
```

- [ ] **Step 4: Implement Restore Action**
Add `handleRestore`:
```typescript
  const handleRestore = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin memulihkan data ini?")) return;
    try {
      await apiClient.patch(`/proposals/${id}/restore`);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };
```

- [ ] **Step 5: Modify Table Actions Column**
In the actions column render logic:
```tsx
  {showDeleted ? (
     <button onClick={() => handleRestore(item.id)} className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1">
       Restore
     </button>
  ) : (
    <div className="flex items-center justify-end gap-2">
      {/* existing edit and delete buttons */}
    </div>
  )}
```

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/features/proposals/ProposalsModule.tsx
git commit -m "feat(web): add soft delete view and restore to Proposals UI"
```

### Task 5: Update Frontend CSR Projects Component

**Files:**
- Modify: `apps/web/src/features/csr-projects/CsrProjectsModule.tsx`

- [ ] **Step 1: Add State for Toggle**
Inside `export default function CsrProjectsModule()`, add:
```typescript
  const [showDeleted, setShowDeleted] = useState(false);
```

- [ ] **Step 2: Update the Fetch Request**
Update `fetchData` to append `is_deleted`:
```typescript
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/csr-projects?is_deleted=${showDeleted}`);
      setItems(res.data.data);
    } catch (e: any) {
      console.error(e);
      showToast?.("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };
```
Add `showDeleted` to the `useEffect` that calls `fetchData`.

- [ ] **Step 3: Add the Toggle to TopBar**
Update `TopBar` JSX (hide standard Tambah button, add Data Terhapus checkbox):
```tsx
        <TopBar
          // ... existing props ...
        >
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm font-medium text-foreground">Data Terhapus:</span>
            <input 
              type="checkbox" 
              checked={showDeleted} 
              onChange={(e) => setShowDeleted(e.target.checked)} 
              className="w-4 h-4 rounded border-border text-blue-600 focus:ring-ring"
            />
          </div>
          {!showDeleted && (
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus size={14} /> Tambah
            </button>
          )}
        </TopBar>
```

- [ ] **Step 4: Implement Restore Action**
Add `handleRestore`:
```typescript
  const handleRestore = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin memulihkan data ini?")) return;
    try {
      await apiClient.patch(`/csr-projects/${id}/restore`);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };
```

- [ ] **Step 5: Modify Table Actions Column**
In the actions column render logic:
```tsx
  {showDeleted ? (
     <button onClick={() => handleRestore(item.id)} className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1">
       Restore
     </button>
  ) : (
    <div className="flex items-center justify-end gap-2">
      {/* existing edit and delete buttons */}
    </div>
  )}
```

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/features/csr-projects/CsrProjectsModule.tsx
git commit -m "feat(web): add soft delete view and restore to CSR Projects UI"
```

### Task 6: Update Frontend Grievance Component

**Files:**
- Modify: `apps/web/src/features/grievance/GrievanceModule.tsx`

- [ ] **Step 1: Add State for Toggle**
Inside `export default function GrievanceModule()`, add:
```typescript
  const [showDeleted, setShowDeleted] = useState(false);
```

- [ ] **Step 2: Update the Fetch Request**
Update `fetchData` to append `is_deleted`:
```typescript
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/grievance?is_deleted=${showDeleted}`);
      setItems(res.data.data);
    } catch (e: any) {
      console.error(e);
      showToast?.("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };
```
Add `showDeleted` to the `useEffect` that calls `fetchData`.

- [ ] **Step 3: Add the Toggle to TopBar**
Update `TopBar` JSX:
```tsx
        <TopBar
          // ... existing props ...
        >
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm font-medium text-foreground">Data Terhapus:</span>
            <input 
              type="checkbox" 
              checked={showDeleted} 
              onChange={(e) => setShowDeleted(e.target.checked)} 
              className="w-4 h-4 rounded border-border text-blue-600 focus:ring-ring"
            />
          </div>
          {!showDeleted && (
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus size={14} /> Tambah
            </button>
          )}
        </TopBar>
```

- [ ] **Step 4: Implement Restore Action**
Add `handleRestore`:
```typescript
  const handleRestore = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin memulihkan data ini?")) return;
    try {
      await apiClient.patch(`/grievance/${id}/restore`);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };
```

- [ ] **Step 5: Modify Table Actions Column**
In the actions column render logic:
```tsx
  {showDeleted ? (
     <button onClick={() => handleRestore(item.id)} className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1">
       Restore
     </button>
  ) : (
    <div className="flex items-center justify-end gap-2">
      {/* existing edit and delete buttons */}
    </div>
  )}
```

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/features/grievance/GrievanceModule.tsx
git commit -m "feat(web): add soft delete view and restore to Grievance UI"
```

### Task 7: Update Frontend LRP Component

**Files:**
- Modify: `apps/web/src/features/lrp/LrpModule.tsx`

- [ ] **Step 1: Add State for Toggle**
Inside `export default function LrpModule()`, add:
```typescript
  const [showDeleted, setShowDeleted] = useState(false);
```

- [ ] **Step 2: Update the Fetch Request**
Update `fetchData` to append `is_deleted`:
```typescript
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/lrp?is_deleted=${showDeleted}`);
      setItems(res.data.data);
    } catch (e: any) {
      console.error(e);
      showToast?.("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };
```
Add `showDeleted` to the `useEffect` that calls `fetchData`.

- [ ] **Step 3: Add the Toggle to TopBar**
Update `TopBar` JSX:
```tsx
        <TopBar
          // ... existing props ...
        >
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm font-medium text-foreground">Data Terhapus:</span>
            <input 
              type="checkbox" 
              checked={showDeleted} 
              onChange={(e) => setShowDeleted(e.target.checked)} 
              className="w-4 h-4 rounded border-border text-blue-600 focus:ring-ring"
            />
          </div>
          {!showDeleted && (
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus size={14} /> Tambah
            </button>
          )}
        </TopBar>
```

- [ ] **Step 4: Implement Restore Action**
Add `handleRestore`:
```typescript
  const handleRestore = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin memulihkan data ini?")) return;
    try {
      await apiClient.patch(`/lrp/${id}/restore`);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };
```

- [ ] **Step 5: Modify Table Actions Column**
In the actions column render logic:
```tsx
  {showDeleted ? (
     <button onClick={() => handleRestore(item.id)} className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1">
       Restore
     </button>
  ) : (
    <div className="flex items-center justify-end gap-2">
      {/* existing edit and delete buttons */}
    </div>
  )}
```

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/features/lrp/LrpModule.tsx
git commit -m "feat(web): add soft delete view and restore to LRP UI"
```

### Task 8: Update Frontend Stakeholders Component

**Files:**
- Modify: `apps/web/src/features/stakeholder/StakeholderModule.tsx`

- [ ] **Step 1: Add State for Toggle**
Inside `export default function StakeholderModule()`, add:
```typescript
  const [showDeleted, setShowDeleted] = useState(false);
```

- [ ] **Step 2: Update the Fetch Request**
Update `fetchData` to append `is_deleted`:
```typescript
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/stakeholders?is_deleted=${showDeleted}`);
      setItems(res.data.data);
    } catch (e: any) {
      console.error(e);
      showToast?.("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };
```
Add `showDeleted` to the `useEffect` that calls `fetchData`.

- [ ] **Step 3: Add the Toggle to TopBar**
Update `TopBar` JSX:
```tsx
        <TopBar
          // ... existing props ...
        >
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm font-medium text-foreground">Data Terhapus:</span>
            <input 
              type="checkbox" 
              checked={showDeleted} 
              onChange={(e) => setShowDeleted(e.target.checked)} 
              className="w-4 h-4 rounded border-border text-blue-600 focus:ring-ring"
            />
          </div>
          {!showDeleted && (
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus size={14} /> Tambah
            </button>
          )}
        </TopBar>
```

- [ ] **Step 4: Implement Restore Action**
Add `handleRestore`:
```typescript
  const handleRestore = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin memulihkan data ini?")) return;
    try {
      await apiClient.patch(`/stakeholders/${id}/restore`);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };
```

- [ ] **Step 5: Modify Table Actions Column**
In the actions column render logic:
```tsx
  {showDeleted ? (
     <button onClick={() => handleRestore(item.id)} className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1">
       Restore
     </button>
  ) : (
    <div className="flex items-center justify-end gap-2">
      {/* existing edit and delete buttons */}
    </div>
  )}
```

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/features/stakeholder/StakeholderModule.tsx
git commit -m "feat(web): add soft delete view and restore to Stakeholders UI"
```

### Task 9: Update Frontend Top Issues Component

**Files:**
- Modify: `apps/web/src/features/top-issues/TopIssuesModule.tsx`

- [ ] **Step 1: Add State for Toggle**
Inside `export default function TopIssuesModule()`, add:
```typescript
  const [showDeleted, setShowDeleted] = useState(false);
```

- [ ] **Step 2: Update the Fetch Request**
Update `fetchData` to append `is_deleted`:
```typescript
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/top-issues?is_deleted=${showDeleted}`);
      setItems(res.data.data);
    } catch (e: any) {
      console.error(e);
      showToast?.("Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };
```
Add `showDeleted` to the `useEffect` that calls `fetchData`.

- [ ] **Step 3: Add the Toggle to TopBar**
Update `TopBar` JSX:
```tsx
        <TopBar
          // ... existing props ...
        >
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm font-medium text-foreground">Data Terhapus:</span>
            <input 
              type="checkbox" 
              checked={showDeleted} 
              onChange={(e) => setShowDeleted(e.target.checked)} 
              className="w-4 h-4 rounded border-border text-blue-600 focus:ring-ring"
            />
          </div>
          {!showDeleted && (
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus size={14} /> Tambah
            </button>
          )}
        </TopBar>
```

- [ ] **Step 4: Implement Restore Action**
Add `handleRestore`:
```typescript
  const handleRestore = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin memulihkan data ini?")) return;
    try {
      await apiClient.patch(`/top-issues/${id}/restore`);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
      fetchData();
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };
```

- [ ] **Step 5: Modify Table Actions Column**
In the actions column render logic:
```tsx
  {showDeleted ? (
     <button onClick={() => handleRestore(item.id)} className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1">
       Restore
     </button>
  ) : (
    <div className="flex items-center justify-end gap-2">
      {/* existing edit and delete buttons */}
    </div>
  )}
```

- [ ] **Step 6: Commit**
```bash
git add apps/web/src/features/top-issues/TopIssuesModule.tsx
git commit -m "feat(web): add soft delete view and restore to Top Issues UI"
```
