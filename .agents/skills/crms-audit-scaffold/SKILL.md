---
name: crms-audit-scaffold
description: Audit kecocokan scaffold UI Figma Make (komponen, dropdown/enum, versi schema di src/imports) terhadap schema.sql dan Arsitektur-Teknis-CRMS.md di root sebelum menulis/mengubah kode apa pun di project CRMS. Gunakan di awal project atau sebelum menyambungkan modul yang belum pernah diaudit ke backend.
---

# Audit Scaffold CRMS

Jalankan skill ini SEBELUM menulis atau mengubah kode, terutama di awal
project atau sebelum mulai fase baru yang menyentuh modul yang belum
diaudit.

## Langkah

1. Baca Arsitektur-Teknis-CRMS.md dan schema.sql di root — ini sumber
   kebenaran (lihat AGENTS.md).
2. Baca package.json, pnpm-workspace.yaml, vite.config.ts,
   guidelines/Guidelines.md, src/app/App.tsx, dan inventaris
   src/app/components/ui/.
3. Bandingkan src/imports/pasted_text/crms-schema.txt terhadap
   schema.sql root FIELD PER FIELD, PER MODUL. schema.sql root adalah
   v2 — beberapa kolom versi lama sudah dihapus (risk_level di
   top_issues; pic_id di stakeholder_engagement/top_issues/proposals;
   meeting_result/follow_up di stakeholder_engagement) dan beberapa
   ditambah (cost di daily_activities, description_result gabungan, 1
   document_link saja). Laporkan semua ketidakcocokan yang ditemukan,
   bukan cuma menyimpulkan "sudah cocok" tanpa perbandingan detail.
4. Cek semua dropdown/select/badge status di komponen yang ada —
   apakah nilai teksnya PERSIS sama dengan CHECK constraint dan seed
   data di schema.sql? Beda kapitalisasi/spasi/singkatan termasuk
   ketidakcocokan yang harus dilaporkan.
5. Untuk modul yang datanya masih dummy/hardcoded di komponen, catat
   sebagai temuan — ini yang perlu diganti ke API call asli di fase
   pengembangan berikutnya.
6. Sampaikan hasil audit sebagai laporan terstruktur per modul, BUKAN
   langsung memperbaiki kode. Tunggu konfirmasi user sebelum mengubah
   apa pun.
