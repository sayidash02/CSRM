# Design Spec: Multiple File Upload Support

**Context:** 
Pengguna membutuhkan kemampuan untuk mengunggah lebih dari satu dokumen/gambar dalam satu field lampiran di semua modul aplikasi (misal: 1 PDF dan 3 gambar sekaligus di Daily Activities). Saat ini sistem dibatasi hanya 1 file (tersimpan dalam `VARCHAR(500)`).

**Arsitektur & Komponen:**

1. **Database Schema (`schema.sql` & Prisma)**
   - Semua kolom yang menyimpan URL file di setiap modul harus diubah tipe datanya dari `VARCHAR(255)` atau `VARCHAR(500)` menjadi `TEXT`.
   - Modul yang terdampak:
     - `daily_activities`: `document_link`
     - `stakeholder_engagement`: `document_link`
     - `top_issues`: `main_document`, `supporting_document`
     - `proposals`: `proposal_file`, `assessment_file`
     - `csr_projects`: `documentation_image`, `document`
     - `grievance`: `supporting_files`
     - `lrp`: `sharepoint_link`
   - Data akan disimpan sebagai JSON string array (contoh: `["link1.pdf", "link2.jpg"]`). Backend tidak melakukan parsing khusus, cukup menyimpan string tersebut.

2. **Komponen Frontend (`FileInput.tsx`)**
   - Menambahkan prop `multiple?: boolean` pada `FileInput`.
   - Elemen `<input type="file">` diberi atribut `multiple`.
   - Modifikasi fungsi `handleFileChange`:
     - Melakukan proses upload ke `/api/upload` (via `apiClient`) untuk setiap file yang dipilih.
     - Mengumpulkan respons URL yang dikembalikan backend menjadi sebuah *array* `["url1", "url2"]`.
     - Menggabungkan *array* URL baru dengan URL yang sudah ada (jika state sebelumnya sudah berisi file), lalu menyimpannya.
     - Emit ke form parent dalam bentuk string: `JSON.stringify(combinedUrls)`.
   - Modifikasi fungsi `handleRemove`:
     - Menghapus URL tertentu dari array, dan memancarkan string JSON terbaru.
   - **Tampilan**:
     - Membaca `value` prop. Jika diawali dengan `[` (sebuah JSON array), parse menjadi *array*, lalu render daftar file menggunakan perulangan (map).
     - Menampilkan setiap file dengan UI berbentuk baris/badge yang memiliki tombol silang (X) untuk menghapus.

3. **Data Flow & Kompatibilitas Mundur (Backward Compatibility)**
   - Jika data lama masih berupa string biasa (misal `"https://sharepoint.com/file.pdf"` tanpa kurung siku `[]`), komponen `FileInput` harus cukup cerdas untuk menangkapnya dan menganggapnya sebagai array berisi 1 elemen: `["https://sharepoint.com/file.pdf"]`.
   - Dengan begitu, data lama tidak akan pecah/error di UI.

**Error Handling:**
- Jika salah satu file gagal diunggah, tampilkan toast error namun file lain yang berhasil tetap tersimpan di state.
- Handle error parsing `JSON.parse` dengan `try-catch`.

**Testing Strategy:**
- Validasi Prisma `db push` berjalan lancar.
- Verifikasi komponen FileInput bisa memunculkan beberapa file dan bisa dikurangi satu per satu.
