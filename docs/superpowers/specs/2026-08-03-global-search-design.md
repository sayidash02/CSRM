# Design Spec: Universal Global Search for CRMS Modules

**Context:**
Saat ini fungsi pencarian pada tabel data hanya mencakup beberapa kolom tertentu secara *hardcoded* (misal: "activity", "institution_group", "location"). Pengguna ingin agar pencarian mencakup *semua* teks yang ada di dalam tabel (seperti nama PIC, detail Keterangan & Hasil, Alamat, Biaya, dll.) tanpa harus memilih filter kolom secara manual (Opsi A - *Automatic Global Search*). Fitur ini harus dapat digunakan di ke-7 modul utama aplikasi CRMS.

**Desain Arsitektur & Komponen:**

1. **Pembuatan Hook Global (`useGlobalSearch.ts`):**
   - Kita akan mengekstrak logika `useSearch` yang sebelumnya berada di setiap modul ke sebuah file tersendiri (contoh: `apps/web/src/hooks/useGlobalSearch.ts`).
   - Hook ini tidak lagi meminta daftar *keys* secara spesifik. Hook ini akan menerima *array of objects* (data tabel) dan secara dinamis mengubah seluruh nilai objek tersebut (termasuk *nested objects* seperti `pic.name`) menjadi satu gabungan *string* teks panjang.
   - Kata kunci pencarian (query) kemudian akan dicocokkan terhadap gabungan *string* tersebut secara tidak peka huruf besar-kecil (*case-insensitive*).
   - Penggunaan `JSON.stringify(item)` dipadukan dengan Regex atau fungsi penjelajah objek dinamis dapat menjadi solusi implementasi agar aman digunakan untuk struktur tabel apa pun.

2. **Integrasi ke Modul yang Ada:**
   - Modul `DailyActivitiesModule.tsx` (dan modul lain yang sudah aktif, misal `CsrProjectsModule.tsx`) akan dimodifikasi.
   - Logika `useSearch` lama dihapus.
   - Diimpor hook `useGlobalSearch` yang baru dan diaktifkan. Tidak ada perubahan pada UI komponen kotak pencarian (tetap menggunakan satu *input text* dengan *icon search*).

**Error Handling & Edge Cases:**
- Jika objek data berisi data non-string (seperti tipe tanggal atau angka), hook global harus memastikan nilainya di-*convert* menjadi string dengan benar sebelum dicocokkan (contoh biaya `500000` harus bisa dicari).
- Data relasi (contoh properti `.pic`) harus tersapu oleh pencarian, sehingga mencari "Ziya" akan cocok dengan `.pic.name === "Ziya Ramadhani"`.
- Jika hasil pencarian kosong, UI tetap menampilkan "Tidak ada data yang cocok." seperti yang sudah berjalan saat ini.

**Testing:**
- Melakukan pencarian menggunakan teks yang berada di dalam `address` atau `description_result` untuk memastikan data terfilter dengan benar.
- Memastikan performa tetap cepat di *client-side* meskipun data mengandung paragraf panjang.
