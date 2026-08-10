# Real-Time Dashboard Optimization Design

## 1. Overview
Optimalisasi halaman Dashboard CRMS agar menampilkan metrik *real-time* dan *actionable* yang dibutuhkan oleh *user*, mengurangi keharusan untuk membuka *sheet* Excel secara manual. Data akan ditarik langsung dari database lewat API yang diperbarui.

## 2. Requirements & Metrics
- **Untouched Grievance**: Menghitung Grievance dengan signifikansi High/Critical, berstatus Open atau On Progress, namun belum memiliki `investigation` dan `resolution`.
- **Stale Proposals**: Menghitung Proposal yang berstatus "Under Review" dengan usia (`date_received`) lebih dari 14 hari.
- **Weekly Trend (Daily Activities)**: Membandingkan total kegiatan 7 hari terakhir (*this week*) dengan 7 hari sebelumnya (*last week*).
- **Sync Status**: Menampilkan jumlah baris data secara keseluruhan dari seluruh tabel utama yang belum di-*sync* ke SharePoint (yakni `updated_at` > tanggal sinkronisasi sukses terakhir).

## 3. Data Structure (API `DashboardStats`)
Penambahan field berikut pada response JSON dan interface TypeScript:
```typescript
{
  actionable: {
    // fields yang sudah ada...
    untouchedGrievances: number;
    staleProposals: number;
  },
  trends: {
    // fields yang sudah ada...
    weeklyThisWeek: number;
    weeklyLastWeek: number;
    weeklyTrend: number;
  },
  sync: {
    unsyncedCount: number;
    lastSyncDate: string | null;
  }
}
```

## 4. Backend Architecture (`DashboardController.ts`)
- **Stale Proposals**: Query `prisma.proposals.count` dengan kondisi `status: 'Under Review'` dan `date_received < [14 hari lalu]`.
- **Untouched Grievance**: Query `prisma.grievance.count` dengan kondisi `status IN ['Open', 'On Progress']`, `significance IN ['High', 'Critical']`, `resolution: null`, dan `investigation: null`.
- **Weekly Trend**: 
  - `thisWeek`: rentang waktu `now - 7 days` sampai `now`.
  - `lastWeek`: rentang waktu `now - 14 days` sampai `now - 7 days`.
- **Sync Status**: 
  1. Cari `synced_at` dari sukses log terakhir di `sync_log`.
  2. Apabila ada, jalankan `count` ke 7 tabel (`daily_activities`, `stakeholder_engagement`, `top_issues`, `proposals`, `csr_projects`, `grievance`, `lrp`) di mana `updated_at > lastSyncDate`. Jika log kosong, hitung seluruh tabel.
  3. Total dari ketujuh `count` tersebut dijumlahkan sebagai `unsyncedCount`.

## 5. Frontend UI Modifications (`DashboardModule.tsx`)
- **Sync Indicator**: Ditempatkan di header di sebelah tombol "Import Master Excel". Berwarna hijau ("✅ Tersinkronisasi") jika 0, atau peringatan oranye ("⚠️ X data pending sync") jika lebih dari 0.
- **Alert Banner**: Jika `staleProposals > 0` atau `untouchedGrievances > 0`, banner *alert* berwarna menonjol muncul memanjang di bawah header.
- **KPI Cards**:
  - **Proposal**: Menampilkan teks *badge* peringatan ("🔥 X Overdue") di dalam area card.
  - **Daily Activities**: Tulisan keterangan bawah (*subtext*) menampilkan perbandingan Mingguan dan Bulanan.

## 6. Error Handling & Edge Cases
- **Tidak ada data sync sebelumnya**: Semua record dianggap belum di-*sync*.
- **Timezone issues**: Backend harus memastikan perbandingan tanggal `< 14 hari yang lalu` menggunakan waktu (date) lokal atau UTC yang konsisten dengan timezone user. Prisma *DateTime* menggunakan UTC di database, filter harus disesuaikan.
