---
name: crms-fase-closing
description: Rangkaian verifikasi, review kode, dan penutupan yang wajib dijalankan setiap kali satu fase pengembangan CRMS (Fase 0-5 di Bab 17) selesai dikerjakan, sebelum fase berikutnya boleh dimulai. Gunakan setiap kali akan mengklaim satu fase CRMS selesai.
---

# Penutupan Fase CRMS

Jalankan urutan ini setiap kali satu fase pengembangan CRMS terasa
selesai, SEBELUM melaporkan ke user bahwa fase tersebut selesai.

## Langkah

1. Verifikasi nyata: jalankan ulang seluruh test yang relevan (bukan
   cuma percaya hasil sebelumnya). Jangan klaim "selesai" atau "test
   lulus" tanpa benar-benar menjalankannya di langkah ini.
2. Cek perubahan file: daftar semua file yang berubah pada fase ini.
   Pastikan tidak ada komponen UI yang tersentuh di luar yang
   seharusnya (lihat Aturan Utama #0 di AGENTS.md — dilarang redesign
   UI tanpa alasan).
3. Review kode sendiri, cek eksplisit:
   - Bab 12 (Keamanan): hardcoded secret, query tidak parameterized,
     validasi foreign key yang kelewat, upload file tanpa validasi.
   - Bab 13 (Error Handling): ada path error yang tidak tertangkap /
     silent failure?
   - SOLID: ada business logic yang nyasar ke route handler? Service
     SharePoint bergantung langsung ke SDK, bukan ke interface? Ada
     abstraksi yang dibuat padahal tidak perlu (over-engineering)?
4. Laporkan ke user: ringkasan yang selesai, hasil test, temuan review
   beserta perbaikannya, dan bagian UI (kalau ada) yang terpaksa diubah
   strukturnya. Tunggu konfirmasi eksplisit user sebelum mulai fase
   berikutnya.
