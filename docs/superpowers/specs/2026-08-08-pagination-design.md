# Pagination Design Spec

## 1. Konteks
Aplikasi CRMS mulai mengalami masalah performa (browser lag) karena memuat ribuan baris data secara bersamaan pada setiap modul (misalnya Daily Activities bisa mencapai 1.500-2.500 baris per tahun). Solusinya adalah menerapkan Pagination Klasik (Server-side) agar browser hanya me-render data sesuai kebutuhan per halamannya.

## 2. Arsitektur & Pendekatan
Pendekatan yang dipilih adalah **Offset-based Pagination**. 
Kelebihannya:
- Memudahkan navigasi dengan melompat langsung ke halaman spesifik (mis. Halaman 5).
- Mudah diimplementasikan menggunakan Prisma (`skip` dan `take`).
- Sangat memadai dan kencang untuk skala data CRMS yang berkisar di angka ribuan baris per tahun.

## 3. Desain Backend (API & Database)

### 3.1. Perubahan Parameter Request
Semua endpoint `GET /api/[modul]` (misalnya `/api/daily-activities`, `/api/stakeholders`, dll.) harus mendukung query parameter opsional:
- `page` (tipe: integer, default: 1)
- `limit` (tipe: integer, default: 50)

### 3.2. Implementasi Query (Prisma)
- Menggunakan kalkulasi offset: `skip = (page - 1) * limit`.
- Nilai take: `take = limit`.
- Untuk efisiensi, pengambilan data paginasi dijalankan paralel dengan penghitungan total data memakai `Promise.all`:
```typescript
const [data, totalItems] = await Promise.all([
  prisma.model.findMany({
    skip,
    take,
    where: { is_deleted: false, /* filter lain */ },
    // include lain ...
  }),
  prisma.model.count({
    where: { is_deleted: false, /* filter lain */ },
  })
]);
```

### 3.3. Perubahan Struktur Response API
Struktur JSON response saat ini:
```json
{
  "data": [ ... ]
}
```
Berubah menjadi:
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 50,
    "totalItems": 2500,
    "totalPages": 50
  }
}
```

### 3.4. Pengecualian Penting
Fungsi **"Export & Sync" (ke SharePoint)** dan **"Export Excel"** harus tetap berjalan dengan utuh dan **TIDAK TERPENGARUH** oleh pagination ini. Endpoint atau logic yang menangani kedua aksi tersebut akan tetap mengambil data secara penuh tanpa menyertakan `skip` dan `take`.

## 4. Desain Frontend (UI & State)

### 4.1. Komponen Baru
Akan dibuat file `src/app/components/ui/Pagination.tsx`.
Fungsi komponen ini:
- Menampilkan tombol **Prev** dan **Next**.
- Menampilkan nomor-nomor halaman yang bisa diklik. Jika jumlah halaman banyak, sertakan tampilan elipsis (`1 2 3 ... 50`).
- Menyediakan informasi *"Menampilkan X-Y dari Z data"*.
- (Opsional) Dropdown pemilih limit/halaman (mis. 50, 100 baris).

### 4.2. State Management
Pada setiap halaman/modul yang memuat data list (misal `src/app/pages/DailyActivities.tsx`):
- Menambahkan React state `page` dan `limit`.
- Dependensi `useEffect` atau fetching hooks (seperti `useQuery`) harus dipicu ulang ketika nilai `page` atau `limit` berubah.

### 4.3. UI Experience & Error Handling
- Saat `page` berpindah dan proses fetching berjalan, antarmuka tabel akan menunjukkan *skeleton loader* yang ringan atau *loading overlay* (tanpa menghancurkan layout tabel) untuk menjaga UI yang responsif dan mencegah kesan "ngelag" atau "blank".
- Jika user memasukkan halaman di luar rentang (mis. melalui modifikasi state manual), kembalikan `totalPages` dari API atau redirect otomatis ke Halaman 1.

## 5. Scope & Checklist
1. Buat/perbarui komponen UI `Pagination.tsx` di frontend.
2. Refactor response `GET` di backend untuk 7 Modul (Daily Activities, Stakeholder Engagement, Top Issues, Proposals, CSR Projects, Grievance, LRP) untuk mengembalikan format `meta` serta memakai `skip/take`.
3. Integrasikan `Pagination.tsx` dan logic state `page`/`limit` di masing-masing View Modul di frontend.
4. Pastikan "Export & Sync" maupun fitur Export tidak rusak akibat perubahan API payload (jika logic export menggunakan API yang sama, pastikan ada param `no_paginate=true` atau semacamnya, namun disarankan Export punya handler atau param terpisah agar selalu fetch semua data).
