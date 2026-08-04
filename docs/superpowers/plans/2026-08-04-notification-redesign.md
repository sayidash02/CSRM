# Notification Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti komponen notifikasi manual dengan `sonner` dan membuat pesan balikan (feedback) spesifik untuk setiap operasi CRUD di 7 modul utama.

**Architecture:** `<Toaster />` dari `sonner` di-mount di level root (`App.tsx`), dan fungsi `showToast` yang diturunkan (prop-drilled) di-refactor untuk memanggil API eksekusi dari `sonner`. Modul-modul feature diperbarui pesannya.

**Tech Stack:** React, Sonner, Vite, pnpm

---

### Task 1: Refactor App.tsx to use Sonner

**Files:**
- Modify: `apps/web/src/app/App.tsx`

- [ ] **Step 1: Write implementation**

Buka `apps/web/src/app/App.tsx`.
1. Hapus komponen `Toast` yang lama (baris 174-182):
```tsx
function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error" | "info"; onDismiss: () => void }) {
  // ... (hapus seluruh fungsi)
}
```

2. Tambahkan import `Toaster` dan `toast` dari `sonner` di bagian atas file:
```tsx
import { Toaster, toast } from 'sonner';
```

3. Di dalam komponen `App`, hapus state lokal `toast`:
```tsx
  const [toastState, setToastState] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null); // Hapus baris ini
```

4. Ubah logic fungsi `showToast` yang diturunkan ke modul-modul agar menggunakan Sonner:
```tsx
  const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
    if (type === "success") toast.success(msg);
    else if (type === "error") toast.error(msg);
    else toast.info(msg);
  }, []);
```

5. Hapus rendering komponen `Toast` lama di bagian return JSX dari `App`:
```tsx
      {/* HAPUS BAGIAN INI */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
```

6. Tambahkan `<Toaster richColors position="bottom-right" />` di dalam return utama `App`, letakkan tepat di atas `</main>` atau `</div>` paling luar.

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/App.tsx
git commit -m "refactor: replace custom Toast with sonner in App.tsx"
```

---

### Task 2: Update Messages in DailyActivitiesModule

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Update specific success messages**

Cari `handleAdd`, `handleEdit`, dan `handleDelete`. Ubah pemanggilan `showToast`:

```tsx
  const handleAdd = async (d: Omit<DailyActivity, "id">) => {
    try {
      await apiClient.post('/daily-activities', d);
      fetchData();
      showToast(`Kegiatan '${d.activity}' berhasil ditambahkan`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<DailyActivity, "id">) => {
    try {
      await apiClient.put(`/daily-activities/${id}`, d);
      fetchData();
      showToast(`Kegiatan '${d.activity}' berhasil diperbarui`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/daily-activities/${id}`);
      fetchData();
      // Gunakan toDelete.activity karena state toDelete masih ada saat dipanggil
      showToast(`Kegiatan '${toDelete?.activity || ''}' berhasil dihapus`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
git commit -m "feat: specific toast messages for daily activities"
```

---

### Task 3: Update Messages in StakeholdersModule

**Files:**
- Modify: `apps/web/src/features/stakeholders/StakeholdersModule.tsx`

- [ ] **Step 1: Update specific success messages**

Lakukan perubahan pada fungsi CRUD agar menjadi:

```tsx
  const handleAdd = async (d: Omit<Stakeholder, "id">) => {
    try {
      await apiClient.post('/stakeholders', d);
      fetchData();
      showToast(`Stakeholder '${d.stakeholder}' berhasil ditambahkan`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string, d: Omit<Stakeholder, "id">) => {
    try {
      await apiClient.put(`/stakeholders/${id}`, d);
      fetchData();
      showToast(`Stakeholder '${d.stakeholder}' berhasil diperbarui`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/stakeholders/${id}`);
      fetchData();
      showToast(`Stakeholder '${toDelete?.stakeholder || ''}' berhasil dihapus`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/stakeholders/StakeholdersModule.tsx
git commit -m "feat: specific toast messages for stakeholders"
```

---

### Task 4: Update Messages in TopIssuesModule

**Files:**
- Modify: `apps/web/src/features/top-issues/TopIssuesModule.tsx`

- [ ] **Step 1: Update specific success messages**

Lakukan hal yang sama menggunakan property `issue` dari objek TopIssue:

```tsx
  const handleAdd = async (d: Omit<TopIssue, "id">) => {
    try {
      await apiClient.post('/top-issues', d);
      fetchData();
      showToast(`Isu '${d.issue}' berhasil ditambahkan`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<TopIssue, "id">) => {
    try {
      await apiClient.put(`/top-issues/${id}`, d);
      fetchData();
      showToast(`Isu '${d.issue}' berhasil diperbarui`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/top-issues/${id}`);
      fetchData();
      showToast(`Isu '${toDelete?.issue || ''}' berhasil dihapus`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/top-issues/TopIssuesModule.tsx
git commit -m "feat: specific toast messages for top issues"
```

---

### Task 5: Update Messages in ProposalsModule

**Files:**
- Modify: `apps/web/src/features/proposals/ProposalsModule.tsx`

- [ ] **Step 1: Update specific success messages**

Gunakan property `institution` dari objek Proposal:

```tsx
  const handleAdd = async (d: Omit<Proposal, "id">) => {
    try {
      await apiClient.post('/proposals', d);
      fetchData();
      showToast(`Proposal dari '${d.institution}' berhasil ditambahkan`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<Proposal, "id">) => {
    try {
      await apiClient.put(`/proposals/${id}`, d);
      fetchData();
      showToast(`Proposal dari '${d.institution}' berhasil diperbarui`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/proposals/${id}`);
      fetchData();
      showToast(`Proposal dari '${toDelete?.institution || ''}' berhasil dihapus`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/ProposalsModule.tsx
git commit -m "feat: specific toast messages for proposals"
```

---

### Task 6: Update Messages in CsrProjectsModule

**Files:**
- Modify: `apps/web/src/features/csr-projects/CsrProjectsModule.tsx`

- [ ] **Step 1: Update specific success messages**

Gunakan property `program` dari objek CsrProject:

```tsx
  const handleAdd = async (d: Omit<CsrProject, "id">) => {
    try {
      await apiClient.post('/csr-projects', d);
      fetchData();
      showToast(`Program '${d.program}' berhasil ditambahkan`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<CsrProject, "id">) => {
    try {
      await apiClient.put(`/csr-projects/${id}`, d);
      fetchData();
      showToast(`Program '${d.program}' berhasil diperbarui`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/csr-projects/${id}`);
      fetchData();
      showToast(`Program '${toDelete?.program || ''}' berhasil dihapus`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/csr-projects/CsrProjectsModule.tsx
git commit -m "feat: specific toast messages for csr projects"
```

---

### Task 7: Update Messages in GrievanceModule

**Files:**
- Modify: `apps/web/src/features/grievance/GrievanceModule.tsx`

- [ ] **Step 1: Update specific success messages**

Gunakan property `complainant_name` atau `name` (tergantung interface frontend) dari objek Grievance. Mari asumsikan `name` sesuai pola yang lalu.

```tsx
  const handleAdd = async (d: Omit<Grievance, "id">) => {
    try {
      await apiClient.post('/grievances', d);
      fetchData();
      showToast(`Keluhan dari '${d.name}' berhasil ditambahkan`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<Grievance, "id">) => {
    try {
      await apiClient.put(`/grievances/${id}`, d);
      fetchData();
      showToast(`Keluhan dari '${d.name}' berhasil diperbarui`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/grievances/${id}`);
      fetchData();
      showToast(`Keluhan dari '${toDelete?.name || ''}' berhasil dihapus`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/grievance/GrievanceModule.tsx
git commit -m "feat: specific toast messages for grievance"
```

---

### Task 8: Update Messages in LrpModule

**Files:**
- Modify: `apps/web/src/features/lrp/LrpModule.tsx`

- [ ] **Step 1: Update specific success messages**

Gunakan property `program` dari objek LrpProgram:

```tsx
  const handleAdd = async (d: Omit<LrpProgram, "id">) => {
    try {
      await apiClient.post('/lrp', d);
      fetchData();
      showToast(`Program LRP '${d.program}' berhasil ditambahkan`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menyimpan data", "error");
    }
  };

  const handleEdit = async (id: string | number, d: Omit<LrpProgram, "id">) => {
    try {
      await apiClient.put(`/lrp/${id}`, d);
      fetchData();
      showToast(`Program LRP '${d.program}' berhasil diperbarui`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await apiClient.delete(`/lrp/${id}`);
      fetchData();
      showToast(`Program LRP '${toDelete?.program || ''}' berhasil dihapus`, "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal menghapus data", "error");
    }
  };
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/lrp/LrpModule.tsx
git commit -m "feat: specific toast messages for lrp"
```
