# Implementation Plan: CRMS Excel-First Operational Flow

## Overview

Mengubah CRMS dari prototype dengan export/upload generik menjadi aplikasi Excel-first: import awal `CSR(Isi).xlsx`, penyimpanan kerja di database, input tujuh modul, statistik tahunan, dan export ulang berbasis sanitized workbook template yang mempertahankan format perusahaan serta menambahkan sheet LRP. SharePoint tetap manual: CRMS hanya menyimpan URL yang ditempel user dan tidak mengunggah atau menimpa file SharePoint.

Implementasi berjalan bertahap. Plan ini mengikuti spesifikasi yang disetujui di `docs/superpowers/specs/2026-08-18-crms-excel-first-operational-flow-design.md`; keputusan scope export, auth, dan owner operasional tetap menjadi gate terpisah.

## Baseline yang Ditemukan

- Frontend build saat ini berhasil, tetapi export masih membuat workbook baru dari nol.
- Backend typecheck dan 112 test saat ini lulus.
- Import saat ini mengenali enam modul, tetapi belum lossless untuk link Proposal/Assessment dan memadukan `Keterangan`/`Hasil`.
- `FileInput` saat ini melakukan upload dokumen; ini harus menjadi input URL SharePoint manual.
- Tidak ada autentikasi production yang sudah disepakati.
- `CSR(Isi).xlsx` mengandung data dan link historis sehingga tidak boleh langsung menjadi template repository.

## Architecture Decisions

1. Database menyimpan working copy dan sumber statistik; workbook hasil export adalah artefak operasional yang user upload manual ke SharePoint.
2. Export membuka sanitized template dan mengisi ulang seluruh data, bukan menambahkan payload tabel UI atau mengedit workbook historis secara in-place.
3. Import preview bersifat read-only; confirm bersifat transactional dan memakai opaque import token, bukan path filesystem dari client.
4. Semua lampiran adalah string URL SharePoint. Jalur upload dokumen/API SharePoint dikeluarkan dari alur production.
5. LRP dibuat sebagai sheet baru dengan kolom `No`, `Program`, dan `SharePoint Link` sampai ada keputusan format yang berbeda.
6. Recovery import adalah reconciliation terpisah dari initial import; tidak boleh append buta.
7. Autentikasi dan ownership deployment merupakan gate sebelum production, bukan asumsi diam-diam.
8. Daily Activities menyimpan `keterangan` dan `hasil` terpisah; `description_result` hanya kompatibilitas sementara.
9. Dashboard statistics mendukung filter satu tahun atau semua tahun (`All`/`Semua`/kosong).

## Progress Snapshot — 2026-08-18

- Sanitized workbook template, workbook contract, and isolated test database are in place.
- Attachment fields in all seven modules now accept manual HTTPS SharePoint links; the upload route is not mounted.
- Daily Activities now carries separate `keterangan`/`hasil` fields through schema, import parsing, API CRUD, and the form/table/export payload.
- Dashboard API and frontend now pass a selected year or all-years filter. Reconciliation with the final template exporter remains pending.
- Template exporter and `GET /api/export/workbook` now fill the seven-sheet workbook from database data; SharePoint sync is disabled and the frontend downloads the workbook for manual upload.

## Dependency Graph

```text
Keputusan format + sanitized template + test DB
        |
        +--> schema/import identity + mapping contract
        |          |
        |          +--> secure initial import API/UI
        |
        +--> manual SharePoint URL input
        |
        +--> template-based export writer/validator
                   |
                   +--> export endpoint/UI + recovery reconciliation

Auth/session + logging + backup/runbook
        |
        +--> production pilot/handoff
```

## Task List

### Phase 0: Decision and Contract Gate

- Task 0: Tutup open questions spesifikasi dan tunjuk owner operasional.
- Task 1: Siapkan sanitized workbook template dan kontrak mapping.
- Task 2: Pisahkan database test dari development dan siapkan fixture aman.

### Checkpoint: Contract Gate

- [ ] Keputusan scope tahun export, auth, dan owner backup disetujui; keputusan field `Keterangan`/`Hasil` sudah diterima.
- [ ] Template repository tidak berisi data/link historis.
- [ ] Test database tidak sama dengan database development/production.

### Phase 1: Data Foundation and Manual Link Boundary

- Task 3: Tambahkan metadata import/export dan identity untuk mencegah duplicate recovery.
- Task 4: Ubah shared attachment input menjadi input URL SharePoint manual.
- Task 5: Migrasikan semua tujuh form ke input URL dan keluarkan document upload API.
- Task 6: Implementasikan autentikasi lokal satu akun/session dan middleware protected API setelah keputusan auth disetujui.

### Checkpoint: Foundation

- [ ] CRUD tujuh modul menyimpan URL biasa tanpa upload file.
- [ ] API protected dan session tidak menggunakan localStorage token.
- [ ] Migration, unit test, dan backend typecheck lulus.

### Phase 2: Initial Import

- Task 7: Amankan upload preview dengan opaque token, validasi `.xlsx`, dan batas 100 MB.
- Task 8: Refactor parser menjadi mapping eksplisit enam sheet sumber secara lossless.
- Task 9: Implementasikan transactional confirm, master-data resolution, dan duplicate guard.
- Task 10: Perbarui import wizard untuk preview/confirm enam modul dan status LRP kosong.

### Checkpoint: Initial Import

- [ ] Fixture `CSR(Isi).xlsx` yang disanitasi dapat dipreview.
- [ ] Confirm mengimpor semua data ke test database tanpa partial commit.
- [ ] Link Proposal/Assessment, attachment URL, tanggal, biaya, dan `Keterangan`/`Hasil` tervalidasi.

### Phase 3: Template-Based Export

- Task 11: Bangun template loader, row-clearing strategy, dan workbook validator.
- Task 12: Implementasikan mapper/writer Daily Activities, Stakeholder, Top Issue, dan Proposal.
- Task 13: Implementasikan mapper/writer CSR Project, Grievance, dan LRP baru.
- Task 14: Ganti endpoint export generik dengan endpoint full-workbook dari database.
- Task 15: Hubungkan tombol export frontend dan hapus asumsi “Export & Sync” otomatis.

### Checkpoint: Export

- [ ] Export dari hasil import + satu data baru menghasilkan workbook yang dapat dibuka.
- [ ] Struktur/style/merged cells/helper sheets dipertahankan.
- [ ] Sheet LRP muncul dan berisi data LRP.
- [ ] Export kedua tidak menggandakan baris.

### Phase 4: Statistics and Recovery

- Task 16: Rekonsiliasi statistik tahunan dengan dataset export (increment dashboard year/all filter sudah tersedia; rekonsiliasi dengan exporter menunggu Phase 3).
- Task 17: Bangun recovery import/reconciliation dengan laporan new/duplicate/conflict.
- Task 18: Tambahkan audit log import/export, request ID, health check, dan error reporting yang aman.

### Checkpoint: Data Safety

- [ ] Recovery dari file export terakhir tidak membuat duplikasi atau partial commit.
- [ ] Statistik dapat dicocokkan dengan jumlah data export.
- [ ] Log tidak memuat password, token, path mentah, atau isi sensitif yang tidak perlu.

### Phase 5: Pilot and Handoff

- Task 19: Dokumentasikan deployment, backup/restore, rollback, dan troubleshooting.
- Task 20: Jalankan end-to-end pilot dan review acceptance criteria bersama user CSR.
- Task 21: Siapkan paket handoff dan keputusan go/no-go production.

### Checkpoint: Production Readiness

- [ ] Backup database dibuat di lokasi perusahaan dan restore drill berhasil.
- [ ] Server/credential tidak bergantung pada laptop atau akun pribadi intern.
- [ ] Test, build, smoke test, dan review operasional lulus.
- [ ] Perusahaan menerima batasan bahwa upload ke SharePoint tetap manual.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Template berisi data/link lama ikut dikirim | High | Sanitized template; contract test memastikan data historis tidak terbawa |
| Mapping berbeda membuat data hilang | High | Mapping eksplisit per sheet, round-trip tests, row-count/content validation |
| Import file sama dikonfirmasi ulang | High | File hash/import batch/row identity dan duplicate guard |
| `Keterangan`/`Hasil` kehilangan informasi | High | Putuskan schema fidelity sebelum implementasi; test round-trip |
| Workbook baru tidak tampak seperti file perusahaan | High | Clone template, bukan generate workbook dari nol; visual/manual review |
| Recovery membuat conflict/duplicate | High | Preview reconciliation, explicit confirm, transaction |
| User tetap memakai upload dokumen lama | Medium | Ganti shared component dan hapus endpoint upload setelah migrasi UI |
| Tidak ada operator setelah intern selesai | High | Owner perusahaan, runbook, backup/restore drill, health/logging |
| Auth belum dipercaya IT | High | Local single-account session sebagai opsi minimal; minta persetujuan IT sebelum production |
| Import 100 MB menghabiskan resource | Medium | Streaming/size cap, timeout, temp-file cleanup, rate limit, monitoring |

## Open Questions / Gates

1. Apakah `Keterangan` dan `Hasil` menjadi dua field DB/form atau satu field internal yang diekspor lossless?
2. Export default hanya tahun aktif atau seluruh tahun?
3. Siapa owner server, backup, dan recovery setelah masa magang?
4. Apakah production memakai satu akun lokal yang diprovision tanpa Register?
5. Template sanitized mana yang disetujui perusahaan?

Plan tidak boleh masuk Phase 1 implementation sampai Gate 0 disetujui.
