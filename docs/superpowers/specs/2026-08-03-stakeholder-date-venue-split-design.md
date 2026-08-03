# Design Spec: Split Date and Venue in Stakeholder Engagement

**Context:**
Saat ini, tanggal dan tempat di modul Stakeholder Engagement tergabung dalam satu kolom Teks tunggal (`date_venue`). Pengguna menginginkan pengisian data dipisah (ada *date picker* dan teks tempat terpisah) di formulir, namun tetap tampil sebagai satu kolom tergabung saat disajikan di Tabel UI dan Excel. Kita menggunakan Pendekatan Perubahan Database (Database Modification Approach) untuk struktur data yang lebih kokoh.

**1. Perubahan Database (Backend):**
- **schema.sql (Sumber Kebenaran):**
  - Drop/Hapus kolom `date_venue` dari tabel `stakeholder_engagement`.
  - Tambahkan kolom `date` (tipe `DATE`).
  - Tambahkan kolom `venue` (tipe `VARCHAR(255)`).
- **schema.prisma:**
  - Sesuaikan model `stakeholder_engagement`: ganti `date_venue String?` menjadi `date DateTime? @db.Date` dan `venue String? @db.VarChar(255)`.
- **StakeholdersController.ts:**
  - Modifikasi skema validasi (jika ada) dan *payload* pada operasi `CREATE` (POST) dan `UPDATE` (PUT) agar menerima `date` (opsional) dan `venue` (opsional).
- **stakeholders.test.ts (Testing):**
  - Perbarui parameter *mock payload* di blok pengujian integrasi (ganti `date_venue` dengan `date` dan `venue`).

**2. Perubahan Layar Antarmuka (Frontend):**
- **File Target:** `apps/web/src/features/stakeholders/StakeholdersModule.tsx`
- **Tipe Data (Interface):** 
  - Ganti `date_venue?: string` dengan `date?: string` dan `venue?: string` di dalam antarmuka `Stakeholder`.
- **Formulir (StakeholderForm):**
  - Pecah isian menjadi dua elemen `<Field>` terpisah:
    - `Field 1`: Label "Tanggal", Input Type: `date`, binding ke `f.date`.
    - `Field 2`: Label "Tempat", Input Type: `text`, binding ke `f.venue`.
- **Layar Tabel (DataTable):**
  - Pada array `columns`, modifikasi `cell` (atau *accessor*) untuk kolom Tanggal & Tempat menjadi fungsi yang menggabungkan `row.date` (dengan `formatDate`) dan `row.venue`.
  - Contoh rendering: `[Tanggal] — [Tempat]`.
- **Cetak Laporan (Excel Export):**
  - Di dalam fungsi `handleExportClick`, gabungkan nilai `date` dan `venue` menjadi satu *string* sebelum dimasukkan ke dalam `exportData`.

**Migrasi Data:**
Karena ini lingkungan pengembangan lokal/fase purwarupa, kita bisa langsung melakukan `npx prisma db push` yang kemungkinan akan mem-reset (*drop*) baris data dummy Stakeholder yang lama akibat penghapusan kolom. Hal ini dapat diterima.
