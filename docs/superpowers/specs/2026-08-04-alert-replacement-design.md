# Alert Replacement Design

## Overview
Proyek ini akan mengganti fungsi `alert()` bawaan browser yang masih digunakan di dalam aplikasi (seperti saat validasi form gagal atau saat upload file gagal) dengan notifikasi dari library `sonner`. Hal ini bertujuan untuk menyeragamkan UI/UX notifikasi agar lebih modern dan konsisten.

## Scope
Pencarian menemukan dua lokasi penggunaan `alert()`:
1. Validasi form di `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`.
2. Error handling pada upload file di `apps/web/src/components/ui/FileInput.tsx`.

## Implementation Details

### 1. `DailyActivitiesModule.tsx`
- **Current**: Menggunakan `alert("Harap isi semua field yang wajib (dengan tanda *).")`.
- **Change**: Mengganti `alert(...)` dengan pemanggilan fungsi prop yang sudah tersedia: `showToast("Harap isi semua field yang wajib (dengan tanda *).", "error")`.
- **Effect**: Menampilkan notifikasi *error* merah di sudut kanan bawah.

### 2. `FileInput.tsx`
- **Current**: Menggunakan `alert("Beberapa file gagal diunggah: " + ... )`.
- **Change**: Karena komponen `FileInput` adalah komponen UI umum dan tidak menerima prop `showToast`, kita akan:
  1. Menambahkan `import { toast } from 'sonner';` di bagian atas file.
  2. Mengganti fungsi `alert` dengan `toast.error("Beberapa file gagal diunggah: " + ...)`.
- **Effect**: Menampilkan notifikasi *error* merah secara konsisten tanpa perlu merombak alur *props* pada seluruh hierarki komponen.

## Error Handling & Testing
- Setelah implementasi, perubahan wajib diverifikasi menggunakan proses *build* Vite (`pnpm --filter @figma/my-make-file build`) untuk memastikan tidak ada impor atau tipe yang rusak.
- UI/UX akan secara instan berubah, dan pengguna tidak akan lagi menemui *blocking pop-up* di tengah layar.
