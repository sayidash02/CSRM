# CRMS Project — Agent Rules

Proyek ini adalah software production untuk 1 pegawai CRS di sebuah
perusahaan (bukan demo/tugas kuliah). Rules ini berlaku sepanjang
project, dimuat otomatis di setiap sesi — tidak perlu ditempel ulang.

## Sumber Kebenaran
- `Arsitektur-Teknis-CRMS.md` dan `schema.sql` di ROOT project adalah
  SUMBER KEBENARAN tertinggi.
- `src/imports/Arsitektur-Teknis-CRMS.md` dan
  `src/imports/pasted_text/crms-schema.txt` BUKAN sumber kebenaran —
  kemungkinan versi lama yang dipakai saat generate UI di Figma Make.
  Field/enum di UI yang tidak cocok dengan schema.sql root HARUS
  diperbaiki mengikuti schema.sql, bukan sebaliknya.

## Aturan Utama
0. JANGAN redesign komponen UI yang sudah ada tanpa alasan kuat. Kalau
   form/tabel sudah ada tapi datanya dummy, ganti SUMBER datanya jadi
   API call asli — bukan menulis ulang komponennya. Screen baru ikuti
   pola komponen di `src/app/components/ui/` dan
   `guidelines/Guidelines.md`.
1. Keputusan yang tidak dijawab di dokumen (kredensial SharePoint &
   lokasi server — Bab 3.2, masih pending jawaban IT) TIDAK boleh
   diasumsikan sendiri. Tandai jelas sebagai placeholder yang mudah
   diganti nanti.
2. Kerjakan PER FASE sesuai Bab 17 di Arsitektur-Teknis-CRMS.md. Jangan
   mulai fase berikutnya tanpa konfirmasi eksplisit dari user.
3. Terapkan penuh Bab 12 (Keamanan) di setiap kode yang relevan:
   kredensial di environment variable, parameterized query/ORM,
   validasi input backend termasuk keberadaan foreign key, validasi
   file upload (ekstensi, MIME type, maks 5MB).
4. Terapkan Bab 13 (Error Handling & Logging): try-catch dengan pesan
   jelas ke user, logging terstruktur, toast notification di aksi
   penting.
5. Test ditulis SEIRING kode ditulis (idealnya test-first), bukan
   ditumpuk di akhir. 
   - Unit test untuk business logic murni.
   - Integration test WAJIB menggunakan test database terpisah (`.env.test`). Jangan pernah menjalankan tes integratif yang bersifat destruktif terhadap database lokal development/production. Gunakan skrip seperti `dotenv -e .env.test -- jest --runInBand`.
6. Kalau butuh detail API library yang tidak yakin (Prisma/Knex,
   exceljs, Microsoft Graph SDK, MSAL), cari dokumentasi terkini dulu —
   jangan menebak signature function dari ingatan.
7. Di akhir tiap sesi kerja: berikan ringkasan apa yang selesai, test
   apa yang dijalankan & hasilnya, dan bagian UI mana (kalau ada) yang
   terpaksa diubah strukturnya.

## Arsitektur Kode (SOLID) — proporsional, jangan over-engineer
Project ini kecil (1 developer, 1 user). Terapkan SOLID di tempat yang
benar-benar butuh, terutama:
- Single Responsibility: route handler urus HTTP, service urus business
  logic, repository urus akses database.
- Open-Closed: pola CRUD 7 modul konsisten — modul baru = file baru,
  bukan mengubah modul yang sudah jalan. Jangan paksakan 1 base class
  generic kalau bikin kode lebih susah dibaca.
- Liskov Substitution: turunan Repository/Service konsisten kontraknya
  (mis. delete() = soft-delete di semua modul, tanpa kecuali).
- Interface Segregation: pisah IFileUploader dari ISyncExporter untuk
  SharePoint — jangan satu interface besar.
- Dependency Inversion (paling penting di project ini):
  DocumentUploadService dan SyncService bergantung ke ABSTRAKSI client
  SharePoint, bukan langsung ke SDK Microsoft Graph — karena kredensial
  masih pending IT (Bab 3.2), dan test wajib mem-mock Graph API.

## Larangan
- Jangan pernah menyentuh folder/file SharePoint production sebelum
  fase testing selesai dikonfirmasi user.
- Jangan hardcode credential/secret di kode.
- Jangan hard-delete data — semua modul pakai soft-delete (is_deleted).

## Technical Gotchas & Workflows
- **Prisma & BigInt**: Database menggunakan `BigInt` (mis. untuk ID). Pastikan selalu menggunakan *global patch* (`(BigInt.prototype as any).toJSON = function() { return this.toString(); }`) di awal Express app. JANGAN melakukan konversi `.toString()` manual di dalam setiap route/controller jika global patch sudah diimplementasikan.
- **Prisma Error Interception**: Tangkap error Prisma (seperti `PrismaClientValidationError` atau kode `P2002`) dalam blok `catch` controller dan ubah menjadi response HTTP `400 Bad Request` atau `409 Conflict`. Jangan biarkan error validasi Prisma lolos sebagai `500 Internal Server Error`.
- **PNPM di Windows**: Jangan batasi `supportedArchitectures` di `pnpm-workspace.yaml` hanya pada `linux`. Karena *host* pengembangan menggunakan Windows, pembatasan ini akan menyebabkan *binary* `esbuild` dan `rollup` Vite gagal diunduh, membuat build frontend gagal.
- **Vite & React di Monorepo PNPM**: Selalu pastikan `react` dan `react-dom` terinstal sebagai `dependencies` eksplisit di `package.json` frontend (mis. `apps/web/package.json`), bukan hanya `peerDependencies`. Jika tidak, Vite module resolution bisa menginisialisasi salinan React ganda yang memicu "Invalid hook call" (Uncaught TypeError: Cannot read properties of null (reading 'useState')).
- **Multer Error Handling**: Jangan gunakan `upload.single('file')` secara langsung sebagai parameter middleware route Express jika menetapkan batasan (mis. `fileSize` maks 5MB). Jika file melebihi batas, Multer akan melempar `MulterError` yang mem-*bypass* blok `try-catch` pada controller dan menyebabkan respon *HTML 500 unhandled exception*. Selalu bungkus eksekusi Multer di dalam *callback handler* tersendiri agar dapat mengembalikan respons JSON `400 Bad Request`.
- **Verification Before Completion**: Jangan pernah mengklaim suatu task/fase "selesai" sebelum menjalankan perintah verifikasi riil (seperti `npm run build`, `tsc --noEmit`, atau test runner) dan mendapatkan **Exit code 0**. Buktikan dengan output aslinya.
- **Code Review**: Selesaikan semua poin bermasalah (*Important issues*) dari Code Reviewer sebelum beralih ke fase/fitur selanjutnya.
