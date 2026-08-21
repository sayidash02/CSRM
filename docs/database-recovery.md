# Database migration, backup, and recovery runbook

Dokumen ini adalah prosedur operasional untuk database CRMS. Jalankan semua
perintah terhadap database clone terlebih dahulu. Jangan menjalankan
`schema.sql` pada database yang sudah berisi data user; file itu hanya untuk
database baru. Database yang sudah ada diubah melalui Prisma migration.

## 1. Snapshot dan preflight

```powershell
pnpm --dir apps/api db:snapshot
pnpm --dir apps/api db:check-integrity
```

`db:snapshot` mengambil `SHOW CREATE TABLE` dari database pada `DATABASE_URL`
dan menulis snapshot ke `apps/api/prisma/snapshots/actual-schema.sql` (atau ke
`DDL_SNAPSHOT_PATH`). Snapshot bersifat bukti struktur aktual, bukan migration.

`db:check-integrity` read-only dan harus menghasilkan nol untuk semua status
invalid serta orphan foreign key sebelum migration integrity dijalankan.
Constraint `CHECK` disimpan di migration SQL dan `schema.sql`; Prisma model
tidak mengekspresikan constraint ini secara portable, jadi jangan menghapus
migration integrity hanya karena `prisma migrate diff` tidak menampilkannya.

## 2. Rekonsiliasi database existing

1. Ambil backup ke lokasi di luar repository, lalu simpan checksum dan waktu
   backup.
2. Jalankan clone dan validasi row count:

   ```powershell
   $env:CLONE_DATABASE_NAME = 'crms_clone_stage2'
   pnpm --dir apps/api db:clone
   ```

   Untuk mengganti clone disposable yang sudah ada, set
   `$env:ALLOW_CLONE_REPLACE = 'true'` terlebih dahulu. Nama database clone
   dibatasi ke pola `crms_clone_*` atau `crms_restore_*`.

3. Pada clone, tandai baseline dan dua migration historis sebagai sudah ada
   **hanya setelah snapshot membuktikan kolomnya memang sudah ada**:

   ```powershell
   $u = [UriBuilder]$env:DATABASE_URL
   $u.Path = '/crms_clone_stage2'
   $env:DATABASE_URL = $u.Uri.AbsoluteUri
   pnpm --dir apps/api exec prisma migrate resolve --applied 00000000000000_baseline
   pnpm --dir apps/api exec prisma migrate resolve --applied 20260818_add_daily_activity_text_fields
   pnpm --dir apps/api exec prisma migrate resolve --applied 20260819_add_daily_activity_mom_fields
   pnpm --dir apps/api exec prisma migrate deploy
   pnpm --dir apps/api db:check-integrity
   ```

   `migrate resolve` tidak mengubah row; perintah ini hanya menyelaraskan
   riwayat migration dengan database yang sebelumnya dibuat di luar Prisma
   Migrate. Jangan menandai migration sebagai applied jika kolom/constraint
   belum diverifikasi.

4. Untuk database baru, cukup jalankan `prisma migrate deploy`, kemudian
   `pnpm db:seed`. Jangan menjalankan migration baseline pada database existing
   yang belum di-backup.

5. Setelah clone lulus row-count, constraint, integration suite, dan smoke test
   workstation, ulangi prosedur yang sama pada target deployment. Simpan
   output `prisma migrate status` sebagai bukti.

Migration tidak memiliki rollback otomatis. Jika deployment gagal, hentikan
aplikasi yang menulis data, pertahankan database untuk forensik, lalu pilih
restore backup tervalidasi (setelah menyetujui potensi kehilangan perubahan
setelah waktu backup) atau buat corrective migration non-destruktif. Jangan
menjalankan `DROP`, `TRUNCATE`, atau mengedit file migration yang sudah applied
sebagai cara rollback.

## 3. Canonical seed

Hanya `apps/api/prisma/seed.ts` yang digunakan. Seed dijalankan dengan:

```powershell
pnpm db:seed
```

Seed memakai transaction dan upsert untuk PIC, category, serta sub-category,
sehingga aman dijalankan ulang dan tidak menggandakan master data. Jangan
menambahkan seed kedua di `apps/api/src`.

## 4. Backup terjadwal

Backup logical dibuat oleh:

```powershell
$env:BACKUP_OUTPUT_PATH = 'D:\CRMS-Backups\crms-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.sql'
pnpm --dir apps/api db:backup
```

Konfigurasikan Windows Task Scheduler pada mesin server untuk menjalankan
perintah tersebut minimal sekali sehari setelah jam kerja. Direktori backup
harus berada di luar repository, memiliki ACL hanya untuk service account dan
administrator, dienkripsi saat tersimpan, serta memiliki retensi (misalnya 30
hari) dan satu salinan offline/terpisah. Jangan memasukkan file `.sql` ke Git.

Backup berisi DDL dan seluruh data; perlakukan sebagai data sensitif. Setelah
backup selesai, catat ukuran file, checksum SHA-256, dan status exit code.
Script menulis ke file `.part-*` lalu melakukan rename atomik, jadi scheduler
hanya boleh menganggap file berakhiran `.sql` sebagai backup yang siap dipakai.

## 5. Restore drill

Restore drill selalu menggunakan database kosong disposable:

```powershell
$env:BACKUP_INPUT_PATH = 'D:\CRMS-Backups\crms-20260820-230000.sql'
$env:RESTORE_DATABASE_NAME = 'crms_restore_20260820'
$env:ALLOW_RESTORE_REPLACE = 'true'
pnpm --dir apps/api db:restore-drill
```

Script membuat database baru, menjalankan backup melalui Prisma, lalu
membandingkan row count setiap tabel dan inventory constraint dengan source.
Drill gagal bila salah satu berbeda. Setelah itu jalankan integration suite
dengan `DATABASE_URL` diarahkan ke database restore; suite boleh memodifikasi
database disposable tersebut.

```powershell
pnpm --dir apps/api test
```

Catat waktu restore, hasil verifikasi, dan recovery time. Hapus database
disposable setelah bukti disimpan; jangan pernah mengarahkan drill ke database
production. Untuk cleanup yang eksplisit dan aman:

```powershell
$env:DISPOSABLE_DATABASE_NAME = 'crms_restore_20260820'
$env:ALLOW_DISPOSABLE_DROP = 'true'
pnpm --dir apps/api db:drop-disposable
```

## 6. Checklist sebelum production

- [ ] Snapshot DDL aktual tersimpan dan dibandingkan dengan `schema.prisma`.
- [ ] Backup terbaru berhasil, checksum dicatat, dan file dapat dibaca.
- [ ] Integrity preflight menghasilkan nol violation.
- [ ] Clone migration: row count dan constraint tidak berubah.
- [ ] Restore ke database kosong: row count dan constraint cocok.
- [ ] Canonical seed berjalan dua kali tanpa duplicate.
- [ ] Integration suite dan smoke test workstation lulus.
- [ ] `prisma migrate status` menyatakan database up to date.
- [ ] Scheduler, ACL, encryption, retention, dan prosedur rollback diverifikasi.
- [ ] Ada operator yang mengetahui lokasi backup dan langkah restore.

## 7. P0 automated gate

Sebelum handoff, jalankan dari root repository:

```powershell
pnpm test:p0
```

Gate ini menjalankan, berurutan:

1. typecheck API;
2. typecheck web;
3. frontend production build;
4. unit tests;
5. integration tests setelah `prisma migrate deploy` dan canonical seed pada
   `.env.test`;
6. migration-on-empty pada database disposable `crms_clone_migration_*`;
7. backup/restore smoke pada database disposable `crms_restore_*`.

Perintah test memakai `dotenv -e .env.test -o`, sehingga environment shell
tidak dapat mengganti URL test secara diam-diam. Preflight juga menolak URL
yang tidak memakai pola `crms_test_*`/`crms_ci_*`, atau yang mengandung marker
`dev`, `production`, `live`, atau `staging`. Database disposable dibuat
dan dihapus otomatis; jika gate berhenti karena koneksi MySQL atau permission,
anggap gate gagal dan jangan lanjut ke production. Jangan mengganti `.env.test`
dengan URL development/production untuk membuat gate “lulus”.
