# Daily Activities Stat Card Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the Daily Activities stat card subtext to make it clearer and more consistent with other dashboard cards.

**Architecture:** Pure UI change in the DashboardModule React component.

**Tech Stack:** React, TypeScript.

---

### Task 1: Update Daily Activities Stat Card

**Files:**
- Modify: `apps/web/src/features/dashboard/DashboardModule.tsx:76-80`

- [ ] **Step 1: Simplify the sub property in statCards**

```typescript
    {
      label: "Daily Activities", value: stats.totals.daily,
      sub: "aktivitas tercatat",
      trend: stats.trends.weeklyTrend, icon: <Calendar size={16} />, color: "text-blue-600", bg: "bg-blue-50", module: "daily",
    },
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/dashboard/DashboardModule.tsx
git commit -m "refactor: simplify daily activities stat card subtext"
```
