# Multi-PIC Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement many-to-many relationship support for PICs in Daily Activities (via `daily_activity_pics` table) across DB, API, Excel Importer, and Frontend, with manual Audit Trail integration.

**Architecture:** We will modify `schema.prisma`, update the controller to use nested writes for `create/update`, manually trigger `audit_logs` entries for PIC changes during updates, and revert the frontend to expect and submit multiple PICs natively.

**Tech Stack:** Prisma, Express.js, React

---

### Task 1: Prisma Schema Update

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Modify schema.prisma to support many-to-many PICs**

In `apps/api/prisma/schema.prisma`:

Remove `pic_id` and the `pic` relation from `daily_activities`:
```prisma
model daily_activities {
  id                 BigInt         @id @default(autoincrement())
  activity_date      DateTime       @db.Date
  activity           String         @db.VarChar(255)
  institution_group  String?        @db.VarChar(255)
  address            String?        @db.VarChar(255)
  focus              String?        @db.VarChar(255)
  location           String?        @db.VarChar(255)
  description_result String?        @db.Text
  category_id        BigInt
  sub_category_id    BigInt
  is_deleted         Boolean        @default(false)
  is_archived        Boolean        @default(false)
  created_at         DateTime       @default(now())
  updated_at         DateTime       @updatedAt
  cost               Decimal?       @db.Decimal(15, 2)
  document_link      String?        @db.Text
  category           categories     @relation(fields: [category_id], references: [id])
  sub_category       sub_categories @relation(fields: [sub_category_id], references: [id])
  daily_activity_pics daily_activity_pics[]

  @@index([activity_date])
  @@index([is_deleted])
  @@index([is_archived])
  @@index([category_id], map: "daily_activities_category_id_fkey")
  @@index([sub_category_id], map: "daily_activities_sub_category_id_fkey")
}
```

Add the `daily_activity_pics` model:
```prisma
model daily_activity_pics {
  activity_id BigInt
  pic_id      BigInt
  daily_activity daily_activities @relation(fields: [activity_id], references: [id], onDelete: Cascade)
  pic            pics             @relation(fields: [pic_id], references: [id])

  @@id([activity_id, pic_id])
  @@index([pic_id])
}
```

In the `pics` model, add the reverse relation:
```prisma
model pics {
  id                  BigInt                @id @default(autoincrement())
  name                String                @db.VarChar(255)
  created_at          DateTime              @default(now())
  updated_at          DateTime              @updatedAt
  daily_activity_pics daily_activity_pics[]
}
```

- [ ] **Step 2: Generate Prisma Client**

```bash
cd apps/api && npx prisma generate
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(api): update prisma schema for daily_activity_pics pivot table"
```

---

### Task 2: Update DailyActivitiesController (GET & CREATE)

**Files:**
- Modify: `apps/api/src/controllers/DailyActivitiesController.ts`

- [ ] **Step 1: Modify `getDailyActivities` include and formatting**

In `getDailyActivities`:
Change the `include` and `orderBy` for PICs:
Replace:
```typescript
  if (sort_by) {
    ...
      case 'pics':
      case 'pic':
      case 'pic_name':
      case 'pic.name':
        orderByConfig = { pic: { name: dir } };
        break;
```
With: (We cannot natively sort by many-to-many easily, so just fallback or ignore):
```typescript
      case 'pics':
      case 'pic':
      case 'pic_name':
      case 'pic.name':
        // Fallback for sorting by PICs (complex in many-to-many)
        orderByConfig = { activity_date: 'desc' };
        break;
```

Replace:
```typescript
  const include = { pic: true, category: true, sub_category: true };
```
With:
```typescript
  const include = { daily_activity_pics: { include: { pic: true } }, category: true, sub_category: true };
```

Before returning `res.status(200).json`, map the `activities`:
```typescript
  const formattedActivities = activities.map((a: any) => ({
    ...a,
    pics: a.daily_activity_pics?.map((dap: any) => dap.pic) || []
  }));
```
Return `formattedActivities` instead of `activities`.

- [ ] **Step 2: Modify `createDailyActivity`**

Update the destructuring and validation:
```typescript
  const { activity_date, activity, institution_group, address, focus, location, cost, description_result, document_link, pic_ids, category_id, sub_category_id } = req.body;

  if (!activity_date || !activity || !pic_ids || !Array.isArray(pic_ids) || pic_ids.length === 0 || !category_id || !sub_category_id) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
```

Update `prisma.daily_activities.create`:
```typescript
  const result = await prisma.daily_activities.create({
    data: {
      activity_date: new Date(activity_date),
      activity,
      institution_group: institution_group ?? req.body.stakeholder ?? null,
      address,
      focus,
      location,
      cost: cost !== undefined && cost !== null ? Number(cost) : null,
      description_result,
      document_link,
      category_id: BigInt(category_id),
      sub_category_id: BigInt(sub_category_id),
      daily_activity_pics: {
        create: pic_ids.map((id: any) => ({ pic_id: BigInt(id) }))
      }
    }
  });
```

- [ ] **Step 3: Run Typescript compiler**
```bash
cd apps/api && npx tsc --noEmit
```
(Expect errors in `importCommitExcel` and `updateDailyActivity`, we fix them next).

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/controllers/DailyActivitiesController.ts
git commit -m "feat(api): update GET and CREATE for daily activities multi-PIC"
```

---

### Task 3: Update DailyActivitiesController (PUT & Audit Log)

**Files:**
- Modify: `apps/api/src/controllers/DailyActivitiesController.ts`

- [ ] **Step 1: Modify `updateDailyActivity`**

Update destructuring and validation for `pic_ids`:
```typescript
  const { activity_date, activity, institution_group, address, focus, location, cost, description_result, document_link, pic_ids, category_id, sub_category_id } = req.body;

  if (!activity_date || !activity || !pic_ids || !Array.isArray(pic_ids) || pic_ids.length === 0 || !category_id || !sub_category_id) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
```

Add manual audit log logic before the `update`:
```typescript
  // Manual Audit Log for PICs
  const oldActivity = await prisma.daily_activities.findUnique({
    where: { id: BigInt(id as string) },
    include: { daily_activity_pics: { include: { pic: true } } }
  });

  const newPics = await prisma.pics.findMany({
    where: { id: { in: pic_ids.map((id: any) => BigInt(id)) } }
  });

  if (oldActivity) {
    const oldPicNames = oldActivity.daily_activity_pics.map(dap => dap.pic.name).sort().join(', ');
    const newPicNames = newPics.map(p => p.name).sort().join(', ');
    
    if (oldPicNames !== newPicNames) {
      await prisma.audit_logs.create({
        data: {
          entity_type: 'daily_activities',
          entity_id: BigInt(id as string),
          action: 'UPDATE',
          changes: JSON.stringify({
            pic_id: {
              old: oldPicNames,
              new: newPicNames
            }
          })
        }
      });
    }
  }

  const result = await prisma.daily_activities.update({
    where: { id: BigInt(id as string) },
    data: {
      activity_date: new Date(activity_date),
      activity,
      institution_group: institution_group ?? req.body.stakeholder ?? null,
      address,
      focus,
      location,
      cost: cost !== undefined && cost !== null ? Number(cost) : null,
      description_result,
      document_link,
      category_id: BigInt(category_id),
      sub_category_id: BigInt(sub_category_id),
      daily_activity_pics: {
        deleteMany: {},
        create: pic_ids.map((pid: any) => ({ pic_id: BigInt(pid) }))
      }
    }
  });
```

- [ ] **Step 2: Run test and commit**
```bash
cd apps/api && npx tsc --noEmit
git add apps/api/src/controllers/DailyActivitiesController.ts
git commit -m "feat(api): support multi-pic edit with manual audit logging"
```

---

### Task 4: Fix Excel Import Handlers

**Files:**
- Modify: `apps/api/src/controllers/DailyActivitiesController.ts`
- Modify: `apps/api/src/services/ExcelImportService.ts`

- [ ] **Step 1: Fix `importCommitExcel` in Controller**

In `importCommitExcel`, replace:
```typescript
      const picId = r.pic_id || (Array.isArray(r.pic_ids) ? r.pic_ids[0] : null);
      if (!r.category_id || !r.sub_category_id || !picId) {
```
With:
```typescript
      const pIds = Array.isArray(r.pic_ids) ? r.pic_ids : (r.pic_id ? [r.pic_id] : []);
      if (!r.category_id || !r.sub_category_id || pIds.length === 0) {
```

Replace `pic_id: BigInt(picId),` inside the `create` data object with:
```typescript
          daily_activity_pics: {
            create: pIds.map((id: any) => ({ pic_id: BigInt(id) }))
          },
```

- [ ] **Step 2: Fix `ExcelImportService.confirm`**

In `apps/api/src/services/ExcelImportService.ts`, find the `rawDailyActivities` insert loop:
Replace:
```typescript
            const pIds = item.pic_names.map(p => picMap.get(p.trim().toLowerCase())!);
            const pId = pIds.length > 0 ? pIds[0] : null;

            await tx.daily_activities.create({
              data: {
                activity_date: item.activity_date,
                activity: item.activity,
                institution_group: item.institution_group ? truncStr(item.institution_group, 255) : null,
                address: item.address,
                focus: item.focus,
                location: item.location,
                description_result: item.description_result,
                category_id: catId,
                sub_category_id: subCatId,
                pic_id: pId!,
                cost: item.cost,
                document_link: item.document_link
              }
            });
```
With:
```typescript
            const pIds = item.pic_names.map(p => picMap.get(p.trim().toLowerCase())!).filter(Boolean);

            await tx.daily_activities.create({
              data: {
                activity_date: item.activity_date,
                activity: item.activity,
                institution_group: item.institution_group ? truncStr(item.institution_group, 255) : null,
                address: item.address,
                focus: item.focus,
                location: item.location,
                description_result: item.description_result,
                category_id: catId,
                sub_category_id: subCatId,
                cost: item.cost,
                document_link: item.document_link,
                daily_activity_pics: {
                  create: pIds.map(id => ({ pic_id: id }))
                }
              }
            });
```

- [ ] **Step 3: Check Types and Commit**
```bash
cd apps/api && npx tsc --noEmit
git add apps/api/src/controllers/DailyActivitiesController.ts apps/api/src/services/ExcelImportService.ts
git commit -m "fix(api): align excel importer with daily_activity_pics schema"
```

---

### Task 5: Frontend Table and Form Updates

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Fix `DailyForm` submission payload**

In `handleSave`, change:
```typescript
    onSave({
      ...f,
      pic_id: f.pic_ids && f.pic_ids.length > 0 ? f.pic_ids[0] : null,
      stakeholder_id: f.stakeholder_id || null,
      cost: Number(f.cost) || 0,
      document_link: f.document_link || null
    } as any);
```
To:
```typescript
    onSave({
      ...f,
      pic_ids: f.pic_ids,
      stakeholder_id: f.stakeholder_id || null,
      cost: Number(f.cost) || 0,
      document_link: f.document_link || null
    } as any);
```

- [ ] **Step 2: Update Datatable Columns**

In `columns` definition, change:
```typescript
    { header: "PIC", accessor: "pic_id", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.pic?.name || '-'}</span> },
```
To:
```typescript
    { header: "PIC", accessor: "pics", sortable: true, render: (a) => <span className="text-xs text-foreground whitespace-nowrap">{a.pics?.length > 0 ? a.pics.map((p: any) => p.name).join(', ') : '-'}</span> },
```

- [ ] **Step 3: Update `handleExportClick`**

In `handleExportClick`, change:
```typescript
        pic_names: a.pic?.name || a.pics?.map((p: any) => p.name).join(", ") || "-"
```
To:
```typescript
        pic_names: a.pics?.map((p: any) => p.name).join(", ") || "-"
```

- [ ] **Step 4: Check Types and Commit**
```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
git commit -m "feat(web): restore multi-pic form and datatable mapping"
```
