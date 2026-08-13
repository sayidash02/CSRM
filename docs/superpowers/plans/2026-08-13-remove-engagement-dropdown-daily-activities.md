# Remove Engagement Dropdown from Daily Activities Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the optional Stakeholder Engagement dropdown field from the Daily Activities form in the frontend UI.

**Architecture:** Remove the field element, default state, and payload fields from `DailyActivitiesModule.tsx`.

**Tech Stack:** React 18, TypeScript, Vite.

---

### Task 1: Remove Stakeholder Engagement Dropdown Field

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx:210-225`

- [ ] **Step 1: Remove the Form Field**
In `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`, remove the `<Field label="Stakeholder Engagement (Opsional)">` block and clean up any references to `stakeholder_engagement_id` in initial state and payload mapping.

- [ ] **Step 2: Verify TypeScript Compilation**
Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: PASS (0 errors)

- [ ] **Step 3: Verify Web App Build**
Run: `cd apps/web && pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
git commit -m "refactor(web): remove stakeholder engagement dropdown from daily activities form"
```
