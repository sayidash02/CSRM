# React Query Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement data caching using React Query to eliminate delay when switching to the Proposals module.

**Architecture:** We will set up a global `QueryClient` with a 5-minute `staleTime`, wrap the app in its Provider, and extract the Proposal data fetching and mutation logic into custom React Query hooks (`useProposals`, `useCreateProposal`, etc.) to replace `useEffect` in the UI component.

**Tech Stack:** React, `@tanstack/react-query`, Vite, Vitest

---

### Task 1: Setup React Query Client & Provider

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/lib/queryClient.test.ts`
- Create: `apps/web/src/lib/queryClient.ts`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Install Dependencies**

```bash
cd apps/web
pnpm add @tanstack/react-query
```

- [ ] **Step 2: Write failing test for Query Client**

Create `apps/web/src/lib/queryClient.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { queryClient } from './queryClient';

describe('queryClient', () => {
  it('should have a staleTime of 5 minutes (300000ms)', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.staleTime).toBe(300000);
  });
  
  it('should have a gcTime of 15 minutes (900000ms)', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.gcTime).toBe(900000);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run src/lib/queryClient.test.ts`
Expected: FAIL (Cannot find module './queryClient')

- [ ] **Step 4: Implement Query Client**

Create `apps/web/src/lib/queryClient.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 15 * 60 * 1000,   // 15 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run src/lib/queryClient.test.ts`
Expected: PASS

- [ ] **Step 6: Add Provider to main.tsx**

Modify `apps/web/src/main.tsx` to include the `QueryClientProvider` and `queryClient`. The file should look exactly like this:
```tsx
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./app/App";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/src/lib/queryClient.test.ts apps/web/src/lib/queryClient.ts apps/web/src/main.tsx
git commit -m "feat: setup react-query global client and provider"
```

### Task 2: Create Proposal Query Hooks

**Files:**
- Create: `apps/web/src/hooks/useProposals.ts`
- Create: `apps/web/src/hooks/useProposals.test.ts`

- [ ] **Step 1: Write failing test for hook logic**

Create `apps/web/src/hooks/useProposals.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { fetchProposals } from './useProposals';
import { apiClient } from '../lib/apiClient';

vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('fetchProposals', () => {
  it('should call apiClient.get with correct params', async () => {
    (apiClient.get as any).mockResolvedValueOnce({ data: { data: [{ id: 1 }] } });
    
    const result = await fetchProposals('2026', false);
    
    expect(apiClient.get).toHaveBeenCalledWith('/proposals?year=2026&is_deleted=false');
    expect(result).toEqual([{ id: 1 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vitest run src/hooks/useProposals.test.ts`
Expected: FAIL (Cannot find module './useProposals')

- [ ] **Step 3: Implement Hooks**

Create `apps/web/src/hooks/useProposals.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { Proposal } from '../features/proposals/ProposalsModule';

export const fetchProposals = async (year: string, showDeleted: boolean) => {
  const yearParam = year ? `year=${year}` : '';
  const isDeletedParam = `is_deleted=${showDeleted}`;
  const queryParams = [yearParam, isDeletedParam].filter(Boolean).join('&');
  const res = await apiClient.get(`/proposals${queryParams ? `?${queryParams}` : ''}`);
  return res.data.data;
};

export function useProposals(activeYear: string, showDeleted: boolean) {
  return useQuery({
    queryKey: ['proposals', 'list', activeYear, showDeleted],
    queryFn: () => fetchProposals(activeYear, showDeleted),
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Proposal, 'id'>) => {
      const res = await apiClient.post('/proposals', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useEditProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Omit<Proposal, 'id'> }) => {
      const res = await apiClient.put(`/proposals/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const res = await apiClient.delete(`/proposals/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useRestoreProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      const res = await apiClient.patch(`/proposals/${id}/restore`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vitest run src/hooks/useProposals.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useProposals.ts apps/web/src/hooks/useProposals.test.ts
git commit -m "feat: add react-query hooks for proposals"
```

### Task 3: Refactor ProposalsModule Component

**Files:**
- Modify: `apps/web/src/features/proposals/ProposalsModule.tsx`

- [ ] **Step 1: Replace Imports**

Open `apps/web/src/features/proposals/ProposalsModule.tsx`. 
Replace lines 1-3 with these imports (removes `useEffect` and `apiClient`):
```tsx
import React, { useState, useMemo } from "react";
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
```

Then, add the new hooks import directly underneath `import { RestoreConfirmModal } from '../../components/ui/RestoreConfirmModal';`:
```tsx
import { useProposals, useCreateProposal, useEditProposal, useDeleteProposal, useRestoreProposal } from '../../hooks/useProposals';
```

- [ ] **Step 2: Replace Component Logic**

Still in `apps/web/src/features/proposals/ProposalsModule.tsx`, find the `export default function ProposalsModule` declaration. Replace from that line down to (but NOT including) `const { q, setQ, filtered } = useGlobalSearch(items);` with the following:

```tsx
export default function ProposalsModule({ activeYear, onExport, showToast }: { activeYear: string; onExport: (l: string, data: any[]) => void; showToast: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [addDraft, setAddDraft] = useState({ ...emptyProposalDraft });
  const [showDeleted, setShowDeleted] = useState(false);
  
  const { data: items = [], isLoading, isError } = useProposals(activeYear, showDeleted);

  const createMutation = useCreateProposal();
  const editMutation = useEditProposal();
  const deleteMutation = useDeleteProposal();
  const restoreMutation = useRestoreProposal();

  const handleAdd = async (d: Omit<Proposal, "id">) => {
    try {
      await createMutation.mutateAsync(d);
      showToast?.(`Proposal dari '${d.institution}' berhasil ditambahkan`, "success");
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<Proposal, "id">) => {
    try {
      await editMutation.mutateAsync({ id, data: d });
      showToast?.(`Proposal dari '${d.institution}' berhasil diperbarui`, "success");
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteMutation.mutateAsync(id);
      showToast?.(`Proposal berhasil dihapus`, "success");
    } catch (e: any) {
      console.error(e);
      showToast?.(e.response?.data?.error || "Gagal menghapus data", "error");
    }
  };

  const handleRestore = async (id: string | number) => {
    try {
      await restoreMutation.mutateAsync(id);
      if (showToast) showToast("Data berhasil dipulihkan", "success");
    } catch (e: any) {
      if (showToast) showToast(e.response?.data?.error || "Gagal memulihkan data", "error");
    }
  };
```

- [ ] **Step 3: Test TypeScript Build**

Run: `cd apps/web && pnpm tsc --noEmit`
Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/proposals/ProposalsModule.tsx
git commit -m "refactor: migrate ProposalsModule to use React Query hooks"
```
