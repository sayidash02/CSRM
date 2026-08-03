# Implementation Plan: PIC Management

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement CRUD functionality for PICs (Person In Charge) with a modal interface directly accessible from activity forms.

**Tech Stack:** Node.js, Express, React, TypeScript.

---

### Task 1: Backend API for PICs

**Files:**
- Create: `apps/api/src/controllers/PicsController.ts`
- Create: `apps/api/src/routes/pics.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Create PicsController**
  Create `apps/api/src/controllers/PicsController.ts` containing `getPics`, `createPic`, `updatePic`, and `deletePic`. `deletePic` should do a soft-delete (`is_active: false`).
- [ ] **Step 2: Create Pics Router**
  Create `apps/api/src/routes/pics.ts` and register the endpoints (`GET /`, `POST /`, `PUT /:id`, `DELETE /:id`).
- [ ] **Step 3: Register Router in App**
  Modify `apps/api/src/app.ts` to `app.use('/api/pics', picsRouter)`.
- [ ] **Step 4: Commit**
  Commit the backend changes.

### Task 2: Frontend PIC Management Component

**Files:**
- Create: `apps/web/src/features/daily-activities/PicManagementModal.tsx`

- [ ] **Step 1: Create PicManagementModal Component**
  Create `PicManagementModal` using the existing UI components (`Modal`, `ModalFooter`, `inputCls`).
  It should fetch from `/api/pics` on mount, display a list of PICs with inline edit inputs and delete buttons.
  It should have an "Add New" section at the bottom.
  It should call a prop `onClose()` when dismissed.
- [ ] **Step 2: Commit**
  Commit the new component.

### Task 3: Integrate with Daily Activities Form

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Modify DailyForm**
  Update the PIC field in `DailyForm` to include a settings icon button (e.g., `<Settings size={14} />`) next to the select input.
  Add state `showPicManager` to toggle `PicManagementModal`.
- [ ] **Step 2: Handle Refresh**
  When `PicManagementModal` closes, it should trigger `fetchReferences()` in the parent `DailyActivitiesModule` so the dropdown updates with the new data.
- [ ] **Step 3: Commit**
  Commit the integration changes.
