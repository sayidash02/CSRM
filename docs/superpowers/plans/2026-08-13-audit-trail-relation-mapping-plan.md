# Audit Trail Relation Mapping & PIC Display Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the PIC column display in the datatable and implement a frontend translator utility to map numeric relational IDs (like `pic_id`) to human-readable names in the Audit Trail drawer.

**Architecture:** Frontend-only approach. Adds `translateValue` utility to map relational IDs against local `references` state, passes `references` to `AuditHistoryDrawer`, and fixes the `DailyActivitiesModule` datatable accessor to use `a.pic?.name` instead of `a.pics`.

**Tech Stack:** React, TypeScript, TailwindCSS

---

### Task 1: Value Translator Utility

**Files:**
- Modify: `apps/web/src/utils/fieldDictionary.ts`
- Modify: `apps/web/src/utils/fieldDictionary.test.ts`

- [ ] **Step 1: Write the tests for translateValue**

Open `apps/web/src/utils/fieldDictionary.test.ts` and add:

```typescript
import { translateField, translateValue } from './fieldDictionary';

describe('fieldDictionary', () => {
  it('translates fields correctly', () => {
    expect(translateField('cost')).toBe('Biaya');
  });
});

describe('translateValue', () => {
  const mockReferences = {
    pics: [{ id: 1, name: 'John Doe' }, { id: 259, name: 'Budi' }],
    categories: [{ id: 10, name: 'CSR' }],
    sub_categories: [{ id: 20, name: 'Pendidikan' }]
  };

  it('translates pic_id correctly', () => {
    expect(translateValue('pic_id', 259, mockReferences)).toBe('Budi');
    expect(translateValue('pic_id', '1', mockReferences)).toBe('John Doe');
  });

  it('translates category_id correctly', () => {
    expect(translateValue('category_id', '10', mockReferences)).toBe('CSR');
  });

  it('translates sub_category_id correctly', () => {
    expect(translateValue('sub_category_id', 20, mockReferences)).toBe('Pendidikan');
  });

  it('returns raw value if no references provided', () => {
    expect(translateValue('pic_id', 259)).toBe('259');
  });

  it('returns raw value if not a relation field', () => {
    expect(translateValue('cost', 50000, mockReferences)).toBe('50000');
  });

  it('handles null/undefined gracefully', () => {
    expect(translateValue('pic_id', null, mockReferences)).toBe('-');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/utils/fieldDictionary.test.ts`
Expected: FAIL (translateValue is not defined)

- [ ] **Step 3: Implement translateValue utility**

In `apps/web/src/utils/fieldDictionary.ts`, append the following:

```typescript
export const translateValue = (field: string, value: any, references?: any): string => {
  if (value === null || value === undefined) return '-';
  if (!references) return String(value);

  const numValue = Number(value);
  
  if (field === 'pic_id' && references.pics) {
    const match = references.pics.find((p: any) => Number(p.id) === numValue);
    if (match) return match.name;
  }
  
  if (field === 'category_id' && references.categories) {
    const match = references.categories.find((c: any) => Number(c.id) === numValue);
    if (match) return match.name;
  }
  
  if (field === 'sub_category_id' && references.sub_categories) {
    const match = references.sub_categories.find((s: any) => Number(s.id) === numValue);
    if (match) return match.name;
  }
  
  return String(value);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/utils/fieldDictionary.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/utils/fieldDictionary.ts apps/web/src/utils/fieldDictionary.test.ts
git commit -m "feat(web): add translateValue utility for relation mapping"
```

---

### Task 2: Audit History Drawer Enhancement

**Files:**
- Modify: `apps/web/src/components/ui/AuditHistoryDrawer.tsx`

- [ ] **Step 1: Update Drawer implementation**

Update `AuditHistoryDrawer.tsx` to accept `references` and use `translateValue`.

Change the imports:
```tsx
import React, { useEffect, useState } from 'react';
import { translateField, translateValue } from '../../utils/fieldDictionary';
import { apiClient } from '../../lib/apiClient';
```

Change the `DrawerProps` interface:
```tsx
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string | number | null;
  references?: any;
}
```

Change the component signature:
```tsx
export const AuditHistoryDrawer: React.FC<DrawerProps> = ({ isOpen, onClose, entityType, entityId, references }) => {
```

Update the values mapping block inside the return statement:
```tsx
                {log.changes && Object.entries(log.changes).map(([field, vals]: any) => (
                  <div key={field} className="mt-1 bg-gray-50 p-2 rounded text-xs">
                    <span className="font-medium text-gray-700">{translateField(field)}</span>: 
                    <span className="text-red-500 line-through mx-1">{translateValue(field, vals.old, references)}</span> ➔ 
                    <span className="text-green-600 font-semibold mx-1">{translateValue(field, vals.new, references)}</span>
                  </div>
                ))}
```

- [ ] **Step 2: Run typecheck**
Run: `cd apps/web && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/AuditHistoryDrawer.tsx
git commit -m "feat(web): support relational ID mapping in AuditHistoryDrawer"
```

---

### Task 3: Datatable PIC Fix & Drawer Integration

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Fix column accessor and integrate references**

In `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`:

1. Fix the "PIC" column definition inside `const columns = useMemo(() => [ ... ])` (around line 460).
Change:
```tsx
    { header: "PIC", accessor: "pics", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.pics?.map((p: any) => p.name).join(', ') || a.pic_ids?.join(', ') || '-'}</span> },
```
To:
```tsx
    { header: "PIC", accessor: "pic_id", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.pic?.name || '-'}</span> },
```

2. Update the `<AuditHistoryDrawer />` component rendering at the end of the file to pass `references={references}`:
```tsx
      <AuditHistoryDrawer isOpen={historyDrawerOpen} onClose={() => setHistoryDrawerOpen(false)} entityType="daily_activities" entityId={selectedHistoryId} references={references} />
```

- [ ] **Step 2: Run typecheck and build**
Run: `cd apps/web && npx tsc --noEmit && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
git commit -m "fix(web): correct PIC accessor in datatable and pass references to history drawer"
```
