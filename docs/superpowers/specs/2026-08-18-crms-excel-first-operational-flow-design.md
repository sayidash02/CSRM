# Design Spec: CRMS Excel-First Operational Flow

**Status:** Disetujui untuk implementasi bertahap — keputusan Gate 0 yang sudah dijawab dicatat di bawah; auth, owner operasional, dan scope export masih terbuka
**Tanggal:** 2026-08-18

## 1. Objective

CRMS digunakan oleh satu pengguna di departemen CSR untuk memudahkan pengisian data yang selama ini dilakukan langsung di Excel, menyediakan statistik tahunan untuk presentasi, dan menghasilkan kembali file Excel perusahaan dalam format yang dapat langsung dipakai.

Database CRMS menjadi penyimpanan kerja dan sumber statistik selama aplikasi digunakan. File Excel hasil export menjadi artefak kerja departemen yang diunggah user secara manual ke SharePoint.

### User story utama

1. Pada penggunaan pertama, user mengimpor file Excel perusahaan yang sedang dipakai (`CSR(Isi).xlsx`).
2. Sistem menampilkan pratinjau jumlah data per modul dan meminta konfirmasi sebelum menyimpan.
3. Setelah dikonfirmasi, data dari seluruh sheet data yang didukung masuk ke database dalam satu transaksi.
4. Sistem menyediakan tujuh modul: Daily Activities, Stakeholder Engagement, Top Issues, Proposals, CSR Projects, Grievance, dan LRP.
5. User memasukkan data baru atau memperbarui data melalui CRMS tanpa mengimpor ulang Excel pada penggunaan normal.
6. User dapat melihat statistik tahunan dari database.
7. Saat export, sistem membuat salinan workbook berformat perusahaan, memasukkan seluruh data database, menambahkan sheet LRP, dan mengunduh file `.xlsx`.
8. User mengunggah file hasil export secara manual ke SharePoint.

Dokumen arsitektur lama yang mengasumsikan upload dokumen, path/API SharePoint, atau sinkronisasi otomatis tidak berlaku untuk alur ini dan harus dianggap superseded setelah spesifikasi ini disetujui.

## 2. Assumptions and Decisions

1. Hanya satu user CSR yang menggunakan aplikasi pada fase ini.
2. Sistem tidak mengunggah file atau dokumen ke SharePoint. Semua field lampiran menyimpan URL SharePoint yang ditempel manual oleh user.
3. Import ulang bukan bagian dari alur normal. Import hanya untuk setup awal atau recovery.
4. `CSR(Isi).xlsx` adalah referensi format export, bukan template produksi yang boleh disalin bersama data historis dan link lama.
5. Diperlukan template `.xlsx` yang sudah disanitasi: struktur, style, merged cells, formula, sheet helper, dan data validation dipertahankan; data operasional lama dan link historis dihapus.
6. LRP belum memiliki sheet pada workbook sumber. Sheet LRP baru menggunakan field CRMS saat ini: `No`, `Program`, dan `SharePoint Link`.
7. Export tidak menimpa file SharePoint secara otomatis. File hasil export di-download dan diunggah manual oleh user.
8. Daily Activities menyimpan `Keterangan` dan `Hasil` sebagai dua field database/form terpisah. `description_result` dipertahankan sementara sebagai field kompatibilitas untuk client lama dan akan diturunkan dari dua field baru saat penulisan.
9. Statistik dashboard mendukung filter satu tahun tertentu atau semua tahun. Nilai `All`/`Semua`/kosong berarti tanpa filter tahun.

## 3. Workbook Contract

### Sheet yang diimpor dari `CSR(Isi).xlsx`

| Sheet | Perlakuan |
|---|---|
| Daily Activities 2026 | Import data, pertahankan kolom `Keterangan` dan `Hasil` secara lossless |
| Stakeholder Engagement 2026 | Import data dan format date/venue sesuai struktur sumber |
| Top Issue | Import data |
| Proposal 2026 | Import seluruh field, termasuk link `PROPOSAL` dan `ASSESSMENT` |
| CSR Project 2026 | Import seluruh field, termasuk link dokumentasi |
| Grievance 2026 | Import header bertingkat dan seluruh field data |
| Raw | Sheet helper; tidak diimpor sebagai data operasional baru |
| Grievance (hidden) | Sheet helper; tidak diimpor sebagai data operasional baru |
| Master (jangan dihapus) | Dipertahankan sebagai sheet reference; nilainya tidak boleh hilang saat export |

### Sheet LRP

Export menambahkan sheet baru `LRP` dengan minimal kolom:

1. `No`
2. `Program`
3. `SharePoint Link`

Style header dan lebar kolom LRP harus mengikuti pola workbook perusahaan, lalu ditetapkan dalam template version pertama.

### Aturan format

- Nama sheet, urutan sheet, merged cells, hidden state, row/column dimensions, freeze panes, filter, data validation, gambar, dan style template dipertahankan.
- Nilai tanggal ditulis sebagai nilai tanggal Excel dengan number format template, bukan string ISO.
- Nilai biaya ditulis sebagai angka dengan number format mata uang template, bukan string berawalan `Rp`.
- Link SharePoint ditulis sebagai URL yang dapat diklik dan tetap dapat dibaca sebagai nilai sel.
- Nomor baris `No` dibuat deterministik berdasarkan urutan export dan tidak dipakai sebagai primary key database.
- Export selalu menghasilkan file baru; file sumber dan backup sebelumnya tidak dihapus atau ditimpa oleh aplikasi.

## 4. Data Lifecycle

### Initial import

- Upload dibatasi ke `.xlsx` dengan batas 100 MB sesuai kebutuhan import Excel.
- Endpoint preview hanya membaca file dan mengembalikan ringkasan; tidak boleh mengubah database.
- File preview diidentifikasi dengan opaque server-side token, bukan path file mentah yang dipercaya dari client.
- Confirm memvalidasi token, hash/file identity, dan mengimpor seluruh modul dalam satu transaksi database.
- Import batch dicatat agar file yang sama tidak dapat dikonfirmasi ulang tanpa keputusan eksplisit.
- Semua URL lampiran yang ada pada workbook dipertahankan.
- Jika satu baris gagal divalidasi, sistem menampilkan error per baris dan tidak melakukan partial commit.
- LRP dibuat kosong pada import pertama karena tidak ada sheet sumber.

### Normal operation

- CRUD tujuh modul bekerja pada database.
- User tidak perlu mengimpor ulang file Excel setelah setiap export.
- Data yang dihapus secara aplikasi tetap recoverable melalui soft delete.
- Semua API yang mengubah data melakukan validasi server-side dan menggunakan transaksi bila satu operasi menyentuh beberapa tabel.

### Recovery import

- Recovery dari file Excel terakhir harus berjalan sebagai preview/reconciliation, bukan append buta.
- Sistem membandingkan baris dengan data yang sudah ada menggunakan identity/batch mapping yang stabil.
- Duplikasi, perubahan konflik, dan baris baru harus ditampilkan sebelum confirm.
- Recovery tidak boleh diam-diam mengganti data database atau membuat duplikasi.

## 5. Export Flow

1. User memilih tahun atau rentang yang didukung oleh aplikasi.
2. Backend mengambil seluruh data yang relevan dari database, bukan data yang sedang tampil pada halaman/pagination.
3. Backend membuka sanitized workbook template.
4. Backend membersihkan area data yang ditentukan per sheet tanpa merusak style/layout template.
5. Backend menulis data tujuh modul dengan mapping yang terdokumentasi.
6. Backend menjalankan validasi workbook hasil: sheet wajib, header, tipe tanggal/angka, jumlah baris, dan URL lampiran.
7. Backend mengembalikan file `.xlsx` dengan nama versi/tanggal yang jelas.
8. Sistem mencatat export log (waktu, user, tahun, jumlah baris, template version, status) tanpa mencatat password, token, atau isi sensitif yang tidak diperlukan.
9. Endpoint export workbook mengisi sanitized template dan hanya mengembalikan download. Endpoint sync otomatis lama dinonaktifkan (`410 Gone`).

Implementasi saat ini menyediakan `GET /api/export/workbook?year=...`; `All`/`Semua`/kosong berarti seluruh tahun. Kebijakan default export (tahun aktif atau seluruh tahun) masih harus disahkan owner sebelum production.

## 6. Statistics

- Statistik tahunan membaca database, bukan mem-parsing file Excel setiap kali dashboard dibuka.
- Dashboard menerima filter satu tahun numerik (1900–2100) atau semua tahun (`All`/`Semua`/kosong), dan mengembalikan filter efektif pada response.
- Filter tahun harus konsisten antara daftar modul, statistik, dan export setelah scope export diputuskan.
- Angka statistik harus dapat direkonsiliasi dengan jumlah baris aktif pada workbook export untuk tahun yang sama.
- Definisi metrik dan aturan soft-delete harus terdokumentasi di modul statistik.

## 7. Tech Stack and Commands

Project tetap memakai monorepo PNPM:

- Frontend: React/Vite di `apps/web`.
- Backend: Express/TypeScript/Prisma di `apps/api`.
- Database: engine yang dikonfigurasi melalui `DATABASE_URL`; test memakai `.env.test` terpisah.
- Excel processing: `exceljs` di backend.

Perintah verifikasi:

```powershell
pnpm.cmd --dir apps/web build
pnpm.cmd --dir apps/api exec tsc --noEmit
pnpm.cmd --dir apps/api test
pnpm.cmd --dir apps/api dev
pnpm.cmd --dir apps/web dev --host 127.0.0.1
```

## 8. Project Structure

- `apps/api/src/services/ExcelImportService.ts` — parsing, mapping, validation, import batch.
- `apps/api/src/services/SyncService.ts` — refactor menjadi template-based workbook export; tidak lagi melakukan upload SharePoint.
- `apps/api/src/templates/` — sanitized workbook template dan metadata template version.
- `apps/api/src/controllers/` dan `apps/api/src/routes/` — HTTP boundary, validasi request, response/error mapping.
- `apps/api/tests/unit/` — mapping, date/number parsing, deduplication, workbook validation.
- `apps/api/tests/integration/` — import/export round trip menggunakan `.env.test`.
- `apps/web/src/features/import/` — initial/recovery import wizard.
- `apps/web/src/features/*/` — form CRUD tujuh modul dan statistik terkait.
- `docs/superpowers/specs/` — spesifikasi dan keputusan yang disetujui.

## 9. Code Style Example

Service export menerima data terverifikasi dan mengembalikan buffer; route tidak berisi mapping bisnis:

```ts
type WorkbookExportInput = {
  year: number;
  templateVersion: string;
};

async function exportWorkbook(input: WorkbookExportInput): Promise<Buffer> {
  const rows = await repository.findForExport(input.year);
  const workbook = await templateLoader.open(input.templateVersion);
  populateWorkbook(workbook, rows);
  validateWorkbook(workbook, rows);
  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}
```

Naming memakai `camelCase` untuk TypeScript, mapping kolom eksplisit per modul, dan tidak memakai `any` untuk kontrak import/export baru.

## 10. Testing Strategy

### Unit tests

- Deteksi sheet dan header bertingkat.
- Mapping seluruh kolom setiap modul.
- Preservasi terpisah `Keterangan`/`Hasil`.
- Preservasi link Proposal/Assessment dan seluruh attachment URL.
- Parsing tanggal Excel dan angka Rupiah.
- Identity/deduplication import.
- Validasi sheet, header, row count, dan template version.

### Integration tests

- Menggunakan database terpisah dari `.env.test`.
- Import `CSR(Isi).xlsx` fixture yang disanitasi, confirm, lalu memeriksa jumlah dan isi tujuh modul.
- Export dari data hasil import + data baru, membuka kembali buffer `.xlsx`, dan memeriksa sheet/header/tipe cell/URL/row count.
- Memastikan export kedua tidak menggandakan data.
- Recovery import menampilkan konflik dan tidak melakukan partial commit.
- Tidak pernah menjalankan test destruktif terhadap database development/production.

### Runtime verification

- Frontend build exit code 0.
- Backend typecheck exit code 0.
- Seluruh test suite lulus.
- Smoke test API dan browser terhadap alur import → input → export.
- Log export/import memiliki request ID dan tidak membocorkan secret atau token.

## 11. Boundaries

### Always do

- Gunakan parameterized query/Prisma dan validasi server-side.
- Gunakan transactional import dan soft delete.
- Simpan secret hanya di environment variable.
- Backup database dan uji restore sebelum handoff.
- Pertahankan workbook lama; hasil export selalu file baru.
- Tulis test bersamaan dengan perubahan mapping/import/export.

### Ask first

- Perubahan schema untuk memisahkan `Keterangan` dan `Hasil`.
- Penambahan atau perubahan field sheet LRP.
- Perubahan format template perusahaan.
- Perubahan autentikasi, deployment, database production, dan backup retention.
- Penambahan dependency atau integrasi eksternal.

### Never do

- Mengunggah file SharePoint dari CRMS.
- Mengakses atau menimpa file SharePoint secara otomatis.
- Menggunakan workbook berisi data historis sebagai template mentah.
- Membuat duplicate rows secara diam-diam saat import/recovery.
- Menyimpan file ID sebagai path filesystem yang dipercaya client.
- Menghapus data secara hard delete atau menghapus backup lama saat export.

## 12. Success Criteria

1. `CSR(Isi).xlsx` dapat dipreview dan dikonfirmasi tanpa partial database commit.
2. Semua data yang didukung pada enam sheet sumber masuk ke database tanpa kehilangan attachment URL.
3. Import Proposal mempertahankan link `PROPOSAL` dan `ASSESSMENT`.
4. `Keterangan` dan `Hasil` dapat diekspor kembali tanpa kehilangan informasi.
5. User dapat menambah data baru di tujuh modul tanpa import ulang Excel.
6. Export menghasilkan workbook yang mempertahankan struktur/style perusahaan dan menambahkan sheet LRP.
7. Export kedua dari database yang sama tidak menggandakan baris.
8. Data hasil export dapat diimpor sebagai recovery dengan laporan konflik/duplikasi sebelum commit.
9. Statistik tahunan dapat direkonsiliasi dengan data export.
10. Semua test import/export berjalan terhadap test database terisolasi dan lulus.

## 13. Open Questions

1. **Terjawab:** `Keterangan` dan `Hasil` adalah dua field database/form terpisah; `description_result` hanya kompatibilitas sementara.
2. Apakah export selalu untuk satu tahun aktif, atau harus mencakup seluruh tahun yang tersimpan? (Belum dijawab; keputusan statistik all/year tidak otomatis menetapkan scope export.)
3. Siapa owner server, backup, dan recovery setelah masa magang selesai?
4. Apakah production menggunakan satu akun lokal yang diprovision sebelumnya tanpa Register, atau ada kebijakan akun lain dari perusahaan?
5. Berikan/konfirmasi sanitized template yang boleh disimpan di repository; file `CSR(Isi).xlsx` saat ini berisi data dan link historis sehingga tidak boleh disimpan sebagai template produksi.
