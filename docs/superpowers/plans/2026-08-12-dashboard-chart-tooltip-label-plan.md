# Dashboard Sub-Category Chart Tooltip Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the "Aktivitas per Sub Category" chart tooltip label from "value" to "Jumlah".

**Architecture:** Pure UI change on the `<Bar>` element in `DashboardModule.tsx`.

**Tech Stack:** React, Recharts.

---

### Task 1: Update Bar Component Name Attribute

**Files:**
- Modify: `apps/web/src/features/dashboard/DashboardModule.tsx:189`

- [ ] **Step 1: Add name="Jumlah" to Bar component**

Target (line 189):
```typescript
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
```

Replace with:
```typescript
                  <Bar dataKey="value" name="Jumlah" radius={[4, 4, 0, 0]}>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/dashboard/DashboardModule.tsx
git commit -m "fix(ui): change dashboard chart tooltip label from value to Jumlah"
```
