# Notification Redesign & Specific Messages

## Overview
Proyek ini akan mengganti notifikasi "bland" manual yang ada di `App.tsx` menggunakan library `sonner`. Selain membuat tampilan lebih modern (minimalis, animasi mulus, status icon), pesan balikan (feedback message) dari operasi CRUD (Add, Edit, Delete) pada 7 modul utama akan dibuat lebih spesifik dengan menyertakan nama data yang diubah.

## 1. UI & Library Component
- **Library**: `sonner` (Sudah terinstal, versi `2.0.3` di `apps/web/package.json`).
- **Komponen Utama**: `<Toaster richColors position="bottom-right" />` akan diletakkan di root aplikasi (`App.tsx`).
- **Penghapusan Komponen Lama**: Komponen `Toast` buatan sendiri (berupa `<div className="fixed bottom-5 right-5... ">`) akan dihapus dari `App.tsx`.

## 2. Refactoring `App.tsx`
- State `toast` lokal yang lama akan dihapus karena `sonner` menangani state-nya sendiri.
- Fungsi pembungkus `showToast(msg, type)` akan tetap dipertahankan sebagai facade agar kita tidak perlu mengubah seluruh *prop drilling* di aplikasi, namun isinya diubah menjadi:
  - `if (type === 'success') toast.success(msg)`
  - `if (type === 'error') toast.error(msg)`
  - `if (type === 'info') toast.info(msg)`

## 3. Specific Messages per Module
Pada fungsi `handleAdd`, `handleEdit`, dan `handleDelete` di setiap modul, pesan balikan yang saat ini statis ("Data berhasil ditambahkan") akan diubah agar dinamis:

1. **Daily Activities (`DailyActivitiesModule.tsx`)**
   - Add/Edit: `"Kegiatan '${d.activity}' berhasil ditambahkan/diperbarui"`
   - Delete: `"Kegiatan '${toDelete.activity}' berhasil dihapus"`
2. **Stakeholders (`StakeholdersModule.tsx`)**
   - Add/Edit: `"Stakeholder '${d.stakeholder}' berhasil ditambahkan/diperbarui"`
   - Delete: `"Stakeholder '${toDelete.stakeholder}' berhasil dihapus"`
3. **Top Issues (`TopIssuesModule.tsx`)**
   - Add/Edit: `"Isu '${d.issue}' berhasil ditambahkan/diperbarui"`
   - Delete: `"Isu '${toDelete.issue}' berhasil dihapus"`
4. **Proposals (`ProposalsModule.tsx`)**
   - Add/Edit: `"Proposal dari '${d.institution}' berhasil ditambahkan/diperbarui"`
   - Delete: `"Proposal dari '${toDelete.institution}' berhasil dihapus"`
5. **CSR Projects (`CsrProjectsModule.tsx`)**
   - Add/Edit: `"Program '${d.program}' berhasil ditambahkan/diperbarui"`
   - Delete: `"Program '${toDelete.program}' berhasil dihapus"`
6. **Grievance (`GrievanceModule.tsx`)**
   - Add/Edit: `"Keluhan dari '${d.name}' berhasil ditambahkan/diperbarui"`
   - Delete: `"Keluhan dari '${toDelete.name}' berhasil dihapus"`
7. **LRP (`LrpModule.tsx`)**
   - Add/Edit: `"Program LRP '${d.program}' berhasil ditambahkan/diperbarui"`
   - Delete: `"Program LRP '${toDelete.program}' berhasil dihapus"`

## 4. Error Handling
- Jika request API gagal (masuk blok `catch`), pesan *error* akan tetap menggunakan toast bawaan Sonner (`toast.error`).
- Pesan *error* bisa dikembangkan ke depan untuk mengekstrak pesan error spesifik dari response backend (jika ada), atau tetap menggunakan pesan standar "Gagal menyimpan data".

## 5. Scope & Constraints
- Implementasi ini hanya berfokus pada frontend (`apps/web`). Backend (`apps/api`) tidak disentuh.
- Prop `showToast` yang diturunkan ke masing-masing komponen tetap menggunakan signature yang sama agar komponen anak tidak rusak.
