# Specific Field Validation Messages Design

## Overview
Saat ini, ketika pengguna mengklik tombol "Simpan" tanpa mengisi field wajib, notifikasi yang muncul hanya bersifat generik: `"Harap isi semua field yang wajib (dengan tanda *)."`. Perubahan ini akan membuat pesan menjadi spesifik — menyebutkan nama field mana saja yang belum diisi — sehingga pengguna tahu dengan tepat apa yang harus dilakukan tanpa perlu memeriksa form satu per satu.

## Implementation Per Module

Setiap fungsi `handleSave` di tujuh modul akan diubah pola validasinya dari pengecekan boolean tunggal ke array dinamis:

```ts
// Pola baru (berlaku di semua modul):
const missing: string[] = [
  [!f.field_a, "Label Field A"],
  [!f.field_b, "Label Field B"],
  ...
].filter(([cond]) => cond).map(([, label]) => label as string);

if (missing.length > 0) {
  showToast(`Field berikut belum diisi: ${missing.join(", ")}`, "error");
  return;
}
```

### 1. `DailyActivitiesModule.tsx` (DailyForm component)
**Field wajib yang dicek saat ini**: `activity_date`, `activity`, `pic_id`, `category_id`, `sub_category_id`

**Mapping label**:
```ts
const missing = [
  [!f.activity_date, "Tanggal Kegiatan"],
  [!f.activity, "Kegiatan"],
  [!f.pic_id, "PIC"],
  [!f.category_id, "Kategori"],
  [!f.sub_category_id, "Sub Kategori"],
].filter(([c]) => c).map(([, l]) => l as string);
```

### 2. `StakeholdersModule.tsx` (StakeholderForm component)
**Field wajib yang dicek saat ini**: `stakeholder`

**Mapping label**:
```ts
const missing = [
  [!f.stakeholder, "Nama Stakeholder"],
].filter(([c]) => c).map(([, l]) => l as string);
```

### 3. `TopIssuesModule.tsx` (TopIssueForm component)
**Field wajib yang dicek saat ini**: `period`, `issue`

**Mapping label**:
```ts
const missing = [
  [!f.period, "Periode"],
  [!f.issue, "Isu"],
].filter(([c]) => c).map(([, l]) => l as string);
```

### 4. `ProposalsModule.tsx` (ProposalForm component)
**Field wajib yang dicek saat ini**: `institution`, `date_received`, `registration_no`

**Mapping label**:
```ts
const missing = [
  [!f.institution, "Nama Institusi"],
  [!f.date_received, "Tanggal Diterima"],
  [!f.registration_no, "No. Registrasi"],
].filter(([c]) => c).map(([, l]) => l as string);
```

### 5. `CsrProjectsModule.tsx` (CsrForm component)
**Field wajib yang dicek saat ini**: `program`, `project_year`

**Mapping label**:
```ts
const missing = [
  [!f.program, "Nama Program"],
  [!f.project_year, "Tahun"],
].filter(([c]) => c).map(([, l]) => l as string);
```

### 6. `GrievanceModule.tsx` (GrievanceForm component)
**Field wajib yang dicek saat ini**: `register_no`, `log_date`, `complainant_name`, `significance`

**Mapping label**:
```ts
const missing = [
  [!f.register_no, "No. Registrasi"],
  [!f.log_date, "Tanggal Pengaduan"],
  [!f.complainant_name, "Nama Pelapor"],
  [!f.significance, "Signifikansi"],
].filter(([c]) => c).map(([, l]) => l as string);
```

### 7. `LrpModule.tsx` (LrpForm component)
**Field wajib yang dicek saat ini**: `program`, `sharepoint_link`

**Mapping label**:
```ts
const missing = [
  [!f.program, "Nama Program"],
  [!f.sharepoint_link, "Link SharePoint"],
].filter(([c]) => c).map(([, l]) => l as string);
```

## Output Pesan Notifikasi
Ketika satu atau lebih field kosong, notifikasi toast error akan menampilkan:

- **Satu field**: `"Field berikut belum diisi: Tanggal Kegiatan"`
- **Beberapa field**: `"Field berikut belum diisi: Tanggal Kegiatan, PIC, Kategori"`

## Scope & Constraints
- Perubahan hanya di frontend (`apps/web`), tidak menyentuh backend.
- Fungsi `showToast` prop yang sudah ada tetap digunakan — tidak ada perubahan signature.
- Di `LrpModule.tsx`, karena fungsi `handleSave` bersifat inline (satu baris), perlu diubah menjadi fungsi multi-baris.
