# Design Spec: Export & Filter Expansion for 6 Modules

**Context:**
Kita akan menduplikasi kesuksesan fitur *Export Excel* dan *Dropdown Filter* yang ada di `DailyActivitiesModule` ke 6 modul CRUD lainnya: Proposals, CSR Projects, Grievance, Top Issues, Stakeholder Engagement, dan LRP. Tujuannya agar fungsionalitas pencetakan laporan dan penyaringan data menjadi standar dan lengkap di seluruh aplikasi.

**Desain Arsitektur & Komponen:**

1. **Modul Proposals (`ProposalsModule.tsx`)**
   - **Filter Dropdown**: Menambahkan dropdown `Status` (contoh: "Under Review", "Approved", dsb. - akan diambil dinamis dari nilai unik di data, atau di-hardcode jika opsinya baku, namun lebih baik dinamis `Array.from(new Set(items.map(i => i.status)))`).
   - **Export Excel**: Menambahkan `handleExportClick` untuk mengekspor kolom: Registration No, Date, Institution, Address, Proposal Description, dan Status.
   - **TopBar**: Diperbarui untuk mendukung prop filter khusus Status jika memungkinkan, atau menggunakan prop generik `customFilters`. (Karena `TopBar` ada di dalam komponen masing-masing, kita bisa menyunting `TopBar` lokalnya).

2. **Modul CSR Projects (`CsrProjectsModule.tsx`)**
   - **Filter Dropdown**: Menambahkan dropdown `Status` (Planning, Ongoing, dll).
   - **Export Excel**: Ekspor kolom: Year, Program, Activity, Type, Location, Beneficiaries, Objective, Status, Budget (numeric), Implementation Period.

3. **Modul Grievance (`GrievanceModule.tsx`)**
   - **Filter Dropdown**: Menambahkan 2 dropdown: `Status` (Open, Closed) dan `Significance` (High, Medium, Low).
   - **Export Excel**: Ekspor kolom: Register No, Date, Complainant, Category, Significance, Description, Location, Status, Resolution, Remarks.

4. **Modul Top Issues (`TopIssuesModule.tsx`)**
   - **Filter Dropdown**: Menambahkan dropdown `Period` (misal: "Q1 2026", "2026").
   - **Export Excel**: Ekspor kolom: Period, Issue, Description, Follow Up, Next Plan.

5. **Modul Stakeholder Engagement (`StakeholdersModule.tsx`) & LRP (`LrpModule.tsx`)**
   - **Filter Dropdown**: Tidak ada dropdown spesifik (hanya mengandalkan kotak `Search` global).
   - **Export Excel**: Menyusun `handleExportClick` dengan memetakan kolom-kolom tabel yang ada ke format ExcelJS.

**Data Flow (Untuk Modul dengan Filter):**
- Di dalam modul yang memiliki filter (misal: Grievance), kita buat state filter `const [statusFilter, setStatusFilter] = useState("All")`.
- Data `displayed` akan dikomputasi menggunakan `useMemo` yang merantai *filter* dari `useGlobalSearch(items)` dan *filter* dari dropdown lokal (mirip dengan DailyActivities).
- Tombol ekspor di `TopBar` akan memanggil fungsi ekspor yang menerima data `displayed`, bukan data `items` mentah.

**Error Handling:**
- Jika data kosong (`displayed.length === 0`), tombol export tetap akan mengunduh Excel berisi *header* kolom tanpa baris data (kosong).
- Format tanggal (DateTime) akan diproses via fungsi `formatDate` (jika tersedia di `src/lib/utils` atau komponen terkait) agar tidak menghasilkan format ISO yang membingungkan pengguna Excel.
