# PIC Soft-Delete Reactivation & Error Interception Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to re-add previously soft-deleted PICs by reactivating them, and intercept Prisma duplicate errors to return 409 Conflict instead of 500 Internal Server Error.

**Architecture:** Update `createPic` in `PicsController.ts` to check if a PIC with the same name exists (active or soft-deleted). If it exists and is inactive, reactivate it (`is_active = true`). If active, return `409 Conflict`. Handle Prisma `P2002` errors gracefully.

**Tech Stack:** Express, Prisma, TypeScript, Jest, Supertest

---

### Task 1: Create Integration Tests for PIC Reactivation & Validation

**Files:**
- Create: `apps/api/tests/pics.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/tests/pics.test.ts` with test cases for creating, soft-deleting, reactivating, and handling duplicate PICs.

```typescript
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';

beforeAll(async () => {
  await prisma.daily_activity_pics.deleteMany();
  await prisma.pics.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('PIC Management API', () => {
  it('POST /api/pics - Should create a new active PIC', async () => {
    const res = await request(app).post('/api/pics').send({ name: 'Adit' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Adit');
    expect(res.body.data.is_active).toBe(true);
  });

  it('POST /api/pics - Should return 409 Conflict when creating duplicate active PIC', async () => {
    const res = await request(app).post('/api/pics').send({ name: 'Adit' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });

  it('DELETE /api/pics/:id - Should soft delete a PIC', async () => {
    const listRes = await request(app).get('/api/pics');
    const picId = listRes.body.data[0].id;

    const delRes = await request(app).delete(`/api/pics/${picId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.data.is_active).toBe(false);
  });

  it('POST /api/pics - Should reactivate a soft-deleted PIC when re-adding', async () => {
    const res = await request(app).post('/api/pics').send({ name: 'Adit' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Adit');
    expect(res.body.data.is_active).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test tests/pics.test.ts`
Expected: FAIL on duplicate test (returns 500 instead of 409) and reactivation test (returns 500 unique constraint error instead of 200).

- [ ] **Step 3: Commit initial test suite**

```bash
git add apps/api/tests/pics.test.ts
git commit -m "test: add integration tests for pic reactivation and duplication"
```

---

### Task 2: Implement Reactivation and Prisma Error Interception in PicsController

**Files:**
- Modify: `apps/api/src/controllers/PicsController.ts`

- [ ] **Step 1: Implement `createPic`, `updatePic`, and `deletePic` updates**

Update `PicsController.ts` to check for existing records (active vs inactive) and handle Prisma `P2002` errors.

```typescript
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

export const getPics = async (req: Request, res: Response): Promise<void> => {
  try {
    const pics = await prisma.pics.findMany({ where: { is_active: true } });
    res.status(200).json({ data: pics.map(p => ({ ...p, id: p.id.toString() })) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const cleanName = name.trim();

    // Check if PIC with this name already exists in database
    const existingPic = await prisma.pics.findFirst({
      where: { name: cleanName }
    });

    if (existingPic) {
      if (existingPic.is_active) {
        res.status(409).json({ error: 'PIC dengan nama tersebut sudah ada' });
        return;
      }
      // Reactivate soft-deleted PIC
      const reactivated = await prisma.pics.update({
        where: { id: existingPic.id },
        data: { is_active: true }
      });
      res.status(200).json({ data: { ...reactivated, id: reactivated.id.toString() } });
      return;
    }

    const pic = await prisma.pics.create({ data: { name: cleanName, is_active: true } });
    res.status(201).json({ data: { ...pic, id: pic.id.toString() } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'PIC dengan nama tersebut sudah ada' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const cleanName = name.trim();

    const pic = await prisma.pics.update({
      where: { id: BigInt(id as string) },
      data: { name: cleanName }
    });
    res.status(200).json({ data: { ...pic, id: pic.id.toString() } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'PIC dengan nama tersebut sudah ada' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pic = await prisma.pics.update({
      where: { id: BigInt(id as string) },
      data: { is_active: false }
    });
    res.status(200).json({ data: { ...pic, id: pic.id.toString() } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm --filter api test tests/pics.test.ts`
Expected: PASS (4 tests passed).

- [ ] **Step 3: Commit implementation**

```bash
git add apps/api/src/controllers/PicsController.ts
git commit -m "feat: add pic reactivation for soft deleted records and handle P2002 error"
```
