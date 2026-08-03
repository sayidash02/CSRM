# Design Spec: Database Seeding & Test Isolation

**Context:**
Pengguna melaporkan bahwa kategori "Paper Work" hilang di UI `Daily Activities` dan daftar sub-kategori tidak sesuai. Setelah ditelusuri, hal ini terjadi karena *automated testing* (`tests/dailyActivities.test.ts`) menggunakan *database* development dan menghapus datanya saat hook `beforeAll`.
Desain ini bertujuan merapikan data lewat mekanisme *seeding* permanen dan memisahkan *environment database* agar tes tidak merusak data utama.

**Komponen Utama:**

1. **Prisma Seeder (`apps/api/prisma/seed.ts`)**:
   - Skrip Typescript yang dijalankan via `npx prisma db seed`.
   - Menggunakan operasi `upsert` untuk memasukkan atau memperbarui `categories` dan `sub_categories`.
   - **Kategori 1:** "Stakeholder Engagement"
     - Sub-kategori: "Donasi", "Internal meeting", "Issue", "Issue dan Grievance", "Kehumasan", "Project CSR", "Security", "Support project".
   - **Kategori 2:** "Paper Work"
     - Sub-kategori: "Olah data".
   - Mengisi ulang juga 1 PIC aktif jika kosong agar form bisa di-*submit* saat diuji.

2. **Test Database Isolation (`.env.test` & `jest.config.js`)**:
   - Pembuatan `apps/api/.env.test` berisi `DATABASE_URL` yang menunjuk ke database terpisah (misal: `crms_test`).
   - Modifikasi `apps/api/package.json` untuk script `test`: menggunakan paket `dotenv-cli` untuk me-load `.env.test` sebelum mengeksekusi `jest`. (Sesuai aturan proyek poin 5).

3. **Frontend Cleanup (`apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`)**:
   - Menghapus konstanta `SUB_CATS` statis yang sudah tidak dipakai (karena `DailyForm` mengambil langsung dari `refs.sub_categories`).

**Data Flow (Testing):**
`npm test` -> me-load `.env.test` -> Prisma client merujuk ke URL test -> Setup DB -> `beforeAll` menghapus tabel -> eksekusi tes -> tes selesai. Database utama (`crms_dev`) tidak disentuh.

**Data Flow (Development):**
`npx prisma db seed` -> Prisma client merujuk ke `.env` utama -> Seeder memasukkan data master -> Front-end me-load lewat `/api/references` -> UI tampil akurat.
