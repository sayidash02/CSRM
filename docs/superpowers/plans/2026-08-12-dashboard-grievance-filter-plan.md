# Dashboard High Priority Grievance Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter the dashboard's high priority grievances to only show Open/On Progress and High/Critical items, and ensure correct data mapping to the frontend.

**Architecture:** Update the Prisma `findMany` query and the API response mapping in `DashboardController.ts`.

**Tech Stack:** Node.js, Express, Prisma.

---

### Task 1: Update Grievance Query and Mapping

**Files:**
- Modify: `apps/api/src/controllers/DashboardController.ts`

- [ ] **Step 1: Update the Prisma query for highPriorityGrievances**

Target (around line 68):
```typescript
    prisma.grievance.findMany({
      where: { is_deleted: false },
      take: 2
    }),
```

Replace with:
```typescript
    prisma.grievance.findMany({
      where: {
        is_deleted: false,
        status: { in: ['Open', 'On Progress'] },
        significance: { in: ['High', 'Critical'] }
      },
      orderBy: { created_at: 'desc' },
      take: 2
    }),
```

- [ ] **Step 2: Map the response to match frontend expectations**

Target (around line 129):
```typescript
      recent: {
        activities: recentActivities,
        highPriorityGrievances,
        onGoingCsr
      },
```

Replace with:
```typescript
      recent: {
        activities: recentActivities,
        highPriorityGrievances: highPriorityGrievances.map((g: any) => ({
          id: g.id,
          regNo: g.register_no,
          name: g.complainant_name,
          description: g.description,
          significance: g.significance
        })),
        onGoingCsr
      },
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/controllers/DashboardController.ts
git commit -m "fix(api): filter high priority grievances in dashboard and map properties"
```
