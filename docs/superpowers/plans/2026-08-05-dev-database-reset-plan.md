# Dev Database Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a development-only mechanism to completely wipe operational data from the database and re-seed categories, making manual testing easier.

**Architecture:** A guarded `DELETE /api/dev/reset` endpoint that wipes all operational data in a specific foreign-key-safe order using Prisma transactions, and re-seeds master tables. The frontend exposes this via a protected "Danger Zone" in the Archive Settings, complete with a type-to-confirm modal.

**Tech Stack:** Express, Prisma, React, TailwindCSS, Vite.

---

### Task 1: Create Dev Route and Guard

**Files:**
- Create: `apps/api/src/routes/dev.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/tests/integration/dev.test.ts` (create)

- [ ] **Step 1: Write the failing test for the guard**

```typescript
// apps/api/tests/integration/dev.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('Dev Routes Guard', () => {
  const originalEnv = process.env.NODE_ENV;

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should return 404 in production environment', async () => {
    process.env.NODE_ENV = 'production';
    const response = await request(app).delete('/api/dev/reset');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  // Note: We test the success case in Task 2 once the controller is ready.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotenv -e .env.test -- jest apps/api/tests/integration/dev.test.ts`
Expected: FAIL (404 not returned, likely 404 HTML or unhandled route).

- [ ] **Step 3: Write minimal implementation for route and app registration**

Create `apps/api/src/routes/dev.ts`:
```typescript
import { Router } from 'express';

const router = Router();

if (process.env.NODE_ENV === 'production') {
  router.all('*', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
} else {
  // Placeholder for controller
  router.delete('/reset', (req, res) => {
    res.status(200).json({ message: 'Reset successful' });
  });
}

export default router;
```

Modify `apps/api/src/app.ts`:
Add import:
```typescript
import devRoutes from './routes/dev';
```
Register route (around line 43, before `export default app`):
```typescript
app.use('/api/dev', devRoutes);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `dotenv -e .env.test -- jest apps/api/tests/integration/dev.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/tests/integration/dev.test.ts apps/api/src/routes/dev.ts apps/api/src/app.ts
git commit -m "test: add dev route guard and registration"
```

---

### Task 2: Implement Database Reset Controller

**Files:**
- Create: `apps/api/src/controllers/DevController.ts`
- Modify: `apps/api/src/routes/dev.ts`
- Modify: `apps/api/tests/integration/dev.test.ts`

- [ ] **Step 1: Write the failing test for the reset logic**

Modify `apps/api/tests/integration/dev.test.ts`, adding a test block for non-production environments:
```typescript
import prisma from '../../src/lib/prisma';

// (inside describe 'Dev Routes Guard', add this new describe block)
describe('Dev Reset Controller (Non-Production)', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalEnv;
    // Clean up
    await prisma.daily_activities.deleteMany({});
    await prisma.pics.deleteMany({});
    await prisma.categories.deleteMany({});
  });

  it('should delete data and re-seed categories', async () => {
    // 1. Insert dummy category & pic & activity
    const category = await prisma.categories.create({ data: { name: 'Test Category' } });
    const pic = await prisma.pics.create({ data: { name: 'Test PIC', institution: 'Inst' } });
    await prisma.daily_activities.create({
      data: {
        activity_date: new Date(),
        activity: 'Test',
        institution_group: 'Group',
        address: 'Addr',
        focus: 'Focus',
        location: 'Loc',
        cost: 100,
        description_result: 'Desc',
        pic_id: pic.id,
        category_id: category.id
      }
    });

    // 2. Call reset
    const response = await request(app).delete('/api/dev/reset');
    expect(response.status).toBe(200);

    // 3. Verify activities and pics are gone
    const activitiesCount = await prisma.daily_activities.count();
    const picsCount = await prisma.pics.count();
    expect(activitiesCount).toBe(0);
    expect(picsCount).toBe(0);

    // 4. Verify categories are seeded
    const seededCategories = await prisma.categories.count();
    expect(seededCategories).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotenv -e .env.test -- jest apps/api/tests/integration/dev.test.ts`
Expected: FAIL (because the placeholder just returns 200 without deleting).

- [ ] **Step 3: Write minimal implementation for DevController**

Create `apps/api/src/controllers/DevController.ts`:
```typescript
import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const devReset = async (req: Request, res: Response): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all operational data in safe FK order
      await tx.daily_activities.deleteMany({});
      await tx.stakeholder_engagement.deleteMany({});
      await tx.top_issues.deleteMany({});
      await tx.proposals.deleteMany({});
      await tx.csr_projects.deleteMany({});
      await tx.grievance.deleteMany({});
      await tx.lrp.deleteMany({});
      await tx.sync_log.deleteMany({});
      await tx.pics.deleteMany({});
      await tx.sub_categories.deleteMany({});
      await tx.categories.deleteMany({});

      // 2. Re-seed categories
      const categories = ['Pendidikan', 'Kesehatan', 'Infrastruktur', 'Pemberdayaan Ekonomi', 'Lingkungan', 'Sosial & Budaya', 'Kapasitas Kelembagaan'];
      for (const name of categories) {
        await tx.categories.create({ data: { name } });
      }

      // 3. Re-seed sub_categories
      // Note: fetching created categories to map them for sub_categories
      const createdCategories = await tx.categories.findMany();
      const catMap = new Map(createdCategories.map(c => [c.name, c.id]));
      
      const subCats = [
        { c: 'Pendidikan', s: 'Beasiswa' },
        { c: 'Pendidikan', s: 'Fasilitas Sekolah' },
        { c: 'Kesehatan', s: 'Pengobatan Gratis' },
        { c: 'Kesehatan', s: 'Fasilitas Kesehatan' },
        { c: 'Infrastruktur', s: 'Jalan & Jembatan' },
        { c: 'Infrastruktur', s: 'Air Bersih' }
      ];

      for (const item of subCats) {
        const catId = catMap.get(item.c);
        if (catId) {
          await tx.sub_categories.create({ data: { category_id: catId, name: item.s } });
        }
      }
    });

    res.status(200).json({ message: 'Database reset and seeded successfully' });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Internal server error during reset' });
  }
};
```

Update `apps/api/src/routes/dev.ts`:
```typescript
import { Router } from 'express';
import { devReset } from '../controllers/DevController';

const router = Router();

if (process.env.NODE_ENV === 'production') {
  router.all('*', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
} else {
  router.delete('/reset', devReset);
}

export default router;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `dotenv -e .env.test -- jest apps/api/tests/integration/dev.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/controllers/DevController.ts apps/api/src/routes/dev.ts apps/api/tests/integration/dev.test.ts
git commit -m "feat: implement dev database reset controller with safe delete sequence and reseeding"
```

---

### Task 3: Frontend Danger Zone & Reset Modal

**Files:**
- Modify: `apps/web/src/features/archive/ArchiveSettings.tsx`

- [ ] **Step 1: Write UI implementation (Danger Zone & Modal)**

Modify `apps/web/src/features/archive/ArchiveSettings.tsx`:
Add imports for Modal components, useState (if not present), and apiClient:
```tsx
import React, { useState } from "react";
import { Modal, ModalFooter } from "../../components/ui/Modal";
import { apiClient } from "../../lib/apiClient";
```

Create the `ResetModal` component inside the file (or outside the main export):
```tsx
function ResetModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [challenge, setChallenge] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (challenge !== "RESET") return;
    setLoading(true);
    try {
      await apiClient.delete('/dev/reset');
      onSuccess();
    } catch (e) {
      console.error(e);
      alert("Failed to reset database");
      setLoading(false);
    }
  };

  return (
    <Modal title="Peringatan Berbahaya!" onClose={onClose}>
      <div className="p-4 space-y-4">
        <p className="text-sm text-red-600 font-semibold">
          Apakah Anda yakin ingin menghapus semua data?
        </p>
        <p className="text-sm text-muted-foreground">
          Ini akan menghapus seluruh data dari 7 modul, daftar PIC, dan riwayat sinkronisasi. 
          Kategori akan dikembalikan ke nilai default. Aksi ini tidak dapat dibatalkan.
        </p>
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground">
            Ketik <strong>RESET</strong> untuk melanjutkan:
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
            placeholder="RESET"
          />
        </div>
      </div>
      <div className="flex justify-end p-4 border-t border-border bg-muted/30 gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          disabled={loading}
        >
          Batal
        </button>
        <button
          onClick={handleReset}
          disabled={challenge !== "RESET" || loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? "Menghapus..." : "Hapus Semua"}
        </button>
      </div>
    </Modal>
  );
}
```

Add state to `ArchiveSettings` component:
```tsx
  const [showResetModal, setShowResetModal] = useState(false);
```

Add the Danger Zone UI at the bottom of the `return` statement in `ArchiveSettings` (right before the closing parent tag):
```tsx
      {/* Danger Zone - Development Only */}
      {import.meta.env.DEV && (
        <div className="mt-8 border border-red-200 bg-red-50/50 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-red-200">
            <h3 className="text-sm font-semibold text-red-800">Danger Zone (Development Only)</h3>
            <p className="text-xs text-red-600 mt-1">Aksi di bawah ini bersifat destruktif dan hanya muncul saat development.</p>
          </div>
          <div className="p-4 bg-white/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Reset Database</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Hapus seluruh data operasional dan kembalikan ke state awal.</p>
              </div>
              <button
                onClick={() => setShowResetModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <ResetModal
          onClose={() => setShowResetModal(false)}
          onSuccess={() => {
            setShowResetModal(false);
            window.location.reload();
          }}
        />
      )}
```

- [ ] **Step 2: Verify TypeScript Compilation**

Run: `cd apps/web && npx tsc --noEmit`
Expected: PASS without errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/archive/ArchiveSettings.tsx
git commit -m "feat(web): add dev-only danger zone and database reset modal"
```

---
