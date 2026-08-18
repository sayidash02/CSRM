# CRMS Excel-First Operational Flow — Task Checklist

Status awal semua task: pending. Setiap task harus memiliki test/verifikasi sebelum dianggap selesai.

## Phase 0 — Decision and Contract Gate

- [ ] **Task 0 — Tutup keputusan operasional dan input yang belum tersedia**
  - Acceptance: Jawaban untuk `Keterangan`/`Hasil`, scope tahun export, auth, owner backup/recovery, dan sanitized template tercatat di spec.
  - Verify: Review manusia dan update `docs/superpowers/specs/2026-08-18-crms-excel-first-operational-flow-design.md`.
  - Dependencies: Spec approved.
  - Files likely touched: `docs/superpowers/specs/2026-08-18-crms-excel-first-operational-flow-design.md`.
  - Scope: Small.
  - Update 2026-08-18: `Keterangan`/`Hasil` diputuskan sebagai dua field terpisah; statistik mendukung tahun tertentu/semua tahun. Scope export, auth, owner backup/recovery, dan approval template produksi masih pending.

- [x] **Task 1 — Siapkan sanitized workbook template dan mapping contract**
  - Acceptance: Template tidak memiliki data/link historis; sheet existing, helper sheet, style, merged cells, images, filters, dan dimensions yang disetujui tetap ada; mapping kolom enam sheet + LRP terdokumentasi.
  - Verify: Buka ulang template dengan `exceljs`, periksa sheet/header/hidden state, dan jalankan test fixture.
  - Dependencies: Task 0.
  - Files likely touched: `apps/api/templates/CRMS_Master_Template.xlsx`, `apps/api/src/services/WorkbookContract.ts`, `apps/api/tests/unit/WorkbookContract.test.ts`.
  - Scope: Medium.

- [x] **Task 2 — Isolasi test database dan fixture**
  - Acceptance: `.env.test` menunjuk database terpisah; test setup tidak menghapus development data; fixture Excel disimpan tanpa credential/link sensitif.
  - Verify: Jalankan `pnpm.cmd --dir apps/api test` dan buktikan database URL test berbeda dari `.env` tanpa menampilkan secret.
  - Dependencies: None.
  - Files likely touched: `apps/api/tests/setup.ts`, `apps/api/jest.config.js`, `apps/api/tests/fixtures/`, `.env.test` (lokal, tidak di-commit).
  - Scope: Medium.
  - Verified: `.env.test` menunjuk database `crms_test_isolated` dan setup menolak URL yang sama dengan development.

## Phase 1 — Data Foundation and Manual Link Boundary

- [ ] **Task 3 — Tambahkan import batch, row identity, dan export log**
  - Acceptance: Schema dapat mencatat source file hash, import batch/status, identity per baris, template version, dan export status tanpa menyimpan file binary.
  - Verify: Migration apply di test DB, Prisma client generate, unit/integration tests untuk duplicate guard.
  - Dependencies: Task 0–2.
  - Files likely touched: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`, `apps/api/src/repositories/`, `apps/api/tests/integration/`.
  - Scope: Large (pecah lagi bila menyentuh lebih dari satu migration concern).

- [x] **Task 4 — Ubah shared FileInput menjadi SharePointLinkInput**
  - Acceptance: Komponen menerima satu atau beberapa URL sesuai field, memvalidasi `https://` dan host policy yang disetujui, tidak membuat `FormData`, dan tidak memanggil `/api/upload`.
  - Verify: Frontend typecheck/build dan focused component test/manual input validation.
  - Dependencies: Task 0.
  - Files likely touched: `apps/web/src/components/ui/FileInput.tsx` atau komponen pengganti, `apps/web/src/lib/validation.ts`, test terkait.
  - Scope: Medium.
  - Verified: focused SharePoint link tests dan frontend typecheck/build.

- [x] **Task 5 — Migrasikan tujuh modul dan keluarkan upload dokumen**
  - Acceptance: Daily Activities, Stakeholder, Top Issues, Proposals, CSR Projects, Grievance, dan LRP hanya memakai input link manual; route/controller/service upload tidak lagi menjadi jalur aktif.
  - Verify: `rg` tidak menemukan pemanggilan upload dari form; backend upload tests disesuaikan; frontend build lulus; smoke test submit link.
  - Dependencies: Task 4.
  - Files likely touched: tujuh `apps/web/src/features/*Module.tsx`, `apps/api/src/routes/upload.ts`, `apps/api/src/controllers/UploadController.ts`, `apps/api/src/services/DocumentUploadService.ts`, tests terkait.
  - Scope: Large; pecah menjadi 5a (empat modul) dan 5b (tiga modul + API removal) saat implementasi.
  - Verified: semua tujuh form memakai input link manual; `/api/upload` tidak lagi dimount dan test route mengharapkan 404.

- [ ] **Task 6 — Implementasikan auth lokal dan protected API**
  - Acceptance: Production memiliki akun yang diprovision; session cookie aman; seluruh route data terlindungi; tidak ada token auth di localStorage; login rate limit dan logout tersedia.
  - Verify: auth unit/integration tests, unauthorized endpoint tests, security header smoke test.
  - Dependencies: Task 0 (keputusan auth), Task 3.
  - Files likely touched: `apps/api/prisma/schema.prisma`, `apps/api/src/routes/auth.ts`, `apps/api/src/middleware/`, `apps/web/src/features/auth/`, `apps/web/src/app/App.tsx`.
  - Scope: Large; jangan mulai tanpa keputusan auth eksplisit.

## Phase 2 — Initial Import

- [ ] **Task 7 — Amankan upload preview dan opaque import token**
  - Acceptance: Hanya `.xlsx` valid sampai 100 MB; Multer errors menjadi JSON 400; preview tidak menulis DB; confirm tidak menerima path filesystem mentah.
  - Verify: tests untuk oversized/invalid MIME/missing file/token expiry; request manual dengan `.xlsx` fixture.
  - Dependencies: Task 2–3.
  - Files likely touched: `apps/api/src/routes/import.ts`, `apps/api/src/controllers/ImportController.ts`, `apps/api/src/middleware/upload.ts`, `apps/api/src/services/ImportSessionService.ts`.
  - Scope: Medium.

- [ ] **Task 8 — Refactor parser mapping enam sheet secara lossless**
  - Acceptance: Parser memetakan semua field sumber; Proposal menyimpan `PROPOSAL`/`ASSESSMENT`; Daily mempertahankan `Keterangan`/`Hasil`; tanggal/biaya/link tervalidasi; helper sheets diabaikan.
  - Verify: unit tests per sheet dan fixture-based parser test dengan row counts/content assertions.
  - Dependencies: Task 0, Task 3, Task 7.
  - Files likely touched: `apps/api/src/services/ExcelImportService.ts`, `apps/api/src/services/excel/SheetDetectors.ts`, `apps/api/src/services/excel/RowMappers.ts`, `apps/api/tests/unit/ExcelImportMappings.test.ts`.
  - Scope: Large; pecah per kelompok sheet bila perlu.

- [ ] **Task 9 — Transactional confirm, master data, dan duplicate guard**
  - Acceptance: Confirm membuat import batch, menyelesaikan foreign key master data, rollback total saat satu row gagal, dan menolak file/batch yang sudah dikonfirmasi.
  - Verify: integration test successful import, rollback injection, repeated confirm, and row identity assertions.
  - Dependencies: Task 3, Task 7–8.
  - Files likely touched: `apps/api/src/services/ExcelImportService.ts`, `apps/api/src/services/ImportBatchService.ts`, `apps/api/src/repositories/ImportRepository.ts`, `apps/api/tests/integration/ExcelImportService.test.ts`.
  - Scope: Large; pecah parser dan transaction jika lebih dari satu sesi.

- [ ] **Task 10 — Perbarui Import Wizard**
  - Acceptance: UI menampilkan file size, enam summary modul, LRP sebagai sheet baru kosong, import errors/conflicts, dan confirm state yang tidak bisa double-submit.
  - Verify: frontend build, manual wizard flow against API fixture, and error toast checks.
  - Dependencies: Task 7–9.
  - Files likely touched: `apps/web/src/features/import/ImportWizardModal.tsx`, `apps/web/src/features/import/importTypes.ts`, `apps/web/src/lib/apiClient.ts`, frontend tests.
  - Scope: Medium.

## Phase 3 — Template-Based Export

- [ ] **Task 11 — Template loader, row clearing, dan workbook validator**
  - Acceptance: Loader membuka template version; clearing hanya menghapus area data; validator memeriksa sheet/header/hidden state/row count/tanggal/angka/link.
  - Verify: unit tests dengan template fixture dan corrupted workbook cases.
  - Dependencies: Task 1, Task 3.
  - Files likely touched: `apps/api/src/services/WorkbookTemplateService.ts`, `apps/api/src/services/WorkbookValidator.ts`, `apps/api/tests/unit/WorkbookTemplateService.test.ts`, template asset.
  - Scope: Medium.
  - Increment delivered 2026-08-18: template loader/row clearing dan writer round-trip sudah ada di `WorkbookExportService`; validator/export log masih pending.

- [ ] **Task 12 — Export mapper/writer data sheet group A**
  - Acceptance: Daily Activities, Stakeholder Engagement, Top Issue, dan Proposal ditulis ke posisi/header template; fields, links, date/currency formats, merged/title rows tidak rusak.
  - Verify: workbook round-trip test dan assertions pada values/styles/number formats.
  - Dependencies: Task 8, Task 11.
  - Files likely touched: `apps/api/src/services/export/DailyActivitiesWriter.ts`, `apps/api/src/services/export/StakeholderWriter.ts`, `apps/api/src/services/export/IssueProposalWriter.ts`, `apps/api/tests/unit/WorkbookGroupA.test.ts`.
  - Scope: Large; pecah Daily/Stakeholder dan Issue/Proposal bila perlu.

- [ ] **Task 13 — Export mapper/writer data sheet group B + LRP**
  - Acceptance: CSR Project dan Grievance mengikuti layout existing; LRP sheet baru berisi seluruh record dan link manual; helper/Master sheet tetap ada.
  - Verify: workbook round-trip test dengan row counts dan visual/manual inspection.
  - Dependencies: Task 11, Task 12.
  - Files likely touched: `apps/api/src/services/export/CsrProjectWriter.ts`, `apps/api/src/services/export/GrievanceWriter.ts`, `apps/api/src/services/export/LrpWriter.ts`, `apps/api/tests/unit/WorkbookGroupB.test.ts`.
  - Scope: Large; pecah per sheet bila perlu.

- [ ] **Task 14 — Endpoint full-workbook export**
  - Acceptance: Endpoint mengambil seluruh data DB sesuai scope tahun, memakai template, mengembalikan `.xlsx` baru, mencatat export log, dan tidak memanggil SharePoint.
  - Verify: integration test response headers, workbook content, export log, and no external client call.
  - Dependencies: Task 3, Task 11–13.
  - Files likely touched: `apps/api/src/services/WorkbookExportService.ts`, `apps/api/src/controllers/ExportController.ts`, `apps/api/src/routes/export.ts`, `apps/api/tests/integration/WorkbookExport.test.ts`.
  - Scope: Medium.
  - Increment delivered 2026-08-18: `GET /api/export/workbook` mengembalikan template workbook dari database; export log dan final scope policy masih pending.

- [ ] **Task 15 — Hubungkan export frontend dan hapus Export & Sync lama**
  - Acceptance: tombol export meminta full workbook, toast menampilkan status, tidak mengirim payload tabel/pagination, dan UI tidak menjanjikan upload/sync SharePoint.
  - Verify: frontend build, HTTP blob smoke test, manual downloaded workbook check.
  - Dependencies: Task 14.
  - Files likely touched: `apps/web/src/app/App.tsx`, `apps/web/src/lib/apiClient.ts`, `apps/web/src/features/dashboard/DashboardModule.tsx`, `apps/api/src/controllers/SyncController.ts`, `apps/api/src/routes/sync.ts`.
  - Scope: Medium.
  - Increment delivered 2026-08-18: tombol frontend mengunduh full workbook; route sync otomatis dinonaktifkan (`410 Gone`) dan upload SharePoint tetap manual.

## Phase 4 — Statistics and Recovery

- [ ] **Task 16 — Rekonsiliasi statistik tahunan**
  - Acceptance: dashboard memakai filter tahun yang sama dengan export; counts/totals dapat dibandingkan dengan active rows pada workbook.
  - Verify: dashboard/API tests and fixture reconciliation test.
  - Dependencies: Task 14–15.
  - Files likely touched: `apps/api/src/routes/dashboard.ts`, `apps/api/src/services/MonthlyReportService.ts`, `apps/web/src/features/dashboard/DashboardModule.tsx`, dashboard tests.
  - Scope: Medium.
  - Increment delivered 2026-08-18: dashboard API/frontend menerima filter tahun numerik atau all-years; rekonsiliasi dengan exporter masih pending.

- [ ] **Task 17 — Recovery reconciliation**
  - Acceptance: import file export terakhir menghasilkan report new/duplicate/conflict; user harus confirm; conflict tidak mengubah DB secara diam-diam.
  - Verify: integration tests for unchanged export, new row, changed row, duplicate row, and rollback.
  - Dependencies: Task 3, Task 8–9, Task 14.
  - Files likely touched: `apps/api/src/services/RecoveryImportService.ts`, `apps/api/src/controllers/RecoveryController.ts`, `apps/api/src/routes/recovery.ts`, `apps/web/src/features/import/RecoveryWizard.tsx`, integration tests.
  - Scope: Large; pecah backend dan UI.

- [ ] **Task 18 — Observability dan operational checks**
  - Acceptance: import/export memiliki structured log, request ID, health endpoint, handled error response, dan tidak log secret/token/path mentah.
  - Verify: induced failure test, log inspection, health request, and error response assertions.
  - Dependencies: Task 7, Task 14, auth task if approved.
  - Files likely touched: `apps/api/src/lib/logger.ts`, `apps/api/src/middleware/requestId.ts`, `apps/api/src/routes/health.ts`, `apps/api/src/controllers/ImportController.ts`, `apps/api/src/controllers/ExportController.ts`.
  - Scope: Medium.

## Phase 5 — Pilot and Handoff

- [ ] **Task 19 — Dokumentasi deployment, backup/restore, rollback, dan troubleshooting**
  - Acceptance: operator perusahaan dapat menjalankan, backup, restore, rollback, dan membaca known limitations tanpa laptop intern.
  - Verify: dry-run oleh orang selain implementer atau checklist evidence.
  - Dependencies: Task 6, Task 18.
  - Files likely touched: `README.md`, `docs/operations/runbook.md`, `docs/operations/backup-restore.md`, `docs/operations/rollback.md`, `.env.example`.
  - Scope: Medium.

- [ ] **Task 20 — End-to-end pilot**
  - Acceptance: flow import → CRUD → statistics → export → manual SharePoint upload diuji dengan data representatif; workbook lama tetap tersedia sebagai fallback.
  - Verify: browser smoke test, API integration suite, downloaded workbook review, and restore drill.
  - Dependencies: Task 10, Task 15–19.
  - Files likely touched: `apps/api/tests/e2e/`, `apps/web/tests/`, pilot checklist.
  - Scope: Large; pecah test automation dan manual UAT bila perlu.

- [ ] **Task 21 — Handoff dan go/no-go production**
  - Acceptance: owner, backup destination, credentials ownership, support path, known limitations, and rollback decision are signed off.
  - Verify: completed handoff checklist and explicit production decision.
  - Dependencies: Task 19–20.
  - Files likely touched: `docs/operations/handoff.md`, `docs/operations/known-limitations.md`, changelog/release notes.
  - Scope: Small.

## Checkpoints

### Checkpoint A — After Tasks 0–2

- [ ] Human decisions recorded.
- [ ] Sanitized template and test DB isolated.
- [ ] No code implementation started before gate approval.

### Checkpoint B — After Tasks 3–10

- [ ] Initial import is lossless for the supported workbook and transactional.
- [ ] Manual link input replaces document upload.
- [ ] Backend/frontend build and focused tests pass.

### Checkpoint C — After Tasks 11–15

- [ ] Full workbook export round-trips without duplicate/lost data.
- [ ] LRP sheet is present.
- [ ] No automatic SharePoint API/path call remains in the export flow.

### Checkpoint D — After Tasks 16–21

- [ ] Recovery, stats, observability, backup, and handoff are verified.
- [ ] Production readiness is explicitly approved by the company owner.
