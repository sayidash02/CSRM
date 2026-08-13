-- ============================================================
-- CRMS Database Schema — v2
-- Catatan: ditulis dengan sintaks MySQL, gampang diadaptasi ke
-- PostgreSQL/lainnya (ganti AUTO_INCREMENT -> SERIAL, dst)
--
-- Perubahan dari v1: kolom tiap tabel modul disesuaikan supaya
-- PERSIS mengikuti kolom yang benar-benar ada di Excel yang
-- dipakai pegawai (CRS_Dept_Daily_Activities_2026.xlsx), bukan
-- lagi asumsi awal. Detail alasan tiap perubahan ada di
-- Arsitektur-Teknis-CRMS.md Bab 3.1 (#11 dst) dan Bab 8.
-- ============================================================

-- ============================================================
-- LOOKUP TABLES (dipakai bersama di beberapa/semua modul)
-- ============================================================

-- PIC bukan daftar tetap yang di-manage terpisah oleh admin —
-- pegawai bisa menambah PIC baru sendiri langsung dari form saat
-- input data (self-service "add new"), bukan cuma pilih dari
-- daftar yang sudah ada. Tabel lookup tetap dipertahankan (bukan
-- kolom teks bebas di tiap baris modul) supaya penulisan nama
-- tetap konsisten antar baris — data historis menunjukkan nama
-- yang sama sering ditulis beda-beda kalau dibiarkan teks bebas
-- (mis. "Ziya" vs "Ziyadu", "Fadhil" vs "Pak. Fadhil" vs "Pak.FADHIL").
-- Kalau 1 aktivitas melibatkan beberapa orang sekaligus, pegawai
-- bisa membuat 1 entry PIC gabungan sendiri (mis. "Ziya & Adji")
-- sebagai satu opsi custom — sesuai kebiasaan yang sudah berjalan.
-- Bukan direlasikan many-to-many supaya tetap sederhana; gampang
-- diubah nanti kalau pegawai butuh laporan per-individu yang presisi.
CREATE TABLE pics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE   -- 'Stakeholder Engagement', 'Paper Work'
);

-- Catatan: di Excel yang berjalan sekarang, dropdown Sub Category
-- TIDAK difilter berdasarkan Category yang dipilih (satu daftar
-- flat yang sama selalu tampil, dikonfirmasi lewat pengecekan
-- data validation Excel-nya) — jadi FE/BE TIDAK perlu memvalidasi
-- kecocokan pasangan category_id-sub_category_id. Tetap dipisah
-- jadi 2 tabel karena field-nya memang dropdown (bukan teks bebas),
-- bukan karena ada aturan dependency yang harus dijaga.
CREATE TABLE sub_categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  UNIQUE (category_id, name)
);
CREATE INDEX idx_sub_categories_category ON sub_categories(category_id);

-- Seed data awal untuk category/sub_category sesuai spec
INSERT INTO categories (name) VALUES ('Stakeholder Engagement'), ('Paper Work');

INSERT INTO sub_categories (category_id, name)
SELECT id, sub FROM categories,
  (SELECT 'Donasi' AS sub UNION ALL SELECT 'Internal Meeting' UNION ALL
   SELECT 'Issue' UNION ALL SELECT 'Issue & Grievance' UNION ALL
   SELECT 'Kehumasan' UNION ALL SELECT 'Project CSR' UNION ALL
   SELECT 'Security' UNION ALL SELECT 'Support Project') AS s
WHERE categories.name = 'Stakeholder Engagement';

INSERT INTO sub_categories (category_id, name)
SELECT id, 'Data Processing (Olah Data)' FROM categories WHERE name = 'Paper Work';


-- ============================================================
-- 1. STAKEHOLDER ENGAGEMENT
-- ============================================================
CREATE TABLE stakeholder_engagement (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  stakeholder VARCHAR(255),
  date DATE,
  venue VARCHAR(255),
  concern_issue TEXT,
  document_link TEXT,             -- kolom "Docs"
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_stakeholder_deleted ON stakeholder_engagement(is_deleted);


-- ============================================================
-- 2. DAILY ACTIVITIES
-- ============================================================
CREATE TABLE daily_activities (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  activity_date DATE NOT NULL,
  activity VARCHAR(255) NOT NULL,
  institution_group VARCHAR(255),
  address VARCHAR(255),
  focus VARCHAR(255),                     -- kolom "Fokus": teks bebas, tidak ada dropdown di Excel asli
  location VARCHAR(255),
  cost DECIMAL(15,2),                     -- kolom "Biaya" — baru ditambahkan, ada di template Excel 2026 tapi kelewat di v1
  description_result TEXT,                -- gabungan "Keterangan" + "Hasil" — dikonfirmasi ke pegawai, memang boleh disatukan
  document_link TEXT,             -- kolom "link" — cuma 1 kolom link di Excel, bukan 2
  pic_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  sub_category_id BIGINT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pic_id) REFERENCES pics(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id)
);
CREATE INDEX idx_daily_activities_date ON daily_activities(activity_date);
CREATE INDEX idx_daily_activities_deleted ON daily_activities(is_deleted);
CREATE INDEX idx_daily_activities_pic ON daily_activities(pic_id);
CREATE INDEX idx_daily_activities_category ON daily_activities(category_id);
CREATE INDEX idx_daily_activities_sub_category ON daily_activities(sub_category_id);


-- ============================================================
-- 3. TOP ISSUES
-- ============================================================
-- Excel aslinya: No, Periode, Issue, Deskripsi, Follow Up, Docs,
-- Supporting Docs, Next Plan — tidak ada kolom Risk Level atau PIC.
CREATE TABLE top_issues (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  period VARCHAR(50) NOT NULL,             -- format perlu disepakati, misal "April 2026 : Tanggal 13-17"
  issue VARCHAR(255) NOT NULL,
  description TEXT,
  follow_up TEXT,
  main_document TEXT,
  supporting_document TEXT,
  next_plan TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_top_issues_deleted ON top_issues(is_deleted);


-- ============================================================
-- 4. PROPOSALS
-- ============================================================
-- Excel aslinya: NO, NO REGISTRASI, TANGGAL PENERIMAAN PROPOSAL,
-- INSTANSI, ALAMAT, KETERANGAN PROPOSAL, PROPOSAL, ASSESSMENT,
-- STATUS — tidak ada kolom PIC.
CREATE TABLE proposals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  registration_no VARCHAR(50) NOT NULL UNIQUE,   -- auto-generate di backend, misal PRP-2026-0001
  date_received DATE NOT NULL,
  institution VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  proposal_description TEXT,
  proposal_file TEXT,
  assessment_file TEXT,
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('Accept','Decline')),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_deleted ON proposals(is_deleted);


-- ============================================================
-- 5. GRIEVANCE
-- ============================================================
-- Kolom sudah cocok dengan Excel sejak v1 (tidak ada PIC di
-- sheet Grievance 2026, jadi memang sengaja tidak ada pic_id).
-- Catatan: tidak ada kolom "tanggal selesai" yang eksplisit di
-- Excel — kemungkinan selama ini cuma disebut di teks bebas
-- (kolom Status/Remarks). completion_date dipertahankan sebagai
-- field terstruktur baru; perlu dikonfirmasi ke pegawai supaya
-- benar-benar diisi konsisten di sistem baru.
CREATE TABLE grievance (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  register_no VARCHAR(50) NOT NULL UNIQUE,   -- auto-generate di backend, misal GRV-2026-0001
  log_date DATE NOT NULL,
  complainant_name VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  phone VARCHAR(30),
  category VARCHAR(100),
  significance VARCHAR(20) NOT NULL CHECK (significance IN ('Low','Medium','High','Critical')),
  description TEXT,
  location VARCHAR(255),
  investigation TEXT,
  resolution TEXT,
  feedback TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open','On Progress','Resolved','Closed')),
  completion_date DATE,
  remarks TEXT,
  supporting_files TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_grievance_status ON grievance(status);
CREATE INDEX idx_grievance_significance ON grievance(significance);
CREATE INDEX idx_grievance_deleted ON grievance(is_deleted);


-- ============================================================
-- 6. CSR PROJECTS
-- ============================================================
-- Kolom sudah cocok dengan Excel sejak v1 (tidak ada PIC di
-- sheet CSR Project 2026, jadi memang sengaja tidak ada pic_id).
-- Catatan: kolom "REALISASI" di Excel masih kosong semua di
-- contoh yang tersedia — belum bisa dipastikan angka (cocok utk
-- DECIMAL) atau teks naratif. `budget` di bawah ini asumsi
-- sementara, perlu dikonfirmasi ke pegawai sebelum go-live.
CREATE TABLE csr_projects (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_year YEAR NOT NULL,
  program VARCHAR(255) NOT NULL,
  activity VARCHAR(255),
  type_of_activity VARCHAR(100),
  location VARCHAR(255),
  target_beneficiaries VARCHAR(255),
  objective TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Planning'
    CHECK (status IN ('Planning','On Going','Completed','Cancelled')),
  budget DECIMAL(15,2),                    -- pemetaan dari kolom "REALISASI" — perlu konfirmasi tipe data asli
  implementation_period VARCHAR(100),      -- teks bebas, misal "Jan - Mar 2026"
  documentation_image TEXT,
  document TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_csr_year ON csr_projects(project_year);
CREATE INDEX idx_csr_status ON csr_projects(status);
CREATE INDEX idx_csr_deleted ON csr_projects(is_deleted);


-- ============================================================
-- 7. LRP (Livelihood Restoration Program)
-- ============================================================
-- Modul baru — belum ada sheet-nya sama sekali di Excel yang
-- berjalan sekarang. Sesuai keterangan pegawai: "seluruh program
-- community development / pemulihan mata pencaharian masyarakat
-- sekitar perusahaan, kolomnya hanya hyperlink SharePoint yang
-- mengarah ke file2 docx/pdf/gambar dsb." Sengaja dibuat SANGAT
-- minim, jauh lebih sederhana dari desain v1 (yang meniru CSR
-- Projects). `program` ditambahkan sebagai satu-satunya field di
-- luar permintaan literal pegawai — supaya tiap baris di daftar
-- masih bisa dibedakan/dicari (baris isinya cuma link mentah
-- tanpa label akan sulit ditelusuri). Kalau ternyata pegawai
-- benar-benar tidak mau ada field ini juga, tinggal dihapus.
CREATE TABLE lrp (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  program VARCHAR(255) NOT NULL,          -- nama/judul program, supaya baris bisa dibedakan
  sharepoint_link TEXT NOT NULL,  -- link ke folder/file SharePoint (docx, pdf, gambar, dst)
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_lrp_deleted ON lrp(is_deleted);


-- ============================================================
-- SYNC LOG (untuk tombol "Export & Sync")
-- ============================================================
CREATE TABLE sync_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  synced_at TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS','FAILED')),
  error_message TEXT,                       -- diisi kalau status = FAILED
  file_url VARCHAR(500),                    -- link Excel di SharePoint hasil sync ini
  triggered_by VARCHAR(100)                 -- untuk future-proof kalau nanti multi-user
);
-- Query "ada berapa data belum di-sync" dari aplikasi:
--   SELECT last successful synced_at, lalu COUNT(*) WHERE created_at > synced_at
--   di ketujuh tabel modul (gabungkan dgn UNION ALL atau loop per tabel)
