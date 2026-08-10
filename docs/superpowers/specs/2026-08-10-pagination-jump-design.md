# Pagination Jump-to-Page Design Spec

## 1. Konteks
Komponen `Pagination` telah berhasil diimplementasikan untuk menangani data besar secara efisien (server-side pagination). Namun, saat ini user kesulitan untuk melompat ke halaman spesifik yang jauh (misalnya halaman 25 dari 50), karena komponen hanya menampilkan nomor-nomor halaman di sekitar halaman aktif dan menggunakan elipsis (`...`) untuk sisanya. 

Solusinya adalah menambahkan sebuah input "Go to page" (Lompat ke halaman) langsung di dalam komponen `Pagination.tsx`.

## 2. Arsitektur & Pendekatan
Kita akan menambahkan elemen UI input kecil yang memungkinkan input langsung dari pengguna. Karena komponen `Pagination` dirancang secara *stateless* untuk state paginasi utamanya (prop `page` & `onPageChange` di-handle oleh parent), kita akan menambahkan state lokal *hanya* untuk menyimpan nilai sementara yang sedang diketik oleh user ke dalam kotak input, sebelum nilai tersebut disubmit.

## 3. Desain Antarmuka (UI)
- **Letak:** Input teks sederhana (tipe numerik) dengan label pendek `"Ke hal:"` akan ditempatkan berdekatan dengan dropdown limit jumlah baris atau di samping angka informasi total data (sesuai tata letak responsif).
- **Styling:** Menggunakan kelas styling seragam Tailwind yang sudah ada di file `Pagination.tsx` agar menyatu mulus secara estetika.

## 4. Mekanisme & Validasi Interaksi
- **Input Lokal:** Menyediakan state lokal (misal: `jumpPage`) yang mencatat angka saat user mengetik. Jika kosong, biarkan kotak input kosong.
- **Trigger `onPageChange`:** Fungsi `onPageChange` bawaan akan dipanggil ketika user menekan tombol `Enter` (`onKeyDown`) atau saat input kehilangan fokus (`onBlur`).
- **Validasi Nilai:**
  - Pastikan string yang diinput terkonversi dengan aman ke angka bulat (integer).
  - Jika angka hasil input `< 1`, otomatis panggil `onPageChange(1)`.
  - Jika angka hasil input `> totalPages`, otomatis panggil `onPageChange(totalPages)`.
  - Jika hasil konversi gagal atau kotak dikosongkan secara keseluruhan tanpa nilai pengganti, reset input kembali ke nilai `page` saat ini tanpa melempar event.

## 5. Scope & Checklist
1. Modifikasi komponen di `apps/web/src/components/ui/Pagination.tsx` untuk menampung input baru.
2. Tambahkan React lokal state untuk text input.
3. Tambahkan handler `onKeyDown` dan `onBlur` beserta logic pembatas batas angka min/max.
