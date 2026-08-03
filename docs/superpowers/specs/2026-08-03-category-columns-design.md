# Design Spec: Kategori & Sub Kategori dengan Fitur Dropdown Filter

**Context:**
Pengguna menyadari bahwa tabel utama dan fitur Export Excel di halaman *Daily Activities* belum menampilkan kolom "Kategori" dan "Sub Kategori". Selain itu, pengguna menginginkan kemampuan untuk menyaring (filter) data tabel menggunakan *dropdown* berdasarkan Kategori (contoh: hanya menampilkan kategori A). Karena sudah ada *Global Search*, nama kategori yang dimunculkan akan otomatis bisa dicari lewat kotak teks.

**Desain Arsitektur & Komponen:**

1. **Penambahan Kolom di UI (DataTable):**
   - Di `DailyActivitiesModule.tsx`, definisi `columns` akan dimodifikasi.
   - Kolom **Kategori** (`category.name`) dan **Sub Kategori** (`sub_category.name`) akan disisipkan, idealnya di antara kolom *Lokasi* dan *PIC*.
   - Saat tabel merender baris (`a.category?.name` dan `a.sub_category?.name`), nilai ID akan diterjemahkan ke nama kategori (Backend sudah mendukung ini via properti relasional). Jika *null*, gunakan *fallback* string kosong atau `"-"`.

2. **Penambahan Fitur Filter Dropdown di `<TopBar>`:**
   - Properti komponen `TopBar` akan ditambahkan untuk menerima konfigurasi *filter dropdown*:
     - `showCategoryFilter?: boolean`
     - `categoryFilterValue?: string`
     - `onCategoryFilterChange?: (val: string) => void`
     - `categoryOptions?: { id: string, name: string }[]`
   - Di sisi UI `TopBar`, jika `showCategoryFilter` aktif, sebuah `<select>` akan dirender di sebelah kotak pencarian (`Search`). Pilihan *default* adalah "Semua Kategori" (value `""` atau `"All"`).

3. **Logika Penyaringan Data (Data Flow):**
   - Di `DailyActivitiesModule.tsx`, sudah ada state `const [catFilter, setCatFilter] = useState("All");`.
   - Data yang masuk ke `<DataTable data={displayed}>` akan difilter ganda:
     1. Disaring oleh `useGlobalSearch(items)` menghasilkan `filtered`.
     2. Disaring ulang berdasarkan `catFilter`: 
        `const displayed = catFilter === "All" || catFilter === "" ? filtered : filtered.filter(a => String(a.category_id) === String(catFilter))`
   - Dengan begitu, filter kategori berlaku baik untuk pencarian teks maupun fungsi Export Excel (karena Excel mengambil data dari hasil `displayed`).

4. **Penyesuaian Export Excel:**
   - Dalam fungsi `handleExportClick`, *array* `exportColumns` akan ditambahkan dua *header* baru (Kategori dan Sub Kategori).
   - `exportData` akan dipetakan untuk memasukkan nilai dari `a.category?.name` dan `a.sub_category?.name`.

**Error Handling & Edge Cases:**
- Jika kegiatan belum diberi kategori (legacy data), ia akan tersaring pada opsi "Semua Kategori", namun tidak akan muncul jika pengguna memilih kategori spesifik.
- Relasi `category` dan `sub_category` mungkin belum di-*join* dari API. Jika API belum melakukan `.include()` di Prisma, nama kategori akan hilang. (Asumsi: Prisma query sudah me-*return* relasi ini. Jika belum, kita bisa melacak ID via array `references.categories` yang sudah di- *fetch* secara terpisah di UI).
