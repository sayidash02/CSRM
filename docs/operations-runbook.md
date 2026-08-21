# CRMS operations runbook

Runbook ini ditujukan untuk operator/developer yang menjalankan satu instance
CRMS untuk user internal. Solusi sengaja tetap sederhana: satu API, satu web
build, dan satu database MySQL; tidak diperlukan queue, Redis, atau monitoring
enterprise.

## 1. Instalasi workstation/server

1. Pasang Node.js `22.6+` dan pnpm.
2. Checkout repository pada direktori yang tidak dapat ditulis oleh user umum.
3. Jalankan `pnpm install --frozen-lockfile`.
4. Salin `apps/api/.env.example` ke `apps/api/.env`, lalu isi secret nyata.
   Jangan menyalin `.env` ke Git atau chat.
5. Untuk frontend dengan origin berbeda, isi `apps/web/.env` dan tambahkan
   origin yang sama ke `CRMS_ALLOWED_ORIGINS`.
6. Siapkan database kosong/clone, jalankan `prisma migrate deploy`, lalu seed
   canonical hanya jika environment memang baru. Buat admin pertama dengan
   command interaktif berikut; password tidak masuk ke `.env`:

   ```powershell
   pnpm --dir apps/api account:setup-admin
   ```

   Command tersebut berhenti jika admin sudah ada. Admin berikutnya dibuat dari
   menu **Kelola Akun**, bukan dengan menjalankan seed ulang.
7. Jalankan `pnpm test:p0` terhadap `.env.test`, bukan `.env`.

Minimal production configuration:

```text
NODE_ENV=production
CRMS_ALLOWED_ORIGINS=https://crms.example.internal
DATABASE_URL=<secret-managed MySQL URL>
PORT=3000
CRMS_LOG_LEVEL=info
```

`CRMS_ENABLE_DEV_RESET` harus tidak ada atau `false`. Local mock storage dan
reset database tidak tersedia di production.

## 2. Deployment checklist

Sebelum start:

- [ ] Backup terbaru dan checksum sudah dicatat.
- [ ] `pnpm test:p0` lulus pada database test terisolasi.
- [ ] Migration yang akan dijalankan sudah dicoba pada clone database.
- [ ] `pnpm --dir apps/api exec prisma migrate status` menunjukkan target yang
      dipahami operator.
- [ ] `CRMS_ALLOWED_ORIGINS`, dan `DATABASE_URL` masuk secret
      manager/ACL server, bukan source code.
- [ ] HTTPS terminates di reverse proxy; cookie session production memakai
      `Secure` dan `HttpOnly`.
- [ ] Port API hanya dapat diakses dari reverse proxy/workstation yang perlu.

Deploy bertahap:

```powershell
pnpm install --frozen-lockfile
pnpm --dir apps/api exec prisma migrate deploy
pnpm build:web
pnpm --dir apps/api dev   # gunakan process manager/service wrapper di server
```

Di server nyata, gunakan service/process manager yang melakukan restart hanya
setelah proses exit, menyimpan stdout/stderr terstruktur, dan tidak menampilkan
environment variable pada log. Setelah start, cek:

```powershell
Invoke-WebRequest http://127.0.0.1:3000/health
```

Expected response: HTTP `200` dan `{ "data": { "status": "ok" } }`.

## 3. Error dan request ID

Simpan nilai `X-Request-Id` dari browser ketika user melaporkan masalah. Nilai
ini dapat dicari pada log tanpa meminta user mengirim data bisnis. Contoh error
yang aman:

```json
{"error":"Data tidak ditemukan","code":"NOT_FOUND"}
```

HTTP `500` selalu memakai `INTERNAL_ERROR` dan pesan generik. Jangan mengubah
handler agar mengirim `err.stack`, `DATABASE_URL`, path filesystem, request
body, token, atau exception dari SDK ke browser. Bila butuh diagnosis, gunakan
event log dengan request ID dan metadata non-PII.

Log sukses dan gagal berbentuk JSON Lines, misalnya:

```json
{"timestamp":"2026-08-20T10:00:00.000Z","level":"info","event":"http_request_completed","requestId":"...","method":"POST","route":"/","status":201,"durationMs":18.4}
{"timestamp":"2026-08-20T10:00:01.000Z","level":"warn","event":"http_request_rejected","requestId":"...","method":"PUT","route":"/:id","status":404,"durationMs":2.1}
```

Logger tidak menerima payload request. Jangan menambahkan field baru berisi
nama, nomor telepon, email, alamat, nama file, atau isi workbook.

## 4. Backup terjadwal

Ikuti [database-recovery.md](database-recovery.md) untuk backup logical,
checksum, ACL, retensi, dan restore drill. Scheduler Windows minimal berjalan
sekali sehari dan menyimpan backup di luar repository. Operator mencatat:

- waktu mulai/selesai dan exit code;
- ukuran dan SHA-256 file;
- database source (tanpa menulis password ke log);
- lokasi salinan offline/terpisah.

Jika backup gagal, jangan menganggap deployment aman. Hentikan perubahan
schema/deployment sampai backup baru berhasil atau owner menyetujui risiko.

## 5. Restore dan rollback

Prisma migration tidak memiliki rollback otomatis. Ketika deploy gagal:

1. Hentikan API atau blokir write supaya data tidak berubah selama diagnosis.
2. Simpan log, request ID, dan status migration; jangan menghapus database
   source.
3. Jalankan restore drill ke database disposable dan cocokkan row count,
   constraint, lalu integration suite.
4. Untuk kehilangan/corruption yang sudah dikonfirmasi, restore backup terakhir
   yang tervalidasi ke database baru atau target yang disetujui owner. Catat
   titik waktu backup sehingga kehilangan perubahan setelah titik itu disadari.
5. Jika schema migration yang gagal masih bisa diperbaiki tanpa kehilangan data,
   buat corrective migration baru. Jangan mengedit migration yang sudah applied,
   menjalankan `DROP`, atau `TRUNCATE` sebagai “rollback”.
6. Arahkan `DATABASE_URL` ke target yang tervalidasi, jalankan `GET /health`,
   smoke test login dan satu workflow read/write, lalu buka akses user.

## 6. Operasional harian

- Cek `/health` sebelum meminta user mencoba ulang.
- Cari log berdasarkan `requestId`, lalu lihat `code`, route, status, dan
  duration; detail data bisnis tetap diperiksa di aplikasi/database dengan ACL.
- Audit perubahan data tersimpan di `audit_logs` dalam transaksi yang sama
  dengan update/soft-delete. Jika insert audit gagal, mutation ikut rollback.
- Jangan menjalankan reset dev, seed, atau script database terhadap production.
- Tidak ada register publik. IT membuat akun pertama dari terminal server; ADMIN yang sudah login
  membuat akun berikutnya melalui **Kelola Akun**. UI bukan boundary keamanan:
  API tetap mensyaratkan role `ADMIN` pada setiap endpoint account management.
- Jika semua admin tidak dapat login, gunakan recovery terkontrol dari server
  (bukan browser):

  ```text
  pnpm --dir apps/api account:recover-admin
  ```

  Command tersebut meminta username admin existing, password baru, dan
  konfirmasi eksplisit secara interaktif. Command hanya mengaktifkan/mengubah
  role/password akun yang sudah ada, menulis audit, dan menolak username yang
  tidak ditemukan. Pastikan ada change record IT dan backup tervalidasi sebelum
  menjalankannya.
- Setelah insiden, simpan ringkasan penyebab, backup yang dipakai, dan langkah
  pemulihan agar developer berikutnya dapat mengulanginya.
