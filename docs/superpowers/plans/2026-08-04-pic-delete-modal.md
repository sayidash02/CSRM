# PIC Delete Confirmation Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengekstrak komponen konfirmasi penghapusan ke dalam komponen *reusable* global dan menerapkannya pada manajemen PIC.

**Architecture:** Pembuatan komponen `DeleteConfirmModal` di `src/components/ui`, kemudian mengimpor komponen tersebut ke `DailyActivitiesModule` dan `PicManagementModal` untuk menggantikan fungsi *confirm* bawaan.

**Tech Stack:** React, TailwindCSS, Vite, pnpm

---

### Task 1: Create Reusable DeleteConfirmModal Component

**Files:**
- Create: `apps/web/src/components/ui/DeleteConfirmModal.tsx`

- [ ] **Step 1: Write implementation**

Buat file baru di `apps/web/src/components/ui/DeleteConfirmModal.tsx` dengan isi:

```tsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function DeleteConfirmModal({ label, onCancel, onConfirm }: { label: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[80] p-4" onClick={onCancel}>
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border" onClick={e => e.stopPropagation()}>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="text-red-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Konfirmasi Hapus</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              "<span className="font-medium text-foreground">{label}</span>" akan dihapus (soft delete) dan tidak muncul di daftar.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors">Batal</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Hapus</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/DeleteConfirmModal.tsx
git commit -m "feat: add reusable DeleteConfirmModal component"
```

---

### Task 2: Refactor DailyActivitiesModule to use Reusable Modal

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Write implementation**

Buka `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`.
1. Tambahkan impor untuk `DeleteConfirmModal` di bagian atas:
```tsx
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
```

2. Cari dan HAPUS deklarasi lokal fungsi `DeleteConfirm` (sekitar baris 81-103):
```tsx
// Hapus seluruh blok ini:
// function DeleteConfirm({ label, onCancel, onConfirm }: { label: string; onCancel: () => void; onConfirm: () => void }) {
// ...
// }
```

3. Pada bagian JSX paling bawah di render `DailyActivitiesModule`, ganti pemanggilan `<DeleteConfirm>` menjadi `<DeleteConfirmModal>`:
```tsx
// Ganti baris ini:
// {toDelete && <DeleteConfirm label={toDelete.activity} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id); setToDelete(null); }} />}

// Menjadi:
{toDelete && <DeleteConfirmModal label={toDelete.activity} onCancel={() => setToDelete(null)} onConfirm={() => { handleDelete(toDelete.id); setToDelete(null); }} />}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
git commit -m "refactor: use shared DeleteConfirmModal in daily activities"
```

---

### Task 3: Implement Reusable Modal in PicManagementModal

**Files:**
- Modify: `apps/web/src/features/daily-activities/PicManagementModal.tsx`

- [ ] **Step 1: Write implementation**

Buka `apps/web/src/features/daily-activities/PicManagementModal.tsx`.
1. Tambahkan impor `DeleteConfirmModal`:
```tsx
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
```

2. Di dalam komponen `PicManagementModal`, tambahkan state `picToDelete`:
```tsx
  const [picToDelete, setPicToDelete] = useState<any | null>(null);
```

3. Ubah fungsi `handleDelete` agar menerima argumen id saja (tanpa hapus manual) atau tidak perlu dirubah, tapi hapus konfirmasinya. Lebih baik pisahkan konfirmasinya:
```tsx
// Ganti handleDelete menjadi:
  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/pics/${id}`);
      loadPics();
      setPicToDelete(null);
    } catch (e) {
      console.error(e);
    }
  };
```

4. Pada tombol sampah (sekitar baris 90), ganti `handleDelete(p.id)` menjadi penyetelan state konfirmasi:
```tsx
// Ganti baris ini:
// <button onClick={() => handleDelete(p.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={13} /></button>

// Menjadi:
<button onClick={() => setPicToDelete(p)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
```

5. Tambahkan rendering `<DeleteConfirmModal>` di bagian paling bawah JSX dari `PicManagementModal` (sebelum penutup `</div>` terluar):
```tsx
      {/* Tambahkan tepat di atas </div> paling bawah (sebelum penutup modal utamanya) atau di luarnya */}
      {picToDelete && (
        <DeleteConfirmModal
          label={picToDelete.name}
          onCancel={() => setPicToDelete(null)}
          onConfirm={() => handleDelete(picToDelete.id)}
        />
      )}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file run build`
Expected: PASS (Exit code 0)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/daily-activities/PicManagementModal.tsx
git commit -m "feat: use DeleteConfirmModal for PIC deletion"
```
