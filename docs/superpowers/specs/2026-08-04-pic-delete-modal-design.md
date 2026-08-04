# PIC Delete Confirmation Modal Redesign

## Overview
Saat ini proses penghapusan PIC di dalam `PicManagementModal.tsx` menggunakan fungsi `confirm()` bawaan browser. Hal ini menyebabkan antarmuka konfirmasi terlihat sangat kaku dan tidak selaras dengan bahasa desain modern (seperti yang digunakan pada halaman utama *Daily Activities*). Proyek ini akan menstandardisasi modal konfirmasi penghapusan (Delete Confirmation Modal) di seluruh aplikasi dan menerapkannya pada fitur PIC.

## Arsitektur & Komponen

### 1. `src/components/ui/DeleteConfirmModal.tsx`
Kita akan membuat komponen *reusable* global dengan mengekstrak fungsi komponen `DeleteConfirm` yang saat ini terkurung di dalam `DailyActivitiesModule.tsx`.
- **Props**:
  - `label` (string): Nama atau judul item yang akan dihapus (ditampilkan tebal dalam deskripsi).
  - `onCancel` (function): Fungsi yang dipanggil saat pengguna membatalkan (klik "Batal").
  - `onConfirm` (function): Fungsi yang dipanggil saat pengguna menyetujui penghapusan (klik "Hapus").
- **Styling**: Akan mempertahankan desain *glassmorphism* / modal *card* dengan ikon peringatan merah dan teks bantuan "akan dihapus (soft delete) dan tidak muncul di daftar."
- **Z-Index**: Disetel ke `z-[80]` atau lebih tinggi untuk memastikan dapat menimpa modal lain yang sedang aktif (seperti `PicManagementModal` yang berada di `z-[70]`).

### 2. `PicManagementModal.tsx`
- **Penambahan State**: Menambahkan `[picToDelete, setPicToDelete] = useState<any | null>(null)`.
- **Interaksi Delete**: Ketika ikon *trash* diklik, aplikasi tidak lagi memanggil `confirm()`, melainkan mengatur state `setPicToDelete(p)`.
- **Render Modal Konfirmasi**: Menambahkan kondisi di bagian bawah (atau sejajar dengan JSX root) untuk me-render `<DeleteConfirmModal>` jika `picToDelete` tidak `null`.

### 3. Pembersihan di Modul Lain
- Menghapus deklarasi komponen lokal `function DeleteConfirm(...) { ... }` dari dalam `DailyActivitiesModule.tsx`.
- Mengganti seluruh penggunaannya dengan mengimpor `DeleteConfirmModal` yang baru dibuat.
- (Opsional namun disarankan) Jika modul lain (`StakeholdersModule`, `TopIssuesModule`, dll.) juga memiliki deklarasi `DeleteConfirm` lokal, mereka juga akan dialihkan untuk menggunakan komponen global ini agar mematuhi prinsip DRY.

## Error Handling & Testing
- Memastikan event propagasi `onClick` pada modal tidak menembus (bubbling) ke modal di bawahnya (`PicManagementModal`) sehingga klik di luar kotak merah tetap hanya menutup satu lapis modal.
- Build test menggunakan Vite (`pnpm run build`) harus dipastikan berjalan lancar dengan *exit code* 0 sebelum dianggap selesai.
