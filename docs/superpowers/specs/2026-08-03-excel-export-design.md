# Design Spec: Excel Export via Server Rendering

**Context:**
Pengguna ingin fitur tombol "Export" dapat mengunduh data tabel yang saat ini difilter/diurutkan ke dalam format Excel (.xlsx) sungguhan. Kita akan menggunakan arsitektur *Client-to-Server Payload* di mana *frontend* mengirim data layar penuh ke *backend*, dan *backend* men- *generate* file Excel lalu mengembalikannya sebagai *blob*.

**Desain Arsitektur & Komponen:**

1. **Backend Endpoint (`POST /api/export/excel`):**
   - Instal library `exceljs` di dalam folder `apps/api`.
   - Endpoint menerima body JSON: 
     `{ sheetName: string, columns: { header: string, key: string, width?: number }[], data: object[] }`
   - Endpoint menginisiasi `new ExcelJS.Workbook()` dan `addWorksheet(sheetName)`.
   - Mendefinisikan kolom, mewarnai/menebalkan teks baris *header* agar rapi.
   - Mengambil data dari `req.body.data` dan memasukkannya ke baris Excel secara *loop*.
   - Menetapkan header HTTP: `Content-Disposition: attachment; filename=Export.xlsx` dan `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
   - Menulis *workbook* ke `res` (*response stream*).

2. **Frontend `handleExport` (di `App.tsx` & apiClient.ts):**
   - `handleExport` diubah fungsinya untuk memanggil endpoint API (bisa menggunakan `axios` dengan tipe respon `blob`).
   - Karena `apiClient.ts` kita mungkin belum mendukung *blob* secara langsung di setiap endpoint, pengunduhan ini dilakukan via konfigurasi khusus axios: `apiClient.post('/export/excel', payload, { responseType: 'blob' })`.
   - Setelah *blob* diterima, membuat elemen `<a href="...">` dengan *createObjectURL*, mengkliknya secara otomatis, lalu menghapusnya.

3. **Integrasi Modul (misal: `DailyActivitiesModule.tsx`):**
   - Setiap modul akan mengirimkan definisi spesifik kolomnya dan pemetaan data mentah ke *string/number* bersih.
   - Misalnya, tombol ekspor akan bereaksi: `onExport("Daily Activities", exportColumns, exportData)`.
   - `exportData` disusun dengan *map* atas `displayed` (data layar yang sudah terurut & tersaring). Memastikan kolom seperti `pic.name`, nominal mata uang (jika perlu murni angka, sisakan angkanya), serta `activity_date` dikonversi dengan baik.

**Error Handling & Edge Cases:**
- Jika export gagal (backend error), popup peringatan (*toast error*) muncul dan *blob* tidak dibuat.
- Mengirimkan string kosongan untuk data *null* atau *undefined*.

**Testing:**
- Validasi fungsional di `DailyActivitiesModule` dengan mengeklik Export lalu membuka file di Excel.
- Memastikan urutan baris di Excel sama persis dengan urutan tabel di UI.
