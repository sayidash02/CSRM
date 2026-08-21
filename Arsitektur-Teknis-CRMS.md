# Arsitektur Teknis CRMS

## Status dan sumber kebenaran

**Status:** Revisi boundary aplikasi — 21 Agustus 2026
**Versi:** 3.0

**Catatan implementasi:** export Excel/MOM, rekap foto, DOCX, dan PDF sudah
tersedia. DOCX/PDF menggunakan model field, urutan section, warna, typography,
ukuran kolom, dan kontrak foto yang sama dengan template MOM Excel. Endpoint
tersebut sudah memiliki unit/integration coverage. Golden fixture dan runner
`apps/api/scripts/mom-golden-visual.ts` membandingkan render DOCX/PDF dengan
render Excel menggunakan toleransi anti-aliasing; visual render dengan
LibreOffice tetap menjadi bagian dari UAT workstation karena runtime server
belum menyediakan LibreOffice.

Dokumen ini dan [`schema.sql`](schema.sql) adalah sumber kebenaran aktif untuk
arsitektur dan database CRMS. Dokumen lama di bawah `apps/web/src/imports/`
atau `src/imports/` tidak menjadi sumber kebenaran.

CRMS adalah aplikasi internal untuk memodernisasi pencatatan Community
Relations. Database MySQL adalah source of truth. Excel, Word, dan PDF adalah
artefak keluaran yang dibuat dari data database dan diunduh oleh user.

SharePoint bukan bagian dari boundary teknis CRMS. Setelah file diunduh, user
melakukan upload ke SharePoint secara manual dari luar aplikasi. CRMS tidak
memakai Microsoft Graph, tidak menyimpan URL SharePoint, dan tidak memerlukan
credential SharePoint.

## 1. Tujuan sistem

Sistem menggantikan pengetikan berulang pada template manual dengan alur:

```text
User login
  → isi form kegiatan/modul
  → data terstruktur tersimpan di MySQL
  → foto kegiatan tersimpan di MySQL
  → user mengunduh MOM atau rekap
  → user, secara terpisah, mengunggah file hasil download ke SharePoint
```

Sistem tidak mengotomatisasi proses upload atau sinkronisasi ke SharePoint.

## 2. Actor dan hak akses

| Actor | Hak akses |
|---|---|
| `USER` | Login, membuat/mengubah/soft-delete/memulihkan data operasional, import historis, upload foto, dan download output. |
| `ADMIN` | Membuat, menonaktifkan, dan mereset akun; melihat status operasional. Tidak boleh mengubah atau menghapus data operasional. |
| Server perusahaan | Menjalankan frontend, API, dan koneksi MySQL. |

Tidak ada self-registration publik. Akun pertama diprovision melalui prosedur
deployment yang dikendalikan IT; akun berikutnya dikelola oleh `ADMIN`. Dengan
demikian, seseorang tidak dapat mendaftarkan dirinya sendiri sebagai `USER`
atau menaikkan role menjadi `ADMIN` dari halaman login.

## 3. Arsitektur level tinggi

```text
┌──────────────────────────────────────────────────────────────┐
│ Browser user                                                  │
│ Login · form 7 modul · import · photo gallery · download     │
└───────────────────────────────┬──────────────────────────────┘
                                │ HTTPS / same-origin
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ Node.js + Express API                                         │
│ session auth · role checks · validation · audit · exports    │
└───────────────┬───────────────────────┬──────────────────────┘
                │                       │
                ▼                       ▼
┌──────────────────────────┐  ┌───────────────────────────────┐
│ MySQL                     │  │ Export services                │
│ data + users + audit      │  │ ExcelJS · DOCX · PDF           │
│ daily_activity_photos    │  │ download-only                  │
└──────────────────────────┘  └───────────────────────────────┘

SharePoint: external manual handoff by user; no CRMS network/API dependency.
```

## 4. Tech stack

| Layer | Teknologi |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma 5.22 |
| Database | MySQL/InnoDB |
| Excel | ExcelJS; template and layout contract dipertahankan |
| Authentication | Username/password lokal, password hash, session cookie |
| Deployment | Server perusahaan; detail WSL/VM/PuTTY ditentukan pada tahap deployment |

## 5. Authentication dan authorization

### Login

1. User mengirim username/password melalui HTTPS.
2. Backend mengambil akun aktif berdasarkan username.
3. Password dibandingkan dengan hash menggunakan password-hashing library.
4. Backend membuat session acak dan mengirim cookie `httpOnly`, `Secure` pada
   production, dan `SameSite=Strict`.
5. Semua route data, import, photo, dan export memerlukan session valid.

Password, hash, dan session token tidak pernah dikirim kembali ke frontend.
Session disimpan server-side atau pada storage session yang dikendalikan server;
token auth tidak disimpan di `localStorage`.

### Account administration

Setelah login sebagai `ADMIN`, browser menampilkan menu **Kelola Akun**.
Halaman tersebut memakai `GET/POST/PATCH /api/admin/users` untuk membuat akun,
mengubah role/status, dan mengganti password. Password tidak pernah ditampilkan
kembali. Admin tidak dapat menonaktifkan atau menurunkan role akun yang sedang
dipakai karena itu dapat mengunci akses administrator terakhir.

### Provisioning dan recovery akun

- IT menjalankan `pnpm --dir apps/api account:setup-admin` dari terminal server
  setelah migration dan seed master data. Password dimasukkan interaktif dan
  tidak disimpan sebagai environment variable.
- Command setup hanya membuat admin jika belum ada admin. Jika admin sudah ada,
  command berhenti; akun berikutnya dikelola dari menu **Kelola Akun**.
- Admin login melalui form `/api/auth/login` yang sama seperti user biasa;
  role dari session menentukan menu **Kelola Akun**.
- Jika semua admin terkunci, IT memakai command server `account:recover-admin`
  dengan konfirmasi eksplisit untuk memulihkan akun yang sudah ada. Command ini
  bukan route HTTP, tidak membuat akun baru, mencatat audit, dan variable
  recovery harus langsung dihapus setelah selesai.
- Tidak ada password-reset atau account-registration endpoint publik. Permintaan
  tanpa session admin tidak dapat membuat atau mengubah akun.

### Role checks

- `USER` dapat melakukan mutation pada modul data sesuai workflow aplikasi.
- `ADMIN` hanya dapat melakukan account administration.
- Endpoint account administration harus menolak `USER` dengan `403`.
- Endpoint domain data harus menolak mutation dari `ADMIN`; admin hanya boleh
  membaca bila kebutuhan operasional memerlukannya.

## 6. Modul dan source of truth

Database menyimpan tujuh modul:

1. Daily Activities
2. Stakeholder Engagement
3. Top Issues
4. Proposals
5. CSR Projects
6. Grievance
7. LRP

Lookup `pics`, `categories`, dan `sub_categories` tetap berada di database.
Semua mutation domain memakai soft delete dan audit transaction.

LRP hanya memiliki `program` dan `year` selain metadata lifecycle (`is_deleted`,
`is_archived`, timestamps). LRP tidak memiliki field atau URL SharePoint.

## 7. Daily Activities dan foto

Satu Daily Activity dapat memiliki banyak foto. Foto disimpan pada tabel
`daily_activity_photos`, satu baris per foto, dengan minimal:

- `id`;
- `activity_id` foreign key;
- binary data (`MEDIUMBLOB` atau tipe MySQL setara untuk batas 5 MB);
- MIME type yang diizinkan (`image/jpeg`, `image/png`); format ini dipilih
  karena seluruh output Excel/MOM wajib dapat menanamkan foto secara konsisten;
- nama file asli yang sudah dibatasi panjangnya;
- ukuran byte;
- checksum SHA-256;
- urutan tampil;
- created/updated/deleted metadata.

Foto tidak disimpan sebagai URL, `file://`, path filesystem dari client, atau
Base64 di kolom activity.

Upload divalidasi di backend menggunakan ukuran, MIME, ekstensi, dan magic-byte
check yang sesuai. Foto dibaca kembali hanya melalui endpoint yang memerlukan
session valid.

## 8. Workflow output

### MOM per kegiatan

User memilih satu kegiatan lalu mengunduh satu MOM yang berisi field form dan
seluruh foto kegiatan. Output tersedia dalam:

- Excel;
- Word;
- PDF.

Format dan ukuran foto mengikuti template MOM yang telah disetujui. SharePoint
tidak terlibat dalam proses generate atau download.

### MOM gabungan

User dapat mengunduh satu file gabungan yang berisi rekap dan MOM setiap
kegiatan. Semua foto kegiatan tetap ditampilkan dengan ukuran/format yang sama
dengan MOM per kegiatan.

### Rekap Excel

Nama sheet, urutan kolom, style, filter, dan struktur workbook yang sudah
berjalan dipertahankan. Pada baris Daily Activities, foto ditanam langsung pada
kolom yang sebelumnya digunakan untuk link dokumen. Tidak ada hyperlink
SharePoint baru yang dibuat.

Full-size images dapat membuat workbook lebih besar; batas upload dan fixture
worst-case wajib diuji sebelum production.

## 9. Import historis

Import workbook lama tetap tersedia dengan alur:

```text
Upload workbook → parse/validate → preview → conflict/duplicate report
                 → explicit confirm → satu transaction → database
```

Import tidak boleh mengisi default diam-diam, membuat duplicate, atau commit
sebagian. Kolom lampiran lama diperlakukan sebagai legacy input; nilai URL lama
tidak mengaktifkan kembali integrasi SharePoint. Embedded images harus diuji
sebagai fixture terpisah dan, bila tidak dapat dipetakan lossless, dilaporkan
sebagai conflict sebelum commit.

## 10. API boundary

Boundary aktif terdiri dari:

- `/api/auth/*` untuk login, session, dan logout;
- `/api/admin/users` untuk account administration `ADMIN`-only;
- CRUD modul dan soft-delete/restore;
- `/api/daily-activities/:id/photos` untuk photo lifecycle;
- import preview/commit;
- export download;
- health, audit, dan operational endpoints.

Tidak ada route aktif untuk Graph, SharePoint sync, SharePoint upload, atau
SharePoint URL validation.

## 11. Data integrity dan recovery

- Semua database mutation penting memakai transaction.
- FK photo → activity menggunakan lifecycle yang eksplisit dan tidak boleh
  meninggalkan orphan binary.
- Backup MySQL mencakup data terstruktur dan binary photo.
- Restore drill wajib membandingkan row count, constraint, dan photo count.
- Migration terhadap database existing hanya melalui Prisma migration setelah
  backup dan clone rehearsal.

## 12. Security baseline

- HTTPS pada deployment perusahaan.
- CORS hanya origin internal yang disetujui.
- Password hash; tidak ada plaintext secret.
- Session cookie `httpOnly`, `Secure`, dan `SameSite`.
- Rate limit login.
- Role authorization di backend, bukan hanya di UI.
- File upload dibatasi tipe, ukuran, magic bytes, dan jumlah.
- Nama file tidak boleh menjadi path server.
- Error publik tidak mengandung stack, path, secret, atau binary payload.
- Structured log tidak mencatat password, token, foto, atau PII mentah.

## 13. Deployment dan operasional

Deployment ke WSL/VM dan penggunaan PuTTY ditunda sampai fitur dan gate test
selesai. Ketika tahap itu dimulai, dokumentasi harus mencakup:

- versi Node/pnpm;
- environment variable dan secret ownership;
- migration deploy;
- service restart dan health check;
- backup/restore termasuk binary photo;
- rollback/incident procedure;
- owner server setelah masa magang.

## 14. Verification gate

Sebelum user memakai sistem:

1. API dan frontend typecheck lulus.
2. Frontend production build lulus.
3. Unit dan integration test memakai `.env.test` terisolasi.
4. Migration-on-empty dan migration-on-clone lulus.
5. Backup/restore mencakup binary photo.
6. Test role `USER`/`ADMIN` dan unauthorized request lulus.
7. Golden fixture memverifikasi field, urutan section, jumlah/source foto, dan
   contract artefak Excel/DOCX/PDF. Jalankan `pnpm test:mom-golden` pada
   workstation/server dengan LibreOffice untuk visual comparison dan inspeksi
   diff PNG.
8. User melakukan smoke test login, CRUD, upload foto, import, MOM, dan rekap.

## 15. Keputusan yang tidak boleh diubah diam-diam

- Jangan menambahkan kembali integrasi SharePoint.
- Jangan mengubah layout Excel rekap tanpa persetujuan user.
- Jangan menghapus foto atau data historis tanpa backup, migration plan, dan
  bukti restore.
- Jangan menjadikan akun `ADMIN` sebagai bypass untuk mengubah data operasional.
