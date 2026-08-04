# Alert Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti semua penggunaan fungsi `alert()` bawaan browser dengan notifikasi *toast error* dari library `sonner`.

**Architecture:** Kita akan mengganti pemanggilan `alert` dengan `showToast(..., "error")` pada komponen yang sudah memilikinya, dan mengimpor `toast` langsung dari `sonner` pada komponen *shared UI* yang tidak memiliki prop tersebut.

**Tech Stack:** React, Sonner, Vite, pnpm

---

### Task 1: Replace Alert in DailyActivitiesModule

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Write implementation**

Cari baris yang menggunakan `alert` (sekitar baris 175) di dalam fungsi validasi form (sebelum API call `handleAdd` atau di dalamnya), dan ganti dengan `showToast`.

```tsx
// Ganti baris ini:
// alert("Harap isi semua field yang wajib (dengan tanda *).");

// Menjadi:
showToast("Harap isi semua field yang wajib (dengan tanda *).", "error");
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
git commit -m "refactor: replace alert with showToast in daily activities"
```

---

### Task 2: Replace Alert in FileInput Component

**Files:**
- Modify: `apps/web/src/components/ui/FileInput.tsx`

- [ ] **Step 1: Write implementation**

Buka file `FileInput.tsx`. 
Tambahkan import `toast` dari `sonner` di bagian atas file:
```tsx
import { toast } from 'sonner';
```

Cari baris yang memanggil `alert` di blok `catch` atau error handling (sekitar baris 84):
```tsx
// Ganti baris ini:
// alert("Beberapa file gagal diunggah: " + (err.response?.data?.error || err.message));

// Menjadi:
toast.error("Beberapa file gagal diunggah: " + (err.response?.data?.error || err.message));
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/FileInput.tsx
git commit -m "refactor: replace alert with toast.error in FileInput"
```
