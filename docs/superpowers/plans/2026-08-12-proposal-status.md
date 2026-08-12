# Proposal Status Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the proposal status to only 'Accept' and 'Decline', making it a required field without a default value.

**Architecture:** Update `schema.sql` to remove the default value and change the check constraint. Update the API `ProposalsController.ts` to validate the required status. Update `DashboardController.ts` to remove metrics based on the removed 'Under Review' status. Finally, update the React frontend `ProposalsModule.tsx` and `DashboardModule.tsx`.

**Tech Stack:** Express, Prisma, React, Tailwind CSS

---

### Task 1: Update Database Schema

**Files:**
- Modify: `schema.sql`

- [ ] **Step 1: Modify proposals table definition**
Update the `status` column in `schema.sql` by removing the `DEFAULT 'Under Review'` and changing the check constraint.

```sql
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('Accept','Decline')),
```

- [ ] **Step 2: Commit**
```bash
git add schema.sql
git commit -m "chore: update proposals status schema"
```

### Task 2: Update API Validation

**Files:**
- Modify: `apps/api/src/controllers/ProposalsController.ts`

- [ ] **Step 1: Update `createProposal` validation**
Require `status` and remove fallback.

```typescript
export const createProposal = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const {
    registration_no,
    date_received,
    institution,
    address,
    proposal_description,
    proposal_file,
    assessment_file,
    status
  } = req.body;

  if (!registration_no || !date_received || !institution || !status) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const result = await prisma.proposals.create({
    data: {
      registration_no,
      date_received: new Date(date_received),
      institution,
      address,
      proposal_description,
      proposal_file,
      assessment_file,
      status
    }
  });

  res.status(201).json({ data: result });
});
```

- [ ] **Step 2: Update `updateProposal` validation**
Require `status` similarly in `updateProposal`.

```typescript
export const updateProposal = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    registration_no,
    date_received,
    institution,
    address,
    proposal_description,
    proposal_file,
    assessment_file,
    status
  } = req.body;

  if (!registration_no || !date_received || !institution || !status) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
// ... rest of the code remains the same
```

- [ ] **Step 3: Commit**
```bash
git add apps/api/src/controllers/ProposalsController.ts
git commit -m "feat: require status in proposal API"
```

### Task 3: Update Dashboard API metrics

**Files:**
- Modify: `apps/api/src/controllers/DashboardController.ts`

- [ ] **Step 1: Remove 'Under Review' metrics**
In `DashboardController.ts`, find the `Promise.all` call and completely remove the two `prisma.proposals.count` queries that filter by `status: 'Under Review'`.
Then, remove `proposalsUnderReview` and `staleProposals` from the destructured array result.

- [ ] **Step 2: Remove actionable exports**
Remove `proposalsUnderReview` and `staleProposals` from the `actionable` response object:
```typescript
      actionable: {
        csrOnGoing, grievanceHighOpen,
        untouchedGrievances
      },
```

- [ ] **Step 3: Update status chart counts**
Change `proposalStatusCounts` initialization to track only 'Accept' and 'Decline'.
```typescript
  const proposalStatusCounts: Record<string, number> = { 'Accept': 0, 'Decline': 0 };
```

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/controllers/DashboardController.ts
git commit -m "feat: remove under review metrics from dashboard API"
```

### Task 4: Update Frontend Form & Dashboard

**Files:**
- Modify: `apps/web/src/features/proposals/ProposalsModule.tsx`
- Modify: `apps/web/src/features/dashboard/DashboardModule.tsx`

- [ ] **Step 1: Update Dashboard UI**
In `DashboardModule.tsx`, completely remove the block rendering `stats.actionable.staleProposals`.
```tsx
            {/* Remove this entire block from DashboardModule.tsx: */}
            {stats.actionable.staleProposals > 0 && (
              <div className="flex items-start gap-3 bg-red-50 text-red-700 p-4 rounded-lg">
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span>Terdapat <strong>{stats.actionable.staleProposals}</strong> proposal Under Review lebih dari 2 minggu yang butuh perhatian.</span>
              </div>
            )}
```

- [ ] **Step 2: Update Proposals badge colors**
In `ProposalsModule.tsx`, update the status colors object to map Accept and Decline.
```tsx
  const statusColors: Record<string, string> = {
    Accept:"bg-emerald-100 text-emerald-700", Decline:"bg-red-100 text-red-600"
  };
```

- [ ] **Step 3: Update Proposal initial state**
In `ProposalsModule.tsx`, change `status: "Under Review"` to `status: ""` in `const initialFormState`.
Also in the `handleEdit` function: change the status assignment to `status: initial.status ?? ""`.

- [ ] **Step 4: Update Save Validation**
In `handleSave` in `ProposalsModule.tsx`, ensure `status` is required:
```tsx
    if (!f.registration_no || !f.date_received || !f.institution || !f.status) {
      toast.error("Registration No, Date, Institution, dan Status wajib diisi.");
      return;
    }
```

- [ ] **Step 5: Update Proposal form dropdown**
In `ProposalsModule.tsx`, update the `<select>` options for `status` inside the form:
```tsx
                <Field label="Status">
                  <select value={f.status} onChange={e => set("status", e.target.value)} className={inputCls}>
                    <option value="" disabled>Pilih Status...</option>
                    <option value="Accept">Accept</option>
                    <option value="Decline">Decline</option>
                  </select>
                </Field>
```

- [ ] **Step 6: Update filter dropdown**
In `ProposalsModule.tsx`, update the filter options for `status`:
```tsx
        <Select
          label="Status"
          value={filters.status}
          onChange={v => setFilter("status", v)}
          options={[
            { label: "All Status", value: "all" },
            { label: "Accept", value: "Accept" },
            { label: "Decline", value: "Decline" }
          ]}
        />
```

- [ ] **Step 7: Commit**
```bash
git add apps/web/src/features/proposals/ProposalsModule.tsx apps/web/src/features/dashboard/DashboardModule.tsx
git commit -m "feat: update proposal UI for new status"
```
