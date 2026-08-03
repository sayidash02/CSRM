# Design Spec: Daily Activities Full Columns UI

**Context:** 
Pengguna ingin melihat semua field dari Daily Activities pada tampilan tabel utama (di URL `/daily-activities`), bukan hanya sebagian kolom. Sebelumnya beberapa kolom seperti Fokus, Alamat, dan Keterangan/Hasil disembunyikan atau dipotong.

**Desain Antarmuka (UI Table Layout):**

1. **Susunan Kolom Baru:**
   Tabel akan menampilkan 11 kolom (termasuk No dan Action):
   - `No`
   - `Tanggal` (activity_date)
   - `Kegiatan` (activity)
   - `Fokus` (focus)
   - `Institusi & Alamat` (institution_group dan address digabung)
   - `Lokasi` (location)
   - `PIC` (pic_id)
   - `Biaya` (cost)
   - `Keterangan & Hasil` (description_result)
   - `Docs` (document_link)
   - *(Aksi)* (tombol edit/hapus)

2. **Perilaku Teks & Wrapping:**
   - **Teks Panjang:** Kolom `Keterangan & Hasil` serta `Kegiatan` akan menggunakan kelas CSS `whitespace-normal` (wrap-text) dan tidak lagi dipotong (`truncate`). Baris tabel secara otomatis akan bertambah tingginya menyesuaikan teks.
   - **Penggabungan Kolom:** Kolom `Institusi & Alamat` akan menampilkan *institution_group* sebagai teks utama, dan *address* tepat di bawahnya menggunakan elemen terpisah (misal: `div` dengan ukuran font lebih kecil dan warna teks abu-abu/muted) agar rapi secara visual namun hemat ruang.

3. **Perubahan File:**
   - `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`:
     - Menyesuaikan *array* header di elemen `<thead>`.
     - Menambahkan/memodifikasi elemen sel `<td>` sesuai urutan kolom baru.
     - Menghapus kelas `truncate` dari `Kegiatan` dan meletakkan variabel `a.focus` ke sel `<td>` baru.
     - Menambahkan sel untuk `Keterangan & Hasil` (`a.description_result`) dengan teks yang membungkus.

**Error Handling & Testing:**
- Validasi rendering tabel dengan data teks yang sangat panjang untuk memastikan layar web tidak "pecah" (horizontal scroll allowed atau tabel menyesuaikan).
- Memastikan tombol aksi tetap bisa diklik dengan baik pada baris yang sangat tinggi.
