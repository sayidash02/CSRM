# Daily Activities Export & Excel Export Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Daily Activities export functionality and upgrade the Excel export backend route to accept both array and object payloads.

**Architecture:** Update `DailyActivitiesController.ts` for safe year filter parsing, `DailyActivitiesModule.tsx` for robust data mapping and parameters, and `export.ts` route for dual payload format support.

**Tech Stack:** Node.js, Express, ExcelJS, React, TypeScript.

---

### Task 1: Fix Backend Year Filter Validation in DailyActivitiesController

**Files:**
- Modify: `apps/api/src/controllers/DailyActivitiesController.ts:67-73`

- [ ] **Step 1: Update year query parameter validation**

Target (lines 67-73):
```typescript
  if (year) {
    const y = year as string;
    where.activity_date = {
      gte: new Date(`${y}-01-01T00:00:00.000Z`),
      lte: new Date(`${y}-12-31T23:59:59.999Z`)
    };
  }
```

Replace with:
```typescript
  if (year && year !== 'Semua' && year !== 'All' && !isNaN(parseInt(year as string))) {
    const y = year as string;
    where.activity_date = {
      gte: new Date(`${y}-01-01T00:00:00.000Z`),
      lte: new Date(`${y}-12-31T23:59:59.999Z`)
    };
  }
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/controllers/DailyActivitiesController.ts
git commit -m "fix(api): validate year parameter in getDailyActivities to prevent invalid date"
```

---

### Task 2: Support Flexible Payload Formats in Excel Export Route

**Files:**
- Modify: `apps/api/src/routes/export.ts:6-15`

- [ ] **Step 1: Update /excel route to handle both Array and Object payloads**

Target (lines 6-15):
```typescript
router.post('/excel', async (req: Request, res: Response) => {
  try {
    const { sheetName = 'Export', columns = [], data = [] } = req.body;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns;
```

Replace with:
```typescript
router.post('/excel', async (req: Request, res: Response) => {
  try {
    let sheetName = (req.query.label as string) || 'Export';
    let columns: any[] = [];
    let data: any[] = [];

    if (Array.isArray(req.body)) {
      data = req.body;
      if (data.length > 0) {
        columns = Object.keys(data[0]).map(key => ({ header: key, key, width: Math.max(key.length + 5, 15) }));
      }
    } else if (req.body && typeof req.body === 'object') {
      sheetName = req.body.sheetName || sheetName;
      columns = req.body.columns || [];
      data = req.body.data || [];
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns;
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/routes/export.ts
git commit -m "feat(api): support array and object payloads in excel export route"
```

---

### Task 3: Fix Export Parameter and Field Mapping in DailyActivitiesModule

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx:415-463`

- [ ] **Step 1: Update handleExportClick implementation**

Target (lines 415-463):
```typescript
  const handleExportClick = async () => {
    try {
      showToast("Sedang menyiapkan data export...", "info");
      const params = new URLSearchParams();
      if (activeYear) params.append('year', activeYear);
      params.append('is_deleted', String(showDeleted));
      params.append('no_paginate', 'true');
      if (q) params.append('search', q);
      if (catFilter !== 'All') params.append('cat', catFilter);
      if (subCatFilter !== 'All') params.append('sub_cat', subCatFilter);
      if (dateRange.start) params.append('start', dateRange.start);
      if (dateRange.end) params.append('end', dateRange.end);
      params.append('sort_by', sortBy);
      params.append('sort_dir', sortDir);

      const res = await apiClient.get(`/daily-activities?${params.toString()}`);
      const exportItems = res.data.data.map((a: any) => ({
        ...a,
        category_name: references.categories?.find((c: any) => String(c.id) === String(a.category_id))?.name || "-",
        sub_category_name: references.sub_categories?.find((s: any) => String(s.id) === String(a.sub_category_id))?.name || "-"
      }));

      const exportColumns = [
        { header: "Tanggal", key: "activity_date", width: 15 },
        { header: "Aktivitas", key: "activity", width: 40 },
        { header: "Institusi/Kelompok", key: "institution_group", width: 25 },
        { header: "Alamat", key: "address", width: 30 },
        { header: "Lokasi", key: "location", width: 20 },
        { header: "PIC", key: "pic_names", width: 25 },
        { header: "Biaya", key: "cost", width: 20 },
        { header: "Category", key: "category_name", width: 20 },
        { header: "Sub Category", key: "sub_category_name", width: 25 },
        { header: "Keterangan & Hasil", key: "description_result", width: 40 },
        { header: "Dokumen", key: "document_link", width: 30 }
      ];

      const exportData = exportItems.map((a: any) => ({
        ...a,
        activity_date: formatDate(a.activity_date),
        cost: formatIDR(a.cost),
        pic_names: a.pics?.map((p: any) => p.name).join(", ") || "-"
      }));

      onExport("Daily Activities", { sheetName: `Daily Activities ${activeYear || 'Semua'}`, columns: exportColumns, data: exportData });
    } catch (e) {
      console.error(e);
      showToast("Gagal mengambil data untuk export", "error");
    }
  };
```

Replace with:
```typescript
  const handleExportClick = async () => {
    try {
      showToast("Sedang menyiapkan data export...", "info");
      const params = new URLSearchParams();
      if (activeYear && activeYear !== 'Semua' && activeYear !== 'All') params.append('year', activeYear);
      params.append('is_deleted', String(showDeleted));
      params.append('no_paginate', 'true');
      if (q) params.append('search', q);
      if (catFilter !== 'All') params.append('cat', catFilter);
      if (subCatFilter !== 'All') params.append('sub_cat', subCatFilter);
      if (dateRange.start) params.append('start', dateRange.start);
      if (dateRange.end) params.append('end', dateRange.end);
      params.append('sort_by', sortBy);
      params.append('sort_dir', sortDir);

      const res = await apiClient.get(`/daily-activities?${params.toString()}`);
      const rawData = Array.isArray(res.data.data) ? res.data.data : [];

      const exportItems = rawData.map((a: any) => ({
        ...a,
        category_name: a.category?.name || references.categories?.find((c: any) => String(c.id) === String(a.category_id))?.name || "-",
        sub_category_name: a.sub_category?.name || references.sub_categories?.find((s: any) => String(s.id) === String(a.sub_category_id))?.name || "-"
      }));

      const exportColumns = [
        { header: "Tanggal", key: "activity_date", width: 15 },
        { header: "Aktivitas", key: "activity", width: 40 },
        { header: "Institusi/Kelompok", key: "institution_group", width: 25 },
        { header: "Alamat", key: "address", width: 30 },
        { header: "Lokasi", key: "location", width: 20 },
        { header: "PIC", key: "pic_names", width: 25 },
        { header: "Biaya", key: "cost", width: 20 },
        { header: "Category", key: "category_name", width: 20 },
        { header: "Sub Category", key: "sub_category_name", width: 25 },
        { header: "Keterangan & Hasil", key: "description_result", width: 40 },
        { header: "Dokumen", key: "document_link", width: 30 }
      ];

      const exportData = exportItems.map((a: any) => ({
        ...a,
        activity_date: formatDate(a.activity_date),
        cost: formatIDR(a.cost),
        pic_names: a.pic?.name || a.pics?.map((p: any) => p.name).join(", ") || "-"
      }));

      onExport("Daily Activities", { sheetName: `Daily Activities ${activeYear || 'Semua'}`, columns: exportColumns, data: exportData });
    } catch (e) {
      console.error(e);
      showToast("Gagal mengambil data untuk export", "error");
    }
  };
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
git commit -m "fix(ui): fix export parameters and pic field mapping in daily activities"
```
