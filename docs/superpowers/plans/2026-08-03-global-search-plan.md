# Implementation Plan: Universal Global Search

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a universal search hook that searches across all nested string/number properties of data rows, and integrate it into all 7 CRMS modules.

**Tech Stack:** React (TypeScript).

---

### Task 1: Create Global Search Hook

**Files:**
- Create: `apps/web/src/hooks/useGlobalSearch.ts`

- [ ] **Step 1: Write `useGlobalSearch.ts`**
  Create `apps/web/src/hooks/useGlobalSearch.ts` with the following content:
  ```typescript
  import { useState, useMemo } from 'react';

  function extractSearchableText(obj: any): string {
    if (obj === null || obj === undefined) return '';
    if (typeof obj === 'string' || typeof obj === 'number') return String(obj).toLowerCase();
    if (typeof obj === 'object') {
      return Object.values(obj).map(extractSearchableText).join(' ');
    }
    return '';
  }

  export function useGlobalSearch<T>(items: T[]) {
    const [q, setQ] = useState("");
    
    const filtered = useMemo(() => {
      if (q.trim() === "") return items;
      
      const searchTerms = q.toLowerCase().split(' ').filter(term => term.length > 0);
      
      return items.filter(item => {
        const itemText = extractSearchableText(item);
        // All terms must exist somewhere in the row's text
        return searchTerms.every(term => itemText.includes(term));
      });
    }, [items, q]);
    
    return { q, setQ, filtered };
  }
  ```

---

### Task 2: Refactor All 7 Modules

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`
- Modify: `apps/web/src/features/csr-projects/CsrProjectsModule.tsx`
- Modify: `apps/web/src/features/grievance/GrievanceModule.tsx`
- Modify: `apps/web/src/features/lrp/LrpModule.tsx`
- Modify: `apps/web/src/features/proposals/ProposalsModule.tsx`
- Modify: `apps/web/src/features/stakeholders/StakeholdersModule.tsx`
- Modify: `apps/web/src/features/top-issues/TopIssuesModule.tsx`

- [ ] **Step 1: Replace `useSearch` in each module**
  For EACH of the 7 module files above, do the following:
  1. Add the import at the top of the file:
     `import { useGlobalSearch } from '../../hooks/useGlobalSearch';` (Adjust relative path if necessary).
  2. Find and delete the local `function useSearch<T>...` declaration in the file.
  3. Find where it's called, e.g., `const { q, setQ, filtered } = useSearch(items, ["column1", "column2"]);`
  4. Replace it with `const { q, setQ, filtered } = useGlobalSearch(items);`.

- [ ] **Step 2: Verification**
  Run `npx tsc --noEmit` inside `apps/web` to ensure there are no missing imports or TS errors.

- [ ] **Step 3: Commit**
  ```bash
  git add apps/web/src/hooks apps/web/src/features
  git commit -m "feat(web): replace local search with universal global search across all 7 modules"
  ```

Report back when all tasks are complete.
