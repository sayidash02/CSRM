# Dokumen Arsitektur Teknis
## Community Relations Management System (CRMS)

**Status:** Draft — 16 dari 17 item klarifikasi sudah diputuskan, 1 pertanyaan tersisa untuk IT
**Versi:** 2.2 (skema tiap modul dicocokkan langsung ke kolom Excel asli yang dipakai pegawai; klarifikasi struktur LRP, PIC self-service, dan penggabungan Keterangan/Hasil)
**Tanggal:** Juli 2026

---

## 1. Ringkasan Eksekutif

CRMS adalah aplikasi web internal yang menggantikan proses input manual ke file Excel besar dengan form terstruktur. Skema database sudah dicocokkan langsung ke file Excel yang benar-benar dipakai pegawai sehari-hari (`CRS_Dept_Daily_Activities_2026.xlsx`) — 6 modul (Daily Activities, Stakeholder Engagement, Top Issue, Proposal, CSR Project, Grievance) sudah punya sheet berjalan di file itu, sementara modul ke-7 (**LRP**) memang belum pernah punya sheet sama sekali dan strukturnya didesain baru berdasarkan keterangan langsung dari pegawai (lihat Bab 3.1 #8).

**Perubahan arsitektur penting (sejak v1.1):** setelah berdiskusi dengan mentor, source of truth sistem ini adalah **database** (bebas engine, misal MySQL), bukan Excel/SharePoint langsung. Excel sekarang berperan sebagai **snapshot/output** yang di-generate ulang dari database, bukan file yang diedit baris per baris via API. SharePoint tetap dipakai untuk menyimpan dokumen pendukung dan file Excel master, tapi akses ke SharePoint dibatasi ketat: **tidak ada browsing/listing folder**, aplikasi hanya mengirim file langsung ke path yang sudah ditentukan.

Alur besarnya:

```
Pegawai isi form → data tersimpan di Database
                  → dokumen lampiran diupload langsung ke path SharePoint yang dihitung otomatis
                  → (manual, kapan saja) tombol "Export & Sync" →
                    generate ulang Excel dari SELURUH data DB → overwrite file master di SharePoint
```

Karena hanya **1 pegawai** yang menggunakan sistem ini, arsitektur bisa jauh lebih sederhana dibanding sistem multi-user: tidak perlu role/permission matrix, dan penanganan race condition cukup di level "cegah submit/klik ganda dari user yang sama".

---

## 2. Actor & Lingkup Sistem

| Actor | Deskripsi |
|---|---|
| Pegawai CRS (1 orang) | Satu-satunya user. Login ke aplikasi, input semua modul, dan yang menekan tombol "Export & Sync". |
| Sistem CRMS (backend) | Menyimpan data ke database, mengunggah dokumen & file Excel master ke SharePoint lewat path yang sudah ditentukan. |
| Database (MySQL/dst) | **Source of truth utama** untuk semua data terstruktur (7 modul). |
| SharePoint (`02.06 Community Relations`) | Storage untuk dokumen pendukung + file Excel master (snapshot). **Bukan** lagi tempat data "hidup"/diedit langsung. |
| Azure AD / Microsoft Entra ID (tenant perusahaan) | Identity provider untuk login pegawai, dan/atau kredensial yang dipakai backend untuk upload ke SharePoint. |

**Di luar lingkup:** multi-user role management, approval workflow multi-level, migrasi data historis dari Excel lama (task terpisah).

---

## 3. Klarifikasi

### 3.1 Sudah Terkonfirmasi / Diputuskan ✅

| # | Topik | Keputusan |
|---|---|---|
| 1 | Source of truth | **Database**, bebas engine (MySQL atau lainnya) — arahan mentor magang. |
| 2 | Akses SharePoint List | **Tidak diberikan** — dinilai terlalu berisiko oleh IT. |
| 3 | Mekanisme upload ke SharePoint | Backend **langsung kirim ke path folder** yang sudah disiapkan khusus untuk sistem ini (bukan browsing/pilih folder secara dinamis). |
| 4 | Struktur Excel master | **1 file** (`DailyActivities.xlsx`), berisi 7 sheet — dipertahankan sebagai referensi struktur saat proses generate (lihat Bab 8). |
| 5 | Aturan Week 1–4 | Week 1 = 1–7, Week 2 = 8–14, Week 3 = 15–21, **Week 4 = 22 s.d. tanggal terakhir bulan**. |
| 6 | Trigger sync Excel → SharePoint | **Manual**, 1 tombol "Export & Sync" untuk 7 sheet sekaligus (bukan per-modul, bukan otomatis/terjadwal). |
| 7 | Folder testing SharePoint | **Tidak perlu izin tambahan** — spec awal sudah memberi permission **Create Folder**. Keputusan: buat sendiri folder testing (mis. `0. Testing`) di struktur yang ada, tidak perlu menunggu jawaban IT. |
| 8 | Struktur modul LRP | **Diputuskan berdasarkan keterangan langsung pegawai** (bukan lagi disamakan dengan CSR Projects seperti draft sebelumnya): LRP sama sekali belum punya sheet Excel. Cakupannya "seluruh program community development / pemulihan mata pencaharian masyarakat sekitar perusahaan", dan kolomnya **hanya hyperlink SharePoint** yang mengarah ke file pendukung (docx, pdf, gambar, dst) — tanpa status/budget/tanggal seperti modul lain. Satu kolom nama program ditambahkan di luar permintaan literal supaya baris di daftar tetap bisa dibedakan/dicari (lihat catatan di `schema.sql`). |
| 9 | Format kolom Period (Top Issues) | **Teks bebas** (`VARCHAR`), bukan format terstruktur — sesuai arahan mentor untuk tidak dibuat rumit. Bisa diubah ke format terstruktur belakangan kalau ternyata dibutuhkan untuk sorting/filter. |
| 10 | Kepemilikan backup database (sementara) | Dipegang mahasiswa selama magang berjalan. **Bukan pertanyaan formal ke mentor** — cukup jadi catatan pribadi untuk diajukan menjelang akhir masa magang (bukan dibahas di awal). |
| 11 | Field "Keterangan" & "Hasil" (Daily Activities) | **Digabung jadi 1 kolom** (`description_result`) — dikonfirmasi langsung ke pegawai, meski di Excel keduanya masih kolom terpisah. |
| 12 | Pengelolaan daftar PIC | **Self-service**, bukan daftar tetap yang di-manage admin/IT lebih dulu — pegawai bisa menambah PIC baru sendiri langsung dari form input (mis. combobox dengan opsi "tambah baru"). Tetap berbentuk tabel lookup (`pics`), bukan kolom teks bebas per baris, supaya penulisan nama tetap konsisten antar baris — data historis menunjukkan nama orang yang sama sering tertulis beda-beda kalau dibiarkan teks bebas sepenuhnya. |
| 13 | Kolom yang ternyata tidak dipakai di Excel nyata | **Dihapus dari schema**: `risk_level` (Top Issues), `pic_id` (Stakeholder Engagement, Top Issues, Proposals — ketiga modul ini ternyata tidak punya kolom PIC di Excel aslinya), `meeting_result`/`follow_up`/tanggal & venue terpisah (Stakeholder Engagement — Excel-nya cuma 1 kolom teks gabungan "Date And Venue"). |
| 14 | Kolom "Biaya" (Daily Activities) | **Ditambahkan** (`cost DECIMAL(15,2)`) — sudah ada di template Excel 2026, kelewat di draft skema awal. |
| 15 | Jumlah kolom link dokumen (Daily Activities) | **1 kolom saja** (`document_link`) — draft awal sempat menyiapkan 2 slot link, tapi Excel-nya cuma punya 1 kolom "link". |
| 16 | Validasi pasangan Category–Sub Category | **Tidak diberlakukan** — dropdown Sub Category di Excel yang berjalan sekarang tidak difilter berdasarkan Category yang dipilih (dikonfirmasi lewat pengecekan data validation Excel), jadi backend tidak perlu memvalidasi kecocokan pasangan. |

### 3.2 Masih Menunggu Jawaban

Karena arahan mentor adalah "tidak usah rumit", pertanyaan-pertanyaan teknis sebelumnya (App Registration, scope Graph API, target infrastruktur) digabung jadi **1 paket pertanyaan sederhana** — biarkan IT yang menentukan mekanisme persisnya, bukan mahasiswa yang mendikte solusi teknis:

| # | Pertanyaan (versi simpel, siap ditanyakan) | Kenapa masih perlu ditanyakan |
|---|---|---|
| 1 | *"Untuk sistem saya bisa upload otomatis ke folder SharePoint, saya butuh semacam akses/kredensial dari tim IT — boleh dibantu diarahkan ke siapa dan proses paling gampangnya gimana?"* + *"Aplikasi ini nanti taruh di server/infrastruktur mana?"* | Ini satu-satunya hal yang benar-benar di luar kendali mahasiswa — butuh sesuatu (kredensial, akses server) yang cuma bisa disediakan IT. Detail teknis (delegated vs application permission, `Sites.Selected`, dst) **tidak perlu diajukan** — biarkan IT pilih sesuai kenyamanan setup mereka, backend tinggal menyesuaikan begitu tahu bentuknya. |

> Semua item lain yang tadinya "menunggu jawaban" sudah dipindah ke Bab 3.1 sebagai keputusan langsung — lihat rasionalnya di histori diskusi kalau perlu ditinjau ulang.

---

## 4. Arsitektur Level Tinggi

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (Pegawai)                        │
│   Frontend Web App — Form 7 modul, Search/Filter/Export,         │
│   tombol "Export & Sync", indikator "X data belum di-sync"       │
└─────────────────────────────┬─────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express, contoh)              │
│                                                                   │
│  ┌────────────┐  ┌───────────────┐  ┌─────────────────────────┐  │
│  │ Auth        │  │ Validation /   │  │ Business Logic           │  │
│  │ Middleware  │  │ Sanitization   │  │ - Tentukan folder tujuan │  │
│  │             │  │                │  │   (bulan/minggu, Bab 7)  │  │
│  └────────────┘  └───────────────┘  └─────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────┐      ┌─────────────────────────────┐  │
│  │ CRUD Service            │      │ DocumentUploadService         │  │
│  │ (form → tulis ke DB)    │      │ (file lampiran → path         │  │
│  │                          │      │  SharePoint yang dihitung)    │  │
│  └───────────┬─────────────┘      └───────────────┬───────────────┘  │
│              │                                     │                  │
│              ▼                                     ▼                  │
│  ┌─────────────────────┐              ┌───────────────────────────┐  │
│  │  DATABASE              │              │  Microsoft Graph API /      │  │
│  │  7 tabel modul +        │◄─────────────┤  SharePoint                 │  │
│  │  lookup (pics,          │  simpan link │  (upload-only, path fix)    │  │
│  │  categories, dst)       │  dokumen     └───────────────────────────┘  │
│  │  + sync_log             │                                             │
│  └───────────┬─────────────┘                                             │
│              │                                                            │
│              ▼                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  SyncService (dipicu tombol "Export & Sync")                        │  │
│  │  1. Query SEMUA data 7 tabel (WHERE is_deleted = FALSE)              │  │
│  │  2. Generate 1 file Excel, 7 sheet (exceljs, hyperlink asli)          │  │
│  │  3. Upload/overwrite ke path Excel master di SharePoint (Bab 8)      │  │
│  │  4. Update sync_log HANYA kalau upload dikonfirmasi sukses            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬─────────────────────────────────────────────┘
                              │ Microsoft Graph API (upload-only, path fix)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         SharePoint — 02.06 Community Relations                   │
│  - Folder bulan/minggu → dokumen pendukung (per submit)          │
│  - Daily Activities/DailyActivities.xlsx → file master            │
│    (di-overwrite tiap kali "Export & Sync", version history       │
│    otomatis tersimpan oleh SharePoint)                            │
└─────────────────────────────────────────────────────────────────┘
```

**Prinsip kunci yang berubah dari desain sebelumnya:** database sekarang jadi tempat data "hidup" — dibaca, diubah, dicari, difilter. SharePoint jadi tujuan akhir yang **hanya ditulisi** (write-only dari sudut pandang aplikasi), tidak pernah dibaca ulang untuk kebutuhan operasional aplikasi (search/filter tidak lagi bergantung ke SharePoint sama sekali).

---

## 5. Alur Autentikasi

Ada 2 hal yang perlu dipisahkan secara desain, karena kemungkinan besar tidak lagi 1 mekanisme yang sama seperti desain awal:

**A. Login pegawai ke aplikasi CRMS**
Tetap direkomendasikan pakai SSO Microsoft 365 (MSAL) — konsisten dengan identitas perusahaan, dan pegawai tidak perlu ingat password terpisah. Karena hanya 1 user, kompleksitasnya rendah (1 alur login, tanpa role/permission matrix).

**B. Kredensial backend untuk upload ke SharePoint**
Ini **belum tentu** memakai token login pegawai yang sama (beda dengan desain v1.1 sebelumnya). Karena arahan mentor adalah "kirim langsung ke path", kemungkinan besar IT akan menyediakan **kredensial service terpisah** (App Registration dengan application permission, discoped sempit ke 1 folder/site) yang backend pakai untuk semua upload — independen dari siapa yang sedang login di aplikasi.

**Konsekuensi dari pemisahan ini:** aktivitas upload di SharePoint kemungkinan akan tercatat sebagai dilakukan oleh "aplikasi/service", bukan nama pegawai secara individual (beda dengan desain lama yang delegated). Ini trade-off yang wajar untuk keamanan (least privilege), tapi perlu diketahui — bukan bug kalau nanti metadata "Modified By" di SharePoint menunjukkan nama service, bukan nama pegawai.

> **Item pending di Bab 3.2** (pertanyaan gabungan soal akses/kredensial ke IT) menentukan detail pasti dari poin B ini — begitu IT menentukan bentuk kredensialnya, sesuaikan bagian ini.

---

## 6. Business Logic: Penentuan Folder & Penamaan File

Bagian ini **tidak berubah** dari desain sebelumnya — tetap relevan karena aplikasi tidak boleh browsing folder, jadi path tujuan harus dihitung sendiri:

```javascript
// Pseudocode
function tentukanFolderTujuan(tanggalKegiatan) {
  const bulan = getNamaBulanIndonesia(tanggalKegiatan); // "Januari".."Desember"
  const tanggal = tanggalKegiatan.getDate();

  let minggu;
  if (tanggal <= 7) minggu = "Week 1";
  else if (tanggal <= 14) minggu = "Week 2";
  else if (tanggal <= 21) minggu = "Week 3";
  else minggu = "Week 4"; // termasuk tanggal 29-31 — dikonfirmasi pembimbing ✅

  return `2026/${bulan}/${minggu}`;
}

function generateNamaFile(originalName, tanggal, pic) {
  const timestamp = formatTanggal(tanggal, "YYYYMMDD");
  const safePic = sanitizeFileName(pic);
  return `${timestamp}_${safePic}_${originalName}`;
}
```

Poin penting (tidak berubah): nama file wajib disanitasi (karakter tidak valid di SharePoint seperti `# % & * : < > ? / \ { | }`), dan tentukan strategi kalau ada nama file kembar di folder tujuan (rekomendasi: auto-rename dengan suffix angka).

---

## 7. Upload Dokumen Pendukung ke SharePoint

Setiap kali form disubmit dengan lampiran, dokumen diupload **langsung** saat itu juga (independen dari proses sync Excel di Bab 8):

```
1. Backend terima file dari form
2. Validasi: ekstensi, MIME type, ukuran ≤ 5MB
3. Hitung path tujuan (Bab 6)
4. Upload via Upload Session (createUploadSession) — WAJIB dipakai untuk semua ukuran
   file di sistem ini (5MB tetap di atas batas aman simple upload 4MB Graph API)
5. Simpan path/URL hasil upload ke kolom terkait di database
   (mis. document_link, proposal_file, sharepoint_link, dst — lihat schema.sql)
```

Urutan ini penting: link dokumen **harus sudah tersimpan di database** sebelum proses "Export & Sync" berikutnya berjalan, supaya saat Excel di-generate, kolom link-nya terisi benar.

---

## 8. Skema Database

Skema lengkap ada di file terpisah `schema.sql` (**v2** — kolom tiap modul sudah dicocokkan langsung ke Excel yang benar-benar dipakai pegawai, `CRS_Dept_Daily_Activities_2026.xlsx`, bukan lagi asumsi awal di v1). Ringkasan keputusan desain:

| Keputusan | Alasan |
|---|---|
| **Category/Sub Category jadi tabel lookup** (`categories`, `sub_categories`), bukan teks bebas | Field ini dropdown di Excel — foreign key membuat database ikut menolak data tidak valid, tidak cuma mengandalkan validasi di frontend. **Revisi dari draft awal:** ternyata Category–Sub Category **bukan** dependent dropdown — dikonfirmasi lewat pengecekan data validation Excel-nya, dropdown Sub Category selalu menampilkan daftar 9 opsi yang sama terlepas dari Category yang dipilih. Jadi backend **tidak perlu** memvalidasi kecocokan pasangan category_id/sub_category_id. |
| **`pics` tetap tabel lookup, tapi self-service** | Field PIC di Excel sering ditulis tidak konsisten kalau bebas teks (mis. nama sama tertulis beda-beda antar baris) — tabel lookup menjaga konsistensi itu. Tapi bukan daftar tetap yang di-manage admin: pegawai bisa menambah entri PIC baru sendiri langsung dari form (termasuk entri gabungan untuk beberapa orang sekaligus kalau perlu, mis. "Ziya & Adji", sesuai kebiasaan yang sudah berjalan). Saat ini `pics` cuma direferensikan oleh `daily_activities` — modul lain ternyata tidak punya kolom PIC di Excel aslinya. |
| **Status (Approved/Open/Planning/dst) tetap `VARCHAR` + `CHECK constraint`**, bukan tabel lookup | Nilainya spesifik per modul, tidak dipakai bersama antar tabel — bikin tabel lookup untuk ini cuma nambah kompleksitas tanpa manfaat nyata. |
| **Tidak ada kolom "No" yang disimpan** | Kalau disimpan statis dan ada baris dihapus (soft delete), nomornya bolong. "No" dihitung ulang sebagai nomor urut baris **saat proses generate Excel** (Bab 9), bukan di database. |
| **`is_deleted` di semua tabel modul** (soft delete) | Menghindari kehilangan data permanen dari 1 klik salah — sesuai prinsip yang disepakati sejak awal diskusi. |
| **Tabel `sync_log`** | Mencatat riwayat & status tiap proses "Export & Sync" — dipakai untuk indikator "ada X data belum di-sync" di UI (Bab 9). |

7 tabel modul: `daily_activities`, `stakeholder_engagement`, `top_issues`, `proposals`, `csr_projects`, `grievance`, `lrp`. Kolom tiap tabel sekarang mengikuti kolom Excel asli masing-masing sheet, bukan lagi field yang "kelihatannya perlu" — beberapa modul jadi lebih ramping dari draft awal karena beberapa kolom ternyata tidak pernah dipakai pegawai (lihat Bab 3.1 #11–#16 untuk detail tiap perubahan), dan `lrp` didesain ulang total karena memang belum punya sheet Excel sama sekali (Bab 3.1 #8).

---

## 9. Proses Sync: Export Excel & Upload ke SharePoint

Dipicu manual oleh 1 tombol "Export & Sync" (mencakup 7 sheet sekaligus):

```
1. Disable tombol (cegah klik ganda)
2. Tampilkan loading state
3. Query SEMUA data dari 7 tabel — WHERE is_deleted = FALSE, JOIN ke tabel lookup
   supaya Excel menampilkan nama ("Budi Santoso"), bukan pic_id
4. Generate 1 file Excel (7 sheet) di memory pakai exceljs:
   - "No" dihitung sebagai nomor urut saat loop (index + 1), bukan dari DB
   - Kolom link dokumen ditulis sebagai hyperlink asli, bukan teks biasa:
     cell.value = { text: 'Lihat Dokumen', hyperlink: row.document_link }
5. Upload/overwrite file ke path Excel master di SharePoint (Upload Session)
6. KALAU sukses → insert row baru ke sync_log (status SUCCESS), tampilkan toast sukses
   KALAU gagal → insert row ke sync_log (status FAILED, error_message diisi),
                  tampilkan error jelas + tombol retry — JANGAN pura-pura sukses
7. Enable lagi tombolnya
```

**Indikator "belum di-sync"** di UI dihitung dengan membandingkan `synced_at` terakhir yang `status = SUCCESS` di `sync_log` terhadap `created_at`/`updated_at` di 7 tabel modul — kalau ada baris lebih baru dari sync terakhir, tampilkan badge peringatan beserta jumlahnya.

> **Bukan hal yang sama dengan fitur "Export Excel" di functional requirement** (lihat Bab 10) — dua fitur ini terlihat mirip namanya tapi tujuannya beda, jangan digabung jadi satu tombol/endpoint yang sama.

---

## 10. Search, Filter, dan Export (Fitur Aplikasi)

Karena database sekarang jadi source of truth, fitur ini jauh lebih sederhana dibanding desain v1.1 sebelumnya — **tidak perlu lagi cache layer tambahan**, cukup query SQL langsung (dengan index yang sudah disiapkan di `schema.sql` untuk kolom tanggal, status, dan `is_deleted`).

Penting untuk dibedakan dari Bab 9 di atas:

| | "Export Excel" (functional requirement) | "Export & Sync" (Bab 9) |
|---|---|---|
| Dipicu oleh | User, dari hasil search/filter tertentu | User, tombol khusus terpisah |
| Cakupan data | Hanya data yang sedang difilter/dicari (bisa 1 sheet saja) | **Selalu semua data**, 7 sheet lengkap |
| Tujuan output | Download langsung ke device user | Upload/overwrite ke SharePoint |
| Menyentuh SharePoint? | Tidak | Ya |

Keduanya sama-sama pakai `exceljs`, tapi jalur kode dan tujuannya berbeda — sebaiknya diimplementasikan sebagai 2 fungsi/endpoint terpisah agar tidak campur aduk.

---

## 11. Reliability: Idempotency & Mencegah Aksi Ganda

Berlaku untuk **dua** aksi: submit form, dan tombol "Export & Sync" — keduanya rawan diklik dobel oleh 1 user yang sama:

- **Frontend:** disable tombol segera setelah diklik, sampai response diterima
- **Backend (submit form):** tolak request duplikat dalam window singkat (misal 30 detik) berdasarkan kombinasi field + timestamp
- **Backend (Export & Sync):** karena prosesnya bisa berjalan beberapa detik (query + generate + upload), pertimbangkan simple lock (misal flag `sync_in_progress` di memori/DB) supaya tidak ada 2 proses sync jalan bersamaan yang saling tabrakan saat overwrite file yang sama
- **Urutan operasi tetap penting:** dokumen lampiran diupload dulu (Bab 7) sebelum baris database dianggap "lengkap"; Excel di-generate belakangan dan hanya membaca link yang sudah tersimpan.

---

## 12. Keamanan

| Area | Ketentuan |
|---|---|
| Kredensial database | Disimpan di environment variable, tidak pernah di-commit ke Git. |
| SQL Injection | Wajib pakai parameterized query / prepared statement (atau ORM seperti Prisma/Sequelize) — **tidak pernah** concatenate string user input langsung ke query SQL. |
| Kredensial SharePoint (App Registration) | Disimpan di environment variable backend, terpisah dari kredensial database. |
| Validasi Input | Semua field form divalidasi di **backend**, termasuk foreign key ke `pics`/`categories`/`sub_categories` (jangan percaya id yang dikirim frontend tanpa cek keberadaannya). |
| Validasi File Upload | Cek ekstensi & MIME type, batasi ukuran 5MB di backend, sanitasi nama file. |
| HTTPS | Wajib di semua environment. |
| Least privilege SharePoint | Scope kredensial upload dibatasi sesempit mungkin (idealnya `Sites.Selected` ke 1 site, bukan akses tenant-wide) — ini sudah sejalan dengan arahan IT yang menolak akses SharePoint List. |

---

## 13. Error Handling & Logging

- Semua panggilan ke database dan Graph API dibungkus try-catch dengan pesan error yang jelas ke user
- Retry otomatis (exponential backoff) untuk error transient saat upload ke SharePoint (timeout, rate limit)
- Logging terstruktur (timestamp, aksi, status, durasi) ke file log lokal dengan rotasi — bukan database tambahan, jadi tidak melanggar batasan yang ada
- Toast notification untuk tiap hasil aksi penting: submit form, upload dokumen, dan **Export & Sync**

---

## 14. Testing Strategy

| Level | Yang diuji | Catatan |
|---|---|---|
| Unit test | Business logic murni: penentuan folder/minggu, generate nama file, validasi form, kalkulasi indikator "belum di-sync" | Jest/Vitest |
| Integration test | CRUD ke database (pakai test database terpisah, bukan production), service upload SharePoint (mock response Graph API) | Jest + test DB / mock HTTP |
| Manual/E2E test | Full flow: login → isi form → cek data masuk DB → cek dokumen muncul di folder testing SharePoint → klik Export & Sync → cek Excel muncul & isinya benar | Dilakukan di **folder/path testing terpisah** di SharePoint |
| Uji regenerasi Excel | Isi data di 2 hari berbeda, sync 2 kali, pastikan sync kedua **tidak menghilangkan** data dari sync pertama (karena selalu generate ulang dari seluruh DB) | Manual, sekali di awal untuk validasi asumsi |

**Prinsip nomor satu tetap sama:** tidak ada kode yang menyentuh folder/file SharePoint production sebelum lolos uji di folder testing terpisah.

---

## 15. Deployment

Checklist minimal sebelum go-live:

1. Environment variables terpisah untuk `development`/`staging`/`production`: kredensial database, kredensial SharePoint, dan (kalau masih dipakai) Client ID/Redirect URI untuk login SSO
2. HTTPS aktif
3. Backend berjalan sebagai service yang auto-restart kalau crash (`pm2`/systemd)
4. **Backup database terjadwal** (mis. `mysqldump` harian) — saat ini **kamu yang pegang** proses & hasil backup ini sementara magang berjalan. Ini bukan pertanyaan formal yang perlu ditanyakan sekarang (lihat Bab 3.1 #10) — cukup catatan pribadi untuk diajukan ke mentor menjelang akhir masa magang, supaya tidak ada periode "tidak ada yang pegang backup" setelah kamu pergi
5. README lengkap: cara install, run, deploy, environment variable yang dibutuhkan, dan cara restore dari backup

---

## 16. Rekomendasi Tech Stack

| Layer | Rekomendasi | Alasan |
|---|---|---|
| Frontend | React (Vite) atau Next.js | Ekosistem MSAL.js untuk React sudah matang, kalau SSO tetap dipakai |
| Backend | Node.js + Express/Fastify | Ekosistem lengkap untuk Graph API, database, dan `exceljs` |
| Database | MySQL (sesuai arahan mentor, bebas dipilih) | Familiar, banyak tooling backup/restore siap pakai |
| ORM/Query Builder | Prisma atau Knex | Mencegah SQL injection by default, migration terkelola rapi |
| Generate Excel | `exceljs` | Mendukung multi-sheet, hyperlink asli, formatting |
| Auth | MSAL (`@azure/msal-browser`, `@azure/msal-node`) — kalau SSO tetap dipakai untuk login pegawai | Library resmi Microsoft |
| Styling | Tailwind CSS | Cepat untuk dark mode & responsive |

---

## 17. Fase Pengembangan yang Disarankan

Sesuai arahan mentor ("pakai database dulu, nanti kalau sudah siap langsung coba ke SharePoint"), fase disusun supaya integrasi SharePoint jadi tahap terpisah yang bisa diuji belakangan tanpa mengganggu progres modul inti:

1. **Fase 0 — Fondasi Database:** setup database + migration dari `schema.sql`, CRUD dasar untuk 1 modul (Daily Activities) tanpa upload file dulu, validasi flow form → DB jalan baik
2. **Fase 1 — Modul Lengkap (DB only):** replikasi pola Fase 0 ke 6 modul lain, termasuk Search/Filter/Export (fitur, bukan sync) — di titik ini aplikasi sudah bisa dipakai penuh **tanpa SharePoint sama sekali**, cocok untuk didemokan lebih awal
3. **Fase 2 — Upload Dokumen ke SharePoint:** implementasi `DocumentUploadService` (Bab 7), diuji di folder testing terlebih dahulu
4. **Fase 3 — Export & Sync:** implementasi `SyncService` (Bab 9) generate Excel dari DB dan upload ke SharePoint, diuji di file testing terlebih dahulu
5. **Fase 4 — Polish:** dark mode, loading state, toast, responsive, hardening error handling
6. **Fase 5 — UAT & Go-Live:** testing bareng pegawai, pindah dari folder/file testing ke folder production, serah terima backup & kredensial ke IT

Struktur fase ini punya keuntungan tambahan: kalau ternyata integrasi SharePoint (Fase 2–3) mundur karena menunggu App Registration dari IT, **modul inti (Fase 0–1) tetap bisa jalan dan didemokan** — tidak seluruh progres kamu bergantung pada satu blocking item eksternal.

---

## 18. Ringkasan Item yang Menunggu Jawaban Eksternal

Disederhanakan sesuai arahan mentor ("tidak usah rumit") — hanya 1 hal yang benar-benar perlu ditanyakan ke IT, sisanya sudah diputuskan sendiri (lihat Bab 3.1):

- [ ] Akses/kredensial untuk upload otomatis ke SharePoint + lokasi deploy server — ditanyakan sebagai 1 pertanyaan simpel, biarkan IT tentukan mekanismenya

Item yang sudah selesai diputuskan (tidak perlu ditanyakan lagi):
- [x] Folder testing SharePoint → buat sendiri, sudah ada izin Create Folder
- [x] Struktur modul LRP → nama program + 1 link SharePoint, sesuai keterangan pegawai (bukan lagi disamakan dengan CSR Projects)
- [x] Format kolom Period di Top Issues → teks bebas
- [x] Rencana backup database → catatan pribadi, diajukan menjelang akhir magang (bukan sekarang)
- [x] Penggabungan "Keterangan" & "Hasil" (Daily Activities) → dikonfirmasi ke pegawai, boleh disatukan
- [x] Pengelolaan daftar PIC → self-service, pegawai bisa menambah PIC baru sendiri dari form
