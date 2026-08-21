# MOM golden fixture dan visual comparison

Golden gate ini menjaga agar output MOM tetap mengikuti template resmi yang
sudah disetujui. Excel adalah referensi layout; DOCX dan PDF dibuat dari
fixture kegiatan yang sama, lalu dibandingkan sebagai gambar halaman.

## Menjalankan

Dari `apps/api`:

```powershell
pnpm test:mom-golden
```

Perintah membuat artefak sementara di `%TEMP%\crms-mom-golden` (atau di
`MOM_GOLDEN_OUTPUT_DIR`):

- workbook Excel golden,
- DOCX satu kegiatan,
- PDF satu kegiatan,
- hasil render halaman dan diff PNG jika renderer tersedia.

Fixture bersifat anonim dan deterministik. Contract test juga memeriksa field
utama, judul section, jumlah foto, serta bahwa foto yang sama masuk ke Excel,
DOCX, dan PDF. Tidak ada URL atau path file client di fixture.

## Persyaratan visual

Visual comparison membutuhkan:

1. LibreOffice/`soffice` untuk merender XLSX dan DOCX;
2. Python dengan Pillow (`PIL`); dan
3. `pdftoppm` atau ImageMagick (`magick`) untuk meraster PDF.

Perbedaan kecil karena font dan anti-aliasing lintas mesin ditoleransi sampai
12% changed pixels dan mean absolute error 4%. Perubahan layout besar, jumlah
halaman berbeda, atau ukuran halaman berbeda tetap gagal. Diff PNG harus
diinspeksi manual sebelum template dianggap kompatibel.

Untuk menjadikan renderer wajib (misalnya pada workstation/server UAT):

```powershell
pnpm test:mom-golden -- --require-renderer
```

Jika LibreOffice belum terpasang, command default menghasilkan status
`SKIPPED` dengan alasan dan lokasi artefak; ini bukan bukti bahwa visual
comparison sudah lulus. Jalankan ulang di workstation/server perusahaan dan
simpan hasil review diff sebagai bukti UAT. Artefak generated tidak boleh
dimasukkan ke repository.
