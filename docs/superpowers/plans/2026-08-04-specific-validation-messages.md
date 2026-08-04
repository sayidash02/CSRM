# Specific Field Validation Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah pesan validasi generik di semua 7 modul menjadi pesan spesifik yang menyebutkan nama field mana saja yang belum diisi.

**Architecture:** Setiap fungsi `handleSave` di masing-masing form component diubah untuk membangun array `missing` dari field wajib yang kosong, lalu mengirimkan pesan dinamis via `showToast`. Tidak ada komponen baru yang dibuat.

**Tech Stack:** React, TypeScript, Sonner (via showToast prop), Vite, pnpm

---

### Task 1: Daily Activities — Specific Validation Messages

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

**Context:** Fungsi `handleSave` ada di dalam komponen `DailyForm` (bukan komponen utama modul). Field wajib saat ini: `activity_date`, `activity`, `pic_id`, `category_id`, `sub_category_id`. Sebelumnya ada `alert()` yang sudah diganti `showToast` di sesi sebelumnya — pastikan keduanya sudah diganti semua.

- [ ] **Step 1: Ganti logika validasi di `handleSave` dalam `DailyForm`**

Cari fungsi `handleSave` (sekitar baris 154) di dalam `DailyActivitiesModule.tsx` dan ganti seluruh blok validasi:

```tsx
const handleSave = () => {
  const missing: string[] = (
    [
      [!f.activity_date, "Tanggal Kegiatan"],
      [!f.activity, "Kegiatan"],
      [!f.pic_id, "PIC"],
      [!f.category_id, "Kategori"],
      [!f.sub_category_id, "Sub Kategori"],
    ] as [boolean, string][]
  ).filter(([cond]) => cond).map(([, label]) => label);

  if (missing.length > 0) {
    if (showToast) {
      showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
    } else {
      alert(`Field berikut belum diisi: ${missing.join(", ")}`);
    }
    return;
  }
  onSave({ ...f, cost: Number(f.cost) || 0, document_link: f.document_link || null });
  onClose();
};
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file build`
Expected: Exit code 0, `✓ built in ...s`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
git commit -m "feat: specific field validation messages for daily activities"
```

---

### Task 2: Stakeholders — Specific Validation Messages

**Files:**
- Modify: `apps/web/src/features/stakeholders/StakeholdersModule.tsx`

**Context:** Fungsi `handleSave` ada di dalam komponen `StakeholderForm`. Field wajib saat ini: `stakeholder`. Komponen ini TIDAK memiliki prop `showToast` — cek apakah prop tersebut diterima, jika tidak gunakan `toast.error` dari sonner langsung.

- [ ] **Step 1: Cek apakah StakeholderForm menerima showToast prop**

Buka `apps/web/src/features/stakeholders/StakeholdersModule.tsx` dan periksa signature props dari `StakeholderForm`. Jika `showToast` tersedia, gunakan. Jika tidak, tambahkan import `import { toast } from 'sonner';` dan gunakan `toast.error(...)`.

- [ ] **Step 2: Ganti logika validasi di `handleSave` dalam `StakeholderForm`**

```tsx
const handleSave = () => {
  const missing: string[] = (
    [
      [!f.stakeholder, "Nama Stakeholder"],
    ] as [boolean, string][]
  ).filter(([cond]) => cond).map(([, label]) => label);

  if (missing.length > 0) {
    // Jika showToast tersedia:
    showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
    // Jika tidak, gunakan: toast.error(`Field berikut belum diisi: ${missing.join(", ")}`);
    return;
  }
  onSave({
    ...f,
    date: f.date || null,
    venue: f.venue || null,
    concern_issue: f.concern_issue || null,
    document_link: f.document_link || null
  });
  onClose();
};
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter @figma/my-make-file build`
Expected: Exit code 0

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/stakeholders/StakeholdersModule.tsx
git commit -m "feat: specific field validation messages for stakeholders"
```

---

### Task 3: Top Issues — Specific Validation Messages

**Files:**
- Modify: `apps/web/src/features/top-issues/TopIssuesModule.tsx`

**Context:** Fungsi `handleSave` ada di dalam komponen `TopIssueForm`. Field wajib saat ini: `period`, `issue`. Tidak ada pemanggilan `showToast` — tambahkan import dan gunakan `toast` dari sonner langsung jika prop tidak tersedia.

- [ ] **Step 1: Ganti logika validasi di `handleSave` dalam `TopIssueForm`**

Cari fungsi `handleSave` (sekitar baris 117) dan ganti:

```tsx
const handleSave = () => {
  const missing: string[] = (
    [
      [!f.period, "Periode"],
      [!f.issue, "Isu"],
    ] as [boolean, string][]
  ).filter(([cond]) => cond).map(([, label]) => label);

  if (missing.length > 0) {
    // Jika showToast tersedia sebagai prop:
    showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
    // Jika tidak, tambahkan: import { toast } from 'sonner'; lalu: toast.error(...)
    return;
  }
  onSave({
    ...f,
    main_document: f.main_document || null,
    supporting_document: f.supporting_document || null
  });
  onClose();
};
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file build`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/top-issues/TopIssuesModule.tsx
git commit -m "feat: specific field validation messages for top issues"
```

---

### Task 4: Proposals — Specific Validation Messages

**Files:**
- Modify: `apps/web/src/features/proposals/ProposalsModule.tsx`

**Context:** Fungsi `handleSave` ada di dalam komponen `ProposalForm`. Field wajib saat ini: `institution`, `date_received`, `registration_no`.

- [ ] **Step 1: Ganti logika validasi di `handleSave` dalam `ProposalForm`**

Cari fungsi `handleSave` (sekitar baris 130) dan ganti:

```tsx
const handleSave = () => {
  const missing: string[] = (
    [
      [!f.institution, "Nama Institusi"],
      [!f.date_received, "Tanggal Diterima"],
      [!f.registration_no, "No. Registrasi"],
    ] as [boolean, string][]
  ).filter(([cond]) => cond).map(([, label]) => label);

  if (missing.length > 0) {
    showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
    // Jika showToast tidak tersedia sebagai prop, import toast from 'sonner' lalu: toast.error(...)
    return;
  }
  onSave({
    ...f,
    proposal_file: f.proposal_file || null,
    assessment_file: f.assessment_file || null,
    address: f.address || null,
    proposal_description: f.proposal_description || null
  });
  onClose();
};
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file build`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/ProposalsModule.tsx
git commit -m "feat: specific field validation messages for proposals"
```

---

### Task 5: CSR Projects — Specific Validation Messages

**Files:**
- Modify: `apps/web/src/features/csr-projects/CsrProjectsModule.tsx`

**Context:** Fungsi `handleSave` ada di dalam komponen form CSR. Field wajib saat ini: `program`, `project_year`.

- [ ] **Step 1: Ganti logika validasi di `handleSave` dalam form CSR**

Cari fungsi `handleSave` (sekitar baris 142) dan ganti:

```tsx
const handleSave = () => {
  const missing: string[] = (
    [
      [!f.program, "Nama Program"],
      [!f.project_year, "Tahun"],
    ] as [boolean, string][]
  ).filter(([cond]) => cond).map(([, label]) => label);

  if (missing.length > 0) {
    showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
    // Jika showToast tidak tersedia sebagai prop, import toast from 'sonner' lalu: toast.error(...)
    return;
  }
  onSave({
    ...f,
    project_year: Number(f.project_year),
    budget: f.budget ? Number(f.budget) : null,
    activity: f.activity || null,
    type_of_activity: f.type_of_activity || null,
    location: f.location || null,
    target_beneficiaries: f.target_beneficiaries || null,
    objective: f.objective || null,
    implementation_period: f.implementation_period || null,
    documentation_image: f.documentation_image || null,
    document: f.document || null
  });
  onClose();
};
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file build`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/csr-projects/CsrProjectsModule.tsx
git commit -m "feat: specific field validation messages for csr projects"
```

---

### Task 6: Grievance — Specific Validation Messages

**Files:**
- Modify: `apps/web/src/features/grievance/GrievanceModule.tsx`

**Context:** Fungsi `handleSave` ada di dalam komponen `GrievanceForm`. Field wajib saat ini: `register_no`, `log_date`, `complainant_name`, `significance`.

- [ ] **Step 1: Ganti logika validasi di `handleSave` dalam `GrievanceForm`**

Cari fungsi `handleSave` (sekitar baris 152) dan ganti:

```tsx
const handleSave = () => {
  const missing: string[] = (
    [
      [!f.register_no, "No. Registrasi"],
      [!f.log_date, "Tanggal Pengaduan"],
      [!f.complainant_name, "Nama Pelapor"],
      [!f.significance, "Signifikansi"],
    ] as [boolean, string][]
  ).filter(([cond]) => cond).map(([, label]) => label);

  if (missing.length > 0) {
    showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
    // Jika showToast tidak tersedia sebagai prop, import toast from 'sonner' lalu: toast.error(...)
    return;
  }
  onSave({
    ...f,
    resolution: f.resolution || null,
    feedback: f.feedback || null,
    completion_date: f.completion_date || null,
    supporting_files: f.supporting_files || null,
    remarks: f.remarks || null
  });
  onClose();
};
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file build`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/grievance/GrievanceModule.tsx
git commit -m "feat: specific field validation messages for grievance"
```

---

### Task 7: LRP — Specific Validation Messages

**Files:**
- Modify: `apps/web/src/features/lrp/LrpModule.tsx`

**Context:** Fungsi `handleSave` saat ini adalah fungsi inline satu baris (sekitar baris 103): `const handleSave = () => { if (!f.program || !f.sharepoint_link) return; onSave(f); onClose(); };`. Perlu diperluas menjadi fungsi multi-baris. Field wajib: `program`, `sharepoint_link`. Komponen ini kemungkinan tidak memiliki `showToast` prop — cek dan gunakan `toast` dari sonner langsung jika diperlukan.

- [ ] **Step 1: Ganti fungsi `handleSave` inline menjadi multi-baris dengan pesan spesifik**

Cari baris yang mengandung `const handleSave = () => { if (!f.program || !f.sharepoint_link) return; ...` dan ganti seluruhnya:

```tsx
const handleSave = () => {
  const missing: string[] = (
    [
      [!f.program, "Nama Program"],
      [!f.sharepoint_link, "Link SharePoint"],
    ] as [boolean, string][]
  ).filter(([cond]) => cond).map(([, label]) => label);

  if (missing.length > 0) {
    toast.error(`Field berikut belum diisi: ${missing.join(", ")}`);
    return;
  }
  onSave(f);
  onClose();
};
```

Jika `toast` belum diimpor, tambahkan di bagian atas file:
```tsx
import { toast } from 'sonner';
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file build`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/lrp/LrpModule.tsx
git commit -m "feat: specific field validation messages for lrp"
```
