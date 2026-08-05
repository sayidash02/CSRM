# Spesifikasi Fitur: Filter Tahun Aktif (Active Year Filter)

**Tanggal:** 2026-08-05
**Status:** Disetujui — siap implementasi
**Fase target:** Fase 4 (Polish) sesuai Arsitektur-Teknis-CRMS.md Bab 17

---

## 1. Latar Belakang & Tujuan

Saat pergantian tahun/periode, pengguna ingin aplikasi CRMS terasa "mulai dari awal" — tampilan tabel kosong untuk tahun yang baru — tanpa kehilangan akses ke data historis tahun-tahun sebelumnya.

**Solusi yang dipilih:** Menambahkan konsep **Tahun Aktif** yang berlaku secara global di seluruh aplikasi. Tidak ada data yang dihapus. Data historis tetap bisa diakses kapan saja dengan mengganti tahun di dropdown.

---

## 2. Gambaran Besar

Tahun Aktif dikontrol lewat satu dropdown di navbar yang berlaku untuk seluruh aplikasi. Saat pengguna mengganti tahun, semua halaman otomatis menampilkan data untuk tahun yang dipilih.

```
[CRMS Logo]  Daily  Stakeholder  ...  [2026 v]  [Nama User]
                                           ^
                              dropdown tahun -- global, satu pilihan
                              berlaku untuk semua modul
```

**Tidak ada data yang dihapus.** Ini murni mekanisme filter tampilan, bukan penghapusan.

---

## 3. Perubahan Database (Migration)

### 3.1 Tabel yang sudah siap (tidak butuh perubahan schema)

Kelima tabel berikut sudah punya kolom tanggal yang bisa difilter per tahun via `YEAR()`:

| Tabel | Kolom tanggal |
|---|---|
| `daily_activities` | `activity_date` |
| `stakeholder_engagement` | `date` |
| `proposals` | `date_received` |
| `csr_projects` | `project_year` (sudah tipe `YEAR`) |
| `grievance` | `log_date` |

### 3.2 Tabel yang butuh kolom `year` baru

Dua tabel tidak punya kolom tanggal aktivitas yang bisa di-parse secara andal:

```sql
-- top_issues: kolom period adalah teks bebas ("April 2026 : Tanggal 13-17")
-- tidak bisa di-parse via SQL secara andal
ALTER TABLE top_issues
  ADD COLUMN year INT NOT NULL DEFAULT 2026
  AFTER period;

-- lrp: tidak ada kolom tanggal aktivitas sama sekali, hanya created_at
ALTER TABLE lrp
  ADD COLUMN year INT NOT NULL DEFAULT 2026
  AFTER program;
```

### 3.3 Tabel `sync_log`

Tambah kolom untuk mencatat tahun mana yang di-sync, supaya indikator "belum di-sync" juga ter-scope per tahun:

```sql
ALTER TABLE sync_log
  ADD COLUMN synced_year INT
  AFTER synced_at;
```

---

## 4. Perubahan Frontend

### 4.1 Komponen Year Selector (Navbar)

- **Posisi:** Navbar global, di sisi kanan sebelum info user.
- **Daftar tahun:** Diambil dari API — query DISTINCT tahun dari semua 7 tabel, digabung dengan tahun kalender saat ini, diurutkan descending.
- **State:** Disimpan di `localStorage` dengan key `crms_active_year`. Default ke tahun kalender saat ini jika belum pernah diset.
- **Saat ganti tahun:** Semua halaman yang menampilkan data list/tabel melakukan re-fetch dengan `year` yang baru.

### 4.2 Perubahan di halaman list/tabel (semua 7 modul)

Semua pemanggilan API untuk mengambil data list menambahkan query param `year`:

```
GET /api/daily-activities?year=2026
```

### 4.3 Perubahan di halaman form (tambah data baru)

- Untuk modul `top_issues` dan `lrp`: field `year` dikirim otomatis dari active year saat ini di request body — tidak ada input manual dari pengguna.
- Untuk modul lain: tidak ada perubahan, tahun sudah tersirat dari kolom tanggal yang diisi pengguna.

### 4.4 Empty State

Saat tahun dipilih tapi belum ada data, tampilkan pesan yang ramah:

> "Belum ada data untuk tahun [YYYY]. Mulai dengan menambahkan entri baru."

### 4.5 Export & Sync

- Tombol "Export & Sync" mengirim `year` aktif saat itu ke backend.
- Nama file Excel di SharePoint menyertakan tahun: `DailyActivities_2026.xlsx`.
- Indikator "X data belum di-sync" dihitung hanya untuk tahun yang aktif.

---

## 5. Perubahan Backend

### 5.1 Endpoint GET list — semua 7 modul

Semua endpoint list menerima query param `year` (opsional, default ke tahun kalender saat ini):

```typescript
const year = parseInt(req.query.year as string) || new Date().getFullYear();
```

Filter per modul:
```sql
-- 5 modul dengan kolom tanggal
WHERE is_deleted = FALSE AND YEAR(activity_date) = :year   -- daily_activities
WHERE is_deleted = FALSE AND YEAR(date) = :year            -- stakeholder_engagement
WHERE is_deleted = FALSE AND YEAR(date_received) = :year   -- proposals
WHERE is_deleted = FALSE AND project_year = :year          -- csr_projects
WHERE is_deleted = FALSE AND YEAR(log_date) = :year        -- grievance

-- 2 modul dengan kolom year baru
WHERE is_deleted = FALSE AND year = :year                  -- top_issues, lrp
```

### 5.2 Endpoint GET tahun tersedia (baru)

```
GET /api/years/available
```

Respons: array tahun yang tersedia, contoh `[2024, 2025, 2026, 2027]`.

Query: DISTINCT YEAR() dari semua 7 tabel di-UNION, diurutkan descending, lalu merge dengan tahun kalender saat ini.

### 5.3 SyncService

- Menerima parameter `year` dari request.
- Semua query dalam SyncService menggunakan filter tahun yang sama.
- Nama file output ke SharePoint: `DailyActivities_{year}.xlsx`.
- Row yang diinsert ke `sync_log` mengisi kolom `synced_year`.

### 5.4 Endpoint POST (tambah data baru)

- Modul `top_issues` dan `lrp`: field `year` wajib ada di request body, divalidasi harus berupa integer 4 digit (1900-2100).
- Modul lain: tidak ada perubahan.

---

## 6. Edge Cases

| Kasus | Penanganan |
|---|---|
| `?year` tidak dikirim ke API | Default ke `new Date().getFullYear()` |
| `?year` bukan angka valid | Return `400 Bad Request` dengan pesan jelas |
| `?year` di luar range masuk akal | Validasi: 1900 <= year <= 2100, jika tidak return `400` |
| Tahun baru dipilih, data kosong | API return array kosong, frontend tampilkan empty state |
| Indikator "belum di-sync" | Dihitung hanya untuk tahun aktif |
| Data `top_issues`/`lrp` lama (sebelum migration) | Kolom `year` diisi DEFAULT 2026 — perlu dikonfirmasi ke pengguna apakah nilai default sudah benar |
| Dropdown tahun di navbar kosong | Selalu tampilkan minimal tahun kalender saat ini, meski belum ada data |

---

## 7. Yang Tidak Berubah

- Struktur komponen UI tidak diubah (tabel, form, layout).
- Soft delete (`is_deleted`) tetap berlaku normal.
- Fitur search & filter di dalam setiap modul tetap bekerja di atas filter tahun.
- Endpoint POST untuk modul selain `top_issues` dan `lrp` tidak berubah sama sekali.

---

## 8. Testing

| Level | Yang diuji |
|---|---|
| Unit test | Fungsi default year, validasi range year, query builder per modul |
| Integration test | GET list dengan `?year=2026` return data benar; GET list dengan `?year=2099` return array kosong; POST `top_issues`/`lrp` tanpa field `year` return 400 |
| Manual | Ganti tahun di navbar -> semua halaman langsung update; empty state muncul untuk tahun tanpa data; Export & Sync menghasilkan file dengan nama yang menyertakan tahun |
