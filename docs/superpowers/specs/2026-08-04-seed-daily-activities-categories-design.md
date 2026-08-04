# Design Spec: Seeding Daily Activities Categories and Subcategories

**Context:**
Setelah modifikasi struktur database sebelumnya, data referensi kategori pada modul Daily Activities ikut terhapus akibat *reset database*. Pengguna ingin agar kategori "Stakeholder Engagement" dan "Paper Work" beserta sub-kategorinya secara permanen dapat dipanggil kembali tanpa harus diketik manual melalui antarmuka pengguna (UI).

**Modifikasi:**
Target file: `apps/api/src/seed.ts`

**Desain Logika (*Logic Design*):**
1. **Pencarian / Pembuatan Kategori Utama:**
   Skrip akan mencari Kategori "Stakeholder Engagement" dan "Paper Work". Jika belum ada, skrip akan membuatnya.

2. **Injeksi Sub-Kategori Stakeholder Engagement:**
   Skrip akan melakukan iterasi (perulangan) pada array string berikut:
   - "Donasi"
   - "internal meeting"
   - "issue"
   - "Issue dan Grievance"
   - "kehumasan"
   - "project CSR"
   - "Security"
   - "support project"
   Untuk setiap string, skrip akan memverifikasi keberadaannya (berdasarkan `name` dan `category_id`). Jika tidak ditemukan, data baru akan disisipkan.

3. **Injeksi Sub-Kategori Paper Work:**
   Skrip akan melakukan perulangan pada array:
   - "Olah data"
   Sama seperti sebelumnya, skrip akan mengecek sebelum menyisipkan agar tidak terjadi data ganda (duplikasi) jika skrip *seed* dijalankan berulang kali.

**Dampak Arsitektur:**
Modifikasi ini murni hanya bersifat penyediaan data (*Data Provisioning*) pada lingkungan *development* / awal *production*. Tidak ada perubahan pada struktur tabel maupun logika bisnis modul.
