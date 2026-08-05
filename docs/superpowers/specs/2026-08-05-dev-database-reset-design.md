# Desain: Reset Database (Dev Only)

## Konteks
Selama masa development dan testing manual, seringkali data menumpuk dan menyulitkan pengujian skenario dari awal. Menghapus data satu per satu dari antarmuka pengguna tidak efisien. Fitur ini menambahkan mekanisme cepat untuk mengosongkan seluruh isi database (reset), dengan penjagaan ketat agar hanya dapat diakses pada environment development.

## 1. Backend Architecture

### 1.1 Endpoint dan Route Guard
Akan dibuat endpoint khusus: `DELETE /api/dev/reset`.
Endpoint ini dikendalikan oleh file route baru `apps/api/src/routes/dev.ts` dan diimplementasi di `apps/api/src/controllers/DevController.ts`.

**Keamanan (Guard):**
Untuk memastikan fitur ini tidak bisa disalahgunakan di production, route ini akan menerapkan proteksi level environment:
```typescript
if (process.env.NODE_ENV === 'production') {
  router.all('*', (req, res) => res.status(404).json({ error: 'Not found' }));
} else {
  router.delete('/reset', devReset);
}
```

### 1.2 Urutan Penghapusan (Deletion Sequence)
Untuk menghindari masalah Foreign Key constraint, penghapusan dilakukan secara *hard delete* (`deleteMany`) berurutan dari tabel anak (child) ke tabel induk (parent), di dalam satu `prisma.$transaction`.

Urutan eksekusi:
1. `daily_activities`
2. `stakeholder_engagement`
3. `top_issues`
4. `proposals`
5. `csr_projects`
6. `grievance`
7. `lrp`
8. `sync_log`
9. `pics`
10. `sub_categories`
11. `categories`

### 1.3 Seeding Ulang (Re-seeding)
Tabel `categories` dan `sub_categories` memegang peran krusial sebagai data master untuk dropdown. Setelah proses deleteMany selesai, di dalam fungsi `devReset` akan otomatis dipanggil fungsi yang melakukan insert data *default* (menggunakan data bawaan aplikasi) untuk `categories` dan `sub_categories`. Tabel `pics` dibiarkan kosong.

## 2. Frontend Architecture

### 2.1 UI Tombol di Pengaturan Arsip
File yang akan dimodifikasi adalah `apps/web/src/features/archive/ArchiveSettings.tsx`.
Sebuah seksi baru bernama **Danger Zone** akan diletakkan di bagian paling bawah halaman. Seksi ini dibungkus menggunakan kondisi `if (import.meta.env.DEV)` sehingga sama sekali tidak akan diikutsertakan di proses build produksi.

### 2.2 Modal Konfirmasi
Ketika pengguna mengklik tombol "Reset Database" berwarna merah, sebuah modal akan muncul:
- **Teks Peringatan:** Menjelaskan bahwa seluruh data operasional, PIC, dan riwayat sinkronisasi akan terhapus secara permanen.
- **Tantangan (Challenge):** Meminta pengguna untuk mengetikkan kata `RESET` (huruf kapital) di dalam input text.
- **Tombol Aksi:** Tombol "Hapus Semua" (warna merah) secara default berada dalam state `disabled`. Tombol ini baru akan aktif jika nilai dari input text sama persis dengan `RESET`.

### 2.3 Post-Reset Action
Setelah API memberikan respons sukses (200 OK), frontend akan menampilkan *toast notification* sukses, kemudian mengeksekusi `window.location.reload()` untuk memaksa reload keseluruhan aplikasi. Hal ini menjamin seluruh *state* memori pada React ikut dibersihkan (reset ke state kosong).
