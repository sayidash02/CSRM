# Design Spec: Inline Editing & Quick-Add DataGrid

## 1. Objective
Mengubah alur input data (khususnya untuk tabel seperti Daily Activities) yang sebelumnya menggunakan modal yang lambat, menjadi pola DataGrid bergaya Excel. Fitur ini diterapkan secara standar di komponen `DataTable` agar bisa digunakan oleh seluruh modul di CRMS.

## 2. Architecture & Components
Komponen `DataTable.tsx` akan ditingkatkan kemampuannya (Smart DataTable).
Kita akan memperluas interface `ColumnDef<T>` dengan properti baru:
- `editable?: boolean`
- `inputType?: 'text' | 'select' | 'date' | 'number'`
- `options?: { label: string; value: any }[]` (untuk dropdown/select)
- `required?: boolean`

Komponen `DataTable` akan menerima props tambahan:
- `onAdd?: (newItem: Partial<T>) => Promise<void>`
- `onUpdate?: (id: any, updatedField: Partial<T>) => Promise<void>`

## 3. Data Flow & UI Behavior
### 3.1. Quick-Add Row (Baris Paling Atas)
- Jika prop `onAdd` diberikan, `DataTable` akan me-render satu baris statis di urutan paling atas.
- Baris ini berisi elemen `<input>` atau `<select>` sesuai dengan `inputType` dari masing-masing kolom.
- State untuk baris penambahan ini (draft data) dikelola secara internal oleh `DataTable`.
- Saat user menekan tombol `Enter` di salah satu field, `DataTable` akan memanggil `onAdd(draftData)`.
- Jika `onAdd` berhasil (Promise resolve), form akan langsung di-reset/dikosongkan tanpa menutup elemen apapun, memungkinkan user mengetik entri berikutnya secara berurutan.

### 3.2. Inline Editing
- Baris data biasa di-render sebagai teks statis.
- Saat user melakukan **Double-Click** pada sel yang kolomnya `editable: true`, teks tersebut berubah menjadi input field.
- User dapat mengubah nilai, lalu menekan `Enter` untuk menyimpan.
- Saat ditekan `Enter`, `DataTable` akan memanggil `onUpdate(itemId, { fieldName: newValue })`.
- Setelah Promise resolve, sel kembali menjadi teks statis dengan nilai yang baru.
- Jika user menekan `Escape`, mode edit dibatalkan dan nilai kembali ke semula.

## 4. Keyboard Shortcuts & Focus Management
- **Tab**: Berpindah antar field input di Quick-Add row atau saat mengedit.
- **Enter**: Menyimpan perubahan (baik untuk `onAdd` maupun `onUpdate`).
- **Escape**: Membatalkan mode edit.
- **Focus Auto-Return**: Setelah `onAdd` berhasil disubmit dengan `Enter`, kursor secara otomatis difokuskan kembali ke field (input) pertama di Quick-Add row agar alur `Ketik -> Tab -> Enter -> Ketik` dapat berjalan sempurna tanpa menggunakan mouse.

## 5. Error Handling & Validation
- Validation error dari API akan ditampilkan dalam bentuk inline (misal: text merah kecil di bawah input, atau border merah di input) atau via Toast notification jika gagal `onAdd`/`onUpdate`.
- Saat error terjadi, state input tidak di-clear agar user bisa memperbaiki kesalahannya.
