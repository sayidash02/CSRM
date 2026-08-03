# Design Spec: Currency Input Formatting

**Context:** 
Pengguna memerlukan input field khusus untuk kolom biaya (budget/cost) yang secara otomatis menambahkan pemisah ribuan saat diketik (contoh: "12000" menjadi "12.000"). Ini bertujuan untuk mempermudah visibilitas nilai angka yang besar tanpa merusak data asli bertipe integer/number yang dikirimkan ke backend. Fitur ini diterapkan di form Daily Activities dan CSR Projects.

**Arsitektur & Komponen:**

1. **Komponen Reusable (`apps/web/src/components/ui/CurrencyInput.tsx`)**:
   - Komponen React baru `<CurrencyInput>` yang membungkus `<input type="text">`.
   - **Props**:
     - `value`: (number | string) nilai murni tanpa format.
     - `onChange`: (function) memancarkan string murni (hanya angka) ke atas.
     - `placeholder`, `className`, dll.
   - **Internal State**: 
     - Menangkap `onChange` dari elemen asli, membersihkan semua karakter selain angka (`\D`), kemudian memancarkannya.
     - Mengubah nilai mentah yang diturunkan dari props menjadi format *locale* string (`Intl.NumberFormat('id-ID')` atau secara manual dengan regex).

2. **Implementasi di Daily Activities (`DailyActivitiesModule.tsx`)**:
   - Impor `CurrencyInput`.
   - Ganti `<input type="number">` pada kolom Biaya (cost) menjadi `<CurrencyInput>`.
   - Pastikan *state binding* tetap menerima nilai murni (angka murni sebagai string yang nantinya di-`Number()`-kan sebelum disimpan).

3. **Implementasi di CSR Projects (`CsrProjectsModule.tsx` atau nama file serupa)**:
   - Impor `CurrencyInput`.
   - Ganti `<input type="number">` pada kolom Budget/Anggaran menjadi `<CurrencyInput>`.
   - Pastikan *state binding* bekerja seragam seperti di Daily Activities.

**Data Flow:**
1. Pengguna mengetik `1`. Kolom menampilkan `1`. State form menerima `"1"`.
2. Pengguna mengetik `2000`. Kolom menampilkan `12.000`. State form menerima `"12000"`.
3. Pengguna men-submit form. Payload `cost` ke backend berisi angka murni `12000` (atau number `12000`).
4. Database dan API tidak perlu berubah sama sekali, karena payload tetap berformat standard.

**Error Handling / Edge Cases:**
- Jika *value* diubah paksa dari kode lain (misal form edit), fungsi formatter harus tetap berjalan pada awal *render*.
- Mencegah *leading zeroes* (nol di depan, misal "012000").
- Jika *empty* atau *null*, harus menampilkan `""`.
