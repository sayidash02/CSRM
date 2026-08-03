# Design Spec: Master Data Seeder

**Context:** 
Form di frontend seperti modul Daily Activities memerlukan data referensi (Categories, Sub Categories) yang tersedia di database. Karena tabel tersebut kosong, form tidak menampilkan pilihan apapun. Seeder ini akan secara otomatis mengisi *master data* tersebut ke dalam database agar aplikasi bisa langsung digunakan dengan data yang valid.

**Arsitektur & Komponen:**
1. **`seed.ts`**:
   - Sebuah file script baru berlokasi di `apps/api/src/seed.ts`.
   - Menginisialisasi `PrismaClient` untuk berinteraksi dengan database.
   - Menggunakan mekanisme *upsert* atau *find-then-create* untuk mencegah duplikasi data meskipun script dijalankan berulang kali.

2. **Data yang Disuntikkan (Seeded Data):**
   - **Kategori "Stakeholder Engagement"**
     - Sub-kategori: Donasi, internal meeting, issue, Issue dan Grievance, kehumasan, project CSR, Security, support project.
   - **Kategori "Paper Work"**
     - Sub-kategori: Olah data.

**Data Flow:**
1. Developer / User mengeksekusi perintah `npm run seed` di folder backend.
2. Script akan mengecek keberadaan Kategori "Stakeholder Engagement". Jika tidak ada, dibuat. 
3. Script akan mengambil ID dari kategori tersebut.
4. Script akan meloop daftar Sub-kategori "Stakeholder Engagement" dan memasukkannya jika belum ada, dikaitkan dengan ID kategori induknya.
5. Proses yang sama (Langkah 2-4) diulangi untuk Kategori "Paper Work" dan sub-kategorinya.

**Integrasi package.json:**
- Menambahkan perintah `"seed": "ts-node src/seed.ts"` ke dalam `scripts` di file `apps/api/package.json`.

**Error Handling:**
- Seluruh proses koneksi Prisma dibungkus dalam blok `try-catch-finally`.
- Jika terjadi error pada koneksi SQL, akan di-*print* ke konsol dan script exit dengan `process.exit(1)`.
- Memastikan `prisma.$disconnect()` selalu dipanggil di bagian `finally`.
