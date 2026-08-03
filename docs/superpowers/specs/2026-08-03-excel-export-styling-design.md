# Design Spec: Excel Export Styling (Corporate Hybrid)

**Context:**
File Excel hasil ekspor saat ini terlihat terlalu polos dan kurang profesional. Kita akan menerapkan "Corporate Hybrid Styling" (gabungan tampilan korporat yang rapi dengan fungsi analisis zebra-striping & auto-filter) secara terpusat di backend agar otomatis berlaku untuk 7 modul CRMS.

**Modifikasi:**
Target file: `apps/api/src/routes/export.ts`

**1. Meta & Header Laporan (Baris 1-3):**
- **Baris 1:** Judul cetak berupa string gabungan "Data Export - " dan `sheetName`. (Font: size 16, Bold). Sel digabung (merge) dari kolom A sampai kolom terakhir.
- **Baris 2:** Tanggal cetak (misal: "Generated on: DD-MM-YYYY HH:mm"). (Font: Italic). Sel digabung (merge).
- **Baris 3:** Dibiarkan kosong sebagai ruang bernapas (spacer).

**2. Kepala Tabel (Baris 4):**
- Akan diletakkan pada baris 4.
- **Tampilan:** Background warna Navy (ARGB `FF1F497D`), teks warna Putih (`FFFFFFFF`), font Bold.
- **Layout:** Alignment vertikal tengah, horizontal tengah, `wrapText` aktif.
- **Auto-filter:** Akan diaplikasikan ke seluruh range kepala tabel ini.
- **Freeze Panes:** Baris 4 ke atas akan di-freeze (beku) sehingga saat pengguna menggulir (scroll) layar Excel ke bawah, kepala tabel akan tetap terlihat.

**3. Baris Data (Mulai Baris 5) & Pola Zebra:**
- **Penyelarasan Teks:** Seluruh baris data di-set alignment vertikal atas (top) dan `wrapText: true` (sehingga teks deskripsi yang panjang akan menyesuaikan ke bawah, bukan menabrak sel sebelah).
- **Zebra Striping:**
  - Baris ganjil (indeks array 0, 2, 4...) -> Baris Excel 5, 7, 9... : Background putih/normal.
  - Baris genap (indeks array 1, 3, 5...) -> Baris Excel 6, 8, 10... : Background abu-abu muda (ARGB `FFF4F4F4`).
- **Borders:** Semua sel mulai dari baris 4 sampai baris terakhir akan diberi bingkai/border garis tipis hitam/abu-abu di keempat sisinya (atas, bawah, kiri, kanan).

**4. Kolom Lebar Otomatis (Toleransi Frontend):**
- Frontend sudah menyertakan `width` pada properti kolom payload JSON. Lebar kolom tersebut akan dipertahankan dan diaplikasikan langsung ke worksheet (`worksheet.columns = columns`).

**Dampak Arsitektur:**
- Perubahan ini 100% berada pada backend. 
- Tidak ada struktur data payload (`columns`, `data`) dari frontend yang perlu diubah. Semua 7 modul akan langsung dapat menikmati tampilan elegan ini tanpa perlu melakukan *pull request* tambahan.
