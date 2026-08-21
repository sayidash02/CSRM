# Implementation Plan: CRMS — Post-SharePoint Boundary Revision

## Overview

CRMS adalah aplikasi internal untuk pencatatan data Community Relations. Database
MySQL menjadi source of truth. SharePoint sepenuhnya berada di luar boundary
CRMS: user mengunggah file hasil download secara manual dari luar aplikasi.

Perubahan ini mempertahankan kontrak Excel rekap dan workflow import historis
yang sudah berjalan. Perubahan dilakukan bertahap agar migration dan penggantian
auth dapat diuji pada database clone sebelum menyentuh deployment perusahaan.

## Keputusan Arsitektur yang Berlaku

1. **Database:** MySQL adalah source of truth untuk seluruh data terstruktur.
2. **SharePoint:** tidak ada Graph API, sync, upload otomatis, URL SharePoint,
   atau credential SharePoint di CRMS.
3. **Autentikasi:** username/password lokal dengan session cookie `httpOnly`.
4. **Role:** `USER` mengelola data operasional; `ADMIN` mengelola akun dan
   password, tetapi tidak boleh mengubah atau menghapus data operasional.
5. **Foto Daily Activities:** disimpan sebagai binary di MySQL pada tabel
   attachment terpisah, dengan metadata MIME, nama file, ukuran, urutan, dan
   checksum. Batas upload tetap 5 MB per foto dan hanya tipe gambar.
6. **MOM:** satu file per kegiatan dan satu file gabungan. Output wajib tersedia
   dalam Excel, Word, dan PDF; foto ditampilkan dengan format/ukuran yang sama.
7. **Rekap Excel:** layout dan kontrak yang sudah ada dipertahankan. Pada baris
   Daily Activities, foto ditanam langsung menggantikan hyperlink lama.
8. **LRP:** hanya menyimpan `program` dan `year`; tidak memiliki field SharePoint.
9. **Import historis:** tetap didukung. Field lampiran lama dipetakan melalui
   aturan compatibility yang terdokumentasi, tanpa menghidupkan kembali
   integrasi SharePoint.
10. **Deployment:** detail WSL/PuTTY/server ditunda sampai fitur dan gate test
    selesai.

## Dependency Graph

```text
Architecture/schema contract
        |
        +--> migration + photo/user models
        |          |
        |          +--> local auth + role checks
        |          |
        |          +--> photo upload/read/delete + MOM embedding
        |
        +--> remove SharePoint fields/code paths
                   |
                   +--> preserve import/export workbook contract
                              |
                              +--> Word/PDF output
                                         |
                                         +--> P0 + UAT + handoff
```

## Phases

### Phase A — Contract and schema baseline

- Update `Arsitektur-Teknis-CRMS.md` and `schema.sql`.
- Add Prisma models for local users and Daily Activity photos.
- Plan a non-destructive migration for existing databases.
- Document treatment of legacy SharePoint/link values before dropping fields.

### Phase B — Local authentication and authorization

- Replace shared `CRMS_AUTH_TOKEN` login with username/password accounts.
- Hash passwords; never return password hashes.
- Add `USER`/`ADMIN` checks to account endpoints.
- Keep all domain routes protected; admin cannot mutate domain data.

### Phase C — MySQL photo workflow

- Upload only JPEG/PNG images, max 5 MB each; this matches the supported
  embedded-photo formats in the current Excel/MOM exporter.
- Store binary and metadata transactionally.
- Serve photos through an authenticated endpoint.
- Delete/restore photo records consistently with the parent activity.

### Phase D — Export and import compatibility

- Keep existing Excel rekap layout and import workflow.
- Embed full-size photos in the Daily Activities rekap and MOM workbook.
- Reuse the same photo bytes for single MOM, combined MOM, Word, and PDF.
- Keep legacy workbook parsing explicit and report unsupported attachment values.

### Phase E — Remove stale SharePoint surface

- Remove SharePoint link fields from UI/API/schema after migration path is tested.
- Remove Graph, mock, sync, link validation, and SharePoint-specific UI code.
- Ensure no production code requires a SharePoint secret or URL.

### Phase F — Production verification

- Run migration on an empty database and a clone of the current database.
- Compare row counts, constraints, photo counts, and export round-trip results.
- Run the full P0 gate, then user workstation UAT.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Dropping legacy link columns loses historical references | High | Backup, export values before migration, document explicit discard policy |
| MySQL database grows quickly because photos are binary | High | Per-file cap, checksum, backup size monitoring, separate attachment table |
| Full-size photos make workbooks very large | Medium | Test worst-case fixture; enforce count/size limits; preserve requested dimensions |
| Auth migration locks out the user | High | Bootstrap admin procedure, test account, rollback migration, smoke test |
| Removing SharePoint fields changes workbook shape | High | Keep approved workbook layout; use blank/embedded-photo cells where required |
| DOCX/PDF layout differs from Excel MOM | Medium | Golden fixture and visual review before UAT |

## Current Open Operational Item

- Exact WSL/VM service wrapper, reverse proxy, and server ownership remain
  deployment concerns and are intentionally deferred.
