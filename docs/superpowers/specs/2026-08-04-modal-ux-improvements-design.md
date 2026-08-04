# Modal UX Improvements Design

## Overview
Tiga perbaikan UX pada komponen `Modal` yang saat ini diduplikasi di setiap modul:
1. **Bug fix:** Form tertutup tidak sengaja saat men-drag teks ke luar area modal.
2. **Fitur baru:** Isi form tidak hilang saat form ditutup tanpa menyimpan.
3. **Fitur baru:** Tombol "Bersihkan" untuk mereset semua field form ke kondisi kosong.

---

## Arsitektur: Ekstraksi Komponen Modal Terpusat

Saat ini komponen `Modal` dan `ModalFooter` diduplikasi di 7 file modul. Karena ketiga perubahan ini menyentuh `Modal`, langkah pertama adalah **mengekstrak** komponen tersebut ke file bersama: `apps/web/src/components/ui/Modal.tsx`. Setelah itu, semua modul cukup mengimport dari sana.

---

## 1. Bug Fix — Form Menutup Saat Drag Teks

**Akar masalah:** Backdrop menggunakan `onClick={onClose}`. Ketika `mousedown` terjadi di dalam form dan `mouseup` terjadi di backdrop (karena kursor terseret keluar saat memilih teks), browser memicu event `click` di backdrop, sehingga form tertutup.

**Solusi — Track mousedown origin:**
Gunakan `useRef` di backdrop untuk menandai apakah event `mousedown` dimulai dari backdrop itu sendiri. `onClick` hanya dieksekusi jika `mousedown` memang berasal dari backdrop.

```tsx
const backdropRef = useRef(false);

<div
  className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
  onMouseDown={() => { backdropRef.current = true; }}
  onMouseUp={() => { if (backdropRef.current) onClose(); backdropRef.current = false; }}
>
  <div
    className="..."
    onMouseDown={(e) => { e.stopPropagation(); backdropRef.current = false; }}
  >
    {/* content */}
  </div>
</div>
```

Dengan pola ini, jika `mousedown` dimulai di dalam modal content lalu `mouseup` terjadi di backdrop (drag ke luar), `backdropRef.current` tetap `false` dan `onClose` tidak dipanggil.

---

## 2. Fitur — State Form Persisten Saat Exit

**Pendekatan:** Simpan "draft state" di komponen **parent** (modul), bukan di dalam komponen form. Draft diinisialisasi sekali, dan tidak direset saat form ditutup. Hanya direset ketika form berhasil disimpan atau ketika tombol "Bersihkan" diklik.

**Implementasi:**

Di setiap modul, tambahkan state `draft`:
```tsx
const emptyDraft = { activity_date: "", activity: "", pic_id: "", category_id: "", sub_category_id: "", institution_group: "", address: "", location: "", focus: "", cost: "", description_result: "", document_link: "" };
const [draft, setDraft] = useState(emptyDraft);
```

Pass `draft` dan `setDraft` ke komponen form:
```tsx
{showForm && <DailyForm ... draft={draft} onDraftChange={setDraft} onClear={() => setDraft(emptyDraft)} />}
```

Di dalam komponen form, gunakan `draft` sebagai state awal dan sinkronkan setiap perubahan ke `onDraftChange`. Saat `initial` (edit mode) ada, gunakan `initial` sebagai nilai, dan saat `handleSave` berhasil dipanggil, reset draft ke kosong.

> **Catatan:** State draft hanya berlaku untuk form **Tambah** (bukan Edit). Saat membuka form edit, nilai diambil dari data yang sudah ada (`initial`), bukan dari draft.

---

## 3. Fitur — Tombol "Bersihkan"

**Perubahan di `ModalFooter`:**
Menambahkan prop opsional `onClear?: () => void`. Jika prop ini ada, tombol "Bersihkan" akan ditampilkan di sebelah kiri tombol "Batal".

```tsx
function ModalFooter({ onClose, onSave, onClear, saveLabel = "Simpan", isEdit }: {
  onClose: () => void;
  onSave: () => void;
  onClear?: () => void;
  saveLabel?: string;
  isEdit?: boolean;
}) {
  return (
    <div className="px-6 py-4 border-t border-border flex gap-2 justify-end bg-muted/20 rounded-b-2xl shrink-0">
      {onClear && (
        <button onClick={onClear} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors mr-auto">
          Bersihkan
        </button>
      )}
      <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors">Batal</button>
      <button onClick={onSave} className={`px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-1.5 text-white ${isEdit ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-blue-700"}`}>
        {isEdit ? <Edit2 size={13} /> : <Check size={13} />}{saveLabel}
      </button>
    </div>
  );
}
```

Tombol "Bersihkan" hanya muncul di mode **Tambah** (bukan Edit, karena di mode edit `initial` sudah ada dan tidak ada draft yang perlu dibersihkan). Props `onClear` hanya diteruskan saat `!initial`.

---

## Cakupan Perubahan

| File | Aksi |
|---|---|
| `apps/web/src/components/ui/Modal.tsx` | **Buat baru** — komponen `Modal` dan `ModalFooter` yang ditingkatkan |
| `DailyActivitiesModule.tsx` | **Ubah** — hapus `Modal`/`ModalFooter` lokal, impor dari ui, tambahkan `draft` state, pass `onClear` |
| `StakeholdersModule.tsx` | **Ubah** — sama seperti di atas |
| `TopIssuesModule.tsx` | **Ubah** — sama |
| `ProposalsModule.tsx` | **Ubah** — sama |
| `CsrProjectsModule.tsx` | **Ubah** — sama |
| `GrievanceModule.tsx` | **Ubah** — sama |
| `LrpModule.tsx` | **Ubah** — sama |

---

## Scope & Constraints
- Tidak ada perubahan backend.
- Form Edit tidak menggunakan draft state — nilai selalu diambil dari `initial`.
- Tombol "Bersihkan" hanya muncul di form Tambah, tidak di form Edit.
