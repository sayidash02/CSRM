# Design Spec: Local Mock SharePoint for UAT

**Context:** 
Selama fase UAT (Fase 5), kredensial otentikasi Microsoft Graph API untuk SharePoint belum disediakan oleh tim IT. Untuk memastikan bahwa ekspor file Excel berfungsi penuh berdasarkan data aktual di database, sistem sinkronisasi akan dimodifikasi sementara untuk menggunakan *local mock*.

**Arsitektur & Komponen:**
1. **`MockSharePointClient.ts`**:
   - Metode `uploadFile` akan menggunakan `fs.promises` dari Node.js.
   - Akan memeriksa keberadaan folder target menggunakan `fs.promises.mkdir(..., { recursive: true })`.
   - Akan menulis isi `fileBuffer` ke dalam disk secara sinkron/asinkron.
   - Mengembalikan absolute path atau relative path dari file lokal sebagai referensi.

2. **Dependency Injection di `SyncController.ts`**:
   - Controller saat ini menginisialisasi `GraphSharePointClient`.
   - Ini akan diubah agar menginstansiasi `MockSharePointClient` sebagai implementasi antarmuka `ISharePointClient`.
   - Hal ini memastikan bahwa `SyncService` akan menggunakan injeksi lokal tanpa perlu mengubah logika inti di `SyncService`.

**Data Flow:**
1. User menekan tombol "Sync" di Frontend.
2. Endpoint POST `/api/sync` memicu `SyncService.executeSync()`.
3. `SyncService` merangkai data dari database menggunakan `ExcelJS` menjadi bentuk Buffer.
4. `SyncService` memanggil `ISharePointClient.uploadFile()`.
5. `MockSharePointClient` menyimpan Buffer menjadi file fisik di folder `apps/api/.sharepoint_mock/CRMS_Master_Data.xlsx`.
6. URL lokal dimasukkan ke tabel `sync_log`.

**Error Handling:**
- Jika folder atau proses write permission ditolak, `fs` akan melemparkan exception, yang secara otomatis tertangkap oleh blok `try-catch` di dalam `SyncService` dan di-log sebagai `FAILED` di `sync_log`.

**Testing:**
- Proses akan diuji langsung lewat *browser* tanpa tes otomatis terpisah, dengan mengecek eksistensi dan validitas file `.xlsx` di dalam folder lokal menggunakan aplikasi Excel.
