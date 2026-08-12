# Fix Export Payload Too Large Design

## 1. Konteks Masalah
Saat melakukan ekspor data (terutama pada Daily Activities ketika memilih filter "Semua" tahun), proses terhenti dengan error "Gagal mengekspor data". Hal ini disebabkan oleh aplikasi Express di backend yang secara default membatasi ukuran request body maksimal 100kb. Karena proses ekspor saat ini bekerja dengan cara mengirimkan (POST) seluruh data dari frontend kembali ke endpoint `/api/export/excel`, ukuran JSON yang dikirim mudah melebihi limit 100kb jika data berjumlah banyak.

## 2. Solusi
Pendekatan penyelesaian masalah yang disetujui adalah dengan **Menaikkan limit payload JSON di Backend (Opsi 1)**. Solusi ini dipilih karena menyelesaikan kendala ekspor secara global untuk semua modul secara instan, tanpa harus merombak alur ekspor dari frontend ke backend.

## 3. Rencana Implementasi (Technical Design)
- **File Target**: `apps/api/src/app.ts`
- **Detail Perubahan**:
  - Mencari baris: `app.use(express.json());`
  - Mengubahnya menjadi: `app.use(express.json({ limit: '50mb' }));`
  - Menambahkan baris konfigurasi URL Encoded (sebagai best practice antisipatif): `app.use(express.urlencoded({ extended: true, limit: '50mb' }));`

## 4. Testing Plan
- Pastikan backend dapat dijalankan tanpa syntax error atau runtime error.
- (Opsional) Menjalankan backend test suite untuk memastikan rute yang ada tidak bermasalah.
