
# CRMS — Community Relations Management System

  CRMS adalah aplikasi internal untuk pengelolaan data Community Relations.

  ## Running the code

  Gunakan pnpm dari workspace root:

  ```text
  pnpm install
  pnpm dev
  ```

  Sebelum menjalankan API, salin `apps/api/.env.example` menjadi
  `apps/api/.env` dan isi `DATABASE_URL`. Pada database baru, jalankan migration,
  seed master data, lalu buat admin pertama dengan satu command interaktif:

  ```text
  pnpm --dir apps/api exec prisma migrate deploy
  pnpm --dir apps/api seed
  pnpm --dir apps/api account:setup-admin
  ```

  Command setup hanya dapat membuat admin jika belum ada admin. Password diketik
  langsung di terminal dan tidak disimpan di `.env`; jangan commit file `.env`.

  Setelah login sebagai `ADMIN`, menu **Kelola Akun** tersedia untuk membuat
  akun `USER`/`ADMIN`, mengganti password, dan menonaktifkan akses login. Tidak
  ada endpoint register publik: request yang mencoba membuat akun tanpa ADMIN
  yang sudah login ditolak. Role dan status tetap divalidasi di backend;
  `ADMIN` tidak dapat mengubah data operasional dan tidak dapat mengunci akun
  admin yang sedang dipakai.

  Jika semua administrator kehilangan akses, IT dapat menjalankan recovery
  terkontrol `pnpm --dir apps/api account:recover-admin` terhadap akun yang
  sudah ada. Command meminta username, password baru, dan konfirmasi langsung
  di terminal; recovery tidak membuat akun baru.

  Frontend menggunakan `/api` pada same-origin secara default. Untuk API di
  origin terpisah, isi `VITE_API_BASE_URL` di `apps/web/.env` dan tambahkan
  origin frontend ke `CRMS_ALLOWED_ORIGINS`.

  Endpoint reset database hanya tersedia pada environment development dengan
  `CRMS_ENABLE_DEV_RESET=true`, atau pada test runner. Endpoint tersebut tidak
  dimount pada production/staging.

  API production harus memiliki `CRMS_ALLOWED_ORIGINS` yang eksplisit dan
  `DATABASE_URL`; server menolak start jika salah satu konfigurasi wajib tidak ada.
  `GET /health` adalah readiness check sederhana
  yang menguji koneksi database dan mengembalikan `503` bila dependency tidak
  siap. Endpoint ini tidak membocorkan URL database atau detail koneksi.

  Setiap response API memiliki header `X-Request-Id` (request ID dari client
  yang aman boleh diteruskan, selain itu API membuat UUID baru). Error yang
  dihasilkan global handler mempertahankan field `error` untuk kompatibilitas
  UI dan menambahkan `code` stabil seperti `NOT_FOUND`, `VALIDATION_ERROR`,
  `CONFLICT`, atau `INTERNAL_ERROR`. Stack trace, path lokal, credential, dan
  payload tidak pernah dikirim ke client. Log API berupa satu JSON object per
  baris di stdout/stderr; logger hanya mencatat metadata workflow dan meredaksi
  token, credential, payload, path, serta field PII.

  Prosedur rekonsiliasi migration, backup terjadwal, dan restore drill ada di
  [docs/database-recovery.md](docs/database-recovery.md). Jangan menjalankan
  `schema.sql` pada database existing yang berisi data user.

  ## P0 quality gate

  Jalankan gate sebelum handoff atau deployment:

  ```text
  pnpm test:p0
  ```

  Gate ini menjalankan typecheck API/web, build frontend, unit test, integration
  test, migration pada database kosong disposable, serta backup/restore smoke
  test. Semua test database dipaksa menggunakan `apps/api/.env.test`; database
  dengan nama development/production ditolak oleh preflight. Integration test
  melakukan `prisma migrate deploy` dan canonical seed pada database test
  sebelum suite dijalankan.

  Gate memakai native TypeScript stripping Node.js, jadi gunakan Node.js
  `22.6+` (versi yang sama dipakai workflow CI).

  Runbook instalasi, deploy, backup/restore, rollback, dan pengecekan operasi
  tersedia di [docs/operations-runbook.md](docs/operations-runbook.md).

  ### MOM output

  Daily Activities menyediakan MOM per kegiatan dan MOM gabungan melalui
  endpoint yang sama dengan query `format`:

  - `xlsx` — template Excel yang sudah berjalan (default);
  - `docx` — Word dengan layout dan foto yang sama;
  - `pdf` — PDF dengan layout dan foto yang sama.

  Contoh: `GET /api/daily-activities/:id/mom?format=pdf` atau
  `GET /api/daily-activities/export/mom-workbook?format=docx`. File hasil
  download kemudian diunggah user secara manual ke SharePoint di luar CRMS.
