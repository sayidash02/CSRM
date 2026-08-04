# Modal UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki tiga UX issue pada komponen Modal: bug form tertutup saat drag teks, state form persisten saat exit, dan tombol Bersihkan.

**Architecture:** Ekstrak `Modal` + `ModalFooter` ke shared component `apps/web/src/components/ui/Modal.tsx` dengan drag-fix (`useRef` untuk track `mousedown` origin) dan prop `onClear` opsional. Setiap modul menyimpan `addDraft` state di parent dan meneruskannya ke form component sebagai `defaultValues`. Form mensinkronkan perubahannya kembali ke parent via `onDraftChange` callback.

**Tech Stack:** React, TypeScript, Vite, pnpm

---

### Task 1: Create Shared Modal Component

**Files:**
- Create: `apps/web/src/components/ui/Modal.tsx`

- [ ] **Step 1: Buat file `apps/web/src/components/ui/Modal.tsx` dengan isi lengkap berikut:**

```tsx
import React, { useRef } from 'react';
import { X, Check, Edit2 } from 'lucide-react';

export function Modal({
  title,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  const mouseDownOnBackdrop = useRef(false);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onMouseDown={() => { mouseDownOnBackdrop.current = true; }}
      onMouseUp={() => {
        if (mouseDownOnBackdrop.current) onClose();
        mouseDownOnBackdrop.current = false;
      }}
    >
      <div
        className={`bg-card rounded-2xl border border-border shadow-2xl w-full ${size === "lg" ? "max-w-3xl" : "max-w-2xl"} max-h-[92vh] flex flex-col`}
        onMouseDown={(e) => { e.stopPropagation(); mouseDownOnBackdrop.current = false; }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <X size={15} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export function ModalFooter({
  onClose,
  onSave,
  onClear,
  saveLabel = "Simpan",
  isEdit,
}: {
  onClose: () => void;
  onSave: () => void;
  onClear?: () => void;
  saveLabel?: string;
  isEdit?: boolean;
}) {
  return (
    <div className="px-6 py-4 border-t border-border flex gap-2 justify-end bg-muted/20 rounded-b-2xl shrink-0">
      {onClear && (
        <button
          onClick={onClear}
          className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors mr-auto"
        >
          Bersihkan
        </button>
      )}
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors"
      >
        Batal
      </button>
      <button
        onClick={onSave}
        className={`px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-1.5 text-white ${
          isEdit ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-blue-700"
        }`}
      >
        {isEdit ? <Edit2 size={13} /> : <Check size={13} />}
        {saveLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter @figma/my-make-file build`
Expected: Exit code 0, `✓ built in ...s`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/Modal.tsx
git commit -m "feat: create shared Modal component with drag-fix and onClear support"
```

---

### Task 2: Refactor DailyActivitiesModule

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

**Context:** File ini memiliki deklarasi lokal `Modal` dan `ModalFooter` (baris ~57–80). Form component bernama `DailyForm` (baris ~135). Ada 12 field state. Parent component bernama `DailyActivitiesModule`.

- [ ] **Step 1: Ganti impor `Modal`/`ModalFooter` lokal dengan versi shared**

Di bagian atas file, tambahkan baris impor:
```tsx
import { Modal, ModalFooter } from '../../components/ui/Modal';
```

Kemudian hapus seluruh deklarasi fungsi lokal `function Modal(...)` dan `function ModalFooter(...)` dari file (baris ~57–80). Pastikan tidak ada lagi dua fungsi lokal tersebut.

- [ ] **Step 2: Tambahkan `defaultValues` dan `onDraftChange` ke `DailyForm`**

Ubah signature dan state initialization `DailyForm`:

```tsx
// Definisi emptyDailyDraft yang dipakai di form maupun parent:
const emptyDailyDraft = {
  activity_date: "", activity: "", institution_group: "", address: "",
  focus: "", location: "", cost: "", pic_id: "", category_id: "",
  sub_category_id: "", description_result: "", document_link: ""
};

function DailyForm({
  initial, onClose, onSave, refs, onRefreshReferences, showToast,
  defaultValues, onDraftChange,
}: {
  initial?: DailyActivity;
  onClose: () => void;
  onSave: (d: Omit<DailyActivity, "id">) => void;
  refs: { pics: any[]; categories: any[]; sub_categories: any[] };
  onRefreshReferences: () => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  defaultValues?: typeof emptyDailyDraft;
  onDraftChange?: (v: typeof emptyDailyDraft) => void;
}) {
  const [showPicManager, setShowPicManager] = useState(false);
  const [f, setF] = useState(
    initial
      ? {
          activity_date: initial.activity_date ?? "",
          activity: initial.activity ?? "",
          institution_group: initial.institution_group ?? "",
          address: initial.address ?? "",
          focus: initial.focus ?? "",
          location: initial.location ?? "",
          cost: String(initial.cost ?? ""),
          pic_id: initial.pic_id ?? "",
          category_id: initial.category_id ?? "",
          sub_category_id: initial.sub_category_id ?? "",
          description_result: initial.description_result ?? "",
          document_link: initial.document_link ?? "",
        }
      : { ...emptyDailyDraft, ...defaultValues }
  );
  
  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };
```

- [ ] **Step 3: Tambahkan `handleClear` dan update `handleSave` + `ModalFooter` di `DailyForm`**

Tambahkan fungsi `handleClear` setelah fungsi `set`:
```tsx
  const handleClear = () => {
    setF({ ...emptyDailyDraft });
    onDraftChange?.({ ...emptyDailyDraft });
  };
```

Di dalam `handleSave`, tepat sebelum `onClose()` di bagian sukses, tambahkan reset draft:
```tsx
    // Setelah: onSave({ ...f, cost: Number(f.cost) || 0, document_link: f.document_link || null });
    if (!initial) onDraftChange?.({ ...emptyDailyDraft });
    onClose();
```

Di bagian JSX return dari `DailyForm`, update pemanggilan `<ModalFooter>`:
```tsx
<ModalFooter
  onClose={onClose}
  onSave={handleSave}
  onClear={!initial ? handleClear : undefined}
  saveLabel={initial ? "Simpan Perubahan" : "Simpan Kegiatan"}
  isEdit={!!initial}
/>
```

- [ ] **Step 4: Tambahkan `addDraft` state di parent `DailyActivitiesModule` dan teruskan ke form**

Di dalam `export default function DailyActivitiesModule(...)`, tambahkan state:
```tsx
  const [addDraft, setAddDraft] = useState({ ...emptyDailyDraft });
```

Update pemanggilan `<DailyForm>` untuk form Tambah:
```tsx
{showForm && (
  <DailyForm
    refs={references}
    onRefreshReferences={fetchReferences}
    onClose={() => setShowForm(false)}
    onSave={handleAdd}
    showToast={showToast}
    defaultValues={addDraft}
    onDraftChange={setAddDraft}
  />
)}
```

Form Edit tidak perlu `defaultValues` / `onDraftChange`:
```tsx
{editing && (
  <DailyForm
    refs={references}
    onRefreshReferences={fetchReferences}
    initial={editing}
    onClose={() => setEditing(null)}
    onSave={d => { handleEdit(editing.id, d); setEditing(null); }}
    showToast={showToast}
  />
)}
```

- [ ] **Step 5: Verify build**

Run: `pnpm --filter @figma/my-make-file build`
Expected: Exit code 0

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
git commit -m "feat: modal UX improvements for daily activities"
```

---

### Task 3: Refactor StakeholdersModule

**Files:**
- Modify: `apps/web/src/features/stakeholders/StakeholdersModule.tsx`

**Context:** Deklarasi lokal `Modal`/`ModalFooter` di baris ~31–55. Form component bernama `StakeholderForm`. Fields: `stakeholder`, `date`, `venue`, `concern_issue`, `document_link`.

- [ ] **Step 1: Ganti impor, hapus lokal Modal/ModalFooter**

Tambahkan di bagian atas file:
```tsx
import { Modal, ModalFooter } from '../../components/ui/Modal';
```
Hapus deklarasi fungsi lokal `function Modal(...)` dan `function ModalFooter(...)`.

- [ ] **Step 2: Tambahkan `emptyDraft`, update `StakeholderForm` signature dan state**

Tambahkan const sebelum fungsi `StakeholderForm`:
```tsx
const emptyStakeholderDraft = {
  stakeholder: "", date: "", venue: "", concern_issue: "", document_link: ""
};
```

Update signature dan `useState` di `StakeholderForm`:
```tsx
function StakeholderForm({
  initial, onClose, onSave, showToast, defaultValues, onDraftChange,
}: {
  initial?: Stakeholder;
  onClose: () => void;
  onSave: (d: Omit<Stakeholder, "id">) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  defaultValues?: typeof emptyStakeholderDraft;
  onDraftChange?: (v: typeof emptyStakeholderDraft) => void;
}) {
  const [f, setF] = useState(
    initial
      ? { stakeholder: initial.stakeholder ?? "", date: initial.date ?? "", venue: initial.venue ?? "", concern_issue: initial.concern_issue ?? "", document_link: initial.document_link ?? "" }
      : { ...emptyStakeholderDraft, ...defaultValues }
  );
  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };
```

- [ ] **Step 3: Tambahkan `handleClear`, update `handleSave`, update `ModalFooter`**

Tambahkan setelah `set`:
```tsx
  const handleClear = () => {
    setF({ ...emptyStakeholderDraft });
    onDraftChange?.({ ...emptyStakeholderDraft });
  };
```

Di `handleSave`, sebelum `onClose()` pada path sukses:
```tsx
    if (!initial) onDraftChange?.({ ...emptyStakeholderDraft });
    onClose();
```

Di JSX, update `<ModalFooter>`:
```tsx
<ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan"} isEdit={!!initial} />
```

- [ ] **Step 4: Tambahkan `addDraft` di parent `StakeholdersModule`**

```tsx
  const [addDraft, setAddDraft] = useState({ ...emptyStakeholderDraft });
```

Update render calls:
```tsx
{showForm && <StakeholderForm onClose={() => setShowForm(false)} onSave={handleAdd} showToast={showToast} defaultValues={addDraft} onDraftChange={setAddDraft} />}
{editing && <StakeholderForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
```

- [ ] **Step 5: Verify build**

Run: `pnpm --filter @figma/my-make-file build`
Expected: Exit code 0

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/stakeholders/StakeholdersModule.tsx
git commit -m "feat: modal UX improvements for stakeholders"
```

---

### Task 4: Refactor TopIssuesModule

**Files:**
- Modify: `apps/web/src/features/top-issues/TopIssuesModule.tsx`

**Context:** Lokal `Modal`/`ModalFooter` di baris ~31–55. Form: `TopIssueForm`. Fields: `period`, `issue`, `description`, `follow_up`, `next_plan`, `main_document`, `supporting_document`.

- [ ] **Step 1: Ganti impor, hapus lokal Modal/ModalFooter**

```tsx
import { Modal, ModalFooter } from '../../components/ui/Modal';
```
Hapus deklarasi fungsi lokal `function Modal(...)` dan `function ModalFooter(...)`.

- [ ] **Step 2: Tambahkan `emptyDraft`, update `TopIssueForm`**

```tsx
const emptyTopIssueDraft = {
  period: "", issue: "", description: "", follow_up: "",
  next_plan: "", main_document: "", supporting_document: ""
};

function TopIssueForm({
  initial, onClose, onSave, showToast, defaultValues, onDraftChange,
}: {
  initial?: TopIssue;
  onClose: () => void;
  onSave: (d: Omit<TopIssue, "id">) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  defaultValues?: typeof emptyTopIssueDraft;
  onDraftChange?: (v: typeof emptyTopIssueDraft) => void;
}) {
  const [f, setF] = useState(
    initial
      ? { period: initial.period ?? "", issue: initial.issue ?? "", description: initial.description ?? "", follow_up: initial.follow_up ?? "", next_plan: initial.next_plan ?? "", main_document: initial.main_document ?? "", supporting_document: initial.supporting_document ?? "" }
      : { ...emptyTopIssueDraft, ...defaultValues }
  );
  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };
```

- [ ] **Step 3: Tambahkan `handleClear`, update `handleSave`, update `ModalFooter`**

```tsx
  const handleClear = () => {
    setF({ ...emptyTopIssueDraft });
    onDraftChange?.({ ...emptyTopIssueDraft });
  };
```

Di `handleSave` sebelum `onClose()` pada path sukses:
```tsx
    if (!initial) onDraftChange?.({ ...emptyTopIssueDraft });
    onClose();
```

Di JSX:
```tsx
<ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Isu"} isEdit={!!initial} />
```

- [ ] **Step 4: Tambahkan `addDraft` di parent `TopIssuesModule`**

```tsx
  const [addDraft, setAddDraft] = useState({ ...emptyTopIssueDraft });
```

Update render calls:
```tsx
{showForm && <TopIssueForm onClose={() => setShowForm(false)} onSave={handleAdd} showToast={showToast} defaultValues={addDraft} onDraftChange={setAddDraft} />}
{editing && <TopIssueForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
```

- [ ] **Step 5: Verify build + Commit**

Run: `pnpm --filter @figma/my-make-file build` (Exit code 0)

```bash
git add apps/web/src/features/top-issues/TopIssuesModule.tsx
git commit -m "feat: modal UX improvements for top issues"
```

---

### Task 5: Refactor ProposalsModule

**Files:**
- Modify: `apps/web/src/features/proposals/ProposalsModule.tsx`

**Context:** Lokal `Modal`/`ModalFooter` di baris ~36–56. Form: `ProposalForm`. Fields: `registration_no`, `date_received`, `institution`, `address`, `proposal_description`, `proposal_file`, `assessment_file`, `status`. Catatan: `registration_no` memiliki default dari `nextRegNo` — di draft, field ini kosong `""` dan form akan mengisi dari `nextRegNo` jika draft kosong.

- [ ] **Step 1: Ganti impor, hapus lokal Modal/ModalFooter**

```tsx
import { Modal, ModalFooter } from '../../components/ui/Modal';
```
Hapus deklarasi fungsi lokal `function Modal(...)` dan `function ModalFooter(...)`.

- [ ] **Step 2: Tambahkan `emptyDraft`, update `ProposalForm`**

```tsx
const emptyProposalDraft = {
  registration_no: "", date_received: "", institution: "", address: "",
  proposal_description: "", proposal_file: "", assessment_file: "", status: "Under Review"
};

function ProposalForm({
  initial, onClose, onSave, nextRegNo, showToast, defaultValues, onDraftChange,
}: {
  initial?: Proposal;
  onClose: () => void;
  onSave: (d: Omit<Proposal, "id">) => void;
  nextRegNo: string;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  defaultValues?: typeof emptyProposalDraft;
  onDraftChange?: (v: typeof emptyProposalDraft) => void;
}) {
  const [f, setF] = useState(
    initial
      ? { registration_no: initial.registration_no ?? nextRegNo, date_received: initial.date_received ? String(initial.date_received).split('T')[0] : "", institution: initial.institution ?? "", address: initial.address ?? "", proposal_description: initial.proposal_description ?? "", proposal_file: initial.proposal_file ?? "", assessment_file: initial.assessment_file ?? "", status: initial.status ?? "Under Review" }
      : { ...emptyProposalDraft, registration_no: defaultValues?.registration_no || nextRegNo, ...defaultValues }
  );
  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };
```

- [ ] **Step 3: Tambahkan `handleClear`, update `handleSave`, update `ModalFooter`**

```tsx
  const handleClear = () => {
    const cleared = { ...emptyProposalDraft, registration_no: nextRegNo };
    setF(cleared);
    onDraftChange?.(cleared);
  };
```

Di `handleSave` sebelum `onClose()` pada path sukses:
```tsx
    if (!initial) onDraftChange?.({ ...emptyProposalDraft });
    onClose();
```

Di JSX:
```tsx
<ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Proposal"} isEdit={!!initial} />
```

- [ ] **Step 4: Tambahkan `addDraft` di parent `ProposalsModule`**

```tsx
  const [addDraft, setAddDraft] = useState({ ...emptyProposalDraft });
```

Update render calls:
```tsx
{showForm && <ProposalForm onClose={() => setShowForm(false)} onSave={handleAdd} nextRegNo={nextRegNo} showToast={showToast} defaultValues={addDraft} onDraftChange={setAddDraft} />}
{editing && <ProposalForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} nextRegNo={editing.registration_no} showToast={showToast} />}
```

- [ ] **Step 5: Verify build + Commit**

Run: `pnpm --filter @figma/my-make-file build` (Exit code 0)

```bash
git add apps/web/src/features/proposals/ProposalsModule.tsx
git commit -m "feat: modal UX improvements for proposals"
```

---

### Task 6: Refactor CsrProjectsModule

**Files:**
- Modify: `apps/web/src/features/csr-projects/CsrProjectsModule.tsx`

**Context:** Lokal `Modal`/`ModalFooter` di baris ~44–68. Form: `CsrForm`. Fields: `project_year`, `program`, `activity`, `type_of_activity`, `location`, `target_beneficiaries`, `objective`, `status`, `budget`, `implementation_period`, `documentation_image`, `document`.

- [ ] **Step 1: Ganti impor, hapus lokal Modal/ModalFooter**

```tsx
import { Modal, ModalFooter } from '../../components/ui/Modal';
```
Hapus deklarasi fungsi lokal `function Modal(...)` dan `function ModalFooter(...)`.

- [ ] **Step 2: Tambahkan `emptyDraft`, update `CsrForm`**

```tsx
const emptyCsrDraft = {
  project_year: String(new Date().getFullYear()), program: "", activity: "",
  type_of_activity: "", location: "", target_beneficiaries: "", objective: "",
  status: "Planning", budget: "", implementation_period: "",
  documentation_image: "", document: ""
};

function CsrForm({
  initial, onClose, onSave, showToast, defaultValues, onDraftChange,
}: {
  initial?: CsrProject;
  onClose: () => void;
  onSave: (d: Omit<CsrProject, "id">) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  defaultValues?: typeof emptyCsrDraft;
  onDraftChange?: (v: typeof emptyCsrDraft) => void;
}) {
  const [f, setF] = useState(
    initial
      ? { project_year: String(initial.project_year ?? new Date().getFullYear()), program: initial.program ?? "", activity: initial.activity ?? "", type_of_activity: initial.type_of_activity ?? "", location: initial.location ?? "", target_beneficiaries: initial.target_beneficiaries ?? "", objective: initial.objective ?? "", status: initial.status ?? "Planning", budget: initial.budget ? String(initial.budget) : "", implementation_period: initial.implementation_period ?? "", documentation_image: initial.documentation_image ?? "", document: initial.document ?? "" }
      : { ...emptyCsrDraft, ...defaultValues }
  );
  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };
```

- [ ] **Step 3: Tambahkan `handleClear`, update `handleSave`, update `ModalFooter`**

```tsx
  const handleClear = () => {
    setF({ ...emptyCsrDraft });
    onDraftChange?.({ ...emptyCsrDraft });
  };
```

Di `handleSave` sebelum `onClose()` pada path sukses:
```tsx
    if (!initial) onDraftChange?.({ ...emptyCsrDraft });
    onClose();
```

Di JSX:
```tsx
<ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Program"} isEdit={!!initial} />
```

- [ ] **Step 4: Tambahkan `addDraft` di parent `CsrProjectsModule`**

```tsx
  const [addDraft, setAddDraft] = useState({ ...emptyCsrDraft });
```

Update render calls:
```tsx
{showForm && <CsrForm onClose={() => setShowForm(false)} onSave={handleAdd} showToast={showToast} defaultValues={addDraft} onDraftChange={setAddDraft} />}
{editing && <CsrForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
```

- [ ] **Step 5: Verify build + Commit**

Run: `pnpm --filter @figma/my-make-file build` (Exit code 0)

```bash
git add apps/web/src/features/csr-projects/CsrProjectsModule.tsx
git commit -m "feat: modal UX improvements for csr projects"
```

---

### Task 7: Refactor GrievanceModule

**Files:**
- Modify: `apps/web/src/features/grievance/GrievanceModule.tsx`

**Context:** Lokal `Modal`/`ModalFooter` di baris ~44–68. Form: `GrievanceForm`. Fields: `register_no` (default dari `nextRegNo`), `log_date`, `complainant_name`, `address`, `phone`, `category`, `significance`, `description`, `location`, `investigation`, `resolution`, `feedback`, `status`, `completion_date`, `supporting_files`, `remarks`.

- [ ] **Step 1: Ganti impor, hapus lokal Modal/ModalFooter**

```tsx
import { Modal, ModalFooter } from '../../components/ui/Modal';
```
Hapus deklarasi fungsi lokal `function Modal(...)` dan `function ModalFooter(...)`.

- [ ] **Step 2: Tambahkan `emptyDraft`, update `GrievanceForm`**

```tsx
const emptyGrievanceDraft = {
  register_no: "", log_date: "", complainant_name: "", address: "", phone: "",
  category: "", significance: "Low", description: "", location: "",
  investigation: "", resolution: "", feedback: "", status: "Open",
  completion_date: "", supporting_files: "", remarks: ""
};

function GrievanceForm({
  initial, onClose, onSave, nextRegNo, showToast, defaultValues, onDraftChange,
}: {
  initial?: Grievance;
  onClose: () => void;
  onSave: (d: Omit<Grievance, "id">) => void;
  nextRegNo: string;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  defaultValues?: typeof emptyGrievanceDraft;
  onDraftChange?: (v: typeof emptyGrievanceDraft) => void;
}) {
  const [f, setF] = useState(
    initial
      ? { register_no: initial.register_no ?? nextRegNo, log_date: initial.log_date ? String(initial.log_date).split('T')[0] : "", complainant_name: initial.complainant_name ?? "", address: initial.address ?? "", phone: initial.phone ?? "", category: initial.category ?? "", significance: initial.significance ?? "Low", description: initial.description ?? "", location: initial.location ?? "", investigation: initial.investigation ?? "", resolution: initial.resolution ?? "", feedback: initial.feedback ?? "", status: initial.status ?? "Open", completion_date: initial.completion_date ? String(initial.completion_date).split('T')[0] : "", supporting_files: initial.supporting_files ?? "", remarks: initial.remarks ?? "" }
      : { ...emptyGrievanceDraft, register_no: defaultValues?.register_no || nextRegNo, ...defaultValues }
  );
  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };
```

- [ ] **Step 3: Tambahkan `handleClear`, update `handleSave`, update `ModalFooter`**

```tsx
  const handleClear = () => {
    const cleared = { ...emptyGrievanceDraft, register_no: nextRegNo };
    setF(cleared);
    onDraftChange?.(cleared);
  };
```

Di `handleSave` sebelum `onClose()` pada path sukses:
```tsx
    if (!initial) onDraftChange?.({ ...emptyGrievanceDraft });
    onClose();
```

Di JSX:
```tsx
<ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Pengaduan"} isEdit={!!initial} />
```

- [ ] **Step 4: Tambahkan `addDraft` di parent `GrievanceModule`**

```tsx
  const [addDraft, setAddDraft] = useState({ ...emptyGrievanceDraft });
```

Update render calls:
```tsx
{showForm && <GrievanceForm onClose={() => setShowForm(false)} onSave={handleAdd} nextRegNo={nextRegNo} showToast={showToast} defaultValues={addDraft} onDraftChange={setAddDraft} />}
{editing && <GrievanceForm initial={editing} onClose={() => setEditing(null)} onSave={d => { handleEdit(editing.id, d); setEditing(null); }} nextRegNo={editing.register_no} showToast={showToast} />}
```

- [ ] **Step 5: Verify build + Commit**

Run: `pnpm --filter @figma/my-make-file build` (Exit code 0)

```bash
git add apps/web/src/features/grievance/GrievanceModule.tsx
git commit -m "feat: modal UX improvements for grievance"
```

---

### Task 8: Refactor LrpModule

**Files:**
- Modify: `apps/web/src/features/lrp/LrpModule.tsx`

**Context:** Lokal `Modal`/`ModalFooter` di baris ~28–55. Form: `LrpForm`. Fields: `program`, `sharepoint_link`.

- [ ] **Step 1: Ganti impor, hapus lokal Modal/ModalFooter**

```tsx
import { Modal, ModalFooter } from '../../components/ui/Modal';
```
Hapus deklarasi fungsi lokal `function Modal(...)` dan `function ModalFooter(...)`.

- [ ] **Step 2: Tambahkan `emptyDraft`, update `LrpForm`**

```tsx
const emptyLrpDraft = { program: "", sharepoint_link: "" };

function LrpForm({
  initial, onClose, onSave, showToast, defaultValues, onDraftChange,
}: {
  initial?: LrpProgram;
  onClose: () => void;
  onSave: (d: Omit<LrpProgram, "id">) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  defaultValues?: typeof emptyLrpDraft;
  onDraftChange?: (v: typeof emptyLrpDraft) => void;
}) {
  const [f, setF] = useState(
    initial
      ? { program: initial.program ?? "", sharepoint_link: initial.sharepoint_link ?? "" }
      : { ...emptyLrpDraft, ...defaultValues }
  );
  const set = (k: string, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (!initial) onDraftChange?.(next);
  };
```

- [ ] **Step 3: Tambahkan `handleClear`, update `handleSave`, update `ModalFooter`**

```tsx
  const handleClear = () => {
    setF({ ...emptyLrpDraft });
    onDraftChange?.({ ...emptyLrpDraft });
  };
```

Di `handleSave` sebelum `onClose()` pada path sukses:
```tsx
    if (!initial) onDraftChange?.({ ...emptyLrpDraft });
    onClose();
```

Di JSX:
```tsx
<ModalFooter onClose={onClose} onSave={handleSave} onClear={!initial ? handleClear : undefined} saveLabel={initial ? "Simpan Perubahan" : "Simpan Program"} isEdit={!!initial} />
```

- [ ] **Step 4: Tambahkan `addDraft` di parent `LrpModule`**

```tsx
  const [addDraft, setAddDraft] = useState({ ...emptyLrpDraft });
```

Update render calls:
```tsx
{showForm && <LrpForm onClose={() => setShowForm(false)} onSave={onAdd} showToast={showToast} defaultValues={addDraft} onDraftChange={setAddDraft} />}
{editing && <LrpForm initial={editing} onClose={() => setEditing(null)} onSave={d => { onEdit(editing.id, d); setEditing(null); }} showToast={showToast} />}
```

- [ ] **Step 5: Final build verify + Commit**

Run: `pnpm --filter @figma/my-make-file build` (Exit code 0)

```bash
git add apps/web/src/features/lrp/LrpModule.tsx
git commit -m "feat: modal UX improvements for lrp"
```
