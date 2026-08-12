# Proposal Status Simplification Design

## 1. Overview
Modul Proposal saat ini memiliki tiga status: "Approved", "Under Review", dan "Declined". Permintaan desain ini bertujuan untuk menyederhanakan status tersebut menjadi hanya dua opsi: "Accept" dan "Decline". Selain itu, status tidak akan memiliki nilai default (sebelumnya "Under Review") dan akan diwajibkan (required) untuk diisi oleh user saat membuat proposal baru.

## 2. Pendekatan dan Perubahan Arsitektur

### 2.1. Database (`schema.sql`)
- Menghapus klausa `DEFAULT 'Under Review'` pada kolom `status` di tabel `proposals`.
- Memperbarui klausa `CHECK` pada kolom `status` menjadi `CHECK (status IN ('Accept', 'Decline'))`.
- Kolom tetap didefinisikan sebagai `NOT NULL`, sehingga database akan menolak _insert_ jika status tidak disertakan.

### 2.2. Backend API
- Validasi form/schema di layer backend (mis. DTO, Zod, atau validator yang relevan) akan diperbarui:
  - `status` diubah menjadi `enum` string yang hanya menerima `'Accept'` atau `'Decline'`.
  - Field `status` akan di-*enforce* sebagai field yang wajib diisi (required/not optional).

### 2.3. Frontend UI
- Komponen dropdown/select untuk status di form pembuatan dan pengeditan Proposal akan diperbarui agar hanya memiliki dua _option_: "Accept" dan "Decline".
- Komponen form **tidak akan** memilih opsi secara otomatis pada saat inisiasi pembuatan awal (state kosong).
- Validasi form di sisi *client* akan menampilkan peringatan/pesan error apabila user mencoba _submit_ tanpa memilih status.

## 3. Pertimbangan (Trade-offs)
- **Data Lama**: Jika terdapat data *dummy* atau data historis di tabel dengan nilai "Under Review" atau "Approved", *migration/update* data mungkin diperlukan agar memenuhi _constraint check_ terbaru.
- **Konsistensi Penamaan**: "Accept" menggantikan "Approved", sedangkan "Decline" tetap mirip maknanya namun perhatikan agar seragam dengan tampilan di seluruh UI modul Proposal.

## 4. Rencana Implementasi
- Pembaruan `schema.sql` (Sumbe Kebenaran Utama).
- Penyesuaian validation logic di route/service `proposals`.
- Penyesuaian UI Form dan Table view untuk menampilkan dua opsi status ini.
