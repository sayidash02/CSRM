# Design Spec: PIC Management

**Context:** 
Pengguna membutuhkan kemampuan untuk menambahkan, mengubah, dan menghapus nama PIC (Person In Charge) secara langsung saat sedang mengisi form kegiatan (misalnya modul Daily Activities). Fitur ini diperlukan agar pengguna tidak perlu beralih ke halaman terpisah (Master Data) saat menyadari ada PIC yang belum terdaftar.

**Arsitektur & Komponen:**

1. **Backend API (`apps/api`)**:
   - Membuat file router baru: `apps/api/src/routes/pics.ts`
   - Membuat file controller baru: `apps/api/src/controllers/PicsController.ts`
   - **Endpoints**:
     - `POST /api/pics`: Membuat entri PIC baru di tabel `pics` (`is_active: true`).
     - `PUT /api/pics/:id`: Memperbarui atribut `name` pada PIC tertentu.
     - `DELETE /api/pics/:id`: Melakukan *soft-delete* dengan mengubah `is_active = false`.
   - Menambahkan router ini ke dalam `apps/api/src/app.ts`.

2. **Frontend UI (`apps/web`)**:
   - Membuat komponen `PicManagementModal` di dalam `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx` (atau sebagai komponen terpisah jika diperlukan).
   - Komponen ini akan memiliki internal state untuk me-manage operasi CRUD yang berkomunikasi dengan `/api/pics`.
   - Modifikasi `DailyForm` untuk menyertakan tombol ⚙️ (Gear) di sebelah dropdown "PIC".
   - Saat tombol diklik, state `showPicManager` menjadi `true`, yang akan me-render `PicManagementModal` di atas `DailyForm` menggunakan *z-index* yang lebih tinggi.
   - Modifikasi alur `refs`: `DailyForm` akan menerima fungsi `onRefreshReferences` dari komponen induk (`DailyActivitiesModule`) agar setelah PIC baru ditambahkan, daftar referensi diperbarui dan data di *dropdown* menjadi sinkron.

**Data Flow:**
1. User mengklik ikon "⚙️" di sebelah kolom PIC pada form kegiatan.
2. `PicManagementModal` terbuka dan memuat daftar PIC yang aktif.
3. User menambah PIC "Sasha". Request dikirim ke `POST /api/pics`.
4. User menutup modal. Event `onClose` memicu `onRefreshReferences()`.
5. Frontend melakukan *fetch* ulang ke `/api/references`.
6. Dropdown PIC kini menampilkan "Sasha" dan form kegiatan tetap tidak kehilangan isian sementara.

**Error Handling:**
- Jika API gagal merespons, toast notification error (bawaan dari UI yang ada) akan ditampilkan.
- *Graceful degradation*: Jika update referensi gagal, user bisa menutup dan membuka ulang form.
