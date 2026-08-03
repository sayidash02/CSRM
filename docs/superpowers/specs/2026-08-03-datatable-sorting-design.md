# Design Spec: Universal Sortable DataTable

**Context:**
Pengguna ingin setiap tabel di seluruh aplikasi (7 modul) memiliki kemampuan pengurutan (sorting) berdasarkan header kolom (ascending/descending). Pengguna juga meminta agar *semua* kolom dapat diklik untuk pengurutan, bukan hanya kolom tertentu. Untuk mencapai hal ini tanpa kode yang sangat panjang dan berulang, kita akan menggunakan pendekatan komponen UI terpusat.

**Desain Arsitektur & Komponen:**

1. **Pembuatan Komponen `<DataTable />`:**
   - Lokasi: `apps/web/src/components/ui/DataTable.tsx`
   - Props yang diterima:
     - `data`: Array of objects (data baris).
     - `columns`: Array of objects yang merepresentasikan kolom tabel. Setiap kolom memiliki:
       - `header`: Label teks kolom.
       - `accessor`: Kunci (key) properti pada data untuk diurutkan (misal: "activity_date").
       - `render`: Fungsi opsional untuk me-*render* tampilan sel secara khusus (seperti memformat nilai Rupiah, membuat tag HTML untuk kolom gabungan Institusi & Alamat, dll).
       - `className`: Pengaturan lebar sel/Tailwind khusus untuk sel data.

2. **Logika Pengurutan (*Sorting Engine*):**
   - Di dalam komponen `<DataTable />`, terdapat *state* untuk melacak:
     - `sortKey`: kolom mana yang sedang diurutkan (berdasarkan `accessor`).
     - `sortDirection`: `"asc"` atau `"desc"`.
   - Mengklik sebuah `<th />` akan:
     - Mengubah *direction* (jika kolom yang sama diklik).
     - Mengubah *key* dan me-reset *direction* ke `"asc"` (jika kolom berbeda diklik).
   - Sebuah indikator visual (misalnya `↑` atau `↓` menggunakan panah sederhana/lucide-react) akan muncul di sebelah nama header yang sedang aktif.
   - Pengurutan mendukung komparasi *string* (dengan `.localeCompare`) maupun perbandingan angka. Untuk *null*/*undefined*, dipindahkan secara aman.

3. **Integrasi ke 7 Modul CRMS:**
   - Fitur-fitur (seperti `DailyActivitiesModule.tsx`) akan menghapus blok `<table className="w-full text-sm">...</table>` mereka.
   - Sebagai gantinya, mereka akan memanggil `<DataTable data={displayed} columns={columns} />`.
   - Konfigurasi `columns` akan mendefinisikan pe-renderan unik masing-masing modul. Misalnya, fungsi *action button* (Edit/Hapus) di-kuasai dengan meneruskan callback `onEdit` dan `onDelete` ke closure fungsi `render` kolom.

**Error Handling & Edge Cases:**
- Jika data kosong (`data.length === 0`), tabel tetap merender area "Tidak ada data yang cocok."
- Jika `accessor` yang diberikan berisi tipe gabungan (*nested*) yang kompleks atau `null`, logika *sort* akan memberikan nilai *fallback* kosong `""` atau `0` agar aplikasi tidak hancur (*crash*).

**Testing:**
- Validasi pada tabel dengan data tanggal, mata uang (angka), dan teks yang panjang.
- Memastikan klik panah berulang ber-rotasi dari *asc* ke *desc*.
- Memastikan render khusus (*render function* untuk aksi Edit/Hapus) tetap tersambung dengan *state* modul (*editing/toDelete*).
